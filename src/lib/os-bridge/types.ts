export interface OSBridgeRequest {
  type: string;
  payload: Record<string, unknown>;
  requestId: string;
}

export interface OSBridgeResponse {
  requestId: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface OSBridgeEvent {
  type: string;
  payload: Record<string, unknown>;
}

export interface OSAPI {
  window: {
    setTitle: (title: string) => void;
    close: () => void;
    minimize: () => void;
  };
  fs: {
    readFile: (path: string) => Promise<string | null>;
    writeFile: (path: string, content: string) => Promise<void>;
    listDir: (path: string) => Promise<string[]>;
  };
  notifications: {
    show: (title: string, message: string, type?: "info" | "warning" | "error" | "success") => void;
  };
  apps: {
    open: (appId: string) => void;
  };
}

declare global {
  interface Window {
    mittenOS?: OSAPI;
  }
}
