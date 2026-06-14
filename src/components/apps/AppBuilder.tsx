'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Trash2,
  Save,
  Upload,
  Play,
  PanelLeftClose,
  PanelLeftOpen,
  Terminal as TerminalIcon,
  FolderPlus,
  FilePlus,
  Pencil,
  Loader2,
  XCircle,
  Send,
  Sparkles,
  StopCircle,
  Check,
  X,
} from 'lucide-react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { SandboxedApp } from '@/components/apps/SandboxedApp';
import { useDesktopStore } from '@/stores/desktop-store';
import { createClient } from '@/lib/supabase/client';
import type { ChatMessage, ToolCall, ToolResult } from '@/lib/ai/types';

interface ProjectMeta {
  id: string | null;
  name: string;
  description: string;
  icon: string;
  category: string;
}

interface ConsoleEntry {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
}

const DEFAULT_SOURCE_FILES: Record<string, string> = {
  'src/index.tsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
`,
  'src/App.tsx': `import React, { useState } from 'react';
import { mittenOS } from './mitten';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#1a1a2e',
      color: '#e0e0e0',
      fontFamily: 'system-ui, sans-serif',
      padding: '20px',
      boxSizing: 'border-box',
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>
        Hello from React + TypeScript!
      </h1>
      <p style={{ color: '#888', marginBottom: '30px' }}>
        Build your app with the full power of React
      </p>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: '12px 28px',
          fontSize: '18px',
          background: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 600,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#4f46e5')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#6366f1')}
      >
        Clicked {count} {count === 1 ? 'time' : 'times'}
      </button>
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>Import any package from esm.sh — like lodash, chart.js, or zustand!</p>
      </div>
    </div>
  );
}
`,
  'src/mitten.ts': `const OS = (window as any).mittenOS;

