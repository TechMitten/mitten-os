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
  notifications: Notification[];
  startMenuOpen: boolean;
  contextMenu: ContextMenuState | null;
  searchQuery: string;
  loaded: boolean;
  userId: string | null;
  welcomeDismissed: boolean;
  persistWindows: boolean;
  iconSize: "small" | "medium" | "large";

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

export const useDesktopStore = create<DesktopStore>((set, get) => ({
  wallpaper: "linear-gradient(135deg, #030b20, #0d2b63, #071730)",
  theme: "dark",
  desktopIcons: defaultIcons,
  notifications: [],
  startMenuOpen: false,
  contextMenu: null,
  searchQuery: "",
  loaded: false,
  userId: null,
  welcomeDismissed: false,
  persistWindows: true,
  iconSize: "medium",

  loadSettings: async (userId: string) => {
    if (isGuest(userId)) {
      set({ loaded: true, userId, welcomeDismissed: false, persistWindows: false });
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

    set({
      theme: data.theme || "dark",
      wallpaper: data.wallpaper || "linear-gradient(135deg, #030b20, #0d2b63, #071730)",
      welcomeDismissed: localStorage.getItem(`mittenos:welcomeDismissed:${userId}`) === "true" || (data.settings_json?.welcomeDismissed ?? false),
      persistWindows: data.settings_json?.persistWindows ?? true,
      iconSize: data.settings_json?.iconSize || "medium",
      userId,
      loaded: true,
    });
  },

  setWallpaper: (url: string) => {
    set({ wallpaper: url });
    const { userId, theme, welcomeDismissed, persistWindows, iconSize } = get();
    if (!userId || isGuest(userId)) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({ user_id: userId, theme, wallpaper: url, settings_json: { welcomeDismissed, persistWindows, iconSize }, updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.error("Failed to save wallpaper:", error); });
  },

  setTheme: (theme: "light" | "dark") => {
    const wallpaper =
      theme === "light"
        ? "linear-gradient(135deg, #c9d6ff, #e2e2e2, #f5f7fa)"
        : "linear-gradient(135deg, #030b20, #0d2b63, #071730)";
    set({ theme, wallpaper });
    const { userId, welcomeDismissed, persistWindows, iconSize } = get();
    if (!userId || isGuest(userId)) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({ user_id: userId, theme, wallpaper, settings_json: { welcomeDismissed, persistWindows, iconSize }, updated_at: new Date().toISOString() })
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
    const { userId, welcomeDismissed, persistWindows, iconSize } = get();
    if (!userId || isGuest(userId)) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({ user_id: userId, theme: next, wallpaper, settings_json: { welcomeDismissed, persistWindows, iconSize }, updated_at: new Date().toISOString() })
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
    const { userId, theme, wallpaper, persistWindows, iconSize } = get();
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
        settings_json: { welcomeDismissed: dismissed, persistWindows, iconSize },
        updated_at: new Date().toISOString(),
      });
  },

  setPersistWindows: (persist: boolean) => {
    set({ persistWindows: persist });
    const { userId, theme, wallpaper, welcomeDismissed, iconSize } = get();
    if (!userId || isGuest(userId)) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
        theme,
        wallpaper,
        settings_json: { welcomeDismissed, persistWindows: persist, iconSize },
        updated_at: new Date().toISOString(),
      });
  },

  setIconSize: (size: "small" | "medium" | "large") => {
    set({ iconSize: size });
    const { userId, theme, wallpaper, welcomeDismissed, persistWindows } = get();
    if (!userId || isGuest(userId)) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
        theme,
        wallpaper,
        settings_json: { welcomeDismissed, persistWindows, iconSize: size },
        updated_at: new Date().toISOString(),
      });
  },

  reset: () => {
    const { theme, wallpaper } = get();
    set({
      wallpaper,
      theme,
      desktopIcons: defaultIcons,
      notifications: [],
      startMenuOpen: false,
      contextMenu: null,
      searchQuery: "",
      loaded: false,
      userId: null,
      welcomeDismissed: false,
      persistWindows: true,
      iconSize: "medium",
    });
  },
}));

// Standalone function for saving window states (called from Desktop)
export async function saveWindowStates(userId: string, windows: import("@/types/os").OSWindow[]) {
  if (isGuest(userId)) return;
  const supabase = createClient();
  const { theme, wallpaper, welcomeDismissed, persistWindows, iconSize } = useDesktopStore.getState();
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
    .upsert({ user_id: userId, theme, wallpaper, window_states: states, settings_json: { welcomeDismissed, persistWindows, iconSize }, updated_at: new Date().toISOString() });
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
  const { theme, wallpaper, welcomeDismissed, persistWindows, iconSize } = useDesktopStore.getState();
  const positions: Record<string, WindowPosition> = {};
  for (const icon of icons) {
    positions[icon.id] = icon.position;
  }
  await supabase
    .from("user_settings")
    .upsert({ user_id: userId, theme, wallpaper, icon_positions: positions, settings_json: { welcomeDismissed, persistWindows, iconSize }, updated_at: new Date().toISOString() });
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
