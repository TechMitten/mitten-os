import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

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

let guestSessions: CodingSession[] = [];
let guestMessages: Record<string, CodingMessage[]> = {};

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
    const isGuest = userId.startsWith('guest-');
    if (isGuest) {
      set({ sessions: guestSessions, loaded: true });
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('code_chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to load sessions:', error);
      set({ loaded: true });
      return;
    }

    set({ sessions: data as CodingSession[], loaded: true });
  },

  createSession: async (userId: string) => {
    const isGuest = userId.startsWith('guest-');
    const id = generateId();
    const now = new Date().toISOString();
    const session: CodingSession = {
      id,
      title: 'New Chat',
      created_at: now,
      updated_at: now,
    };

    if (isGuest) {
      guestSessions = [session, ...guestSessions];
      guestMessages[id] = [];
      set({ sessions: guestSessions, activeSessionId: id, messages: [] });
      return id;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('code_chat_sessions')
      .insert({ id, user_id: userId, title: 'New Chat' });

    if (error) {
      console.error('Failed to create session:', error);
    }

    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: id,
      messages: [],
    }));
    return id;
  },

  deleteSession: async (userId: string, sessionId: string) => {
    const isGuest = userId.startsWith('guest-');
    if (isGuest) {
      guestSessions = guestSessions.filter((s) => s.id !== sessionId);
      delete guestMessages[sessionId];
      const { activeSessionId } = get();
      if (activeSessionId === sessionId) {
        const next = guestSessions[0];
        set({
          sessions: guestSessions,
          activeSessionId: next?.id ?? null,
          messages: next ? (guestMessages[next.id] ?? []) : [],
        });
      } else {
        set({ sessions: guestSessions });
      }
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from('code_chat_sessions').delete().eq('id', sessionId);
    if (error) console.error('Failed to delete session:', error);

    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId);
      const activeSessionId = state.activeSessionId === sessionId
        ? (sessions[0]?.id ?? null)
        : state.activeSessionId;
      return { sessions, activeSessionId, messages: activeSessionId ? state.messages : [] };
    });
  },

  renameSession: async (userId: string, sessionId: string, title: string) => {
    const isGuest = userId.startsWith('guest-');
    if (isGuest) {
      guestSessions = guestSessions.map((s) =>
        s.id === sessionId ? { ...s, title, updated_at: new Date().toISOString() } : s
      );
      set({ sessions: guestSessions });
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('code_chat_sessions')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (updateError) console.error('Failed to rename session:', updateError);

    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title, updated_at: new Date().toISOString() } : s
      ),
    }));
  },

  selectSession: async (userId: string, sessionId: string) => {
    const isGuest = userId.startsWith('guest-');
    if (isGuest) {
      const messages = guestMessages[sessionId] ?? [];
      set({ activeSessionId: sessionId, messages });
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('code_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load messages:', error);
      set({ activeSessionId: sessionId, messages: [] });
      return;
    }

    set({ activeSessionId: sessionId, messages: (data as CodingMessage[]) ?? [] });
  },

  sendMessage: async (userId: string, content: string) => {
    const { activeSessionId, messages } = get();
    if (!activeSessionId) return;

    const isGuest = userId.startsWith('guest-');
    const userMessage: CodingMessage = {
      id: Date.now(),
      session_id: activeSessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    set({ messages: updatedMessages, isStreaming: true, streamingContent: '', error: null });

    if (!isGuest) {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from('code_chat_messages')
        .insert({ session_id: activeSessionId, role: 'user', content });
      if (insertError) console.error('Failed to save user message:', insertError);
    } else {
      if (!guestMessages[activeSessionId]) guestMessages[activeSessionId] = [];
      guestMessages[activeSessionId].push(userMessage);
    }

    const isFirstMessage = messages.length === 0;

    try {
      const apiMessages = updatedMessages.map((m) => ({ role: m.role, content: m.content }));
      const codingKey = typeof window !== 'undefined' ? localStorage.getItem('mittenOS_coding_assistant_key') || '' : '';
      const response = await fetch('/api/coding-assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': codingKey,
        },
        body: JSON.stringify({ messages: apiMessages }),
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
        set({ messages: finalMessages, isStreaming: false, streamingContent: '' });

        if (!isGuest) {
          const supabase = createClient();
          const { error: insertError } = await supabase
            .from('code_chat_messages')
            .insert({ session_id: activeSessionId, role: 'assistant', content: fullContent });
          if (insertError) console.error('Failed to save assistant message:', insertError);

          const { error: touchError } = await supabase
            .from('code_chat_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', activeSessionId);
          if (touchError) console.error('Failed to touch session:', touchError);
        } else {
          guestMessages[activeSessionId].push(assistantMessage);
        }

        if (isFirstMessage) {
          let generatedTitle: string | null = null;
          try {
            const codingKey = typeof window !== 'undefined' ? localStorage.getItem('mittenOS_coding_assistant_key') || '' : '';
            const titleRes = await fetch('/api/coding-assistant/title', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': codingKey,
              },
              body: JSON.stringify({ message: content }),
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
