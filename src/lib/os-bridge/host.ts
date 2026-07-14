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
            const normalizedPath = path.startsWith('/') ? path : '/' + path;
            const node = fs.getNode(normalizedPath);
            if (node && node.type === 'file') {
              fs.fetchFileContentIfNeeded(node.id)
                .then((content) => {
                  respond(true, { content });
                })
                .catch((err) => {
                  respond(false, undefined, err.message);
                });
            } else {
              respond(true, { content: null });
            }
            break;
          }
          case 'fs.writeFile': {
            const path = data.payload?.path as string;
            const content = data.payload?.content as string;
            const fs = useFileSystemStore.getState();
            
            const normalizedPath = path.startsWith('/') ? path : '/' + path;
            const parts = normalizedPath.split('/').filter(Boolean);
            if (parts.length === 0) {
              respond(false, undefined, "Invalid path");
              break;
            }
            
            const name = parts[parts.length - 1];
            const parentParts = parts.slice(0, -1);
            const parentPath = '/' + parentParts.join('/');
            
            const parentNode = fs.getNode(parentPath);
            if (!parentNode || parentNode.type !== 'folder') {
              respond(false, undefined, `Parent directory does not exist: ${parentPath}`);
              break;
            }

            const existingNode = fs.getNode(normalizedPath);
            if (existingNode) {
              fs.updateFileContent(existingNode.id, content)
                .then(() => {
                  respond(true);
                })
                .catch((err) => {
                  respond(false, undefined, err.message);
                });
            } else {
              fs.createFile(parentNode.id, name, content)
                .then(() => {
                  respond(true);
                })
                .catch((err) => {
                  respond(false, undefined, err.message);
                });
            }
            break;
          }
          case 'fs.listDir': {
            const path = data.payload?.path as string;
            const fs = useFileSystemStore.getState();
            const normalizedPath = path.startsWith('/') ? path : '/' + path;
            const node = fs.getNode(normalizedPath);
            if (node && node.type === 'folder') {
              const children = fs.getChildren(node.id).map((c) => c.name);
              respond(true, { entries: children });
            } else {
              respond(true, { entries: [] });
            }
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
          case 'ai.chat': {
            const messages = data.payload?.messages as any[];
            const options = data.payload?.options as any;
            
            const endpoint = localStorage.getItem('mittenOS_keys_endpoint') || '';
            const apiKey = localStorage.getItem('mittenOS_keys_apikey') || '';
            const model = localStorage.getItem('mittenOS_keys_model') || '';

            if (!endpoint || !apiKey || !model) {
              respond(false, undefined, 'AI API configurations are missing. Please open the Keys app and configure your endpoint, API key, and model.');
              break;
            }

            const cleanUrl = endpoint.trim();
            const targetUrl = cleanUrl.endsWith('/chat/completions')
              ? cleanUrl
              : `${cleanUrl.replace(/\/$/, '')}/chat/completions`;

            fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`,
              },
              body: JSON.stringify({
                model: model.trim(),
                messages: messages,
                stream: false,
                temperature: options?.temperature ?? 0.7,
              }),
            })
              .then(async (res) => {
                if (res.ok) {
                  const json = await res.json();
                  respond(true, json);
                } else {
                  const text = await res.text();
                  respond(false, undefined, `API Error ${res.status}: ${text.substring(0, 100)}`);
                }
              })
              .catch((err) => {
                respond(false, undefined, err.message);
              });
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

  if (!React.isValidElement(children)) {
    return children as unknown as React.ReactElement;
  }

  // Safely clone React element with dynamic ref forwarding
  return React.cloneElement(children as unknown as React.ReactElement<{ ref?: (el: HTMLIFrameElement | null) => void }>, {
    ref: setIframeRef,
  });
}
