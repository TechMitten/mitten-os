import { create } from 'zustand';
import {
  getPB,
  loginWithPassword,
  signUpWithPassword,
  logoutPB,
} from '@/lib/pocketbase';

export interface User {
  id: string;
  aud?: string;
  role?: string;
  email?: string;
  created_at?: string;
  avatar?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
}

export interface Session {
  user: User;
  token?: string;
}

const DEFAULT_USER: User = {
  id: 'mitten-user',
  email: 'user@mittenos.local',
  user_metadata: {
    full_name: 'MittenOS User',
    name: 'MittenOS User',
  },
  created_at: new Date().toISOString(),
};

const DEFAULT_SESSION: Session = {
  user: DEFAULT_USER,
};

export function isGuestUser(userId: string | undefined): boolean {
  return !userId || userId === 'mitten-user';
}

interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  signInWithPassword: (email: string, pass: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, pass: string, passConfirm: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: DEFAULT_USER,
  session: DEFAULT_SESSION,
  loading: false,
  isGuest: true,
  isAuthenticated: false,

  initialize: async () => {
    if (typeof window === 'undefined') return;

    const pb = getPB();

    // Check if PocketBase has valid stored session
    if (pb.authStore.isValid && pb.authStore.record) {
      const record = pb.authStore.record;
      const avatarUrl = record.avatar
        ? pb.files.getURL(record, record.avatar)
        : undefined;

      const pbUser: User = {
        id: record.id,
        email: record.email || '',
        avatar: avatarUrl,
        created_at: record.created,
        user_metadata: {
          name: record.name || record.email?.split('@')[0] || 'User',
          full_name: record.name || record.email?.split('@')[0] || 'User',
          avatar_url: avatarUrl,
        },
      };

      set({
        user: pbUser,
        session: { user: pbUser, token: pb.authStore.token },
        isGuest: false,
        isAuthenticated: true,
        loading: false,
      });
    } else {
      set({
        user: DEFAULT_USER,
        session: DEFAULT_SESSION,
        isGuest: true,
        isAuthenticated: false,
        loading: false,
      });
    }

    // Subscribe to auth state changes
    pb.authStore.onChange((token, model) => {
      if (token && model) {
        const record = model as any;
        const avatarUrl = record.avatar
          ? pb.files.getURL(record, record.avatar)
          : undefined;

        const pbUser: User = {
          id: record.id,
          email: record.email || '',
          avatar: avatarUrl,
          created_at: record.created,
          user_metadata: {
            name: record.name || record.email?.split('@')[0] || 'User',
            full_name: record.name || record.email?.split('@')[0] || 'User',
            avatar_url: avatarUrl,
          },
        };

        set({
          user: pbUser,
          session: { user: pbUser, token },
          isGuest: false,
          isAuthenticated: true,
        });
      } else {
        set({
          user: DEFAULT_USER,
          session: DEFAULT_SESSION,
          isGuest: true,
          isAuthenticated: false,
        });
      }
    });
  },

  signInWithPassword: async (email: string, pass: string) => {
    set({ loading: true });
    try {
      const authData = await loginWithPassword(email, pass);
      const record = authData.record;
      const pb = getPB();
      const avatarUrl = record.avatar
        ? pb.files.getURL(record, record.avatar)
        : undefined;

      const pbUser: User = {
        id: record.id,
        email: record.email || '',
        avatar: avatarUrl,
        created_at: record.created,
        user_metadata: {
          name: record.name || record.email?.split('@')[0] || 'User',
          full_name: record.name || record.email?.split('@')[0] || 'User',
          avatar_url: avatarUrl,
        },
      };

      set({
        user: pbUser,
        session: { user: pbUser, token: authData.token },
        isGuest: false,
        isAuthenticated: true,
        loading: false,
      });

      // Reload filesystem and desktop state for the newly logged-in user
      if (typeof window !== 'undefined') {
        try {
          const { useFileSystemStore } = await import('./filesystem-store');
          await useFileSystemStore.getState().loadFromDB(pbUser.id);
        } catch (e) {
          console.error('[AuthStore] Failed to reload filesystem for user:', e);
        }
      }

      return { error: null };
    } catch (err: any) {
      set({ loading: false });
      return { error: err.message || 'Failed to sign in. Please check your email and password.' };
    }
  },

  signUpWithPassword: async (email: string, pass: string, passConfirm: string, name?: string) => {
    set({ loading: true });
    try {
      const { authData } = await signUpWithPassword(email, pass, passConfirm, name);
      const record = authData.record;
      const pb = getPB();
      const avatarUrl = record.avatar
        ? pb.files.getURL(record, record.avatar)
        : undefined;

      const pbUser: User = {
        id: record.id,
        email: record.email || '',
        avatar: avatarUrl,
        created_at: record.created,
        user_metadata: {
          name: record.name || name || record.email?.split('@')[0] || 'User',
          full_name: record.name || name || record.email?.split('@')[0] || 'User',
          avatar_url: avatarUrl,
        },
      };

      set({
        user: pbUser,
        session: { user: pbUser, token: authData.token },
        isGuest: false,
        isAuthenticated: true,
        loading: false,
      });

      if (typeof window !== 'undefined') {
        try {
          const { useFileSystemStore } = await import('./filesystem-store');
          await useFileSystemStore.getState().loadFromDB(pbUser.id);
        } catch (e) {
          console.error('[AuthStore] Failed to initialize filesystem for new user:', e);
        }
      }

      return { error: null };
    } catch (err: any) {
      set({ loading: false });
      return { error: err.message || 'Failed to create account.' };
    }
  },

  signOut: async () => {
    logoutPB();
    set({
      user: DEFAULT_USER,
      session: DEFAULT_SESSION,
      isGuest: true,
      isAuthenticated: false,
      loading: false,
    });

    if (typeof window !== 'undefined') {
      try {
        const { useFileSystemStore } = await import('./filesystem-store');
        await useFileSystemStore.getState().loadFromDB(DEFAULT_USER.id);
      } catch (e) {
        console.error('[AuthStore] Failed to reload filesystem after sign out:', e);
      }
    }
  },
}));
