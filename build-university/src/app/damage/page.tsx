'use client'

import Link from 'next/link'
import { ALL_DAMAGE_SCENARIOS } from '@/lib/content/damage-scenarios'

const SEVERITY_BADGE: Record<string, string> = {
  minor: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  moderate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  severe: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function DamageIndexPage() {
  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Header */}
      <div className="border-b border-white/8 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link href="/" className="text-white/30 text-xs hover:text-white/50 transition-colors">
            &larr; Back to BuildRight 3D
          </Link>
          <h1 className="text-2xl font-bold mt-4">Damage Identification Library</h1>
          <p className="text-white/40 text-sm mt-1 max-w-xl">
            Interactive 3D walkthroughs showing how to identify, document, and distinguish common damage types.
            Each scenario includes cinematic camera paths, annotations, and expert narration.
          </p>
        </div>
      </div>

      {/* Scenario cards */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_DAMAGE_SCENARIOS.map(scenario => {
            const maxSeverity = scenario.annotations.reduce((max, ann) => {
              const order = ['minor', 'moderate', 'severe', 'critical']
              return order.indexOf(ann.severity) > order.indexOf(max) ? ann.severity : max
            }, 'minor')

            return (
              <Link
                key={scenario.id}
                href={`/damage/${scenario.id}`}
                className="group bg-white/[0.02] border border-white/8 rounded-xl p-5 hover:border-amber-500/30 hover:bg-white/[0.04] transition-all"
              >
                {/* Preview placeholder */}
                <div className="aspect-video bg-white/[0.03] rounded-lg mb-4 flex items-center justify-center border border-white/5 group-hover:border-amber-500/10 transition-colors">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                      </svg>
                    </div>
                    <p className="text-white/20 text-[10px]">3D Interactive</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 mb-2">
                  <h2 className="text-sm font-semibold flex-1">{scenario.title}</h2>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${SEVERITY_BADGE[maxSeverity]}`}>
                    {maxSeverity}
                  </span>
                </div>

                <p className="text-white/40 text-xs leading-relaxed mb-3">{scenario.subtitle}</p>

                <div className="flex items-center gap-3 text-white/25 text-[10px]">
                  <span>{scenario.stops.length} stops</span>
                  <span>{scenario.annotations.length} annotations</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
