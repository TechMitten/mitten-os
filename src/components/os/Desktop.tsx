'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDesktopStore, type ContextMenuItem, saveWindowStates, loadWindowStates } from '@/stores/desktop-store';
import { useWindowStore } from '@/stores/window-store';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { useAuthStore } from '@/stores/auth-store';
import { ContextMenu } from '@/components/os/ContextMenu';
import { DesktopIcon } from '@/components/os/DesktopIcon';
import Window from '@/components/os/Window';
import { StartMenu } from '@/components/os/StartMenu';
import Taskbar from '@/components/os/Taskbar';
import LoginScreen from '@/components/auth/LoginScreen';
import { Loader2 } from 'lucide-react';
import {
  FileExplorer,
  Terminal,
  Browser,
  TextEditor,
  Calculator,
  Settings as SettingsApp,
  ImageViewer,
  AppStore,
  Weather,
  AboutSystem,
} from '@/components/apps';

const APP_COMPONENT_MAP: Record<string, React.ComponentType> = {
  'file-explorer': FileExplorer,
  terminal: Terminal,
  browser: Browser,
  'text-editor': TextEditor,
  calculator: Calculator,
  settings: SettingsApp,
  'image-viewer': ImageViewer,
  'app-store': AppStore,
  weather: Weather,
  'about-system': AboutSystem,
};

