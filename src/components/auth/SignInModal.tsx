'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useDesktopStore } from '@/stores/desktop-store'
import { getSavedAccounts, removeSavedAccount, type SavedAccount } from '@/lib/saved-accounts'
import type { AuthAction } from '@/lib/guest-storage'
import { Cpu, Mail, Loader2, ArrowLeft, CheckCircle, Send, Users, X, LogIn, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type SubView = 'accounts' | 'email' | 'sent'

interface SignInModalProps {
  open: boolean
  mode: 'signin' | 'signup'
  onClose: () => void
}

function getInitials(email: string): string {
  const localPart = email.split('@')[0]
  if (!localPart) return '?'
  const parts = localPart.split(/[._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return localPart.slice(0, 2).toUpperCase()
}

function getAvatarColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return `hsl(${hue}, 55%, 55%)`
}

export default function SignInModal({ open, mode, onClose }: SignInModalProps) {
  const theme = useDesktopStore((s) => s.theme)
  const sendOtp = useAuthStore((s) => s.sendOtp)

  const [subView, setSubView] = useState<SubView>('email')
  const [accounts, setAccounts] = useState<SavedAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<SavedAccount | null>(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [linkSent, setLinkSent] = useState(false)

  const isSignup = mode === 'signup'
  const authAction: AuthAction = isSignup ? 'signup' : 'signin'

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setError(null)
      setBusy(false)
      setLinkSent(false)
      setSelectedAccount(null)

      if (isSignup) {
        setSubView('email')
        setEmail('')
      } else {
        const saved = getSavedAccounts()
        if (saved.length > 0) {
          setAccounts(saved)
          setSubView('accounts')
        } else {
          setAccounts([])
          setSubView('email')
          setEmail('')
        }
      }
    }
  }, [open, isSignup])

  const handleSendLink = useCallback(async (targetEmail: string) => {
    setError(null)
    setBusy(true)
    const result = await sendOtp(targetEmail, authAction)
    setBusy(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setLinkSent(true)
    setSubView('sent')
  }, [sendOtp, authAction])

  const handleEmailSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    handleSendLink(email.trim())
  }, [email, handleSendLink])

  const handleAccountSelect = useCallback(async (account: SavedAccount) => {
    setSelectedAccount(account)
    setError(null)
    setLinkSent(false)
    setBusy(true)
    const result = await sendOtp(account.email, authAction)
    setBusy(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setLinkSent(true)
    setSubView('sent')
  }, [sendOtp, authAction])

  const handleResend = useCallback(async () => {
    const target = selectedAccount?.email || email
    if (!target) return
    setError(null)
    setLinkSent(false)
    setBusy(true)
    const result = await sendOtp(target, authAction)
    setBusy(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setLinkSent(true)
  }, [sendOtp, authAction, selectedAccount, email])

  const handleRemove = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    removeSavedAccount(id)
    const updated = accounts.filter((a) => a.id !== id)
    setAccounts(updated)
  }, [accounts])

  const handleBackFromAccounts = useCallback(() => {
    setSubView('email')
    setEmail('')
  }, [])

  const handleBackFromSent = useCallback(() => {
    if (isSignup || accounts.length === 0) {
      setSubView('email')
      setEmail('')
    } else {
      setSubView('accounts')
    }
    setSelectedAccount(null)
    setError(null)
    setLinkSent(false)
  }, [isSignup, accounts.length])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
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
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/[0.06] text-muted-foreground/40 hover:text-foreground/60 dark:hover:text-white/60 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Back button in sent view */}
          {subView === 'sent' && (
            <button
              type="button"
              onClick={handleBackFromSent}
              className="absolute top-3 left-3 flex items-center gap-1.5 text-xs text-muted-foreground dark:text-white/30 hover:text-foreground/50 dark:hover:text-white/50 transition-colors cursor-pointer z-10"
              disabled={busy}
            >
              <ArrowLeft className="w-3 h-3" />
              {isSignup ? 'Change email' : 'Back'}
            </button>
          )}

          <AnimatePresence mode="wait">
            {subView === 'accounts' && (
              <motion.div
                key="accounts"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col items-center pt-8 pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-xl font-semibold text-foreground dark:text-white">
                    Sign in
                  </h1>
                  <p className="text-sm text-muted-foreground dark:text-white/50 mt-1 text-center">
                    Select your account
                  </p>
                </div>

                <div className="px-4 pb-2 space-y-1.5 max-h-[320px] overflow-y-auto">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => handleAccountSelect(account)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer group relative"
                    >
                      {account.avatarUrl ? (
                        <img
                          src={account.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                          style={{ backgroundColor: getAvatarColor(account.email) }}
                        >
                          {getInitials(account.email)}
                        </div>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm font-medium text-foreground dark:text-white truncate">
                          {account.displayName || account.email}
                        </div>
                        {account.displayName && (
                          <div className="text-xs text-muted-foreground dark:text-white/40 truncate">
                            {account.email}
                          </div>
                        )}
                      </div>
                      <div
                        className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-400 transition-all flex-shrink-0"
                        onClick={(e) => handleRemove(e, account.id)}
                        role="button"
                        tabIndex={-1}
                      >
                        <X className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="px-6 py-4 space-y-2">
                  <button
                    type="button"
                    onClick={handleBackFromAccounts}
                    className="w-full py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-sm text-muted-foreground dark:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:text-foreground/70 dark:hover:text-white/70 transition-all"
                  >
                    Use another email
                  </button>
                </div>
              </motion.div>
            )}

            {subView === 'email' && (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleEmailSubmit}
              >
                <div className="flex flex-col items-center pt-8 pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
                    {isSignup ? (
                      <UserPlus className="w-8 h-8 text-white" />
                    ) : (
                      <LogIn className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <h1 className="text-xl font-semibold text-foreground dark:text-white">
                    {isSignup ? 'Create account' : 'Sign in'}
                  </h1>
                  <p className="text-sm text-muted-foreground dark:text-white/50 mt-1 text-center leading-relaxed max-w-[280px]">
                    {isSignup
                      ? 'Enter your email to create an account and save your data'
                      : 'Enter your email to receive a sign-in link'}
                  </p>
                </div>

                <div className="px-6 pb-6 space-y-4">
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
                    disabled={busy}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSignup ? 'Create Account' : 'Send Link'}
                  </button>
                </div>
              </motion.form>
            )}

            {subView === 'sent' && (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-8 space-y-5 text-center"
              >
                <div className="flex flex-col items-center pt-8 pb-2">
                  {selectedAccount ? (
                    <>
                      {selectedAccount.avatarUrl ? (
                        <img
                          src={selectedAccount.avatarUrl}
                          alt=""
                          className="w-16 h-16 rounded-full object-cover mb-3 shadow-lg shadow-black/10"
                        />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-xl mb-3 shadow-lg shadow-black/10"
                          style={{ backgroundColor: getAvatarColor(selectedAccount.email) }}
                        >
                          {getInitials(selectedAccount.email)}
                        </div>
                      )}
                      <h1 className="text-xl font-semibold text-foreground dark:text-white">
                        Check your email
                      </h1>
                      <p className="text-sm text-muted-foreground dark:text-white/50 mt-1">
                        {selectedAccount.displayName || selectedAccount.email}
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-xl font-semibold text-foreground dark:text-white">
                        Check your email
                      </h1>
                      <p className="text-sm text-muted-foreground dark:text-white/50 mt-1">
                        We sent a link to {email}
                      </p>
                    </>
                  )}
                </div>

                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>

                <p className="text-xs text-muted-foreground dark:text-white/40 leading-relaxed">
                  Click the link in your email to {isSignup ? 'verify and create your account' : 'sign in'}.
                  <br />
                  The link expires shortly and can only be used once.
                </p>

                {linkSent && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-emerald-400"
                  >
                    {isSignup ? 'Verification link sent!' : 'Sign-in link sent!'}
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

        <p className="text-center text-[10px] text-white/20 mt-4">
          MittenOS &middot; Your browser-based operating system
        </p>
      </motion.div>
    </div>
  )
}
