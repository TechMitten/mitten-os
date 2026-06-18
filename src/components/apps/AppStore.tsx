'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Store, Search, Check, ExternalLink, Box, Code2, FileType } from 'lucide-react';
import { APP_REGISTRY, type AppCategory, type UserAppDefinition } from '@/types/os';
import { useWindowStore } from '@/stores/window-store';
import { useAppRegistryStore } from '@/stores/app-registry-store';

type CategoryFilter = 'all' | AppCategory;

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'system', label: 'System' },
  { key: 'productivity', label: 'Productivity' },
  { key: 'development', label: 'Development' },
  { key: 'internet', label: 'Internet' },
  { key: 'media', label: 'Media' },
  { key: 'utilities', label: 'Utilities' },
];

export default function AppStore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const openWindow = useWindowStore((s) => s.openWindow);
  const userApps = useAppRegistryStore((s) => s.userApps);
  const loadApprovedApps = useAppRegistryStore((s) => s.loadApprovedApps);

  useEffect(() => {
    loadApprovedApps();
  }, [loadApprovedApps]);

  const installedApps = useMemo(() => {
    return Object.values(APP_REGISTRY);
  }, []);

  const filterApps = <T extends { id: string; name: string; description: string; category: string }>(
    apps: T[]
  ) => {
    let result = apps;
    if (activeCategory !== 'all') {
      result = result.filter((app) => app.category === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (app) =>
          app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q)
      );
    }
    return result;
  };

  const filteredInstalledApps = useMemo(() => filterApps(installedApps), [installedApps, activeCategory, searchQuery]);
  const filteredUserApps = useMemo(() => filterApps(userApps), [userApps, activeCategory, searchQuery]);

  const featuredApp = installedApps.find((a) => a.id === 'browser') || installedApps[0];

  const handleOpenUserApp = (app: UserAppDefinition) => {
    openWindow(app.id, app.name, {
      defaultSize: app.defaultWindowSize,
      minSize: app.minWindowSize,
      singleton: app.singleton,
    });
  };

  return (
    <div className="bg-card dark:bg-zinc-900 text-card-foreground h-full flex flex-col select-none">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-500 dark:text-amber-500 dark:text-amber-400" />
            <h1 className="text-sm font-semibold">App Store</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted dark:bg-zinc-800/50 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground/80 placeholder:text-muted-foreground/50 dark:placeholder:text-white/30 outline-none"
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
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-500 dark:text-amber-400'
                : 'bg-accent dark:bg-accent dark:bg-white/5 text-muted-foreground hover:bg-muted dark:hover:bg-white/10'
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
              <div className="w-12 h-12 rounded-xl bg-accent dark:bg-white/5 flex items-center justify-center">
                <Store className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-amber-500 dark:text-amber-400/60 mb-0.5">Featured</div>
                <div className="text-sm font-medium">{featuredApp.name}</div>
                <div className="text-xs text-muted-foreground dark:text-white/50 truncate">{featuredApp.description}</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                Installed
              </span>
            </div>
          </div>
        )}

        {/* Built-in Apps */}
        {filteredInstalledApps.length > 0 && (
          <div className="mb-4">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 mt-2">
              Built-in Apps
            </h2>
            <div className="space-y-1">
              {filteredInstalledApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent dark:hover:bg-accent dark:bg-white/5 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent dark:bg-white/5 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{app.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{app.description}</div>
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

        {/* Create Your Own */}
        <div className="mb-4">
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl p-4 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent dark:bg-white/5 flex items-center justify-center">
                <Code2 className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Orion</div>
                <div className="text-xs text-muted-foreground dark:text-white/50 truncate">AI-powered app generator</div>
              </div>
              <button
                className="px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors shrink-0"
                onClick={() => openWindow('app-builder')}
              >
                <Code2 className="w-3 h-3 inline-block mr-0.5 -mt-0.5" />
                Open
              </button>
            </div>
          </div>
        </div>

        {/* Community Apps (approved user-created) */}
        {filteredUserApps.length > 0 && (
          <div className="mb-4">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Community Apps
            </h2>
            <div className="space-y-1">
              {filteredUserApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent dark:hover:bg-accent dark:bg-white/5 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent dark:bg-white/5 flex items-center justify-center shrink-0 text-xl">
                    {app.icon || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{app.name}</span>
                      {app.appType === 'react' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 flex items-center gap-0.5">
                          <Code2 className="w-2.5 h-2.5" />
                          React
                        </span>
                      )}
                      {(!app.appType || app.appType === 'html') && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 flex items-center gap-0.5">
                          <FileType className="w-2.5 h-2.5" />
                          HTML
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{app.description}</div>
                  </div>
                  <button
                    className="px-3 py-1 rounded-full text-xs bg-amber-500/20 text-amber-500 dark:text-amber-400 hover:bg-amber-500/30 transition-colors shrink-0"
                    onClick={() => handleOpenUserApp(app)}
                  >
                    <ExternalLink className="w-3 h-3 inline-block mr-0.5 -mt-0.5" />
                    Open
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredInstalledApps.length === 0 && filteredUserApps.length === 0 && (
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
