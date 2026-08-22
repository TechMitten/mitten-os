import type { ChatMessage, ToolCall } from './types';

export interface WebLLMModel {
  id: string;
  label: string;
  size: string;
}

export const WEBLLM_MODELS: WebLLMModel[] = [
  { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 0.5B', size: '~0.5 GB' },
  { id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC', label: 'SmolLM2 1.7B', size: '~1.2 GB' },
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 1B', size: '~0.9 GB' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 1.5B', size: '~1.2 GB' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 3B', size: '~2.0 GB' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', label: 'Gemma 2 2B', size: '~1.6 GB' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', label: 'Phi-3.5 mini', size: '~2.2 GB' },
  { id: 'Qwen2.5-7B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 7B', size: '~5.0 GB' },
  { id: 'Llama-3.1-8B-Instruct-q4f32_1-MLC', label: 'Llama 3.1 8B', size: '~4.7 GB' },
  { id: 'Hermes-3-Llama-3.1-8B-q4f32_1-MLC', label: 'Hermes 3 8B (tool-calling)', size: '~4.7 GB' },
];

export const DEFAULT_WEBLLM_MODEL = WEBLLM_MODELS[4].id;

export interface WebLLMLoadProgress {
  progress: number;
  text: string;
  timeElapsed: number;
}

export interface WebLLMChatParams {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  stream?: boolean;
  onChunk?: (chunk: string) => void;
  tools?: unknown[];
  tool_choice?: unknown;
  signal?: AbortSignal | null;
  onLoadProgress?: (progress: WebLLMLoadProgress) => void;
}

export interface WebLLMChatResult {
  content: string;
  toolCalls: ToolCall[];
}

type MLCEngine = import('@mlc-ai/web-llm').MLCEngine;

const engineCache = new Map<string, Promise<MLCEngine>>();
const progressListeners = new Set<(progress: WebLLMLoadProgress) => void>();

export function isWebGPUSupported(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  return 'gpu' in navigator;
}

export async function checkWebGPUSupported(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (!gpu) return false;
    const adapter = await gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

export async function getWebLLMEngine(
  modelId: string,
  opts?: { onProgress?: (progress: WebLLMLoadProgress) => void; signal?: AbortSignal | null }
): Promise<MLCEngine> {
  if (opts?.onProgress) progressListeners.add(opts.onProgress);

  let pending = engineCache.get(modelId);
  if (!pending) {
    pending = createEngine(modelId, opts?.signal);
    engineCache.set(modelId, pending);
  }

  try {
    return await pending;
  } catch (err) {
    engineCache.delete(modelId);
    throw err;
  } finally {
    if (opts?.onProgress) progressListeners.delete(opts.onProgress);
  }
}

async function createEngine(modelId: string, signal?: AbortSignal | null): Promise<MLCEngine> {
  const webllm = await import('@mlc-ai/web-llm');
  const engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: (report: { progress: number; text: string; timeElapsed: number }) => {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const progress: WebLLMLoadProgress = {
        progress: report.progress ?? 0,
        text: report.text ?? '',
        timeElapsed: report.timeElapsed ?? 0,
      };
      for (const listener of progressListeners) {
        try {
          listener(progress);
        } catch {
          /* ignore listener errors */
        }
      }
    },
  });
  return engine;
}

export async function unloadWebLLMEngine(modelId?: string): Promise<void> {
  if (modelId) {
    const pending = engineCache.get(modelId);
    if (pending) {
      try {
        const engine = await pending;
        await engine.unload();
      } catch {
        /* ignore */
      }
      engineCache.delete(modelId);
    }
    return;
  }
  for (const [id, pending] of engineCache) {
    try {
      const engine = await pending;
      await engine.unload();
    } catch {
      /* ignore */
    }
    engineCache.delete(id);
  }
}

function toChatMessageParam(messages: ChatMessage[]): Array<Record<string, unknown>> {
  return messages.map((m) => {
    const msg: Record<string, unknown> = { role: m.role, content: m.content ?? '' };
    if (m.tool_calls) msg.tool_calls = m.tool_calls;
    if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
    if (m.name) msg.name = m.name;
    return msg;
  });
}

export async function webllmChatCompletion(params: WebLLMChatParams): Promise<WebLLMChatResult> {
  const {
    modelId,
    messages,
    temperature = 0.7,
    stream,
    onChunk,
    tools,
    tool_choice,
    signal,
    onLoadProgress,
  } = params;

  const engine = await getWebLLMEngine(modelId, { onProgress: onLoadProgress, signal });

  const request: Record<string, unknown> = {
    messages: toChatMessageParam(messages),
    temperature,
    stream: stream ?? !!onChunk,
  };
  if (tools) request.tools = tools;
  if (tool_choice) request.tool_choice = tool_choice;

  if (request.stream) {
    const chunks = (await engine.chat.completions.create(request as never)) as unknown as AsyncIterable<{
      choices?: Array<{
        delta?: {
          content?: string | null;
          tool_calls?: Array<{
            index?: number;
            id?: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
    }>;

    let content = '';
    const toolCalls: ToolCall[] = [];

    for await (const chunk of chunks) {
      if (signal?.aborted) {
        await engine.interruptGenerate().catch(() => undefined);
        throw new DOMException('Aborted', 'AbortError');
      }
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        content += delta.content;
        onChunk?.(delta.content);
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCalls[idx]) {
            toolCalls[idx] = {
              id: tc.id ?? String(idx),
              type: 'function',
              function: { name: tc.function?.name ?? '', arguments: '' },
            };
          }
          if (tc.function?.name) toolCalls[idx].function.name = tc.function.name;
          if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
        }
      }
    }

    return { content, toolCalls: toolCalls.filter(Boolean) };
  }

  const reply = (await engine.chat.completions.create(request as never)) as unknown as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{ id?: string; function: { name: string; arguments: string } }>;
      };
    }>;
  };

  const message = reply.choices?.[0]?.message;
  const toolCalls: ToolCall[] = (message?.tool_calls ?? []).map((tc) => ({
    id: tc.id ?? '',
    type: 'function',
    function: { name: tc.function.name, arguments: tc.function.arguments },
  }));

  return { content: message?.content ?? '', toolCalls };
}
