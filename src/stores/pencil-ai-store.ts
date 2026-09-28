import { create } from 'zustand';
import { chatCompletion } from '@/lib/ai/client';
import type { ChatMessage } from '@/lib/ai/types';
import {
  buildMessages,
  getAction,
  type AIActionId,
  type AIRunContext,
  type AIScope,
} from '@/lib/ai/pencil-prompts';

export type AIStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface AIRunMeta {
  actionId: AIActionId;
  label: string;
  scope: AIScope;
  range: { from: number; to: number } | null;
  docVersion: number | null;
  /** Text the request was based on, kept so the request can be retried. */
  sourceText: string;
  customPrompt?: string;
}

interface PencilAIState {
  status: AIStatus;
  streamingText: string;
  meta: AIRunMeta | null;
  error: string | null;
  panelOpen: boolean;

  setPanelOpen: (open: boolean) => void;
  run: (actionId: AIActionId, context: AIRunContext) => Promise<void>;
  runCustom: (prompt: string, context: AIRunContext) => Promise<void>;
  retry: () => Promise<void>;
  cancel: () => void;
  clear: () => void;
}

let abortController: AbortController | null = null;
let lastRequest: { meta: AIRunMeta; messages: ChatMessage[]; temperature: number } | null = null;

export const usePencilAIStore = create<PencilAIState>((set) => {
  const execute = async (
    meta: AIRunMeta,
    messages: ChatMessage[],
    temperature: number
  ) => {
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;
    lastRequest = { meta, messages, temperature };

    set({ status: 'streaming', streamingText: '', meta, error: null });

    let full = '';
    try {
      await chatCompletion({
        messages,
        temperature,
        stream: true,
        signal: controller.signal,
        onChunk: (chunk) => {
          full += chunk;
          set({ streamingText: full });
        },
      });
      if (controller.signal.aborted) return;
      set({ status: 'done', streamingText: full });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Something went wrong while contacting the AI.';
      set({ status: 'error', error: message, streamingText: full });
    } finally {
      if (abortController === controller) abortController = null;
    }
  };

  const buildMeta = (
    actionId: AIActionId,
    label: string,
    context: AIRunContext,
    customPrompt?: string
  ): AIRunMeta => ({
    actionId,
    label,
    scope: context.scope,
    range: context.selection ?? null,
    docVersion: context.docVersion ?? null,
    sourceText: context.text,
    customPrompt,
  });

  return {
    status: 'idle',
    streamingText: '',
    meta: null,
    error: null,
    panelOpen: false,

    setPanelOpen: (open) => set({ panelOpen: open }),

    run: async (actionId, context) => {
      const action = getAction(actionId);
      const messages = buildMessages(actionId, context);
      await execute(buildMeta(actionId, action.label, context), messages, action.temperature);
    },

    runCustom: async (prompt, context) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      const messages = buildMessages('custom', context, trimmed);
      await execute(buildMeta('custom', 'Custom instruction', context, trimmed), messages, 0.4);
    },

    retry: async () => {
      if (!lastRequest) return;
      await execute(lastRequest.meta, lastRequest.messages, lastRequest.temperature);
    },

    cancel: () => {
      abortController?.abort();
      abortController = null;
      set({ status: 'idle', streamingText: '', meta: null, error: null });
    },

    clear: () => {
      abortController?.abort();
      abortController = null;
      set({ status: 'idle', streamingText: '', meta: null, error: null });
    },
  };
});
