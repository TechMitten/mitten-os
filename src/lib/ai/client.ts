import { getActiveLLMConfig } from '@/lib/keys';
import { webllmChatCompletion, type WebLLMLoadProgress } from './webllm';
import type { ChatMessage, ToolCall } from './types';

export interface ChatCompletionParams {
  messages: ChatMessage[];
  temperature?: number;
  stream?: boolean;
  onChunk?: (chunk: string) => void;
  tools?: unknown[];
  tool_choice?: unknown;
  signal?: AbortSignal | null;
  onLoadProgress?: (progress: WebLLMLoadProgress) => void;
}

export interface ChatCompletionResult {
  content: string;
  toolCalls: ToolCall[];
}

export async function chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
  const config = getActiveLLMConfig();

  if (config.kind === 'webllm') {
    if (!config.model) {
      throw new Error('No local model selected. Open the Keys app and pick a WebGPU model.');
    }
    return webllmChatCompletion({
      modelId: config.model,
      messages: params.messages,
      temperature: params.temperature,
      stream: params.stream,
      onChunk: params.onChunk,
      tools: params.tools,
      tool_choice: params.tool_choice,
      signal: params.signal,
      onLoadProgress: params.onLoadProgress,
    });
  }

  if (!config.endpoint || !config.apiKey || !config.model) {
    throw new Error('AI API configurations are missing. Please open the Keys app and configure your endpoint, API key, and model.');
  }

  return openAICompatibleCompletion({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    model: config.model,
    ...params,
  });
}

interface CloudParams extends ChatCompletionParams {
  endpoint: string;
  apiKey: string;
  model: string;
}

async function openAICompatibleCompletion(params: CloudParams): Promise<ChatCompletionResult> {
  const {
    endpoint,
    apiKey,
    model,
    messages,
    temperature = 0.7,
    stream,
    onChunk,
    tools,
    tool_choice,
    signal,
  } = params;

  const cleanUrl = endpoint.trim();
  const baseUrl = cleanUrl.endsWith('/chat/completions')
    ? cleanUrl
    : `${cleanUrl.replace(/\/$/, '')}/chat/completions`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey.trim()}`,
    'Content-Type': 'application/json',
  };

  const useStream = stream ?? !!onChunk;

  const bodyObj: Record<string, unknown> = {
    model: model.trim(),
    stream: useStream,
    messages,
    temperature,
  };
  if (tools) bodyObj.tools = tools;
  if (tool_choice) bodyObj.tool_choice = tool_choice;

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyObj),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `HTTP Error ${response.status}`;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.error?.message || errMsg;
    } catch {
      if (errText) errMsg += ` - ${errText.substring(0, 100)}`;
    }
    throw new Error(errMsg);
  }

  if (!useStream) {
    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{ id?: string; function: { name: string; arguments: string } }>;
        };
      }>;
    };
    const message = data.choices?.[0]?.message;
    return {
      content: message?.content ?? '',
      toolCalls: (message?.tool_calls ?? []).map((tc) => ({
        id: tc.id ?? '',
        type: 'function',
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    };
  }

  const STREAM_READ_TIMEOUT_MS = 60000;
  let text = '';
  const toolCallsBuffer: ToolCall[] = [];
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const readWithTimeout = async () => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const readPromise = reader.read();
    const timeoutPromise = new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) =>
      setTimeout(
        () => reject(new Error('Stream stalled: no data received for ' + STREAM_READ_TIMEOUT_MS / 1000 + 's')),
        STREAM_READ_TIMEOUT_MS
      )
    );
    return await Promise.race([readPromise, timeoutPromise]);
  };

  while (true) {
    const { done, value } = await readWithTimeout();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('data: ')) {
        const data = trimmedLine.slice(6);
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data) as {
            choices?: Array<{
              delta?: {
                content?: string;
                tool_calls?: Array<{
                  index?: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
            }>;
          };
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) {
            text += delta.content;
            onChunk?.(delta.content);
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsBuffer[idx]) {
                toolCallsBuffer[idx] = {
                  id: tc.id ?? String(idx),
                  type: 'function',
                  function: { name: tc.function?.name ?? '', arguments: '' },
                };
              }
              if (tc.function?.name) toolCallsBuffer[idx].function.name = tc.function.name;
              if (tc.function?.arguments) toolCallsBuffer[idx].function.arguments += tc.function.arguments;
            }
          }
        } catch {
          /* ignore unparseable */
        }
      }
    }
  }

  return { content: text, toolCalls: toolCallsBuffer.filter(Boolean) };
}
