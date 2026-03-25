'use client'

import Link from 'next/link'
import TopNav from '@/components/ui/TopNav'
import AppSidebar from '@/components/ui/AppSidebar'
import { CURRICULUM } from '@/lib/content/curriculum'

export default function DashboardPage() {
  const totalLessons = CURRICULUM.reduce((s, m) => s + m.lessons.length, 0)

  return (
    <div className="min-h-screen">
      <TopNav />
      <AppSidebar />

      <main className="ml-0 md:ml-64 mt-16 overflow-y-auto min-h-[calc(100vh-4rem)]">
        <div className="px-8 py-8 max-w-6xl">
          {/* Welcome hero */}
          <div className="mb-12 animate-[fadeIn_0.5s_ease-out]">
            <h1 className="text-[32px] font-bold tracking-tight leading-tight text-[var(--on-surface)]">
              Welcome back.
              <br />
              <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] bg-clip-text text-transparent">
                Continue your construction journey.
              </span>
            </h1>
            <p className="text-[15px] text-[var(--on-surface)] opacity-40 mt-4 max-w-lg leading-relaxed">
              {CURRICULUM.length} modules. {totalLessons} lessons. Interactive 3D training built for professionals.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-5 mb-12">
            {[{ v: '12', l: 'Lessons Completed' }, { v: '840', l: 'Minutes Trained' }].map(s => (
              <div key={s.l} className="bg-white rounded-2xl px-6 py-5 shadow-ambient-sm min-w-[140px]">
                <div className="text-[28px] font-bold text-[var(--primary)] tracking-tight">{s.v}</div>
                <div className="text-[11px] text-[var(--on-surface)] opacity-35 mt-0.5 uppercase tracking-[0.08em]">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Featured module */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-ambient mb-12 animate-[fadeIn_0.6s_ease-out]" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <div className="flex">
              <div className="flex-1 p-8">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--primary)] font-semibold mb-3 opacity-70">New Module</div>
                <h2 className="text-[22px] font-bold tracking-tight text-[var(--on-surface)] mb-2">Adjuster Basics: Scoping Hail Loss</h2>
                <p className="text-[14px] text-[var(--on-surface)] opacity-40 leading-relaxed mb-6 max-w-sm">
                  Learn the complete field inspection protocol to inspect and document storm damage using 3D interactive models.
                </p>
                <Link href="/train/adjuster-basics" className="inline-block px-6 py-2.5 text-[13px] font-semibold text-white gradient-primary rounded-xl hover:opacity-90 transition-opacity">
                  Start Scoping
                </Link>
              </div>
              <div className="w-[280px] bg-gradient-to-br from-[var(--surface-low)] to-[var(--surface-high)] flex items-center justify-center">
                <div className="text-[var(--on-surface)] opacity-10 text-6xl font-bold">3D</div>
              </div>
            </div>
          </div>

          {/* Curriculum grid */}
          <div className="mb-6">
            <h2 className="text-[18px] font-bold tracking-tight text-[var(--on-surface)] mb-1">Curriculum Phases</h2>
            <p className="text-[13px] text-[var(--on-surface)] opacity-35 mb-6">Follow the real construction sequence</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-12">
            {CURRICULUM.map((mod, i) => (
              <Link key={mod.slug} href={`/train/${mod.slug}`}
                className="group bg-white rounded-2xl p-5 shadow-ambient-sm hover:shadow-ambient hover:-translate-y-0.5 transition-all duration-200 animate-[fadeIn_0.5s_ease-out]"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-low)] flex items-center justify-center mb-3 group-hover:bg-[var(--primary-fixed)] transition-colors">
                  <span className="text-[12px] font-bold text-[var(--on-surface)] opacity-30 group-hover:text-[var(--primary)] group-hover:opacity-100 transition-all">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="text-[13px] font-semibold text-[var(--on-surface)] tracking-tight group-hover:text-[var(--primary)] transition-colors leading-snug">{mod.title}</div>
                <div className="text-[11px] text-[var(--on-surface)] opacity-25 mt-1">{mod.lessons.length} lessons</div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
