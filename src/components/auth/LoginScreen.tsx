'use client'

import React, { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Cpu, Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft, CheckCircle, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Step = 'email' | 'signin' | 'signup' | 'confirm-email'

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  const checkUserExists = useAuthStore((s) => s.checkUserExists)
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const resendConfirmation = useAuthStore((s) => s.resendConfirmation)

  const backToEmail = () => {
    setStep('email')
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setResendSent(false)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setBusy(true)
    try {
      const result = await checkUserExists(email.trim())
      if (!result) {
        setError('Something went wrong. Please try again.')
        return
      }
      if (result.exists) {
        if (result.emailConfirmed) {
          setStep('signin')
        } else {
          setResendSent(false)
          setStep('confirm-email')
        }
      } else {
        setStep('signup')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password.trim()) {
      setError('Please enter your password')
      return
    }

    setBusy(true)
    const result = await signIn(email, password)
    setBusy(false)

    if (result.error) {
      setError(result.error)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password.trim()) {
      setError('Please create a password')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setBusy(true)
    const result = await signUp(email, password)
    setBusy(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setStep('confirm-email')
  }

  const handleResend = async () => {
    setError(null)
    setResendSent(false)
    setBusy(true)
    const result = await resendConfirmation(email)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setResendSent(true)
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center select-none"
      style={{
        background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      }}
    >
      {/* Animated background particles */}
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
        {/* Card */}
        <div
          className="rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden relative"
          style={{
            background: 'rgba(28, 28, 38, 0.92)',
            backdropFilter: 'blur(40px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
          }}
        >
          {/* Top-left back button (signin / signup / confirm-email) */}
          {step !== 'email' && (
            <button
              type="button"
              onClick={backToEmail}
              className="absolute top-3 left-3 flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors cursor-pointer z-10"
              disabled={busy}
            >
              <ArrowLeft className="w-3 h-3" />
              Different account
            </button>
          )}

          {/* Logo area */}
          <div className="flex flex-col items-center pt-8 pb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
              <Cpu className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-white">
              {step === 'confirm-email'
                ? 'Check your email'
                : step === 'email'
                  ? 'Sign in'
                  : step === 'signin'
                    ? 'Welcome back'
                    : 'Welcome to MittenOS!'}
            </h1>
            <p className="text-sm text-white/50 mt-1 text-center leading-relaxed max-w-[280px]">
              {step === 'confirm-email'
                ? 'We sent a confirmation link. Click it to activate your account, then sign in.'
                : step === 'email'
                  ? 'Enter your email to continue'
                  : step === 'signin'
                    ? `Sign in to ${email}`
                    : `No account exists for ${email}. Create a password to set up your personal OS environment.`}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* ─── Step: Email ──────────────────────────── */}
            {step === 'email' && (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleEmailSubmit}
                className="px-6 pb-6 space-y-4"
              >
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 ml-1">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-amber-500/50 focus:bg-white/[0.07] transition-colors"
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
                  Continue
                </button>
              </motion.form>
            )}

            {/* ─── Step: Sign In (existing user) ───────── */}
            {step === 'signin' && (
              <motion.form
                key="signin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSignIn}
                className="px-6 pb-6 space-y-4"
              >
                {/* Email (read-only) */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-sm text-white/40 outline-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-amber-500/50 focus:bg-white/[0.07] transition-colors"
                      autoComplete="current-password"
                      autoFocus
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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
                  Sign In
                </button>
              </motion.form>
            )}

            {/* ─── Step: Sign Up (new user) ────────────── */}
            {step === 'signup' && (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSignUp}
                className="px-6 pb-6 space-y-4"
              >
                {/* Email (read-only) */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-sm text-white/40 outline-none"
                    />
                  </div>
                </div>

                {/* Create password */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 ml-1">Create password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-amber-500/50 focus:bg-white/[0.07] transition-colors"
                      autoComplete="new-password"
                      autoFocus
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 ml-1">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Type your password again"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-amber-500/50 focus:bg-white/[0.07] transition-colors"
                      autoComplete="new-password"
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
                  Create Account
                </button>
              </motion.form>
            )}

            {/* ─── Step: Confirm email after signup ────── */}
            {step === 'confirm-email' && (
              <motion.div
                key="confirm-email"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-8 space-y-5 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-white">Check your email</h3>
                  <p className="text-xs text-white/40 leading-relaxed">
                    We sent a confirmation link to{' '}
                    <span className="text-white/60 font-medium break-all">{email}</span>
                  </p>
                  <p className="text-xs text-white/30">
                    Click the link in the email to activate your account, then sign in.
                  </p>
                </div>

                <div className="space-y-3">
                  {resendSent && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-emerald-400"
                    >
                      Confirmation email resent!
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
                    className="w-full py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 hover:bg-white/[0.10] hover:text-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Resend confirmation email
                  </button>
                </div>
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
