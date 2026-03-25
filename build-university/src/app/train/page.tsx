'use client'

import Link from 'next/link'
import { CURRICULUM } from '@/lib/content/curriculum'

export default function TrainPage() {
  const totalLessons = CURRICULUM.reduce((s, m) => s + m.lessons.length, 0)

  return (
    <div className="min-h-screen bg-[#131313]">
      {/* Minimal top nav */}
      <nav className="h-14 flex items-center px-6 border-b" style={{ borderColor: 'rgba(86,67,52,0.15)' }}>
        <Link href="/" className="text-[15px] font-bold tracking-tighter text-[#FF8C00] mr-8">BuildRight 3D</Link>
        <div className="hidden md:flex gap-6">
          <Link href="/dashboard" className="text-[13px] text-[#e5e2e1] opacity-40 hover:opacity-80 transition-opacity">Dashboard</Link>
          <span className="text-[13px] text-[#FF8C00] font-semibold">Training</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-10 animate-[fadeIn_0.5s_ease-out]">
          <h1 className="text-[28px] font-bold tracking-tight text-[#e5e2e1]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Training Modules</h1>
          <p className="text-[14px] text-[#e5e2e1] opacity-35 mt-2">
            {CURRICULUM.length} modules covering the complete residential construction sequence.
          </p>
        </div>

        <div className="space-y-3 pb-12">
          {CURRICULUM.map((mod, i) => {
            const learnCount = mod.lessons.filter(l => l.type === 'learn').length
            const quizCount = mod.lessons.filter(l => l.type === 'quiz').length
            const inspectCount = mod.lessons.filter(l => l.type === 'inspect').length
            return (
              <Link key={mod.slug} href={`/train/${mod.slug}`}
                className="group flex items-start gap-5 bg-[#201f1f] rounded-2xl p-6 hover:-translate-y-0.5 transition-all duration-200 animate-[fadeIn_0.5s_ease-out]"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both', border: '1px solid rgba(86,67,52,0.15)' }}>
                <div className="w-11 h-11 rounded-2xl bg-[#1c1b1b] flex items-center justify-center shrink-0 group-hover:bg-[#FF8C00]/10 transition-colors">
                  <span className="text-[14px] font-bold text-[#e5e2e1] opacity-25 group-hover:text-[#FF8C00] group-hover:opacity-100 transition-all">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold tracking-tight text-[#e5e2e1] group-hover:text-[#FF8C00] transition-colors">{mod.title}</div>
                  <div className="text-[13px] text-[#e5e2e1] opacity-35 mt-1 leading-relaxed">{mod.description}</div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[11px] text-[#e5e2e1] opacity-20">{mod.lessons.length} lessons</span>
                    {learnCount > 0 && <span className="text-[10px] bg-[#FF8C00]/10 text-[#FF8C00] px-2 py-0.5 rounded-lg opacity-70">{learnCount} learn</span>}
                    {quizCount > 0 && <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-lg opacity-70">{quizCount} quiz</span>}
                    {inspectCount > 0 && <span className="text-[10px] bg-[#82CFFF]/10 text-[#82CFFF] px-2 py-0.5 rounded-lg opacity-70">{inspectCount} inspect</span>}
                  </div>
                </div>
                <div className="text-[#e5e2e1] opacity-10 group-hover:opacity-30 group-hover:text-[#FF8C00] group-hover:translate-x-1 transition-all text-lg pt-1 shrink-0">&rarr;</div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
