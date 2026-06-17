'use client'

import Link from 'next/link'
import { use } from 'react'

export default function PhasePage({ params }: { params: Promise<{ phase: string }> }) {
  const { phase } = use(params)

  return (
    <div className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      <Link href="/learn" className="text-[#e5e2e1]/30 hover:text-[#e5e2e1]/60 text-sm mb-8 inline-block">&larr; All Phases</Link>
      <h1 className="text-3xl font-bold mb-2 capitalize">{phase.replace(/_/g, ' ')}</h1>
      <p className="text-[#e5e2e1]/40 mb-10">Modules in this construction phase</p>

      <div className="bg-[#201f1f] rounded-xl p-8 text-center" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
        <p className="text-[#e5e2e1]/30">Modules loading from database...</p>
      </div>
    </div>
  )
}
