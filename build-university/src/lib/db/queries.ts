import { createClient } from '@/lib/supabase/server'
import type {
  Module, Lesson, LessonStep, Assembly, HouseModel,
  CodeReference, FailureMode, Hotspot, UserProgress, Quiz
} from '@/types'

// ── Modules ──

export async function getModules(phase?: string): Promise<Module[]> {
  const supabase = await createClient()
  let query = supabase.from('modules').select('*').order('order_index')
  if (phase) query = query.eq('phase', phase)
  const { data, error } = await query
  if (error) { console.warn('query:', error.message); return [] }
  return data ?? []
}

export async function getModuleBySlug(slug: string): Promise<Module | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('modules').select('*').eq('slug', slug).single()
  if (error) return null
  return data
}

// ── Lessons ──

export async function getLessons(moduleId: string): Promise<Lesson[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lessons').select('*')
    .eq('module_id', moduleId)
    .order('order_index')
  if (error) { console.warn('query:', error.message); return [] }
  return data ?? []
}

export async function getLessonBySlug(slug: string): Promise<Lesson | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('lessons').select('*').eq('slug', slug).single()
  if (error) return null
  return data
}

export async function getLessonSteps(lessonId: string): Promise<LessonStep[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lesson_steps').select('*')
    .eq('lesson_id', lessonId)
    .order('step_number')
  if (error) { console.warn('query:', error.message); return [] }
  return data ?? []
}

// ── Assemblies ──

export async function getAssemblies(modelVersionId: string, phase?: string): Promise<Assembly[]> {
  const supabase = await createClient()
  let query = supabase.from('assemblies').select('*')
    .eq('house_model_version_id', modelVersionId)
    .order('install_order')
  if (phase) query = query.eq('phase', phase)
  const { data, error } = await query
  if (error) { console.warn('query:', error.message); return [] }
  return data ?? []
}

// ── House Models ──

export async function getHouseModels(): Promise<HouseModel[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('house_models').select('*')
  if (error) { console.warn('query:', error.message); return [] }
  return data ?? []
}

// ── Code References ──

export async function getCodeReferences(assemblyId: string): Promise<CodeReference[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assembly_code_references')
    .select('code_reference_id, code_references(*)')
    .eq('assembly_id', assemblyId)
  if (error) { console.warn('query:', error.message); return [] }
  return (data ?? []).map(r => (r as Record<string, unknown>).code_references as CodeReference)
}

// ── Failure Modes ──

export async function getFailureModes(assemblyId: string): Promise<FailureMode[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('failure_modes').select('*')
    .eq('assembly_id', assemblyId)
  if (error) { console.warn('query:', error.message); return [] }
  return data ?? []
}

// ── Hotspots ──

export async function getHotspots(assemblyId: string): Promise<Hotspot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hotspots').select('*')
    .eq('assembly_id', assemblyId)
  if (error) { console.warn('query:', error.message); return [] }
  return data ?? []
}

// ── Quizzes ──

export async function getQuiz(lessonId: string): Promise<Quiz | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('quizzes').select('*').eq('lesson_id', lessonId).single()
  if (error) return null
  return data
}

// ── User Progress ──

export async function getUserProgress(userId: string): Promise<UserProgress[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_progress').select('*')
    .eq('user_id', userId)
  if (error) { console.warn('query:', error.message); return [] }
  return data ?? []
}

export async function upsertProgress(
  userId: string,
  lessonId: string,
  status: 'in_progress' | 'completed',
  score?: number
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('user_progress').upsert({
    user_id: userId,
    lesson_id: lessonId,
    status,
    score,
    started_at: status === 'in_progress' ? new Date().toISOString() : undefined,
    completed_at: status === 'completed' ? new Date().toISOString() : undefined,
  }, { onConflict: 'user_id,lesson_id' })
  if (error) { console.warn('query:', error.message); return }
}
