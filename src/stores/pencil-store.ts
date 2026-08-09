import { create } from 'zustand';

const STORAGE_KEY = 'mittenos:pencil:documents';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface PencilDocument {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface PencilStore {
  documents: PencilDocument[];
  loaded: boolean;

  load: () => void;
  createDocument: (title?: string) => string;
  updateDocument: (id: string, patch: Partial<Pick<PencilDocument, 'title' | 'content'>>) => void;
  deleteDocument: (id: string) => void;
  duplicateDocument: (id: string) => string | null;
  getDocument: (id: string) => PencilDocument | undefined;
}

function persistDocuments(documents: PencilDocument[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  } catch (e) {
    console.error('Failed to persist Pencil documents to localStorage:', e);
  }
}

export const usePencilStore = create<PencilStore>((set, get) => ({
  documents: [],
  loaded: false,

  load: () => {
    if (get().loaded || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const documents: PencilDocument[] = saved ? JSON.parse(saved) : [];
      set({ documents, loaded: true });
    } catch (e) {
      console.error('Failed to load Pencil documents from localStorage:', e);
      set({ documents: [], loaded: true });
    }
  },

  createDocument: (title = 'Untitled document') => {
    const now = Date.now();
    const doc: PencilDocument = {
      id: generateId(),
      title,
      content: '',
      createdAt: now,
      updatedAt: now,
    };
    set((state) => {
      const documents = [doc, ...state.documents];
      persistDocuments(documents);
      return { documents };
    });
    return doc.id;
  },

  updateDocument: (id, patch) => {
    set((state) => {
      const documents = state.documents.map((d) =>
        d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d
      );
      persistDocuments(documents);
      return { documents };
    });
  },

  deleteDocument: (id) => {
    set((state) => {
      const documents = state.documents.filter((d) => d.id !== id);
      persistDocuments(documents);
      return { documents };
    });
  },

  duplicateDocument: (id) => {
    const source = get().documents.find((d) => d.id === id);
    if (!source) return null;
    const now = Date.now();
    const copy: PencilDocument = {
      ...source,
      id: generateId(),
      title: `${source.title} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => {
      const documents = [copy, ...state.documents];
      persistDocuments(documents);
      return { documents };
    });
    return copy.id;
  },

  getDocument: (id) => get().documents.find((d) => d.id === id),
}));
