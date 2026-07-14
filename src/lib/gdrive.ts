import type { FSNode } from '@/types/os';

const GDRIVE_ROOT_FOLDER_NAME = 'MittenOS';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiry: number;
}

interface PendingWrite {
  content: string;
  mimeType: string;
  timestamp: number;
}

// Queue for limiting concurrency (max 3 concurrent Google Drive requests)
class RequestQueue {
  private activeCount = 0;
  private queue: (() => Promise<any>)[] = [];

  constructor(private maxConcurrency = 3) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.maxConcurrency) {
      return this.execute(task);
    }
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await this.execute(task);
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  private async execute<T>(task: () => Promise<T>): Promise<T> {
    this.activeCount++;
    try {
      return await task();
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeCount < this.maxConcurrency) {
      const nextTask = this.queue.shift();
      if (nextTask) nextTask();
    }
  }
}

const reqQueue = new RequestQueue(3);

class GoogleDriveVFS {
  private refreshingPromise: Promise<string | null> | null = null;
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  isConnected(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('mittenos:gdrive:refresh_token');
  }

  getTokens(): TokenState | null {
    if (typeof window === 'undefined') return null;
    const accessToken = localStorage.getItem('mittenos:gdrive:access_token');
    const refreshToken = localStorage.getItem('mittenos:gdrive:refresh_token');
    const expiryStr = localStorage.getItem('mittenos:gdrive:token_expiry');

    if (!accessToken || !refreshToken || !expiryStr) return null;
    return {
      accessToken,
      refreshToken,
      expiry: parseInt(expiryStr, 10),
    };
  }

