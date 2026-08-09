'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { useDesktopStore } from '@/stores/desktop-store';
import { Switch } from '@/components/ui/switch';
import {
  Sun,
  Moon,
  Palette,
  Monitor,
  Info,
  ImageIcon,
  Cpu,
  Layers,
  Box,
  LayoutPanelTop,
  Key,
  Shield,
  Eye,
  EyeOff,
  HardDrive,
  Database,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Server,
  FolderOpen,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWindowStore } from '@/stores/window-store';

type Section = 'appearance' | 'wallpaper' | 'display' | 'general' | 'storage' | 'about' | 'ai-keys';

const SIDEBAR_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <LayoutPanelTop className="w-4 h-4" /> },
  { id: 'storage', label: 'Storage', icon: <HardDrive className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'wallpaper', label: 'Wallpaper', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'display', label: 'Display', icon: <Monitor className="w-4 h-4" /> },
  { id: 'ai-keys', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
];

const WALLPAPERS = [
  {
    id: 'wp-1',
    name: 'Deep Space',
    gradient: 'linear-gradient(135deg, #030b20, #0d2b63, #071730)',
  },
  {
    id: 'wp-2',
    name: 'Sunset Glow',
    gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
  },
  {
    id: 'wp-3',
    name: 'Ocean Blue',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
  },
  {
    id: 'wp-4',
    name: 'Forest Green',
    gradient: 'linear-gradient(135deg, #11998e, #38ef7d)',
  },
  {
    id: 'wp-5',
    name: 'Warm Flame',
    gradient: 'linear-gradient(135deg, #f83600, #f9d423)',
  },
  {
    id: 'wp-6',
    name: 'Night Sky',
    gradient: 'linear-gradient(135deg, #0c1445, #533483, #e93368)',
  },
  {
    id: 'wp-7',
    name: 'Arctic',
    gradient: 'linear-gradient(135deg, #c9d6ff, #e2e2e2)',
  },
  {
    id: 'wp-8',
    name: 'Midnight',
    gradient: 'linear-gradient(135deg, #232526, #414345)',
  },
  {
    id: 'wp-9',
    name: 'Grunge',
    image: '/grungewallpaper.png',
  },
];

const ACCENT_COLORS = [
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
];

