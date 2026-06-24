'use client'

import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useDesktopStore } from '@/stores/desktop-store'
import { Cpu, Loader2, Github } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginScreen() {
  const theme = useDesktopStore((s) => s.theme)
  const [error, setError] = useState<string | null>(null)
  const [githubBusy, setGithubBusy] = useState(false)

  const signInAsGuest = useAuthStore((s) => s.signInAsGuest)
  const signInWithGithub = useAuthStore((s) => s.signInWithGithub)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth_error')) {
      setError('Sign-in failed. Please try again.')
      params.delete('auth_error')
      const query = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
    }
  }, [])

  const handleGithubSignIn = async () => {
    setError(null)
    setGithubBusy(true)
    const result = await signInWithGithub()
    if (result.error) {
      setError(result.error)
      setGithubBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center select-none"
      style={{
        background:
          theme === 'dark'
            ? 'linear-gradient(135deg, #030b20, #0d2b63, #071730)'
            : 'linear-gradient(135deg, #c9d6ff, #e2e2e2, #f5f7fa)',
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/5"
            style={{
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 10 + 15}s linear infinite`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-sm mx-4"
      >
        <div
          className="rounded-2xl shadow-2xl overflow-hidden relative"
          style={{
            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
            background:
              theme === 'dark'
                ? 'rgba(28, 28, 38, 0.92)'
                : 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(40px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
          }}
        >
          <div className="flex flex-col items-center pt-8 pb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
              <Cpu className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-foreground dark:text-white">
              Sign in
            </h1>
            <p className="text-sm text-muted-foreground dark:text-white/50 mt-1 text-center leading-relaxed max-w-[280px]">
              Choose a sign-in method to continue
            </p>
          </div>

          <div className="px-6 pb-6 space-y-4">
            <button
              type="button"
              onClick={handleGithubSignIn}
              disabled={githubBusy}
              className="w-full py-2.5 rounded-xl bg-[#24292e] hover:bg-[#1b1f23] text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {githubBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
              Continue with GitHub
            </button>

            <button
              type="button"
              onClick={signInAsGuest}
              disabled={githubBusy}
              className="w-full py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-sm text-muted-foreground dark:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:text-foreground/70 dark:hover:text-white/70 transition-all cursor-pointer"
            >
              Continue as Guest
            </button>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-white/15 mt-4">
          MittenOS &middot; Your browser-based operating system
        </p>
      </motion.div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-30px) scale(1.5);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  )
}
