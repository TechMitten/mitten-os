import { create } from 'zustand';

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
  updateProfile: (profile: { name?: string; email?: string; avatar?: string }) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: DEFAULT_USER,
  session: DEFAULT_SESSION,
  loading: false,
  isGuest: false,
  isAuthenticated: true,

  initialize: async () => {
    if (typeof window === 'undefined') return;

    try {
      const storedProfile = localStorage.getItem('mittenos:user_profile');
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        const localUser: User = {
          ...DEFAULT_USER,
          ...parsed,
          user_metadata: {
            ...DEFAULT_USER.user_metadata,
            ...(parsed.user_metadata || {}),
            name: parsed.name || parsed.user_metadata?.name || DEFAULT_USER.user_metadata?.name,
            full_name: parsed.name || parsed.user_metadata?.full_name || DEFAULT_USER.user_metadata?.full_name,
            avatar_url: parsed.avatar || parsed.user_metadata?.avatar_url,
          },
        };
        set({
          user: localUser,
          session: { user: localUser },
          isGuest: false,
          isAuthenticated: true,
          loading: false,
        });
        return;
      }
    } catch (e) {
      console.warn('[AuthStore] Failed to load local profile from localStorage:', e);
    }

    set({
      user: DEFAULT_USER,
      session: DEFAULT_SESSION,
      isGuest: false,
      isAuthenticated: true,
      loading: false,
    });
  },

  updateProfile: (profile: { name?: string; email?: string; avatar?: string }) => {
    const currentUser = get().user || DEFAULT_USER;
    const name = profile.name ?? currentUser.user_metadata?.name ?? 'MittenOS User';
    const email = profile.email ?? currentUser.email ?? 'user@mittenos.local';
    const avatar = profile.avatar !== undefined ? profile.avatar : currentUser.avatar;

    const updatedUser: User = {
      ...currentUser,
      email,
      avatar,
      user_metadata: {
        ...currentUser.user_metadata,
        name,
        full_name: name,
        avatar_url: avatar,
      },
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'mittenos:user_profile',
          JSON.stringify({
            name,
            email,
            avatar,
          })
        );
      } catch (e) {
        console.error('[AuthStore] Failed to persist profile to localStorage:', e);
      }
    }

    set({
      user: updatedUser,
      session: { user: updatedUser },
    });
  },

  signOut: async () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('mittenos:user_profile');
      } catch (e) {
        console.error('[AuthStore] Failed to clear user profile:', e);
      }
    }

    set({
      user: DEFAULT_USER,
      session: DEFAULT_SESSION,
      isGuest: false,
      isAuthenticated: true,
      loading: false,
    });

    if (typeof window !== 'undefined') {
      try {
        const { useFileSystemStore } = await import('./filesystem-store');
        await useFileSystemStore.getState().loadFromDB(DEFAULT_USER.id);
      } catch (e) {
        console.error('[AuthStore] Failed to reload filesystem after reset:', e);
      }
    }
  },
}));
