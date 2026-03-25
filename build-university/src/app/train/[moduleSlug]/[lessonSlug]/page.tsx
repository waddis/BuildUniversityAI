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
import AppSidebar from '@/components/ui/AppSidebar'
import { VISIBILITY_GROUPS } from '@/lib/3d/complex-house'
import type { LessonStep, CodeReference, QuizQuestion } from '@/types'

const SceneViewer = dynamic(() => import('@/components/3d/SceneViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a14]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-gray-300 text-xs">Loading 3D model...</p>
      </div>
    </div>
  ),
})

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

// ── Top bar — glass nav with step progress (matches Stitch mockup) ──
function LessonTopBar({ mod, lessonTitle, type, stepNum, totalSteps }: {
  mod: CurriculumModule; lessonTitle: string; type: string; stepNum: number; totalSteps: number
}) {
  const pct = totalSteps > 0 ? Math.round((stepNum / totalSteps) * 100) : 0
  const typeColor = type === 'quiz' ? 'text-purple-600' : type === 'inspect' ? 'text-orange-600' : 'text-[var(--primary)]'
  return (
    <div className="h-12 flex items-center px-5 gap-3 shrink-0 glass z-40 relative">
      <Link href="/" className="text-[13px] font-semibold text-[var(--on-surface)] tracking-tight mr-2">BuildRight 3D</Link>
      <span className="text-[var(--on-surface)] opacity-10 text-[12px]">/</span>
      <Link href={`/train/${mod.slug}`} className="text-[var(--on-surface)] opacity-30 hover:opacity-60 text-[12px] truncate max-w-32 transition-opacity">{mod.title}</Link>
      <span className="text-[var(--on-surface)] opacity-10 text-[12px]">/</span>
      <span className="text-[var(--on-surface)] opacity-60 text-[12px] truncate">{lessonTitle}</span>
      <div className="ml-auto flex items-center gap-4">
        {totalSteps > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--on-surface)] opacity-30">Step {stepNum} of {totalSteps}</span>
            <div className="w-20 h-1.5 bg-[var(--surface-high)] rounded-full overflow-hidden">
              <div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-medium text-[var(--primary)]">{pct}%</span>
          </div>
        )}
        <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${typeColor}`}>{type}</span>
      </div>
    </div>
  )
}

const SEV = {
  minor: 'bg-gray-100 text-gray-600',
  moderate: 'bg-yellow-50 text-yellow-700',
  severe: 'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700',
}

export default function TrainLessonPage({ params }: { params: Promise<{ moduleSlug: string; lessonSlug: string }> }) {
  const { moduleSlug, lessonSlug } = use(params)
  const data = getLesson(moduleSlug, lessonSlug)
  const mod = getModule(moduleSlug)

  if (!data || !mod) {
    return (
      <div className="min-h-screen flex items-center justify-center animate-[fadeIn_0.3s_ease-out]">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Lesson not found</h1>
          <p className="text-gray-400 text-sm mb-4">This lesson may have been moved or removed</p>
          <Link href="/train" className="text-blue-600 text-sm hover:underline">Back to training</Link>
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
      <div className="fixed inset-0 bg-white flex items-center justify-center animate-[scaleIn_0.4s_ease-out]">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-green-400 text-2xl">done</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">{lesson.title}</h2>
          <p className="text-gray-500 text-sm mb-2">{lesson.objective}</p>
          <p className="text-green-400/80 text-xs mb-8">
            Lesson {lessonIdx + 1} of {mod.lessons.length} in {mod.title}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href={`/train/${mod.slug}`} className="px-5 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              Back to Module
            </Link>
            {nextLesson && (
              <Link href={`/train/${mod.slug}/${nextLesson.slug}`} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
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
    <div className="fixed inset-0 bg-[var(--surface)] overflow-hidden">
      {/* Top Nav */}
      <nav className="fixed top-0 w-full z-50 h-16 bg-white/85 backdrop-blur-xl shadow-sm flex items-center justify-between px-6 tracking-tight">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tighter text-[var(--on-surface)]">BuildRight 3D</Link>
          <div className="hidden md:flex gap-6">
            <Link href="/dashboard" className="text-[13px] text-[var(--on-surface)] opacity-40 hover:opacity-80 transition-colors">Dashboard</Link>
            <Link href="/train" className="text-[13px] text-[var(--primary)] font-semibold border-b-2 border-[var(--primary)]">Training</Link>
            <Link href="/editor" className="text-[13px] text-[var(--on-surface)] opacity-40 hover:opacity-80 transition-colors">Editor</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[var(--on-surface)] opacity-30">Step {currentStep + 1} of {steps.length}</span>
          <div className="w-24 h-1.5 bg-[var(--surface-high)] rounded-full overflow-hidden">
            <div className="gradient-primary h-full rounded-full transition-all duration-500" style={{ width: `${stepPct}%` }} />
          </div>
          <span className="text-[12px] font-semibold text-[var(--primary)]">{stepPct}% Complete</span>
          <div className="h-6 w-px bg-[var(--surface-high)] mx-2" />
          <button
            onClick={() => setBlueprintMode(b => !b)}
            aria-label="Toggle blueprint mode"
            aria-pressed={blueprintMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              blueprintMode
                ? 'bg-[#1a2a5c] text-blue-200 border border-blue-400/50'
                : 'text-[var(--on-surface)] opacity-40 hover:opacity-70 hover:bg-[var(--surface-low)] border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">architecture</span>
            Blueprint
          </button>
          <div className="h-6 w-px bg-[var(--surface-high)] mx-2" />
          <span className="material-symbols-outlined text-[var(--on-surface)] opacity-30 p-2 hover:bg-[var(--surface-low)] rounded-full cursor-pointer text-[20px]">account_circle</span>
        </div>
      </nav>

      {/* Left Sidebar */}
      <AppSidebar currentModule={mod.title} progress={{ done: currentStep + 1, total: steps.length }} />

      {/* Main viewport */}
      <main className="ml-64 mt-16 relative h-[calc(100vh-4rem)] overflow-hidden">
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
          <div className="absolute top-6 left-6 w-80 glass-heavy p-5 rounded-xl shadow-ambient z-10 animate-[fadeIn_0.3s_ease-out]" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[var(--primary)] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>policy</span>
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--primary)]">Code Compliance</span>
            </div>
            {stepCodeRefs.map(ref => (
              <div key={ref.id} className="mb-3 last:mb-0">
                <h4 className="text-[14px] font-bold tracking-tight mb-1">{ref.code_family} - Section {ref.code_section}</h4>
                <p className="text-[12px] text-[var(--on-surface)] opacity-50 leading-relaxed">{ref.short_summary}</p>
              </div>
            ))}
          </div>
        )}

        {/* Camera info overlay (bottom-left) */}
        <div className="absolute bottom-36 left-6 flex flex-col gap-0.5 text-[var(--on-surface)] opacity-20 text-[10px] font-mono tracking-widest z-10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>LIVE VIEWPORT / {step?.highlighted_groups?.[0]?.toUpperCase() || 'OVERVIEW'}</span>
          </div>
        </div>

        {/* Lesson steps panel (right side) */}
        {sidebarOpen && (
          <div className="absolute top-6 right-6 w-72 glass-heavy rounded-xl shadow-ambient overflow-hidden z-10 flex flex-col max-h-[calc(100%-10rem)] animate-[slideRight_0.25s_ease-out]" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
            <div className="p-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-[var(--on-surface)] opacity-40 uppercase tracking-[0.12em]">Current Module</span>
                <button onClick={() => setSidebarOpen(false)}>
                  <span className="material-symbols-outlined text-[var(--on-surface)] opacity-30 text-[18px]">close</span>
                </button>
              </div>
              <h3 className="text-[16px] font-bold tracking-tight">{mod.title}</h3>
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
                      active ? 'gradient-primary text-white shadow-lg' : done ? 'bg-[var(--primary)]/5' : 'hover:bg-[var(--surface-low)]'
                    }`}
                    style={!active && done ? { background: 'rgba(0,78,159,0.04)', border: '1px solid rgba(0,78,159,0.08)' } : undefined}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${active ? 'text-white' : done ? 'text-[var(--primary)]' : 'text-[var(--on-surface)] opacity-20'}`}
                      style={done ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                      {done ? 'check_circle' : active ? 'play_circle' : 'radio_button_unchecked'}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-[12px] font-semibold leading-none truncate ${active ? 'text-white' : done ? '' : 'text-[var(--on-surface)] opacity-50'}`}>{s.title}</p>
                      <p className={`text-[10px] mt-1 ${active ? 'text-white/70' : 'text-[var(--on-surface)] opacity-30'}`}>
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
          <button onClick={() => setSidebarOpen(true)} className="absolute top-6 right-6 z-10 glass-heavy rounded-xl px-4 py-2 shadow-ambient-sm text-[12px] font-medium text-[var(--on-surface)] opacity-50 hover:opacity-80 transition-all" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
            <span className="material-symbols-outlined text-[16px] align-middle mr-1">view_sidebar</span>
            Steps
          </button>
        )}

        {/* Bottom control bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-3xl glass-heavy rounded-2xl shadow-ambient p-5 z-20 animate-[slideUp_0.3s_ease-out]" style={{ border: '1px solid rgba(255,255,255,0.5)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-[var(--on-surface)] text-white rounded-lg">
                <span className="material-symbols-outlined text-[20px]">{step?.highlighted_groups?.includes('plumbing_supply') ? 'water_drop' : step?.highlighted_groups?.includes('electrical') ? 'bolt' : step?.highlighted_groups?.includes('hvac') ? 'air' : 'roofing'}</span>
              </div>
              <div>
                <h2 className="text-[15px] font-bold tracking-tight">{step?.title || lesson.title}</h2>
                <p className="text-[12px] text-[var(--on-surface)] opacity-40">Step {(step?.step_number ?? 0).toString().padStart(2, '0')} - {lesson.objective?.split('.')[0]}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => handleStepChange(0)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--surface-low)] text-[var(--on-surface)] opacity-40 transition-all">
                <span className="material-symbols-outlined text-[20px]">replay</span>
              </button>
              <div className="h-6 w-px bg-[var(--surface-high)]" />
              <button onClick={() => handleStepChange(currentStep - 1)} disabled={currentStep === 0}
                className="px-4 py-2 flex items-center gap-1.5 rounded-lg text-[13px] font-bold hover:bg-[var(--surface-low)] disabled:opacity-20 transition-all" style={{ border: '1px solid rgba(193,198,215,0.3)' }}>
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Back
              </button>
              <button onClick={() => handleStepChange(currentStep === steps.length - 1 ? steps.length : currentStep + 1)}
                className="px-6 py-2 flex items-center gap-1.5 rounded-lg gradient-primary text-white text-[13px] font-bold hover:shadow-lg hover:brightness-110 active:scale-95 transition-all">
                {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
          {/* Progress stepper */}
          <div className="flex gap-1.5 h-1.5 w-full">
            {steps.map((_, i) => (
              <div key={i} className={`flex-1 rounded-full relative ${i <= currentStep ? 'gradient-primary' : 'bg-[var(--surface-high)]'}`}>
                {i === currentStep && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 gradient-primary border-2 border-white rounded-full shadow-md" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Viewport gradient overlay for depth */}
        <div className="absolute inset-0 pointer-events-none z-[1]" style={{ background: 'radial-gradient(circle at center, transparent 40%, rgba(26,28,29,0.08) 100%)' }} />
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
  // Find previous learn lesson for review link
  const prevLearnLesson = mod.lessons.slice(0, lessonIdx).reverse().find(l => l.type === 'learn')

  return (
    <div className="min-h-screen">
      <LessonTopBar mod={mod} lessonTitle={lesson.title} type="quiz" stepNum={0} totalSteps={0} />

      <div className="max-w-xl mx-auto py-8 px-4 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h1 className="text-lg font-bold">{lesson.title}</h1>
            <p className="text-gray-500 text-xs mt-1">{lesson.objective}</p>
            <div className="flex gap-2 mt-3">
              <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">{questions.length} questions</span>
              <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">70% to pass</span>
              <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">~{lesson.durationMinutes}m</span>
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
                <button onClick={() => setResult(null)} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                  Retake Quiz
                </button>
                {!result.passed && prevLearnLesson && (
                  <Link href={`/train/${mod.slug}/${prevLearnLesson.slug}`} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                    Review Lesson
                  </Link>
                )}
                {result.passed && nextLesson && (
                  <Link href={`/train/${mod.slug}/${nextLesson.slug}`} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    Next: {nextLesson.title}
                  </Link>
                )}
                <Link href={`/train/${mod.slug}`} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm hover:bg-gray-200 transition-colors">
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
      <div className="fixed inset-0 bg-white flex items-center justify-center animate-[scaleIn_0.3s_ease-out]">
        <div className="text-center max-w-md px-6">
          <div className={`text-5xl font-bold mb-3 ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {score}%
          </div>
          <p className="text-gray-500 mb-2">Found {found.size} of {issues.length} issues</p>
          <div className="space-y-1 mb-6 text-left max-w-xs mx-auto">
            {issues.map(issue => (
              <div key={issue.meshKey} className="flex items-center gap-2 text-xs">
                <span className={found.has(issue.meshKey) ? 'text-green-400' : 'text-red-400'}>{found.has(issue.meshKey) ? 'found' : 'missed'}</span>
                <span className="text-gray-500">{issue.title}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => { setFound(new Set()); setShowResults(false); setSelectedIssue(null) }}
              className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm hover:bg-gray-200 transition-colors">Try Again</button>
            {nextLesson && (
              <Link href={`/train/${mod.slug}/${nextLesson.slug}`} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                Next: {nextLesson.title}
              </Link>
            )}
            <Link href={`/train/${mod.slug}`} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              Back to Module
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      <LessonTopBar mod={mod} lessonTitle={lesson.title} type="inspect" stepNum={found.size} totalSteps={issues.length} />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative min-w-0">
          <SceneViewer onMeshClick={handleMeshClick} />

          {/* Instructions */}
          <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md rounded-lg shadow-md px-4 py-3 border border-gray-200 max-w-xs animate-[fadeIn_0.3s_ease-out]">
            <div className="text-blue-600 text-xs font-semibold uppercase tracking-wider mb-1">Inspection Challenge</div>
            <p className="text-gray-500 text-xs leading-relaxed">{lesson.objective}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-gray-500 text-xs">Found: {found.size} / {issues.length}</span>
              <div className="flex gap-0.5 flex-1">
                {issues.map(i => <div key={i.meshKey} className={`h-1.5 flex-1 rounded-full transition-colors ${found.has(i.meshKey) ? 'bg-green-500' : 'bg-gray-100'}`} />)}
              </div>
            </div>
          </div>

          {/* Found issue toast */}
          {selectedIssue && (
            <div className="absolute bottom-4 left-4 right-4 z-10 max-w-lg mx-auto animate-[slideUp_0.25s_ease-out]">
              <div className="bg-white/95 backdrop-blur-md rounded-xl border border-gray-200 shadow-lg p-4">
                <div className="flex items-start gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${SEV[selectedIssue.severity]} shrink-0 mt-0.5`}>{selectedIssue.severity}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{selectedIssue.title}</h3>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">{selectedIssue.description}</p>
                    {selectedIssue.codeRef && <span className="inline-block mt-2 text-blue-600/70 text-xs font-mono bg-blue-600/5 px-2 py-0.5 rounded">{selectedIssue.codeRef}</span>}
                  </div>
                  <button onClick={() => setSelectedIssue(null)} aria-label="Dismiss" className="text-gray-300 hover:text-white text-xs shrink-0">Esc</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-64 lg:w-72 bg-white/90 backdrop-blur-xl border-l border-gray-200 flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-3">Issues Found</div>
            {issues.filter(i => found.has(i.meshKey)).map(issue => (
              <div key={issue.meshKey} className="bg-gray-50 border border-gray-200 rounded-lg p-3 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-xs">found</span>
                  <span className="text-xs truncate">{issue.title}</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${SEV[issue.severity]} mt-1 inline-block`}>{issue.severity}</span>
              </div>
            ))}
            {found.size === 0 && (
              <div className="text-center py-6">
                <p className="text-gray-300 text-xs mb-1">Click on suspicious areas</p>
                <p className="text-gray-200 text-[10px]">Look for flashing, fastener, and drainage issues</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-200 space-y-2">
            <button
              onClick={() => setShowResults(true)}
              disabled={found.size === 0}
              className={`w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                found.size === 0
                  ? 'bg-white/5 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.97]'
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
