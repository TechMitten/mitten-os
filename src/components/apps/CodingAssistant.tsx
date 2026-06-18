'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore, isGuestUser } from '@/stores/auth-store';
import { useCodingAssistantStore, type CodingMessage } from '@/stores/coding-assistant-store';
import { Bot, Plus, Trash2, Edit3, Send, PanelLeftClose, PanelLeft, Copy, Check } from 'lucide-react';

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(<CodeBlock key={`cb-${i}`} language={language} code={codeLines.join('\n')} />);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-semibold mt-4 mb-1 text-foreground">{renderInline(line.slice(4))}</h3>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-semibold mt-4 mb-1 text-foreground">{renderInline(line.slice(3))}</h2>);
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-semibold mt-4 mb-2 text-foreground">{renderInline(line.slice(2))}</h1>);
      i++;
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside my-2 space-y-1 text-sm">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[-*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside my-2 space-y-1 text-sm">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    elements.push(
      <p key={i} className="text-sm leading-relaxed my-1">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const codeMatch = remaining.match(/`([^`]+)`/);
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    const cleanBoldMatch = boldMatch && boldMatch.index !== undefined && (codeMatch === null || boldMatch.index < codeMatch.index)
      ? boldMatch : null;
    const italicMatch = remaining.match(/\*([^*]+)\*/);
    const cleanItalicMatch = italicMatch && italicMatch.index !== undefined
      && (codeMatch === null || italicMatch.index < codeMatch.index)
      && (cleanBoldMatch === null || italicMatch.index < cleanBoldMatch.index)
      ? italicMatch : null;
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    const firstMatch = [codeMatch, cleanBoldMatch, cleanItalicMatch, linkMatch]
      .filter((m): m is RegExpMatchArray => m !== null)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];

    if (!firstMatch || firstMatch.index === undefined) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (firstMatch.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, firstMatch.index)}</span>);
    }

    if (firstMatch === codeMatch && codeMatch) {
      parts.push(
        <code key={key++} className="bg-muted dark:bg-zinc-700 px-1 py-0.5 rounded text-xs font-mono">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
    } else if (firstMatch === cleanBoldMatch && cleanBoldMatch) {
      parts.push(<strong key={key++}>{cleanBoldMatch[1]}</strong>);
      remaining = remaining.slice(cleanBoldMatch.index + cleanBoldMatch[0].length);
    } else if (firstMatch === cleanItalicMatch && cleanItalicMatch) {
      parts.push(<em key={key++}>{cleanItalicMatch[1]}</em>);
      remaining = remaining.slice(cleanItalicMatch.index + cleanItalicMatch[0].length);
    } else if (firstMatch === linkMatch && linkMatch) {
      parts.push(
        <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
           className="text-blue-500 dark:text-blue-400 underline">
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
    }
  }

  return parts;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-border dark:border-zinc-700">
      <div className="flex items-center justify-between bg-muted dark:bg-zinc-800 px-3 py-1.5">
        <span className="text-xs text-muted-foreground font-mono">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="bg-zinc-950 dark:bg-zinc-950 p-3 overflow-x-auto text-sm font-mono text-zinc-100 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MessageBubble({ message, isStreaming }: { message: CodingMessage | { role: 'assistant'; content: string }; isStreaming?: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-3 mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-muted dark:bg-zinc-800 text-foreground rounded-bl-md'
        } ${isStreaming ? 'streaming-cursor' : ''}`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm">
            <MarkdownContent content={message.content} />
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center ml-3 mt-1">
          <span className="text-white text-xs font-medium">U</span>
        </div>
      )}
    </div>
  );
}

