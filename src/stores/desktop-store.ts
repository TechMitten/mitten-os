import { create } from "zustand";
import { DesktopIcon, DESKTOP_GRID_CELL, DESKTOP_GRID_OFFSET_X, DESKTOP_GRID_OFFSET_Y, Notification, WindowPosition } from "@/types/os";

interface DesktopStore {
  wallpaper: string;
  theme: "light" | "dark";
  desktopIcons: DesktopIcon[];
  customDesktopIcons: DesktopIcon[];
  notifications: Notification[];
  startMenuOpen: boolean;
  contextMenu: ContextMenuState | null;
  searchQuery: string;
  loaded: boolean;
  userId: string | null;
  welcomeDismissed: boolean;
  persistWindows: boolean;
  iconSize: "small" | "medium" | "large";
  deletedIconIds: string[];
  renamedIconLabels: Record<string, string>;

  loadSettings: (userId: string) => Promise<void>;
  setWallpaper: (url: string) => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  setStartMenuOpen: (open: boolean) => void;
  toggleStartMenu: () => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  setSearchQuery: (query: string) => void;
  setWelcomeDismissed: (dismissed: boolean) => void;
  setPersistWindows: (persist: boolean) => void;
  setIconSize: (size: "small" | "medium" | "large") => void;
  updateIconPosition: (id: string, position: WindowPosition) => void;
  loadIconPositions: (positions: Record<string, WindowPosition>) => void;
  reset: () => void;
  renameDesktopIcon: (id: string, label: string) => void;
  deleteDesktopIcon: (id: string) => void;
  addDesktopIcon: (icon: Omit<DesktopIcon, "id" | "position">) => void;
  removeCustomDesktopIcon: (id: string) => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  separator?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

function gridToPixel(col: number, row: number): WindowPosition {
  return {
    x: col * DESKTOP_GRID_CELL + DESKTOP_GRID_OFFSET_X,
    y: row * DESKTOP_GRID_CELL + DESKTOP_GRID_OFFSET_Y,
  };
}

const defaultIcons: DesktopIcon[] = [
  { id: "icon-1", appId: "file-explorer", label: "Files", icon: "FolderOpen", position: gridToPixel(0, 0) },
  { id: "icon-2", appId: "terminal", label: "Terminal", icon: "TerminalSquare", position: gridToPixel(0, 1) },
  { id: "icon-3", appId: "browser", label: "Browser", icon: "Globe", position: gridToPixel(0, 2) },
  { id: "icon-4", appId: "text-editor", label: "Notepad", icon: "FileText", position: gridToPixel(0, 3) },
  { id: "icon-5", appId: "app-builder", label: "Orion", icon: "Code2", position: gridToPixel(0, 4) },
  { id: "icon-6", appId: "settings", label: "Settings", icon: "Settings", position: gridToPixel(0, 5) },
  { id: "icon-7", appId: "coding-assistant", label: "MittenAI", icon: "Bot", position: gridToPixel(0, 6) },
];

let notificationCounter = 0;

function getSettingsJson(state: DesktopStore) {
  return {
    welcomeDismissed: state.welcomeDismissed,
    persistWindows: state.persistWindows,
    iconSize: state.iconSize,
    deletedIconIds: state.deletedIconIds || [],
    renamedIconLabels: state.renamedIconLabels || {},
    customDesktopIcons: state.customDesktopIcons || [],
  };
}

async function writeVFSFile(path: string, content: string, mimeType = 'application/json') {
  try {
    const { useFileSystemStore } = await import("./filesystem-store");
    const fsStore = useFileSystemStore.getState();
    const node = fsStore.getNode(path);
    if (node) {
      await fsStore.updateFileContent(node.id, content);
    } else {
      const name = path.substring(path.lastIndexOf('/') + 1);
      await fsStore.createFile('root', name, content, mimeType);
    }
  } catch (e) {
    console.error(`Failed to write file to VFS: ${path}`, e);
  }
}

async function persistDesktopState(userId: string | null, state: DesktopStore, icons?: DesktopIcon[]) {
  if (!userId || typeof window === 'undefined') return;

  const currentIcons = icons || state.desktopIcons;
  const positions: Record<string, WindowPosition> = {};
  for (const icon of currentIcons) {
    positions[icon.id] = icon.position;
  }

  const settings = {
    theme: state.theme,
    wallpaper: state.wallpaper,
    welcomeDismissed: state.welcomeDismissed,
    persistWindows: state.persistWindows,
    iconSize: state.iconSize,
    deletedIconIds: state.deletedIconIds || [],
    renamedIconLabels: state.renamedIconLabels || {},
    customDesktopIcons: state.customDesktopIcons || [],
  };

  const desktopState = { settings, positions };
  const content = JSON.stringify(desktopState);

  localStorage.setItem(`mittenos:settings:${userId}`, JSON.stringify(settings));
  localStorage.setItem(`mittenos:icon_positions:${userId}`, JSON.stringify(positions));

  try {
    const { useFileSystemStore } = await import("./filesystem-store");
    const fsStore = useFileSystemStore.getState();
    if (fsStore.loaded) {
      const currentVFSNode = fsStore.getNode("/.desktop_state.json");
      let lastSavedContent = null;
      if (currentVFSNode) {
        lastSavedContent = currentVFSNode.content || await fsStore.fetchFileContentIfNeeded(currentVFSNode.id);
      }
      if (lastSavedContent !== content) {
        await writeVFSFile("/.desktop_state.json", content);
      }
    }
  } catch (e) {
    console.error("Failed to persist desktop state to VFS:", e);
  }
}

async function persistSettings(userId: string | null, state: DesktopStore) {
  await persistDesktopState(userId, state);
}

export const useDesktopStore = create<DesktopStore>((set, get) => ({
  wallpaper: "linear-gradient(135deg, #030b20, #0d2b63, #071730)",
  theme: "dark",
  desktopIcons: defaultIcons,
  customDesktopIcons: [],
  notifications: [],
  startMenuOpen: false,
  contextMenu: null,
  searchQuery: "",
  loaded: false,
  userId: null,
  welcomeDismissed: false,
  persistWindows: false,
  iconSize: "medium",
  deletedIconIds: [],
  renamedIconLabels: {},

  loadSettings: async (userId: string) => {
    let desktopState: any = {};
    if (typeof window !== 'undefined') {
      let vfsStateStr = null;
      try {
        const { useFileSystemStore } = await import("./filesystem-store");
        const fsStore = useFileSystemStore.getState();
        const node = fsStore.getNode("/.desktop_state.json");
        if (node) {
          vfsStateStr = await fsStore.fetchFileContentIfNeeded(node.id);
        }
      } catch (e) {
        console.error("Failed to read desktop state from VFS:", e);
      }

      if (vfsStateStr) {
        try {
          desktopState = JSON.parse(vfsStateStr);
          console.log("[DesktopStore] Loaded desktop state from VFS:", desktopState);
        } catch (e) {
          console.error("Failed to parse VFS desktop state:", e);
        }
      }

      // Fallback: if VFS state wasn't found or couldn't be parsed, migrate from legacy localStorage
      if (!vfsStateStr || Object.keys(desktopState).length === 0) {
        const savedSettings = localStorage.getItem(`mittenos:settings:${userId}`);
        const savedPositions = localStorage.getItem(`mittenos:icon_positions:${userId}`);
        
        let settings: any = {};
        let positions: any = {};
        if (savedSettings) {
          try { settings = JSON.parse(savedSettings); } catch {}
        }
        if (savedPositions) {
          try { positions = JSON.parse(savedPositions); } catch {}
        }

        desktopState = { settings, positions };

        // Write the migrated state to VFS
        const { useFileSystemStore } = await import("./filesystem-store");
        const fsStore = useFileSystemStore.getState();
        if (fsStore.loaded) {
          await writeVFSFile("/.desktop_state.json", JSON.stringify(desktopState));
        }
      }
    }

    const settings = desktopState.settings || {};
    const positions = desktopState.positions || {};

    const theme = settings.theme || "dark";
    const wallpaper = settings.wallpaper || "linear-gradient(135deg, #030b20, #0d2b63, #071730)";
    const welcomeDismissed = localStorage.getItem(`mittenos:welcomeDismissed:${userId}`) === "true" || (settings.welcomeDismissed ?? false);
    const persistWindows = settings.persistWindows ?? false;
    const iconSize = settings.iconSize || "medium";
    const deletedIconIds = settings.deletedIconIds || [];
    const renamedIconLabels = settings.renamedIconLabels || {};
    const customDesktopIcons = settings.customDesktopIcons || [];

    const updatedIcons = defaultIcons
      .filter((icon) => !deletedIconIds.includes(icon.id))
      .map((icon) => ({
        ...icon,
        label: renamedIconLabels[icon.id] || icon.label,
        position: positions[icon.id] || icon.position,
      }));

    const customIconsWithPositions = customDesktopIcons.map((icon: any) => ({
      ...icon,
      position: positions[icon.id] || icon.position,
    }));

    set({
      theme,
      wallpaper,
      welcomeDismissed,
      persistWindows,
      iconSize,
      userId,
      loaded: true,
      deletedIconIds,
      renamedIconLabels,
      customDesktopIcons: customIconsWithPositions,
      desktopIcons: [...updatedIcons, ...customIconsWithPositions],
    });
  },

  setWallpaper: (url: string) => {
    set({ wallpaper: url });
    persistSettings(get().userId, get());
  },

  setTheme: (theme: "light" | "dark") => {
    const wallpaper =
      theme === "light"
        ? "linear-gradient(135deg, #c9d6ff, #e2e2e2, #f5f7fa)"
        : "linear-gradient(135deg, #030b20, #0d2b63, #071730)";
    set({ theme, wallpaper });
    persistSettings(get().userId, get());
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === "dark" ? "light" : "dark";
    const wallpaper =
      next === "light"
        ? "linear-gradient(135deg, #c9d6ff, #e2e2e2, #f5f7fa)"
        : "linear-gradient(135deg, #030b20, #0d2b63, #071730)";
    set({ theme: next, wallpaper });
    persistSettings(get().userId, get());
  },

  setStartMenuOpen: (open: boolean) => set({ startMenuOpen: open }),
  toggleStartMenu: () => set((state) => ({ startMenuOpen: !state.startMenuOpen })),
  setContextMenu: (menu: ContextMenuState | null) => set({ contextMenu: menu }),

  addNotification: (notification) => {
    notificationCounter++;
    const newNotif: Notification = {
      ...notification,
      id: `notif-${notificationCounter}`,
      timestamp: Date.now(),
      read: false,
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications].slice(0, 50),
    }));
  },

  markNotificationRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  clearNotifications: () => set({ notifications: [] }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  updateIconPosition: (id: string, position: WindowPosition) => {
    set((state) => ({
      desktopIcons: state.desktopIcons.map((icon) =>
        icon.id === id ? { ...icon, position } : icon
      ),
    }));
  },

  loadIconPositions: (positions: Record<string, WindowPosition>) => {
    set((state) => ({
      desktopIcons: state.desktopIcons.map((icon) => {
        const saved = positions[icon.id];
        return saved ? { ...icon, position: saved } : icon;
      }),
    }));
  },

  setWelcomeDismissed: (dismissed: boolean) => {
    set({ welcomeDismissed: dismissed });
    const { userId } = get();
    if (userId) {
      localStorage.setItem(`mittenos:welcomeDismissed:${userId}`, String(dismissed));
    }
    persistSettings(userId, get());
  },

  setPersistWindows: (persist: boolean) => {
    set({ persistWindows: persist });
    persistSettings(get().userId, get());
  },

  setIconSize: (size: "small" | "medium" | "large") => {
    set({ iconSize: size });
    persistSettings(get().userId, get());
  },

  reset: () => {
    const { theme, wallpaper } = get();
    set({
      wallpaper,
      theme,
      desktopIcons: defaultIcons,
      customDesktopIcons: [],
      notifications: [],
      startMenuOpen: false,
      contextMenu: null,
      searchQuery: "",
      loaded: false,
      userId: null,
      welcomeDismissed: false,
      persistWindows: false,
      iconSize: "medium",
      deletedIconIds: [],
      renamedIconLabels: {},
    });
  },

  renameDesktopIcon: (id: string, label: string) => {
    set((state) => {
      const renamedIconLabels = { ...state.renamedIconLabels, [id]: label };
      const desktopIcons = state.desktopIcons.map((icon) =>
        icon.id === id ? { ...icon, label } : icon
      );
      
      const nextState = { ...state, renamedIconLabels, desktopIcons };
      persistSettings(state.userId, nextState);
      return { renamedIconLabels, desktopIcons };
    });
  },

  deleteDesktopIcon: (id: string) => {
    set((state) => {
      const deletedIconIds = [...state.deletedIconIds, id];
      const desktopIcons = state.desktopIcons.filter((icon) => icon.id !== id);

      const nextState = { ...state, deletedIconIds, desktopIcons };
      persistSettings(state.userId, nextState);
      return { deletedIconIds, desktopIcons };
    });
  },

  addDesktopIcon: (iconDef: Omit<DesktopIcon, "id" | "position">) => {
    set((state) => {
      // Prevent duplicate shortcuts for the same app
      const alreadyExists = state.desktopIcons.some((icon) => icon.appId === iconDef.appId);
      if (alreadyExists) return state;

      // Find next free grid position (column 0, scanning rows)
      const occupiedRows = new Set(
        state.desktopIcons
          .filter((icon) => icon.position.x < DESKTOP_GRID_CELL * 2)
          .map((icon) => Math.round((icon.position.y - DESKTOP_GRID_OFFSET_Y) / DESKTOP_GRID_CELL))
      );
      let row = 0;
      while (occupiedRows.has(row)) row++;

      const newIcon: DesktopIcon = {
        ...iconDef,
        id: `custom-icon-${Date.now()}`,
        position: {
          x: DESKTOP_GRID_OFFSET_X,
          y: row * DESKTOP_GRID_CELL + DESKTOP_GRID_OFFSET_Y,
        },
      };

      const customDesktopIcons = [...state.customDesktopIcons, newIcon];
      const desktopIcons = [...state.desktopIcons, newIcon];

      const nextState = { ...state, customDesktopIcons, desktopIcons };
      persistSettings(state.userId, nextState);
      return { customDesktopIcons, desktopIcons };
    });
  },

  removeCustomDesktopIcon: (id: string) => {
    set((state) => {
      const customDesktopIcons = state.customDesktopIcons.filter((icon) => icon.id !== id);
      const desktopIcons = state.desktopIcons.filter((icon) => icon.id !== id);

      const nextState = { ...state, customDesktopIcons, desktopIcons };
      persistSettings(state.userId, nextState);
      return { customDesktopIcons, desktopIcons };
    });
  },
}));