  connect(tokens: { accessToken: string; refreshToken: string | null; expiresIn: number }) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('mittenos:gdrive:access_token', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('mittenos:gdrive:refresh_token', tokens.refreshToken);
    }
    const expiry = Date.now() + tokens.expiresIn * 1000;
    localStorage.setItem('mittenos:gdrive:token_expiry', expiry.toString());
    localStorage.setItem('mittenos:fs_backend', 'gdrive');
  }

  disconnect() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('mittenos:gdrive:access_token');
    localStorage.removeItem('mittenos:gdrive:refresh_token');
    localStorage.removeItem('mittenos:gdrive:token_expiry');
    localStorage.removeItem('mittenos:gdrive:root_id');
    localStorage.setItem('mittenos:fs_backend', 'local');
    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  private async getOrRefreshAccessToken(): Promise<string | null> {
    const tokens = this.getTokens();
    if (!tokens) return null;

    const now = Date.now();
    // If the token is valid for more than 5 minutes, use it
    if (tokens.expiry - now > 5 * 60 * 1000) {
      return tokens.accessToken;
    }

    if (this.refreshingPromise) {
      return this.refreshingPromise;
    }

    this.refreshingPromise = (async () => {
      try {
        console.log('[GDrive] Refreshing access token...');
        const res = await fetch('/api/auth/google/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: tokens.refreshToken }),
        });

        if (!res.ok) {
          throw new Error(`Token refresh endpoint returned status ${res.status}`);
        }

        const data = await res.json();
        if (data?.access_token) {
          const newExpiry = Date.now() + (data.expires_in || 3600) * 1000;
          localStorage.setItem('mittenos:gdrive:access_token', data.access_token);
          localStorage.setItem('mittenos:gdrive:token_expiry', newExpiry.toString());
          console.log('[GDrive] Token refreshed successfully.');
          return data.access_token;
        }
        return null;
      } catch (err) {
        console.error('[GDrive] Failed to refresh Google Drive token:', err);
        return null;
      } finally {
        this.refreshingPromise = null;
      }
    })();

    return this.refreshingPromise;
  }

  // Robust Fetch Wrapper with Queueing, Retries, Exponential Backoff, Jitter and Token Refresh
  private async driveFetch(
    url: string,
    options: RequestInit = {},
    retries = 3,
    delay = 1000
  ): Promise<Response> {
    return reqQueue.run(async () => {
      const accessToken = await this.getOrRefreshAccessToken();
      if (!accessToken) {
        throw new Error('Google Drive is not authenticated');
      }

      const headers = new Headers(options.headers || {});
      headers.set('Authorization', `Bearer ${accessToken}`);
      const finalOptions = { ...options, headers };

      try {
        const res = await fetch(url, finalOptions);

        if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
          if (retries > 0) {
            const jitter = Math.random() * 200;
            const nextDelay = delay * 2 + jitter;
            console.warn(
              `[GDrive] Warning: Status ${res.status}. Retrying in ${nextDelay.toFixed(0)}ms... (${retries} retries left)`
            );
            await new Promise((resolve) => setTimeout(resolve, nextDelay));
            return this.driveFetch(url, options, retries - 1, nextDelay);
          }
        }
        return res;
      } catch (err) {
        if (retries > 0) {
          const jitter = Math.random() * 200;
          const nextDelay = delay * 2 + jitter;
          console.warn(
            `[GDrive] Network error. Retrying in ${nextDelay.toFixed(0)}ms...`,
            err
          );
          await new Promise((resolve) => setTimeout(resolve, nextDelay));
          return this.driveFetch(url, options, retries - 1, nextDelay);
        }
        throw err;
      }
    });
  }

  async getRootFolderId(): Promise<string> {
    if (typeof window === 'undefined') return '';
    const cachedRootId = localStorage.getItem('mittenos:gdrive:root_id');
    if (cachedRootId) return cachedRootId;

    // Search for existing root folder
    const searchUrl =
      'https://www.googleapis.com/drive/v3/files?' +
      new URLSearchParams({
        q: `name = '${GDRIVE_ROOT_FOLDER_NAME}' and mimeType = '${FOLDER_MIME_TYPE}' and 'root' in parents and trashed = false`,
        fields: 'files(id)',
        pageSize: '1',
      });

    const res = await this.driveFetch(searchUrl);
    if (!res.ok) {
      throw new Error(`Failed to search root folder: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      const id = data.files[0].id;
      localStorage.setItem('mittenos:gdrive:root_id', id);
      return id;
    }

    // Create root folder
    console.log('[GDrive] Root folder not found, creating MittenOS root folder...');
    const createRes = await this.driveFetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: GDRIVE_ROOT_FOLDER_NAME,
        mimeType: FOLDER_MIME_TYPE,
        parents: ['root'],
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create root folder: ${createRes.statusText}`);
    }

    const createdData = await createRes.json();
    const id = createdData.id;
    localStorage.setItem('mittenos:gdrive:root_id', id);
    return id;
  }

  // Load filesystem tree metadata
  async loadRoot(): Promise<FSNode> {
    const rootId = await this.getRootFolderId();

    // Prior to loading, flush any local pending writes to ensure the cloud matches client intentions
    await this.flushPendingWrites();

    // Fetch all metadata for files we created
    let filesList: any[] = [];
    let pageToken = '';

    do {
      const params: Record<string, string> = {
        q: 'trashed = false',
        fields: 'nextPageToken, files(id, name, mimeType, parents, createdTime, modifiedTime, size)',
        pageSize: '1000',
      };
      if (pageToken) {
        params.pageToken = pageToken;
      }

      const listUrl = 'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams(params);
      const res = await this.driveFetch(listUrl);
      if (!res.ok) {
        throw new Error(`Failed to list files: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.files) {
        filesList = filesList.concat(data.files);
      }
      pageToken = data.nextPageToken || '';
    } while (pageToken);

    return this.buildTree(rootId, filesList);
  }

  private buildTree(gDriveRootId: string, files: any[]): FSNode {
    const rootNode: FSNode = {
      id: 'root',
      name: '/',
      type: 'folder',
      parentId: null,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      children: [],
    };

    const nodeMap = new Map<string, FSNode>();
    nodeMap.set(gDriveRootId, rootNode);

    // Pass 1: Build nodes
    for (const file of files) {
      if (file.id === gDriveRootId) continue;

      const isFolder = file.mimeType === FOLDER_MIME_TYPE;
      const parentId = file.parents && file.parents.length > 0 ? file.parents[0] : null;

      const node: FSNode = {
        id: file.id,
        name: file.name,
        type: isFolder ? 'folder' : 'file',
        parentId: parentId,
        createdAt: new Date(file.createdTime || Date.now()).getTime(),
        modifiedAt: new Date(file.modifiedTime || Date.now()).getTime(),
        mimeType: file.mimeType,
        children: isFolder ? [] : undefined,
      };

      nodeMap.set(file.id, node);
    }

    // Pass 2: Establish tree hierarchies
    for (const [id, node] of nodeMap.entries()) {
      if (id === gDriveRootId) continue;

      const parentIdLookup = node.parentId;
      const parentNode = parentIdLookup ? nodeMap.get(parentIdLookup) : null;
      if (parentNode && parentNode.children) {
        parentNode.children.push(node);
      }

      if (node.parentId === gDriveRootId) {
        node.parentId = 'root';
      }
    }

    return rootNode;
  }

  // Lazy load file content from Google Drive
  async fetchFileContent(fileId: string): Promise<string> {
    // If the file is in local pending writes, use that
    const pending = this.getPendingWrites();
    if (pending[fileId]) {
      return pending[fileId].content;
    }

    const res = await this.driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    if (res.status === 404) return '';
    if (!res.ok) {
      throw new Error(`Failed to fetch file content for ${fileId}: ${res.statusText}`);
    }
    return res.text();
  }

  // Create folder
  async createFolder(parentId: string, name: string): Promise<FSNode> {
    const gDriveParentId = parentId === 'root' ? await this.getRootFolderId() : parentId;

    const res = await this.driveFetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mimeType: FOLDER_MIME_TYPE,
        parents: [gDriveParentId],
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to create folder: ${res.statusText}`);
    }

    const file = await res.json();
    return {
      id: file.id,
      name,
      type: 'folder',
      parentId,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      children: [],
    };
  }

  // Create file (using multipart to upload name + initial empty content)
  async createFile(parentId: string, name: string, content = '', mimeType = 'text/plain'): Promise<FSNode> {
    const gDriveParentId = parentId === 'root' ? await this.getRootFolderId() : parentId;

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name,
      mimeType,
      parents: [gDriveParentId],
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      content +
      closeDelimiter;

    const res = await this.driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      throw new Error(`Failed to create file: ${res.statusText}`);
    }

    const file = await res.json();
    return {
      id: file.id,
      name,
      type: 'file',
      content,
      parentId,
      mimeType,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
  }

  // Delete file or folder
  async deleteNode(id: string): Promise<void> {
    // Clear any pending write for this file
    this.removePendingWrite(id);

    const res = await this.driveFetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok && res.status !== 404) {
      throw new Error(`Failed to delete node ${id}: ${res.statusText}`);
    }
  }

  // Rename node
  async renameNode(id: string, newName: string): Promise<void> {
    const res = await this.driveFetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) {
      throw new Error(`Failed to rename node ${id}: ${res.statusText}`);
    }
  }

  // Debounced write-behind update content
  async updateFileContent(id: string, content: string, mimeType = 'text/plain'): Promise<void> {
    // 1. Queue this write locally in localStorage so that we survive crashes
    this.queuePendingWrite(id, content, mimeType);

    // 2. Debounce the actual Google Drive API upload
    const existingTimer = this.debounceTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      try {
        await this.uploadFileContent(id, content, mimeType);
        this.removePendingWrite(id);
        console.log(`[GDrive] Successfully flushed write for file: ${id}`);
      } catch (err) {
        console.error(`[GDrive] Failed to flush write for file ${id}:`, err);
      } finally {
        this.debounceTimers.delete(id);
      }
    }, 2000); // 2-second debounce

    this.debounceTimers.set(id, timer);
  }

  // Actual API call to upload content
  private async uploadFileContent(id: string, content: string, mimeType: string): Promise<void> {
    const res = await this.driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Content-Type': mimeType,
      },
      body: content,
    });

    if (!res.ok) {
      throw new Error(`Upload returned status ${res.status}: ${res.statusText}`);
    }
  }

  // ─── Local Write-Behind Queue Persistence ────────────────────────────────
  private getPendingWrites(): Record<string, PendingWrite> {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem('mittenos:gdrive:pending_writes');
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private queuePendingWrite(id: string, content: string, mimeType: string) {
    const pending = this.getPendingWrites();
    pending[id] = { content, mimeType, timestamp: Date.now() };
    localStorage.setItem('mittenos:gdrive:pending_writes', JSON.stringify(pending));
  }

  private removePendingWrite(id: string) {
    const pending = this.getPendingWrites();
    delete pending[id];
    localStorage.setItem('mittenos:gdrive:pending_writes', JSON.stringify(pending));
  }

  // Force flush all pending writes immediately (e.g. on loadRoot or before unload)
  async flushPendingWrites(): Promise<void> {
    const pending = this.getPendingWrites();
    const ids = Object.keys(pending);
    if (ids.length === 0) return;

    console.log(`[GDrive] Flushing ${ids.length} pending writes before load...`);
    for (const id of ids) {
      const { content, mimeType } = pending[id];
      try {
        // Clear timer if running
        const timer = this.debounceTimers.get(id);
        if (timer) {
          clearTimeout(timer);
          this.debounceTimers.delete(id);
        }

        await this.uploadFileContent(id, content, mimeType);
        this.removePendingWrite(id);
      } catch (err) {
        console.error(`[GDrive] Failed to flush write for file ${id} during boot:`, err);
      }
    }
  }
}

export const gdriveVFS = new GoogleDriveVFS();
