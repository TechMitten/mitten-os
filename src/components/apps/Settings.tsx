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
} from 'lucide-react';

type Section = 'appearance' | 'wallpaper' | 'display' | 'about';

const SIDEBAR_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'wallpaper', label: 'Wallpaper', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'display', label: 'Display', icon: <Monitor className="w-4 h-4" /> },
  { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
];

const WALLPAPERS = [
  {
    id: 'wp-1',
    name: 'Deep Space',
    gradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
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
  const [activeSection, setActiveSection] = useState<Section>('appearance');
  const [selectedAccent, setSelectedAccent] = useState('Amber');
  const [iconSize, setIconSize] = useState<'small' | 'medium' | 'large'>('medium');

  const theme = useDesktopStore((s) => s.theme);
  const toggleTheme = useDesktopStore((s) => s.toggleTheme);
  const wallpaper = useDesktopStore((s) => s.wallpaper);
  const setWallpaper = useDesktopStore((s) => s.setWallpaper);

  const isDark = theme === 'dark';

  return (
    <div className="flex h-full bg-zinc-900 text-white select-none overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 bg-zinc-800/40 border-r border-white/5 p-3 flex flex-col gap-1 shrink-0">
        <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/30 mb-1">
          Settings
        </h2>
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeSection === item.id
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:bg-white/5 hover:text-white/80'
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
      <div className="flex items-center justify-between py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          {isDark ? (
            <Moon className="w-4 h-4 text-white/60" />
          ) : (
            <Sun className="w-4 h-4 text-white/60" />
          )}
          <div>
            <p className="text-sm text-white/80">Dark Mode</p>
            <p className="text-xs text-white/40">
              Switch between light and dark theme
            </p>
          </div>
        </div>
        <Switch checked={isDark} onCheckedChange={toggleTheme} />
      </div>

      {/* Accent color picker */}
      <div className="py-3 border-b border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <Palette className="w-4 h-4 text-white/60" />
          <div>
            <p className="text-sm text-white/80">Accent Color</p>
            <p className="text-xs text-white/40">
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
                  ? 'ring-2 ring-offset-2 ring-offset-zinc-900 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: color.value,
                ringColor: selectedAccent === color.name ? color.value : undefined,
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
      <div className="mt-4 p-4 rounded-xl bg-zinc-800/60 border border-white/5">
        <p className="text-xs text-white/30 mb-2 uppercase tracking-wider">
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
      <p className="text-sm text-white/40 mb-4">
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
                      ? 'bg-amber-500/30 text-amber-300'
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
      <div className="flex items-center justify-between py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-white/60" />
          <div>
            <p className="text-sm text-white/80">Taskbar Position</p>
            <p className="text-xs text-white/40">Bottom of screen</p>
          </div>
        </div>
        <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded">
          Bottom
        </span>
      </div>

      {/* Icon size */}
      <div className="flex items-center justify-between py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Box className="w-4 h-4 text-white/60" />
          <div>
            <p className="text-sm text-white/80">Desktop Icon Size</p>
            <p className="text-xs text-white/40">
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
                  ? 'bg-white/15 text-white'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/60'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Resolution info */}
      <div className="flex items-center justify-between py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Monitor className="w-4 h-4 text-white/60" />
          <div>
            <p className="text-sm text-white/80">Resolution</p>
            <p className="text-xs text-white/40">Current display resolution</p>
          </div>
        </div>
        <span className="text-xs text-white/30">
          {typeof window !== 'undefined'
            ? `${window.screen.width} × ${window.screen.height}`
            : '—'}
        </span>
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

        <h4 className="text-xl font-semibold text-white mb-1">Z.ai OS</h4>
        <p className="text-sm text-white/40 mb-6">Version 1.0.0</p>

        <div className="w-full max-w-xs space-y-3">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/60 border border-white/5">
            <span className="text-xs text-white/40">System</span>
            <span className="text-xs text-white/70">Z.ai OS</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/60 border border-white/5">
            <span className="text-xs text-white/40">Version</span>
            <span className="text-xs text-white/70">1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/60 border border-white/5">
            <span className="text-xs text-white/40">Built with</span>
            <span className="text-xs text-white/70">Next.js 16, React 19, TypeScript</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/60 border border-white/5">
            <span className="text-xs text-white/40">Renderer</span>
            <span className="text-xs text-white/70">WebKit / Blink</span>
          </div>
        </div>

        <p className="text-[10px] text-white/20 mt-8 text-center">
          © 2025 Z.ai. All rights reserved.
        </p>
      </div>
    </div>
  );
}
