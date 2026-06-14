import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { saveAccount } from '@/lib/saved-accounts'
import {
  getOrCreateGuestId,
  setPendingAuthAction,
  getPendingAuthAction,
  clearPendingAuthAction,
  migrateGuestToSupabase,
  clearGuestData,
  type AuthAction,
} from '@/lib/guest-storage'
import type { User, Session } from '@supabase/supabase-js'

interface AuthStore {
  user: User | null
  session: Session | null
  loading: boolean
  isGuest: boolean

  initialize: () => Promise<void>
  signInAsGuest: (guestId?: string) => void
  sendOtp: (email: string, action?: AuthAction) => Promise<{ error: string | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

function makeGuestUser(guestId: string): User {
  return {
    id: guestId,
    app_metadata: {},
    user_metadata: {},
    aud: '',
    created_at: '',
    email: undefined,
    phone: undefined,
    confirmed_at: undefined,
    email_confirmed_at: undefined,
    phone_confirmed_at: undefined,
    last_sign_in_at: undefined,
    role: '',
    updated_at: undefined,
    identities: undefined,
    is_anonymous: true,
    factors: undefined,
  } as unknown as User
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

    if (session?.user) {
      set({
        session,
        user: session.user,
        loading: false,
        isGuest: false,
      })
    } else {
      const guestId = getOrCreateGuestId()
      set({
        session: null,
        user: makeGuestUser(guestId),
        loading: false,
        isGuest: true,
      })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const pending = getPendingAuthAction()
        const wasGuest = get().isGuest

        if (pending && pending.action === 'signup' && wasGuest) {
          await migrateGuestToSupabase(pending.guestId, session.user.id)
        } else if (pending && pending.action === 'signin' && wasGuest) {
          clearGuestData(pending.guestId)
        }

        clearPendingAuthAction()

        set({
          session,
          user: session.user,
          loading: false,
          isGuest: false,
        })

        saveAccount({
          id: session.user.id,
          email: session.user.email ?? '',
          avatarUrl: session.user.user_metadata?.avatar_url ?? undefined,
          displayName: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? undefined,
          lastLogin: new Date().toISOString(),
        })
      } else if (event === 'SIGNED_OUT') {
        const guestId = getOrCreateGuestId()
        set({
          session: null,
          user: makeGuestUser(guestId),
          loading: false,
          isGuest: true,
        })
      } else if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        set({
          session,
          user: session?.user ?? get().user,
        })
      }
    })
  },

  signInAsGuest: (guestId?: string) => {
    const id = guestId ?? getOrCreateGuestId()
    set({
      user: makeGuestUser(id),
      session: null,
      loading: false,
      isGuest: true,
    })
  },

  sendOtp: async (email: string, action?: AuthAction) => {
    const supabase = createClient()
    if (action) {
      setPendingAuthAction(action, get().user?.id ?? getOrCreateGuestId())
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })
    if (error) {
      clearPendingAuthAction()
      return { error: error.message }
    }
    return { error: null }
  },

  verifyOtp: async (email: string, token: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    if (error) return { error: error.message }
    return { error: null }
  },

  signOut: async () => {
    const { isGuest } = get()
    const supabase = createClient()

    if (!isGuest) {
      await supabase.auth.signOut()
    }

    const guestId = getOrCreateGuestId()
    set({
      user: makeGuestUser(guestId),
      session: null,
      loading: false,
      isGuest: true,
    })
  },
}))
