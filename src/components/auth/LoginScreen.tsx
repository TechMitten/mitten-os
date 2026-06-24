'use client'

import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useDesktopStore } from '@/stores/desktop-store'
import { Cpu, Mail, Loader2, ArrowLeft, CheckCircle, Send, Github } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Step = 'email' | 'sent'

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('email')
  const theme = useDesktopStore((s) => s.theme)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [githubBusy, setGithubBusy] = useState(false)
  const [linkSent, setLinkSent] = useState(false)

  const sendOtp = useAuthStore((s) => s.sendOtp)
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

  const backToEmail = () => {
    setStep('email')
    setError(null)
    setLinkSent(false)
  }

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setBusy(true)
    const result = await sendOtp(email.trim())
    setBusy(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setLinkSent(true)
    setStep('sent')
  }

  const handleResend = async () => {
    setError(null)
    setLinkSent(false)
    setBusy(true)
    const result = await sendOtp(email)
    setBusy(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setLinkSent(true)
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center select-none"
      style={{
        background:
          theme === 'dark'
            ? 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'
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
          {step === 'sent' && (
            <button
              type="button"
              onClick={backToEmail}
              className="absolute top-3 left-3 flex items-center gap-1.5 text-xs text-muted-foreground dark:text-white/30 hover:text-foreground/50 dark:hover:text-white/50 transition-colors cursor-pointer z-10"
              disabled={busy}
            >
              <ArrowLeft className="w-3 h-3" />
              Different account
            </button>
          )}

          <div className="flex flex-col items-center pt-8 pb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
              <Cpu className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-foreground dark:text-white">
              {step === 'email' ? 'Sign in' : 'Check your email'}
            </h1>
            <p className="text-sm text-muted-foreground dark:text-white/50 mt-1 text-center leading-relaxed max-w-[280px]">
              {step === 'email'
                ? 'Enter your email to receive a sign-in link'
                : `We sent a sign-in link to ${email}`}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSendLink}
                className="px-6 pb-6 space-y-4"
              >
                <button
                  type="button"
                  onClick={handleGithubSignIn}
                  disabled={busy || githubBusy}
                  className="w-full py-2.5 rounded-xl bg-[#24292e] hover:bg-[#1b1f23] text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {githubBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                  Continue with GitHub
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-black/[0.06] dark:border-white/[0.08]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 text-muted-foreground/40 dark:text-white/20" style={{ background: theme === 'dark' ? '#1c1c26' : '#ffffff' }}>
                      or
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground dark:text-white/40 mb-1.5 ml-1">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 dark:text-white/20" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-sm text-foreground/80 dark:text-white/80 placeholder:text-muted-foreground/30 dark:text-white/20 outline-none focus:border-amber-500/50 focus:bg-black/[0.05] dark:focus:bg-white/[0.07] transition-colors"
                      autoComplete="email"
                      autoFocus
                      disabled={busy}
                    />
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={busy || githubBusy}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Link
                </button>

                <button
                  type="button"
                  onClick={signInAsGuest}
                  disabled={busy || githubBusy}
                  className="w-full py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-sm text-muted-foreground dark:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:text-foreground/70 dark:hover:text-white/70 transition-all"
                >
                  Continue as Guest
                </button>
              </motion.form>
            )}

            {step === 'sent' && (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-8 space-y-5 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>

                <p className="text-xs text-muted-foreground dark:text-white/40 leading-relaxed">
                  Click the link in your email to sign in.
                  <br />
                  The link expires shortly and can only be used once.
                </p>

                {linkSent && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-emerald-400"
                  >
                    Sign-in link sent!
                  </motion.p>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-white/60 hover:bg-white/[0.10] hover:text-foreground/80 dark:hover:text-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Resend link
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
