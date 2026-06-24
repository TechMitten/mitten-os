import { NextRequest } from 'next/server';

const API_KEY = process.env.CODING_ASSISTANT_DEEPSEEK_API_KEY;
const MODEL = process.env.CODING_ASSISTANT_DEEPSEEK_MODEL || 'deepseek-v4-pro';
const BASE_URL = 'https://api.deepseek.com';

async function fetchTitleFromStream(message: string, apiKey: string): Promise<string | null> {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
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
    const apiKeyToUse = userApiKey || process.env.CODING_ASSISTANT_DEEPSEEK_API_KEY;

    if (!apiKeyToUse) {
      console.warn('[title] API key not configured');
      return Response.json({ error: 'API key not configured' }, { status: 400 });
    }

    const body = await request.json();
    const { message } = body as { message: string };

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'message is required' }, { status: 400 });
    }

    const raw = await fetchTitleFromStream(message, apiKeyToUse);

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
