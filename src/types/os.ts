import { ReactNode } from "react";

export type WindowState = "normal" | "minimized" | "maximized";

export const DESKTOP_GRID_CELL = 84;
export const DESKTOP_GRID_OFFSET_X = 16;
export const DESKTOP_GRID_OFFSET_Y = 16;
export const DRAG_THRESHOLD = 3;

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface OSWindow {
  id: string;
  appId: string;
  title: string;
  position: WindowPosition;
  size: WindowSize;
  minSize: WindowSize;
  state: WindowState;
  zIndex: number;
  preMaximizePosition: WindowPosition | null;
  preMaximizeSize: WindowSize | null;
}

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: AppCategory;
  defaultWindowSize: WindowSize;
  minWindowSize: WindowSize;
  singleton?: boolean;
  component: ReactNode;
}

export type AppCategory = "system" | "utilities" | "productivity" | "internet" | "media" | "development";

export interface DesktopIcon {
  id: string;
  appId: string;
  label: string;
  icon: string;
  position: WindowPosition;
}

export interface FSNode {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FSNode[];
  parentId: string | null;
  createdAt: number;
  modifiedAt: number;
  icon?: string;
  mimeType?: string;
}

export interface UserAppRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  html_content: string;
  default_window_size: WindowSize;
  min_window_size: WindowSize;
  singleton: boolean;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAppDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: AppCategory;
  defaultWindowSize: WindowSize;
  minWindowSize: WindowSize;
  singleton: boolean;
  htmlContent: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  timestamp: number;
  read: boolean;
}

export interface WallpaperOption {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
}

export const APP_REGISTRY: Record<string, Omit<AppDefinition, "component">> = {
  "file-explorer": {
    id: "file-explorer",
    name: "Files",
    icon: "FolderOpen",
    description: "Browse and manage your files",
    category: "system",
    defaultWindowSize: { width: 750, height: 500 },
    minWindowSize: { width: 400, height: 300 },
  },
  terminal: {
    id: "terminal",
    name: "Terminal",
    icon: "TerminalSquare",
    description: "Command line interface",
    category: "development",
    defaultWindowSize: { width: 700, height: 450 },
    minWindowSize: { width: 400, height: 250 },
  },
  "text-editor": {
    id: "text-editor",
    name: "Notepad",
    icon: "FileText",
    description: "Simple text editor",
    category: "productivity",
    defaultWindowSize: { width: 650, height: 500 },
    minWindowSize: { width: 350, height: 250 },
  },
  calculator: {
    id: "calculator",
    name: "Calculator",
    icon: "Calculator",
    description: "Basic calculator",
    category: "utilities",
    defaultWindowSize: { width: 350, height: 500 },
    minWindowSize: { width: 300, height: 400 },
    singleton: true,
  },
  settings: {
    id: "settings",
    name: "Settings",
    icon: "Settings",
    description: "System settings and preferences",
    category: "system",
    defaultWindowSize: { width: 700, height: 500 },
    minWindowSize: { width: 500, height: 400 },
    singleton: true,
  },
  browser: {
    id: "browser",
    name: "Browser",
    icon: "Globe",
    description: "Web browser",
    category: "internet",
    defaultWindowSize: { width: 900, height: 600 },
    minWindowSize: { width: 500, height: 350 },
  },
  "image-viewer": {
    id: "image-viewer",
    name: "Photos",
    icon: "Image",
    description: "View and browse images",
    category: "media",
    defaultWindowSize: { width: 700, height: 550 },
    minWindowSize: { width: 400, height: 300 },
  },
  "app-store": {
    id: "app-store",
    name: "App Store",
    icon: "Store",
    description: "Discover and install apps",
    category: "system",
    defaultWindowSize: { width: 800, height: 550 },
    minWindowSize: { width: 500, height: 400 },
    singleton: true,
  },
  weather: {
    id: "weather",
    name: "Weather",
    icon: "CloudSun",
    description: "Check weather conditions",
    category: "utilities",
    defaultWindowSize: { width: 400, height: 500 },
    minWindowSize: { width: 320, height: 400 },
    singleton: true,
  },
  "about-system": {
    id: "about-system",
    name: "About",
    icon: "Info",
    description: "System information",
    category: "system",
    defaultWindowSize: { width: 450, height: 400 },
    minWindowSize: { width: 350, height: 350 },
    singleton: true,
  },
};