export function CodingAssistant() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'guest-unknown';

  const sessions = useCodingAssistantStore((s) => s.sessions);
  const activeSessionId = useCodingAssistantStore((s) => s.activeSessionId);
  const messages = useCodingAssistantStore((s) => s.messages);
  const isStreaming = useCodingAssistantStore((s) => s.isStreaming);
  const streamingContent = useCodingAssistantStore((s) => s.streamingContent);
  const error = useCodingAssistantStore((s) => s.error);
  const loaded = useCodingAssistantStore((s) => s.loaded);

  const loadSessions = useCodingAssistantStore((s) => s.loadSessions);
  const createSession = useCodingAssistantStore((s) => s.createSession);
  const deleteSession = useCodingAssistantStore((s) => s.deleteSession);
  const renameSession = useCodingAssistantStore((s) => s.renameSession);
  const selectSession = useCodingAssistantStore((s) => s.selectSession);
  const sendMessage = useCodingAssistantStore((s) => s.sendMessage);

  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (userId) loadSessions(userId);
  }, [userId, loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    const sessionId = activeSessionId ?? (await createSession(userId));
    if (!sessionId) return;
    setInput('');
    await sendMessage(userId, trimmed);
  }, [input, isStreaming, activeSessionId, createSession, sendMessage, userId]);

  const handleNewChat = useCallback(async () => {
    setDeleteConfirmId(null);
    await createSession(userId);
    setInput('');
    inputRef.current?.focus();
  }, [createSession, userId]);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    setEditingSessionId(null);
    setDeleteConfirmId(null);
    await selectSession(userId, sessionId);
  }, [selectSession, userId]);

  const handleDeleteSession = useCallback(async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(sessionId);
  }, []);

  const handleConfirmDelete = useCallback(async (sessionId: string) => {
    await deleteSession(userId, sessionId);
    setDeleteConfirmId(null);
  }, [deleteSession, userId]);

  const handleStartRename = useCallback((e: React.MouseEvent, sessionId: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  }, []);

  const handleFinishRename = useCallback(async () => {
    if (editingSessionId && editingTitle.trim()) {
      await renameSession(userId, editingSessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
    setEditingTitle('');
  }, [editingSessionId, editingTitle, renameSession, userId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full bg-card dark:bg-zinc-900 select-none">
      {/* Sidebar */}
      <div
        className={`flex-shrink-0 border-r border-border dark:border-zinc-700 bg-muted/30 dark:bg-zinc-950 flex flex-col transition-all duration-200 ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="p-3 border-b border-border dark:border-zinc-700">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSelectSession(session.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                activeSessionId === session.id
                  ? 'bg-accent dark:bg-zinc-800 text-foreground'
                  : 'hover:bg-accent/50 dark:hover:bg-zinc-800/50 text-muted-foreground'
              }`}
            >
              {editingSessionId === session.id ? (
                <input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFinishRename(); }}
                  className="flex-1 bg-transparent border-b border-blue-500 outline-none text-sm px-1"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <Bot className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{session.title}</span>
                  <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={(e) => handleStartRename(e, session.id, session.title)}
                      className="p-1 rounded hover:bg-accent dark:hover:bg-zinc-700 text-muted-foreground hover:text-foreground"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {sessions.length === 0 && loaded && (
            <div className="text-center text-muted-foreground text-xs py-8">
              No chats yet
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border dark:border-zinc-700 bg-card dark:bg-zinc-900">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-accent dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
          <Bot className="w-5 h-5 text-blue-500" />
          <span className="font-medium text-sm">MittenAI</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!hasMessages && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">MittenAI</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Ask me anything about programming. I can help with debugging, explaining concepts, writing code, and more.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-md w-full">
                {[
                  'Explain how async/await works in JavaScript',
                  'Write a Python function to reverse a linked list',
                  'What is the difference between SQL and NoSQL?',
                  'Debug this React useEffect infinite loop',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="text-left px-3 py-2 rounded-lg border border-border dark:border-zinc-700 text-xs text-muted-foreground hover:bg-accent dark:hover:bg-zinc-800 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isStreaming && streamingContent && (
                <MessageBubble message={{ role: 'assistant', content: streamingContent }} isStreaming />
              )}
              {isStreaming && !streamingContent && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex gap-1.5 px-4 py-3 rounded-2xl bg-muted dark:bg-zinc-800">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {error && (
            <div className="max-w-3xl mx-auto mt-2">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border dark:border-zinc-700 p-3 bg-card dark:bg-zinc-900">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeSessionId ? 'Ask a coding question...' : 'Create a new chat to start'}
              disabled={isStreaming}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border dark:border-zinc-700 bg-muted/50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 max-h-32"
              style={{ minHeight: '40px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {!activeSessionId && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              Create a new chat to start asking questions
            </p>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-xl shadow-xl p-6 w-80 mx-4">
            <h3 className="text-sm font-medium text-foreground mb-1">Delete chat?</h3>
            <p className="text-xs text-muted-foreground mb-4">
              This will permanently delete this chat and all its messages.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-1.5 rounded-lg text-sm bg-muted dark:bg-zinc-800 hover:bg-accent dark:hover:bg-zinc-700 text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                className="px-4 py-1.5 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
