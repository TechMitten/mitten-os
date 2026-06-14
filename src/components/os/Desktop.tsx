'use client';

import React, { useCallback, useState } from 'react';
import { useDesktopStore, type ContextMenuItem } from '@/stores/desktop-store';
import { useWindowStore } from '@/stores/window-store';
import { ContextMenu } from '@/components/os/ContextMenu';
import { DesktopIcon } from '@/components/os/DesktopIcon';
import Window from '@/components/os/Window';
import { StartMenu } from '@/components/os/StartMenu';
import Taskbar from '@/components/os/Taskbar';
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

// App component registry: maps appId to React component
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

  const windows = useWindowStore((s) => s.windows);
  const activeWindowId = useWindowStore((s) => s.activeWindowId);
  const openWindow = useWindowStore((s) => s.openWindow);

  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);

  // Handle desktop background click (deselect, close menus)
  const handleDesktopClick = useCallback(
    (e: React.MouseEvent) => {
      // Only handle clicks directly on the desktop area
      if (e.target !== e.currentTarget) return;
      setSelectedIconId(null);
      setStartMenuOpen(false);
      setContextMenu(null);
    },
    [setStartMenuOpen, setContextMenu]
  );

  // Handle right-click on desktop
  const handleDesktopContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Only handle right-clicks directly on the desktop area
      if (e.target !== e.currentTarget) return;

      const items: ContextMenuItem[] = [
        {
          label: 'New Folder',
          icon: 'FolderPlus',
          action: () => {
            // TODO: Create new folder via filesystem store
          },
        },
        {
          label: 'New File',
          icon: 'FilePlus',
          action: () => {
            // TODO: Create new file via filesystem store
          },
        },
        {
          label: 'Change Wallpaper',
          icon: 'Palette',
          action: () => {
            // TODO: Open wallpaper picker
          },
        },
        {
          label: 'Display Settings',
          icon: 'Monitor',
          action: () => {
            openWindow('settings');
          },
        },
        {
          label: 'Refresh',
          icon: 'RefreshCw',
          shortcut: 'F5',
          action: () => {
            // Refresh desktop
          },
        },
        {
          label: '',
          separator: true,
          action: () => {},
        },
        {
          label: 'About MittenOS',
          icon: 'Info',
          action: () => {
            openWindow('about-system');
          },
        },
      ];

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items,
      });
    },
    [setContextMenu, openWindow]
  );

  // Close context menu on any left click
  const handleDesktopMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0 && contextMenu) {
        setContextMenu(null);
      }
    },
    [contextMenu, setContextMenu]
  );

  // Handle icon double-click to open app
  const handleIconDoubleClick = useCallback(
    (appId: string) => {
      openWindow(appId);
    },
    [openWindow]
  );

  // Handle icon single click to select
  const handleIconClick = useCallback(
    (iconId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedIconId(iconId);
      setContextMenu(null);
    },
    [setContextMenu]
  );

  // Determine wallpaper style
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
        {/* Desktop click area */}
        <div
          className="absolute inset-0 pb-12"
          onClick={handleDesktopClick}
          onContextMenu={handleDesktopContextMenu}
          onMouseDown={handleDesktopMouseDown}
        >
          {/* Desktop Icons Grid */}
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

        {/* Windows */}
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

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            contextMenu={contextMenu}
            onClose={() => setContextMenu(null)}
          />
        )}

        {/* Start Menu */}
        <StartMenu />

        {/* Taskbar */}
        <Taskbar />
      </div>
    </div>
  );
}
