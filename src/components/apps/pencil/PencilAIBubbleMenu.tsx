'use client';

import { useCallback, useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { SELECTION_ACTIONS, type AIActionId } from '@/lib/ai/pencil-prompts';
import { usePencilAIStore } from '@/stores/pencil-ai-store';
import { cn } from '@/lib/utils';
import { AI_ACTION_ICONS } from './ai-action-icons';

interface Props {
  editor: Editor | null;
  onRun: (actionId: AIActionId) => void;
  onRunCustom: (prompt: string) => void;
}

// Stable references: TipTap's BubbleMenu dispatches a transaction whenever
// these props change identity, which would loop forever together with
// `shouldRerenderOnTransaction`.
const appendToBody = () => document.body;

export default function PencilAIBubbleMenu({ editor, onRun, onRunCustom }: Props) {
  const status = usePencilAIStore((s) => s.status);
  const streaming = status === 'streaming';
  const [customOpen, setCustomOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const shouldShow = useCallback(
    ({ editor: e }: { editor: Editor }) => customOpen || !e.state.selection.empty,
    [customOpen]
  );

  if (!editor) return null;

  const submitCustom = () => {
    const prompt = customPrompt.trim();
    if (!prompt || streaming) return;
    onRunCustom(prompt);
    setCustomPrompt('');
    setCustomOpen(false);
  };

  return (
    <BubbleMenu
      editor={editor}
      updateDelay={100}
      appendTo={appendToBody}
      shouldShow={shouldShow}
      className="z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover dark:bg-zinc-800 p-1 shadow-xl"
    >
      {customOpen ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitCustom();
              } else if (e.key === 'Escape') {
                setCustomOpen(false);
                setCustomPrompt('');
              }
            }}
            placeholder="Ask AI to edit…"
            className="w-52 text-xs px-2 py-1 rounded bg-muted dark:bg-white/5 border border-border outline-none focus:border-[var(--accent-color)]/60"
          />
          <button
            type="button"
            onClick={submitCustom}
            disabled={streaming || !customPrompt.trim()}
            title="Run"
            className="w-6 h-6 flex items-center justify-center rounded bg-[var(--accent-color)] text-white hover:opacity-90 disabled:opacity-40"
          >
            {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      ) : (
        <>
          <span className="flex items-center justify-center w-6 h-6 text-[var(--accent-color)]" title="Pencil AI">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div className="w-px h-4 bg-border mx-0.5" />
          {SELECTION_ACTIONS.map((action) => {
            const Icon = AI_ACTION_ICONS[action.id];
            return (
              <button
                key={action.id}
                type="button"
                title={action.label}
                aria-label={action.label}
                disabled={streaming}
                onClick={() => onRun(action.id)}
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded transition-colors',
                  'text-foreground/70 dark:text-white/70 hover:bg-accent dark:hover:bg-white/10 hover:text-foreground dark:hover:text-white',
                  streaming && 'opacity-40 pointer-events-none'
                )}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            type="button"
            title="Custom instruction"
            onClick={() => setCustomOpen(true)}
            className="h-7 px-2 flex items-center gap-1 rounded text-xs font-medium text-[var(--accent-color)] hover:bg-[var(--accent-color)]/10 transition-colors"
          >
            Custom
          </button>
        </>
      )}
    </BubbleMenu>
  );
}
