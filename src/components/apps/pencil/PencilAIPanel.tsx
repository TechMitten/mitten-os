'use client';

import { useState } from 'react';
import { ArrowRight, KeyRound, Loader2, Sparkles, X } from 'lucide-react';
import { DOCUMENT_ACTIONS, type AIActionId } from '@/lib/ai/pencil-prompts';
import { usePencilAIStore } from '@/stores/pencil-ai-store';
import { cn } from '@/lib/utils';
import { AI_ACTION_ICONS } from './ai-action-icons';
import PencilAIResultCard from './PencilAIResultCard';

interface Props {
  configured: boolean;
  onConfigure: () => void;
  onRunDoc: (actionId: AIActionId) => void;
  onRunCustom: (prompt: string) => void;
  onClose: () => void;
  onAcceptResult: () => void;
  onInsertBelowResult: () => void;
  onDiscardResult: () => void;
}

export default function PencilAIPanel({
  configured,
  onConfigure,
  onRunDoc,
  onRunCustom,
  onClose,
  onAcceptResult,
  onInsertBelowResult,
  onDiscardResult,
}: Props) {
  const status = usePencilAIStore((s) => s.status);
  const streaming = status === 'streaming';
  const [prompt, setPrompt] = useState('');

  const submit = () => {
    const trimmed = prompt.trim();
    if (!trimmed || streaming) return;
    onRunCustom(trimmed);
    setPrompt('');
  };

  return (
    <div className="w-72 shrink-0 border-l border-zinc-600/70 bg-card dark:bg-zinc-900 flex flex-col">
      <div className="h-10 px-3 flex items-center gap-2 border-b border-border shrink-0">
        <Sparkles className="w-4 h-4 text-[var(--accent-color)]" />
        <span className="text-sm font-medium">Pencil AI</span>
        <button
          type="button"
          title="Close"
          onClick={onClose}
          className="ml-auto w-6 h-6 flex items-center justify-center rounded hover:bg-accent dark:hover:bg-white/10 text-muted-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!configured ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-5">
          <div className="w-11 h-11 rounded-xl bg-[var(--accent-color)]/15 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-[var(--accent-color)]" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Add an AI endpoint and key in the Keys app to start writing with AI.
          </p>
          <button
            type="button"
            onClick={onConfigure}
            className="text-xs px-3 py-1.5 rounded-md bg-[var(--accent-color)] text-zinc-950 font-medium hover:opacity-90 transition-opacity"
          >
            Open Keys
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto os-scrollbar p-3 flex flex-col gap-4">
          <PencilAIResultCard
            onAccept={onAcceptResult}
            onInsertBelow={onInsertBelowResult}
            onDiscard={onDiscardResult}
          />

          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground px-1">
              Document
            </span>
            {DOCUMENT_ACTIONS.map((action) => {
              const Icon = AI_ACTION_ICONS[action.id];
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={streaming}
                  onClick={() => onRunDoc(action.id)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors',
                    'hover:bg-accent dark:hover:bg-white/10',
                    streaming && 'text-muted-foreground pointer-events-none'
                  )}
                >
                  <Icon className="w-4 h-4 text-[var(--accent-color)] shrink-0" />
                  {action.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground px-1">
              Write or edit
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. Draft a project proposal for a mobile app…"
              rows={4}
              className="w-full text-xs px-2.5 py-2 rounded-md bg-muted dark:bg-white/5 border border-border outline-none focus:border-[var(--accent-color)]/60 resize-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={submit}
              disabled={streaming || !prompt.trim()}
              className="flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[var(--accent-color)] text-zinc-950 font-medium hover:opacity-90 transition-opacity disabled:bg-muted disabled:text-foreground/70 disabled:cursor-not-allowed"
            >
              {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              {streaming ? 'Writing…' : 'Generate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
