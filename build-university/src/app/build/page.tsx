'use client'

import Link from 'next/link'
import { ALL_BUILD_SEQUENCES } from '@/lib/content/build-sequences'

export default function BuildIndexPage() {
  return (
    <div className="min-h-screen bg-[#131313] text-white">
      {/* Header */}
      <div className="border-b border-[rgba(86,67,52,0.15)] bg-[#1c1b1b]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link href="/" className="text-white/30 text-xs hover:text-white/50 transition-colors">
            &larr; Back to BuildRight 3D
          </Link>
          <h1 className="text-2xl font-bold mt-4">Construction Walkthroughs</h1>
          <p className="text-white/40 text-sm mt-1 max-w-xl">
            Watch a building assembly come together layer-by-layer. Each walkthrough is a cinematic
            3D sequence — the model builds up on screen, in real install order, with narration on
            why each layer matters.
          </p>
        </div>
      </div>

      {/* Sequence cards */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_BUILD_SEQUENCES.map(sequence => (
            <Link
              key={sequence.id}
              href={`/build/${sequence.id}`}
              className="group bg-[#201f1f] border border-[rgba(86,67,52,0.15)] rounded-xl p-5 hover:border-[#FF8C00]/30 hover:bg-[#353534] transition-all"
            >
              {/* Preview placeholder */}
              <div className="aspect-video bg-[#2a2a2a] rounded-lg mb-4 flex items-center justify-center group-hover:border-[#FF8C00]/10 transition-colors">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-[#FF8C00]/10 flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                  </div>
                  <p className="text-white/20 text-[10px]">3D Walkthrough</p>
                </div>
              </div>

              <h2 className="text-sm font-semibold mb-1">{sequence.title}</h2>
              <p className="text-white/40 text-xs leading-relaxed mb-3">{sequence.subtitle}</p>

              <div className="flex items-center gap-3 text-white/25 text-[10px]">
                <span>{sequence.stops.length} stages</span>
                <span>Layer-by-layer reveal</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
