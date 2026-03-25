'use client'

import { use } from 'react'
import Link from 'next/link'
import TopNav from '@/components/ui/TopNav'
import AppSidebar from '@/components/ui/AppSidebar'
import { getModule } from '@/lib/content/curriculum'

const TYPE_STYLE = { learn: 'text-[var(--primary)]', quiz: 'text-purple-600', inspect: 'text-orange-600' }

export default function ModulePage({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const { moduleSlug } = use(params)
  const mod = getModule(moduleSlug)

  if (!mod) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center"><h1 className="text-xl font-semibold mb-3">Module not found</h1>
          <Link href="/train" className="text-[var(--primary)] text-[14px] hover:underline">Back to training</Link></div>
      </div>
    )
  }
  const totalMin = mod.lessons.reduce((s, l) => s + l.durationMinutes, 0)

  return (
    <div className="min-h-screen">
      <TopNav />
      <AppSidebar />

      <main className="ml-0 md:ml-64 mt-16 overflow-y-auto min-h-[calc(100vh-4rem)]">
        <div className="max-w-3xl mx-auto px-8 py-10 animate-[fadeIn_0.5s_ease-out]">
          <div className="mb-10">
            <Link href="/train" className="text-[var(--on-surface)] opacity-30 hover:opacity-60 text-[12px] transition-opacity mb-4 inline-block">&larr; All Modules</Link>
            <h1 className="text-[28px] font-bold tracking-tight text-[var(--on-surface)] mb-3">{mod.title}</h1>
            <p className="text-[14px] text-[var(--on-surface)] opacity-35 leading-relaxed mb-4">{mod.description}</p>
            <div className="flex items-center gap-4 text-[12px] text-[var(--on-surface)] opacity-25">
              <span>{mod.lessons.length} lessons</span>
              <span className="w-1 h-1 rounded-full bg-[var(--on-surface)] opacity-20" />
              <span>~{totalMin} min</span>
              <span className="w-1 h-1 rounded-full bg-[var(--on-surface)] opacity-20" />
              <span className="capitalize">{mod.difficulty}</span>
            </div>
          </div>

          {/* What you will learn */}
          <div className="bg-white rounded-2xl p-6 shadow-ambient-sm mb-8">
            <h2 className="text-[14px] font-semibold text-[var(--on-surface)] opacity-60 mb-4">What you will learn</h2>
            <ul className="space-y-2.5">
              {mod.lessons.filter(l => l.type === 'learn').map(l => (
                <li key={l.slug} className="flex items-start gap-3 text-[13px] text-[var(--on-surface)] opacity-50 leading-relaxed">
                  <span className="text-[var(--primary)] mt-0.5 shrink-0 opacity-40">-</span>{l.objective}
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
                  className={`flex items-center gap-5 bg-white rounded-2xl px-6 py-5 shadow-ambient-sm transition-all duration-200 group ${
                    isStub ? 'opacity-35 cursor-default' : 'hover:shadow-ambient hover:-translate-y-0.5'
                  }`}>
                  <div className="w-8 h-8 rounded-xl bg-[var(--surface-low)] flex items-center justify-center text-[var(--on-surface)] text-[12px] font-medium opacity-30 shrink-0 group-hover:bg-[var(--primary-fixed)] group-hover:text-[var(--primary)] group-hover:opacity-100 transition-all">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium tracking-tight text-[var(--on-surface)] group-hover:text-[var(--primary)] transition-colors">{lesson.title}</div>
                    <div className="text-[12px] text-[var(--on-surface)] opacity-25 mt-0.5 truncate">{lesson.objective}</div>
                  </div>
                  <span className={`text-[11px] font-medium shrink-0 capitalize ${style}`}>{lesson.type}</span>
                  <span className="text-[var(--on-surface)] opacity-15 text-[12px] w-8 text-right shrink-0">{lesson.durationMinutes}m</span>
                </Link>
              )
            })}
          </div>

          <div className="text-center pb-12">
            <Link href={`/train/${mod.slug}/${mod.lessons[0].slug}`}
              className="inline-block px-8 py-3 text-[14px] font-semibold text-white gradient-primary rounded-xl hover:opacity-90 transition-opacity">
              Start Module
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
