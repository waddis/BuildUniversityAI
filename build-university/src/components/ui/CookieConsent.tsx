'use client'

import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('buildright_cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('buildright_cookie_consent', 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] p-4" role="alert" aria-live="polite">
      <div className="max-w-4xl mx-auto bg-[var(--surface-container)] rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15), 0 -4px 24px rgba(0,0,0,0.3)' }}>
        <p className="text-[13px] text-[#e5e2e1]/60 leading-relaxed flex-1">
          We use essential cookies and local storage to keep you signed in and track your learning progress.
          See our{' '}
          <a href="/privacy" className="text-[#FF8C00] underline hover:opacity-80">Privacy Policy</a>{' '}
          for details.
        </p>
        <button
          onClick={accept}
          className="px-5 py-2 text-[13px] font-label font-semibold rounded-lg bg-[#FF8C00] text-[#131313] hover:opacity-90 transition-opacity shrink-0"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
