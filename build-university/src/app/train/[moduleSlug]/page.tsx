'use client'

import { use } from 'react'
import Link from 'next/link'
import { getModule } from '@/lib/content/curriculum'

const TYPE_STYLE = { learn: 'text-[#FF8C00]', quiz: 'text-purple-400', inspect: 'text-[#82CFFF]' }

export default function ModulePage({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const { moduleSlug } = use(params)
  const mod = getModule(moduleSlug)

  if (!mod) {
    return (
      <div className="min-h-screen bg-[#131313] flex items-center justify-center">
        <div className="text-center"><h1 className="text-xl font-semibold mb-3 text-[#e5e2e1]">Module not found</h1>
          <Link href="/train" className="text-[#FF8C00] text-[14px] hover:underline">Back to training</Link></div>
      </div>
    )
  }
  const totalMin = mod.lessons.reduce((s, l) => s + l.durationMinutes, 0)

  return (
    <div className="min-h-screen bg-[#131313]">
      {/* Minimal top nav */}
      <nav className="h-14 flex items-center px-6 border-b" style={{ borderColor: 'rgba(86,67,52,0.15)' }}>
        <Link href="/" className="text-[15px] font-bold tracking-tighter text-[#FF8C00] mr-8">BuildRight 3D</Link>
        <div className="hidden md:flex gap-6">
          <Link href="/dashboard" className="text-[13px] text-[#e5e2e1] opacity-40 hover:opacity-80 transition-opacity">Dashboard</Link>
          <Link href="/train" className="text-[13px] text-[#FF8C00] font-semibold">Training</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-8 py-10 animate-[fadeIn_0.5s_ease-out]">
        <div className="mb-10">
          <Link href="/train" className="text-[#e5e2e1] opacity-30 hover:opacity-60 text-[12px] transition-opacity mb-4 inline-block">&larr; All Modules</Link>
          <h1 className="text-[28px] font-bold tracking-tight text-[#e5e2e1] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{mod.title}</h1>
          <p className="text-[14px] text-[#e5e2e1] opacity-35 leading-relaxed mb-4">{mod.description}</p>
          <div className="flex items-center gap-4 text-[12px] text-[#e5e2e1] opacity-25">
            <span>{mod.lessons.length} lessons</span>
            <span className="w-1 h-1 rounded-full bg-[#e5e2e1] opacity-20" />
            <span>~{totalMin} min</span>
            <span className="w-1 h-1 rounded-full bg-[#e5e2e1] opacity-20" />
            <span className="capitalize">{mod.difficulty}</span>
          </div>
        </div>

        {/* What you will learn */}
        <div className="bg-[#201f1f] rounded-2xl p-6 mb-8" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
          <h2 className="text-[14px] font-semibold text-[#e5e2e1] opacity-60 mb-4">What you will learn</h2>
          <ul className="space-y-2.5">
            {mod.lessons.filter(l => l.type === 'learn').map(l => (
              <li key={l.slug} className="flex items-start gap-3 text-[13px] text-[#e5e2e1] opacity-50 leading-relaxed">
                <span className="text-[#FF8C00] mt-0.5 shrink-0 opacity-40">-</span>{l.objective}
              </li>
            ))}
          </ul>
        </div>

        {/* Lessons */}
        <div className="space-y-2 pb-12">
          {mod.lessons.map((lesson, i) => {
            const style = TYPE_STYLE[lesson.type]
            const isStub = lesson.steps?.length === 1 && lesson.steps[0].title === 'Coming Soon'
            return (
              <Link key={lesson.slug} href={isStub ? '#' : `/train/${mod.slug}/${lesson.slug}`}
                className={`flex items-center gap-5 bg-[#201f1f] rounded-2xl px-6 py-5 transition-all duration-200 group ${
                  isStub ? 'opacity-35 cursor-default' : 'hover:-translate-y-0.5'
                }`}
                style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
                <div className="w-8 h-8 rounded-xl bg-[#1c1b1b] flex items-center justify-center text-[#e5e2e1] text-[12px] font-medium opacity-30 shrink-0 group-hover:bg-[#FF8C00]/10 group-hover:text-[#FF8C00] group-hover:opacity-100 transition-all">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium tracking-tight text-[#e5e2e1] group-hover:text-[#FF8C00] transition-colors">{lesson.title}</div>
                  <div className="text-[12px] text-[#e5e2e1] opacity-25 mt-0.5 truncate">{lesson.objective}</div>
                </div>
                <span className={`text-[11px] font-medium shrink-0 capitalize ${style}`}>{lesson.type}</span>
                <span className="text-[#e5e2e1] opacity-15 text-[12px] w-8 text-right shrink-0">{lesson.durationMinutes}m</span>
              </Link>
            )
          })}
        </div>

        <div className="text-center pb-12">
          <Link href={`/train/${mod.slug}/${mod.lessons[0].slug}`}
            className="inline-block px-8 py-3 text-[14px] font-semibold text-white bg-[#FF8C00] rounded-xl hover:bg-[#FF8C00]/90 transition-opacity">
            Start Module
          </Link>
        </div>
      </main>
    </div>
  )
}
