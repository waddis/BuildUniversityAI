'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminTable from '@/components/ui/AdminTable'
import FormField from '@/components/ui/FormField'
import { fetchModules, upsertModule, deleteModule, fetchLessons, upsertLesson, deleteLesson } from '@/lib/db/admin'
import type { Module, Lesson } from '@/types'
import { CONSTRUCTION_PHASES } from '@/types'

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }, { value: 'expert', label: 'Expert' },
]
const STATUSES = [
  { value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }, { value: 'archived', label: 'Archived' },
]
const LESSON_TYPES = [
  { value: 'learn', label: 'Learn' }, { value: 'inspect', label: 'Inspect' },
  { value: 'compare', label: 'Compare' }, { value: 'build', label: 'Build' }, { value: 'quiz', label: 'Quiz' },
]
const PHASE_OPTIONS = CONSTRUCTION_PHASES.map(p => ({ value: p, label: p.replace(/_/g, ' ') }))

const EMPTY_MOD = { slug: '', title: '', description: '', phase: 'framing_roof', difficulty: 'intermediate', status: 'draft', order_index: '0', track: 'roof' }
const EMPTY_LES = { slug: '', title: '', objective: '', difficulty: 'intermediate', lesson_type: 'learn', status: 'draft', order_index: '0', duration_minutes: '15' }

