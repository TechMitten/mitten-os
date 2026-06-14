'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useFileSystemStore } from '@/stores/filesystem-store';

interface TerminalLine {
  type: 'input' | 'output' | 'error';
  text: string;
}

const NEOFETCH_ASCII = `
  ╭──────────────────────╮
  │    ___  ____  ____   │
  │   / _ \\/ ___\\/ ___\\  │
  │  / /_\\/ /   / /___   │
  │ / ___/ /___/ /___/   │
  │ \\/    \\____/\\____/   │
  │                       │
  ╰──────────────────────╯`;

export function Terminal() {
  const fsStore = useFileSystemStore();

  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'output', text: 'Welcome to MittenOS Terminal v1.0.0' },
    { type: 'output', text: 'Type "help" for available commands.\n' },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentPath, setCurrentPath] = useState('root');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input on click
  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // Get path display name
  const getPathDisplay = useCallback(() => {
    if (currentPath === 'root') return '~';
    const node = fsStore.getNodeById(currentPath);
    if (!node) return '~';
    // Build path
    const parts: string[] = [];
    let n: typeof node | null = node;
    while (n) {
      parts.unshift(n.name);
      n = n.parentId ? fsStore.getNodeById(n.parentId) : null;
    }
    return parts.join('/');
  }, [currentPath, fsStore]);

  // Execute command
  const executeCommand = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) {
        setLines((prev) => [
          ...prev,
          { type: 'input', text: `user@mittenos:${getPathDisplay()}$ ` },
        ]);
        return;
      }

      // Add input line
      setLines((prev) => [
        ...prev,
        { type: 'input', text: `user@mittenos:${getPathDisplay()}$ ${trimmed}` },
      ]);

      // Add to history
      setCommandHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);

      const parts = trimmed.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      let output: TerminalLine[] = [];

      switch (cmd) {
        case 'help':
          output = [
            { type: 'output' as const, text: 'Available commands:' },
            { type: 'output' as const, text: '  help          Show this help message' },
            { type: 'output' as const, text: '  clear         Clear the terminal' },
            { type: 'output' as const, text: '  echo [text]   Print text' },
            { type: 'output' as const, text: '  date          Show current date/time' },
            { type: 'output' as const, text: '  whoami        Show current user' },
            { type: 'output' as const, text: '  hostname      Show hostname' },
            { type: 'output' as const, text: '  pwd           Print working directory' },
            { type: 'output' as const, text: '  ls            List files in current directory' },
            { type: 'output' as const, text: '  cd [dir]      Change directory' },
            { type: 'output' as const, text: '  cat [file]    Show file contents' },
            { type: 'output' as const, text: '  mkdir [name]  Create directory' },
            { type: 'output' as const, text: '  touch [name]  Create empty file' },
            { type: 'output' as const, text: '  rm [name]     Delete file or folder' },
            { type: 'output' as const, text: '  neofetch      Show system info' },
            { type: 'output' as const, text: '  history       Show command history' },
          ];
          break;

        case 'clear':
          setLines([]);
          return;

        case 'echo':
          output = [{ type: 'output', text: args.join(' ') }];
          break;

        case 'date':
          output = [{ type: 'output', text: new Date().toString() }];
          break;

        case 'whoami':
          output = [{ type: 'output', text: 'user' }];
          break;

        case 'hostname':
          output = [{ type: 'output', text: 'mittenos' }];
          break;

        case 'pwd': {
          const pathDisplay = getPathDisplay().replace('~', '/');
          output = [{ type: 'output', text: pathDisplay === '/' ? '/' : `/${pathDisplay}` }];
          break;
        }

        case 'ls': {
          const children = fsStore.getChildren(currentPath);
          if (children.length === 0) {
            output = [{ type: 'output', text: '(empty directory)' }];
          } else {
            const sorted = [...children].sort((a, b) => {
              if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
              return a.name.localeCompare(b.name);
            });
            const lines_text = sorted.map((c) => {
              if (c.type === 'folder') return `  📁 ${c.name}/`;
              return `  📄 ${c.name}`;
            });
            output = [{ type: 'output', text: lines_text.join('\n') }];
          }
          break;
        }

        case 'cd': {
          if (!args[0] || args[0] === '~' || args[0] === '/') {
            setCurrentPath('root');
            break;
          }
          if (args[0] === '..') {
            const currentNode = fsStore.getNodeById(currentPath);
            if (currentNode?.parentId) {
              setCurrentPath(currentNode.parentId);
            }
            break;
          }
          // Look for child folder
          const children = fsStore.getChildren(currentPath);
          const target = children.find(
            (c) => c.name === args[0] || c.name === args[0].replace(/\/$/, '')
          );
          if (target && target.type === 'folder') {
            setCurrentPath(target.id);
          } else if (target && target.type === 'file') {
            output = [{ type: 'error', text: `cd: not a directory: ${args[0]}` }];
          } else {
            output = [{ type: 'error', text: `cd: no such directory: ${args[0]}` }];
          }
          break;
        }

        case 'cat': {
          if (!args[0]) {
            output = [{ type: 'error', text: 'cat: missing operand' }];
            break;
          }
          const children = fsStore.getChildren(currentPath);
          const file = children.find((c) => c.name === args[0]);
          if (!file) {
            output = [{ type: 'error', text: `cat: ${args[0]}: No such file` }];
          } else if (file.type === 'folder') {
            output = [{ type: 'error', text: `cat: ${args[0]}: Is a directory` }];
          } else {
            output = [
              { type: 'output', text: file.content || '' },
            ];
          }
          break;
        }

        case 'mkdir': {
          if (!args[0]) {
            output = [{ type: 'error', text: 'mkdir: missing operand' }];
            break;
          }
          const existing = fsStore.getChildren(currentPath).find(
            (c) => c.name === args[0]
          );
          if (existing) {
            output = [{ type: 'error', text: `mkdir: cannot create directory '${args[0]}': File exists` }];
          } else {
            fsStore.createFolder(currentPath, args[0]);
            output = [{ type: 'output', text: `Directory '${args[0]}' created` }];
          }
          break;
        }

        case 'touch': {
          if (!args[0]) {
            output = [{ type: 'error', text: 'touch: missing operand' }];
            break;
          }
          const existing = fsStore.getChildren(currentPath).find(
            (c) => c.name === args[0]
          );
          if (existing) {
            // Update modified time - file already exists
            output = [{ type: 'output', text: `File '${args[0]}' updated` }];
          } else {
            fsStore.createFile(currentPath, args[0], '', 'text/plain');
            output = [{ type: 'output', text: `File '${args[0]}' created` }];
          }
          break;
        }

        case 'rm': {
          if (!args[0]) {
            output = [{ type: 'error', text: 'rm: missing operand' }];
            break;
          }
          const children = fsStore.getChildren(currentPath);
          const target = children.find((c) => c.name === args[0]);
          if (!target) {
            output = [{ type: 'error', text: `rm: cannot remove '${args[0]}': No such file or directory` }];
          } else {
            fsStore.deleteNode(target.id);
            output = [{ type: 'output', text: `Removed '${args[0]}'` }];
          }
          break;
        }

        case 'neofetch':
          output = [
            { type: 'output', text: NEOFETCH_ASCII },
            { type: 'output', text: '' },
            { type: 'output', text: '  OS:       MittenOS 1.0.0' },
            { type: 'output', text: '  Kernel:   Browser/WebKit' },
            { type: 'output', text: '  Shell:    zsh 1.0' },
            { type: 'output', text: '  Terminal: mitten-term' },
            { type: 'output', text: '  CPU:      WebAssembly vCPU' },
            { type: 'output', text: '  Memory:   ∞ MB / ∞ MB' },
            { type: 'output', text: '  Uptime:   just now' },
            { type: 'output', text: '' },
          ];
          break;

        case 'history':
          output = commandHistory.map((cmd, idx) => ({
            type: 'output' as const,
            text: `  ${idx + 1}  ${cmd}`,
          }));
          if (commandHistory.length === 0) {
            output = [{ type: 'output', text: '  (no history)' }];
          }
          break;

        default:
          output = [
            {
              type: 'error',
              text: `zsh: command not found: ${cmd}`,
            },
          ];
          break;
      }

      if (output.length > 0) {
        setLines((prev) => [...prev, ...output]);
      }
    },
    [commandHistory, currentPath, fsStore, getPathDisplay]
  );

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        executeCommand(currentInput);
        setCurrentInput('');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex =
            historyIndex === -1
              ? commandHistory.length - 1
              : Math.max(0, historyIndex - 1);
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[newIndex]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex !== -1) {
          const newIndex = historyIndex + 1;
          if (newIndex >= commandHistory.length) {
            setHistoryIndex(-1);
            setCurrentInput('');
          } else {
            setHistoryIndex(newIndex);
            setCurrentInput(commandHistory[newIndex]);
          }
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Basic tab completion for file/folder names
        const parts = currentInput.split(/\s+/);
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
          const children = fsStore.getChildren(currentPath);
          const matches = children.filter((c) =>
            c.name.toLowerCase().startsWith(lastPart.toLowerCase())
          );
          if (matches.length === 1) {
            parts[parts.length - 1] = matches[0].name;
            setCurrentInput(parts.join(' '));
          } else if (matches.length > 1) {
            const names = matches.map((m) => m.name).join('  ');
            setLines((prev) => [
              ...prev,
              { type: 'input', text: `user@mittenos:${getPathDisplay()}$ ${currentInput}` },
              { type: 'output', text: names },
            ]);
          }
        }
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        setLines([]);
      }
    },
    [commandHistory, currentInput, executeCommand, fsStore, getPathDisplay, historyIndex, currentPath]
  );

  return (
    <div
      className="flex flex-col h-full bg-[#1a1b26] font-mono text-sm overflow-hidden"
      onClick={handleContainerClick}
    >
      {/* Terminal output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 pb-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#3b3d57 transparent',
        }}
      >
        {lines.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap break-all leading-5">
            {line.type === 'input' ? (
              <span>
                <span className="text-[#7aa2f7]">
                  {line.text.split('$')[0]}$
                </span>
                <span className="text-[#a9b1d6]">
                  {line.text.includes('$')
                    ? line.text.substring(line.text.indexOf('$') + 1)
                    : ''}
                </span>
              </span>
            ) : line.type === 'error' ? (
              <span className="text-[#f7768e]">{line.text}</span>
            ) : (
              <span className="text-[#a9b1d6]">{line.text}</span>
            )}
          </div>
        ))}
      </div>

      {/* Input line */}
      <div className="flex items-center px-3 py-2 shrink-0">
        <span className="text-[#7aa2f7] whitespace-nowrap">
          user@mittenos:{getPathDisplay()}${' '}
        </span>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent outline-none text-[#a9b1d6] caret-[#7aa2f7] min-w-0"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  );
}
