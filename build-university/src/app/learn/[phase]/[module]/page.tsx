'use client'

import Link from 'next/link'
import { use } from 'react'

export default function ModulePage({ params }: { params: Promise<{ phase: string; module: string }> }) {
  const { phase, module: moduleSlug } = use(params)

  return (
    <div className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      <Link href={`/learn/${phase}`} className="text-white/30 hover:text-white/60 text-sm mb-8 inline-block">&larr; Back to phase</Link>
      <h1 className="text-3xl font-bold mb-2 capitalize">{moduleSlug.replace(/-/g, ' ')}</h1>
      <p className="text-white/40 mb-10">Lessons in this module</p>

      <div className="bg-white/3 border border-white/8 rounded-xl p-8 text-center">
        <p className="text-white/30">Lessons loading from database...</p>
      </div>
    </div>
  )
}
