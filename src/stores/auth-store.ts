import { create } from 'zustand'

export interface User {
  id: string
  aud?: string
  role?: string
  email?: string
  created_at?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: {
    full_name?: string
    name?: string
    [key: string]: any
  }
}

export interface Session {
  user: User
}

const DEFAULT_USER: User = {
  id: 'mitten-user',
  email: 'user@mittenos.local',
  user_metadata: {
    full_name: 'MittenOS User',
    name: 'MittenOS User',
  },
  created_at: new Date().toISOString(),
}

const DEFAULT_SESSION: Session = {
  user: DEFAULT_USER
}

export function isGuestUser(userId: string | undefined): boolean {
  return false
}

interface AuthStore {
  user: User | null
  session: Session | null
  loading: boolean
  isGuest: boolean

  initialize: () => Promise<void>
  signInAsGuest: () => void
  signInWithGithub: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: DEFAULT_USER,
  session: DEFAULT_SESSION,
  loading: false,
  isGuest: false,

  initialize: async () => {
    // No-op since we are already authenticated as DEFAULT_USER
  },

  signInAsGuest: () => {},
  signInWithGithub: async () => ({ error: null }),
  signOut: async () => {},
}))


