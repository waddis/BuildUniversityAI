'use client'

import { use, useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getModule, getLesson, type CurriculumLesson, type CurriculumModule, type CalloutData } from '@/lib/content/curriculum'
import StepPanel from '@/components/lesson/StepPanel'
import StepTimeline from '@/components/lesson/StepTimeline'
import CodeDrawer from '@/components/lesson/CodeDrawer'
import ViewerToolbar from '@/components/lesson/ViewerToolbar'
import QuizPanel from '@/components/lesson/QuizPanel'
import { VISIBILITY_GROUPS } from '@/lib/3d/complex-house'
import type { LessonStep, CodeReference, QuizQuestion } from '@/types'

const SceneViewer = dynamic(() => import('@/components/3d/SceneViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#131313]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#FF8C00]/30 border-t-[#FF8C00] rounded-full animate-spin" />
        <p className="text-[#e5e2e1] opacity-40 text-xs">Loading 3D model...</p>
      </div>
    </div>
  ),
})

// ── Glass panel style helper ──
const glassPanel = {
  background: 'rgba(42,42,42,0.70)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(86,67,52,0.15)',
}

// ── Data converters ──
function toSteps(lesson: CurriculumLesson): LessonStep[] {
  if (!lesson.steps) return []
  return lesson.steps.map((s, i) => ({
    id: `${lesson.slug}-s${i}`, lesson_id: lesson.slug, step_number: i + 1,
    title: s.title, instruction: s.instruction, narration: s.narration ?? null,
    action_type: s.actionType ?? 'observe', target_assembly_ids: [],
    camera_preset: s.camera,
    exploded_state: s.explodeOffset ? { offset: s.explodeOffset } : null,
    hidden_groups: s.hiddenGroups ?? [], highlighted_groups: s.highlightedGroups ?? [],
    code_reference_ids: (s.codeRefs ?? []).map((_, ci) => `cr-${i}-${ci}`),
    validation_rule: null, config: {}, created_at: '',
  }))
}

function toCodeRefs(lesson: CurriculumLesson): CodeReference[] {
  if (!lesson.steps) return []
  const refs: CodeReference[] = []
  lesson.steps.forEach((s, i) => {
    (s.codeRefs ?? []).forEach((cr, ci) => {
      refs.push({
        id: `cr-${i}-${ci}`, code_family: cr.family, code_section: cr.section,
        title: `${cr.family} ${cr.section}`, short_summary: cr.summary,
        long_explanation: null, jurisdiction_scope: null, climate_scope: null,
        tags: [], created_at: '', updated_at: '',
      })
    })
  })
  return refs
}

function toQuizQuestions(lesson: CurriculumLesson): QuizQuestion[] {
  if (!lesson.quizQuestions) return []
  return lesson.quizQuestions.map((q, i) => ({
    id: `q${i}`, text: q.text, type: q.type, options: q.options,
    correct_answer: q.correctAnswer, explanation: q.explanation,
  }))
}

