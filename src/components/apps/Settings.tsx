'use client';

import React, { useState } from 'react';
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
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Section = 'appearance' | 'wallpaper' | 'display' | 'general' | 'about' | 'ai-keys';

const SIDEBAR_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <LayoutPanelTop className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'wallpaper', label: 'Wallpaper', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'display', label: 'Display', icon: <Monitor className="w-4 h-4" /> },
  { id: 'ai-keys', label: 'AI API Keys', icon: <Key className="w-4 h-4" /> },
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
  const [activeSection, setActiveSection] = useState<Section>('general');
  const [selectedAccent, setSelectedAccent] = useState('Amber');
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
      <div className="w-52 bg-muted dark:bg-zinc-800/40 border-r border-border p-3 flex flex-col gap-1 shrink-0">
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
      <div className="flex-1 p-6 overflow-y-auto">
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
          const isSelected =
            wallpaper === wp.gradient;
          return (
            <button
              key={wp.id}
              onClick={() => setWallpaper(wp.gradient)}
              className={`h-24 rounded-lg cursor-pointer border-2 transition-all hover:border-white/30 ${
                isSelected ? 'border-amber-500' : 'border-transparent'
              }`}
              style={{ background: wp.gradient }}
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
  const { toast } = useToast();
  const [codingKey, setCodingKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_coding_assistant_key') || '' : ''));
  const [zaiKey, setZaiKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_zai_api_key') || '' : ''));
  const [openrouterKey, setOpenrouterKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_openrouter_api_key') || '' : ''));
  const [customKey, setCustomKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_custom_api_key') || '' : ''));
  const [customBaseUrl, setCustomBaseUrl] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_custom_base_url') || '' : ''));
  const [customModel, setCustomModel] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_custom_model') || '' : ''));

  const [showCodingKey, setShowCodingKey] = useState(false);
  const [showZaiKey, setShowZaiKey] = useState(false);
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [showCustomKey, setShowCustomKey] = useState(false);

  const handleSave = () => {
    localStorage.setItem('mittenOS_coding_assistant_key', codingKey.trim());
    localStorage.setItem('mittenOS_zai_api_key', zaiKey.trim());
    localStorage.setItem('mittenOS_openrouter_api_key', openrouterKey.trim());
    localStorage.setItem('mittenOS_custom_api_key', customKey.trim());
    localStorage.setItem('mittenOS_custom_base_url', customBaseUrl.trim());
    localStorage.setItem('mittenOS_custom_model', customModel.trim());

    toast({
      title: 'Settings Saved',
      description: 'AI API keys have been updated successfully.',
    });
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-lg font-medium mb-1">AI API Keys</h3>
        <p className="text-xs text-muted-foreground">
          Configure keys locally. They are stored safely in your browser's localStorage.
        </p>
      </div>

      <div className="space-y-4">
        {/* Coding Assistant */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-foreground/80">
              MittenAI (Coding Assistant) DeepSeek API Key
            </label>
          </div>
          <div className="relative">
            <input
              type={showCodingKey ? 'text' : 'password'}
              value={codingKey}
              onChange={(e) => setCodingKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCodingKey(!showCodingKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCodingKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            API key for the deepseek-v4-pro model used by the MittenAI chat.
          </p>
        </div>

        {/* Zai Key */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground/80">
            Orion Z.ai API Key
          </label>
          <div className="relative">
            <input
              type={showZaiKey ? 'text' : 'password'}
              value={zaiKey}
              onChange={(e) => setZaiKey(e.target.value)}
              placeholder="Enter Z.ai API Key"
              className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowZaiKey(!showZaiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showZaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Used by Orion App Builder with the Z.ai GLM provider.
          </p>
        </div>

        {/* OpenRouter Key */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground/80">
            Orion OpenRouter API Key
          </label>
          <div className="relative">
            <input
              type={showOpenrouterKey ? 'text' : 'password'}
              value={openrouterKey}
              onChange={(e) => setOpenrouterKey(e.target.value)}
              placeholder="sk-or-..."
              className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowOpenrouterKey(!showOpenrouterKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showOpenrouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Used by Orion App Builder with the OpenRouter provider.
          </p>
        </div>

        {/* Custom API */}
        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Orion Custom OpenAI-Compatible Provider
          </h4>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">
              Custom API Key
            </label>
            <div className="relative">
              <input
                type={showCustomKey ? 'text' : 'password'}
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCustomKey(!showCustomKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCustomKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">
                Custom Base URL
              </label>
              <input
                type="text"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">
                Custom Model Name
              </label>
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="gpt-4o"
                className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 font-semibold text-white transition-colors active:scale-[0.98]"
        >
          Save Keys
        </button>
      </div>
    </div>
  );
}
