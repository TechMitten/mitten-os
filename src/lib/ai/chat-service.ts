import { SYSTEM_PROMPT, TOOL_DEFINITIONS } from './tools';
import type { ChatMessage, ToolDefinition } from './types';

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';

interface DeepSeekRequest {
  model: string;
  messages: ChatMessage[];
  tools: ToolDefinition[];
  tool_choice: 'auto';
  thinking: { type: 'enabled' };
  reasoning_effort: 'high';
  stream: boolean;
  max_tokens?: number;
}

export function buildSystemMessages(fileManifest?: string[]): ChatMessage[] {
  const fileContext = fileManifest?.length
    ? `\n\n## Current Project Files\n${fileManifest.map((f) => `- ${f}`).join('\n')}`
    : '';

  return [
    {
      role: 'system',
      content: SYSTEM_PROMPT + fileContext,
    },
  ];
}

export async function sendChat(
  messages: ChatMessage[],
  options?: { stream?: boolean; signal?: AbortSignal }
): Promise<Response> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured on the server');
  }

  const body: DeepSeekRequest = {
    model: DEEPSEEK_MODEL,
    messages,
    tools: TOOL_DEFINITIONS,
    tool_choice: 'auto',
    thinking: { type: 'enabled' },
    reasoning_effort: 'high',
    stream: options?.stream ?? false,
  };

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `DeepSeek API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      errorMessage += ` - ${errorText.slice(0, 200)}`;
    }
    throw new Error(errorMessage);
  }

  return response;
}

export async function sendChatJson(messages: ChatMessage[], signal?: AbortSignal) {
  const response = await sendChat(messages, { stream: false, signal });
  const data = await response.json();

  const choice = data.choices?.[0];
  const message = choice?.message;

  return {
    content: message?.content || null,
    toolCalls: message?.tool_calls || [],
    finishReason: choice?.finish_reason || 'stop',
  };
}
