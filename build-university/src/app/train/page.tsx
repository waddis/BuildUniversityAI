'use client'

import Link from 'next/link'
import TopNav from '@/components/ui/TopNav'
import AppSidebar from '@/components/ui/AppSidebar'
import { CURRICULUM } from '@/lib/content/curriculum'

export default function TrainPage() {
  const totalLessons = CURRICULUM.reduce((s, m) => s + m.lessons.length, 0)

  return (
    <div className="min-h-screen">
      <TopNav />
      <AppSidebar />

      <main className="ml-0 md:ml-64 mt-16 overflow-y-auto min-h-[calc(100vh-4rem)]">
        <div className="px-8 py-8 max-w-5xl">
          <div className="mb-10 animate-[fadeIn_0.5s_ease-out]">
            <h1 className="text-[28px] font-bold tracking-tight text-[var(--on-surface)]">Training Modules</h1>
            <p className="text-[14px] text-[var(--on-surface)] opacity-35 mt-2">
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
                  className="group flex items-start gap-5 bg-white rounded-2xl p-6 shadow-ambient-sm hover:shadow-ambient hover:-translate-y-0.5 transition-all duration-200 animate-[fadeIn_0.5s_ease-out]"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                  <div className="w-11 h-11 rounded-2xl bg-[var(--surface-low)] flex items-center justify-center shrink-0 group-hover:bg-[var(--primary-fixed)] transition-colors">
                    <span className="text-[14px] font-bold text-[var(--on-surface)] opacity-25 group-hover:text-[var(--primary)] group-hover:opacity-100 transition-all">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold tracking-tight text-[var(--on-surface)] group-hover:text-[var(--primary)] transition-colors">{mod.title}</div>
                    <div className="text-[13px] text-[var(--on-surface)] opacity-35 mt-1 leading-relaxed">{mod.description}</div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[11px] text-[var(--on-surface)] opacity-20">{mod.lessons.length} lessons</span>
                      {learnCount > 0 && <span className="text-[10px] bg-[var(--primary-fixed)] text-[var(--primary)] px-2 py-0.5 rounded-lg opacity-70">{learnCount} learn</span>}
                      {quizCount > 0 && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg opacity-70">{quizCount} quiz</span>}
                      {inspectCount > 0 && <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg opacity-70">{inspectCount} inspect</span>}
                    </div>
                  </div>
                  <div className="text-[var(--on-surface)] opacity-10 group-hover:opacity-30 group-hover:translate-x-1 transition-all text-lg pt-1 shrink-0">&rarr;</div>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
