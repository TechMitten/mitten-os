'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { useDesktopStore } from '@/stores/desktop-store';
import type { Notification } from '@/types/os';

const TYPE_STYLES: Record<
  Notification['type'],
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  info: { icon: Info, className: 'text-sky-400' },
  warning: { icon: AlertTriangle, className: 'text-amber-400' },
  error: { icon: XCircle, className: 'text-red-400' },
  success: { icon: CheckCircle2, className: 'text-emerald-400' },
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function NotificationCenter() {
  const notificationsOpen = useDesktopStore((s) => s.notificationsOpen);
  const setNotificationsOpen = useDesktopStore((s) => s.setNotificationsOpen);
  const notifications = useDesktopStore((s) => s.notifications);
  const markAllNotificationsRead = useDesktopStore((s) => s.markAllNotificationsRead);
  const dismissNotification = useDesktopStore((s) => s.dismissNotification);
  const clearNotifications = useDesktopStore((s) => s.clearNotifications);

  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!notificationsOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('[data-notification-button]')) return;
        setNotificationsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotificationsOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [notificationsOpen, setNotificationsOpen]);

  return (
    <AnimatePresence>
      {notificationsOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-14 right-3 w-96 max-h-[70vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-[9999]"
          onContextMenu={(e) => e.preventDefault()}
          style={{
            background: 'rgba(28, 28, 38, 0.88)',
            backdropFilter: 'blur(30px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(30px) saturate(1.5)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-black/5 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-foreground/70" />
              <span className="text-sm font-semibold text-foreground/80">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={clearNotifications}
              disabled={notifications.length === 0}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-foreground/60 hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-foreground/80 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Bell className="w-6 h-6 text-foreground/25" />
                <span className="text-sm text-foreground/40">No notifications</span>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const { icon: TypeIcon, className } = TYPE_STYLES[n.type] || TYPE_STYLES.info;
                  return (
                    <li
                      key={n.id}
                      className={`group relative flex gap-3 px-3 py-3 border-b border-black/5 dark:border-white/[0.04] hover:bg-black/5 dark:hover:bg-white/[0.04] transition-colors ${
                        n.read ? 'opacity-70' : ''
                      }`}
                    >
                      <TypeIcon
                        className={`w-4 h-4 shrink-0 mt-0.5 ${className}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-foreground/80 dark:text-white/80 leading-tight truncate">
                            {n.title}
                          </p>
                          <span className="text-[10px] text-foreground/40 shrink-0">
                            {formatRelativeTime(n.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/60 dark:text-white/50 leading-snug mt-0.5 break-words">
                          {n.message}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Dismiss notification"
                        onClick={() => dismissNotification(n.id)}
                        className="absolute top-2 right-2 p-1 rounded-md text-foreground/40 opacity-0 group-hover:opacity-100 hover:text-foreground/80 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t border-black/5 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={markAllNotificationsRead}
                disabled={unreadCount === 0}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground/70 hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-foreground/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
