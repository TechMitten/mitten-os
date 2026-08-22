'use client';

import { useEffect, useRef } from 'react';
import { Info, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { useDesktopStore } from '@/stores/desktop-store';
import { toast } from '@/hooks/use-toast';
import type { Notification } from '@/types/os';

const TYPE_STYLES: Record<
  Notification['type'],
  { icon: typeof Info; className: string }
> = {
  info: { icon: Info, className: 'text-sky-400' },
  warning: { icon: AlertTriangle, className: 'text-amber-400' },
  error: { icon: XCircle, className: 'text-red-400' },
  success: { icon: CheckCircle2, className: 'text-emerald-400' },
};

export function NotificationToaster() {
  const notifications = useDesktopStore((s) => s.notifications);
  const seenIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    // Seed with existing (persisted) notifications so we don't toast them.
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(notifications.map((n) => n.id));
      return;
    }

    for (const n of notifications) {
      if (seenIdsRef.current.has(n.id)) continue;
      seenIdsRef.current.add(n.id);

      const { icon: TypeIcon, className } = TYPE_STYLES[n.type] || TYPE_STYLES.info;
      toast({
        title: (
          <span className="flex items-center gap-2">
            <TypeIcon className={`w-4 h-4 shrink-0 ${className}`} />
            {n.title}
          </span>
        ),
        description: n.message,
      });
    }
  }, [notifications]);

  return null;
}
