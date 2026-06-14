import { create } from "zustand";
import { FSNode } from "@/types/os";

interface FileSystemStore {
  root: FSNode;
  getNode: (path: string) => FSNode | null;
  getNodeById: (id: string) => FSNode | null;
  findNodeById: (node: FSNode, id: string) => FSNode | null;
  createFile: (parentId: string, name: string, content?: string, mimeType?: string) => void;
  createFolder: (parentId: string, name: string) => void;
  deleteNode: (id: string) => void;
  renameNode: (id: string, newName: string) => void;
  updateFileContent: (id: string, content: string) => void;
  getChildren: (parentId: string) => FSNode[];
}

const createDefaultFS = (): FSNode => {
  const now = Date.now();
  return {
    id: "root",
    name: "/",
    type: "folder",
    parentId: null,
    createdAt: now,
    modifiedAt: now,
    children: [
      {
        id: "desktop",
        name: "Desktop",
        type: "folder",
        parentId: "root",
        createdAt: now,
        modifiedAt: now,
        children: [
          {
            id: "welcome-txt",
            name: "welcome.txt",
            type: "file",
            content: "Welcome to Z.ai OS!\n\nThis is your browser-based operating system.\nFeel free to explore the apps and features.\n\nTips:\n- Right-click on the desktop for options\n- Use the taskbar at the bottom to manage windows\n- Open the App Store to discover more apps\n",
            parentId: "desktop",
            createdAt: now,
            modifiedAt: now,
            mimeType: "text/plain",
          },
        ],
      },
      {
        id: "documents",
        name: "Documents",
        type: "folder",
        parentId: "root",
        createdAt: now,
        modifiedAt: now,
        children: [
          {
            id: "notes-txt",
            name: "notes.txt",
            type: "file",
            content: "My Notes\n========\n\n- Check out the Terminal app\n- Try the Calculator\n- Browse files in the File Explorer\n",
            parentId: "documents",
            createdAt: now,
            modifiedAt: now,
            mimeType: "text/plain",
          },
          {
            id: "projects",
            name: "Projects",
            type: "folder",
            parentId: "documents",
            createdAt: now,
            modifiedAt: now,
            children: [],
          },
        ],
      },
      {
        id: "pictures",
        name: "Pictures",
        type: "folder",
        parentId: "root",
        createdAt: now,
        modifiedAt: now,
        children: [],
      },
      {
        id: "music",
        name: "Music",
        type: "folder",
        parentId: "root",
        createdAt: now,
        modifiedAt: now,
        children: [],
      },
      {
        id: "downloads",
        name: "Downloads",
        type: "folder",
        parentId: "root",
        createdAt: now,
        modifiedAt: now,
        children: [],
      },
    ],
  };
};

let nodeIdCounter = 100;

export const useFileSystemStore = create<FileSystemStore>((set, get) => ({
  root: createDefaultFS(),

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

  createFile: (parentId: string, name: string, content = "", mimeType = "text/plain") => {
    nodeIdCounter++;
    const now = Date.now();
    const newFile: FSNode = {
      id: `file-${nodeIdCounter}`,
      name,
      type: "file",
      content,
      parentId,
      createdAt: now,
      modifiedAt: now,
      mimeType,
    };
    set((state) => {
      const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
      const parent = findNodeInTree(newRoot, parentId);
      if (parent && parent.type === "folder") {
        if (!parent.children) parent.children = [];
        parent.children.push(newFile);
        parent.modifiedAt = now;
      }
      return { root: newRoot };
    });
  },

  createFolder: (parentId: string, name: string) => {
    nodeIdCounter++;
    const now = Date.now();
    const newFolder: FSNode = {
      id: `folder-${nodeIdCounter}`,
      name,
      type: "folder",
      parentId,
      createdAt: now,
      modifiedAt: now,
      children: [],
    };
    set((state) => {
      const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
      const parent = findNodeInTree(newRoot, parentId);
      if (parent && parent.type === "folder") {
        if (!parent.children) parent.children = [];
        parent.children.push(newFolder);
        parent.modifiedAt = now;
      }
      return { root: newRoot };
    });
  },

  deleteNode: (id: string) => {
    set((state) => {
      const newRoot = JSON.parse(JSON.stringify(state.root)) as FSNode;
      deleteNodeInTree(newRoot, id);
      return { root: newRoot };
    });
  },

  renameNode: (id: string, newName: string) => {
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

  updateFileContent: (id: string, content: string) => {
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
