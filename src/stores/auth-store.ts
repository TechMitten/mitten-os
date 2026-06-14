import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

interface AuthStore {
  user: User | null
  session: Session | null
  loading: boolean

  initialize: () => Promise<void>
  checkUserExists: (email: string) => Promise<{ exists: boolean; emailConfirmed: boolean } | null>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  resendConfirmation: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: true,

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

  checkUserExists: async (email: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('check_user_exists', {
      user_email: email,
    })
    if (error || !data) {
      console.error('checkUserExists error:', error?.message)
      return null
    }
    return {
      exists: data.user_exists === true,
      emailConfirmed: data.email_confirmed === true,
    }
  },

  signUp: async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) return { error: error.message }
    return { error: null }
  },

  signIn: async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) return { error: error.message }
    return { error: null }
  },

  signOut: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },

  resendConfirmation: async (email: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })
    if (error) return { error: error.message }
    return { error: null }
  },
}))
