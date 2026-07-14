'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  Bot,
  LayoutDashboard,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { useDesktopStore } from '@/stores/desktop-store';
import { useWindowStore } from '@/stores/window-store';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { useAuthStore, isGuestUser } from '@/stores/auth-store';
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
  Bot,
};

interface AppContextMenuState {
  appId: string;
  x: number;
  y: number;
  alreadyOnDesktop: boolean;
}

export function StartMenu() {
  const startMenuOpen = useDesktopStore((s) => s.startMenuOpen);
  const setStartMenuOpen = useDesktopStore((s) => s.setStartMenuOpen);
  const searchQuery = useDesktopStore((s) => s.searchQuery);
  const setSearchQuery = useDesktopStore((s) => s.setSearchQuery);
  const theme = useDesktopStore((s) => s.theme);
  const desktopIcons = useDesktopStore((s) => s.desktopIcons);
  const addDesktopIcon = useDesktopStore((s) => s.addDesktopIcon);
  const openWindow = useWindowStore((s) => s.openWindow);
  const userApps = useAppRegistryStore((s) => s.userApps);
  const menuRef = useRef<HTMLDivElement>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  const [appContextMenu, setAppContextMenu] = useState<AppContextMenuState | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  // Close start menu on click outside
  useEffect(() => {
    if (!startMenuOpen) return;

    const handleClick = (e: MouseEvent) => {
      // If the context menu is open, close it on any click outside it
      if (appContextMenu) {
        if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) {
          setAppContextMenu(null);
        }
        return;
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('[data-start-button]')) return;
        setStartMenuOpen(false);
        setAppContextMenu(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (appContextMenu) {
          setAppContextMenu(null);
        } else {
          setStartMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [startMenuOpen, setStartMenuOpen, appContextMenu]);

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

  const handleAppRightClick = (e: React.MouseEvent, app: typeof allApps[0]) => {
    e.preventDefault();
    e.stopPropagation();
    const alreadyOnDesktop = desktopIcons.some((icon) => icon.appId === app.id);
    setAppContextMenu({
      appId: app.id,
      x: e.clientX,
      y: e.clientY,
      alreadyOnDesktop,
    });
  };

  const handleAddToDesktop = (app: typeof allApps[0]) => {
    const isUser = isUserApp(app);
    addDesktopIcon({
      appId: app.id,
      label: app.name,
      icon: app.icon,
    });
    setJustAdded(app.id);
    setTimeout(() => setJustAdded(null), 2000);
    setAppContextMenu(null);
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
          className="fixed bottom-14 left-3 w-80 max-h-[70vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-[9999]"
          onContextMenu={(e) => e.preventDefault()}
          style={{
            background:
              theme === 'dark'
                ? 'rgba(28, 28, 38, 0.88)'
                : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(30px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(30px) saturate(1.5)',
            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* Search */}
          <div className="p-3 border-b border-black/5 dark:border-white/[0.06]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08]">
              <Search className="w-4 h-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground/80 placeholder:text-muted-foreground/50 outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* App Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-3 gap-2">
              {filteredApps.map((app) => {
                const isUser = isUserApp(app);
                const IconComp = ICON_MAP[app.icon] || FileText;
                const onDesktop = desktopIcons.some((icon) => icon.appId === app.id);
                const wasJustAdded = justAdded === app.id;
                return (
                  <button
                    key={app.id}
                    className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer group"
                    onClick={() => handleAppClick(app)}
                    onContextMenu={(e) => handleAppRightClick(e, app)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center group-hover:bg-black/[0.08] dark:group-hover:bg-white/[0.1] transition-colors">
                      {isUser ? (
                        <span className="text-lg">{app.icon || '📦'}</span>
                      ) : (
                        <IconComp className="w-5 h-5 text-muted-foreground dark:text-white/70" strokeWidth={1.5} />
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground dark:text-white/60 group-hover:text-foreground/80 dark:group-hover:text-white/80 truncate max-w-full">
                      {app.name}
                    </span>
                    {/* "Just added" flash badge */}
                    <AnimatePresence>
                      {wasJustAdded && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          className="absolute inset-0 flex items-center justify-center rounded-xl bg-blue-500/20 backdrop-blur-sm"
                        >
                          <CheckCircle2 className="w-5 h-5 text-blue-400" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
            {filteredApps.length === 0 && (
              <div className="text-center text-muted-foreground/50 text-sm py-8">No apps found</div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 border-t border-black/5 dark:border-white/[0.06]">
            <span className="text-[11px] text-muted-foreground/50">MittenOS</span>
          </div>
        </motion.div>
      )}

      {/* App right-click context menu — rendered outside the start menu panel to avoid overflow:hidden clipping */}
      {appContextMenu && startMenuOpen && (() => {
        const app = allApps.find((a) => a.id === appContextMenu.appId);
        if (!app) return null;
        return (
          <motion.div
            key="app-ctx-menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="fixed z-[10001] min-w-[180px] rounded-xl shadow-2xl overflow-hidden py-1"
            style={{
              left: appContextMenu.x,
              top: appContextMenu.y,
              background:
                theme === 'dark'
                  ? 'rgba(32, 32, 44, 0.96)'
                  : 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(20px)',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            }}
            ref={ctxMenuRef}
            // stopPropagation not needed — outer handler checks ctxMenuRef directly
          >
            {appContextMenu.alreadyOnDesktop ? (
              <div className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground/50 cursor-default select-none">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400/60" />
                <span>Already on desktop</span>
              </div>
            ) : (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground/80 dark:text-white/80 hover:bg-blue-500/10 dark:hover:bg-blue-400/10 hover:text-blue-600 dark:hover:text-blue-300 transition-colors cursor-pointer"
                onClick={() => handleAddToDesktop(app)}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Add to Desktop</span>
              </button>
            )}
            <div className="mx-2 my-1 border-t border-black/5 dark:border-white/[0.06]" />
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              onClick={() => {
                handleAppClick(app);
                setAppContextMenu(null);
              }}
            >
              <span className="w-4 h-4 shrink-0 text-[13px] flex items-center justify-center">▶</span>
              <span>Open</span>
            </button>
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
