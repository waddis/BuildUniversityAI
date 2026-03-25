import { createClient } from '@/lib/supabase/client'

// Generic CRUD operations for admin pages (browser client)
// Gracefully handles missing tables (schema not yet deployed)

function db() {
  return createClient()
}


// ── Modules ──

export async function fetchModules() {
  const { data, error } = await db().from('modules').select('*').order('order_index')
  if (error) { console.warn('fetchModules:', error.message); return [] }
  return data ?? []
}

export async function upsertModule(record: Record<string, unknown>) {
  const { data, error } = await db().from('modules').upsert(record).select().single()
  if (error) { console.warn('db:', error.message); return [] }
  return data
}

export async function deleteModule(id: string) {
  const { error } = await db().from('modules').delete().eq('id', id)
  if (error) { console.warn('db:', error.message); return [] }
}

// ── Lessons ──

export async function fetchLessons(moduleId?: string) {
  let q = db().from('lessons').select('*, modules(title)').order('order_index')
  if (moduleId) q = q.eq('module_id', moduleId)
  const { data, error } = await q
  if (error) { console.warn('db:', error.message); return [] }
  return data ?? []
}

export async function upsertLesson(record: Record<string, unknown>) {
  const { data, error } = await db().from('lessons').upsert(record).select().single()
  if (error) { console.warn('db:', error.message); return [] }
  return data
}

export async function deleteLesson(id: string) {
  const { error } = await db().from('lessons').delete().eq('id', id)
  if (error) { console.warn('db:', error.message); return [] }
}

// ── Lesson Steps ──

export async function fetchLessonSteps(lessonId: string) {
  const { data, error } = await db().from('lesson_steps').select('*').eq('lesson_id', lessonId).order('step_number')
  if (error) { console.warn('db:', error.message); return [] }
  return data ?? []
}

export async function upsertLessonStep(record: Record<string, unknown>) {
  const { data, error } = await db().from('lesson_steps').upsert(record).select().single()
  if (error) { console.warn('db:', error.message); return [] }
  return data
}

export async function deleteLessonStep(id: string) {
  const { error } = await db().from('lesson_steps').delete().eq('id', id)
  if (error) { console.warn('db:', error.message); return [] }
}

// ── House Models ──

export async function fetchHouseModels() {
  const { data, error } = await db().from('house_models').select('*').order('created_at', { ascending: false })
  if (error) { console.warn('db:', error.message); return [] }
  return data ?? []
}

export async function upsertHouseModel(record: Record<string, unknown>) {
  const { data, error } = await db().from('house_models').upsert(record).select().single()
  if (error) { console.warn('db:', error.message); return [] }
  return data
}

export async function deleteHouseModel(id: string) {
  const { error } = await db().from('house_models').delete().eq('id', id)
  if (error) { console.warn('db:', error.message); return [] }
}

// ── Assemblies ──

export async function fetchAssemblies(modelVersionId?: string) {
  let q = db().from('assemblies').select('*').order('install_order')
  if (modelVersionId) q = q.eq('house_model_version_id', modelVersionId)
  const { data, error } = await q
  if (error) { console.warn('db:', error.message); return [] }
  return data ?? []
}

export async function upsertAssembly(record: Record<string, unknown>) {
  const { data, error } = await db().from('assemblies').upsert(record).select().single()
  if (error) { console.warn('db:', error.message); return [] }
  return data
}

export async function deleteAssembly(id: string) {
  const { error } = await db().from('assemblies').delete().eq('id', id)
  if (error) { console.warn('db:', error.message); return [] }
}

// ── Code References ──

export async function fetchCodeReferences() {
  const { data, error } = await db().from('code_references').select('*').order('code_family').order('code_section')
  if (error) { console.warn('db:', error.message); return [] }
  return data ?? []
}

export async function upsertCodeReference(record: Record<string, unknown>) {
  const { data, error } = await db().from('code_references').upsert(record).select().single()
  if (error) { console.warn('db:', error.message); return [] }
  return data
}

export async function deleteCodeReference(id: string) {
  const { error } = await db().from('code_references').delete().eq('id', id)
  if (error) { console.warn('db:', error.message); return [] }
}

// ── Failure Modes ──

export async function fetchFailureModes(assemblyId?: string) {
  let q = db().from('failure_modes').select('*, assemblies(name)')
  if (assemblyId) q = q.eq('assembly_id', assemblyId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) { console.warn('db:', error.message); return [] }
  return data ?? []
}

export async function upsertFailureMode(record: Record<string, unknown>) {
  const { data, error } = await db().from('failure_modes').upsert(record).select().single()
  if (error) { console.warn('db:', error.message); return [] }
  return data
}

export async function deleteFailureMode(id: string) {
  const { error } = await db().from('failure_modes').delete().eq('id', id)
  if (error) { console.warn('db:', error.message); return [] }
}
