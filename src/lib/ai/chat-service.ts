import { SYSTEM_PROMPT, TOOL_DEFINITIONS } from './tools';
import type { AIProvider, ChatMessage } from './types';

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const ZAI_KEY = process.env.ZAI_API_KEY;

function detectProvider(): { provider: AIProvider; key: string } {
  const hasDeepseek = Boolean(DEEPSEEK_KEY);
  const hasZai = Boolean(ZAI_KEY);

  if (hasDeepseek && hasZai) {
    throw new Error(
      'Both DEEPSEEK_API_KEY and ZAI_API_KEY are configured. Please set only one.'
    );
  }

  if (hasDeepseek) return { provider: 'deepseek', key: DEEPSEEK_KEY! };
  if (hasZai) return { provider: 'zai', key: ZAI_KEY! };

  throw new Error(
    'No AI API key configured. Set either DEEPSEEK_API_KEY or ZAI_API_KEY in the environment.'
  );
}

interface ProviderConfig {
  baseUrl: string;
  model: string;
  extraRequestFields: Record<string, unknown>;
}

function getProviderConfig(provider: AIProvider): ProviderConfig {
  switch (provider) {
    case 'zai':
      return {
        baseUrl: 'https://api.z.ai/api/coding/paas/v4',
        model: process.env.ZAI_MODEL || 'glm-5.1',
        extraRequestFields: {},
      };
    case 'deepseek':
    default:
      return {
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
        extraRequestFields: {
          thinking: { type: 'enabled' },
          reasoning_effort: 'high',
        },
      };
  }
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
  const { provider, key } = detectProvider();
  const config = getProviderConfig(provider);

  const body = {
    model: config.model,
    messages,
    tools: TOOL_DEFINITIONS,
    tool_choice: 'auto' as const,
    stream: options?.stream ?? false,
    ...config.extraRequestFields,
  };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `AI API error (${provider}): ${response.status}`;
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
