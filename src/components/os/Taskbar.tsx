'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  LayoutGrid,
  Sun,
  Bell,
  User,
  Cloud,
  CloudSun,
  CloudRain,
  Snowflake,
  Loader2,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { ICON_MAP } from '@/lib/icon-map';
import { getAccentColor } from '@/lib/theme';
import { useWindowStore } from '@/stores/window-store';
import { useDesktopStore } from '@/stores/desktop-store';
import { useAuthStore } from '@/stores/auth-store';
import { useWeatherStore } from '@/stores/weather-store';
import { APP_REGISTRY } from '@/types/os';
import { useAIModelStore } from '@/stores/ai-model-store';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';



function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  const use24HourClock = useDesktopStore((s) => s.use24HourClock);
  const showDateUnderTime = useDesktopStore((s) => s.showDateUnderTime);
  const setContextMenu = useDesktopStore((s) => s.setContextMenu);
  const setSettingsInitialSection = useDesktopStore((s) => s.setSettingsInitialSection);
  const openWindow = useWindowStore((s) => s.openWindow);

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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      x: rect.right - 200,
      y: rect.top,
      items: [
        {
          label: 'Adjust date and time',
          icon: 'Clock',
          action: () => {
            setSettingsInitialSection('date-time');
            openWindow('settings');
          },
        },
      ],
    });
  };

  // Placeholder that matches SSR output (no client-specific text)
  if (!now) {
    return (
      <div
        onContextMenu={handleContextMenu}
        className="flex flex-col items-center justify-center text-xs leading-tight px-2 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-150 cursor-pointer select-none"
      >
        <span className="font-medium text-foreground/80">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        {showDateUnderTime && <span className="text-[10px] text-foreground/50">&nbsp;&nbsp;&nbsp;&nbsp;</span>}
      </div>
    );
  }

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: use24HourClock ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: !use24HourClock,
  });

  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
  });

  const fullDateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onContextMenu={handleContextMenu}
          className="flex flex-col items-center justify-center text-xs leading-tight px-2 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-150 cursor-pointer select-none text-left"
        >
          <span className="font-medium text-foreground/80">{timeStr}</span>
          {showDateUnderTime && (
            <span className="text-[10px] text-foreground/50">{dateStr}</span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {fullDateStr}
      </TooltipContent>
    </Tooltip>
  );
}


function LocalModelDownloadWidget() {
  const status = useAIModelStore((s) => s.status);
  const modelId = useAIModelStore((s) => s.modelId);
  const progress = useAIModelStore((s) => s.progress);
  const message = useAIModelStore((s) => s.message);
  const error = useAIModelStore((s) => s.error);

  if (status === 'idle' || status === 'ready') return null;

  const roundedProgress = Math.round(progress);
  const isDownloading = status === 'downloading';
  const isError = status === 'error';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="status"
          aria-live="polite"
          className="w-60 max-w-[42vw] px-3 py-2 rounded-xl border border-white/15 bg-zinc-950/95 shadow-xl shadow-black/30 text-zinc-100 select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold leading-tight">
                <span className="truncate">
                  {isDownloading ? 'Downloading local AI' : 'Local AI failed'}
                </span>
                <span className="tabular-nums text-[10px] text-zinc-300 shrink-0">
                  {isDownloading ? `${roundedProgress}%` : '--'}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/12 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${isError ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{ width: `${isError ? Math.max(roundedProgress, 8) : roundedProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-sm border border-white/15 bg-zinc-950 px-3 py-2.5 text-left text-zinc-100 shadow-2xl shadow-black/40"
      >
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-white break-words">
            {modelId || 'Local WebGPU model'}
          </div>
          <div className="text-[11px] leading-relaxed text-zinc-200 whitespace-normal break-words">
            {error || message || 'Preparing local model...'}
          </div>
          {isDownloading && (
            <div className="text-[11px] font-medium text-amber-300">
              AI apps are locked until this completes.
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
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
    notifications,
    notificationsOpen,
    toggleNotifications,
    accentColor,
  } = useDesktopStore();

  const currentAccent = getAccentColor(accentColor);

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
                  className="w-5 h-5 transition-colors duration-150 text-foreground/80"
                  style={startMenuOpen ? { color: currentAccent.value } : undefined}
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
                    style={
                      isAnyActive
                        ? {
                            backgroundColor: currentAccent.value,
                            boxShadow: `0 2px 10px ${currentAccent.value}50`,
                          }
                        : undefined
                    }
                    className={`
                      relative flex items-center justify-center w-9 h-9 rounded-lg
                      transition-all duration-150 cursor-pointer
                      ${isAnyActive ? 'text-white' : 'text-foreground/80 hover:bg-black/10 dark:hover:bg-white/10'}
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

        {/* Right: System Tray */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleNotifications}
                data-notification-button
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150 cursor-pointer text-foreground/80 ${
                  notificationsOpen
                    ? 'bg-black/15 dark:bg-white/15'
                    : 'hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-semibold text-white flex items-center justify-center"
                    style={{ backgroundColor: currentAccent.value }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
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

          {/* Weather */}
          <TaskbarWeather />

          {/* Clock + non-dismissible local AI model download */}
          <div className="relative flex items-center">
            <div className="absolute right-0 bottom-full mb-2">
              <LocalModelDownloadWidget />
            </div>
            <Clock />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