export default function SettingsApp() {
  const [activeSection, setActiveSection] = useState<Section>(
    () => (useDesktopStore.getState().settingsInitialSection as Section) || 'general'
  );
  const [selectedAccent, setSelectedAccent] = useState('Amber');

  useEffect(() => {
    if (useDesktopStore.getState().settingsInitialSection) {
      useDesktopStore.getState().setSettingsInitialSection(null);
    }
  }, []);
  const iconSize = useDesktopStore((s) => s.iconSize) || 'medium';
  const setIconSize = useDesktopStore((s) => s.setIconSize);

  const theme = useDesktopStore((s) => s.theme);
  const toggleTheme = useDesktopStore((s) => s.toggleTheme);
  const wallpaper = useDesktopStore((s) => s.wallpaper);
  const setWallpaper = useDesktopStore((s) => s.setWallpaper);
  const persistWindows = useDesktopStore((s) => s.persistWindows);
  const setPersistWindows = useDesktopStore((s) => s.setPersistWindows);

  const isDark = theme === 'dark';

  return (
    <div className="flex h-full bg-card dark:bg-zinc-900 text-card-foreground select-none overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 bg-muted dark:bg-zinc-800/40 border-r border-border p-3 flex flex-col gap-1 shrink-0 overflow-y-auto settings-scrollbar">
        {/* Local user card */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-border/40">
          <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
            M
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate leading-tight">MittenOS User</p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight">Local Storage</p>
          </div>
        </div>
        <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
          Settings
        </h2>
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeSection === item.id
                ? 'bg-accent dark:bg-white/10 text-foreground'
                : 'text-muted-foreground hover:bg-accent dark:hover:bg-white/5 hover:text-foreground/80'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto settings-scrollbar">
        {activeSection === 'appearance' && (
          <AppearanceSection
            isDark={isDark}
            toggleTheme={toggleTheme}
            selectedAccent={selectedAccent}
            setSelectedAccent={setSelectedAccent}
          />
        )}
        {activeSection === 'wallpaper' && (
          <WallpaperSection
            wallpaper={wallpaper}
            setWallpaper={setWallpaper}
          />
        )}
        {activeSection === 'display' && (
          <DisplaySection iconSize={iconSize} setIconSize={setIconSize} />
        )}
        {activeSection === 'general' && (
          <GeneralSection
            persistWindows={persistWindows}
            setPersistWindows={setPersistWindows}
          />
        )}
        {activeSection === 'storage' && <StorageSection />}
        {activeSection === 'ai-keys' && <AiKeysSection />}
        {activeSection === 'about' && <AboutSection />}
      </div>
    </div>
  );
}

/* ─── Appearance Section ──────────────────────────────────── */

function AppearanceSection({
  isDark,
  toggleTheme,
  selectedAccent,
  setSelectedAccent,
}: {
  isDark: boolean;
  toggleTheme: () => void;
  selectedAccent: string;
  setSelectedAccent: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Appearance</h3>

      {/* Theme toggle */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div className="flex items-center gap-3">
          {isDark ? (
            <Moon className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Sun className="w-4 h-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm text-foreground/80">Dark Mode</p>
            <p className="text-xs text-muted-foreground">
              Switch between light and dark theme
            </p>
          </div>
        </div>
        <Switch checked={isDark} onCheckedChange={toggleTheme} />
      </div>

      {/* Accent color picker */}
      <div className="py-3 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm text-foreground/80">Accent Color</p>
            <p className="text-xs text-muted-foreground">
              Choose your system accent color
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap pl-7">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => setSelectedAccent(color.name)}
              className={`w-8 h-8 rounded-full transition-all ${
                selectedAccent === color.name
                  ? 'ring-2 ring-offset-2 ring-offset-card dark:ring-offset-zinc-900 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: color.value,
                boxShadow:
                  selectedAccent === color.name
                    ? `0 0 0 2px #18181b, 0 0 0 4px ${color.value}`
                    : undefined,
              }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Preview card */}
      <div className="mt-4 p-4 rounded-xl bg-muted dark:bg-zinc-800/60 border border-border">
        <p className="text-xs text-muted-foreground/60 mb-2 uppercase tracking-wider">
          Preview
        </p>
        <div className="flex gap-3">
          <div
            className="w-20 h-14 rounded-lg"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #27272a, #3f3f46)'
                : 'linear-gradient(135deg, #f4f4f5, #e4e4e7)',
            }}
          />
          <div className="flex-1 flex flex-col gap-1.5 justify-center">
            <div
              className="h-2 rounded-full w-3/4"
              style={{
                background: isDark ? '#3f3f46' : '#d4d4d8',
              }}
            />
            <div
              className="h-2 rounded-full w-1/2"
              style={{
                background: isDark ? '#27272a' : '#e4e4e7',
              }}
            />
            <div
              className="h-1.5 rounded-full w-1/3 mt-1"
              style={{
                backgroundColor:
                  ACCENT_COLORS.find((c) => c.name === selectedAccent)?.value ??
                  '#f59e0b',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Wallpaper Section ───────────────────────────────────── */

function WallpaperSection({
  wallpaper,
  setWallpaper,
}: {
  wallpaper: string;
  setWallpaper: (url: string) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Wallpaper</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Choose a wallpaper for your desktop
      </p>
      <div className="grid grid-cols-3 gap-3">
        {WALLPAPERS.map((wp) => {
          const value = wp.image || wp.gradient!;
          const isSelected = wallpaper === value;
          return (
            <button
              key={wp.id}
              onClick={() => setWallpaper(value)}
              className={`h-24 rounded-lg cursor-pointer border-2 transition-all hover:border-white/30 ${
                isSelected ? 'border-amber-500' : 'border-transparent'
              }`}
              style={
                wp.image
                  ? { backgroundImage: `url(${wp.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: wp.gradient }
              }
              title={wp.name}
            >
              <div className="flex items-end justify-center h-full pb-2">
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-amber-500/30 text-amber-500 dark:text-amber-300'
                      : 'bg-black/30 text-white/60'
                  }`}
                >
                  {wp.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Display Section ─────────────────────────────────────── */

function DisplaySection({
  iconSize,
  setIconSize,
}: {
  iconSize: 'small' | 'medium' | 'large';
  setIconSize: (v: 'small' | 'medium' | 'large') => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Display</h3>

      {/* Taskbar position */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm text-foreground/80">Taskbar Position</p>
            <p className="text-xs text-muted-foreground">Bottom of screen</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground/60 bg-accent dark:bg-white/5 px-2 py-1 rounded">
          Bottom
        </span>
      </div>

      {/* Icon size */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Box className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm text-foreground/80">Desktop Icon Size</p>
            <p className="text-xs text-muted-foreground">
              Adjust the size of desktop icons
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setIconSize(size)}
              className={`text-xs px-3 py-1 rounded-md transition-colors capitalize ${
                iconSize === size
                  ? 'bg-accent dark:bg-white/15 text-foreground'
                  : 'text-muted-foreground hover:bg-accent dark:hover:bg-white/5 hover:text-foreground/60'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Resolution info */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Monitor className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm text-foreground/80">Resolution</p>
            <p className="text-xs text-muted-foreground">Current display resolution</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground/60">
          {typeof window !== 'undefined'
            ? `${window.screen.width} × ${window.screen.height}`
            : '—'}
        </span>
      </div>
    </div>
  );
}

/* ─── General Section ─────────────────────────────────────── */

function GeneralSection({
  persistWindows,
  setPersistWindows,
}: {
  persistWindows: boolean;
  setPersistWindows: (v: boolean) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">General</h3>

      {/* Restore windows toggle */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <LayoutPanelTop className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm text-foreground/80">Restore open windows</p>
            <p className="text-xs text-muted-foreground">
              Remember open apps and their positions across sessions
            </p>
          </div>
        </div>
        <Switch checked={persistWindows} onCheckedChange={setPersistWindows} />
      </div>
    </div>
  );
}

/* ─── About Section ───────────────────────────────────────── */

function AboutSection() {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">About</h3>

      <div className="flex flex-col items-center justify-center py-6">
        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
          <Cpu className="w-10 h-10 text-white" />
        </div>

        <h4 className="text-xl font-semibold text-foreground mb-1">MittenOS</h4>
        <p className="text-sm text-muted-foreground mb-6">Version 1.0.0</p>

        <div className="w-full max-w-xs space-y-3">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted dark:bg-zinc-800/60 border border-border">
            <span className="text-xs text-muted-foreground">System</span>
            <span className="text-xs text-foreground/70">MittenOS</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted dark:bg-zinc-800/60 border border-border">
            <span className="text-xs text-muted-foreground">Version</span>
            <span className="text-xs text-foreground/70">1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted dark:bg-zinc-800/60 border border-border">
            <span className="text-xs text-muted-foreground">Built with</span>
            <span className="text-xs text-foreground/70">Next.js 16, React 19, TypeScript</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted dark:bg-zinc-800/60 border border-border">
            <span className="text-xs text-muted-foreground">Renderer</span>
            <span className="text-xs text-foreground/70">WebKit / Blink</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/30 mt-8 text-center">
          © 2025 MittenOS. All rights reserved.
        </p>
      </div>
    </div>
  );
}

/* ─── AI API Keys Section ──────────────────────────────────── */

function AiKeysSection() {
  const openWindow = useWindowStore((s) => s.openWindow);

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-lg font-medium mb-1">Security</h3>
        <p className="text-xs text-muted-foreground">
          Centralized AI configurations.
        </p>
      </div>

      <div className="p-5 rounded-xl border border-border bg-muted/20 space-y-4">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Centralized AI Keys</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI API configurations are now managed globally in the <span className="font-semibold text-amber-500">Keys</span> app. Please use the Keys app to configure your OpenAI-compatible endpoint, API key, and model.
            </p>
          </div>
        </div>
        
        <div className="pt-2">
          <button
            onClick={() => openWindow('keys')}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 font-semibold text-white transition-colors active:scale-[0.98] text-xs cursor-pointer"
          >
            Open Keys App
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Storage Section ─────────────────────────────────────── */

interface StorageCategoryUsage {
  id: string;
  name: string;
  bytes: number;
  description: string;
  icon: React.ReactNode;
}

function StorageSection() {
  const { toast } = useToast();
  const userId = useFileSystemStore((s) => s.userId) || 'mitten-user';
  const loadFromDB = useFileSystemStore((s) => s.loadFromDB);

  const [metrics, setMetrics] = useState<{
    totalBytes: number;
    categories: StorageCategoryUsage[];
  }>({ totalBytes: 0, categories: [] });

  const calculateStorage = useCallback(() => {
    if (typeof window === 'undefined') return;

    let fsBytes = 0;
    let desktopBytes = 0;
    let keysBytes = 0;
    let appsBytes = 0;
    let chatBytes = 0;
    let otherBytes = 0;
    let totalBytes = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key) || '';
      const itemBytes = (key.length + val.length) * 2; // UTF-16 approximate
      totalBytes += itemBytes;

      if (key.startsWith('mittenos:fs:')) {
        fsBytes += itemBytes;
      } else if (
        key.startsWith('mittenos:settings:') ||
        key.startsWith('mittenos:icon_positions:') ||
        key.startsWith('mittenos:window_states:') ||
        key.startsWith('mittenos:welcomeDismissed:')
      ) {
        desktopBytes += itemBytes;
      } else if (
        key.startsWith('mittenos:ai_profiles') ||
        key.startsWith('mittenos:active_ai_profile')
      ) {
        keysBytes += itemBytes;
      } else if (
        key.startsWith('mittenos:user_apps') ||
        key.startsWith('mittenos:orion_projects')
      ) {
        appsBytes += itemBytes;
      } else if (
        key.startsWith('mittenos:chat_sessions:') ||
        key.startsWith('mittenos:chat_messages:')
      ) {
        chatBytes += itemBytes;
      } else if (key.startsWith('mittenos:')) {
        otherBytes += itemBytes;
      }
    }

    const categories: StorageCategoryUsage[] = [
      {
        id: 'fs',
        name: 'Virtual File System',
        bytes: fsBytes,
        description: 'User files, documents, pictures, and folders',
        icon: <FolderOpen className="w-4 h-4 text-emerald-500" />,
      },
      {
        id: 'desktop',
        name: 'Desktop & Workspace State',
        bytes: desktopBytes,
        description: 'Icon positions, theme, wallpaper, and window positions',
        icon: <LayoutPanelTop className="w-4 h-4 text-blue-500" />,
      },
      {
        id: 'keys',
        name: 'AI Keys & Profiles',
        bytes: keysBytes,
        description: 'Configured LLM providers and endpoint secrets',
        icon: <Shield className="w-4 h-4 text-amber-500" />,
      },
      {
        id: 'apps',
        name: 'Custom Apps & Projects',
        bytes: appsBytes,
        description: 'Orion app builder source codes and custom apps',
        icon: <Box className="w-4 h-4 text-purple-500" />,
      },
      {
        id: 'chat',
        name: 'AI Chat History',
        bytes: chatBytes,
        description: 'Coding assistant conversations and sessions',
        icon: <Cpu className="w-4 h-4 text-cyan-500" />,
      },
    ];

    if (otherBytes > 0) {
      categories.push({
        id: 'other',
        name: 'Other System Cache',
        bytes: otherBytes,
        description: 'Misc OS cache and settings',
        icon: <Database className="w-4 h-4 text-zinc-400" />,
      });
    }

    setMetrics({ totalBytes, categories });
  }, []);

  useEffect(() => {
    calculateStorage();
  }, [calculateStorage]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleResetFileSystem = async () => {
    if (typeof window === 'undefined') return;
    if (window.confirm('Are you sure you want to reset the Virtual File System? Your user files will be re-initialized to defaults.')) {
      localStorage.removeItem(`mittenos:fs:${userId}`);
      await loadFromDB(userId);
      calculateStorage();
      toast({
        title: 'File System Reset',
        description: 'File system re-initialized to default system folders.',
      });
    }
  };

  const handleClearAllStorage = () => {
    if (typeof window === 'undefined') return;
    if (window.confirm('⚠️ WARNING: This will delete ALL MittenOS local data, files, AI keys, and custom apps. Are you sure?')) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mittenos:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      toast({
        title: 'Storage Cleared',
        description: 'All local MittenOS data has been removed. Reloading system...',
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-lg font-medium mb-1">Storage</h3>
        <p className="text-xs text-muted-foreground">
          Manage your browser storage. All files, AI keys, and OS configurations are stored locally on this device.
        </p>
      </div>

      {/* Storage Backend Card */}
      <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">Browser LocalStorage</h4>
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Offline-first persistence. Total used: <span className="font-semibold text-foreground">{formatSize(metrics.totalBytes)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={calculateStorage}
            title="Refresh Storage Metrics"
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Storage Breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Storage Breakdown
        </h4>
        <div className="space-y-2">
          {metrics.categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-3 rounded-xl border border-border bg-card dark:bg-zinc-800/30"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  {cat.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{cat.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{cat.description}</p>
                </div>
              </div>
              <span className="text-xs font-mono font-medium text-muted-foreground shrink-0 ml-2">
                {formatSize(cat.bytes)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Storage Maintenance & Privacy */}
      <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-4">
        <div className="flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Zero Cloud Dependency & Privacy</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              No files or secrets are synced to external cloud services or remote servers. Everything is sandboxed within your browser.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border flex flex-wrap gap-2">
          <button
            onClick={handleResetFileSystem}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors cursor-pointer text-foreground"
          >
            Reset File System
          </button>
          <button
            onClick={handleClearAllStorage}
            className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 dark:text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            Clear All OS Data
          </button>
        </div>
      </div>
    </div>
  );
}
