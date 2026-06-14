'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronLeft,
  List,
  LayoutGrid,
  FolderPlus,
  FilePlus,
  Home,
  Monitor,
  File,
  Music,
  Download,
  Image as ImageIcon,
  FolderOpen,
} from 'lucide-react';
import { useFileSystemStore } from '@/stores/filesystem-store';
import { useWindowStore } from '@/stores/window-store';

type ViewMode = 'list' | 'grid';

interface QuickAccessItem {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const QUICK_ACCESS: QuickAccessItem[] = [
  { id: 'desktop', name: 'Desktop', icon: <Monitor className="w-4 h-4" /> },
  { id: 'documents', name: 'Documents', icon: <File className="w-4 h-4" /> },
  { id: 'pictures', name: 'Pictures', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'music', name: 'Music', icon: <Music className="w-4 h-4" /> },
  { id: 'downloads', name: 'Downloads', icon: <Download className="w-4 h-4" /> },
  { id: 'root', name: '/', icon: <Home className="w-4 h-4" /> },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FileExplorer() {
  const fsStore = useFileSystemStore();
  const openWindow = useWindowStore((s) => s.openWindow);

  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemId: string;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');

  // Navigation history
  const [history, setHistory] = useState<string[]>(['root']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const newItemInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentFolder = fsStore.getNodeById(currentFolderId);
  const children = fsStore.getChildren(currentFolderId);

  // Build breadcrumb path
  const getBreadcrumbPath = useCallback(() => {
    const path: { id: string; name: string }[] = [];
    let nodeId: string | null = currentFolderId;
    while (nodeId) {
      const node = fsStore.getNodeById(nodeId);
      if (!node) break;
      path.unshift({ id: node.id, name: node.name });
      nodeId = node.parentId;
    }
    return path;
  }, [currentFolderId, fsStore]);

  const breadcrumbs = getBreadcrumbPath();

  // Navigate to a folder
  const navigateTo = useCallback(
    (folderId: string) => {
      setCurrentFolderId(folderId);
      setSelectedItemId(null);
      setContextMenu(null);
      setRenamingId(null);
      setCreating(null);

      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(folderId);
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentFolderId(history[newIndex]);
      setSelectedItemId(null);
      setContextMenu(null);
    }
  }, [historyIndex, history]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentFolderId(history[newIndex]);
      setSelectedItemId(null);
      setContextMenu(null);
    }
  }, [historyIndex, history]);

  const goUp = useCallback(() => {
    if (currentFolder?.parentId) {
      navigateTo(currentFolder.parentId);
    }
  }, [currentFolder, navigateTo]);

  // Double click handler
  const handleItemDoubleClick = useCallback(
    (nodeId: string) => {
      const node = fsStore.getNodeById(nodeId);
      if (!node) return;
      if (node.type === 'folder') {
        navigateTo(nodeId);
      } else {
        // Open file in text editor
        openWindow('text-editor');
      }
    },
    [fsStore, navigateTo, openWindow]
  );

