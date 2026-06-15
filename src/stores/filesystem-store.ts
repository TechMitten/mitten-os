import { create } from "zustand";
import { FSNode } from "@/types/os";
import { createClient } from "@/lib/supabase/client";

function isGuest(userId: string): boolean {
  return userId.startsWith("guest-");
}

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

interface DBNode {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  type: "file" | "folder";
  content: string | null;
  mime_type: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
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

function dbNodeToFSNode(db: DBNode): FSNode {
  return {
    id: db.id,
    name: db.name,
    type: db.type,
    content: db.content ?? undefined,
    parentId: db.parent_id,
    createdAt: new Date(db.created_at).getTime(),
    modifiedAt: new Date(db.updated_at).getTime(),
    mimeType: db.mime_type,
  };
}

function buildTree(rows: DBNode[]): FSNode {
  const map = new Map<string, FSNode>();
  for (const row of rows) {
    map.set(row.id, dbNodeToFSNode(row));
  }
  for (const row of rows) {
    const node = map.get(row.id)!;
    if (node.parentId) {
      const parent = map.get(node.parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      }
    }
  }
  for (const node of map.values()) {
    if (node.children) {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  const rootNode = [...map.values()].find((n) => n.parentId === null);
  return rootNode || defaultRoot();
}

export const useFileSystemStore = create<FileSystemStore>((set, get) => ({
  root: defaultRoot(),
  loaded: false,
  loading: false,
  userId: null,

  loadFromDB: async (userId: string) => {
    set({ loading: true, userId });

    if (isGuest(userId)) {
      set({ root: defaultRoot(), loaded: true, loading: false });
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("filesystem_nodes")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to load filesystem:", error.message);
      set({ loading: false });
      return;
    }

    if (!data || data.length === 0) {
      // No data yet — this shouldn't happen with the trigger, but be safe
      const root = defaultRoot();
      set({ root, loaded: true, loading: false });
      return;
    }

    const root = buildTree(data as DBNode[]);
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
    const { userId, root } = get();
    if (!userId) return;

    const now = new Date().toISOString();
    const guest = isGuest(userId);

    if (!guest) {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("filesystem_nodes")
        .insert({
          user_id: userId,
          parent_id: parentId,
          name,
          type: "file",
          content,
          mime_type: mimeType,
          sort_order: 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error || !data) {
        console.error("Failed to create file:", error?.message);
        return;
      }

      const newNode = dbNodeToFSNode(data as DBNode);

      set((state) => {
        const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
        const parent = findNodeInTree(newRoot, parentId);
        if (parent && parent.type === "folder") {
          if (!parent.children) parent.children = [];
          parent.children.push(newNode);
          parent.modifiedAt = Date.now();
        }
        return { root: newRoot };
      });
    } else {
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
        return { root: newRoot };
      });
    }
  },

  createFolder: async (parentId: string, name: string) => {
    const { userId } = get();
    if (!userId) return;

    const now = new Date().toISOString();
    const guest = isGuest(userId);

    if (!guest) {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("filesystem_nodes")
        .insert({
          user_id: userId,
          parent_id: parentId,
          name,
          type: "folder",
          sort_order: 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error || !data) {
        console.error("Failed to create folder:", error?.message);
        return;
      }

      const newNode = dbNodeToFSNode(data as DBNode);

      set((state) => {
        const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
        const parent = findNodeInTree(newRoot, parentId);
        if (parent && parent.type === "folder") {
          if (!parent.children) parent.children = [];
          parent.children.push(newNode);
          parent.modifiedAt = Date.now();
        }
        return { root: newRoot };
      });
    } else {
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
        return { root: newRoot };
      });
    }
  },

  deleteNode: async (id: string) => {
    const { userId } = get();
    if (!userId) return;

    if (!isGuest(userId)) {
      const supabase = createClient();
      const { error } = await supabase.from("filesystem_nodes").delete().eq("id", id);
      if (error) {
        console.error("Failed to delete node:", error.message);
        return;
      }
    }

    set((state) => {
      const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
      deleteNodeInTree(newRoot, id);
      return { root: newRoot };
    });
  },

  renameNode: async (id: string, newName: string) => {
    const { userId } = get();
    if (!userId) return;

    if (!isGuest(userId)) {
      const supabase = createClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("filesystem_nodes")
        .update({ name: newName, updated_at: now })
        .eq("id", id);

      if (error) {
        console.error("Failed to rename node:", error.message);
        return;
      }
    }

    set((state) => {
      const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
      const node = findNodeInTree(newRoot, id);
      if (node) {
        node.name = newName;
        node.modifiedAt = Date.now();
      }
      return { root: newRoot };
    });
  },

  updateFileContent: async (id: string, content: string) => {
    const { userId } = get();
    if (!userId) return;

    if (!isGuest(userId)) {
      const supabase = createClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("filesystem_nodes")
        .update({ content, updated_at: now })
        .eq("id", id);

      if (error) {
        console.error("Failed to update file content:", error.message);
        return;
      }
    }

    set((state) => {
      const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
      const node = findNodeInTree(newRoot, id);
      if (node && node.type === "file") {
        node.content = content;
        node.modifiedAt = Date.now();
      }
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