export const mittenOS = OS || {
  window: {
    setTitle: (t: string) => document.title = t,
    close: () => {},
    minimize: () => {},
  },
  fs: {
    readFile: async (path: string) => null,
    writeFile: async (path: string, content: string) => {},
    listDir: async (path: string) => [] as string[],
  },
  notifications: {
    show: (t: string, m: string) => {},
  },
  apps: {
    open: (id: string) => {},
  },
};
`,
  'package.json': JSON.stringify({
    name: 'my-react-app',
    version: '1.0.0',
    description: 'A React app built with MittenOS',
    author: '',
  }, null, 2),
};

function getFileIcon(filename: string): React.ReactNode {
  if (filename.endsWith('.tsx') || filename.endsWith('.jsx')) {
    return <FileText className="w-3.5 h-3.5 text-blue-400" />;
  }
  if (filename.endsWith('.ts') || filename.endsWith('.js')) {
    return <FileText className="w-3.5 h-3.5 text-yellow-400" />;
  }
  if (filename.endsWith('.css')) {
    return <FileText className="w-3.5 h-3.5 text-purple-400" />;
  }
  if (filename.endsWith('.json')) {
    return <FileText className="w-3.5 h-3.5 text-green-400" />;
  }
  return <FileText className="w-3.5 h-3.5 text-gray-400" />;
}

export function AppBuilder() {
  const [projectMeta, setProjectMeta] = useState<ProjectMeta>({
    id: null,
    name: 'Untitled App',
    description: '',
    icon: '📦',
    category: 'utilities',
  });
  const [sourceFiles, setSourceFiles] = useState<Record<string, string>>({ ...DEFAULT_SOURCE_FILES });
  const [openFiles, setOpenFiles] = useState<string[]>(['src/App.tsx']);
  const [activeFile, setActiveFile] = useState('src/App.tsx');
  const [showFiles, setShowFiles] = useState(true);
  const [rightPanel, setRightPanel] = useState<'chat' | 'preview'>('chat');
  const [showConsole, setShowConsole] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [editingFilename, setEditingFilename] = useState<string | null>(null);
  const [newFilenameValue, setNewFilenameValue] = useState('');
  const [compileError, setCompileError] = useState<string | null>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const addNotification = useDesktopStore((s) => s.addNotification);
  const theme = useDesktopStore((s) => s.theme);
  const sourceFilesRef = useRef(sourceFiles);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<{ toolCall: ToolCall; result?: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const approvalResolveRef = useRef<((approved: ToolCall[]) => void) | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    sourceFilesRef.current = sourceFiles;
  }, [sourceFiles]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, streamingText, pendingApprovals]);

  const fileTree = useMemo(() => {
    const tree: Record<string, { files: string[]; dirs: string[] }> = {};
    for (const path of Object.keys(sourceFiles).sort()) {
      const parts = path.split('/');
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
      const filename = parts[parts.length - 1];
      if (!tree[dir]) tree[dir] = { files: [], dirs: [] };

      const isDir = sourceFiles[path] === '__DIR__';
      if (isDir) {
        tree[dir].dirs.push(filename);
      } else {
        tree[dir].files.push(filename);
      }
    }
    return tree;
  }, [sourceFiles]);

  const addLog = useCallback((type: ConsoleEntry['type'], message: string) => {
    setConsoleEntries((prev) => [...prev, { type, message, timestamp: Date.now() }].slice(-50));
  }, []);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setCompileError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const payload = {
        user_id: userId,
        name: projectMeta.name,
        description: projectMeta.description,
        icon: projectMeta.icon,
        category: projectMeta.category,
        html_content: '',
        source_files: sourceFiles,
        app_type: 'react',
        status: 'draft',
        default_window_size: { width: 700, height: 500 },
        min_window_size: { width: 400, height: 300 },
        singleton: false,
      };

      if (projectMeta.id) {
        const { error } = await supabase
          .from('user_apps')
          .update(payload)
          .eq('id', projectMeta.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('user_apps')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setProjectMeta((prev) => ({ ...prev, id: data.id }));
      }

      addLog('info', 'Project saved successfully.');
      addNotification({ title: 'App Builder', message: 'Project saved.', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      addLog('error', `Save failed: ${msg}`);
      addNotification({ title: 'App Builder', message: `Save failed: ${msg}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [projectMeta, sourceFiles, addNotification, addLog]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setCompileError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const compiledHtml = '';
      const payload = {
        user_id: userId,
        name: projectMeta.name,
        description: projectMeta.description,
        icon: projectMeta.icon,
        category: projectMeta.category,
        html_content: compiledHtml,
        source_files: sourceFiles,
        compiled_html: '',
        app_type: 'react',
        status: 'pending',
        default_window_size: { width: 700, height: 500 },
        min_window_size: { width: 400, height: 300 },
        singleton: false,
      };

      if (projectMeta.id) {
        const { error } = await supabase
          .from('user_apps')
          .update(payload)
          .eq('id', projectMeta.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('user_apps')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setProjectMeta((prev) => ({ ...prev, id: data.id }));
      }

      addLog('info', 'App submitted for review!');
      addNotification({ title: 'App Builder', message: 'App submitted for review.', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publish failed';
      addLog('error', `Publish failed: ${msg}`);
      addNotification({ title: 'App Builder', message: `Publish failed: ${msg}`, type: 'error' });
    } finally {
      setPublishing(false);
    }
  }, [projectMeta, sourceFiles, addNotification, addLog]);

  const handleNewFile = useCallback(() => {
    let basePath = activeFile.includes('/')
      ? activeFile.split('/').slice(0, -1).join('/') + '/'
      : '';
    let name = 'untitled.tsx';
    let counter = 1;
    while (sourceFiles[basePath + name]) {
      name = `untitled-${counter}.tsx`;
      counter++;
    }
    const fullPath = basePath + name;
    setSourceFiles((prev) => ({ ...prev, [fullPath]: '' }));
    setActiveFile(fullPath);
    setOpenFiles((prev) => [...prev, fullPath]);
  }, [activeFile, sourceFiles]);

  const handleNewFolder = useCallback(() => {
    let basePath = activeFile.includes('/')
      ? activeFile.split('/').slice(0, -1).join('/') + '/'
      : '';
    let name = 'new-folder';
    let counter = 1;
    while (sourceFiles[basePath + name] !== undefined) {
      name = `new-folder-${counter}`;
      counter++;
    }
    setSourceFiles((prev) => {
      const next = { ...prev };
      next[basePath + name] = '__DIR__';
      return next;
    });
  }, [activeFile, sourceFiles]);

  const handleDeleteFile = useCallback(
    (path: string) => {
      setSourceFiles((prev) => {
        const next = { ...prev };
        delete next[path];
        for (const key of Object.keys(next).filter((k) => k.startsWith(path + '/'))) {
          delete next[key];
        }
        return next;
      });
      setOpenFiles((prev) => prev.filter((f) => f !== path));
      if (activeFile === path) {
        setActiveFile(Object.keys(sourceFiles).filter((f) => f !== path && sourceFiles[f] !== '__DIR__')[0] || '');
      }
    },
    [activeFile, sourceFiles]
  );

  const handleRenameFile = useCallback(
    (oldPath: string, newName: string) => {
      if (!newName.trim()) return;
      const parts = oldPath.split('/');
      parts[parts.length - 1] = newName;
      const newPath = parts.join('/');
      if (oldPath === newPath) return;
      setSourceFiles((prev) => {
        const next: Record<string, string> = {};
        for (const [key, value] of Object.entries(prev)) {
          if (key === oldPath) {
            next[newPath] = value;
          } else if (key.startsWith(oldPath + '/')) {
            next[newPath + key.slice(oldPath.length)] = value;
          } else {
            next[key] = value;
          }
        }
        return next;
      });
      setOpenFiles((prev) => prev.map((f) => (f === oldPath ? newPath : f)));
      if (activeFile === oldPath) setActiveFile(newPath);
      setEditingFilename(null);
    },
    [activeFile]
  );

  const handleRefreshPreview = useCallback(() => {
    setPreviewKey((k) => k + 1);
    setCompileError(null);
  }, []);

  const executeTool = useCallback(async (toolCall: ToolCall): Promise<ToolResult> => {
    const args = JSON.parse(toolCall.function.arguments || '{}');
    let content = '';

    switch (toolCall.function.name) {
      case 'list_files': {
        content = Object.keys(sourceFilesRef.current)
          .sort()
          .map((p) => `${sourceFilesRef.current[p] === '__DIR__' ? '📁' : '📄'} ${p}`)
          .join('\n');
        break;
      }
      case 'read_file': {
        const fileContent = sourceFilesRef.current[args.path];
        content = fileContent !== undefined ? fileContent : `Error: file not found: ${args.path}`;
        break;
      }
      case 'write_file': {
        setSourceFiles((prev) => ({ ...prev, [args.path]: args.content }));
        setOpenFiles((prev) => {
          if (!prev.includes(args.path)) return [...prev, args.path];
          return prev;
        });
        setActiveFile(args.path);
        content = `File written: ${args.path}`;
        addLog('info', `AI wrote ${args.path}`);
        break;
      }
      case 'edit_file': {
        const currentContent = sourceFilesRef.current[args.path];
        if (currentContent === undefined) {
          content = `Error: file not found: ${args.path}`;
          break;
        }
        if (!currentContent.includes(args.old_string)) {
          content = `Error: old_string not found in ${args.path}. The file content may have changed.`;
          break;
        }
        const occurrences = currentContent.split(args.old_string).length - 1;
        if (occurrences > 1) {
          content = `Error: old_string found ${occurrences} times in ${args.path}. Please provide more surrounding context to make the match unique.`;
          break;
        }
        const newContent = currentContent.replace(args.old_string, args.new_string);
        setSourceFiles((prev) => ({ ...prev, [args.path]: newContent }));
        content = `File edited: ${args.path}`;
        addLog('info', `AI edited ${args.path}`);
        break;
      }
      case 'delete_file': {
        setSourceFiles((prev) => {
          const next = { ...prev };
          delete next[args.path];
          for (const key of Object.keys(next).filter((k) => k.startsWith(args.path + '/'))) {
            delete next[key];
          }
          return next;
        });
        setOpenFiles((prev) => prev.filter((f) => f !== args.path));
        content = `File deleted: ${args.path}`;
        addLog('info', `AI deleted ${args.path}`);
        break;
      }
      case 'create_directory': {
        setSourceFiles((prev) => ({ ...prev, [args.path]: '__DIR__' }));
        content = `Directory created: ${args.path}`;
        addLog('info', `AI created directory ${args.path}`);
        break;
      }
      case 'search_files': {
        const pattern = (args.pattern || '').toLowerCase();
        const results: string[] = [];
        for (const [path, fileContent] of Object.entries(sourceFilesRef.current)) {
          if (fileContent === '__DIR__') continue;
          const lowerContent = fileContent.toLowerCase();
          if (lowerContent.includes(pattern)) {
            const lines = fileContent.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(pattern)) {
                results.push(`${path}:${i + 1}: ${lines[i].trim().slice(0, 120)}`);
              }
            }
          }
        }
        content = results.length > 0 ? results.join('\n') : `No matches found for "${args.pattern}"`;
        break;
      }
      case 'run_preview': {
        setPreviewKey((k) => k + 1);
        content = `Preview triggered: ${args.message || 'Changes applied'}`;
        break;
      }
      default:
        content = `Unknown tool: ${toolCall.function.name}`;
    }

    return {
      tool_call_id: toolCall.id,
      content,
    };
  }, [addLog]);

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (approvalResolveRef.current) {
      approvalResolveRef.current([]);
      approvalResolveRef.current = null;
    }
    setIsGenerating(false);
    setPendingApprovals([]);
    setStreamingText('');
  }, []);

  const runAgentLoop = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: userMessage };
    const allMessages = [...chatMessages, userMsg];
    setChatMessages(allMessages);
    setChatInput('');
    setIsGenerating(true);
    setStreamingText('');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const currentMessages = [...allMessages];
    const MAX_ITERATIONS = 15;
    let iterations = 0;

    try {
      while (iterations < MAX_ITERATIONS) {
        if (abortController.signal.aborted) break;
        iterations++;

        const fileManifest = Object.keys(sourceFilesRef.current).sort();

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: currentMessages,
            fileManifest,
            stream: false,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errData.error || `API error: ${response.status}`);
        }

        const result = await response.json();

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: result.content || null,
          tool_calls: result.toolCalls?.length ? result.toolCalls : undefined,
        };
        currentMessages.push(assistantMsg);

        if (!result.toolCalls || result.toolCalls.length === 0) {
          setChatMessages([...currentMessages]);
          break;
        }

        setChatMessages([...currentMessages]);

        let approvedTools = result.toolCalls;
        if (!autoApprove) {
          setPendingApprovals(result.toolCalls.map((tc: ToolCall) => ({ toolCall: tc })));

          const approvalPromise = new Promise<ToolCall[]>((resolve) => {
            approvalResolveRef.current = resolve;
          });

          approvedTools = await approvalPromise;
          approvalResolveRef.current = null;
          setPendingApprovals([]);

          if (abortController.signal.aborted) break;
          if (approvedTools.length === 0) {
            currentMessages.push({
              role: 'assistant',
              content: 'User rejected the proposed changes.',
            } as ChatMessage);
            setChatMessages([...currentMessages]);
            break;
          }
        }

        for (const toolCall of approvedTools) {
          const result = await executeTool(toolCall);
          currentMessages.push({
            role: 'tool',
            tool_call_id: result.tool_call_id,
            content: result.content,
          });
        }

        if (result.finishReason === 'stop' && !result.toolCalls?.length) break;

        setChatMessages([...currentMessages]);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Generation stopped.' } as ChatMessage]);
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setChatMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` } as ChatMessage]);
        addLog('error', `AI error: ${msg}`);
      }
    } finally {
      setIsGenerating(false);
      setPendingApprovals([]);
      setStreamingText('');
      abortControllerRef.current = null;
    }
  }, [chatMessages, autoApprove, executeTool, addLog]);

  const handleApproveAll = useCallback(() => {
    if (approvalResolveRef.current) {
      approvalResolveRef.current(pendingApprovals.map((p) => p.toolCall));
    }
  }, [pendingApprovals]);

  const handleRejectAll = useCallback(() => {
    if (approvalResolveRef.current) {
      approvalResolveRef.current([]);
    }
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim() || isGenerating) return;
    runAgentLoop(chatInput.trim());
  }, [chatInput, isGenerating, runAgentLoop]);

  const renderFileTreeDir = (dirPath: string, depth: number = 0) => {
    const info = fileTree[dirPath];
    if (!info) return null;

    const isCollapsed = collapsedDirs.has(dirPath);
    const dirLabel = dirPath === '.' ? '' : dirPath.split('/').pop() || '';

    return (
      <div key={dirPath}>
        {dirPath !== '.' && (
          <div
            className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-accent text-foreground/70 text-xs"
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            onClick={() =>
              setCollapsedDirs((prev) => {
                const next = new Set(prev);
                if (next.has(dirPath)) next.delete(dirPath);
                else next.add(dirPath);
                return next;
              })
            }
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3 shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 shrink-0" />
            )}
            <Folder className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            <span className="truncate">{dirLabel}</span>
          </div>
        )}
        {(!isCollapsed || dirPath === '.') && (
          <>
            {info.dirs.map((subdir) => {
              const subPath = dirPath === '.' ? subdir : `${dirPath}/${subdir}`;
              return renderFileTreeDir(subPath, depth + 1);
            })}
            {info.files.map((filename) => {
              const fullPath = dirPath === '.' ? filename : `${dirPath}/${filename}`;
              if (sourceFiles[fullPath] === '__DIR__') return null;
              return (
                <div
                  key={fullPath}
                  className={`flex items-center gap-1 px-2 py-0.5 cursor-pointer text-xs group ${
                    activeFile === fullPath
                      ? 'bg-accent/70 text-foreground'
                      : 'text-foreground/60 hover:bg-accent hover:text-foreground/80'
                  }`}
                  style={{ paddingLeft: `${8 + depth * 12 + 12}px` }}
                  onClick={() => {
                    setActiveFile(fullPath);
                    if (!openFiles.includes(fullPath)) {
                      setOpenFiles((prev) => [...prev, fullPath]);
                    }
                  }}
                  onDoubleClick={() => {
                    setEditingFilename(fullPath);
                    setNewFilenameValue(fullPath.split('/').pop() || '');
                  }}
                >
                  {getFileIcon(filename)}
                  {editingFilename === fullPath ? (
                    <input
                      className="bg-accent/70 text-foreground text-xs px-1 py-0 outline-none border border-input rounded flex-1 min-w-0"
                      value={newFilenameValue}
                      onChange={(e) => setNewFilenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameFile(fullPath, newFilenameValue);
                        } else if (e.key === 'Escape') {
                          setEditingFilename(null);
                        }
                      }}
                      onBlur={() => {
                        handleRenameFile(fullPath, newFilenameValue);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate">{filename}</span>
                  )}
                  <button
                    className="ml-auto opacity-0 group-hover:opacity-100 hover:text-red-400 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(fullPath);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card text-foreground select-none">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-background border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Pencil className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <input
            className="bg-transparent outline-none border-b border-transparent hover:border-input focus:border-purple-600 dark:focus:border-purple-400 px-1 text-sm w-40"
            value={projectMeta.name}
            onChange={(e) => setProjectMeta((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={handleRefreshPreview}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            rightPanel === 'preview'
              ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
              : 'bg-accent/50 hover:bg-accent/60 text-foreground/60 hover:text-foreground'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          Preview
        </button>
        <button
          onClick={() => setRightPanel(rightPanel === 'chat' ? 'preview' : 'chat')}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            rightPanel === 'chat'
              ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
              : 'bg-accent/50 hover:bg-accent/60 text-foreground/60 hover:text-foreground'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Chat
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-700 dark:text-purple-300 rounded transition-colors disabled:opacity-50"
        >
          {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Publish
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {showFiles && (
          <div className="w-52 border-r border-border flex flex-col shrink-0">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNewFile}
                  className="p-0.5 hover:bg-accent/60 rounded text-muted-foreground hover:text-foreground"
                  title="New File"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNewFolder}
                  className="p-0.5 hover:bg-accent/60 rounded text-muted-foreground hover:text-foreground"
                  title="New Folder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {renderFileTreeDir('.')}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center bg-background border-b border-border shrink-0">
            <button
              onClick={() => setShowFiles(!showFiles)}
              className="p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground"
              title={showFiles ? 'Hide file tree' : 'Show file tree'}
            >
              {showFiles ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <div className="flex items-center flex-1 overflow-x-auto">
              {openFiles.map((file) => {
                const filename = file.split('/').pop() || file;
                return (
                  <div
                    key={file}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-border shrink-0 ${
                      activeFile === file
                        ? 'bg-card text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                    onClick={() => setActiveFile(file)}
                  >
                    {getFileIcon(filename)}
                    <span>{filename}</span>
                    <button
                      className="ml-1 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFiles((prev) => prev.filter((f) => f !== file));
                        if (activeFile === file) {
                          const remaining = openFiles.filter((f) => f !== file);
                          setActiveFile(remaining[0] || '');
                        }
                      }}
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {activeFile && sourceFiles[activeFile] !== '__DIR__' ? (
              <Editor
                height="100%"
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                language={
                  activeFile.endsWith('.tsx') || activeFile.endsWith('.jsx')
                    ? 'typescriptreact'
                    : activeFile.endsWith('.ts')
                      ? 'typescript'
                      : activeFile.endsWith('.css')
                        ? 'css'
                        : activeFile.endsWith('.json')
                          ? 'json'
                          : 'javascript'
                }
                value={sourceFiles[activeFile] || ''}
                onChange={(value) => {
                  setSourceFiles((prev) => ({ ...prev, [activeFile]: value || '' }));
                }}
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  tabSize: 2,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 8 },
                }}
                loading={
                  <div className="flex items-center justify-center h-full text-muted-foreground/70">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                }
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
                Select a file to edit
              </div>
            )}
          </div>

          {showConsole && (
            <div className="h-32 border-t border-border flex flex-col shrink-0">
              <div className="flex items-center justify-between px-3 py-1 bg-background border-b border-border">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <TerminalIcon className="w-3.5 h-3.5" />
                  Console
                </span>
                {compileError && (
                  <span className="text-xs text-red-400 truncate max-w-lg">{compileError}</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2 text-xs font-mono space-y-0.5">
                {consoleEntries.map((entry, i) => (
                  <div
                    key={i}
                    className={
                      entry.type === 'error'
                        ? 'text-red-400'
                        : entry.type === 'warn'
                          ? 'text-yellow-400'
                          : entry.type === 'info'
                            ? 'text-blue-400'
                            : 'text-foreground/60'
                    }
                  >
                    {entry.message}
                  </div>
                ))}
                {consoleEntries.length === 0 && (
                  <div className="text-muted-foreground/70">No output</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-[400px] border-l border-border flex flex-col shrink-0">
          {rightPanel === 'preview' ? (
            <>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-background">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleRefreshPreview}
                    className="p-0.5 hover:bg-accent/60 rounded text-muted-foreground hover:text-foreground"
                    title="Refresh preview"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRightPanel('chat')}
                    className="p-0.5 hover:bg-accent/60 rounded text-muted-foreground hover:text-foreground"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <SandboxedApp key={previewKey} sourceFiles={sourceFiles} windowId="app-builder-preview" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-background">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-foreground/70">AI Chat</span>
                  {isGenerating && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAutoApprove(!autoApprove)}
                    className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors ${
                      autoApprove
                        ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                        : 'bg-accent/50 text-foreground/40 hover:text-foreground/80'
                    }`}
                    title="When enabled, AI changes are applied automatically"
                  >
                    Auto-approve
                  </button>
                  {isGenerating && (
                    <button
                      onClick={handleStopGeneration}
                      className="p-0.5 hover:bg-accent/60 rounded text-red-400"
                      title="Stop generation"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setRightPanel('preview')}
                    className="p-0.5 hover:bg-accent/60 rounded text-muted-foreground hover:text-foreground"
                    title="Switch to preview"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground/70 text-xs gap-3 px-4">
                    <Sparkles className="w-8 h-8 text-purple-600/40 dark:text-purple-400/40" />
                    <div className="text-center space-y-1">
                      <p className="text-foreground/40 font-medium">What would you like to build?</p>
                      <p className="text-muted-foreground/50 leading-relaxed">
                        I can create React + TypeScript apps with surgical edits, file management, and package imports from esm.sh.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {[
                        'Build a dark-themed todo app with local storage',
                        'Create a markdown editor with live preview',
                        'Build a weather dashboard using a free API',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            if (!isGenerating) {
                              setChatInput(suggestion);
                            }
                          }}
                          disabled={isGenerating}
                          className="text-[10px] px-2 py-1 rounded-full bg-accent/50 hover:bg-accent/60 text-foreground/40 hover:text-foreground/70 transition-colors text-left disabled:opacity-30"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, i) => {
                  if (msg.role === 'tool') return null;
                  const isUser = msg.role === 'user';
                  const isAssistant = msg.role === 'assistant';
                  const hasToolCalls = isAssistant && msg.tool_calls && msg.tool_calls.length > 0;

                  return (
                    <div key={i} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                          isUser
                            ? 'bg-purple-500/30 text-purple-700 dark:text-purple-300'
                            : 'bg-accent/70 text-muted-foreground'
                        }`}
                      >
                        {isUser ? 'U' : 'AI'}
                      </div>
                      <div className={`flex-1 min-w-0 ${isUser ? 'flex justify-end' : ''}`}>
                        <div
                          className={`inline-block max-w-full rounded-lg px-3 py-2 text-xs ${
                            isUser
                              ? 'bg-purple-500/15 text-purple-200'
                              : 'bg-accent/40 text-foreground/75'
                          }`}
                        >
                          {msg.content && (
                            <div className="whitespace-pre-wrap break-words leading-relaxed">
                              {msg.content}
                            </div>
                          )}
                          {hasToolCalls && (
                            <div className={msg.content ? 'mt-2 pt-2 border-t border-border' : ''}>
                              {msg.tool_calls!.map((tc, j) => (
                                <div key={j} className="flex items-center gap-1.5 py-0.5 text-[10px]">
                                  <span className="text-green-600/80 dark:text-green-400/80">⚡</span>
                                  <code className="text-purple-700/80 dark:text-purple-300/80">{tc.function.name}</code>
                                  <span className="text-muted-foreground/70 truncate">
                                    {(() => {
                                      try {
                                        const a = JSON.parse(tc.function.arguments);
                                        return a.path || a.pattern || a.message || '';
                                      } catch {
                                        return '';
                                      }
                                    })()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {pendingApprovals.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                        Pending Changes ({pendingApprovals.length})
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleApproveAll}
                          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Approve All
                        </button>
                        <button
                          onClick={handleRejectAll}
                          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Reject All
                        </button>
                      </div>
                    </div>
                    {pendingApprovals.map((p, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-[10px] text-foreground/60">
                        <span className="text-amber-700/80 dark:text-amber-400/80">⚡</span>
                        <code className="text-amber-700/80 dark:text-amber-300/80">{p.toolCall.function.name}</code>
                        <span className="text-foreground/40 truncate">
                          {(() => {
                            try {
                              const a = JSON.parse(p.toolCall.function.arguments);
                              return a.path || '';
                            } catch {
                              return '';
                            }
                          })()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {streamingText && (
                  <div className="flex gap-2">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-accent/70 flex items-center justify-center text-[10px] text-muted-foreground">AI</div>
                    <div className="flex-1 min-w-0">
                      <div className="inline-block max-w-full rounded-lg px-3 py-2 text-xs bg-accent/40 text-foreground/75">
                        <div className="whitespace-pre-wrap break-words leading-relaxed">{streamingText}</div>
                        <span className="inline-block w-1.5 h-3.5 bg-purple-400 animate-pulse ml-0.5 align-text-bottom" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border p-3 bg-background">
                <div className="flex items-start gap-2">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Describe the app you want to build..."
                    rows={2}
                    disabled={isGenerating}
                    className="flex-1 bg-accent/50 text-foreground text-xs rounded-lg px-3 py-2 outline-none border border-input focus:border-purple-600/50 dark:focus:border-purple-500/50 resize-none placeholder:text-muted-foreground/50 disabled:opacity-40"
                  />
                  {isGenerating ? (
                    <button
                      onClick={handleStopGeneration}
                      className="p-2 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 transition-colors shrink-0"
                      title="Stop"
                    >
                      <StopCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim()}
                      className="p-2 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30 transition-colors shrink-0 disabled:opacity-30"
                      title="Send"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1 bg-background border-t border-border shrink-0">
        <button
          onClick={() => setShowConsole(!showConsole)}
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
            showConsole ? 'bg-accent/70 text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TerminalIcon className="w-3.5 h-3.5" />
          Console
        </button>
        <span className="text-muted-foreground/50 text-xs">
          React + TypeScript | esm.sh imports supported
        </span>
      </div>
    </div>
  );
}

export default AppBuilder;
