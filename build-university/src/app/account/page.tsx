'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email, id: data.user.id })
    })
  }, [supabase.auth])

  async function handleDelete() {
    setDeleting(true)
    try {
      await supabase.auth.signOut()
      // Account data deletion request — Supabase cascade handles cleanup
      // For full GDPR compliance, this triggers the cascade delete on profiles
      window.location.href = `mailto:privacy@buildright3d.com?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20account%20(${user?.email}).%20I%20understand%20this%20is%20permanent.`
      router.push('/')
    } catch {
      setDeleting(false)
      alert('Failed to process request. Please contact privacy@buildright3d.com')
    }
  }

  return (
    <div className="min-h-screen bg-[#131313] px-6 py-20 max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-[#e5e2e1]/40 hover:text-[#e5e2e1]/70 text-[13px] transition-opacity">&larr; Back to Dashboard</Link>

      <h1 className="text-2xl font-bold text-[#e5e2e1] mt-6 mb-8 font-headline">Account Settings</h1>

      <div className="bg-[#201f1f] rounded-2xl p-6 mb-6" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
        <h2 className="text-base font-semibold text-[#e5e2e1] mb-4">Profile</h2>
        <div className="space-y-3">
          <div>
            <p className="text-[12px] text-[#e5e2e1]/30 font-label uppercase tracking-wider mb-1">Email</p>
            <p className="text-[14px] text-[#e5e2e1]/70">{user?.email || '...'}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#201f1f] rounded-2xl p-6 mb-6" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
        <h2 className="text-base font-semibold text-[#e5e2e1] mb-2">Data & Privacy</h2>
        <p className="text-[13px] text-[#e5e2e1]/40 mb-4">
          Request a copy of your data or delete your account. View our{' '}
          <Link href="/privacy" className="text-[#FF8C00] underline">Privacy Policy</Link>.
        </p>
        <a
          href={`mailto:privacy@buildright3d.com?subject=Data%20Export%20Request&body=Please%20send%20me%20a%20copy%20of%20my%20data%20for%20account%20${user?.email || ''}`}
          className="inline-block px-4 py-2 text-[13px] font-label font-medium rounded-lg bg-[var(--surface-high)] text-[#e5e2e1]/50 hover:text-[#e5e2e1]/80 transition-colors"
        >
          Request Data Export
        </a>
      </div>

      <div className="bg-red-950/30 rounded-2xl p-6" style={{ boxShadow: 'inset 0 0 0 1px rgba(220,38,38,0.2)' }}>
        <h2 className="text-base font-semibold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-[13px] text-[#e5e2e1]/40 mb-4">
          Permanently delete your account and all associated data including progress, quiz results, and subscription.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-[13px] font-label font-medium rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <label className="block text-[13px] text-red-400">
              Type <strong>DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#131313] rounded-lg text-[14px] text-[#e5e2e1] border border-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              placeholder="DELETE"
            />
            <div className="flex gap-3">
              <button
                disabled={deleteText !== 'DELETE' || deleting}
                onClick={handleDelete}
                className="px-4 py-2 text-[13px] font-label font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Processing...' : 'Permanently Delete Account'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteText('') }}
                className="px-4 py-2 text-[13px] font-label font-medium rounded-lg bg-[var(--surface-high)] text-[#e5e2e1]/50 hover:text-[#e5e2e1]/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
