'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDesktopStore, type ContextMenuItem, loadWindowStates, saveWindowStates, saveIconPositions, loadIconPositions as fetchIconPositions } from '@/stores/desktop-store';
import { useWindowStore } from '@/stores/window-store';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { useAuthStore, isGuestUser } from '@/stores/auth-store';
import { ContextMenu } from '@/components/os/ContextMenu';
import { DesktopIcon } from '@/components/os/DesktopIcon';
import Window from '@/components/os/Window';
import { StartMenu } from '@/components/os/StartMenu';
import Taskbar from '@/components/os/Taskbar';
import WelcomeWindow from '@/components/os/WelcomeWindow';
import { Loader2 } from 'lucide-react';
import { isWallpaperDark } from '@/lib/utils';
import { DESKTOP_GRID_OFFSET_X, DESKTOP_GRID_OFFSET_Y, DRAG_THRESHOLD, type WindowPosition } from '@/types/os';
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
  OrionAppBuilder,
  SandboxedApp,
  CodingAssistant,
} from '@/components/apps';
import { useAppRegistryStore } from '@/stores/app-registry-store';
import { useWeatherPoller } from '@/hooks/use-weather-poller';

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
  'app-builder': OrionAppBuilder,
  'coding-assistant': CodingAssistant,
};

