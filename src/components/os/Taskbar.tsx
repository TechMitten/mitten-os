'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  LayoutGrid,
  Sun,
  Moon,
  Bell,
  FolderOpen,
  TerminalSquare,
  FileText,
  Calculator,
  Settings,
  Globe,
  Image,
  Store,
  CloudSun,
  Info,
  User,
  Bot,
  Cloud,
  CloudRain,
  Snowflake,
  Loader2,
} from 'lucide-react';
import { useWindowStore } from '@/stores/window-store';
import { useDesktopStore } from '@/stores/desktop-store';
import { useAuthStore } from '@/stores/auth-store';
import { useWeatherStore } from '@/stores/weather-store';
import { APP_REGISTRY } from '@/types/os';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

// Map icon name strings to actual Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutGrid,
  FolderOpen,
  TerminalSquare,
  FileText,
  Calculator,
  Settings,
  Globe,
  Image,
  Store,
  CloudSun,
  Info,
  Sun,
  Moon,
  Bell,
  User,
  Bot,
};

function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Use rAF to schedule the first update asynchronously — avoids the
    // hydration mismatch (server can't know the client's local time) and
    // satisfies the react-hooks/set-state-in-effect lint rule.
    const update = () => setNow(new Date());
    const rafId = requestAnimationFrame(update);
    const timer = setInterval(update, 1000);
    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(timer);
    };
  }, []);

  // Placeholder that matches SSR output (no client-specific text)
  if (!now) {
    return (
      <div className="flex flex-col items-center justify-center text-xs leading-tight px-2 cursor-default">
        <span className="font-medium text-foreground/80">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <span className="text-[10px] text-foreground/50">&nbsp;&nbsp;&nbsp;&nbsp;</span>
      </div>
    );
  }

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
  });

  return (
    <div className="flex flex-col items-center justify-center text-xs leading-tight px-2 cursor-default">
      <span className="font-medium text-foreground/80">{timeStr}</span>
      <span className="text-[10px] text-foreground/50">{dateStr}</span>
    </div>
  );
}

