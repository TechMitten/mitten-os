'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface Tab {
  id: string;
  name: string;
  content: string;
  modified: boolean;
}

let tabCounter = 1;

function generateId(): string {
  return `tab-${Date.now()}-${tabCounter++}`;
}

type MenuType = 'file' | 'edit' | null;

export function TextEditor() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: generateId(), name: 'Untitled', content: '', modified: false },
  ]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [openMenu, setOpenMenu] = useState<MenuType>(null);
  const [undoStack, setUndoStack] = useState<Record<string, string[]>>({});
  const [redoStack, setRedoStack] = useState<Record<string, string[]>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateTabContent = useCallback(
    (tabId: string, content: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId ? { ...t, content, modified: true } : t
        )
      );
    },
    []
  );

  const handleNewFile = useCallback(() => {
    const newTab: Tab = {
      id: generateId(),
      name: 'Untitled',
      content: '',
      modified: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setOpenMenu(null);
  }, []);

  const handleOpenFile = useCallback(() => {
    // Visual placeholder - would integrate with file system in future
    const newTab: Tab = {
      id: generateId(),
      name: 'Opened File.txt',
      content: 'This is content from an opened file.\nFile system integration coming soon!',
      modified: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setOpenMenu(null);
  }, []);

  const handleSaveFile = useCallback(() => {
    // Visual placeholder - mark as saved
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, modified: false } : t))
    );
    setOpenMenu(null);
  }, [activeTabId]);

  const handleCloseTab = useCallback(
    (tabId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setTabs((prev) => {
        if (prev.length === 1) {
          // Don't close the last tab, just reset it
          const newTab: Tab = { id: generateId(), name: 'Untitled', content: '', modified: false };
          setActiveTabId(newTab.id);
          return [newTab];
        }
        const remaining = prev.filter((t) => t.id !== tabId);
        if (tabId === activeTabId) {
          const idx = prev.findIndex((t) => t.id === tabId);
          const newActive = remaining[Math.min(idx, remaining.length - 1)];
          setActiveTabId(newActive.id);
        }
        return remaining;
      });
    },
    [activeTabId]
  );

  const handleUndo = useCallback(() => {
    const stack = undoStack[activeTabId] || [];
    if (stack.length === 0) return;
    const lastContent = stack[stack.length - 1];
    setUndoStack((prev) => ({
      ...prev,
      [activeTabId]: stack.slice(0, -1),
    }));
    setRedoStack((prev) => ({
      ...prev,
      [activeTabId]: [...(prev[activeTabId] || []), activeTab.content],
    }));
    setTabs((ts) =>
      ts.map((t) => (t.id === activeTabId ? { ...t, content: lastContent } : t))
    );
    setOpenMenu(null);
  }, [undoStack, redoStack, activeTabId, activeTab]);

  const handleRedo = useCallback(() => {
    const stack = redoStack[activeTabId] || [];
    if (stack.length === 0) return;
    const lastContent = stack[stack.length - 1];
    setRedoStack((prev) => ({
      ...prev,
      [activeTabId]: stack.slice(0, -1),
    }));
    setUndoStack((prev) => ({
      ...prev,
      [activeTabId]: [...(prev[activeTabId] || []), activeTab.content],
    }));
    setTabs((ts) =>
      ts.map((t) => (t.id === activeTabId ? { ...t, content: lastContent } : t))
    );
    setOpenMenu(null);
  }, [undoStack, redoStack, activeTabId, activeTab]);

  const handleCut = useCallback(() => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = activeTab.content.substring(start, end);
      navigator.clipboard.writeText(selectedText).catch(() => {});
      const newContent = activeTab.content.substring(0, start) + activeTab.content.substring(end);
      setUndoStack((prev) => ({
        ...prev,
        [activeTabId]: [...(prev[activeTabId] || []), activeTab.content],
      }));
      setRedoStack((prev) => ({ ...prev, [activeTabId]: [] }));
      updateTabContent(activeTabId, newContent);
    }
    setOpenMenu(null);
  }, [activeTab, activeTabId, updateTabContent]);

  const handleCopy = useCallback(() => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = activeTab.content.substring(start, end);
      navigator.clipboard.writeText(selectedText).catch(() => {});
    }
    setOpenMenu(null);
  }, [activeTab]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const newContent =
          activeTab.content.substring(0, start) + text + activeTab.content.substring(end);
        setUndoStack((prev) => ({
          ...prev,
          [activeTabId]: [...(prev[activeTabId] || []), activeTab.content],
        }));
        setRedoStack((prev) => ({ ...prev, [activeTabId]: [] }));
        updateTabContent(activeTabId, newContent);
      }
    } catch {
      // Clipboard access denied
    }
    setOpenMenu(null);
  }, [activeTab, activeTabId, updateTabContent]);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setUndoStack((prev) => ({
        ...prev,
        [activeTabId]: [...(prev[activeTabId] || []), activeTab.content].slice(-50), // Keep last 50 states
      }));
      setRedoStack((prev) => ({ ...prev, [activeTabId]: [] }));
      updateTabContent(activeTabId, newContent);
    },
    [activeTabId, activeTab, updateTabContent]
  );

  const lineCount = activeTab.content ? activeTab.content.split('\n').length : 1;
  const charCount = activeTab.content.length;

  return (
    <div className="flex flex-col h-full bg-[#1e1e2e] dark:bg-[#1e1e2e] select-none">
      {/* Menu Bar */}
      <div
        className="h-7 bg-muted dark:bg-zinc-800/50 border-b border-border flex items-center px-2 gap-4 text-xs text-muted-foreground"
        ref={menuRef}
      >
        {/* File Menu */}
        <div className="relative">
          <button
            className={`px-2 py-0.5 rounded hover:bg-accent dark:hover:bg-white/10 transition-colors ${
              openMenu === 'file' ? 'bg-accent dark:bg-white/10 text-foreground/80 dark:text-white/80' : ''
            }`}
            onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
            onMouseEnter={() => openMenu && setOpenMenu('file')}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className="absolute top-full left-0 mt-0.5 bg-popover dark:bg-zinc-800 border border-border rounded-lg shadow-xl py-1 min-w-[160px] z-50">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-accent dark:hover:bg-white/10 text-foreground/70 hover:text-foreground/90 dark:text-white/70 dark:hover:text-white/90 transition-colors flex items-center justify-between"
                onClick={handleNewFile}
              >
                <span>New</span>
                <span className="text-muted-foreground/50 text-[10px]">Ctrl+N</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-accent dark:hover:bg-white/10 text-foreground/70 hover:text-foreground/90 dark:text-white/70 dark:hover:text-white/90 transition-colors flex items-center justify-between"
                onClick={handleOpenFile}
              >
                <span>Open</span>
                <span className="text-muted-foreground/50 text-[10px]">Ctrl+O</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-accent dark:hover:bg-white/10 text-foreground/70 hover:text-foreground/90 dark:text-white/70 dark:hover:text-white/90 transition-colors flex items-center justify-between"
                onClick={handleSaveFile}
              >
                <span>Save</span>
                <span className="text-muted-foreground/50 text-[10px]">Ctrl+S</span>
              </button>
              <div className="border-t border-border my-1" />
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-accent dark:hover:bg-white/10 text-foreground/70 hover:text-foreground/90 dark:text-white/70 dark:hover:text-white/90 transition-colors"
                onClick={() => {
                  handleCloseTab(activeTabId, { stopPropagation: () => {} } as React.MouseEvent);
                  setOpenMenu(null);
                }}
              >
                Close Tab
              </button>
            </div>
          )}
        </div>

        {/* Edit Menu */}
        <div className="relative">
          <button
            className={`px-2 py-0.5 rounded hover:bg-accent dark:hover:bg-white/10 transition-colors ${
              openMenu === 'edit' ? 'bg-accent dark:bg-white/10 text-foreground/80 dark:text-white/80' : ''
            }`}
            onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
            onMouseEnter={() => openMenu && setOpenMenu('edit')}
          >
            Edit
          </button>
          {openMenu === 'edit' && (
            <div className="absolute top-full left-0 mt-0.5 bg-popover dark:bg-zinc-800 border border-border rounded-lg shadow-xl py-1 min-w-[160px] z-50">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-accent dark:hover:bg-white/10 text-foreground/70 hover:text-foreground/90 dark:text-white/70 dark:hover:text-white/90 transition-colors flex items-center justify-between"
                onClick={handleUndo}
                disabled={(undoStack[activeTabId] || []).length === 0}
              >
                <span>{(undoStack[activeTabId] || []).length === 0 ? 'Undo' : 'Undo'}</span>
                <span className="text-muted-foreground/50 text-[10px]">Ctrl+Z</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-accent dark:hover:bg-white/10 text-foreground/70 hover:text-foreground/90 dark:text-white/70 dark:hover:text-white/90 transition-colors flex items-center justify-between"
                onClick={handleRedo}
                disabled={(redoStack[activeTabId] || []).length === 0}
              >
                <span>Redo</span>
                <span className="text-muted-foreground/50 text-[10px]">Ctrl+Y</span>
              </button>
              <div className="border-t border-border my-1" />
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-accent dark:hover:bg-white/10 text-foreground/70 hover:text-foreground/90 dark:text-white/70 dark:hover:text-white/90 transition-colors flex items-center justify-between"
                onClick={handleCut}
              >
                <span>Cut</span>
                <span className="text-muted-foreground/50 text-[10px]">Ctrl+X</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-accent dark:hover:bg-white/10 text-foreground/70 hover:text-foreground/90 dark:text-white/70 dark:hover:text-white/90 transition-colors flex items-center justify-between"
                onClick={handleCopy}
              >
                <span>Copy</span>
                <span className="text-muted-foreground/50 text-[10px]">Ctrl+C</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-accent dark:hover:bg-white/10 text-foreground/70 hover:text-foreground/90 dark:text-white/70 dark:hover:text-white/90 transition-colors flex items-center justify-between"
                onClick={handlePaste}
              >
                <span>Paste</span>
                <span className="text-muted-foreground/50 text-[10px]">Ctrl+V</span>
              </button>
              <div className="border-t border-border my-1" />
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-accent dark:hover:bg-white/10 text-foreground/70 hover:text-foreground/90 dark:text-white/70 dark:hover:text-white/90 transition-colors flex items-center justify-between"
                onClick={() => {
                  if (textareaRef.current) {
                    textareaRef.current.select();
                  }
                  setOpenMenu(null);
                }}
              >
                <span>Select All</span>
                <span className="text-muted-foreground/50 text-[10px]">Ctrl+A</span>
              </button>
            </div>
          )}
        </div>

        {/* View label */}
        <span className="px-2 py-0.5 rounded hover:bg-accent dark:hover:bg-white/10 cursor-default">View</span>
      </div>

      {/* Tab Bar */}
      <div className="h-8 bg-muted dark:bg-zinc-800/30 border-b border-border flex items-center px-1 gap-0.5 overflow-x-auto os-scrollbar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group flex items-center gap-1 px-3 h-6 rounded-t text-xs cursor-pointer transition-colors min-w-0 max-w-[140px] ${
              tab.id === activeTabId
                ? 'bg-card dark:bg-[#1e1e2e] text-foreground dark:text-white/90 border-t-2 border-amber-500'
                : 'bg-muted dark:bg-zinc-800/50 text-muted-foreground hover:text-foreground/60 dark:hover:text-white/60'
            }`}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span className="truncate">{tab.name}</span>
            {tab.modified && (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            )}
            {tabs.length > 1 && (
              <button
                className="ml-1 w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-white/20 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleCloseTab(tab.id, e)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {/* New tab button */}
        <button
          className="w-6 h-6 flex items-center justify-center text-muted-foreground/50 hover:text-foreground/60 dark:hover:text-white/60 hover:bg-accent dark:hover:bg-white/10 rounded transition-colors shrink-0"
          onClick={handleNewFile}
          title="New Tab"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Editor Area */}
      <textarea
        ref={textareaRef}
        className="flex-1 bg-card dark:bg-[#1e1e2e] text-foreground dark:text-[#cdd6f4] font-mono text-sm p-4 resize-none outline-none leading-relaxed os-scrollbar"
        value={activeTab.content}
        onChange={handleContentChange}
        spellCheck={false}
        placeholder="Start typing..."
        onClick={() => setOpenMenu(null)}
      />

      {/* Status Bar */}
      <div className="h-6 bg-muted dark:bg-zinc-800/50 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <span>
            {activeTab.modified ? '● ' : ''}
            {activeTab.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>Ln {lineCount}</span>
          <span>Ch {charCount}</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
}
