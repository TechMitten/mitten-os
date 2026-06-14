import { create } from "zustand";
import { OSWindow, WindowPosition, WindowSize, APP_REGISTRY } from "@/types/os";

export interface OpenWindowOverrides {
  defaultSize?: WindowSize;
  minSize?: WindowSize;
  singleton?: boolean;
}

interface WindowStore {
  windows: OSWindow[];
  activeWindowId: string | null;
  nextZIndex: number;

  openWindow: (appId: string, title?: string, overrides?: OpenWindowOverrides) => string;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  unmaximizeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  updateWindowPosition: (windowId: string, position: WindowPosition) => void;
  updateWindowSize: (windowId: string, size: WindowSize) => void;
  updateWindowTitle: (windowId: string, title: string) => void;
  toggleMinimize: (windowId: string) => void;
  toggleMaximize: (windowId: string) => void;
}

let windowCounter = 0;

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  activeWindowId: null,
  nextZIndex: 1,

  openWindow: (appId: string, title?: string, overrides?: OpenWindowOverrides) => {
    const appDef = overrides ? undefined : APP_REGISTRY[appId];
    if (!appDef && !overrides) return "";

    const effectiveName = appDef?.name ?? title ?? "";
    const defaultSize = overrides?.defaultSize ?? appDef?.defaultWindowSize ?? { width: 700, height: 500 };
    const minSize = overrides?.minSize ?? appDef?.minWindowSize ?? { width: 300, height: 200 };
    const isSingleton = overrides?.singleton ?? appDef?.singleton ?? false;

    // Check singleton
    if (isSingleton) {
      const existing = get().windows.find((w) => w.appId === appId);
      if (existing) {
        if (existing.state === "minimized") {
          get().restoreWindow(existing.id);
        }
        get().focusWindow(existing.id);
        return existing.id;
      }
    }

    windowCounter++;
    const id = `window-${appId}-${windowCounter}`;
    const offset = (windowCounter % 8) * 30;

    // Center the window with slight offset
    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
    const screenHeight = typeof window !== "undefined" ? window.innerHeight : 1080;
    const pos: WindowPosition = {
      x: Math.max(50, (screenWidth - defaultSize.width) / 2 + offset),
      y: Math.max(30, (screenHeight - defaultSize.height) / 2 + offset - 40),
    };

    const newWindow: OSWindow = {
      id,
      appId,
      title: title || effectiveName,
      position: pos,
      size: { ...defaultSize },
      minSize: { ...minSize },
      state: "normal",
      zIndex: get().nextZIndex,
      preMaximizePosition: null,
      preMaximizeSize: null,
    };

    set((state) => ({
      windows: [...state.windows, newWindow],
      activeWindowId: id,
      nextZIndex: state.nextZIndex + 1,
    }));

    return id;
  },

  closeWindow: (windowId: string) => {
    set((state) => {
      const remaining = state.windows.filter((w) => w.id !== windowId);
      return {
        windows: remaining,
        activeWindowId:
          state.activeWindowId === windowId
            ? remaining.length > 0
              ? remaining[remaining.length - 1].id
              : null
            : state.activeWindowId,
      };
    });
  },

  minimizeWindow: (windowId: string) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, state: "minimized" as const } : w
      ),
      activeWindowId:
        state.activeWindowId === windowId
          ? [...state.windows.filter((w) => w.id !== windowId && w.state !== "minimized")]
              .sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null
          : state.activeWindowId,
    }));
  },

  restoreWindow: (windowId: string) => {
    const nextZ = get().nextZIndex;
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, state: "normal" as const, zIndex: nextZ } : w
      ),
      activeWindowId: windowId,
      nextZIndex: nextZ + 1,
    }));
  },

  maximizeWindow: (windowId: string) => {
    const nextZ = get().nextZIndex;
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId
          ? {
              ...w,
              state: "maximized" as const,
              preMaximizePosition: w.position,
              preMaximizeSize: w.size,
              zIndex: nextZ,
            }
          : w
      ),
      activeWindowId: windowId,
      nextZIndex: nextZ + 1,
    }));
  },

  unmaximizeWindow: (windowId: string) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId && w.preMaximizePosition && w.preMaximizeSize
          ? {
              ...w,
              state: "normal" as const,
              position: w.preMaximizePosition,
              size: w.preMaximizeSize,
              preMaximizePosition: null,
              preMaximizeSize: null,
            }
          : w
      ),
    }));
  },

  focusWindow: (windowId: string) => {
    const nextZ = get().nextZIndex;
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, zIndex: nextZ } : w
      ),
      activeWindowId: windowId,
      nextZIndex: nextZ + 1,
    }));
  },

  updateWindowPosition: (windowId: string, position: WindowPosition) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, position } : w
      ),
    }));
  },

  updateWindowSize: (windowId: string, size: WindowSize) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId
          ? {
              ...w,
              size: {
                width: Math.max(size.width, w.minSize.width),
                height: Math.max(size.height, w.minSize.height),
              },
            }
          : w
      ),
    }));
  },

  updateWindowTitle: (windowId: string, title: string) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, title } : w
      ),
    }));
  },

  toggleMinimize: (windowId: string) => {
    const win = get().windows.find((w) => w.id === windowId);
    if (!win) return;
    if (win.state === "minimized") {
      get().restoreWindow(windowId);
    } else if (get().activeWindowId === windowId) {
      get().minimizeWindow(windowId);
    } else {
      get().focusWindow(windowId);
    }
  },

  toggleMaximize: (windowId: string) => {
    const win = get().windows.find((w) => w.id === windowId);
    if (!win) return;
    if (win.state === "maximized") {
      get().unmaximizeWindow(windowId);
    } else {
      get().maximizeWindow(windowId);
    }
  },
}));