function TaskbarWeather() {
  const showInTaskbar = useWeatherStore((s) => s.showInTaskbar);
  const data = useWeatherStore((s) => s.data);
  const isLoading = useWeatherStore((s) => s.isLoading);
  const openWindow = useWindowStore((s) => s.openWindow);

  if (!showInTaskbar) return null;

  const handleWeatherClick = () => {
    openWindow('weather');
  };

  const getWeatherIcon = (cond: string | undefined) => {
    switch (cond) {
      case 'sunny':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'partly-cloudy':
        return <CloudSun className="w-4 h-4 text-sky-400" />;
      case 'cloudy':
        return <Cloud className="w-4 h-4 text-slate-400" />;
      case 'rainy':
        return <CloudRain className="w-4 h-4 text-blue-400" />;
      case 'snowy':
        return <Snowflake className="w-4 h-4 text-blue-200" />;
      default:
        return <CloudSun className="w-4 h-4 text-foreground/50" />;
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleWeatherClick}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-150 text-[11px] font-medium text-foreground/80 active:scale-95 cursor-pointer"
        >
          {isLoading && !data ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin opacity-50" />
          ) : (
            <>
              {getWeatherIcon(data?.condition)}
              <span>{data ? `${data.temperature}°` : '--°'}</span>
            </>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {data ? `${data.location}: ${data.description}` : 'Loading Weather...'}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Taskbar() {
  const { windows, activeWindowId, toggleMinimize } = useWindowStore();
  const {
    startMenuOpen,
    toggleStartMenu,
    theme,
    toggleTheme,
    notifications,
  } = useDesktopStore();

  const user = useAuthStore((s) => s.user);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Group windows by appId
  const groupedWindows = useMemo(() => {
    const groups: Record<
      string,
      { appId: string; windows: typeof windows; icon: string }
    > = {};
    for (const win of windows) {
      if (!groups[win.appId]) {
        const appDef = APP_REGISTRY[win.appId];
        groups[win.appId] = {
          appId: win.appId,
          windows: [],
          icon: appDef?.icon || 'Info',
        };
      }
      groups[win.appId].windows.push(win);
    }
    return Object.values(groups);
  }, [windows]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="fixed bottom-0 left-0 right-0 h-12 flex items-center justify-between px-2 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-t border-white/10 z-[9999]"
        role="toolbar"
        aria-label="Taskbar"
      >
        {/* Left: Start/App launcher button */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                data-start-button
                onClick={toggleStartMenu}
                className={`
                  relative flex items-center justify-center w-9 h-9 rounded-lg
                  transition-colors duration-150 cursor-pointer
                  hover:bg-black/10 dark:hover:bg-white/10
                  ${startMenuOpen ? 'bg-black/15 dark:bg-white/15' : ''}
                `}
                aria-label="Start menu"
                aria-pressed={startMenuOpen}
              >
                <LayoutGrid
                  className={`w-5 h-5 transition-colors duration-150 ${
                    startMenuOpen
                      ? 'text-primary'
                      : 'text-foreground/80'
                  }`}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Start</TooltipContent>
          </Tooltip>
        </div>

        {/* Center: Running apps */}
        <div className="flex items-center gap-1 flex-1 justify-center">
          {groupedWindows.map((group) => {
            const IconComponent = ICON_MAP[group.icon] || Info;
            const isAnyActive = group.windows.some(
              (w) => w.id === activeWindowId
            );
            const isAnyMinimized = group.windows.some(
              (w) => w.state === 'minimized'
            );

            // For clicking, toggle minimize/focus behavior
            const handleAppClick = () => {
              // If the active window is in this group, minimize it
              const activeWin = group.windows.find(
                (w) => w.id === activeWindowId
              );
              if (activeWin) {
                toggleMinimize(activeWin.id);
                return;
              }
              // Otherwise, restore/focus the first minimized or first window
              const targetWin =
                group.windows.find((w) => w.state === 'minimized') ||
                group.windows[0];
              if (targetWin) {
                toggleMinimize(targetWin.id);
              }
            };

            return (
              <Tooltip key={group.appId}>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleAppClick}
                    data-taskbar-app={group.appId}
                    className={`
                      relative flex items-center justify-center w-9 h-9 rounded-lg
                      transition-colors duration-150 cursor-pointer
                      ${isAnyActive ? 'bg-primary' : 'hover:bg-black/10 dark:hover:bg-white/10'}
                      ${isAnyMinimized && !isAnyActive ? 'opacity-60' : ''}
                    `}
                    aria-label={APP_REGISTRY[group.appId]?.name || group.appId}
                  >
                    <IconComponent
                      className={`w-5 h-5 ${
                        isAnyActive
                          ? 'text-white'
                          : 'text-foreground/80'
                      }`}
                    />
                    {/* Active window indicator dot */}
                    {isAnyActive && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                    )}
                    {/* Multiple windows indicator */}
                    {group.windows.length > 1 && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-foreground/40" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {APP_REGISTRY[group.appId]?.name || group.appId}
                  {group.windows.length > 1
                    ? ` (${group.windows.length})`
                    : ''}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Right: System tray */}
        <div className="flex items-center gap-1">
          {/* Notification bell */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <Bell className="w-4 h-4 text-foreground/80" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'No notifications'}
            </TooltipContent>
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-foreground/80" />
                ) : (
                  <Moon className="w-4 h-4 text-foreground/80" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </TooltipContent>
          </Tooltip>

          {/* User badge */}
          {user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-foreground/60 text-[11px]">
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[80px] truncate hidden sm:block">
                    {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">{user.email}</TooltipContent>
            </Tooltip>
          )}

          {/* Weather */}
          <TaskbarWeather />

          {/* Clock */}
          <Clock />
        </div>
      </div>
    </TooltipProvider>
  );
}