// Standalone function for saving window states (called from Desktop)
export async function saveWindowStates(userId: string, windows: import("@/types/os").OSWindow[]) {
  const states = windows.map((w) => ({
    appId: w.appId,
    windowId: w.id,
    title: w.title,
    x: w.position.x,
    y: w.position.y,
    width: w.size.width,
    height: w.size.height,
    state: w.state,
  }));
  if (typeof window !== 'undefined') {
    localStorage.setItem(`mittenos:window_states:${userId}`, JSON.stringify(states));
  }
}

export async function loadWindowStates(userId: string) {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(`mittenos:window_states:${userId}`);
  if (saved) {
    try {
      return JSON.parse(saved) as Array<{
        appId: string;
        windowId: string;
        title: string;
        x: number;
        y: number;
        width: number;
        height: number;
        state: string;
      }>;
    } catch (e) {
      console.error("Failed to parse window states:", e);
    }
  }
  return [];
}

export async function saveIconPositions(userId: string, icons: DesktopIcon[]) {
  const store = useDesktopStore.getState();
  await persistDesktopState(userId, store, icons);
}

export async function loadIconPositions(userId: string) {
  if (typeof window === 'undefined') return {};

  let positions: Record<string, WindowPosition> = {};
  let loadedFromVFS = false;

  try {
    const { useFileSystemStore } = await import("./filesystem-store");
    const fsStore = useFileSystemStore.getState();
    const node = fsStore.getNode("/.desktop_state.json");
    if (node) {
      const content = await fsStore.fetchFileContentIfNeeded(node.id);
      if (content) {
        const desktopState = JSON.parse(content);
        positions = desktopState.positions || {};
        loadedFromVFS = true;
        console.log("[DesktopStore] Loaded icon positions from VFS state:", positions);
      }
    }
  } catch (e) {
    console.error("Failed to load icon positions from VFS state:", e);
  }

  if (!loadedFromVFS) {
    const saved = localStorage.getItem(`mittenos:icon_positions:${userId}`);
    if (saved) {
      try {
        positions = JSON.parse(saved) as Record<string, WindowPosition>;
        console.log("[DesktopStore] Loaded icon positions from legacy localStorage fallback:", positions);
      } catch (e) {
        console.error("Failed to parse icon positions from legacy localStorage:", e);
      }
    }
  }

  return positions;
}

