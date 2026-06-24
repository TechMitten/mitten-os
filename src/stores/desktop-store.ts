import { create } from "zustand";
import { DesktopIcon, DESKTOP_GRID_CELL, DESKTOP_GRID_OFFSET_X, DESKTOP_GRID_OFFSET_Y, Notification, WindowPosition } from "@/types/os";
import { createClient } from "@/lib/supabase/client";

function isGuest(userId: string): boolean {
  return userId.startsWith("guest-");
}

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
    if (isGuest(userId)) {
      set({ loaded: true, userId, welcomeDismissed: false, persistWindows: false, deletedIconIds: [], renamedIconLabels: {} });
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      // Settings don't exist yet — use defaults and upsert
      const state = get();
      await supabase.from("user_settings").upsert({
        user_id: userId,
        theme: state.theme,
        wallpaper: state.wallpaper,
        updated_at: new Date().toISOString(),
      });
      set({ loaded: true, userId });
      return;
    }

    const deletedIconIds = data.settings_json?.deletedIconIds || [];
    const renamedIconLabels = data.settings_json?.renamedIconLabels || {};
    const customDesktopIcons: DesktopIcon[] = data.settings_json?.customDesktopIcons || [];
    const updatedIcons = defaultIcons
      .filter((icon) => !deletedIconIds.includes(icon.id))
      .map((icon) => ({
        ...icon,
        label: renamedIconLabels[icon.id] || icon.label,
      }));

    set({
      theme: data.theme || "dark",
      wallpaper: data.wallpaper || "linear-gradient(135deg, #030b20, #0d2b63, #071730)",
      welcomeDismissed: localStorage.getItem(`mittenos:welcomeDismissed:${userId}`) === "true" || (data.settings_json?.welcomeDismissed ?? false),
      persistWindows: data.settings_json?.persistWindows ?? false,
      iconSize: data.settings_json?.iconSize || "medium",
      userId,
      loaded: true,
      deletedIconIds,
      renamedIconLabels,
      customDesktopIcons,
      desktopIcons: [...updatedIcons, ...customDesktopIcons],
    });
  },

  setWallpaper: (url: string) => {
    set({ wallpaper: url });
    const { userId, theme } = get();
    if (!userId || isGuest(userId)) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({ user_id: userId, theme, wallpaper: url, settings_json: getSettingsJson(get()), updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.error("Failed to save wallpaper:", error); });
  },

  setTheme: (theme: "light" | "dark") => {
    const wallpaper =
      theme === "light"
        ? "linear-gradient(135deg, #c9d6ff, #e2e2e2, #f5f7fa)"
        : "linear-gradient(135deg, #030b20, #0d2b63, #071730)";
    set({ theme, wallpaper });
    const { userId } = get();
    if (!userId || isGuest(userId)) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({ user_id: userId, theme, wallpaper, settings_json: getSettingsJson(get()), updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.error("Failed to save theme:", error); });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === "dark" ? "light" : "dark";
    const wallpaper =
      next === "light"
        ? "linear-gradient(135deg, #c9d6ff, #e2e2e2, #f5f7fa)"
        : "linear-gradient(135deg, #030b20, #0d2b63, #071730)";
    set({ theme: next, wallpaper });
    const { userId } = get();
    if (!userId || isGuest(userId)) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({ user_id: userId, theme: next, wallpaper, settings_json: getSettingsJson(get()), updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.error("Failed to save theme:", error); });
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
    const { userId, theme, wallpaper } = get();
    if (userId) {
      localStorage.setItem(`mittenos:welcomeDismissed:${userId}`, String(dismissed));
    }
    if (!userId || isGuest(userId)) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
        theme,
        wallpaper,
        settings_json: getSettingsJson(get()),
        updated_at: new Date().toISOString(),
      });
  },

  setPersistWindows: (persist: boolean) => {
    set({ persistWindows: persist });
    const { userId, theme, wallpaper } = get();
    if (!userId || isGuest(userId)) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
        theme,
        wallpaper,
        settings_json: getSettingsJson(get()),
        updated_at: new Date().toISOString(),
      });
  },

  setIconSize: (size: "small" | "medium" | "large") => {
    set({ iconSize: size });
    const { userId, theme, wallpaper } = get();
    if (!userId || isGuest(userId)) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
        theme,
        wallpaper,
        settings_json: getSettingsJson(get()),
        updated_at: new Date().toISOString(),
      });
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
      
      const { userId, theme, wallpaper } = state;
      if (userId && !isGuest(userId)) {
        const supabase = createClient();
        supabase
          .from("user_settings")
          .upsert({
            user_id: userId,
            theme,
            wallpaper,
            settings_json: getSettingsJson({ ...state, renamedIconLabels }),
            updated_at: new Date().toISOString(),
          })
          .then(({ error }) => { if (error) console.error("Failed to save renamed icon label:", error); });
      }

      return { renamedIconLabels, desktopIcons };
    });
  },

  deleteDesktopIcon: (id: string) => {
    set((state) => {
      const deletedIconIds = [...state.deletedIconIds, id];
      const desktopIcons = state.desktopIcons.filter((icon) => icon.id !== id);

      const { userId, theme, wallpaper } = state;
      if (userId && !isGuest(userId)) {
        const supabase = createClient();
        supabase
          .from("user_settings")
          .upsert({
            user_id: userId,
            theme,
            wallpaper,
            settings_json: getSettingsJson({ ...state, deletedIconIds }),
            updated_at: new Date().toISOString(),
          })
          .then(({ error }) => { if (error) console.error("Failed to save deleted icon status:", error); });
      }

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

      const { userId, theme, wallpaper } = state;
      if (userId && !isGuest(userId)) {
        const supabase = createClient();
        supabase
          .from("user_settings")
          .upsert({
            user_id: userId,
            theme,
            wallpaper,
            settings_json: getSettingsJson({ ...state, customDesktopIcons }),
            updated_at: new Date().toISOString(),
          })
          .then(({ error }) => { if (error) console.error("Failed to save custom desktop icon:", error); });
      }

      return { customDesktopIcons, desktopIcons };
    });
  },

  removeCustomDesktopIcon: (id: string) => {
    set((state) => {
      const customDesktopIcons = state.customDesktopIcons.filter((icon) => icon.id !== id);
      const desktopIcons = state.desktopIcons.filter((icon) => icon.id !== id);

      const { userId, theme, wallpaper } = state;
      if (userId && !isGuest(userId)) {
        const supabase = createClient();
        supabase
          .from("user_settings")
          .upsert({
            user_id: userId,
            theme,
            wallpaper,
            settings_json: getSettingsJson({ ...state, customDesktopIcons }),
            updated_at: new Date().toISOString(),
          })
          .then(({ error }) => { if (error) console.error("Failed to remove custom desktop icon:", error); });
      }

      return { customDesktopIcons, desktopIcons };
    });
  },
}));

