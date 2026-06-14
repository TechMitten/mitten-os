'use client';

import React, { useState, useMemo } from 'react';
import { Store, Search, Download, Check, Music, Video, Code, Map, Calendar, Mail } from 'lucide-react';
import { APP_REGISTRY, type AppCategory } from '@/types/os';

type CategoryFilter = 'all' | AppCategory;

interface ComingSoonApp {
  id: string;
  name: string;
  description: string;
  category: AppCategory;
  icon: React.ReactNode;
}

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'system', label: 'System' },
  { key: 'productivity', label: 'Productivity' },
  { key: 'development', label: 'Development' },
  { key: 'internet', label: 'Internet' },
  { key: 'media', label: 'Media' },
  { key: 'utilities', label: 'Utilities' },
];

const COMING_SOON_APPS: ComingSoonApp[] = [
  {
    id: 'music-player',
    name: 'Music Player',
    description: 'Listen to your favorite tunes',
    category: 'media',
    icon: <Music className="w-5 h-5 text-pink-400" />,
  },
  {
    id: 'video-editor',
    name: 'Video Editor',
    description: 'Edit and create videos',
    category: 'media',
    icon: <Video className="w-5 h-5 text-purple-400" />,
  },
  {
    id: 'code-editor-advanced',
    name: 'Code Editor Pro',
    description: 'Advanced code editing with extensions',
    category: 'development',
    icon: <Code className="w-5 h-5 text-green-400" />,
  },
  {
    id: 'maps',
    name: 'Maps',
    description: 'Explore the world',
    category: 'internet',
    icon: <Map className="w-5 h-5 text-blue-400" />,
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Schedule and organize events',
    category: 'productivity',
    icon: <Calendar className="w-5 h-5 text-red-400" />,
  },
  {
    id: 'mail',
    name: 'Mail',
    description: 'Send and receive emails',
    category: 'internet',
    icon: <Mail className="w-5 h-5 text-sky-400" />,
  },
];

// Icon mapping for installed apps
const APP_ICONS: Record<string, React.ReactNode> = {
  FolderOpen: <Store className="w-5 h-5 text-amber-400" />,
  TerminalSquare: <Code className="w-5 h-5 text-green-400" />,
  Globe: <Map className="w-5 h-5 text-blue-400" />,
  FileText: <Calendar className="w-5 h-5 text-orange-400" />,
  Calculator: <Music className="w-5 h-5 text-violet-400" />,
  Settings: <Download className="w-5 h-5 text-gray-400" />,
  Image: <Video className="w-5 h-5 text-pink-400" />,
  Store: <Store className="w-5 h-5 text-amber-400" />,
  CloudSun: <Map className="w-5 h-5 text-cyan-400" />,
  Info: <Music className="w-5 h-5 text-teal-400" />,
};

export default function AppStore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [installing, setInstalling] = useState<Set<string>>(new Set());

  const installedApps = useMemo(() => {
    return Object.values(APP_REGISTRY);
  }, []);

  const filteredInstalledApps = useMemo(() => {
    let apps = installedApps;

    if (activeCategory !== 'all') {
      apps = apps.filter((app) => app.category === activeCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      apps = apps.filter(
        (app) =>
          app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q)
      );
    }

    return apps;
  }, [installedApps, activeCategory, searchQuery]);

  const filteredComingSoonApps = useMemo(() => {
    let apps = COMING_SOON_APPS;

    if (activeCategory !== 'all') {
      apps = apps.filter((app) => app.category === activeCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      apps = apps.filter(
        (app) =>
          app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q)
      );
    }

    return apps;
  }, [activeCategory, searchQuery]);

  const featuredApp = installedApps.find((a) => a.id === 'browser') || installedApps[0];

  const handleInstall = (appId: string) => {
    setInstalling((prev) => new Set(prev).add(appId));
    // Simulate install
    setTimeout(() => {
      setInstalling((prev) => {
        const next = new Set(prev);
        next.delete(appId);
        return next;
      });
    }, 1500);
  };

  return (
    <div className="bg-zinc-900 text-white h-full flex flex-col select-none">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-400" />
            <h1 className="text-sm font-semibold">App Store</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/30 outline-none"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
              activeCategory === cat.key
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Featured App Banner */}
        {activeCategory === 'all' && !searchQuery && featuredApp && (
          <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-xl p-4 mb-4 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                {APP_ICONS[featuredApp.icon] || <Store className="w-5 h-5 text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-amber-400/60 mb-0.5">Featured</div>
                <div className="text-sm font-medium">{featuredApp.name}</div>
                <div className="text-xs text-white/50 truncate">{featuredApp.description}</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                Installed
              </span>
            </div>
          </div>
        )}

        {/* Installed Apps */}
        {filteredInstalledApps.length > 0 && (
          <div className="mb-4">
            <h2 className="text-xs uppercase tracking-wider text-white/40 font-medium mb-2 mt-2">
              Installed Apps
            </h2>
            <div className="space-y-1">
              {filteredInstalledApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    {APP_ICONS[app.icon] || <Store className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{app.name}</div>
                    <div className="text-xs text-white/40 truncate">{app.description}</div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400 shrink-0">
                    <Check className="w-3 h-3 inline-block mr-0.5 -mt-0.5" />
                    Installed
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coming Soon */}
        {filteredComingSoonApps.length > 0 && (
          <div className="mb-4">
            <h2 className="text-xs uppercase tracking-wider text-white/40 font-medium mb-2">
              Coming Soon
            </h2>
            <div className="space-y-1">
              {filteredComingSoonApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    {app.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{app.name}</div>
                    <div className="text-xs text-white/40 truncate">{app.description}</div>
                  </div>
                  {installing.has(app.id) ? (
                    <span className="px-3 py-1 rounded-full text-xs bg-white/10 text-white/50 shrink-0 animate-pulse">
                      Installing...
                    </span>
                  ) : (
                    <button
                      className="px-3 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors shrink-0"
                      onClick={() => handleInstall(app.id)}
                    >
                      <Download className="w-3 h-3 inline-block mr-0.5 -mt-0.5" />
                      Install
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredInstalledApps.length === 0 && filteredComingSoonApps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-white/30">
            <Search className="w-8 h-8 mb-2" />
            <p className="text-sm">No apps found</p>
            <p className="text-xs mt-1">Try a different search or category</p>
          </div>
        )}
      </div>
    </div>
  );
}
