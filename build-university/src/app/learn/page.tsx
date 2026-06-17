'use client'

import Link from 'next/link'
import { CONSTRUCTION_PHASES } from '@/types'

const PHASE_INFO: Record<string, { title: string; description: string; moduleCount: number }> = {
  site_prep:        { title: 'Site & Leveling', description: 'Reading the site, grading, drainage, benchmarks', moduleCount: 0 },
  excavation:       { title: 'Excavation', description: 'Trenching, soil prep, compaction', moduleCount: 0 },
  foundation:       { title: 'Foundation', description: 'Footings, stem walls, slabs, waterproofing', moduleCount: 0 },
  framing_floor:    { title: 'Floor Framing', description: 'Joists, beams, subfloor', moduleCount: 0 },
  framing_walls:    { title: 'Wall Framing', description: 'Layout, headers, load paths, shear walls', moduleCount: 0 },
  framing_roof:     { title: 'Roof Framing', description: 'Rafters, ridges, valleys, hips, dormers, turrets', moduleCount: 1 },
  sheathing:        { title: 'Sheathing', description: 'Roof and wall sheathing sequence', moduleCount: 0 },
  dry_in:           { title: 'Dry-In & Waterproofing', description: 'Underlayment, ice barrier, valley metal, flashing', moduleCount: 1 },
  windows_doors:    { title: 'Windows & Doors', description: 'Installation, flashing integration', moduleCount: 0 },
  wrb_cladding:     { title: 'WRB & Cladding', description: 'Drainage plane, siding, kickout flashing', moduleCount: 1 },
  mep_rough:        { title: 'MEP Rough-In', description: 'Plumbing, HVAC, electrical, penetrations', moduleCount: 0 },
  insulation:       { title: 'Insulation & Energy', description: 'Thermal boundary, air sealing, ventilation', moduleCount: 0 },
  drywall_finishes: { title: 'Drywall & Finishes', description: 'Interior close-up, trim, paint', moduleCount: 0 },
  final_inspection: { title: 'Final Inspection', description: 'Checklists, punch list, handoff', moduleCount: 0 },
}

export default function LearnPage() {
  return (
    <div className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      <Link href="/" className="text-[#e5e2e1]/30 hover:text-[#e5e2e1]/60 text-sm mb-8 inline-block">&larr; Home</Link>
      <h1 className="text-3xl font-bold mb-2">Construction Phases</h1>
      <p className="text-[#e5e2e1]/40 mb-10">Follow the real build sequence from ground to finish</p>

      <div className="space-y-3">
        {CONSTRUCTION_PHASES.map((phase, i) => {
          const info = PHASE_INFO[phase]
          const hasContent = info.moduleCount > 0
          return (
            <Link
              key={phase}
              href={hasContent ? `/learn/${phase}` : '#'}
              className={`block bg-[#201f1f] rounded-xl p-5 transition-colors ${
                hasContent
                  ? 'hover:bg-[#2a2a2a] cursor-pointer'
                  : 'opacity-40 cursor-default'
              }`}
              style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}
            >
              <div className="flex items-center gap-4">
                <div className="text-[#FF8C00]/60 font-mono text-sm w-8">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{info.title}</div>
                  <div className="text-[#e5e2e1]/40 text-sm">{info.description}</div>
                </div>
                <div className="text-right">
                  {hasContent ? (
                    <span className="text-xs bg-[#FF8C00]/10 text-[#FF8C00] px-2 py-1 rounded-full">
                      {info.moduleCount} module{info.moduleCount !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-[#e5e2e1]/20">Coming soon</span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
