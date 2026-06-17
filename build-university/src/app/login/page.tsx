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
    <div className="min-h-screen bg-[#131313] flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-[fadeIn_0.5s_ease-out]">
        <Link href="/" className="text-[#e5e2e1] opacity-40 hover:opacity-70 text-[13px] mb-10 inline-block transition-opacity">&larr; Back</Link>
        <div className="bg-[#1c1b1b] rounded-3xl p-8" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
          <h1 className="text-2xl font-bold tracking-tight text-[#e5e2e1] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Welcome back</h1>
          <p className="text-[#e5e2e1] opacity-40 text-[14px] mb-8">Sign in with your email</p>
          {sent ? (
            <div className="bg-green-500/10 rounded-2xl p-6 text-center border border-green-500/20 animate-[scaleIn_0.3s_ease-out]">
              <p className="text-green-400 font-semibold text-[15px]">Check your email</p>
              <p className="text-[#e5e2e1] opacity-40 text-[13px] mt-2">We sent a link to {email}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                  <p className="text-red-400 text-[13px]">{error}</p>
                </div>
              )}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus
                className="w-full px-4 py-3.5 bg-[#201f1f] rounded-xl text-[15px] text-[#e5e2e1] placeholder:text-[#e5e2e1]/25 border border-[rgba(86,67,52,0.15)] focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/30 focus:border-[#FF8C00]/50 transition-all" />
              <button type="submit" disabled={loading} className="w-full px-4 py-3.5 bg-[#FF8C00] text-white font-semibold text-[15px] rounded-xl hover:bg-[#FF8C00]/90 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Sending...' : 'Continue'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
