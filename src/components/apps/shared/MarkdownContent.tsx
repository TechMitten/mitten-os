'use client';

import React, { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';

export function MarkdownContent({ content }: { content: string }) {
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
    const codeIndex = codeMatch?.index !== undefined ? codeMatch.index : Infinity;
    const boldIndex = boldMatch?.index !== undefined ? boldMatch.index : Infinity;

    const cleanBoldMatch = boldMatch && boldIndex < codeIndex ? boldMatch : null;
    const italicMatch = remaining.match(/\*([^*]+)\*/);
    const italicIndex = italicMatch?.index !== undefined ? italicMatch.index : Infinity;
    const cleanBoldIndex = cleanBoldMatch?.index !== undefined ? cleanBoldMatch.index : Infinity;

    const cleanItalicMatch = italicMatch && italicIndex < codeIndex && italicIndex < cleanBoldIndex ? italicMatch : null;
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    const firstMatch = [codeMatch, cleanBoldMatch, cleanItalicMatch, linkMatch]
      .filter((m): m is RegExpMatchArray => m !== null && m.index !== undefined)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];

    if (!firstMatch || firstMatch.index === undefined) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (firstMatch.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, firstMatch.index)}</span>);
    }

    const matchLen = firstMatch[0].length;
    const matchIdx = firstMatch.index;

    if (firstMatch === codeMatch && codeMatch) {
      parts.push(
        <code key={key++} className="bg-muted dark:bg-zinc-700 px-1 py-0.5 rounded text-xs font-mono">
          {codeMatch[1]}
        </code>
      );
    } else if (firstMatch === cleanBoldMatch && cleanBoldMatch) {
      parts.push(<strong key={key++}>{cleanBoldMatch[1]}</strong>);
    } else if (firstMatch === cleanItalicMatch && cleanItalicMatch) {
      parts.push(<em key={key++}>{cleanItalicMatch[1]}</em>);
    } else if (firstMatch === linkMatch && linkMatch) {
      parts.push(
        <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
           className="text-blue-500 dark:text-blue-400 underline">
          {linkMatch[1]}
        </a>
      );
    }
    remaining = remaining.slice(matchIdx + matchLen);
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
      <pre className="bg-zinc-950 dark:bg-zinc-950 p-3 overflow-x-auto text-sm font-mono text-zinc-100 leading-relaxed os-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
}
