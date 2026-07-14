import { create } from "zustand";
import { FSNode } from "@/types/os";

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

interface FileSystemStore {
  root: FSNode;
  loaded: boolean;
  loading: boolean;
  userId: string | null;

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

export const useFileSystemStore = create<FileSystemStore>((set, get) => ({
  root: defaultRoot(),
  loaded: false,
  loading: false,
  userId: null,

  loadFromDB: async (userId: string) => {
    set({ loading: true, userId });

    if (typeof window !== 'undefined') {
      const key = `mittenos:fs:${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const root = JSON.parse(saved) as FSNode;
          set({ root, loaded: true, loading: false });
          return;
        } catch (e) {
          console.error("Failed to parse saved filesystem:", e);
        }
      }
    }

    const root = defaultRoot();
    set({ root, loaded: true, loading: false });
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
    return node?.children || [];
  },

  reset: () => {
    set({ root: defaultRoot(), loaded: false, loading: false, userId: null });
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

