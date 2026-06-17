'use client'

import { use, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const SceneViewer = dynamic(() => import('@/components/3d/SceneViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#131313]">
      <div className="w-8 h-8 border-2 border-[#FF8C00]/30 border-t-[#FF8C00] rounded-full animate-spin" />
    </div>
  ),
})

// Demo inspection challenges — will be loaded from DB
interface InspectionIssue {
  id: string
  meshKey: string
  title: string
  description: string
  severity: 'minor' | 'moderate' | 'severe' | 'critical'
  codeRef?: string
  found: boolean
}

const DEMO_ISSUES: InspectionIssue[] = [
  {
    id: 'i1', meshKey: 'valley_front', title: 'Fasteners in valley water channel',
    description: 'Nails visible in the center of the valley metal. All fasteners must be at outer edges only — every penetration in the water channel is a leak point.',
    severity: 'critical', codeRef: 'NRCA RMS-7.3', found: false,
  },
  {
    id: 'i2', meshKey: 'ice_valley_f', title: 'Missing valley ice barrier',
    description: 'No self-adhering ice barrier membrane beneath the valley metal. IRC R905.2.7.1 requires ice barrier in all valley areas extending 24" from centerline.',
    severity: 'critical', codeRef: 'IRC R905.2.7.1', found: false,
  },
  {
    id: 'i3', meshKey: 'step_flash_2', title: 'Continuous instead of step flashing',
    description: 'A single continuous piece of flashing was used at the roof-to-wall transition instead of individual step pieces. This creates a dam behind shingles that traps water.',
    severity: 'severe', codeRef: 'IRC R905.2.8.3', found: false,
  },
  {
    id: 'i4', meshKey: 'drip_eave_f', title: 'Drip edge installed over underlayment at eave',
    description: 'At the eave, drip edge must be installed UNDER the underlayment so water running off the underlayment lands on top of the drip edge. At rakes, drip edge goes OVER.',
    severity: 'moderate', codeRef: 'IRC R905.2.8.5', found: false,
  },
  {
    id: 'i5', meshKey: 'bump_shed_roof', title: 'Dead valley — no cricket or diverter',
    description: 'The rear bump-out shed roof creates a dead valley where it meets the main body wall. Without a cricket or diverter, water and debris accumulate in this transition, causing premature failure.',
    severity: 'severe', found: false,
  },
]

const SEVERITY_COLORS = {
  minor: 'bg-[#2a2a2a] text-[#e5e2e1]/60',
  moderate: 'bg-yellow-500/10 text-yellow-400',
  severe: 'bg-orange-500/10 text-orange-400',
  critical: 'bg-red-500/10 text-red-400',
}

