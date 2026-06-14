'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useWindowStore } from '@/stores/window-store';
import { useDesktopStore } from '@/stores/desktop-store';
import { useFileSystemStore } from '@/stores/filesystem-store';
import type { OSBridgeRequest } from './types';

interface OSPortalProps {
  windowId: string;
  children: React.ReactNode;
  onIframeRef?: (ref: HTMLIFrameElement | null) => void;
}

export function OSPortal({ windowId, children, onIframeRef }: OSPortalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const setIframeRef = useCallback((el: HTMLIFrameElement | null) => {
    iframeRef.current = el;
    onIframeRef?.(el);
  }, [onIframeRef]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data as Partial<OSBridgeRequest>;
      if (!data || typeof data.type !== 'string' || !data.requestId) return;

      const respond = (success: boolean, result?: unknown, error?: string) => {
        iframeRef.current?.contentWindow?.postMessage(
          { requestId: data.requestId, success, result, error },
          '*'
        );
      };

      try {
        switch (data.type) {
          case 'window.setTitle': {
            useWindowStore.getState().updateWindowTitle(windowId, data.payload?.title as string);
            respond(true);
            break;
          }
          case 'window.close': {
            useWindowStore.getState().closeWindow(windowId);
            respond(true);
            break;
          }
          case 'window.minimize': {
            useWindowStore.getState().minimizeWindow(windowId);
            respond(true);
            break;
          }
          case 'fs.readFile': {
            const path = data.payload?.path as string;
            const fs = useFileSystemStore.getState();
            const node = findNodeByPath(fs.nodes, path);
            respond(true, { content: node?.content ?? null });
            break;
          }
          case 'fs.writeFile': {
            const path = data.payload?.path as string;
            const content = data.payload?.content as string;
            const fs = useFileSystemStore.getState();
            writeNodeByPath(fs, path, content);
            respond(true);
            break;
          }
          case 'fs.listDir': {
            const path = data.payload?.path as string;
            const fs = useFileSystemStore.getState();
            const node = findNodeByPath(fs.nodes, path);
            const children = node?.children
              ? fs.nodes.filter((n) => n.parentId === node.id).map((n) => n.name)
              : [];
            respond(true, { entries: children });
            break;
          }
          case 'notifications.show': {
            useDesktopStore.getState().addNotification({
              title: (data.payload?.title as string) || '',
              message: (data.payload?.message as string) || '',
              type: (data.payload?.type as 'info' | 'warning' | 'error' | 'success') || 'info',
            });
            respond(true);
            break;
          }
          case 'apps.open': {
            useWindowStore.getState().openWindow(data.payload?.appId as string);
            respond(true);
            break;
          }
          default:
            respond(false, undefined, `Unknown method: ${data.type}`);
        }
      } catch (err) {
        respond(false, undefined, err instanceof Error ? err.message : 'Unknown error');
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [windowId]);

  if (!React.isValidElement(children)) return children as React.ReactElement;

  return React.cloneElement(children as React.ReactElement<{ ref?: (el: HTMLIFrameElement | null) => void }>, {
    ref: setIframeRef,
  });
}

function findNodeByPath(nodes: { id: string; name: string; parentId: string | null; content?: string; type: string; children?: { id: string }[] }[], path: string): { content?: string; id?: string } | null {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  let current = nodes.find((n) => n.parentId === null && n.name === parts[0]);
  if (!current) return null;

  for (let i = 1; i < parts.length; i++) {
    const childId = current.children?.find((c) => {
      const node = nodes.find((n) => n.id === c.id);
      return node?.name === parts[i];
    })?.id;
    if (!childId) return null;
    const child = nodes.find((n) => n.id === childId);
    if (!child) return null;
    current = child;
  }

  return current;
}

function writeNodeByPath(
  fs: { nodes: { id: string; name: string; parentId: string | null; content?: string; type: string }[]; updateNode: (id: string, updates: { content?: string; name?: string }) => void },
  path: string,
  content: string
) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return;

  let current = fs.nodes.find((n) => n.parentId === null && n.name === parts[0]);
  if (!current) return;

  for (let i = 1; i < parts.length; i++) {
    const childId = current.children?.find((c) => {
      const node = fs.nodes.find((n) => n.id === c.id);
      return node?.name === parts[i];
    })?.id;
    if (!childId) return;
    const child = fs.nodes.find((n) => n.id === childId);
    if (!child) return;
    current = child;
  }

  fs.updateNode(current.id, { content });
}
