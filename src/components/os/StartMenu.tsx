'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  TerminalSquare,
  Globe,
  FileText,
  Settings,
  Calculator,
  Image,
  Store,
  CloudSun,
  Info,
  Search,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useDesktopStore } from '@/stores/desktop-store';
import { useWindowStore } from '@/stores/window-store';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { useAuthStore } from '@/stores/auth-store';
import { useAppRegistryStore } from '@/stores/app-registry-store';
import { saveWindowStates } from '@/stores/desktop-store';
import { APP_REGISTRY, type UserAppDefinition } from '@/types/os';

const ICON_MAP: Record<string, LucideIcon> = {
  FolderOpen,
  TerminalSquare,
  Globe,
  FileText,
  Settings,
  Calculator,
  Image,
  Store,
  CloudSun,
  Info,
};

export function StartMenu() {
  const startMenuOpen = useDesktopStore((s) => s.startMenuOpen);
  const setStartMenuOpen = useDesktopStore((s) => s.setStartMenuOpen);
  const searchQuery = useDesktopStore((s) => s.searchQuery);
  const setSearchQuery = useDesktopStore((s) => s.setSearchQuery);
  const openWindow = useWindowStore((s) => s.openWindow);
  const userApps = useAppRegistryStore((s) => s.userApps);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!startMenuOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        // Don't close if clicking the start button (handled by Taskbar)
        const target = e.target as HTMLElement;
        if (target.closest('[data-start-button]')) return;
        setStartMenuOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStartMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [startMenuOpen, setStartMenuOpen]);

  const builtInApps = Object.values(APP_REGISTRY);
  const allApps = [...builtInApps, ...userApps];
  const filteredApps = searchQuery
    ? allApps.filter((app) =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allApps;

  const isUserApp = (app: typeof allApps[0]): app is UserAppDefinition => {
    return 'htmlContent' in app;
  };

  const handleAppClick = (app: typeof allApps[0]) => {
    if (isUserApp(app)) {
      openWindow(app.id, app.name, {
        defaultSize: app.defaultWindowSize,
        minSize: app.minWindowSize,
        singleton: app.singleton,
      });
    } else {
      openWindow(app.id);
    }
    setStartMenuOpen(false);
    setSearchQuery('');
  };

  return (
    <AnimatePresence>
      {startMenuOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-14 left-3 w-80 max-h-[70vh] rounded-2xl shadow-2xl border border-white/[0.1] overflow-hidden flex flex-col z-[9999]"
          style={{
            background: 'rgba(28, 28, 38, 0.88)',
            backdropFilter: 'blur(30px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(30px) saturate(1.5)',
          }}
        >
          {/* Search */}
          <div className="p-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08]">
              <Search className="w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/30 outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* App Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-3 gap-2">
              {filteredApps.map((app) => {
                const isUser = isUserApp(app);
                const IconComp = !isUser ? ICON_MAP[app.icon] || FileText : null;
                return (
                  <button
                    key={app.id}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer group"
                    onClick={() => handleAppClick(app)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
                      {isUser ? (
                        <span className="text-lg">{app.icon || '📦'}</span>
                      ) : (
                        <IconComp className="w-5 h-5 text-white/70" strokeWidth={1.5} />
                      )}
                    </div>
                    <span className="text-[11px] text-white/60 group-hover:text-white/80 truncate max-w-full">
                      {app.name}
                    </span>
                  </button>
                );
              })}
            </div>
            {filteredApps.length === 0 && (
              <div className="text-center text-white/30 text-sm py-8">No apps found</div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 border-t border-white/[0.06]">
            <span className="text-[11px] text-white/30">MittenOS</span>
            <button
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
              onClick={async () => {
                setStartMenuOpen(false);
                const userId = useAuthStore.getState().user?.id;
                if (userId) {
                  await saveWindowStates(userId, useWindowStore.getState().windows);
                }
                useFileSystemStore.getState().reset();
                useDesktopStore.getState().reset();
                await useAuthStore.getState().signOut();
              }}
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
