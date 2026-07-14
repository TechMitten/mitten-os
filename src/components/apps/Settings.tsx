'use client';

import React, { useState, useEffect } from 'react';
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
  Cloud,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Section = 'appearance' | 'wallpaper' | 'display' | 'general' | 'storage' | 'about' | 'ai-keys';

const SIDEBAR_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <LayoutPanelTop className="w-4 h-4" /> },
  { id: 'storage', label: 'Storage', icon: <Cloud className="w-4 h-4" /> },
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
      <div className="w-52 bg-muted dark:bg-zinc-800/40 border-r border-border p-3 flex flex-col gap-1 shrink-0 overflow-y-auto settings-scrollbar">
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
  const [codingModel, setCodingModel] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_coding_assistant_model') || '' : ''));
  const [zaiKey, setZaiKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_zai_api_key') || '' : ''));
  const [zaiModel, setZaiModel] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_zai_model') || '' : ''));
  const [openrouterKey, setOpenrouterKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_openrouter_api_key') || '' : ''));
  const [openrouterModel, setOpenrouterModel] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_openrouter_model') || '' : ''));
  const [geminiKey, setGeminiKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_gemini_api_key') || '' : ''));
  const [geminiModel, setGeminiModel] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_gemini_model') || '' : ''));
  const [customKey, setCustomKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_custom_api_key') || '' : ''));
  const [customBaseUrl, setCustomBaseUrl] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_custom_base_url') || '' : ''));
  const [customModel, setCustomModel] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_custom_model') || '' : ''));
  const [activeProvider, setActiveProvider] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('orion-api-provider') || 'mittenai' : 'mittenai'));

  const [showCodingKey, setShowCodingKey] = useState(false);
  const [showZaiKey, setShowZaiKey] = useState(false);
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showCustomKey, setShowCustomKey] = useState(false);

  const handleSave = () => {
    localStorage.setItem('mittenOS_coding_assistant_key', codingKey.trim());
    localStorage.setItem('mittenOS_coding_assistant_model', codingModel.trim());
    localStorage.setItem('mittenOS_zai_api_key', zaiKey.trim());
    localStorage.setItem('mittenOS_zai_model', zaiModel.trim());
    localStorage.setItem('mittenOS_openrouter_api_key', openrouterKey.trim());
    localStorage.setItem('mittenOS_openrouter_model', openrouterModel.trim());
    localStorage.setItem('mittenOS_gemini_api_key', geminiKey.trim());
    localStorage.setItem('mittenOS_gemini_model', geminiModel.trim());
    localStorage.setItem('mittenOS_custom_api_key', customKey.trim());
    localStorage.setItem('mittenOS_custom_base_url', customBaseUrl.trim());
    localStorage.setItem('mittenOS_custom_model', customModel.trim());
    localStorage.setItem('orion-api-provider', activeProvider);

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

      {/* Active AI Endpoint Selector */}
      <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
        <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Active AI Endpoint / Provider
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'mittenai', label: 'MittenAI', desc: 'DeepSeek' },
            { id: 'zai', label: 'Orion AI', desc: 'Z.ai GLM' },
            { id: 'gemini', label: 'Gemini', desc: 'Google API' },
            { id: 'openrouter', label: 'OpenRouter', desc: 'Universal' },
            { id: 'custom', label: 'Custom', desc: 'OpenAI Dev' },
          ].map((provider) => (
            <button
              key={provider.id}
              onClick={() => setActiveProvider(provider.id)}
              className={`flex flex-col items-start p-2.5 rounded-lg border-2 transition-all text-left flex-1 min-w-[92px] ${
                activeProvider === provider.id
                  ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/20 shadow-sm font-semibold'
                  : 'border-border hover:border-foreground/20 bg-muted/30 dark:bg-zinc-800/30'
              }`}
            >
              <span className={`text-[11px] leading-tight ${activeProvider === provider.id ? 'text-amber-500' : 'text-foreground/85'}`}>
                {provider.label}
              </span>
              <span className="text-[9px] text-muted-foreground mt-0.5 leading-none">{provider.desc}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/60 leading-normal">
          Determines the global active API provider used by both the MittenAI System Chat and Orion App Builder.
        </p>
      </div>

      <div className="space-y-4">
        {/* Coding Assistant */}
        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            MittenAI (Coding Assistant)
          </h4>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">
              DeepSeek API Key
            </label>
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
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">
              Model Name (Optional)
            </label>
            <input
              type="text"
              value={codingModel}
              onChange={(e) => setCodingModel(e.target.value)}
              placeholder="deepseek-v4-pro"
              className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Zai Key */}
        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Z.ai Provider
          </h4>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">
              Z.ai API Key
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
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">
              Model Name (Optional)
            </label>
            <input
              type="text"
              value={zaiModel}
              onChange={(e) => setZaiModel(e.target.value)}
              placeholder="glm-4-plus"
              className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
        </div>

        {/* OpenRouter Key */}
        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Orion OpenRouter Provider
          </h4>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">
              OpenRouter API Key
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
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">
              Model Name (Optional)
            </label>
            <input
              type="text"
              value={openrouterModel}
              onChange={(e) => setOpenrouterModel(e.target.value)}
              placeholder="anthropic/claude-3.5-sonnet"
              className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Gemini Key */}
        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Google Gemini Provider
          </h4>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Enter Gemini API Key"
                className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">
              Model Name (Optional)
            </label>
            <input
              type="text"
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              placeholder="gemini-2.5-flash"
              className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
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

