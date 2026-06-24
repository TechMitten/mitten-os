'use client'

import React, { useRef, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useDesktopStore } from '@/stores/desktop-store'
import { getSavedAccounts, removeSavedAccount, type SavedAccount } from '@/lib/saved-accounts'
import { Cpu, Loader2, X, Users, CheckCircle, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LoginScreen from '@/components/auth/LoginScreen'
import Turnstile, { type TurnstileHandle } from '@/components/auth/Turnstile'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

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

export default function AccountSwitcher() {
  const theme = useDesktopStore((s) => s.theme)
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => getSavedAccounts())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileHandle>(null)

  const sendOtp = useAuthStore((s) => s.sendOtp)
  const signInAsGuest = useAuthStore((s) => s.signInAsGuest)

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    removeSavedAccount(id)
    const updated = accounts.filter((a) => a.id !== id)
    setAccounts(updated)
    if (selectedId === id) {
      setSelectedId(null)
      setError(null)
      setLinkSent(false)
    }
    if (updated.length === 0) {
      setShowLogin(true)
    }
  }

  const handleSelect = async (account: SavedAccount) => {
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError('Please complete the verification')
      return
    }

    setSelectedId(account.id)
    setError(null)
    setLinkSent(false)
    setBusy(true)

    const result = await sendOtp(account.email, captchaToken ?? undefined)
    setBusy(false)
    turnstileRef.current?.reset()
    setCaptchaToken(null)

    if (result.error) {
      setError(result.error)
      return
    }

    setLinkSent(true)
  }

  const handleBack = () => {
    setSelectedId(null)
    setError(null)
    setLinkSent(false)
  }

  const handleResend = async () => {
    const account = accounts.find((a) => a.id === selectedId)
    if (!account) return

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError('Please complete the verification')
      return
    }

    setError(null)
    setLinkSent(false)
    setBusy(true)
    const result = await sendOtp(account.email, captchaToken ?? undefined)
    setBusy(false)
    turnstileRef.current?.reset()
    setCaptchaToken(null)

    if (result.error) {
      setError(result.error)
      return
    }

    setLinkSent(true)
  }

  if (showLogin || accounts.length === 0) {
    return <LoginScreen />
  }

  const selectedAccount = accounts.find((a) => a.id === selectedId)

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
          <AnimatePresence mode="wait">
            {!selectedId ? (
              <motion.div
                key="list"
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
                    Choose an account
                  </h1>
                  <p className="text-sm text-muted-foreground dark:text-white/50 mt-1 text-center">
                    Select your account to sign in
                  </p>
                </div>

                <div className="px-4 pb-2 space-y-1.5 max-h-[320px] overflow-y-auto">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => handleSelect(account)}
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
                        title="Remove account"
                      >
                        <X className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>

                {TURNSTILE_SITE_KEY && (
                  <div className="px-6 pt-1">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={TURNSTILE_SITE_KEY}
                      theme={theme === 'dark' ? 'dark' : 'light'}
                      onVerify={setCaptchaToken}
                      onExpire={() => setCaptchaToken(null)}
                      onError={() => setCaptchaToken(null)}
                    />
                  </div>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mx-6"
                  >
                    {error}
                  </motion.p>
                )}

                <div className="px-6 py-2 space-y-2">
                  <button
                    type="button"
                    onClick={signInAsGuest}
                    className="w-full py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-sm text-muted-foreground dark:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:text-foreground/70 dark:hover:text-white/70 transition-all"
                  >
                    Continue as Guest
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogin(true)}
                    className="w-full py-2.5 rounded-xl bg-transparent text-xs text-muted-foreground/40 dark:text-white/20 hover:text-foreground/50 dark:hover:text-white/40 transition-colors"
                  >
                    Use another account
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="sent"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  type="button"
                  onClick={handleBack}
                  className="absolute top-3 left-3 flex items-center gap-1.5 text-xs text-muted-foreground dark:text-white/30 hover:text-foreground/50 dark:hover:text-white/50 transition-colors cursor-pointer z-10"
                  disabled={busy}
                >
                  <Cpu className="w-3 h-3" />
                  All accounts
                </button>

                <div className="flex flex-col items-center pt-8 pb-4">
                  {selectedAccount && (
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
                      <p className="text-sm text-muted-foreground dark:text-white/50 mt-1 text-center">
                        {selectedAccount.displayName || selectedAccount.email}
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-white/40 mt-1">
                        We sent a sign-in link to your email
                      </p>
                    </>
                  )}
                </div>

                {busy && !linkSent ? (
                  <div className="px-6 pb-6 flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  </div>
                ) : (
                  <div className="px-6 pb-8 space-y-5 text-center">
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

                    {TURNSTILE_SITE_KEY && (
                      <Turnstile
                        ref={turnstileRef}
                        siteKey={TURNSTILE_SITE_KEY}
                        theme={theme === 'dark' ? 'dark' : 'light'}
                        onVerify={setCaptchaToken}
                        onExpire={() => setCaptchaToken(null)}
                        onError={() => setCaptchaToken(null)}
                      />
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
                      disabled={busy || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}
                      className="w-full py-2.5 rounded-xl bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-white/60 hover:bg-white/[0.10] hover:text-foreground/80 dark:hover:text-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
                    >
                      {busy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Resend link
                    </button>
                  </div>
                )}
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
