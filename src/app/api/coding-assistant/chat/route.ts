import { NextRequest } from 'next/server';

const API_KEY = process.env.CODING_ASSISTANT_DEEPSEEK_API_KEY;
const MODEL = process.env.CODING_ASSISTANT_DEEPSEEK_MODEL || 'deepseek-v4-pro';
const BASE_URL = 'https://api.deepseek.com';

const SYSTEM_PROMPT = `You are an expert coding assistant, specialized in helping users with programming questions. You can:

- Explain programming concepts clearly with examples
- Debug code and identify issues
- Suggest best practices and design patterns
- Write code snippets in various languages
- Compare technologies and frameworks
- Help with architecture decisions

Guidelines:
- Be concise but thorough in your explanations
- Use markdown code blocks with language identifiers for all code
- When providing code, include brief explanations of key parts
- If you're unsure about something, acknowledge it
- Adapt your responses to the user's apparent skill level
- Prefer practical, working examples over abstract theory`;

interface ChatMessage {
  role: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const userApiKey = request.headers.get('x-api-key');
    const userModel = request.headers.get('x-model');
    const userProvider = request.headers.get('x-provider') || 'mittenai';
    const userBaseUrl = request.headers.get('x-base-url');

    const body = await request.json();
    const { messages = [], model, provider, baseUrl } = body as {
      messages: ChatMessage[];
      model?: string;
      provider?: string;
      baseUrl?: string;
    };

    const activeProvider = provider || userProvider;
    const apiKeyToUse = userApiKey || (
      activeProvider === 'zai' ? process.env.NEXT_PUBLIC_ZAI_API_KEY :
      activeProvider === 'gemini' ? process.env.NEXT_PUBLIC_GEMINI_API_KEY :
      activeProvider === 'openrouter' ? process.env.NEXT_PUBLIC_OPENROUTER_API_KEY :
      activeProvider === 'custom' ? process.env.NEXT_PUBLIC_CUSTOM_API_KEY :
      process.env.CODING_ASSISTANT_DEEPSEEK_API_KEY
    );

    if (!apiKeyToUse) {
      return Response.json(
        { error: `API key is not configured for provider '${activeProvider}'. Please set it in Settings.` },
        { status: 400 }
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages array is required' }, { status: 400 });
    }

    const allMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    let targetUrl = '';
    let resolvedModel = userModel || model;
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKeyToUse}`,
    };

    if (activeProvider === 'zai') {
      targetUrl = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
      resolvedModel = resolvedModel || process.env.NEXT_PUBLIC_ZAI_MODEL || 'glm-4-plus';
    } else if (activeProvider === 'gemini') {
      targetUrl = 'https://generativelanguage.googleapis.com/v1beta/chat/completions';
      resolvedModel = resolvedModel || process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
      fetchHeaders['x-goog-api-key'] = apiKeyToUse;
    } else if (activeProvider === 'openrouter') {
      targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
      resolvedModel = resolvedModel || process.env.NEXT_PUBLIC_OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
    } else if (activeProvider === 'custom') {
      const customUrl = userBaseUrl || baseUrl || 'https://api.openai.com/v1/chat/completions';
      targetUrl = customUrl.endsWith('/chat/completions') ? customUrl : `${customUrl.replace(/\/$/, '')}/chat/completions`;
      resolvedModel = resolvedModel || 'gpt-4o';
    } else {
      targetUrl = 'https://api.deepseek.com/chat/completions';
      resolvedModel = resolvedModel || MODEL;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({
        model: resolvedModel,
        messages: allMessages,
        stream: true,
      }),
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
      return Response.json({ error: errorMessage }, { status: 502 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
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
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
                }
              } catch {
                // skip unparseable chunks
              }
            }
          }
        } catch (err) {
          console.error('Stream reading error:', err);
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
