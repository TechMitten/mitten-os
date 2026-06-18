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
    if (!API_KEY) {
      return Response.json(
        { error: 'CODING_ASSISTANT_DEEPSEEK_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { messages = [] } = body as { messages: ChatMessage[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages array is required' }, { status: 400 });
    }

    const allMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
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
