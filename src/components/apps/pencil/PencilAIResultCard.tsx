'use client';

import { AlertTriangle, Check, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { usePencilAIStore } from '@/stores/pencil-ai-store';
import { cn } from '@/lib/utils';
import { MarkdownContent } from '../shared/MarkdownContent';

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
  const replacesDocument = meta.actionId === 'spellcheck';

  return (
    <div className="rounded-lg border border-zinc-600 bg-zinc-800 overflow-hidden shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700">
        {failed ? (
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
        ) : streaming ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-color)] shrink-0" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-color)] shrink-0" />
        )}
        <span className="text-xs font-medium truncate">{meta.label}</span>
        <span className="text-[11px] text-muted-foreground shrink-0">
          {failed ? 'Failed' : streaming ? 'Writing…' : 'Ready'}
        </span>
        <button
          type="button"
          title="Discard"
          onClick={onDiscard}
          className="ml-auto w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-muted-foreground shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {failed ? (
        <div className="px-3 py-3 text-xs text-red-400">{error}</div>
      ) : (
        <div className="px-3 py-2.5 break-words">
          {streamingText ? (
            <MarkdownContent content={streamingText} />
          ) : streaming ? (
            <span className="text-sm text-muted-foreground">…</span>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-t border-zinc-700 bg-black/20">
        {streaming ? (
          <button
            type="button"
            onClick={cancel}
            className="text-xs px-2.5 py-1 rounded border border-zinc-600 hover:bg-white/10 font-medium"
          >
            Stop
          </button>
        ) : failed ? (
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-zinc-600 hover:bg-white/10 font-medium"
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
                'flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium text-zinc-950 transition-opacity hover:opacity-90',
                'bg-[var(--accent-color)]'
              )}
            >
              <Check className="w-3.5 h-3.5" />
              {replacesDocument ? 'Replace document' : isSelection ? 'Replace selection' : 'Insert'}
            </button>
            {isSelection && (
              <button
                type="button"
                onClick={onInsertBelow}
                className="text-xs px-2.5 py-1 rounded border border-zinc-600 hover:bg-white/10 font-medium"
              >
                Insert below
              </button>
            )}
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-zinc-600 hover:bg-white/10 font-medium ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Regenerate
            </button>
          </>
        )}
      </div>
    </div>
  );
}
