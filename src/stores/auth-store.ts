import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function createGuestUser(): User {
  const id = `guest-${generateUUID()}`
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: 'guest',
    created_at: new Date().toISOString(),
    email: 'guest@mittenos.local',
    role: 'guest',
  } as User
}

export function isGuestUser(userId: string | undefined): boolean {
  return !!userId && userId.startsWith('guest-')
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

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  isGuest: false,

  initialize: async () => {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    set({
      session,
      user: session?.user ?? null,
      loading: false,
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      })
    })
  },

  signInAsGuest: () => {
    const guestUser = createGuestUser()
    set({ user: guestUser, session: null, loading: false, isGuest: true })
  },

  signInWithGithub: async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) return { error: error.message }
    return { error: null }
  },

  signOut: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ user: null, session: null, isGuest: false })
  },
}))
