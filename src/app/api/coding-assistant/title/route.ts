import { NextRequest } from 'next/server';

const API_KEY = process.env.CODING_ASSISTANT_DEEPSEEK_API_KEY;
const MODEL = process.env.CODING_ASSISTANT_DEEPSEEK_MODEL || 'deepseek-v4-pro';
const BASE_URL = 'https://api.deepseek.com';

async function fetchTitleFromStream(
  message: string,
  apiKey: string,
  modelToUse: string,
  provider: string,
  customBaseUrl?: string
): Promise<string | null> {
  let targetUrl = '';
  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  if (provider === 'zai') {
    targetUrl = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
  } else if (provider === 'gemini') {
    targetUrl = 'https://generativelanguage.googleapis.com/v1beta/chat/completions';
    fetchHeaders['x-goog-api-key'] = apiKey;
  } else if (provider === 'openrouter') {
    targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
  } else if (provider === 'custom') {
    const customUrl = customBaseUrl || 'https://api.openai.com/v1/chat/completions';
    targetUrl = customUrl.endsWith('/chat/completions') ? customUrl : `${customUrl.replace(/\/$/, '')}/chat/completions`;
  } else {
    targetUrl = 'https://api.deepseek.com/chat/completions';
  }

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: fetchHeaders,
    body: JSON.stringify({
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: 'Generate a concise 2-4 word title for a coding chat that starts with the following user message. Return ONLY the title. No quotes, no punctuation at the end, no explanation. Do not start with "Title:" or any label.',
        },
        { role: 'user', content: message },
      ],
      temperature: 0.3,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[title] API error ${response.status}: ${errorText.slice(0, 200)}`);
    return null;
  }

  const reader = response.body?.getReader();
  if (!reader) return null;

  const decoder = new TextDecoder();
  let buffer = '';
  let collectedContent = '';
  let collectedReasoning = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content && typeof delta.content === 'string') {
          collectedContent += delta.content;
        }
        if (delta?.reasoning_content && typeof delta.reasoning_content === 'string') {
          collectedReasoning += delta.reasoning_content;
        }
      } catch {
        // skip unparseable chunks
      }
    }
  }

  if (collectedContent) return collectedContent;

  if (collectedReasoning) {
    const sentences = collectedReasoning
      .replace(/\n/g, ' ')
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const last = sentences[sentences.length - 1];
    if (last && last.length <= 60) return last;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const userApiKey = request.headers.get('x-api-key');
    const userModel = request.headers.get('x-model');
    const userProvider = request.headers.get('x-provider') || 'mittenai';
    const userBaseUrl = request.headers.get('x-base-url');

    const body = await request.json();
    const { message, model, provider, baseUrl } = body as {
      message: string;
      model?: string;
      provider?: string;
      baseUrl?: string;
    };

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'message is required' }, { status: 400 });
    }

    const activeProvider = provider || userProvider;
    const apiKeyToUse = userApiKey || (
      activeProvider === 'zai' ? process.env.NEXT_PUBLIC_ZAI_API_KEY :
      activeProvider === 'gemini' ? process.env.NEXT_PUBLIC_GEMINI_API_KEY :
      activeProvider === 'openrouter' ? process.env.NEXT_PUBLIC_OPENROUTER_API_KEY :
      activeProvider === 'custom' ? process.env.NEXT_PUBLIC_CUSTOM_API_KEY :
      process.env.CODING_ASSISTANT_DEEPSEEK_API_KEY
    );

    if (!apiKeyToUse) {
      console.warn('[title] API key not configured');
      return Response.json({ error: 'API key not configured' }, { status: 400 });
    }

    let resolvedModel = userModel || model;
    if (activeProvider === 'zai') {
      resolvedModel = resolvedModel || process.env.NEXT_PUBLIC_ZAI_MODEL || 'glm-4-plus';
    } else if (activeProvider === 'gemini') {
      resolvedModel = resolvedModel || process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
    } else if (activeProvider === 'openrouter') {
      resolvedModel = resolvedModel || process.env.NEXT_PUBLIC_OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
    } else if (activeProvider === 'custom') {
      resolvedModel = resolvedModel || 'gpt-4o';
    } else {
      resolvedModel = resolvedModel || MODEL;
    }

    const raw = await fetchTitleFromStream(message, apiKeyToUse, resolvedModel, activeProvider, userBaseUrl || baseUrl);

    if (!raw) {
      return Response.json({ title: 'New Chat' });
    }

    let title = raw.trim()
      .replace(/^["']|["']$/g, '')
      .replace(/[.!?,;:]+$/, '')
      .replace(/^Title:\s*/i, '')
      .replace(/\n/g, ' ')
      .trim();

    if (!title || title.toLowerCase() === 'new chat') {
      title = 'New Chat';
    }

    title = title.slice(0, 60);
    console.log(`[title] "${message.slice(0, 40)}..." → "${title}"`);

    return Response.json({ title });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[title] Exception:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
