'use client';

import { AlertTriangle, Check, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { usePencilAIStore } from '@/stores/pencil-ai-store';
import { cn } from '@/lib/utils';

interface Props {
  onAccept: () => void;
  onInsertBelow: () => void;
  onDiscard: () => void;
}

export default function PencilAIResultCard({ onAccept, onInsertBelow, onDiscard }: Props) {
  const status = usePencilAIStore((s) => s.status);
  const streamingText = usePencilAIStore((s) => s.streamingText);
  const meta = usePencilAIStore((s) => s.meta);
  const error = usePencilAIStore((s) => s.error);
  const retry = usePencilAIStore((s) => s.retry);
  const cancel = usePencilAIStore((s) => s.cancel);

  if (status === 'idle' || !meta) return null;

  const streaming = status === 'streaming';
  const failed = status === 'error';
  const isSelection = meta.scope === 'selection' && !!meta.range;

  return (
    <div className="absolute inset-x-0 bottom-4 z-40 px-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-[640px] rounded-xl border border-border bg-popover dark:bg-zinc-800 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          {failed ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          ) : streaming ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-color)] shrink-0" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-color)] shrink-0" />
          )}
          <span className="text-xs font-medium truncate">{meta.label}</span>
          <span className="text-[11px] text-muted-foreground">
            {failed ? 'Failed' : streaming ? 'Writing…' : 'Ready'}
          </span>
          <button
            type="button"
            title="Discard"
            onClick={onDiscard}
            className="ml-auto w-6 h-6 flex items-center justify-center rounded hover:bg-accent dark:hover:bg-white/10 text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {failed ? (
          <div className="px-3 py-3 text-xs text-red-500">{error}</div>
        ) : (
          <div className="px-3 py-2.5 max-h-48 overflow-y-auto os-scrollbar text-[13px] leading-relaxed whitespace-pre-wrap">
            {streamingText || (streaming ? '…' : '')}
          </div>
        )}

        <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border">
          {streaming ? (
            <button
              type="button"
              onClick={cancel}
              className="text-xs px-2.5 py-1 rounded border border-border hover:bg-accent dark:hover:bg-white/10 font-medium"
            >
              Stop
            </button>
          ) : failed ? (
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-border hover:bg-accent dark:hover:bg-white/10 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onAccept}
                className={cn(
                  'flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium text-white transition-opacity hover:opacity-90',
                  'bg-[var(--accent-color)]'
                )}
              >
                <Check className="w-3.5 h-3.5" />
                {isSelection ? 'Replace selection' : 'Insert'}
              </button>
              {isSelection && (
                <button
                  type="button"
                  onClick={onInsertBelow}
                  className="text-xs px-2.5 py-1 rounded border border-border hover:bg-accent dark:hover:bg-white/10 font-medium"
                >
                  Insert below
                </button>
              )}
              <button
                type="button"
                onClick={retry}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-border hover:bg-accent dark:hover:bg-white/10 font-medium ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Regenerate
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
