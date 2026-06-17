'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import TopNav from '@/components/ui/TopNav'
import AppSidebar from '@/components/ui/AppSidebar'

const SIDE_CARDS = [
  { title: 'Adjuster Basics: Hail Damage', desc: 'Field inspection protocol for storm damage documentation.', tag: 'Course', lessons: 9 },
  { title: 'Commercial Hotel Model', desc: 'Mediterranean Revival — 5 wings, cupolas, BUR + tile roofs, 900+ parts.', tag: 'Commercial', lessons: 0, href: '/commercial' },
]

function useTrainingProgress() {
  const [completedCount, setCompletedCount] = useState(0)
  const [inProgress, setInProgress] = useState<string | null>(null)
  const [hoursTraining, setHoursTraining] = useState('0h')

  useEffect(() => {
    try {
      const completedRaw = localStorage.getItem('buildright_completed')
      const completed: string[] = completedRaw ? JSON.parse(completedRaw) : []
      setCompletedCount(completed.length)
      // Average 12 minutes per lesson
      const totalMinutes = completed.length * 12
      const hours = totalMinutes / 60
      setHoursTraining(hours >= 1 ? `${hours.toFixed(1)}h` : `${totalMinutes}m`)

      const progressRaw = localStorage.getItem('buildright_progress')
      if (progressRaw) setInProgress(progressRaw)
    } catch {
      // localStorage unavailable or malformed
    }
  }, [])

  return { completedCount, inProgress, hoursTraining }
}

export default function DashboardPage() {
  const { completedCount, inProgress, hoursTraining } = useTrainingProgress()

  const STATS = [
    { value: '128', label: 'Assemblies', color: '#FF8C00' },
    { value: '04', label: 'Code Violations', color: '#82CFFF' },
    { value: hoursTraining, label: 'Hours Training', color: '#ADCBDA' },
  ]

  return (
    <div className="min-h-screen bg-[#131313]">
      <TopNav />
      <AppSidebar />

      <main className="ml-0 md:ml-64 mt-16 overflow-y-auto min-h-[calc(100vh-4rem)]">
        <div className="px-8 py-8 max-w-6xl animate-[fadeIn_0.4s_ease-out]">

          {/* Stats row */}
          <div className="flex gap-4 mb-8 animate-[fadeIn_0.4s_ease-out]">
            {STATS.map(s => (
              <div key={s.label} className="bg-[var(--surface-container)] rounded-xl px-6 py-5 min-w-[160px]" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.12)' }}>
                <div className="font-headline text-[32px] font-bold tracking-tight" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[11px] text-[#e5e2e1]/30 mt-1 uppercase tracking-[0.08em] font-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Resume / completed cards */}
          {(inProgress || completedCount > 0) && (
            <div className="flex flex-wrap gap-4 mb-8 animate-[fadeIn_0.45s_ease-out]">
              {inProgress && (
                <Link href={`/train/${inProgress}`} className="flex items-center gap-4 bg-[var(--surface-container)] rounded-xl px-6 py-4 hover:bg-[var(--surface-high)] transition-colors group" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.12)' }}>
                  <div className="w-10 h-10 rounded-xl bg-[#FF8C00]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#FF8C00] text-[20px]">play_circle</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#e5e2e1] group-hover:text-[#FF8C00] transition-colors">Continue where you left off</div>
                    <div className="text-[11px] text-[#e5e2e1]/30 mt-0.5">Resume your current lesson</div>
                  </div>
                </Link>
              )}
              {completedCount > 0 && (
                <div className="flex items-center gap-4 bg-[var(--surface-container)] rounded-xl px-6 py-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.12)' }}>
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#e5e2e1]">{completedCount} lesson{completedCount !== 1 ? 's' : ''} completed</div>
                    <div className="text-[11px] text-[#e5e2e1]/30 mt-0.5">Keep up the momentum</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Featured hero card — spans 2 cols */}
            <div className="lg:col-span-2 bg-[var(--surface-low)] rounded-2xl overflow-hidden animate-[fadeIn_0.5s_ease-out]" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
              <div className="flex h-full">
                <div className="flex-1 p-8 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#FF8C00] font-label font-semibold">Flagship Model</span>
                    <h2 className="font-headline text-[24px] font-bold tracking-tight text-[#e5e2e1] mt-3 mb-2 leading-tight">
                      The Flagship Model:<br />Complex Roofs
                    </h2>
                    <p className="text-[14px] text-[#e5e2e1]/35 leading-relaxed max-w-sm">
                      Gables, valleys, dormers, turrets, chimney intersections. Master the geometry that defines real-world construction.
                    </p>
                  </div>
                  <div className="mt-6">
                    {/* Progress bar */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-1.5 bg-[var(--surface-high)] rounded-full overflow-hidden">
                        <div className="gradient-primary h-full rounded-full" style={{ width: '65%' }} />
                      </div>
                      <span className="text-[12px] font-label text-[#ffb77d]">65%</span>
                    </div>
                    <Link href="/train/complex-roofs" className="inline-block px-6 py-3 gradient-primary text-[#131313] font-bold text-[13px] rounded-lg hover:opacity-90 transition-opacity font-headline tracking-wide uppercase">
                      Resume Learning
                    </Link>
                  </div>
                </div>
                <div className="w-[260px] bg-[var(--surface-container)] flex items-center justify-center relative overflow-hidden">
                  {/* Wireframe grid */}
                  <div className="absolute inset-0 opacity-[0.04]" style={{
                    backgroundImage: 'linear-gradient(rgba(255,183,125,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,183,125,0.4) 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                  }} />
                  <div className="text-[#ffb77d]/15 text-7xl font-bold font-headline relative z-10">3D</div>
                </div>
              </div>
            </div>

            {/* Side cards */}
            <div className="flex flex-col gap-4">
              {SIDE_CARDS.map(card => (
                <Link key={card.title} href="/train" className="block bg-[var(--surface-container)] rounded-xl p-5 hover:bg-[var(--surface-high)] transition-all duration-200 group" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.12)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] uppercase tracking-[0.12em] font-label text-[#82CFFF]/70">{card.tag}</span>
                    <span className="text-[#e5e2e1]/15 text-[10px] font-label ml-auto">{card.lessons} lessons</span>
                  </div>
                  <h3 className="font-headline text-[14px] font-bold text-[#e5e2e1] tracking-tight group-hover:text-[#ffb77d] transition-colors leading-snug">{card.title}</h3>
                  <p className="text-[12px] text-[#e5e2e1]/30 mt-1.5 leading-relaxed">{card.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Live session alert */}
          <div className="mt-6 bg-[var(--surface-low)] rounded-xl px-6 py-4 flex items-center justify-between animate-[fadeIn_0.6s_ease-out]" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.12)' }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#FF8C00] animate-pulse" />
              <span className="text-[13px] text-[#e5e2e1]/50 font-label">Live Session Available</span>
            </div>
            <Link href="/train" className="text-[12px] text-[#FF8C00] font-label font-semibold hover:text-[#ffb77d] transition-colors">
              Join Now
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}