export default function InspectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [issues, setIssues] = useState(DEMO_ISSUES)
  const [selectedIssue, setSelectedIssue] = useState<InspectionIssue | null>(null)
  const [showResults, setShowResults] = useState(false)

  const foundCount = issues.filter(i => i.found).length
  const totalCount = issues.length
  const score = Math.round((foundCount / totalCount) * 100)

  const handleMeshClick = useCallback((meshKey: string) => {
    const issue = issues.find(i => i.meshKey === meshKey && !i.found)
    if (issue) {
      setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, found: true } : i))
      setSelectedIssue(issue)
    }
  }, [issues])

  const handleFinish = () => setShowResults(true)
  const handleReset = () => {
    setIssues(DEMO_ISSUES)
    setSelectedIssue(null)
    setShowResults(false)
  }

  return (
    <div className="fixed inset-0 bg-[#131313] flex">
      {/* 3D Viewer */}
      <div className="flex-1 relative">
        <SceneViewer onMeshClick={handleMeshClick} />

        {/* Instructions overlay */}
        <div className="absolute top-4 left-4 z-10 rounded-lg px-4 py-3 max-w-sm" style={{ background: 'rgba(42,42,42,0.7)', backdropFilter: 'blur(20px)', boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
          <div className="text-[#FF8C00] text-xs font-semibold uppercase tracking-wider mb-1">Inspection Challenge</div>
          <p className="text-[#e5e2e1]/60 text-sm">Click on components to identify code issues, missing flashing, and installation defects.</p>
          <div className="mt-2 text-[#e5e2e1]/40 text-xs">Found: {foundCount} / {totalCount}</div>
        </div>

        {/* Found issue toast */}
        {selectedIssue && (
          <div className="absolute bottom-4 left-4 right-4 z-10 rounded-xl p-4 max-w-lg mx-auto animate-[slideUp_0.3s_ease-out]" style={{ background: 'rgba(42,42,42,0.7)', backdropFilter: 'blur(20px)', boxShadow: 'inset 0 0 0 1px rgba(255,140,0,0.3)' }}>
            <div className="flex items-start gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLORS[selectedIssue.severity]} shrink-0 mt-0.5`}>
                {selectedIssue.severity}
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{selectedIssue.title}</h3>
                <p className="text-[#e5e2e1]/50 text-xs mt-1 leading-relaxed">{selectedIssue.description}</p>
                {selectedIssue.codeRef && (
                  <span className="inline-block mt-2 text-[#FF8C00]/70 text-xs font-mono bg-[#FF8C00]/5 px-2 py-0.5 rounded">
                    {selectedIssue.codeRef}
                  </span>
                )}
              </div>
              <button onClick={() => setSelectedIssue(null)} className="text-[#e5e2e1]/30 hover:text-[#e5e2e1] text-xs shrink-0">close</button>
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-80 bg-[#1c1b1b] flex flex-col shrink-0" style={{ boxShadow: 'inset 1px 0 0 rgba(86,67,52,0.15)' }}>
        <div className="p-5" style={{ boxShadow: 'inset 0 -1px 0 rgba(86,67,52,0.15)' }}>
          <h1 className="text-lg font-bold">Roof Inspection</h1>
          <p className="text-[#e5e2e1]/40 text-xs mt-1 capitalize">{slug.replace(/-/g, ' ')}</p>
        </div>

        {showResults ? (
          <div className="flex-1 p-5 flex flex-col items-center justify-center text-center">
            <div className={`text-5xl font-bold mb-2 ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
              {score}%
            </div>
            <p className="text-[#e5e2e1]/40 text-sm mb-1">You found {foundCount} of {totalCount} issues</p>
            <p className="text-[#e5e2e1]/30 text-xs mb-6">
              {score >= 80 ? 'Excellent inspection skills.' : score >= 60 ? 'Good, but you missed some critical items.' : 'Review the lesson -- several critical issues were missed.'}
            </p>
            <button onClick={handleReset} className="px-4 py-2 bg-[#FF8C00] text-[#131313] text-sm font-semibold rounded-lg hover:opacity-90">
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-[#e5e2e1]/30 text-xs uppercase tracking-wider mb-3">Issues Found</div>
              {issues.filter(i => i.found).map(issue => (
                <div key={issue.id} className="bg-[#201f1f] rounded-lg p-3" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-xs">found</span>
                    <span className="text-sm">{issue.title}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${SEVERITY_COLORS[issue.severity]} mt-1 inline-block`}>
                    {issue.severity}
                  </span>
                </div>
              ))}
              {foundCount === 0 && (
                <p className="text-[#e5e2e1]/20 text-xs text-center py-4">Click on suspicious areas in the model</p>
              )}
            </div>

            <div className="p-4 space-y-2" style={{ boxShadow: 'inset 0 1px 0 rgba(86,67,52,0.15)' }}>
              {/* Progress bar */}
              <div className="flex gap-1">
                {issues.map(issue => (
                  <div key={issue.id} className={`h-2 flex-1 rounded-full ${issue.found ? 'bg-green-500' : 'bg-[#2a2a2a]'}`} />
                ))}
              </div>
              <button
                onClick={handleFinish}
                className="w-full px-4 py-2 bg-[#FF8C00] text-[#131313] text-sm font-semibold rounded-lg hover:opacity-90"
              >
                Submit Inspection ({foundCount}/{totalCount})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
