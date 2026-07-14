import { create } from 'zustand';

const getActiveProviderDetails = () => {
  if (typeof window === 'undefined') return { provider: 'mittenai', apiKey: '', model: '', baseUrl: '' };
  const provider = localStorage.getItem('orion-api-provider') || 'mittenai';
  let apiKey = '';
  let model = '';
  let baseUrl = '';

  if (provider === 'zai') {
    apiKey = localStorage.getItem('mittenOS_zai_api_key') || '';
    model = localStorage.getItem('mittenOS_zai_model') || '';
  } else if (provider === 'gemini') {
    apiKey = localStorage.getItem('mittenOS_gemini_api_key') || '';
    model = localStorage.getItem('mittenOS_gemini_model') || '';
  } else if (provider === 'openrouter') {
    apiKey = localStorage.getItem('mittenOS_openrouter_api_key') || '';
    model = localStorage.getItem('mittenOS_openrouter_model') || '';
  } else if (provider === 'custom') {
    apiKey = localStorage.getItem('mittenOS_custom_api_key') || '';
    model = localStorage.getItem('mittenOS_custom_model') || '';
    baseUrl = localStorage.getItem('mittenOS_custom_base_url') || '';
  } else {
    // mittenai / deepseek
    apiKey = localStorage.getItem('mittenOS_coding_assistant_key') || '';
    model = localStorage.getItem('mittenOS_coding_assistant_model') || '';
  }
  return { provider, apiKey, model, baseUrl };
};

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
      const apiMessages = updatedMessages.map((m) => ({ role: m.role, content: m.content }));
      const { provider, apiKey, model, baseUrl } = getActiveProviderDetails();
      const response = await fetch('/api/coding-assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-model': model,
          'x-provider': provider,
          'x-base-url': baseUrl,
        },
        body: JSON.stringify({ messages: apiMessages, model, provider, baseUrl }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

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
            if (parsed.content) {
              fullContent += parsed.content;
              set({ streamingContent: fullContent });
            }
          } catch {
            // skip unparseable
          }
        }
      }

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
            const { provider, apiKey, model, baseUrl } = getActiveProviderDetails();
            const titleRes = await fetch('/api/coding-assistant/title', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'x-model': model,
                'x-provider': provider,
                'x-base-url': baseUrl,
              },
              body: JSON.stringify({ message: content, model, provider, baseUrl }),
            });
            if (titleRes.ok) {
              const json = await titleRes.json();
              if (json.title && json.title !== 'New Chat') {
                generatedTitle = json.title;
              }
            } else {
              console.error('Title API returned status:', titleRes.status);
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