// ── Top bar — dark glass nav with step progress ──
function LessonTopBar({ mod, lessonTitle, type, stepNum, totalSteps }: {
  mod: CurriculumModule; lessonTitle: string; type: string; stepNum: number; totalSteps: number
}) {
  const pct = totalSteps > 0 ? Math.round((stepNum / totalSteps) * 100) : 0
  const typeColor = type === 'quiz' ? 'text-purple-400' : type === 'inspect' ? 'text-[#82CFFF]' : 'text-[#FF8C00]'
  return (
    <div className="h-12 flex items-center px-5 gap-3 shrink-0 z-40 relative" style={glassPanel}>
      <Link href="/" className="text-[13px] font-semibold text-[#FF8C00] tracking-tight mr-2">BuildRight 3D</Link>
      <span className="text-[#e5e2e1] opacity-10 text-[12px]">/</span>
      <Link href={`/train/${mod.slug}`} className="text-[#e5e2e1] opacity-30 hover:opacity-60 text-[12px] truncate max-w-32 transition-opacity">{mod.title}</Link>
      <span className="text-[#e5e2e1] opacity-10 text-[12px]">/</span>
      <span className="text-[#e5e2e1] opacity-60 text-[12px] truncate">{lessonTitle}</span>
      <div className="ml-auto flex items-center gap-4">
        {totalSteps > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#e5e2e1] opacity-30">Step {stepNum} of {totalSteps}</span>
            <div className="w-20 h-1.5 bg-[#353534] rounded-full overflow-hidden">
              <div className="h-full bg-[#FF8C00] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-medium text-[#FF8C00]">{pct}%</span>
          </div>
        )}
        <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${typeColor}`}>{type}</span>
      </div>
    </div>
  )
}

const SEV = {
  minor: 'bg-[#353534] text-[#e5e2e1] opacity-60',
  moderate: 'bg-yellow-500/10 text-yellow-400',
  severe: 'bg-[#FF8C00]/10 text-[#FF8C00]',
  critical: 'bg-red-500/10 text-red-400',
}

export default function TrainLessonPage({ params }: { params: Promise<{ moduleSlug: string; lessonSlug: string }> }) {
  const { moduleSlug, lessonSlug } = use(params)
  const data = getLesson(moduleSlug, lessonSlug)
  const mod = getModule(moduleSlug)

  if (!data || !mod) {
    return (
      <div className="min-h-screen bg-[#131313] flex items-center justify-center animate-[fadeIn_0.3s_ease-out]">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2 text-[#e5e2e1]">Lesson not found</h1>
          <p className="text-[#e5e2e1] opacity-30 text-sm mb-4">This lesson may have been moved or removed</p>
          <Link href="/train" className="text-[#FF8C00] text-sm hover:underline">Back to training</Link>
        </div>
      </div>
    )
  }

  const { lesson } = data
  if (lesson.type === 'learn') return <LearnMode lesson={lesson} mod={mod} />
  if (lesson.type === 'quiz') return <QuizMode lesson={lesson} mod={mod} />
  if (lesson.type === 'inspect') return <InspectMode lesson={lesson} mod={mod} />
  return null
}

// ════════════════════════════════════════════════════════════════════════════════
// LEARN MODE
// ════════════════════════════════════════════════════════════════════════════════
function LearnMode({ lesson, mod }: { lesson: CurriculumLesson; mod: CurriculumModule }) {
  const steps = useMemo(() => toSteps(lesson), [lesson])
  const codeRefs = useMemo(() => toCodeRefs(lesson), [lesson])
  const [currentStep, setCurrentStep] = useState(0)
  const [manualExplode, setManualExplode] = useState<number | null>(null)
  const [codeOpen, setCodeOpen] = useState(false)
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([])
  const [completed, setCompleted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [blueprintMode, setBlueprintMode] = useState(false)

  const step = steps[currentStep]
  const explodedOffset = manualExplode ?? step?.exploded_state?.offset ?? 0
  const effectiveHidden = [...new Set([...(step?.hidden_groups ?? []), ...hiddenGroups])]
  const stepCodeRefs = step?.code_reference_ids?.length ? codeRefs.filter(r => step.code_reference_ids.includes(r.id)) : []

  // Get callouts for current step from raw lesson data
  const stepCallouts: CalloutData[] = useMemo(() => {
    if (!lesson.steps || currentStep >= lesson.steps.length) return []
    return lesson.steps[currentStep]?.callouts ?? []
  }, [lesson.steps, currentStep])

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)')
    if (mq.matches) setSidebarOpen(false)
  }, [])

  const handleStepChange = useCallback((s: number) => {
    if (s >= 0 && s < steps.length) {
      setCurrentStep(s); setManualExplode(null); setCodeOpen(false)
    }
    if (s >= steps.length) setCompleted(true)
  }, [steps.length])

  const lessonIdx = mod.lessons.findIndex(l => l.slug === lesson.slug)
  const nextLesson = lessonIdx < mod.lessons.length - 1 ? mod.lessons[lessonIdx + 1] : null

  if (completed) {
    return (
      <div className="fixed inset-0 bg-[#131313] flex items-center justify-center animate-[scaleIn_0.4s_ease-out]">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-green-400 text-2xl">done</span>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-[#e5e2e1]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{lesson.title}</h2>
          <p className="text-[#e5e2e1] opacity-40 text-sm mb-2">{lesson.objective}</p>
          <p className="text-green-400/80 text-xs mb-8">
            Lesson {lessonIdx + 1} of {mod.lessons.length} in {mod.title}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href={`/train/${mod.slug}`} className="px-5 py-2.5 bg-[#2a2a2a] rounded-lg text-sm text-[#e5e2e1] hover:bg-[#353534] transition-colors" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
              Back to Module
            </Link>
            {nextLesson && (
              <Link href={`/train/${mod.slug}/${nextLesson.slug}`} className="px-5 py-2.5 bg-[#FF8C00] text-white rounded-lg text-sm font-semibold hover:bg-[#FF8C00]/90 transition-colors">
                Next: {nextLesson.title}
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  const stepPct = steps.length > 0 ? Math.round(((currentStep + 1) / steps.length) * 100) : 0

  return (
    <div className="fixed inset-0 bg-[#131313] overflow-hidden">
      {/* Top Nav — dark glass */}
      <nav className="fixed top-0 w-full z-50 h-16 flex items-center justify-between px-6 tracking-tight" style={glassPanel}>
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tighter text-[#FF8C00]">BuildRight 3D</Link>
          <div className="hidden md:flex gap-6">
            <Link href="/dashboard" className="text-[13px] text-[#e5e2e1] opacity-40 hover:opacity-80 transition-opacity">Dashboard</Link>
            <Link href="/train" className="text-[13px] text-[#FF8C00] font-semibold border-b-2 border-[#FF8C00]">Training</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#e5e2e1] opacity-30">Step {currentStep + 1} of {steps.length}</span>
          <div className="w-24 h-1.5 bg-[#353534] rounded-full overflow-hidden">
            <div className="bg-[#FF8C00] h-full rounded-full transition-all duration-500" style={{ width: `${stepPct}%` }} />
          </div>
          <span className="text-[12px] font-semibold text-[#FF8C00]">{stepPct}% Complete</span>
          <div className="h-6 w-px bg-[#353534] mx-2" />
          <button
            onClick={() => setBlueprintMode(b => !b)}
            aria-label="Toggle blueprint mode"
            aria-pressed={blueprintMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              blueprintMode
                ? 'bg-[#FF8C00]/15 text-[#ffb77d] border border-[#FF8C00]/50'
                : 'text-[#e5e2e1] opacity-40 hover:opacity-70 hover:bg-[#2a2a2a] border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">architecture</span>
            Blueprint
          </button>
          <div className="h-6 w-px bg-[#353534] mx-2" />
          <span className="material-symbols-outlined text-[#e5e2e1] opacity-30 p-2 hover:bg-[#2a2a2a] rounded-full cursor-pointer text-[20px]">account_circle</span>
        </div>
      </nav>

      {/* Left Sidebar — dark glass module nav */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 z-40 overflow-y-auto hidden md:flex flex-col" style={glassPanel}>
        <div className="p-5" style={{ borderBottom: '1px solid rgba(86,67,52,0.15)' }}>
          <div className="text-[10px] uppercase tracking-[0.12em] text-[#FF8C00] font-semibold opacity-60 mb-1">Module</div>
          <h3 className="text-[14px] font-bold tracking-tight text-[#e5e2e1]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{mod.title}</h3>
          <p className="text-[11px] text-[#e5e2e1] opacity-25 mt-1">Lesson {lessonIdx + 1} of {mod.lessons.length}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {mod.lessons.map((l, li) => {
            const active = l.slug === lesson.slug
            return (
              <Link key={l.slug} href={`/train/${mod.slug}/${l.slug}`}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-all ${
                  active ? 'bg-[#FF8C00]/10 text-[#FF8C00] font-semibold' : 'text-[#e5e2e1] opacity-35 hover:opacity-60 hover:bg-[#2a2a2a]'
                }`}>
                <span className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${
                  active ? 'bg-[#FF8C00] text-white' : 'bg-[#353534] text-[#e5e2e1] opacity-30'
                }`}>{li + 1}</span>
                <span className="truncate">{l.title}</span>
              </Link>
            )
          })}
        </div>
      </aside>

      {/* Main viewport */}
      <main className="ml-0 md:ml-64 mt-16 relative h-[calc(100vh-4rem)] overflow-hidden">
        {/* 3D Scene */}
        <div className="absolute inset-0 z-0">
          <SceneViewer
            cameraPreset={step?.camera_preset}
            highlightedGroups={step?.highlighted_groups}
            hiddenGroups={effectiveHidden}
            explodedOffset={explodedOffset}
            blueprintMode={blueprintMode}
            callouts={stepCallouts}
          />
        </div>

        {/* Floating code compliance card (top-left) */}
        {stepCodeRefs.length > 0 && (
          <div className="absolute top-6 left-6 w-80 p-5 rounded-xl z-10 animate-[fadeIn_0.3s_ease-out]" style={glassPanel}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[#FF8C00] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>policy</span>
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#FF8C00]">Code Compliance</span>
            </div>
            {stepCodeRefs.map(ref => (
              <div key={ref.id} className="mb-3 last:mb-0">
                <h4 className="text-[14px] font-bold tracking-tight mb-1 text-[#e5e2e1]">{ref.code_family} - Section {ref.code_section}</h4>
                <p className="text-[12px] text-[#e5e2e1] opacity-50 leading-relaxed">{ref.short_summary}</p>
              </div>
            ))}
          </div>
        )}

        {/* Camera info overlay (bottom-left) */}
        <div className="absolute bottom-36 left-6 flex flex-col gap-0.5 text-[#e5e2e1] opacity-20 text-[10px] font-mono tracking-widest z-10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF8C00] animate-pulse" />
            <span>LIVE VIEWPORT / {step?.highlighted_groups?.[0]?.toUpperCase() || 'OVERVIEW'}</span>
          </div>
        </div>

        {/* Lesson steps panel (right side) — dark glass */}
        {sidebarOpen && (
          <div className="absolute top-6 right-6 w-72 rounded-xl overflow-hidden z-10 flex flex-col max-h-[calc(100%-10rem)] animate-[slideRight_0.25s_ease-out]" style={glassPanel}>
            <div className="p-5" style={{ borderBottom: '1px solid rgba(86,67,52,0.15)' }}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-[#e5e2e1] opacity-40 uppercase tracking-[0.12em]">Current Module</span>
                <button onClick={() => setSidebarOpen(false)}>
                  <span className="material-symbols-outlined text-[#e5e2e1] opacity-30 text-[18px]">close</span>
                </button>
              </div>
              <h3 className="text-[16px] font-bold tracking-tight text-[#e5e2e1]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{mod.title}</h3>
            </div>
            <div className="overflow-y-auto p-2 space-y-1">
              {steps.map((s, i) => {
                const done = i < currentStep
                const active = i === currentStep
                return (
                  <button
                    key={s.id}
                    onClick={() => handleStepChange(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                      active ? 'bg-[#FF8C00] text-white shadow-lg' : done ? 'bg-[#82CFFF]/5' : 'hover:bg-[#2a2a2a]'
                    }`}
                    style={!active && done ? { border: '1px solid rgba(130,207,255,0.08)' } : undefined}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${active ? 'text-white' : done ? 'text-[#82CFFF]' : 'text-[#e5e2e1] opacity-20'}`}
                      style={done ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                      {done ? 'check_circle' : active ? 'play_circle' : 'radio_button_unchecked'}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-[12px] font-semibold leading-none truncate ${active ? 'text-white' : done ? 'text-[#82CFFF]' : 'text-[#e5e2e1] opacity-50'}`}>{s.title}</p>
                      <p className={`text-[10px] mt-1 ${active ? 'text-white/70' : 'text-[#e5e2e1] opacity-30'}`}>
                        {done ? 'Completed' : active ? `Step ${i + 1} of ${steps.length}` : 'Upcoming'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="absolute top-6 right-6 z-10 rounded-xl px-4 py-2 text-[12px] font-medium text-[#e5e2e1] opacity-50 hover:opacity-80 transition-all" style={glassPanel}>
            <span className="material-symbols-outlined text-[16px] align-middle mr-1">view_sidebar</span>
            Steps
          </button>
        )}

        {/* Bottom control bar — dark glass */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-3xl rounded-2xl p-5 z-20 animate-[slideUp_0.3s_ease-out]" style={glassPanel}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-[#FF8C00] text-white rounded-lg">
                <span className="material-symbols-outlined text-[20px]">{step?.highlighted_groups?.includes('plumbing_supply') ? 'water_drop' : step?.highlighted_groups?.includes('electrical') ? 'bolt' : step?.highlighted_groups?.includes('hvac') ? 'air' : 'roofing'}</span>
              </div>
              <div>
                <h2 className="text-[15px] font-bold tracking-tight text-[#e5e2e1]">{step?.title || lesson.title}</h2>
                <p className="text-[12px] text-[#e5e2e1] opacity-40">Step {(step?.step_number ?? 0).toString().padStart(2, '0')} - {lesson.objective?.split('.')[0]}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => handleStepChange(0)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#2a2a2a] text-[#e5e2e1] opacity-40 transition-all">
                <span className="material-symbols-outlined text-[20px]">replay</span>
              </button>
              <div className="h-6 w-px bg-[#353534]" />
              <button onClick={() => handleStepChange(currentStep - 1)} disabled={currentStep === 0}
                className="px-4 py-2 flex items-center gap-1.5 rounded-lg text-[13px] font-bold text-[#e5e2e1] hover:bg-[#2a2a2a] disabled:opacity-20 transition-all" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Back
              </button>
              <button onClick={() => handleStepChange(currentStep === steps.length - 1 ? steps.length : currentStep + 1)}
                className="px-6 py-2 flex items-center gap-1.5 rounded-lg bg-[#FF8C00] text-white text-[13px] font-bold hover:shadow-lg hover:brightness-110 active:scale-95 transition-all">
                {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
          {/* Progress stepper — orange */}
          <div className="flex gap-1.5 h-1.5 w-full">
            {steps.map((_, i) => (
              <div key={i} className={`flex-1 rounded-full relative ${i <= currentStep ? 'bg-[#FF8C00]' : 'bg-[#353534]'}`}>
                {i === currentStep && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-[#FF8C00] border-2 border-[#131313] rounded-full shadow-md" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Viewport gradient overlay for depth */}
        <div className="absolute inset-0 pointer-events-none z-[1]" style={{ background: 'radial-gradient(circle at center, transparent 40%, rgba(19,19,19,0.15) 100%)' }} />
      </main>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// QUIZ MODE
// ════════════════════════════════════════════════════════════════════════════════
function QuizMode({ lesson, mod }: { lesson: CurriculumLesson; mod: CurriculumModule }) {
  const questions = useMemo(() => toQuizQuestions(lesson), [lesson])
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)

  const lessonIdx = mod.lessons.findIndex(l => l.slug === lesson.slug)
  const nextLesson = lessonIdx < mod.lessons.length - 1 ? mod.lessons[lessonIdx + 1] : null
  const prevLearnLesson = mod.lessons.slice(0, lessonIdx).reverse().find(l => l.type === 'learn')

  return (
    <div className="min-h-screen bg-[#131313]">
      <LessonTopBar mod={mod} lessonTitle={lesson.title} type="quiz" stepNum={0} totalSteps={0} />

      <div className="max-w-xl mx-auto py-8 px-4 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-[#201f1f] rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
          <div className="p-5" style={{ borderBottom: '1px solid rgba(86,67,52,0.15)' }}>
            <h1 className="text-lg font-bold text-[#e5e2e1]">{lesson.title}</h1>
            <p className="text-[#e5e2e1] opacity-40 text-xs mt-1">{lesson.objective}</p>
            <div className="flex gap-2 mt-3">
              <span className="text-[10px] bg-[#2a2a2a] text-[#e5e2e1] opacity-40 px-2 py-0.5 rounded-full">{questions.length} questions</span>
              <span className="text-[10px] bg-[#2a2a2a] text-[#e5e2e1] opacity-40 px-2 py-0.5 rounded-full">70% to pass</span>
              <span className="text-[10px] bg-[#2a2a2a] text-[#e5e2e1] opacity-40 px-2 py-0.5 rounded-full">~{lesson.durationMinutes}m</span>
            </div>
          </div>

          {result ? (
            <div className="p-8 text-center animate-[scaleIn_0.3s_ease-out]">
              <div className={`text-5xl font-bold mb-3 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                {result.score}%
              </div>
              <p className={`text-sm mb-6 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                {result.passed ? 'Passed!' : 'Need 70% to pass. Review the material and try again.'}
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={() => setResult(null)} className="px-4 py-2 bg-[#2a2a2a] rounded-lg text-sm text-[#e5e2e1] hover:bg-[#353534] transition-colors" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
                  Retake Quiz
                </button>
                {!result.passed && prevLearnLesson && (
                  <Link href={`/train/${mod.slug}/${prevLearnLesson.slug}`} className="px-4 py-2 bg-[#2a2a2a] rounded-lg text-sm text-[#e5e2e1] hover:bg-[#353534] transition-colors" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
                    Review Lesson
                  </Link>
                )}
                {result.passed && nextLesson && (
                  <Link href={`/train/${mod.slug}/${nextLesson.slug}`} className="px-4 py-2 bg-[#FF8C00] text-white text-sm font-semibold rounded-lg hover:bg-[#FF8C00]/90 transition-colors">
                    Next: {nextLesson.title}
                  </Link>
                )}
                <Link href={`/train/${mod.slug}`} className="px-4 py-2 bg-[#2a2a2a] rounded-lg text-sm text-[#e5e2e1] hover:bg-[#353534] transition-colors" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
                  Back to Module
                </Link>
              </div>
            </div>
          ) : (
            <div className="h-[500px]">
              <QuizPanel questions={questions} passingScore={70} onComplete={(score, passed) => setResult({ score, passed })} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// INSPECT MODE
// ════════════════════════════════════════════════════════════════════════════════
function InspectMode({ lesson, mod }: { lesson: CurriculumLesson; mod: CurriculumModule }) {
  const issues = lesson.inspectIssues ?? []
  const [found, setFound] = useState<Set<string>>(new Set())
  const [selectedIssue, setSelectedIssue] = useState<typeof issues[0] | null>(null)
  const [showResults, setShowResults] = useState(false)

  const score = issues.length > 0 ? Math.round((found.size / issues.length) * 100) : 0
  const lessonIdx = mod.lessons.findIndex(l => l.slug === lesson.slug)
  const nextLesson = lessonIdx < mod.lessons.length - 1 ? mod.lessons[lessonIdx + 1] : null

  // Escape to dismiss found issue toast
  useEffect(() => {
    if (!selectedIssue) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedIssue(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedIssue])

  const handleMeshClick = useCallback((meshKey: string) => {
    const issue = issues.find(i => i.meshKey === meshKey && !found.has(i.meshKey))
    if (issue) {
      setFound(prev => new Set([...prev, issue.meshKey]))
      setSelectedIssue(issue)
    }
  }, [issues, found])

  if (showResults) {
    return (
      <div className="fixed inset-0 bg-[#131313] flex items-center justify-center animate-[scaleIn_0.3s_ease-out]">
        <div className="text-center max-w-md px-6">
          <div className={`text-5xl font-bold mb-3 ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {score}%
          </div>
          <p className="text-[#e5e2e1] opacity-40 mb-2">Found {found.size} of {issues.length} issues</p>
          <div className="space-y-1 mb-6 text-left max-w-xs mx-auto">
            {issues.map(issue => (
              <div key={issue.meshKey} className="flex items-center gap-2 text-xs">
                <span className={found.has(issue.meshKey) ? 'text-green-400' : 'text-red-400'}>{found.has(issue.meshKey) ? 'found' : 'missed'}</span>
                <span className="text-[#e5e2e1] opacity-40">{issue.title}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => { setFound(new Set()); setShowResults(false); setSelectedIssue(null) }}
              className="px-4 py-2 bg-[#2a2a2a] rounded-lg text-sm text-[#e5e2e1] hover:bg-[#353534] transition-colors" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>Try Again</button>
            {nextLesson && (
              <Link href={`/train/${mod.slug}/${nextLesson.slug}`} className="px-4 py-2 bg-[#FF8C00] text-white text-sm font-semibold rounded-lg hover:bg-[#FF8C00]/90 transition-colors">
                Next: {nextLesson.title}
              </Link>
            )}
            <Link href={`/train/${mod.slug}`} className="px-4 py-2 bg-[#2a2a2a] rounded-lg text-sm text-[#e5e2e1] hover:bg-[#353534] transition-colors" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
              Back to Module
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#131313] flex flex-col">
      <LessonTopBar mod={mod} lessonTitle={lesson.title} type="inspect" stepNum={found.size} totalSteps={issues.length} />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative min-w-0">
          <SceneViewer onMeshClick={handleMeshClick} />

          {/* Instructions */}
          <div className="absolute top-4 left-4 z-10 rounded-lg px-4 py-3 max-w-xs animate-[fadeIn_0.3s_ease-out]" style={glassPanel}>
            <div className="text-[#82CFFF] text-xs font-semibold uppercase tracking-wider mb-1">Inspection Challenge</div>
            <p className="text-[#e5e2e1] opacity-40 text-xs leading-relaxed">{lesson.objective}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[#e5e2e1] opacity-40 text-xs">Found: {found.size} / {issues.length}</span>
              <div className="flex gap-0.5 flex-1">
                {issues.map(i => <div key={i.meshKey} className={`h-1.5 flex-1 rounded-full transition-colors ${found.has(i.meshKey) ? 'bg-green-500' : 'bg-[#353534]'}`} />)}
              </div>
            </div>
          </div>

          {/* Found issue toast */}
          {selectedIssue && (
            <div className="absolute bottom-4 left-4 right-4 z-10 max-w-lg mx-auto animate-[slideUp_0.25s_ease-out]">
              <div className="rounded-xl p-4" style={glassPanel}>
                <div className="flex items-start gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${SEV[selectedIssue.severity]} shrink-0 mt-0.5`}>{selectedIssue.severity}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-[#e5e2e1]">{selectedIssue.title}</h3>
                    <p className="text-[#e5e2e1] opacity-40 text-xs mt-1 leading-relaxed">{selectedIssue.description}</p>
                    {selectedIssue.codeRef && <span className="inline-block mt-2 text-[#FF8C00]/70 text-xs font-mono bg-[#FF8C00]/5 px-2 py-0.5 rounded">{selectedIssue.codeRef}</span>}
                  </div>
                  <button onClick={() => setSelectedIssue(null)} aria-label="Dismiss" className="text-[#e5e2e1] opacity-30 hover:opacity-60 text-xs shrink-0">Esc</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel — dark */}
        <div className="w-64 lg:w-72 flex flex-col shrink-0" style={{ ...glassPanel, borderLeft: '1px solid rgba(86,67,52,0.15)' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-[#e5e2e1] opacity-30 text-[10px] uppercase tracking-wider mb-3">Issues Found</div>
            {issues.filter(i => found.has(i.meshKey)).map(issue => (
              <div key={issue.meshKey} className="bg-[#1c1b1b] rounded-lg p-3 animate-[fadeIn_0.2s_ease-out]" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-xs">found</span>
                  <span className="text-xs text-[#e5e2e1] opacity-60 truncate">{issue.title}</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${SEV[issue.severity]} mt-1 inline-block`}>{issue.severity}</span>
              </div>
            ))}
            {found.size === 0 && (
              <div className="text-center py-6">
                <p className="text-[#e5e2e1] opacity-25 text-xs mb-1">Click on suspicious areas</p>
                <p className="text-[#e5e2e1] opacity-15 text-[10px]">Look for flashing, fastener, and drainage issues</p>
              </div>
            )}
          </div>
          <div className="p-4 space-y-2" style={{ borderTop: '1px solid rgba(86,67,52,0.15)' }}>
            <button
              onClick={() => setShowResults(true)}
              disabled={found.size === 0}
              className={`w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                found.size === 0
                  ? 'bg-[#2a2a2a] text-[#e5e2e1] opacity-20 cursor-not-allowed'
                  : 'bg-[#FF8C00] text-white hover:bg-[#FF8C00]/90 active:scale-[0.97]'
              }`}
            >
              {found.size === 0 ? 'Find issues to submit' : `Submit Inspection (${found.size}/${issues.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
