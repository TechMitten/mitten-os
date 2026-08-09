import { create } from "zustand";
import { FSNode } from "@/types/os";

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
  syncStatus: 'local';

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
  try {
    localStorage.setItem(`mittenos:fs:${userId}`, JSON.stringify(root));
  } catch (e) {
    console.error("Failed to persist filesystem to localStorage:", e);
  }
}

function ensureLocalSystemFolders(root: FSNode): FSNode {
  const folders = ['Desktop', 'Documents', 'Pictures', 'Music', 'Downloads', '.system'];
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
  syncStatus: 'local',

  loadFromDB: async (userId: string) => {
    set({ loading: true, userId });

    let root = defaultRoot();
    let loadedFromLocal = false;

    // Instant local load from localStorage
    if (typeof window !== 'undefined') {
      const key = `mittenos:fs:${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          root = JSON.parse(saved) as FSNode;
          root = ensureLocalSystemFolders(root);
          loadedFromLocal = true;
          set({
            root,
            loaded: true,
            loading: false,
            syncStatus: 'local',
          });

          // Sync desktop store settings
          try {
            const { useDesktopStore } = await import("./desktop-store");
            await useDesktopStore.getState().loadSettings(userId);
          } catch (e) {
            console.error("[FSStore] Failed to sync desktop settings:", e);
          }
        } catch (e) {
          console.error("Failed to parse saved filesystem from localStorage:", e);
        }
      }
    }

    if (!loadedFromLocal) {
      root = ensureLocalSystemFolders(root);
      persistFS(userId, root);
      set({
        root,
        loaded: true,
        loading: false,
        syncStatus: 'local',
      });

      try {
        const { useDesktopStore } = await import("./desktop-store");
        await useDesktopStore.getState().loadSettings(userId);
      } catch (e) {
        console.error("[FSStore] Failed to sync desktop settings on default load:", e);
      }
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
    const { userId } = get();
    if (!userId) return;

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
    const { userId } = get();
    if (!userId) return;

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
    const { userId } = get();
    if (!userId) return;

    set((state) => {
      const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
      deleteNodeInTree(newRoot, id);
      persistFS(state.userId, newRoot);
      return { root: newRoot };
    });
  },

  renameNode: async (id: string, newName: string) => {
    const { userId } = get();
    if (!userId) return;

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
    const { userId } = get();
    if (!userId) return;

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
    const node = get().getNodeById(id);
    if (!node || node.type !== 'file') return '';
    return node.content || '';
  },

  reset: () => {
    set({ root: defaultRoot(), loaded: false, loading: false, userId: null, syncStatus: 'local' });
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
