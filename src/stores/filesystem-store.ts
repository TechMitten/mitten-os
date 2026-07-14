import { create } from "zustand";
import { FSNode } from "@/types/os";
import { gdriveVFS } from "@/lib/gdrive";

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface FileSystemStore {
  root: FSNode;
  loaded: boolean;
  loading: boolean;
  userId: string | null;
  storageBackend: 'local' | 'gdrive';
  gdriveConnected: boolean;

  loadFromDB: (userId: string) => Promise<void>;
  getNode: (path: string) => FSNode | null;
  getNodeById: (id: string) => FSNode | null;
  findNodeById: (node: FSNode, id: string) => FSNode | null;
  createFile: (parentId: string, name: string, content?: string, mimeType?: string) => Promise<void>;
  createFolder: (parentId: string, name: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  renameNode: (id: string, newName: string) => Promise<void>;
  updateFileContent: (id: string, content: string) => Promise<void>;
  getChildren: (parentId: string) => FSNode[];
  fetchFileContentIfNeeded: (id: string) => Promise<string>;
  setStorageBackend: (backend: 'local' | 'gdrive') => Promise<void>;
  connectGDrive: (tokens: { accessToken: string; refreshToken: string | null; expiresIn: number }) => Promise<void>;
  disconnectGDrive: () => void;
  reset: () => void;
}

function defaultRoot(): FSNode {
  return {
    id: "root",
    name: "/",
    type: "folder",
    parentId: null,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    children: [],
  };
}

function persistFS(userId: string | null, root: FSNode) {
  if (!userId || typeof window === 'undefined') return;
  localStorage.setItem(`mittenos:fs:${userId}`, JSON.stringify(root));
}

function ensureLocalSystemFolders(root: FSNode): FSNode {
  const folders = ['Desktop', 'Documents', 'Pictures', 'Music', 'Downloads'];
  if (!root.children) root.children = [];
  
  for (const name of folders) {
    const exists = root.children.some(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.type === 'folder'
    );
    if (!exists) {
      root.children.push({
        id: name.toLowerCase(),
        name,
        type: 'folder',
        parentId: root.id,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        children: [],
      });
    }
  }
  return root;
}

export const useFileSystemStore = create<FileSystemStore>((set, get) => ({
  root: defaultRoot(),
  loaded: false,
  loading: false,
  userId: null,
  storageBackend: 'local',
  gdriveConnected: typeof window !== 'undefined' ? gdriveVFS.isConnected() : false,

  loadFromDB: async (userId: string) => {
    set({ loading: true, userId });

    if (typeof window !== 'undefined') {
      const backend = (localStorage.getItem('mittenos:fs_backend') || 'local') as 'local' | 'gdrive';
      const isGDrive = backend === 'gdrive' && gdriveVFS.isConnected();

      if (isGDrive) {
        try {
          console.log('[FSStore] Loading filesystem from Google Drive...');
          let root = await gdriveVFS.loadRoot();
          
          // Ensure system folders exist in Google Drive
          const systemFolders = ['Desktop', 'Documents', 'Pictures', 'Music', 'Downloads'];
          
          for (const name of systemFolders) {
            const exists = root.children?.some(
              (c) => c.name.toLowerCase() === name.toLowerCase() && c.type === 'folder'
            );
            if (!exists) {
              console.log(`[FSStore] Auto-creating missing system folder '${name}' in Google Drive...`);
              const gNode = await gdriveVFS.createFolder('root', name);
              if (!root.children) root.children = [];
              root.children.push(gNode);
            }
          }

          set({
            root,
            storageBackend: 'gdrive',
            gdriveConnected: true,
            loaded: true,
            loading: false,
          });

          // Sync desktop store state
          try {
            const { useDesktopStore } = await import("./desktop-store");
            await useDesktopStore.getState().loadSettings(userId);
          } catch (e) {
            console.error("[FSStore] Failed to sync desktop settings on Google Drive load:", e);
          }

          return;
        } catch (e) {
          console.error('[FSStore] Failed to load filesystem from Google Drive, falling back to local:', e);
        }
      }

      // Local storage fallback
      const key = `mittenos:fs:${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          let root = JSON.parse(saved) as FSNode;
          root = ensureLocalSystemFolders(root);
          persistFS(userId, root);
          set({
            root,
            storageBackend: 'local',
            gdriveConnected: gdriveVFS.isConnected(),
            loaded: true,
            loading: false,
          });

          // Sync desktop store state
          try {
            const { useDesktopStore } = await import("./desktop-store");
            await useDesktopStore.getState().loadSettings(userId);
          } catch (e) {
            console.error("[FSStore] Failed to sync desktop settings on local fallback load:", e);
          }

          return;
        } catch (e) {
          console.error("Failed to parse saved filesystem:", e);
        }
      }
    }

    let root = defaultRoot();
    root = ensureLocalSystemFolders(root);
    persistFS(userId, root);
    set({
      root,
      storageBackend: 'local',
      gdriveConnected: typeof window !== 'undefined' ? gdriveVFS.isConnected() : false,
      loaded: true,
      loading: false,
    });

    try {
      const { useDesktopStore } = await import("./desktop-store");
      await useDesktopStore.getState().loadSettings(userId);
    } catch (e) {
      console.error("[FSStore] Failed to sync desktop settings on default load:", e);
    }
  },

  getNode: (path: string) => {
    const { root } = get();
    if (path === "/") return root;
    const parts = path.split("/").filter(Boolean);
    let current: FSNode = root;
    for (const part of parts) {
      const child = current.children?.find((c) => c.name === part);
      if (!child) return null;
      current = child;
    }
    return current;
  },

  getNodeById: (id: string) => {
    const { root } = get();
    return get().findNodeById(root, id);
  },

  findNodeById: (node: FSNode, id: string): FSNode | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = get().findNodeById(child, id);
        if (found) return found;
      }
    }
    return null;
  },

  createFile: async (parentId: string, name: string, content = "", mimeType = "text/plain") => {
    const { userId, storageBackend } = get();
    if (!userId) return;

    if (storageBackend === 'gdrive') {
      try {
        set({ loading: true });
        const gNode = await gdriveVFS.createFile(parentId, name, content, mimeType);
        set((state) => {
          const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
          const parent = findNodeInTree(newRoot, parentId);
          if (parent && parent.type === "folder") {
            if (!parent.children) parent.children = [];
            parent.children.push(gNode);
            parent.modifiedAt = Date.now();
          }
          return { root: newRoot, loading: false };
        });
      } catch (err) {
        console.error('[FSStore] Failed to create file in Google Drive:', err);
        set({ loading: false });
        throw err;
      }
      return;
    }

    const newNode: FSNode = {
      id: generateUUID(),
      name,
      type: "file",
      content,
      parentId,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      mimeType,
    };

    set((state) => {
      const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
      const parent = findNodeInTree(newRoot, parentId);
      if (parent && parent.type === "folder") {
        if (!parent.children) parent.children = [];
        parent.children.push(newNode);
        parent.modifiedAt = Date.now();
      }
      persistFS(state.userId, newRoot);
      return { root: newRoot };
    });
  },

  createFolder: async (parentId: string, name: string) => {
    const { userId, storageBackend } = get();
    if (!userId) return;

    if (storageBackend === 'gdrive') {
      try {
        set({ loading: true });
        const gNode = await gdriveVFS.createFolder(parentId, name);
        set((state) => {
          const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
          const parent = findNodeInTree(newRoot, parentId);
          if (parent && parent.type === "folder") {
            if (!parent.children) parent.children = [];
            parent.children.push(gNode);
            parent.modifiedAt = Date.now();
          }
          return { root: newRoot, loading: false };
        });
      } catch (err) {
        console.error('[FSStore] Failed to create folder in Google Drive:', err);
        set({ loading: false });
        throw err;
      }
      return;
    }

    const newNode: FSNode = {
      id: generateUUID(),
      name,
      type: "folder",
      parentId,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    set((state) => {
      const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
      const parent = findNodeInTree(newRoot, parentId);
      if (parent && parent.type === "folder") {
        if (!parent.children) parent.children = [];
        parent.children.push(newNode);
        parent.modifiedAt = Date.now();
      }
      persistFS(state.userId, newRoot);
      return { root: newRoot };
    });
  },

  deleteNode: async (id: string) => {
    const { userId, storageBackend } = get();
    if (!userId) return;

    if (storageBackend === 'gdrive') {
      try {
        // Optimistic delete
        set((state) => {
          const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
          deleteNodeInTree(newRoot, id);
          return { root: newRoot };
        });
        await gdriveVFS.deleteNode(id);
      } catch (err) {
        console.error('[FSStore] Failed to delete node in Google Drive:', err);
        // Reload from drive to revert
        const root = await gdriveVFS.loadRoot();
        set({ root });
        throw err;
      }
      return;
    }

    set((state) => {
      const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
      deleteNodeInTree(newRoot, id);
      persistFS(state.userId, newRoot);
      return { root: newRoot };
    });
  },

  renameNode: async (id: string, newName: string) => {
    const { userId, storageBackend } = get();
    if (!userId) return;

    if (storageBackend === 'gdrive') {
      try {
        // Optimistic rename
        set((state) => {
          const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
          const node = findNodeInTree(newRoot, id);
          if (node) {
            node.name = newName;
            node.modifiedAt = Date.now();
          }
          return { root: newRoot };
        });
        await gdriveVFS.renameNode(id, newName);
      } catch (err) {
        console.error('[FSStore] Failed to rename node in Google Drive:', err);
        // Reload from drive to revert
        const root = await gdriveVFS.loadRoot();
        set({ root });
        throw err;
      }
      return;
    }

    set((state) => {
      const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
      const node = findNodeInTree(newRoot, id);
      if (node) {
        node.name = newName;
        node.modifiedAt = Date.now();
      }
      persistFS(state.userId, newRoot);
      return { root: newRoot };
    });
  },

  updateFileContent: async (id: string, content: string) => {
    const { userId, storageBackend } = get();
    if (!userId) return;

    if (storageBackend === 'gdrive') {
      let mimeType = 'text/plain';
      set((state) => {
        const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
        const node = findNodeInTree(newRoot, id);
        if (node && node.type === "file") {
          node.content = content;
          node.modifiedAt = Date.now();
          mimeType = node.mimeType || 'text/plain';
        }
        return { root: newRoot };
      });

      gdriveVFS.updateFileContent(id, content, mimeType).catch((err) => {
        console.error('[FSStore] Background update content error:', err);
      });
      return;
    }

    set((state) => {
      const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
      const node = findNodeInTree(newRoot, id);
      if (node && node.type === "file") {
        node.content = content;
        node.modifiedAt = Date.now();
      }
      persistFS(state.userId, newRoot);
      return { root: newRoot };
    });
  },

  getChildren: (parentId: string) => {
    const node = get().getNodeById(parentId);
    return (node?.children || []).filter((c) => !c.name.startsWith("."));
  },

  fetchFileContentIfNeeded: async (id: string) => {
    const { storageBackend } = get();
    const node = get().getNodeById(id);
    if (!node || node.type !== 'file') return '';

    if (storageBackend === 'local') {
      return node.content || '';
    }

    if (node.content !== undefined) {
      return node.content;
    }

    try {
      set({ loading: true });
      const content = await gdriveVFS.fetchFileContent(id);
      set((state) => {
        const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
        const targetNode = findNodeInTree(newRoot, id);
        if (targetNode && targetNode.type === 'file') {
          targetNode.content = content;
        }
        return { root: newRoot, loading: false };
      });
      return content;
    } catch (e) {
      console.error('[FSStore] Failed to lazy load file content:', e);
      set({ loading: false });
      return '';
    }
  },

  setStorageBackend: async (backend: 'local' | 'gdrive') => {
    const { userId } = get();
    if (!userId) return;

    if (backend === 'gdrive') {
      if (!gdriveVFS.isConnected()) {
        throw new Error('Google Drive is not connected');
      }
      localStorage.setItem('mittenos:fs_backend', 'gdrive');
    } else {
      localStorage.setItem('mittenos:fs_backend', 'local');
    }
    await get().loadFromDB(userId);
  },

  connectGDrive: async (tokens: { accessToken: string; refreshToken: string | null; expiresIn: number }) => {
    const { userId } = get();
    gdriveVFS.connect(tokens);
    set({ gdriveConnected: true });
    if (userId) {
      await get().setStorageBackend('gdrive');
    }
  },

  disconnectGDrive: () => {
    const { userId } = get();
    gdriveVFS.disconnect();
    set({ gdriveConnected: false, storageBackend: 'local' });
    if (userId) {
      get().loadFromDB(userId);
    }
  },

  reset: () => {
    set({ root: defaultRoot(), loaded: false, loading: false, userId: null, storageBackend: 'local', gdriveConnected: false });
  },
}));

function findNodeInTree(node: FSNode, id: string): FSNode | null {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeInTree(child, id);
      if (found) return found;
    }
  }
  return null;
}

function deleteNodeInTree(node: FSNode, id: string): boolean {
  if (node.children) {
    const idx = node.children.findIndex((c) => c.id === id);
    if (idx !== -1) {
      node.children.splice(idx, 1);
      return true;
    }
    for (const child of node.children) {
      if (deleteNodeInTree(child, id)) return true;
    }
  }
  return false;
}