export function Desktop() {
  const wallpaper = useDesktopStore((s) => s.wallpaper);
  const theme = useDesktopStore((s) => s.theme);
  const desktopIcons = useDesktopStore((s) => s.desktopIcons);
  const contextMenu = useDesktopStore((s) => s.contextMenu);
  const setContextMenu = useDesktopStore((s) => s.setContextMenu);
  const setStartMenuOpen = useDesktopStore((s) => s.setStartMenuOpen);
  const loadSettings = useDesktopStore((s) => s.loadSettings);

  const windows = useWindowStore((s) => s.windows);
  const activeWindowId = useWindowStore((s) => s.activeWindowId);
  const openWindowFn = useWindowStore((s) => s.openWindow);

  const loadFromDB = useFileSystemStore((s) => s.loadFromDB);

  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const initialize = useAuthStore((s) => s.initialize);

  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const initializedRef = useRef(false);

  // Initialize auth on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initialize();
    }
  }, [initialize]);

  // Load user data when authenticated
  useEffect(() => {
    if (!user?.id || dataLoaded) return;

    let cancelled = false;
    (async () => {
      await Promise.all([
        loadSettings(user.id),
        loadFromDB(user.id),
      ]);
      if (cancelled) return;

      // Restore window states
      const savedWindows = await loadWindowStates(user.id);
      if (cancelled) return;

      // Reopen windows that were non-minimized
      const { openWindow } = useWindowStore.getState();
      if (savedWindows.length > 0) {
        for (const sw of savedWindows) {
          if (sw.state === 'minimized') continue;
          const id = openWindow(sw.appId, sw.title);
          if (id) {
            const { updateWindowPosition, updateWindowSize, focusWindow } = useWindowStore.getState();
            updateWindowPosition(id, { x: sw.x, y: sw.y });
            updateWindowSize(id, { width: sw.width, height: sw.height });
            if (sw.state === 'minimized') {
              useWindowStore.getState().minimizeWindow(id);
            }
            focusWindow(id);
          }
        }
      }

      setDataLoaded(true);
    })();

    return () => { cancelled = true; };
  }, [user?.id, dataLoaded, loadSettings, loadFromDB]);

  // Save window states periodically
  const windowsRef = useRef(windows);
  useEffect(() => {
    windowsRef.current = windows;
  });
  useEffect(() => {
    if (!user?.id || !dataLoaded) return;
    const interval = setInterval(() => {
      saveWindowStates(user.id, windowsRef.current);
    }, 10000);
    return () => clearInterval(interval);
  }, [user?.id, dataLoaded]);

  // Save windows on close — use the interval above plus the logout handler in StartMenu

  const handleDesktopClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget) return;
      setSelectedIconId(null);
      setStartMenuOpen(false);
      setContextMenu(null);
    },
    [setStartMenuOpen, setContextMenu]
  );

  const handleDesktopContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (e.target !== e.currentTarget) return;

      const items: ContextMenuItem[] = [
        {
          label: 'New Folder',
          icon: 'FolderPlus',
          action: () => { },
        },
        {
          label: 'New File',
          icon: 'FilePlus',
          action: () => { },
        },
        {
          label: 'Change Wallpaper',
          icon: 'Palette',
          action: () => { },
        },
        {
          label: 'Display Settings',
          icon: 'Monitor',
          action: () => {
            openWindowFn('settings');
          },
        },
        {
          label: 'Refresh',
          icon: 'RefreshCw',
          shortcut: 'F5',
          action: () => { },
        },
        {
          label: '',
          separator: true,
          action: () => { },
        },
        {
          label: 'About MittenOS',
          icon: 'Info',
          action: () => {
            openWindowFn('about-system');
          },
        },
      ];

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items,
      });
    },
    [setContextMenu, openWindowFn]
  );

  const handleDesktopMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0 && contextMenu) {
        setContextMenu(null);
      }
    },
    [contextMenu, setContextMenu]
  );

  const handleIconDoubleClick = useCallback(
    (appId: string) => {
      openWindowFn(appId);
    },
    [openWindowFn]
  );

  const handleIconClick = useCallback(
    (iconId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedIconId(iconId);
      setContextMenu(null);
    },
    [setContextMenu]
  );

  // --- Auth loading state ---
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <span className="text-sm text-white/40">Loading...</span>
        </div>
      </div>
    );
  }

  // --- Not authenticated ---
  if (!user) {
    return <LoginScreen />;
  }

  // --- Data still loading ---
  if (!dataLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <span className="text-sm text-white/40">Loading your environment...</span>
        </div>
      </div>
    );
  }

  // --- Authenticated and loaded ---
  const wallpaperStyle: React.CSSProperties = wallpaper.startsWith('linear-gradient') ||
    wallpaper.startsWith('radial-gradient') ||
    wallpaper.startsWith('conic-gradient')
    ? { backgroundImage: wallpaper }
    : wallpaper.startsWith('http') || wallpaper.startsWith('/')
      ? { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundImage: wallpaper };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div
        className="fixed inset-0 select-none overflow-hidden"
        style={wallpaperStyle}
      >
        <div
          className="absolute inset-0 pb-12"
          onClick={handleDesktopClick}
          onContextMenu={handleDesktopContextMenu}
          onMouseDown={handleDesktopMouseDown}
        >
          <div className="absolute top-4 left-4 flex flex-col flex-wrap gap-1 h-[calc(100vh-64px)]">
            {desktopIcons.map((icon) => (
              <DesktopIcon
                key={icon.id}
                icon={icon.icon}
                label={icon.label}
                selected={selectedIconId === icon.id}
                onDoubleClick={() => handleIconDoubleClick(icon.appId)}
                onClick={(e) => handleIconClick(icon.id, e)}
              />
            ))}
          </div>
        </div>

        {windows.map((win) => {
          const AppComponent = APP_COMPONENT_MAP[win.appId];
          return (
            <Window key={win.id} window={win} isActive={activeWindowId === win.id}>
              {AppComponent ? <AppComponent /> : (
                <div className="flex items-center justify-center h-full text-white/50 text-sm">
                  Unknown app: {win.appId}
                </div>
              )}
            </Window>
          );
        })}

        {contextMenu && (
          <ContextMenu
            contextMenu={contextMenu}
            onClose={() => setContextMenu(null)}
          />
        )}

        <StartMenu />

        <Taskbar />
      </div>
    </div>
  );
}
