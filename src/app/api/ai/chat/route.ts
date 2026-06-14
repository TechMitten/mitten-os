import { NextRequest } from 'next/server';
import { sendChat, sendChatJson, buildSystemMessages } from '@/lib/ai/chat-service';
import type { ChatMessage } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages = [], fileManifest, stream = true } = body as {
      messages: ChatMessage[];
      fileManifest?: string[];
      stream?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages array is required' }, { status: 400 });
    }

    const systemMessages = buildSystemMessages(fileManifest);
    const allMessages = [...systemMessages, ...messages];

    if (stream) {
      const response = await sendChat(allMessages, { stream: true });

      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    const result = await sendChatJson(allMessages);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
