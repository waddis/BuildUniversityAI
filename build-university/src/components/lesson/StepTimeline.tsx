'use client'

interface StepTimelineProps { totalSteps: number; currentStep: number; onStepClick: (step: number) => void }

export default function StepTimeline({ totalSteps, currentStep, onStepClick }: StepTimelineProps) {
  if (totalSteps === 0) return null
  return (
    <div className="flex gap-1 px-1">
      {Array.from({ length: totalSteps }, (_, i) => (
        <button key={i} onClick={() => onStepClick(i)} aria-label={`Step ${i + 1}`}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i < currentStep ? 'bg-[var(--primary)] opacity-40' : i === currentStep ? 'gradient-primary shadow-[0_0_8px_rgba(0,78,159,0.3)]' : 'bg-[var(--surface-high)] hover:bg-[var(--surface-highest)]'
          }`} />
      ))}
    </div>
  )
}
