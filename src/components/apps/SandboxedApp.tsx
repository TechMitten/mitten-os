'use client';

import React, { useMemo, useRef } from 'react';
import * as Babel from '@babel/standalone';
import { OSPortal } from '@/lib/os-bridge';
import { generateReactTemplate, generateHtmlTemplate } from '@/lib/os-bridge';

interface SandboxedAppProps {
  htmlContent?: string;
  compiledHtml?: string;
  sourceFiles?: Record<string, string>;
  windowId?: string;
  onIframeRef?: (ref: HTMLIFrameElement | null) => void;
}

interface SourceFile {
  path: string;
  content: string;
}

function resolveRelativeImport(importPath: string, currentPath: string): string {
  const currentDir = currentPath.split('/').slice(0, -1).join('/');
  const parts = currentDir.split('/').filter(Boolean);
  const importParts = importPath.split('/');

  for (const part of importParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }

  return parts.join('/');
}

function bundleSourceFiles(sourceFiles: Record<string, string>, entryPath: string): string {
  const compiled = new Map<string, string>();
  const loaded = new Set<string>();

  function compileAndLoad(path: string): string {
    if (loaded.has(path)) return '';
    loaded.add(path);

    const content = sourceFiles[path];
    if (!content) return '';

    let code: string;
    try {
      code = Babel.transform(content, {
        presets: [
          ['typescript', { isTSX: true, allExtensions: true }],
          ['react', { runtime: 'automatic' }],
        ],
        filename: path,
      }).code;
    } catch {
      code = content;
    }

    const relativeImportRe = /import\s+(?:[\s\S]*?)\s+from\s+['"](\.[^'"]+)['"]\s*;?/g;
    let processed = code;
    let match: RegExpExecArray | null;

    while ((match = relativeImportRe.exec(code)) !== null) {
      const importPath = match[1];
      const resolved = resolveRelativeImport(importPath, path);
      compileAndLoad(resolved);
      processed = processed.replace(match[0], `/* bundled: ${resolved} */`);
    }

    compiled.set(path, processed);
    return processed;
  }

  compileAndLoad(entryPath);

  const ordered = new Set<string>();
  function topoSort(p: string) {
    if (ordered.has(p)) return;
    ordered.add(p);
    const content = compiled.get(p) || '';
    const re = /\/\*\s*bundled:\s*([^\s*]+)\s*\*\//g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      topoSort(m[1]);
    }
  }
  topoSort(entryPath);

  const parts: string[] = [];
  for (const p of ordered) {
    parts.push(`// file: ${p}\n${compiled.get(p) || sourceFiles[p] || ''}`);
  }
  return parts.join('\n\n');
}

function isReactApp(sourceFiles: Record<string, string>): boolean {
  const values = Object.values(sourceFiles).join('\n');
  return (
    values.includes('import React') ||
    values.includes('from "react"') ||
    values.includes("from 'react'") ||
    values.includes('.tsx') ||
    values.includes('.jsx') ||
    values.includes('createRoot') ||
    values.includes('ReactDOM')
  );
}

function findEntryPath(sourceFiles: Record<string, string>): string {
  const paths = Object.keys(sourceFiles);
  const indexPaths = ['src/index.tsx', 'src/index.jsx', 'src/index.ts', 'src/index.js',
    'index.tsx', 'index.jsx', 'App.tsx', 'App.jsx'];
  for (const p of indexPaths) {
    if (paths.includes(p)) return p;
  }
  return paths[0] || '';
}

export function SandboxedApp({
  htmlContent,
  compiledHtml,
  sourceFiles,
  windowId = 'sandbox',
  onIframeRef,
}: SandboxedAppProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const wrapped = useMemo(() => {
    if (compiledHtml) {
      return compiledHtml;
    }

    if (sourceFiles && Object.keys(sourceFiles).length > 0 && isReactApp(sourceFiles)) {
      const entryPath = findEntryPath(sourceFiles);
      const bundled = bundleSourceFiles(sourceFiles, entryPath);

      return generateReactTemplate({
        compiledCode: bundled,
        entryPoint: 'App',
      });
    }

    if (sourceFiles && Object.keys(sourceFiles).length > 0) {
      const entryPath = findEntryPath(sourceFiles);
      return generateReactTemplate({
        compiledCode: sourceFiles[entryPath] || '',
      });
    }

    if (htmlContent) {
      return generateHtmlTemplate(htmlContent);
    }

    return generateHtmlTemplate('<div style="color:#888;text-align:center;padding:40px;">No content</div>');
  }, [htmlContent, compiledHtml, sourceFiles]);

  const setIframeRef = (el: HTMLIFrameElement | null) => {
    iframeRef.current = el;
    onIframeRef?.(el);
  };

  return (
    <OSPortal windowId={windowId} onIframeRef={setIframeRef}>
      <iframe
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        title="User App"
        srcDoc={wrapped}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
      />
    </OSPortal>
  );
}

export default SandboxedApp;
