'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { useDesktopStore } from '@/stores/desktop-store';
import { useAuthStore } from '@/stores/auth-store';
import { Switch } from '@/components/ui/switch';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';
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
  Cloud,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
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

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isDark = theme === 'dark';

  return (
    <div className="flex h-full bg-card dark:bg-zinc-900 text-card-foreground select-none overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 bg-muted dark:bg-zinc-800/40 border-r border-border p-3 flex flex-col gap-1 shrink-0 overflow-y-auto settings-scrollbar">
        {/* User profile card */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-border/40">
          {isAuthenticated && user?.avatar ? (
            <img src={user.avatar} alt="avatar" className="w-7 h-7 rounded-full border border-border shrink-0 object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
              {(user?.user_metadata?.name || user?.user_metadata?.full_name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate leading-tight">
              {user?.user_metadata?.full_name || user?.user_metadata?.name || 'Local User'}
            </p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight flex items-center gap-1">
              {isAuthenticated ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  MittenOS Cloud
                </>
              ) : (
                'Local Storage'
              )}
            </p>
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

/* ─── Storage & Cloud Account Section ────────────────────────── */

interface StorageCategoryUsage {
  id: string;
  name: string;
  bytes: number;
  color: string;
}

function StorageSection() {
  const { toast } = useToast();
  const userId = useFileSystemStore((s) => s.userId) || 'mitten-user';
  const loadFromDB = useFileSystemStore((s) => s.loadFromDB);
  const syncWithPocketBase = useFileSystemStore((s) => s.syncWithPocketBase);

  const authUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.loading);
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword);
  const signUpWithPassword = useAuthStore((s) => s.signUpWithPassword);
  const signOut = useAuthStore((s) => s.signOut);

  // Auth Form states
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [verifyingTurnstile, setVerifyingTurnstile] = useState(false);

  // Action states
  const [isSyncing, setIsSyncing] = useState(false);

  // Local storage metrics
  const [metrics, setMetrics] = useState<{
    totalBytes: number;
    categories: StorageCategoryUsage[];
  }>({ totalBytes: 0, categories: [] });

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Email and password are required');
      return;
    }

    const hasTurnstileKey = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

    if (hasTurnstileKey) {
      if (!turnstileToken) {
        setAuthError('Please complete the security verification challenge.');
        return;
      }

      setVerifyingTurnstile(true);
      try {
        const verifyRes = await fetch('/api/auth/verify-turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: turnstileToken }),
        });
        const verifyData = await verifyRes.json().catch(() => ({}));
        if (!verifyRes.ok || !verifyData.success) {
          setVerifyingTurnstile(false);
          setAuthError(verifyData.error || 'Security check failed. Please try again.');
          return;
        }
      } catch (err: any) {
        setVerifyingTurnstile(false);
        setAuthError('Could not verify security challenge with server.');
        return;
      }
      setVerifyingTurnstile(false);
    }

    if (authMode === 'signup') {
      if (authPassword !== authPasswordConfirm) {
        setAuthError('Passwords do not match');
        return;
      }
      if (authPassword.length < 8) {
        setAuthError('Password must be at least 8 characters long');
        return;
      }
      const res = await signUpWithPassword(authEmail, authPassword, authPasswordConfirm, authName);
      if (res.error) {
        setAuthError(res.error);
      } else {
        toast({
          title: 'Account Created',
          description: `Signed in as ${authEmail}. Cloud sync is now active.`,
        });
      }
    } else {
      const res = await signInWithPassword(authEmail, authPassword);
      if (res.error) {
        setAuthError(res.error);
      } else {
        toast({
          title: 'Signed In',
          description: `Welcome back, ${authEmail}!`,
        });
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Signed Out',
      description: 'Switched to offline local storage session.',
    });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncWithPocketBase();
      toast({
        title: 'Cloud Sync Complete',
        description: 'Files, desktop preferences, and custom apps are up to date.',
      });
    } catch (err: any) {
      toast({
        title: 'Sync Failed',
        description: err?.message || 'Could not sync with cloud storage.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

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
      const itemBytes = (key.length + val.length) * 2;
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
        color: '#10b981',
      },
      {
        id: 'desktop',
        name: 'Desktop & Workspace',
        bytes: desktopBytes,
        color: '#3b82f6',
      },
      {
        id: 'keys',
        name: 'AI Keys & Profiles',
        bytes: keysBytes,
        color: '#f59e0b',
      },
      {
        id: 'apps',
        name: 'Custom Apps & Projects',
        bytes: appsBytes,
        color: '#a855f7',
      },
      {
        id: 'chat',
        name: 'AI Chat History',
        bytes: chatBytes,
        color: '#06b6d4',
      },
    ];

    if (otherBytes > 0) {
      categories.push({
        id: 'other',
        name: 'System Cache & Settings',
        bytes: otherBytes,
        color: '#71717a',
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
      {/* ─── HEADER ─── */}
      <div>
        <h3 className="text-lg font-medium text-foreground">Storage</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage cloud account synchronization and local storage allocation.
        </p>
      </div>

      {/* ─── CLOUD ACCOUNT SECTION ─── */}
      {isAuthenticated && authUser ? (
        <div className="p-4 rounded-xl border border-border bg-card dark:bg-zinc-800/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {authUser.avatar ? (
              <img
                src={authUser.avatar}
                alt="avatar"
                className="w-10 h-10 rounded-full border border-border object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-500 font-semibold text-sm flex items-center justify-center shrink-0 border border-amber-500/20">
                {(authUser.user_metadata?.name || authUser.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-foreground truncate">
                  {authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'MittenOS Cloud User'}
                </p>
                <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Synced
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{authUser.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-border bg-card dark:bg-zinc-800/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cloud className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">MittenOS Cloud</p>
                <p className="text-[11px] text-muted-foreground">Sign in to sync files and workspace settings</p>
              </div>
            </div>
            <div className="flex bg-muted p-0.5 rounded-md border border-border">
              <button
                onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  authMode === 'signin' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  authMode === 'signup' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {authError && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-2.5">
            {authMode === 'signup' && (
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Name (Optional)</label>
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Email</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={authPasswordConfirm}
                  onChange={(e) => setAuthPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}

            <TurnstileWidget
              onVerify={(token) => {
                setTurnstileToken(token);
                setAuthError(null);
              }}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setAuthError('Security check failed. Please refresh.')}
            />

            <button
              type="submit"
              disabled={authLoading || verifyingTurnstile}
              className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 font-medium text-white text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {authLoading || verifyingTurnstile ? 'Verifying...' : authMode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>
      )}

      {/* ─── LOCAL STORAGE BREAKDOWN ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Storage Breakdown
          </h4>
          <span className="text-xs font-mono text-muted-foreground">
            {formatSize(metrics.totalBytes)} used
          </span>
        </div>

        {/* Proportional Storage Bar */}
        <div className="h-2 w-full bg-muted dark:bg-zinc-800 rounded-full overflow-hidden flex gap-0.5">
          {metrics.totalBytes > 0 ? (
            metrics.categories
              .filter((cat) => cat.bytes > 0)
              .map((cat) => {
                const percent = (cat.bytes / metrics.totalBytes) * 100;
                return (
                  <div
                    key={cat.id}
                    style={{
                      width: `${Math.max(percent, 2)}%`,
                      backgroundColor: cat.color,
                    }}
                    className="h-full rounded-full transition-all"
                    title={`${cat.name}: ${formatSize(cat.bytes)}`}
                  />
                );
              })
          ) : (
            <div className="h-full w-full bg-muted-foreground/20 rounded-full" />
          )}
        </div>

        {/* Clean Category List */}
        <div className="rounded-xl border border-border bg-card dark:bg-zinc-800/30 divide-y divide-border overflow-hidden">
          {metrics.categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between px-3.5 py-2.5 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-foreground">{cat.name}</span>
              </div>
              <span className="font-mono text-muted-foreground">{formatSize(cat.bytes)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── STORAGE MAINTENANCE ─── */}
      <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-foreground">Storage Management</p>
          <p className="text-[11px] text-muted-foreground">Reset virtual file system or clear local cache</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetFileSystem}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium transition-colors cursor-pointer text-foreground"
          >
            Reset File System
          </button>
          <button
            onClick={handleClearAllStorage}
            className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 dark:text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors cursor-pointer"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
