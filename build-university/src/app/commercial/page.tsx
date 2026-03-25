'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const SceneViewer = dynamic(() => import('@/components/3d/SceneViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#131313]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#FF8C00]/30 border-t-[#FF8C00] rounded-full animate-spin" />
        <p className="text-[#e5e2e1]/30 text-sm font-label">Loading Commercial Model...</p>
      </div>
    </div>
  ),
})

export default function CommercialPage() {
  const [blueprintMode, setBlueprintMode] = useState(false)

  return (
    <div className="fixed inset-0 bg-[#131313]">
      {/* Top bar */}
      <nav className="fixed top-0 w-full z-50 h-14 glass flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-headline text-lg font-bold tracking-tighter text-[#FF8C00]">BuildRight 3D</Link>
          <span className="text-[#e5e2e1]/15">|</span>
          <span className="text-[#e5e2e1]/60 text-[13px] font-headline">Commercial Hotel — Mediterranean Revival</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBlueprintMode(b => !b)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-label font-medium transition-all ${
              blueprintMode
                ? 'bg-[#1a2a5c] text-blue-200 border border-blue-400/50'
                : 'text-[#e5e2e1]/40 hover:text-[#e5e2e1]/70 hover:bg-[#2a2a2a]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">architecture</span>
            Blueprint
          </button>
          <Link href="/dashboard" className="text-[#e5e2e1]/30 hover:text-[#e5e2e1]/60 text-[12px] font-label transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </nav>

      {/* 3D Viewer — commercial model */}
      <div className="absolute inset-0 pt-14">
        <SceneViewer model="commercial" blueprintMode={blueprintMode} />
      </div>

      {/* Bottom info bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 glass-heavy rounded-2xl px-6 py-4 flex items-center gap-5 min-w-[500px]" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
        <div className="p-2.5 bg-[#FF8C00] rounded-lg">
          <span className="material-symbols-outlined text-[#131313] text-[20px]">domain</span>
        </div>
        <div className="flex-1">
          <h2 className="text-[15px] font-bold font-headline tracking-tight text-[#e5e2e1]">Mediterranean Revival Hotel</h2>
          <p className="text-[12px] text-[#e5e2e1]/40 font-label">5 Wings - 5 Stories - Terracotta + BUR + Cupola - ~900 Parts</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#e5e2e1]/25 font-label">
          <span className="w-2 h-2 rounded-full bg-green-500/60 animate-pulse" />
          LIVE MODEL
        </div>
      </div>
    </div>
  )
}