export default function LessonsAdminPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<(Lesson & { modules?: { title: string } })[]>([])
  const [tab, setTab] = useState<'modules' | 'lessons'>('modules')
  const [modForm, setModForm] = useState<Record<string, string>>(EMPTY_MOD)
  const [lesForm, setLesForm] = useState<Record<string, string>>(EMPTY_LES)
  const [editingMod, setEditingMod] = useState<string | null>(null)
  const [editingLes, setEditingLes] = useState<string | null>(null)
  const [showModForm, setShowModForm] = useState(false)
  const [showLesForm, setShowLesForm] = useState(false)
  const [selectedModule, setSelectedModule] = useState<string>('')

  const load = useCallback(async () => {
    try {
      setModules(await fetchModules())
      setLessons(await fetchLessons(selectedModule || undefined))
    } catch (e) { console.error(e) }
  }, [selectedModule])

  useEffect(() => { load() }, [load])

  const handleModChange = (n: string, v: string) => setModForm(f => ({ ...f, [n]: v }))
  const handleLesChange = (n: string, v: string) => setLesForm(f => ({ ...f, [n]: v }))

  async function submitModule(e: React.FormEvent) {
    e.preventDefault()
    const rec = { ...modForm, order_index: parseInt(modForm.order_index) || 0, ...(editingMod ? { id: editingMod } : {}) }
    await upsertModule(rec)
    setModForm(EMPTY_MOD); setEditingMod(null); setShowModForm(false); load()
  }

  async function submitLesson(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedModule) return alert('Select a module first')
    const rec = {
      ...lesForm, module_id: selectedModule,
      order_index: parseInt(lesForm.order_index) || 0,
      duration_minutes: parseInt(lesForm.duration_minutes) || null,
      ...(editingLes ? { id: editingLes } : {}),
    }
    await upsertLesson(rec)
    setLesForm(EMPTY_LES); setEditingLes(null); setShowLesForm(false); load()
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-xl font-bold mb-6">Modules & Lessons</h1>

      {/* Tab toggle */}
      <div className="flex gap-2 mb-6">
        {(['modules', 'lessons'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm ${
            tab === t ? 'bg-[#FF8C00]/10 text-[#FF8C00]' : 'bg-[#2a2a2a] text-[#e5e2e1]/40'
          }`}>
            {t === 'modules' ? 'Modules' : 'Lessons'}
          </button>
        ))}
      </div>

      {tab === 'modules' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setModForm(EMPTY_MOD); setEditingMod(null); setShowModForm(s => !s) }}
              className="px-4 py-2 bg-[#FF8C00] text-[#131313] text-sm font-semibold rounded-lg hover:opacity-90">
              {showModForm ? 'Cancel' : '+ New Module'}
            </button>
          </div>

          {showModForm && (
            <form onSubmit={submitModule} className="bg-[#201f1f] rounded-xl p-5 mb-6 space-y-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Slug" name="slug" value={modForm.slug} onChange={handleModChange} required placeholder="complex-roof-geometry" />
                <FormField label="Title" name="title" value={modForm.title} onChange={handleModChange} required placeholder="Complex Roof Geometry & Framing" />
              </div>
              <FormField label="Description" name="description" value={modForm.description} onChange={handleModChange} type="textarea" />
              <div className="grid gap-4 sm:grid-cols-4">
                <FormField label="Phase" name="phase" value={modForm.phase} onChange={handleModChange} type="select" options={PHASE_OPTIONS} />
                <FormField label="Difficulty" name="difficulty" value={modForm.difficulty} onChange={handleModChange} type="select" options={DIFFICULTIES} />
                <FormField label="Status" name="status" value={modForm.status} onChange={handleModChange} type="select" options={STATUSES} />
                <FormField label="Order" name="order_index" value={modForm.order_index} onChange={handleModChange} type="number" />
              </div>
              <FormField label="Track" name="track" value={modForm.track} onChange={handleModChange} placeholder="roof" />
              <button type="submit" className="px-4 py-2 bg-[#FF8C00] text-[#131313] text-sm font-semibold rounded-lg hover:opacity-90">
                {editingMod ? 'Update' : 'Create'}
              </button>
            </form>
          )}

          <AdminTable
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'phase', label: 'Phase', render: r => <span className="text-xs capitalize">{r.phase.replace(/_/g, ' ')}</span> },
              { key: 'difficulty', label: 'Difficulty', render: r => <span className="text-xs capitalize">{r.difficulty}</span> },
              { key: 'status', label: 'Status', render: r => (
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'published' ? 'bg-green-500/10 text-green-400' : 'bg-[#2a2a2a] text-[#e5e2e1]/40'}`}>
                  {r.status}
                </span>
              )},
              { key: 'order_index', label: 'Order' },
            ]}
            rows={modules}
            onEdit={row => { setModForm({ slug: row.slug, title: row.title, description: row.description ?? '', phase: row.phase, difficulty: row.difficulty, status: row.status, order_index: String(row.order_index), track: row.track }); setEditingMod(row.id); setShowModForm(true) }}
            onDelete={async id => { if (confirm('Delete module and all its lessons?')) { await deleteModule(id); load() }}}
          />
        </>
      )}

      {tab === 'lessons' && (
        <>
          <div className="flex items-center gap-4 mb-4">
            <select value={selectedModule} onChange={e => setSelectedModule(e.target.value)}
              className="px-3 py-2 bg-[#2a2a2a] rounded-lg text-sm text-[#e5e2e1]" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
              <option value="">All modules</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
            <button onClick={() => { setLesForm(EMPTY_LES); setEditingLes(null); setShowLesForm(s => !s) }}
              className="ml-auto px-4 py-2 bg-[#FF8C00] text-[#131313] text-sm font-semibold rounded-lg hover:opacity-90">
              {showLesForm ? 'Cancel' : '+ New Lesson'}
            </button>
          </div>

          {showLesForm && (
            <form onSubmit={submitLesson} className="bg-[#201f1f] rounded-xl p-5 mb-6 space-y-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Slug" name="slug" value={lesForm.slug} onChange={handleLesChange} required placeholder="valley-framing-basics" />
                <FormField label="Title" name="title" value={lesForm.title} onChange={handleLesChange} required placeholder="Valley Framing Basics" />
              </div>
              <FormField label="Objective" name="objective" value={lesForm.objective} onChange={handleLesChange} type="textarea" placeholder="Understand how two intersecting roof planes create a valley..." />
              <div className="grid gap-4 sm:grid-cols-4">
                <FormField label="Type" name="lesson_type" value={lesForm.lesson_type} onChange={handleLesChange} type="select" options={LESSON_TYPES} />
                <FormField label="Difficulty" name="difficulty" value={lesForm.difficulty} onChange={handleLesChange} type="select" options={DIFFICULTIES} />
                <FormField label="Status" name="status" value={lesForm.status} onChange={handleLesChange} type="select" options={STATUSES} />
                <FormField label="Duration (min)" name="duration_minutes" value={lesForm.duration_minutes} onChange={handleLesChange} type="number" />
              </div>
              <button type="submit" className="px-4 py-2 bg-[#FF8C00] text-[#131313] text-sm font-semibold rounded-lg hover:opacity-90">
                {editingLes ? 'Update' : 'Create'}
              </button>
            </form>
          )}

          <AdminTable
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'lesson_type', label: 'Type', render: (r: Lesson) => <span className="text-xs capitalize bg-[#2a2a2a] px-2 py-0.5 rounded-full">{r.lesson_type}</span> },
              { key: 'difficulty', label: 'Difficulty', render: (r: Lesson) => <span className="text-xs capitalize">{r.difficulty}</span> },
              { key: 'status', label: 'Status', render: (r: Lesson) => (
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'published' ? 'bg-green-500/10 text-green-400' : 'bg-[#2a2a2a] text-[#e5e2e1]/40'}`}>
                  {r.status}
                </span>
              )},
              { key: 'duration_minutes', label: 'Duration', render: (r: Lesson) => r.duration_minutes ? `${r.duration_minutes}m` : '--' },
            ]}
            rows={lessons}
            onEdit={row => {
              setLesForm({ slug: row.slug, title: row.title, objective: row.objective ?? '', difficulty: row.difficulty, lesson_type: row.lesson_type, status: row.status, order_index: String(row.order_index), duration_minutes: String(row.duration_minutes ?? '') })
              setEditingLes(row.id); setSelectedModule(row.module_id); setShowLesForm(true)
            }}
            onDelete={async id => { if (confirm('Delete this lesson?')) { await deleteLesson(id); load() }}}
          />
        </>
      )}
    </div>
  )
}
