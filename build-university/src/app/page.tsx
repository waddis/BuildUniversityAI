'use client'

import Link from 'next/link'
import { CONSTRUCTION_PHASES } from '@/types'

const TRACKS = [
  { title: 'Complex Roof Systems', desc: 'Gables, valleys, hips, dormers, turrets — the geometry that defines real roofs.', lessons: 7, status: 'available' as const },
  { title: 'Dry-In & Waterproofing', desc: 'Sheathing, underlayment, ice barrier, valley metal, drip edge sequencing.', lessons: 5, status: 'available' as const },
  { title: 'Exterior Drainage Plane', desc: 'WRB fundamentals, window flashing, kickout flashing, cladding clearances.', lessons: 3, status: 'preview' as const },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200/60">
        <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
          <Link href="/" className="text-[#1d1d1f] font-semibold text-[15px] tracking-tight">BuildRight 3D</Link>
          <div className="flex items-center gap-8">
            <Link href="/train" className="text-gray-500 hover:text-[#1d1d1f] text-[13px] transition-colors">Training</Link>
            <Link href="/editor" className="text-gray-500 hover:text-[#1d1d1f] text-[13px] transition-colors">Editor</Link>
            <Link href="/login" className="text-gray-500 hover:text-[#1d1d1f] text-[13px] transition-colors">Sign In</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-28 pb-32 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 40%, rgba(0,122,255,0.03) 0%, transparent 70%)' }} />

        <h1 className="relative text-5xl sm:text-6xl lg:text-[80px] font-bold max-w-4xl leading-[1.05] tracking-[-0.03em] text-[#1d1d1f]">
          Learn how a house
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">is really built.</span>
        </h1>
        <p className="relative text-gray-500 text-lg sm:text-xl mt-8 max-w-lg leading-relaxed tracking-tight">
          Interactive 3D construction training. Phase by phase. Code aware. Built for professionals.
        </p>
        <div className="relative flex gap-4 mt-12">
          <Link href="/train" className="px-8 py-3.5 bg-blue-600 text-white font-semibold text-[15px] rounded-full hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-[0.97]">
            Start Training
          </Link>
          <Link href="/editor" className="px-8 py-3.5 bg-gray-100 text-[#1d1d1f] font-medium text-[15px] rounded-full hover:bg-gray-200 transition-all active:scale-[0.97]">
            Open Editor
          </Link>
        </div>
      </section>

      {/* Five Questions */}
      <section className="px-6 py-16 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-400 text-[13px] uppercase tracking-[0.15em] mb-10">Every lesson answers</p>
          <div className="grid grid-cols-5 gap-8">
            {[['What','is this part?'],['Where','does it go?'],['When','is it installed?'],['Why','does code care?'],['What fails','if it is wrong?']].map(([q, d]) => (
              <div key={q} className="text-center">
                <div className="text-blue-600 font-semibold text-xl tracking-tight">{q}</div>
                <div className="text-gray-400 text-[13px] mt-1.5">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tracks */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1d1d1f]">Start with the roof.</h2>
          <p className="text-gray-500 text-lg mt-4 max-w-lg mx-auto leading-relaxed">
            The roof combines geometry, sequencing, waterproofing, and code in one system. Master it first.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {TRACKS.map(track => (
            <Link key={track.title} href="/train" className="group bg-gray-50 rounded-3xl p-7 hover:bg-gray-100 transition-all duration-300 hover:-translate-y-1 border border-gray-100 hover:border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                {track.status === 'available' ? (
                  <span className="text-[11px] bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-medium border border-green-100">Available</span>
                ) : (
                  <span className="text-[11px] bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full">Preview</span>
                )}
                <span className="text-gray-300 text-[11px] ml-auto">{track.lessons} lessons</span>
              </div>
              <h3 className="text-[17px] font-semibold mb-2 text-[#1d1d1f] group-hover:text-blue-600 transition-colors tracking-tight">{track.title}</h3>
              <p className="text-gray-500 text-[14px] leading-relaxed">{track.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Phases */}
      <section className="px-6 py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">The real build sequence.</h2>
            <p className="text-gray-500 text-[15px] mt-3">Every lesson follows the order a house is actually constructed.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {CONSTRUCTION_PHASES.map((phase, i) => (
              <div key={phase} className="bg-white rounded-xl px-4 py-2.5 flex items-center gap-2 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                <span className="text-blue-500/60 text-[11px] font-mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-gray-600 text-[12px] capitalize">{phase.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 py-10 text-center border-t border-gray-100">
        <p className="text-gray-300 text-[13px]">BuildRight 3D</p>
      </footer>
    </div>
  )
}
