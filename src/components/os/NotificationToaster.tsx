'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [aiDownloadModal, setAiDownloadModal] = useState<Notification | null>(null);

  useEffect(() => {
    // Seed with existing (persisted) notifications so we don't toast them.
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(notifications.map((n) => n.id));
      return;
    }

    for (const n of notifications) {
      if (seenIdsRef.current.has(n.id)) continue;
      seenIdsRef.current.add(n.id);

      if (n.title === 'Local AI is still downloading') {
        setAiDownloadModal(n);
        continue;
      }

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

  if (!aiDownloadModal) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ai-download-modal-title"
        aria-describedby="ai-download-modal-description"
        className="w-full max-w-md rounded-2xl border border-white/25 bg-zinc-900 p-6 text-zinc-50 shadow-[0_24px_90px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)]"
      >
        <div className="flex items-start gap-4">
          <div className="mt-0.5 rounded-xl border border-amber-300/60 bg-amber-300/15 p-2.5 text-amber-200 shadow-sm shadow-amber-950/40">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="ai-download-modal-title" className="text-base font-bold text-white">
              {aiDownloadModal.title}
            </h2>
            <p id="ai-download-modal-description" className="mt-2.5 text-sm leading-relaxed text-zinc-100">
              {aiDownloadModal.message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setAiDownloadModal(null)}
            className="rounded-lg border border-white/20 bg-white px-4 py-2 text-xs font-bold text-zinc-950 shadow-sm transition-colors hover:bg-zinc-200"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
