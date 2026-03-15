'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { signIn, resetPassword } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/gym')
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    const { error } = await resetPassword(email)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setResetSent(true)
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors"

  if (resetMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/90 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-3xl">lock_reset</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Reset password</h1>
            <p className="text-slate-500 mt-1">
              {resetSent
                ? 'Check your email for a reset link'
                : 'Enter your email to receive a reset link'}
            </p>
          </div>

          <div className="glass rounded-2xl p-6">
            {resetSent ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 text-emerald-600 text-sm rounded-xl px-4 py-3 text-center">
                  Password reset email sent! Check your inbox.
                </div>
                <button
                  onClick={() => {
                    setResetMode(false)
                    setResetSent(false)
                    setError(null)
                  }}
                  className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                {error && (
                  <div className="bg-rose-500/10 backdrop-blur-sm border border-rose-500/20 text-rose-600 text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            <button
              onClick={() => {
                setResetMode(false)
                setResetSent(false)
                setError(null)
              }}
              className="text-primary font-semibold cursor-pointer"
            >
              Back to sign in
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/90 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white text-3xl">fitness_center</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-500 mt-1">Sign in to your account</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 backdrop-blur-sm border border-rose-500/20 text-rose-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(true)
                    setError(null)
                  }}
                  className="text-xs text-primary font-semibold cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
