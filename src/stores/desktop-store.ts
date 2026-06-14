import { create } from "zustand";
import { DesktopIcon, Notification } from "@/types/os";
import { createClient } from "@/lib/supabase/client";

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

const defaultIcons: DesktopIcon[] = [
  { id: "icon-1", appId: "file-explorer", label: "Files", icon: "FolderOpen", position: { x: 0, y: 0 } },
  { id: "icon-2", appId: "terminal", label: "Terminal", icon: "TerminalSquare", position: { x: 0, y: 1 } },
  { id: "icon-3", appId: "browser", label: "Browser", icon: "Globe", position: { x: 0, y: 2 } },
  { id: "icon-4", appId: "text-editor", label: "Notepad", icon: "FileText", position: { x: 0, y: 3 } },
  { id: "icon-5", appId: "settings", label: "Settings", icon: "Settings", position: { x: 0, y: 4 } },
];

let notificationCounter = 0;

export const useDesktopStore = create<DesktopStore>((set, get) => ({
  wallpaper: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
  theme: "dark",
  desktopIcons: defaultIcons,
  notifications: [],
  startMenuOpen: false,
  contextMenu: null,
  searchQuery: "",
  loaded: false,
  userId: null,
  welcomeDismissed: false,

  loadSettings: async (userId: string) => {
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
      wallpaper: data.wallpaper || "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      welcomeDismissed: data.settings_json?.welcomeDismissed ?? false,
      userId,
      loaded: true,
    });
  },

  setWallpaper: (url: string) => {
    set({ wallpaper: url });
    const { userId } = get();
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({ user_id: userId, wallpaper: url, updated_at: new Date().toISOString() });
  },

  setTheme: (theme: "light" | "dark") => {
    const wallpaper =
      theme === "light"
        ? "linear-gradient(135deg, #c9d6ff, #e2e2e2)"
        : "linear-gradient(135deg, #0f0c29, #302b63, #24243e)";
    set({ theme, wallpaper });
    const { userId } = get();
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({ user_id: userId, theme, wallpaper, updated_at: new Date().toISOString() });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === "dark" ? "light" : "dark";
    const wallpaper =
      next === "light"
        ? "linear-gradient(135deg, #c9d6ff, #e2e2e2)"
        : "linear-gradient(135deg, #0f0c29, #302b63, #24243e)";
    set({ theme: next, wallpaper });
    const { userId } = get();
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({ user_id: userId, theme: next, wallpaper, updated_at: new Date().toISOString() });
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

  setWelcomeDismissed: (dismissed: boolean) => {
    set({ welcomeDismissed: dismissed });
    const { userId } = get();
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
        settings_json: { welcomeDismissed: dismissed },
        updated_at: new Date().toISOString(),
      });
  },

  reset: () => {
    set({
      wallpaper: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      theme: "dark",
      desktopIcons: defaultIcons,
      notifications: [],
      startMenuOpen: false,
      contextMenu: null,
      searchQuery: "",
      loaded: false,
      userId: null,
      welcomeDismissed: false,
    });
  },
}));

// Standalone function for saving window states (called from Desktop)
export async function saveWindowStates(userId: string, windows: import("@/types/os").OSWindow[]) {
  const supabase = createClient();
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
    .upsert({ user_id: userId, window_states: states, updated_at: new Date().toISOString() });
}

export async function loadWindowStates(userId: string) {
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
