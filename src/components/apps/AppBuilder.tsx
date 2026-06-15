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

function getFileIcon(filename: string): React.ReactNode {
  if (filename.endsWith('.tsx') || filename.endsWith('.jsx')) {
    return <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />;
  }
  if (filename.endsWith('.ts') || filename.endsWith('.js')) {
    return <FileText className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;
  }
  if (filename.endsWith('.css')) {
    return <FileText className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />;
  }
  if (filename.endsWith('.json')) {
    return <FileText className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />;
  }
  return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
}

export function AppBuilder() {
  const [projectMeta, setProjectMeta] = useState<ProjectMeta>({
    id: null,
    name: 'Untitled App',
    description: '',
    icon: '📦',
    category: 'utilities',
  });
  const [sourceFiles, setSourceFiles] = useState<Record<string, string>>({});
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState('');
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
  const [creatingNode, setCreatingNode] = useState<{ type: 'file' | 'folder'; parentPath: string } | null>(null);
  const [creatingName, setCreatingName] = useState('');
  const [compileError, setCompileError] = useState<string | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [fileTreeWidth, setFileTreeWidth] = useState(208);
  const [isResizingFileTree, setIsResizingFileTree] = useState(false);
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
  const creatingInputRef = useRef<HTMLInputElement | null>(null);
  const creatingInputFocusedRef = useRef(false);

  useEffect(() => {
    sourceFilesRef.current = sourceFiles;
  }, [sourceFiles]);

  useEffect(() => {
    if (creatingNode && creatingInputRef.current) {
      creatingInputFocusedRef.current = false;
      requestAnimationFrame(() => {
        creatingInputRef.current?.focus();
      });
    }
  }, [creatingNode, showFiles]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, streamingText, pendingApprovals]);

  const fileTree = useMemo(() => {
    const tree: Record<string, { files: string[]; dirs: string[] }> = { '.': { files: [], dirs: [] } };
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
    for (const dir of Object.keys(tree)) {
      if (dir === '.') continue;
      const parts = dir.split('/');
      const parent = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
      const dirname = parts[parts.length - 1];
      if (!tree[parent]) tree[parent] = { files: [], dirs: [] };
      if (!tree[parent].dirs.includes(dirname)) {
        tree[parent].dirs.push(dirname);
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
      ? activeFile.split('/').slice(0, -1).join('/')
      : '.';
    setCreatingNode({ type: 'file', parentPath: basePath });
    setCreatingName('');
    if (basePath !== '.') {
      setCollapsedDirs((prev) => {
        const next = new Set(prev);
        next.delete(basePath);
        return next;
      });
    }
  }, [activeFile]);

  const handleNewFolder = useCallback(() => {
    let basePath = activeFile.includes('/')
      ? activeFile.split('/').slice(0, -1).join('/')
      : '.';
    setCreatingNode({ type: 'folder', parentPath: basePath });
    setCreatingName('');
    if (basePath !== '.') {
      setCollapsedDirs((prev) => {
        const next = new Set(prev);
        next.delete(basePath);
        return next;
      });
    }
  }, [activeFile]);

  const handleCreateConfirm = useCallback(() => {
    if (!creatingNode || !creatingName.trim()) {
      setCreatingNode(null);
      return;
    }
    const parentPath = creatingNode.parentPath;
    const prefix = parentPath === '.' ? '' : parentPath + '/';
    const name = creatingName.trim();
    const fullPath = prefix + name;

    if (creatingNode.type === 'file') {
      setSourceFiles((prev) => ({ ...prev, [fullPath]: '' }));
      setActiveFile(fullPath);
      setOpenFiles((prev) => [...prev, fullPath]);
    } else {
      setSourceFiles((prev) => {
        const next = { ...prev };
        next[fullPath] = '__DIR__';
        return next;
      });
    }
    setCreatingNode(null);
    setCreatingName('');
  }, [creatingNode, creatingName]);

  const handleCreateCancel = useCallback(() => {
    setCreatingNode(null);
    setCreatingName('');
  }, []);

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
        const paths = Object.keys(sourceFilesRef.current).sort();
        content = paths.length > 0
          ? paths.map((p) => `${sourceFilesRef.current[p] === '__DIR__' ? '📁' : '📄'} ${p}`).join('\n')
          : '(empty — no files exist yet. Start creating files with write_file.)';
        break;
      }
      case 'read_file': {
        const fileContent = sourceFilesRef.current[args.path];
        content = fileContent !== undefined ? fileContent : `Error: file not found: ${args.path}`;
        break;
      }
      case 'write_file': {
        setSourceFiles((prev) => {
          const next = { ...prev, [args.path]: args.content };
          sourceFilesRef.current = next;
          return next;
        });
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
        setSourceFiles((prev) => {
          const next = { ...prev, [args.path]: newContent };
          sourceFilesRef.current = next;
          return next;
        });
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
          sourceFilesRef.current = next;
          return next;
        });
        setOpenFiles((prev) => prev.filter((f) => f !== args.path));
        content = `File deleted: ${args.path}`;
        addLog('info', `AI deleted ${args.path}`);
        break;
      }
      case 'create_directory': {
        setSourceFiles((prev) => {
          const next = { ...prev, [args.path]: '__DIR__' };
          sourceFilesRef.current = next;
          return next;
        });
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

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const onMouseMove = (moveEv: MouseEvent) => {
      const delta = startX - moveEv.clientX;
      const newWidth = Math.max(250, Math.min(800, startWidth + delta));
      setRightPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    setIsResizing(true);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [rightPanelWidth]);

  const handleFileTreeResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = fileTreeWidth;

    const onMouseMove = (moveEv: MouseEvent) => {
      const delta = moveEv.clientX - startX;
      const newWidth = Math.max(120, Math.min(500, startWidth + delta));
      setFileTreeWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingFileTree(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    setIsResizingFileTree(true);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [fileTreeWidth]);

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
            <Folder className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
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
            {creatingNode && creatingNode.parentPath === dirPath && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 text-xs"
                style={{ paddingLeft: `${8 + depth * 12 + 12}px` }}
              >
                {creatingNode.type === 'folder' ? (
                  <Folder className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                )}
                <input
                  ref={creatingInputRef}
                  className="bg-accent/70 text-foreground text-xs px-1 py-0 outline-none border border-primary rounded flex-1 min-w-0"
                  value={creatingName}
                  onChange={(e) => setCreatingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateConfirm();
                    } else if (e.key === 'Escape') {
                      handleCreateCancel();
                    }
                  }}
                  onFocus={() => { creatingInputFocusedRef.current = true; }}
                  onBlur={() => {
                    if (!creatingInputFocusedRef.current) return;
                    if (creatingName.trim()) {
                      handleCreateConfirm();
                    } else {
                      handleCreateCancel();
                    }
                  }}
                  placeholder={creatingNode.type === 'folder' ? 'folder-name' : 'file.tsx'}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card dark:bg-zinc-900 text-card-foreground select-none overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted dark:bg-zinc-800/30 border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Pencil className="w-4 h-4 text-muted-foreground" />
          <input
            className="bg-transparent outline-none border-b border-transparent hover:border-input focus:border-primary px-1 text-sm w-40"
            value={projectMeta.name}
            onChange={(e) => setProjectMeta((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={() => {
            if (rightPanel !== 'preview') setRightPanel('preview');
            handleRefreshPreview();
          }}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            rightPanel === 'preview'
              ? 'bg-accent dark:bg-white/10 text-foreground'
              : 'hover:bg-accent dark:hover:bg-white/5 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          Preview
        </button>
        <button
          onClick={() => setRightPanel(rightPanel === 'chat' ? 'preview' : 'chat')}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            rightPanel === 'chat'
              ? 'bg-accent dark:bg-white/10 text-foreground'
              : 'hover:bg-accent dark:hover:bg-white/5 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Chat
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent dark:hover:bg-white/5 text-muted-foreground hover:text-foreground rounded transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent dark:hover:bg-white/5 text-muted-foreground hover:text-foreground rounded transition-colors disabled:opacity-50"
        >
          {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Publish
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {showFiles && (
          <div
            className="border-r border-border flex flex-col shrink-0"
            style={{ width: fileTreeWidth }}
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted dark:bg-zinc-800/50">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNewFile}
                  className="p-0.5 hover:bg-accent dark:hover:bg-white/5 rounded text-muted-foreground hover:text-foreground"
                  title="New File"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNewFolder}
                  className="p-0.5 hover:bg-accent dark:hover:bg-white/5 rounded text-muted-foreground hover:text-foreground"
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

        {showFiles && (
          <div
            className={`w-1 cursor-col-resize hover:bg-accent-foreground/20 transition-colors shrink-0 ${
              isResizingFileTree ? 'bg-accent-foreground/30' : 'bg-border/30'
            }`}
            onMouseDown={handleFileTreeResizeStart}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center bg-muted dark:bg-zinc-800/50 border-b border-border shrink-0">
            <button
              onClick={() => setShowFiles(!showFiles)}
              className="p-1.5 hover:bg-accent dark:hover:bg-white/5 text-muted-foreground hover:text-foreground"
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
                        ? 'bg-card dark:bg-zinc-900 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-white/5'
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
              <div className="flex items-center justify-between px-3 py-1 bg-muted dark:bg-zinc-800/50 border-b border-border">
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

        <div
          className={`w-1 cursor-col-resize hover:bg-accent-foreground/20 transition-colors shrink-0 ${
            isResizing ? 'bg-accent-foreground/30' : 'bg-border/30'
          }`}
          onMouseDown={handleResizeStart}
        />

        <div
          className={`shrink-0 border-l border-border flex flex-col ${isResizing ? '' : ''}`}
          style={{ width: rightPanelWidth }}
        >
          {rightPanel === 'preview' ? (
            <>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted dark:bg-zinc-800/50">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleRefreshPreview}
                    className="p-0.5 hover:bg-accent dark:hover:bg-white/5 rounded text-muted-foreground hover:text-foreground"
                    title="Refresh preview"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRightPanel('chat')}
                    className="p-0.5 hover:bg-accent dark:hover:bg-white/5 rounded text-muted-foreground hover:text-foreground"
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
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted dark:bg-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">AI Chat</span>
                    {isGenerating && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Generating...
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setAutoApprove(!autoApprove)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                        autoApprove
                          ? 'bg-accent dark:bg-white/10 text-foreground'
                          : 'hover:bg-accent dark:hover:bg-white/5 text-muted-foreground hover:text-foreground'
                      }`}
                      title="When enabled, AI changes are applied automatically"
                    >
                      Auto-approve
                    </button>
                    {isGenerating && (
                      <button
                        onClick={handleStopGeneration}
                        className="p-1 rounded hover:bg-accent dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                        title="Stop generation"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setRightPanel('preview')}
                      className="p-1 rounded hover:bg-accent dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Switch to preview"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-2">
                    <div className="mb-4">
                      <div className="w-12 h-12 rounded-xl bg-accent dark:bg-white/5 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-muted-foreground" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-foreground mb-1.5">
                      What would you like to build?
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mb-5">
                      Describe your app idea and I&apos;ll generate React + TypeScript code with file management and esm.sh package imports.
                    </p>
                    <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                      {[
                        { title: 'Todo App', desc: 'Dark-themed with local storage' },
                        { title: 'Markdown Editor', desc: 'Split-pane with live preview' },
                        { title: 'Weather Dashboard', desc: 'Free API integration' },
                        { title: 'Pomodoro Timer', desc: 'Customizable work/break cycles' },
                      ].map((suggestion) => (
                        <button
                          key={suggestion.title}
                          onClick={() => {
                            if (!isGenerating) {
                              setChatInput(`Build a ${suggestion.title.toLowerCase()} — ${suggestion.desc}`);
                            }
                          }}
                          disabled={isGenerating}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted dark:bg-zinc-800/50 hover:bg-accent dark:hover:bg-white/5 transition-colors text-left disabled:opacity-30"
                        >
                          <div className="w-7 h-7 rounded-lg bg-accent dark:bg-white/5 flex items-center justify-center shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground">
                              {suggestion.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {suggestion.desc}
                            </p>
                          </div>
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
                    <div key={i} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
                      <div
                        className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-semibold ${
                          isUser
                            ? 'bg-accent dark:bg-white/10 text-muted-foreground'
                            : 'bg-accent dark:bg-white/10 text-muted-foreground'
                        }`}
                      >
                        {isUser ? 'U' : 'AI'}
                      </div>
                      <div className={`flex-1 min-w-0 ${isUser ? 'flex justify-end' : ''}`}>
                        <div
                          className={`inline-block max-w-full rounded-lg px-3 py-2 text-sm leading-relaxed ${
                            isUser
                              ? 'bg-accent dark:bg-white/10 text-foreground'
                              : 'bg-muted dark:bg-zinc-800/50 text-foreground'
                          }`}
                        >
                          {msg.content && (
                            <div className="whitespace-pre-wrap break-words">
                              {msg.content}
                            </div>
                          )}
                          {hasToolCalls && (
                            <div className={msg.content ? 'mt-2 pt-2 border-t border-border/50' : ''}>
                              {msg.tool_calls!.map((tc, j) => (
                                <div key={j} className="flex items-center gap-1.5 py-0.5 text-xs">
                                  <code className="text-muted-foreground">{tc.function.name}</code>
                                  <span className="text-muted-foreground/50 truncate">
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
                  <div className="bg-muted dark:bg-zinc-800/50 border border-border rounded-lg p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        Pending Changes ({pendingApprovals.length})
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleApproveAll}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded hover:bg-accent dark:hover:bg-white/5 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Approve All
                        </button>
                        <button
                          onClick={handleRejectAll}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded hover:bg-accent dark:hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                          Reject All
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-border pt-2">
                    {pendingApprovals.map((p, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-xs py-0.5 pl-0.5">
                        <code className="text-muted-foreground font-mono bg-accent dark:bg-white/5 px-1 py-0.5 rounded">{p.toolCall.function.name}</code>
                        <span className="text-foreground/30 truncate">
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
                  </div>
                )}

                {streamingText && (
                  <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
                    <div className="shrink-0 w-6 h-6 rounded-md bg-accent dark:bg-white/10 flex items-center justify-center text-[10px] text-muted-foreground font-semibold">AI</div>
                    <div className="flex-1 min-w-0">
                      <div className="inline-block max-w-full rounded-lg px-3 py-2 text-sm bg-muted dark:bg-zinc-800/50 text-foreground leading-relaxed">
                        <div className="whitespace-pre-wrap break-words">{streamingText}</div>
                        <span className="inline-block w-1.5 h-4 bg-muted-foreground animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border p-3 bg-muted dark:bg-zinc-800/50">
                <div className="flex items-center gap-2">
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
                    rows={3}
                    disabled={isGenerating}
                    className="flex-1 bg-background dark:bg-zinc-900 text-foreground text-sm rounded-lg px-3.5 py-2.5 outline-none border border-border focus:border-muted-foreground/40 resize-none placeholder:text-muted-foreground disabled:opacity-30 transition-colors"
                  />
                  {isGenerating ? (
                    <button
                      onClick={handleStopGeneration}
                      className="p-2.5 rounded-lg hover:bg-accent dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Stop"
                    >
                      <StopCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim()}
                      className="p-2.5 rounded-lg hover:bg-accent dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-20"
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

      <div className="flex items-center gap-2 px-3 py-1 bg-muted dark:bg-zinc-800/30 border-t border-border shrink-0">
        <button
          onClick={() => setShowConsole(!showConsole)}
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
            showConsole ? 'bg-accent dark:bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
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
