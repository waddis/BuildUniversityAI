'use client'

import { useEffect } from 'react'
import type { LessonStep } from '@/types'

interface StepPanelProps {
  steps: LessonStep[]
  currentStep: number
  onStepChange: (step: number) => void
  lessonTitle: string
  objective?: string
}

const ACTION_LABELS: Record<string, string> = {
  observe: 'Observe', click: 'Click to identify', identify: 'Find the issue',
  sequence: 'Order the steps', quiz: 'Answer', compare: 'Compare',
}

export default function StepPanel({ steps, currentStep, onStepChange, lessonTitle, objective }: StepPanelProps) {
  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); if (!isLast) onStepChange(currentStep + 1); else onStepChange(steps.length) }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); if (!isFirst) onStepChange(currentStep - 1) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentStep, isFirst, isLast, onStepChange, steps.length])

  return (
    <div className="flex flex-col h-full">
      {/* Header — module context */}
      <div className="px-6 pt-6 pb-4">
        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--primary)] font-semibold opacity-60 mb-2">Current Module</div>
        <h2 className="text-[16px] font-bold tracking-tight text-[var(--on-surface)] leading-snug">{lessonTitle}</h2>
        {objective && <p className="text-[12px] text-[var(--on-surface)] opacity-35 mt-1.5 leading-relaxed">{objective}</p>}
      </div>

      {/* Lesson step list — shows all steps with current highlighted */}
      <div className="px-4 mb-3">
        <div className="space-y-1">
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onStepChange(i)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150 ${
                i === currentStep
                  ? 'bg-[var(--primary-fixed)] text-[var(--primary)]'
                  : i < currentStep
                    ? 'text-[var(--on-surface)] opacity-40'
                    : 'text-[var(--on-surface)] opacity-25 hover:opacity-50 hover:bg-[var(--surface-low)]'
              }`}
            >
              <span className={`w-5 h-5 rounded-lg text-[9px] font-bold flex items-center justify-center shrink-0 ${
                i === currentStep ? 'gradient-primary text-white' : i < currentStep ? 'bg-[var(--primary)] text-white opacity-40' : 'bg-[var(--surface-high)] text-[var(--on-surface)] opacity-30'
              }`}>{i + 1}</span>
              <span className="text-[12px] truncate">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Current step detail */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {step && (
          <div key={step.id} className="animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-[var(--surface-low)] rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--primary)] font-semibold">Technical Instruction</span>
                <span className="text-[10px] bg-[var(--surface-high)] text-[var(--on-surface)] opacity-40 px-2 py-0.5 rounded-lg capitalize">{ACTION_LABELS[step.action_type] ?? step.action_type}</span>
              </div>
              <p className="text-[13px] text-[var(--on-surface)] opacity-70 leading-relaxed">{step.instruction}</p>
            </div>

            {step.narration && (
              <details className="group mb-4">
                <summary className="text-[var(--primary)] text-[12px] cursor-pointer hover:opacity-80 transition-opacity">Read detailed narration</summary>
                <p className="text-[12px] text-[var(--on-surface)] opacity-35 leading-relaxed mt-2 pl-4" style={{ borderLeft: '2px solid var(--primary-fixed)' }}>{step.narration}</p>
              </details>
            )}

            {step.code_reference_ids?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {step.code_reference_ids.map((_, i) => (
                  <span key={i} className="text-[10px] bg-[var(--primary-fixed)] text-[var(--primary)] px-2.5 py-1 rounded-lg font-medium">Code Reference {i + 1}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="px-6 pb-4">
        <div className="text-[10px] text-[var(--on-surface)] opacity-15 text-center">Arrow keys to navigate</div>
      </div>
    </div>
  )
}
