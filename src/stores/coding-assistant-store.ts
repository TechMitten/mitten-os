import { create } from 'zustand';
import { chatCompletion } from '@/lib/ai/client';

export interface CodingSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface CodingMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface CodingAssistantState {
  sessions: CodingSession[];
  activeSessionId: string | null;
  messages: CodingMessage[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  loaded: boolean;

  loadSessions: (userId: string) => Promise<void>;
  createSession: (userId: string) => Promise<string>;
  deleteSession: (userId: string, sessionId: string) => Promise<void>;
  renameSession: (userId: string, sessionId: string, title: string) => Promise<void>;
  selectSession: (userId: string, sessionId: string) => Promise<void>;
  sendMessage: (userId: string, content: string) => Promise<void>;
  clearStream: () => void;
  clearError: () => void;
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getSavedSessions(userId: string): CodingSession[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(`mittenos:chat_sessions:${userId}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse sessions:", e);
    }
  }
  return [];
}

function saveSessions(userId: string, sessions: CodingSession[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`mittenos:chat_sessions:${userId}`, JSON.stringify(sessions));
}

function getSavedMessages(userId: string, sessionId: string): CodingMessage[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(`mittenos:chat_messages:${userId}:${sessionId}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse messages:", e);
    }
  }
  return [];
}

function saveMessages(userId: string, sessionId: string, messages: CodingMessage[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`mittenos:chat_messages:${userId}:${sessionId}`, JSON.stringify(messages));
}

function deleteMessages(userId: string, sessionId: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`mittenos:chat_messages:${userId}:${sessionId}`);
}

export const useCodingAssistantStore = create<CodingAssistantState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  error: null,
  loaded: false,

  clearStream: () => set({ streamingContent: '' }),
  clearError: () => set({ error: null }),

  loadSessions: async (userId: string) => {
    const sessions = getSavedSessions(userId);
    set({ sessions, loaded: true });
  },

  createSession: async (userId: string) => {
    const id = generateId();
    const now = new Date().toISOString();
    const session: CodingSession = {
      id,
      title: 'New Chat',
      created_at: now,
      updated_at: now,
    };

    const sessions = [session, ...get().sessions];
    saveSessions(userId, sessions);
    saveMessages(userId, id, []);

    set({ sessions, activeSessionId: id, messages: [] });
    return id;
  },

  deleteSession: async (userId: string, sessionId: string) => {
    const sessions = get().sessions.filter((s) => s.id !== sessionId);
    saveSessions(userId, sessions);
    deleteMessages(userId, sessionId);

    const { activeSessionId } = get();
    const activeId = activeSessionId === sessionId
      ? (sessions[0]?.id ?? null)
      : activeSessionId;

    const messages = activeId ? getSavedMessages(userId, activeId) : [];
    set({ sessions, activeSessionId: activeId, messages });
  },

  renameSession: async (userId: string, sessionId: string, title: string) => {
    const sessions = get().sessions.map((s) =>
      s.id === sessionId ? { ...s, title, updated_at: new Date().toISOString() } : s
    );
    saveSessions(userId, sessions);
    set({ sessions });
  },

  selectSession: async (userId: string, sessionId: string) => {
    const messages = getSavedMessages(userId, sessionId);
    set({ activeSessionId: sessionId, messages });
  },

  sendMessage: async (userId: string, content: string) => {
    const { activeSessionId, messages } = get();
    if (!activeSessionId) return;

    const userMessage: CodingMessage = {
      id: Date.now(),
      session_id: activeSessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    saveMessages(userId, activeSessionId, updatedMessages);
    set({ messages: updatedMessages, isStreaming: true, streamingContent: '', error: null });

    const isFirstMessage = messages.length === 0;

    try {
      const apiMessages = updatedMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      let fullContent = '';
      await chatCompletion({
        messages: apiMessages,
        stream: true,
        onChunk: (chunk) => {
          fullContent += chunk;
          set({ streamingContent: fullContent });
        },
      });

      if (fullContent) {
        const assistantMessage: CodingMessage = {
          id: Date.now() + 1,
          session_id: activeSessionId,
          role: 'assistant',
          content: fullContent,
          created_at: new Date().toISOString(),
        };

        const finalMessages = [...get().messages, assistantMessage];
        saveMessages(userId, activeSessionId, finalMessages);

        // Update the updated_at timestamp in the session
        const sessions = get().sessions.map((s) =>
          s.id === activeSessionId ? { ...s, updated_at: new Date().toISOString() } : s
        );
        saveSessions(userId, sessions);

        set({ sessions, messages: finalMessages, isStreaming: false, streamingContent: '' });

        if (isFirstMessage) {
          let generatedTitle: string | null = null;
          try {
            const titleRes = await chatCompletion({
              messages: [
                {
                  role: 'system',
                  content: 'Generate a concise 2-4 word title for a coding chat that starts with the following user message. Return ONLY the title. No quotes, no punctuation at the end, no explanation. Do not start with "Title:" or any label.',
                },
                { role: 'user', content: content },
              ],
              temperature: 0.3,
              stream: false,
            });
            const rawTitle = titleRes.content;
            if (rawTitle) {
              generatedTitle = rawTitle.trim()
                .replace(/^["']|["']$/g, '')
                .replace(/[.!?,;:]+$/, '')
                .replace(/^Title:\s*/i, '')
                .replace(/\n/g, ' ')
                .trim();
            }
          } catch (err) {
            console.error('Title API call failed:', err);
          }
          const finalTitle = generatedTitle || 'New Chat';
          await get().renameSession(userId, activeSessionId, finalTitle);
        }
      } else {
        set({ isStreaming: false, streamingContent: '' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      set({ isStreaming: false, streamingContent: '', error: msg });
    }
  },
}));