  // Context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, itemId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedItemId(itemId);
      setContextMenu({ x: e.clientX, y: e.clientY, itemId });
    },
    []
  );

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Focus rename input
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Focus new item input
  useEffect(() => {
    if (creating && newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [creating]);

  const handleRename = useCallback(
    (id: string) => {
      if (renameValue.trim()) {
        fsStore.renameNode(id, renameValue.trim());
      }
      setRenamingId(null);
      setRenameValue('');
    },
    [fsStore, renameValue]
  );

  const handleDelete = useCallback(
    (id: string) => {
      fsStore.deleteNode(id);
      if (selectedItemId === id) setSelectedItemId(null);
    },
    [fsStore, selectedItemId]
  );

  const handleCreateItem = useCallback(() => {
    if (!newItemName.trim()) {
      setCreating(null);
      setNewItemName('');
      return;
    }
    if (creating === 'file') {
      fsStore.createFile(currentFolderId, newItemName.trim());
    } else if (creating === 'folder') {
      fsStore.createFolder(currentFolderId, newItemName.trim());
    }
    setCreating(null);
    setNewItemName('');
  }, [creating, currentFolderId, fsStore, newItemName]);

  const startRename = useCallback((id: string) => {
    const node = useFileSystemStore.getState().getNodeById(id);
    if (node) {
      setRenamingId(id);
      setRenameValue(node.name);
      setContextMenu(null);
    }
  }, []);

  // Sort children: folders first, then files, alphabetical
  const sortedChildren = [...children].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div
      ref={containerRef}
      className="flex h-full bg-card dark:bg-zinc-900/90 text-card-foreground select-none overflow-hidden"
      onClick={() => {
        setSelectedItemId(null);
        setContextMenu(null);
      }}
    >
      {/* Sidebar */}
      <div className="w-48 bg-muted dark:bg-zinc-800/50 border-r border-border flex flex-col py-2 shrink-0">
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Access
        </div>
        {QUICK_ACCESS.map((item) => {
          const isActive = currentFolderId === item.id;
          return (
            <button
              key={item.id}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm w-full text-left hover:bg-accent dark:hover:bg-white/5 transition-colors ${
                isActive ? 'bg-accent dark:bg-white/10 text-foreground' : 'text-muted-foreground'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                navigateTo(item.id);
              }}
            >
              <span className={isActive ? 'text-foreground' : 'text-muted-foreground/70'}>
                {item.icon}
              </span>
              {item.name}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-9 bg-muted dark:bg-zinc-800/30 border-b border-border flex items-center px-2 gap-1 shrink-0">
          <button
            className="p-1 rounded hover:bg-accent dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              goBack();
            }}
            disabled={historyIndex <= 0}
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            className="p-1 rounded hover:bg-accent dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              goForward();
            }}
            disabled={historyIndex >= history.length - 1}
            title="Go forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-0.5 ml-2 mr-auto overflow-x-auto min-w-0 text-xs">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                {idx > 0 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                )}
                <button
                  className={`px-1.5 py-0.5 rounded hover:bg-accent dark:hover:bg-white/10 whitespace-nowrap transition-colors ${
                    idx === breadcrumbs.length - 1
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (crumb.id !== currentFolderId) {
                      navigateTo(crumb.id);
                    }
                  }}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          <button
            className="p-1 rounded hover:bg-accent dark:hover:bg-white/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setViewMode((v) => (v === 'list' ? 'grid' : 'list'));
            }}
            title={viewMode === 'list' ? 'Grid view' : 'List view'}
          >
            {viewMode === 'list' ? (
              <LayoutGrid className="w-4 h-4" />
            ) : (
              <List className="w-4 h-4" />
            )}
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            className="p-1 rounded hover:bg-accent dark:hover:bg-white/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setCreating('folder');
              setNewItemName('');
            }}
            title="New folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            className="p-1 rounded hover:bg-accent dark:hover:bg-white/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setCreating('file');
              setNewItemName('');
            }}
            title="New file"
          >
            <FilePlus className="w-4 h-4" />
          </button>
        </div>

        {/* File List / Grid */}
        <div className="flex-1 overflow-y-auto p-2">
          {viewMode === 'list' ? (
            <div className="flex flex-col">
              {/* List Header */}
              <div className="flex items-center gap-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border mb-1">
                <span className="w-5" />
                <span className="flex-1">Name</span>
                <span className="w-20 text-right">Size</span>
                <span className="w-36 text-right">Modified</span>
              </div>
              {sortedChildren.length === 0 && !creating && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
                  <FolderOpen className="w-12 h-12 mb-2 opacity-30" />
                  <p className="text-sm">This folder is empty</p>
                </div>
              )}
              {/* New item input */}
              {creating && (
                <div className="flex items-center gap-2 px-3 py-1.5">
                  {creating === 'folder' ? (
                    <Folder className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                  )}
                    <input
                      ref={newItemInputRef}
                      className="bg-transparent border-b border-muted-foreground/40 dark:border-white/30 text-sm outline-none flex-1 px-0.5"
                      value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateItem();
                      if (e.key === 'Escape') {
                        setCreating(null);
                        setNewItemName('');
                      }
                    }}
                    onBlur={handleCreateItem}
                    placeholder={
                      creating === 'folder'
                        ? 'New folder name...'
                        : 'New file name...'
                    }
                  />
                </div>
              )}
              {sortedChildren.map((node) => (
                <div
                  key={node.id}
                  className={`flex items-center gap-2 px-3 py-1.5 hover:bg-accent dark:hover:bg-white/5 rounded cursor-pointer ${
                    selectedItemId === node.id ? 'bg-accent dark:bg-white/10' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemId(node.id);
                  }}
                  onDoubleClick={() => handleItemDoubleClick(node.id)}
                  onContextMenu={(e) => handleContextMenu(e, node.id)}
                >
                  {node.type === 'folder' ? (
                    <Folder className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                  )}
                  {renamingId === node.id ? (
                    <input
                      ref={renameInputRef}
                       className="bg-transparent border-b border-muted-foreground/40 dark:border-white/30 text-sm outline-none flex-1 px-0.5"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(node.id);
                        if (e.key === 'Escape') {
                          setRenamingId(null);
                          setRenameValue('');
                        }
                      }}
                      onBlur={() => handleRename(node.id)}
                    />
                  ) : (
                    <span className="flex-1 text-sm truncate">{node.name}</span>
                  )}
                  <span className="w-20 text-right text-xs text-muted-foreground">
                    {node.type === 'file'
                      ? formatFileSize(
                          node.content ? new Blob([node.content]).size : 0
                        )
                      : '--'}
                  </span>
                  <span className="w-36 text-right text-xs text-muted-foreground">
                    {formatDate(node.modifiedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-1">
              {sortedChildren.length === 0 && !creating && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground/50">
                  <FolderOpen className="w-12 h-12 mb-2 opacity-30" />
                  <p className="text-sm">This folder is empty</p>
                </div>
              )}
              {creating && (
                <div className="flex flex-col items-center p-3">
                  {creating === 'folder' ? (
                    <Folder className="w-10 h-10 text-amber-500 dark:text-amber-400 mb-1" />
                  ) : (
                    <FileText className="w-10 h-10 text-blue-500 dark:text-blue-400 mb-1" />
                  )}
                  <input
                    ref={newItemInputRef}
                      className="bg-transparent border-b border-muted-foreground/40 dark:border-white/30 text-xs text-center outline-none w-full px-0.5 mt-1"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateItem();
                      if (e.key === 'Escape') {
                        setCreating(null);
                        setNewItemName('');
                      }
                    }}
                    onBlur={handleCreateItem}
                    placeholder="Name..."
                  />
                </div>
              )}
              {sortedChildren.map((node) => (
                <div
                  key={node.id}
                  className={`flex flex-col items-center p-3 hover:bg-accent dark:hover:bg-white/5 rounded-lg cursor-pointer ${
                    selectedItemId === node.id ? 'bg-accent dark:bg-white/10' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemId(node.id);
                  }}
                  onDoubleClick={() => handleItemDoubleClick(node.id)}
                  onContextMenu={(e) => handleContextMenu(e, node.id)}
                >
                  {node.type === 'folder' ? (
                    <Folder className="w-10 h-10 text-amber-500 dark:text-amber-400 mb-1" />
                  ) : (
                    <FileText className="w-10 h-10 text-blue-500 dark:text-blue-400 mb-1" />
                  )}
                  {renamingId === node.id ? (
                    <input
                      ref={renameInputRef}
                    className="bg-transparent border-b border-muted-foreground/40 dark:border-white/30 text-xs text-center outline-none w-full px-0.5 mt-1"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(node.id);
                        if (e.key === 'Escape') {
                          setRenamingId(null);
                          setRenameValue('');
                        }
                      }}
                      onBlur={() => handleRename(node.id)}
                    />
                  ) : (
                    <span className="text-xs text-center truncate w-full mt-1">
                      {node.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="h-6 bg-muted dark:bg-zinc-800/30 border-t border-border flex items-center px-3 text-[10px] text-muted-foreground shrink-0">
          {children.length} item{children.length !== 1 ? 's' : ''}
          {selectedItemId && ' — 1 selected'}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-card dark:bg-zinc-800/95 backdrop-blur-sm border border-border rounded-lg shadow-xl py-1 min-w-[140px] z-[99999]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-foreground/80 hover:bg-accent dark:hover:bg-white/10 transition-colors"
            onClick={() => startRename(contextMenu.itemId)}
          >
            Rename
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-destructive hover:bg-accent dark:hover:bg-white/10 transition-colors"
            onClick={() => {
              handleDelete(contextMenu.itemId);
              setContextMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