export function Desktop() {
  useWeatherPoller();
  const wallpaper = useDesktopStore((s) => s.wallpaper);
  const theme = useDesktopStore((s) => s.theme);
  const desktopIcons = useDesktopStore((s) => s.desktopIcons);
  const contextMenu = useDesktopStore((s) => s.contextMenu);
  const setContextMenu = useDesktopStore((s) => s.setContextMenu);
  const setStartMenuOpen = useDesktopStore((s) => s.setStartMenuOpen);
  const loadSettings = useDesktopStore((s) => s.loadSettings);
  const welcomeDismissed = useDesktopStore((s) => s.welcomeDismissed);
  const persistWindows = useDesktopStore((s) => s.persistWindows);
  const setWelcomeDismissed = useDesktopStore((s) => s.setWelcomeDismissed);
  const updateIconPosition = useDesktopStore((s) => s.updateIconPosition);
  const loadIconPositions = useDesktopStore((s) => s.loadIconPositions);
  const renameDesktopIcon = useDesktopStore((s) => s.renameDesktopIcon);
  const deleteDesktopIcon = useDesktopStore((s) => s.deleteDesktopIcon);
  const customDesktopIcons = useDesktopStore((s) => s.customDesktopIcons);
  const removeCustomDesktopIcon = useDesktopStore((s) => s.removeCustomDesktopIcon);

  const windows = useWindowStore((s) => s.windows);
  const activeWindowId = useWindowStore((s) => s.activeWindowId);
  const openWindowFn = useWindowStore((s) => s.openWindow);

  const loadFromDB = useFileSystemStore((s) => s.loadFromDB);

  const loadApprovedApps = useAppRegistryStore((s) => s.loadApprovedApps);
  const getUserApp = useAppRegistryStore((s) => s.getUserApp);

  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const isGuest = useAuthStore((s) => s.isGuest);
  const initialize = useAuthStore((s) => s.initialize);

  const [selectedIconIds, setSelectedIconIds] = useState<Set<string>>(new Set());
  const [renamingIconId, setRenamingIconId] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [liveDragPositions, setLiveDragPositions] = useState<Record<string, WindowPosition>>({});
  const [draggingIconIds, setDraggingIconIds] = useState<Set<string>>(new Set());
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const initializedRef = useRef(false);
  const prevUserIdRef = useRef<string | undefined>(undefined);

  // Initialize auth on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initialize();
    }
  }, [initialize]);

  // Listen for Google Drive OAuth popup callback success message
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { accessToken, refreshToken, expiresIn } = event.data;
        console.log('[Desktop] Google Drive OAuth success received, connecting...');
        
        const fsStore = useFileSystemStore.getState();
        
        try {
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            localStorage.setItem('mittenos:gdrive:profile', JSON.stringify({
              name: profile.name || 'Google Drive User',
              email: profile.email || '',
              picture: profile.picture || ''
            }));
          }
        } catch (e) {
          console.error('[Desktop] Failed to fetch Google Drive user profile info:', e);
        }

        try {
          await fsStore.connectGDrive({ accessToken, refreshToken, expiresIn });
          useDesktopStore.getState().addNotification({
            title: 'Google Drive Connected',
            message: 'Your Google Drive has been connected as the storage backend.',
            type: 'success'
          });
        } catch (err: any) {
          console.error('[Desktop] Failed to initialize Google Drive VFS:', err);
          useDesktopStore.getState().addNotification({
            title: 'Google Drive Connection Failed',
            message: err.message || 'Failed to initialize storage backend.',
            type: 'error'
          });
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Reset data-loaded flag when user logs out
  useEffect(() => {
    if (!user) {
      setDataLoaded(false);
      setShowWelcome(false);
    }
  }, [user]);

  // Show welcome window on sign-in
  useEffect(() => {
    if (!dataLoaded) return;

    const currentUserId = user?.id;
    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = currentUserId;

    if (!prevUserId && currentUserId && !welcomeDismissed) {
      setShowWelcome(true);
    }
  }, [dataLoaded, user, welcomeDismissed]);

  // Load user data when authenticated
  useEffect(() => {
    if (!user?.id || dataLoaded) return;

    let cancelled = false;
    (async () => {
      await Promise.all([
        loadSettings(user.id),
        loadFromDB(user.id),
        loadApprovedApps(),
      ]);
      if (cancelled) return;

      // Restore window states (if enabled)
      const savedWindows = persistWindows ? await loadWindowStates(user.id) : [];
      if (cancelled) return;

      // Restore icon positions
      const savedIconPositions = await fetchIconPositions(user.id);
      if (cancelled) return;
      if (savedIconPositions && Object.keys(savedIconPositions).length > 0) {
        loadIconPositions(savedIconPositions);
      }

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
  }, [user?.id, dataLoaded, loadSettings, loadFromDB, loadApprovedApps]);

  // Save window states and icon positions periodically
  const windowsRef = useRef(windows);
  useEffect(() => {
    windowsRef.current = windows;
  });
  const iconsRef = useRef(desktopIcons);
  useEffect(() => {
    iconsRef.current = desktopIcons;
  });
  useEffect(() => {
    if (!user?.id || !dataLoaded) return;
    const interval = setInterval(async () => {
      const { persistWindows } = useDesktopStore.getState();
      if (persistWindows) {
        await saveWindowStates(user.id, windowsRef.current);
      }
      await saveIconPositions(user.id, iconsRef.current);
    }, 10000);
    return () => clearInterval(interval);
  }, [user?.id, dataLoaded]);

  // Save windows on close — use the interval above plus the logout handler in StartMenu

  const iconSize = useDesktopStore((s) => s.iconSize) || 'medium';
  const gridCellSize = {
    small: 72,
    medium: 84,
    large: 96,
  }[iconSize];

  const iconWidthHeight = {
    small: 64,
    medium: 80,
    large: 96,
  }[iconSize];

  const snapToGrid = useCallback((pos: WindowPosition): WindowPosition => {
    return {
      x: Math.round((pos.x - DESKTOP_GRID_OFFSET_X) / gridCellSize) * gridCellSize + DESKTOP_GRID_OFFSET_X,
      y: Math.round((pos.y - DESKTOP_GRID_OFFSET_Y) / gridCellSize) * gridCellSize + DESKTOP_GRID_OFFSET_Y,
    };
  }, [gridCellSize]);

  const draggedRef = useRef(false);

  const handleDesktopClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const isBg = target === e.currentTarget || target.id === 'desktop-background-container';
      if (!isBg) return;

      if (draggedRef.current) {
        draggedRef.current = false;
        return;
      }
      setSelectedIconIds(new Set());
      setStartMenuOpen(false);
      setContextMenu(null);
    },
    [setStartMenuOpen, setContextMenu]
  );

  const handleDesktopContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const isBg = target === e.currentTarget || target.id === 'desktop-background-container';
      if (!isBg) return;

      const items: ContextMenuItem[] = [
        {
          label: 'New Folder',
          icon: 'FolderPlus',
          action: () => {
            const name = prompt('Enter folder name:', 'New Folder');
            if (name && name.trim()) {
              const fs = useFileSystemStore.getState();
              const desktopFolder = fs.root.children?.find(
                (c) => c.name.toLowerCase() === 'desktop' && c.type === 'folder'
              );
              const parentId = desktopFolder ? desktopFolder.id : 'root';
              fs.createFolder(parentId, name.trim()).then(() => {
                useDesktopStore.getState().addNotification({
                  title: 'Folder Created',
                  message: `Folder "${name}" created inside Desktop directory.`,
                  type: 'success',
                });
              }).catch((err) => {
                console.error(err);
              });
            }
          },
        },
        {
          label: 'New File',
          icon: 'FilePlus',
          action: () => {
            const name = prompt('Enter file name:', 'New File.txt');
            if (name && name.trim()) {
              const fs = useFileSystemStore.getState();
              const desktopFolder = fs.root.children?.find(
                (c) => c.name.toLowerCase() === 'desktop' && c.type === 'folder'
              );
              const parentId = desktopFolder ? desktopFolder.id : 'root';
              fs.createFile(parentId, name.trim(), '').then(() => {
                useDesktopStore.getState().addNotification({
                  title: 'File Created',
                  message: `File "${name}" created inside Desktop directory.`,
                  type: 'success',
                });
              }).catch((err) => {
                console.error(err);
              });
            }
          },
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
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      const isBg = target === e.currentTarget || target.id === 'desktop-background-container';
      if (!isBg) return;

      setContextMenu(null);
      setStartMenuOpen(false);

      const isModifier = e.ctrlKey || e.metaKey || e.shiftKey;
      const initialSelection = new Set(isModifier ? selectedIconIds : []);
      if (!isModifier) {
        setSelectedIconIds(new Set());
      }

      const startX = e.clientX;
      const startY = e.clientY;
      let dragStarted = false;
      draggedRef.current = false;

      const handleMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (!dragStarted && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

        if (!dragStarted) {
          dragStarted = true;
          draggedRef.current = true;
        }

        const box = {
          x1: startX,
          y1: startY,
          x2: ev.clientX,
          y2: ev.clientY,
        };
        setSelectionBox(box);

        const leftA = Math.min(box.x1, box.x2);
        const topA = Math.min(box.y1, box.y2);
        const rightA = Math.max(box.x1, box.x2);
        const bottomA = Math.max(box.y1, box.y2);

        const newSelected = new Set(initialSelection);

        desktopIcons.forEach((icon) => {
          const leftB = icon.position.x;
          const topB = icon.position.y;
          const rightB = icon.position.x + iconWidthHeight;
          const bottomB = icon.position.y + iconWidthHeight;

          const overlaps = !(leftA > rightB || rightA < leftB || topA > bottomB || bottomA < topB);

          if (overlaps) {
            newSelected.add(icon.id);
          } else if (!isModifier) {
            newSelected.delete(icon.id);
          }
        });

        setSelectedIconIds(newSelected);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        setSelectionBox(null);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [contextMenu, setContextMenu, setStartMenuOpen, selectedIconIds, desktopIcons, iconWidthHeight]
  );

  const handleIconDoubleClick = useCallback(
    (appId: string) => {
      openWindowFn(appId);
    },
    [openWindowFn]
  );

  const handleIconContextMenu = useCallback(
    (iconId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const items: ContextMenuItem[] = [
        {
          label: 'Open',
          icon: 'FolderOpen',
          action: () => {
            const icon = desktopIcons.find((i) => i.id === iconId);
            if (icon) {
              openWindowFn(icon.appId);
            }
          },
        },
        {
          label: '',
          separator: true,
          action: () => { },
        },
        {
          label: 'Rename',
          icon: 'Edit2',
          action: () => {
            setRenamingIconId(iconId);
          },
        },
        {
          label: 'Delete',
          icon: 'Trash2',
          action: () => {
            const isCustom = customDesktopIcons.some((icon) => icon.id === iconId);
            if (isCustom) {
              removeCustomDesktopIcon(iconId);
            } else {
              deleteDesktopIcon(iconId);
            }
          },
        },
      ];

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items,
      });
    },
    [desktopIcons, customDesktopIcons, openWindowFn, setContextMenu, deleteDesktopIcon, removeCustomDesktopIcon]
  );

  const handleIconMouseDown = useCallback(
    (iconId: string, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      setContextMenu(null);
      setStartMenuOpen(false);

      const isModifier = e.ctrlKey || e.metaKey || e.shiftKey;
      let newSelection = new Set(selectedIconIds);
      let toggleOnMouseUp = false;

      if (isModifier) {
        if (newSelection.has(iconId)) {
          newSelection.delete(iconId);
        } else {
          newSelection.add(iconId);
        }
      } else {
        if (!newSelection.has(iconId)) {
          newSelection = new Set([iconId]);
        } else {
          toggleOnMouseUp = true;
        }
      }

      setSelectedIconIds(newSelection);

      const startX = e.clientX;
      const startY = e.clientY;
      let moved = false;

      const initialPositions: Record<string, WindowPosition> = {};
      desktopIcons.forEach((icon) => {
        if (newSelection.has(icon.id)) {
          initialPositions[icon.id] = icon.position;
        }
      });

      const handleMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (!moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

        if (!moved) {
          moved = true;
          setDraggingIconIds(new Set(newSelection));
        }

        const newLivePositions: Record<string, WindowPosition> = {};
        Object.entries(initialPositions).forEach(([id, initPos]) => {
          newLivePositions[id] = {
            x: initPos.x + dx,
            y: Math.max(-DESKTOP_GRID_OFFSET_Y, initPos.y + dy),
          };
        });
        setLiveDragPositions(newLivePositions);
      };

      const handleMouseUp = (ev: MouseEvent) => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        if (moved) {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;

          const updatedIcons = desktopIcons.map((icon) => {
            if (newSelection.has(icon.id)) {
              const initPos = initialPositions[icon.id];
              const unsnapped = {
                x: initPos.x + dx,
                y: Math.max(-DESKTOP_GRID_OFFSET_Y, initPos.y + dy),
              };
              const snapped = snapToGrid(unsnapped);
              updateIconPosition(icon.id, snapped);
              return { ...icon, position: snapped };
            }
            return icon;
          });

          const { userId } = useDesktopStore.getState();
          if (userId) {
            saveIconPositions(userId, updatedIcons);
          }
        } else {
          if (toggleOnMouseUp) {
            setSelectedIconIds(new Set([iconId]));
          }
        }

        setDraggingIconIds(new Set());
        setLiveDragPositions({});
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [selectedIconIds, desktopIcons, snapToGrid, updateIconPosition, setContextMenu, setStartMenuOpen]
  );

  // --- Auth loading state ---
  if (loading) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <div className="fixed inset-0 flex items-center justify-center" suppressHydrationWarning style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #030b20, #0d2b63, #071730)' : 'linear-gradient(135deg, #c9d6ff, #e2e2e2, #f5f7fa)' }}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <span className="text-sm text-muted-foreground dark:text-white/40">Loading...</span>
          </div>
        </div>
      </div>
    );
  }



  // --- Data still loading ---
  if (!dataLoaded) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <div className="fixed inset-0 flex items-center justify-center" suppressHydrationWarning style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #030b20, #0d2b63, #071730)' : 'linear-gradient(135deg, #c9d6ff, #e2e2e2, #f5f7fa)' }}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <span className="text-sm text-muted-foreground dark:text-white/40">Loading your environment...</span>
          </div>
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
          <div id="desktop-background-container" className="absolute top-0 left-0 w-full h-[calc(100vh-64px)]">
            {desktopIcons.map((icon) => (
              <DesktopIcon
                key={icon.id}
                icon={icon.icon}
                label={icon.label}
                selected={selectedIconIds.has(icon.id)}
                isDragging={draggingIconIds.has(icon.id)}
                onDoubleClick={() => handleIconDoubleClick(icon.appId)}
                onMouseDown={(e) => handleIconMouseDown(icon.id, e)}
                onContextMenu={(e) => handleIconContextMenu(icon.id, e)}
                darkBg={isWallpaperDark(wallpaper)}
                position={liveDragPositions[icon.id] ?? icon.position}
                iconId={icon.id}
                isRenaming={renamingIconId === icon.id}
                onRenameComplete={(newLabel) => {
                  renameDesktopIcon(icon.id, newLabel);
                  setRenamingIconId(null);
                }}
                onRenameCancel={() => setRenamingIconId(null)}
              />
            ))}
          </div>

          {selectionBox && (
            <div
              className="absolute border border-blue-500 bg-blue-500/20 pointer-events-none z-[9999]"
              style={{
                left: Math.min(selectionBox.x1, selectionBox.x2),
                top: Math.min(selectionBox.y1, selectionBox.y2),
                width: Math.abs(selectionBox.x2 - selectionBox.x1),
                height: Math.abs(selectionBox.y2 - selectionBox.y1),
              }}
            />
          )}
        </div>

        {windows.map((win) => {
          const AppComponent = APP_COMPONENT_MAP[win.appId];
          if (AppComponent) {
            return (
              <Window key={win.id} window={win} isActive={activeWindowId === win.id}>
                <AppComponent />
              </Window>
            );
          }

          const userApp = getUserApp(win.appId);
          if (userApp) {
            return (
              <Window key={win.id} window={win} isActive={activeWindowId === win.id}>
                <SandboxedApp
                  htmlContent={userApp.htmlContent}
                  sourceFiles={userApp.sourceFiles ?? undefined}
                  compiledHtml={userApp.compiledHtml ?? undefined}
                  windowId={win.id}
                />
              </Window>
            );
          }

          return (
            <Window key={win.id} window={win} isActive={activeWindowId === win.id}>
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Unknown app: {win.appId}
              </div>
            </Window>
          );
        })}

        <WelcomeWindow
          open={showWelcome}
          onClose={(dontShowAgain) => {
            setShowWelcome(false);
            if (dontShowAgain) {
              setWelcomeDismissed(true);
            }
          }}
        />

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