// Standalone function for saving window states (called from Desktop)
export async function saveWindowStates(userId: string, windows: import("@/types/os").OSWindow[]) {
  if (isGuest(userId)) return;
  const supabase = createClient();
  const { theme, wallpaper } = useDesktopStore.getState();
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
  await supabase
    .from("user_settings")
    .upsert({ user_id: userId, theme, wallpaper, window_states: states, settings_json: getSettingsJson(useDesktopStore.getState()), updated_at: new Date().toISOString() });
}

export async function loadWindowStates(userId: string) {
  if (isGuest(userId)) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("window_states")
    .eq("user_id", userId)
    .single();
  return (data?.window_states ?? []) as Array<{
    appId: string;
    windowId: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    state: string;
  }>;
}

export async function saveIconPositions(userId: string, icons: DesktopIcon[]) {
  if (isGuest(userId)) return;
  const supabase = createClient();
  const { theme, wallpaper } = useDesktopStore.getState();
  const positions: Record<string, WindowPosition> = {};
  for (const icon of icons) {
    positions[icon.id] = icon.position;
  }
  await supabase
    .from("user_settings")
    .upsert({ user_id: userId, theme, wallpaper, icon_positions: positions, settings_json: getSettingsJson(useDesktopStore.getState()), updated_at: new Date().toISOString() });
}

export async function loadIconPositions(userId: string) {
  if (isGuest(userId)) return {};
  const supabase = createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("icon_positions")
    .eq("user_id", userId)
    .single();
  return (data?.icon_positions ?? {}) as Record<string, WindowPosition>;
}
