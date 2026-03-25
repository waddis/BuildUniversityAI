'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import StepPanel from './StepPanel'
import StepTimeline from './StepTimeline'
import CodeDrawer from './CodeDrawer'
import ViewerToolbar from './ViewerToolbar'
import type { Lesson, LessonStep, CodeReference, CameraPreset } from '@/types'
import { VISIBILITY_GROUPS } from '@/lib/3d/complex-house'

// Dynamic import to avoid SSR issues with Three.js
const SceneViewer = dynamic(() => import('@/components/3d/SceneViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a14]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-white/20 text-sm">Loading 3D viewer...</p>
      </div>
    </div>
  ),
})

interface LessonPlayerProps {
  lesson: Lesson
  steps: LessonStep[]
  codeReferences?: CodeReference[]
}

// Visibility groups from the complex house model
const DEFAULT_GROUPS = VISIBILITY_GROUPS

export default function LessonPlayer({ lesson, steps, codeReferences = [] }: LessonPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [manualExplode, setManualExplode] = useState<number | null>(null)
  const [codeOpen, setCodeOpen] = useState(false)
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [clickedMesh, setClickedMesh] = useState<string | null>(null)

  const step = steps[currentStep]

  // Derive camera preset from current step
  const cameraPreset: CameraPreset | null = step?.camera_preset ?? null

  // Derive highlighted groups from current step
  const highlightedGroups = step?.highlighted_groups ?? []

  // Derive hidden groups — merge step-level with user toggles
  const effectiveHidden = [...new Set([...(step?.hidden_groups ?? []), ...hiddenGroups])]

  // Explode: step-driven or manual slider (manual overrides step)
  const explodedOffset = manualExplode ?? step?.exploded_state?.offset ?? 0

  // Get code references for current step
  const stepCodeRefs = step?.code_reference_ids?.length
    ? codeReferences.filter(r => step.code_reference_ids.includes(r.id))
    : []

  const handleStepChange = useCallback((newStep: number) => {
    if (newStep >= 0 && newStep < steps.length) {
      setCurrentStep(newStep)
      setCodeOpen(false)
      setManualExplode(null) // reset to step-driven explode
      setClickedMesh(null)
    }
  }, [steps.length])

  const handleExplodeChange = useCallback((val: number) => {
    setManualExplode(val > 0.05 ? val : null)
  }, [])

  const handleToggleGroup = useCallback((group: string) => {
    setHiddenGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    )
  }, [])

  const handleMeshClick = useCallback((meshKey: string) => {
    setClickedMesh(prev => prev === meshKey ? null : meshKey)
  }, [])

  return (
    <div className="fixed inset-0 bg-[#06060e] flex">
      {/* 3D Viewer — fills remaining space */}
      <div className="flex-1 relative">
        <SceneViewer
          cameraPreset={cameraPreset}
          highlightedGroups={highlightedGroups}
          hiddenGroups={effectiveHidden}
          onMeshClick={handleMeshClick}
          explodedOffset={explodedOffset}
        />

        {/* Toolbar overlay */}
        <ViewerToolbar
          explodedOffset={explodedOffset}
          onExplodeChange={handleExplodeChange}
          onCodeToggle={() => setCodeOpen(o => !o)}
          codeOpen={codeOpen}
          visibilityGroups={DEFAULT_GROUPS}
          hiddenGroups={hiddenGroups}
          onToggleGroup={handleToggleGroup}
        />

        {/* Clicked mesh info tooltip */}
        {clickedMesh && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-amber-500/30">
            <div className="flex items-center gap-3">
              <span className="text-amber-500 text-xs font-mono">{clickedMesh}</span>
              <button onClick={() => setClickedMesh(null)} className="text-white/30 hover:text-white text-xs">dismiss</button>
            </div>
          </div>
        )}

        {/* Code reference drawer */}
        <CodeDrawer
          references={stepCodeRefs}
          open={codeOpen}
          onClose={() => setCodeOpen(false)}
        />

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(c => !c)}
          className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/10 text-white/40 hover:text-white text-xs"
        >
          {sidebarCollapsed ? 'Show Steps' : 'Hide Steps'}
        </button>

        {/* Bottom timeline (visible when sidebar collapsed) */}
        {sidebarCollapsed && (
          <div className="absolute bottom-4 left-4 right-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-amber-500 text-xs font-mono">STEP {(step?.step_number ?? 0)}</span>
              <span className="text-white/60 text-sm">{step?.title}</span>
            </div>
            <StepTimeline totalSteps={steps.length} currentStep={currentStep} onStepClick={handleStepChange} />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleStepChange(currentStep - 1)}
                disabled={currentStep === 0}
                className="px-3 py-1 text-xs bg-white/5 rounded-lg text-white/50 hover:text-white disabled:opacity-30"
              >
                Back
              </button>
              <button
                onClick={() => handleStepChange(currentStep + 1)}
                disabled={currentStep === steps.length - 1}
                className="px-3 py-1 text-xs bg-amber-500 text-black rounded-lg font-semibold hover:bg-amber-400 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step Panel — right sidebar */}
      {!sidebarCollapsed && (
        <div className="w-96 bg-white/[0.02] border-l border-white/8 flex flex-col shrink-0">
          <div className="flex-1 overflow-hidden">
            <StepPanel
              steps={steps}
              currentStep={currentStep}
              onStepChange={handleStepChange}
              lessonTitle={lesson.title}
              objective={lesson.objective ?? undefined}
            />
          </div>

          {/* Timeline at bottom of sidebar */}
          <div className="p-3 border-t border-white/8">
            <StepTimeline totalSteps={steps.length} currentStep={currentStep} onStepClick={handleStepChange} />
          </div>
        </div>
      )}
    </div>
  )
}