/* ─── Storage Section ─────────────────────────────────────── */
import { useFileSystemStore } from '@/stores/filesystem-store';

function StorageSection() {
  const {
    storageBackend,
    gdriveConnected,
    setStorageBackend,
    disconnectGDrive,
    loading
  } = useFileSystemStore();

  const [profile, setProfile] = useState<{ name: string; email: string; picture: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mittenos:gdrive:profile');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const handleConnect = () => {
    const width = 500;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      '/api/auth/google/login',
      'Connect Google Drive',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  const handleDisconnect = () => {
    disconnectGDrive();
    setProfile(null);
  };

  // Sync profile data on change
  useEffect(() => {
    if (gdriveConnected) {
      const saved = localStorage.getItem('mittenos:gdrive:profile');
      if (saved) setProfile(JSON.parse(saved));
    }
  }, [gdriveConnected]);

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-lg font-medium mb-1">Storage Backend</h3>
        <p className="text-xs text-muted-foreground">
          Choose where your files and folders are saved. You can use local browser storage or sync with Google Drive.
        </p>
      </div>

      {/* Connection Status Card */}
      <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${gdriveConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Google Drive Connection</h4>
              <p className="text-xs text-muted-foreground">
                {gdriveConnected 
                  ? 'Connected to Google Drive API' 
                  : 'Not connected. Connect to store your files in the cloud.'}
              </p>
            </div>
          </div>
          {gdriveConnected ? (
            <button
              onClick={handleDisconnect}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
            >
              Connect
            </button>
          )}
        </div>

        {gdriveConnected && profile && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 text-xs">
            {profile.picture ? (
              <img src={profile.picture} alt="User Avatar" className="w-9 h-9 rounded-full border border-border" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-bold text-foreground">
                {profile.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground">{profile.name}</p>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Storage Provider Selector */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Active Storage Provider
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Local Storage */}
          <button
            onClick={() => setStorageBackend('local')}
            className={`flex items-start gap-3.5 p-4 rounded-xl border-2 transition-all text-left ${
              storageBackend === 'local'
                ? 'border-amber-500 bg-amber-500/5'
                : 'border-border hover:border-foreground/10 bg-muted/20'
            }`}
          >
            <div className={`p-2 rounded-lg ${storageBackend === 'local' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-semibold">Local Storage</h5>
              <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                Saved locally in your browser cache. Quick loading, offline-only, not shared across devices.
              </p>
            </div>
          </button>

          {/* Google Drive */}
          <button
            onClick={() => gdriveConnected && setStorageBackend('gdrive')}
            disabled={!gdriveConnected}
            className={`flex items-start gap-3.5 p-4 rounded-xl border-2 transition-all text-left ${
              !gdriveConnected 
                ? 'opacity-40 cursor-not-allowed border-border'
                : storageBackend === 'gdrive'
                  ? 'border-amber-500 bg-amber-500/5'
                  : 'border-border hover:border-foreground/10 bg-muted/20'
            }`}
          >
            <div className={`p-2 rounded-lg ${storageBackend === 'gdrive' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-semibold flex items-center gap-1.5">
                Google Drive
                {!gdriveConnected && (
                  <span className="text-[9px] font-normal px-1.5 py-0.5 rounded bg-muted-foreground/20 text-muted-foreground uppercase">
                    Locked
                  </span>
                )}
              </h5>
              <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                Saved in your personal Google Drive in the <code className="bg-muted px-1 rounded">MittenOS</code> folder. Persists across devices and logins.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Sync details */}
      {storageBackend === 'gdrive' && (
        <div className="p-3 rounded-lg border border-border bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>
              {loading ? 'Synchronizing files with Google Drive...' : 'Files are synchronized with Google Drive'}
            </span>
          </div>
          <button
            onClick={() => useFileSystemStore.getState().loadFromDB(useFileSystemStore.getState().userId || '')}
            disabled={loading}
            className="hover:text-foreground underline transition-colors"
          >
            Force Sync
          </button>
        </div>
      )}
    </div>
  );
}
