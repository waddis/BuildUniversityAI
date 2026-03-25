'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (authError) {
        setError(authError.message)
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-[fadeIn_0.5s_ease-out]">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-[13px] mb-10 inline-block transition-colors">&larr; Back</Link>
        <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] mb-2">Welcome back</h1>
          <p className="text-gray-500 text-[14px] mb-8">Sign in with your email</p>
          {sent ? (
            <div className="bg-green-50 rounded-2xl p-6 text-center border border-green-100 animate-[scaleIn_0.3s_ease-out]">
              <p className="text-green-700 font-semibold text-[15px]">Check your email</p>
              <p className="text-gray-500 text-[13px] mt-2">We sent a link to {email}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                  <p className="text-red-600 text-[13px]">{error}</p>
                </div>
              )}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus
                className="w-full px-4 py-3.5 bg-white rounded-xl text-[15px] text-[#1d1d1f] placeholder:text-gray-300 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
              <button type="submit" disabled={loading} className="w-full px-4 py-3.5 bg-blue-600 text-white font-semibold text-[15px] rounded-xl hover:bg-blue-700 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Sending...' : 'Continue'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
