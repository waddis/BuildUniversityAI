'use client'

import Link from 'next/link'
import { use } from 'react'

export default function PhasePage({ params }: { params: Promise<{ phase: string }> }) {
  const { phase } = use(params)

  return (
    <div className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      <Link href="/learn" className="text-white/30 hover:text-white/60 text-sm mb-8 inline-block">&larr; All Phases</Link>
      <h1 className="text-3xl font-bold mb-2 capitalize">{phase.replace(/_/g, ' ')}</h1>
      <p className="text-white/40 mb-10">Modules in this construction phase</p>

      <div className="bg-white/3 border border-white/8 rounded-xl p-8 text-center">
        <p className="text-white/30">Modules loading from database...</p>
      </div>
    </div>
  )
}
