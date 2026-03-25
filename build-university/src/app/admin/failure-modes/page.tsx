'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminTable from '@/components/ui/AdminTable'
import FormField from '@/components/ui/FormField'
import { fetchFailureModes, upsertFailureMode, deleteFailureMode, fetchAssemblies } from '@/lib/db/admin'
import type { FailureMode, Assembly } from '@/types'

const SEVERITIES = [
  { value: 'minor', label: 'Minor' }, { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' }, { value: 'critical', label: 'Critical' },
]
const CATEGORIES = [
  { value: 'workmanship', label: 'Workmanship' }, { value: 'material', label: 'Material' },
  { value: 'design', label: 'Design' }, { value: 'environmental', label: 'Environmental' },
  { value: 'sequencing', label: 'Sequencing' },
]

const EMPTY = { assembly_id: '', title: '', description: '', severity: 'moderate', category: 'workmanship', inspection_notes: '', consequence_notes: '', prevention_notes: '', claim_relevance: '' }

export default function FailureModesPage() {
  const [rows, setRows] = useState<(FailureMode & { assemblies?: { name: string } })[]>([])
  const [assemblies, setAssemblies] = useState<Assembly[]>([])
  const [form, setForm] = useState<Record<string, string>>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    try {
      setRows(await fetchFailureModes())
      setAssemblies(await fetchAssemblies())
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleChange = (n: string, v: string) => setForm(f => ({ ...f, [n]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.assembly_id) return alert('Select an assembly')
    const rec = { ...form, ...(editing ? { id: editing } : {}) }
    await upsertFailureMode(rec)
    setForm(EMPTY); setEditing(null); setShowForm(false); load()
  }

  const assemblyOptions = assemblies.map(a => ({ value: a.id, label: `${a.name} (${a.system})` }))

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'bg-red-500/10 text-red-400'
      case 'severe': return 'bg-orange-500/10 text-orange-400'
      case 'moderate': return 'bg-yellow-500/10 text-yellow-400'
      default: return 'bg-[#2a2a2a] text-[#e5e2e1]/40'
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Failure Modes</h1>
          <p className="text-[#e5e2e1]/40 text-sm">Incorrect installs, consequences, and inspection notes</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(s => !s) }}
          className="px-4 py-2 bg-[#FF8C00] text-[#131313] text-sm font-semibold rounded-lg hover:opacity-90">
          {showForm ? 'Cancel' : '+ New Failure Mode'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#201f1f] rounded-xl p-5 mb-6 space-y-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
          <FormField label="Assembly" name="assembly_id" value={form.assembly_id} onChange={handleChange} type="select" options={assemblyOptions} required />
          <FormField label="Title" name="title" value={form.title} onChange={handleChange} required placeholder="Reverse-lapped valley underlayment" />
          <FormField label="Description" name="description" value={form.description} onChange={handleChange} type="textarea" required placeholder="Underlayment installed with upper layer beneath lower layer, creating a path for water entry..." />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Severity" name="severity" value={form.severity} onChange={handleChange} type="select" options={SEVERITIES} />
            <FormField label="Category" name="category" value={form.category} onChange={handleChange} type="select" options={CATEGORIES} />
          </div>
          <FormField label="Inspection Notes" name="inspection_notes" value={form.inspection_notes} onChange={handleChange} type="textarea" placeholder="What an inspector would look for..." />
          <FormField label="Consequence Notes" name="consequence_notes" value={form.consequence_notes} onChange={handleChange} type="textarea" placeholder="What happens when this fails..." />
          <FormField label="Prevention Notes" name="prevention_notes" value={form.prevention_notes} onChange={handleChange} type="textarea" placeholder="How to prevent this failure..." />
          <FormField label="Claim Relevance" name="claim_relevance" value={form.claim_relevance} onChange={handleChange} type="textarea" placeholder="How this relates to insurance claims..." />
          <button type="submit" className="px-4 py-2 bg-[#FF8C00] text-[#131313] text-sm font-semibold rounded-lg hover:opacity-90">
            {editing ? 'Update' : 'Create'}
          </button>
        </form>
      )}

      <AdminTable
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'assemblies', label: 'Assembly', render: (r: FailureMode & { assemblies?: { name: string } }) => (
            <span className="text-[#e5e2e1]/50 text-xs">{r.assemblies?.name ?? '--'}</span>
          )},
          { key: 'severity', label: 'Severity', render: (r: FailureMode) => (
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${severityColor(r.severity)}`}>{r.severity}</span>
          )},
          { key: 'category', label: 'Category', render: (r: FailureMode) => <span className="text-xs capitalize">{r.category}</span> },
        ]}
        rows={rows}
        onEdit={row => {
          setForm({ assembly_id: row.assembly_id, title: row.title, description: row.description, severity: row.severity, category: row.category, inspection_notes: row.inspection_notes ?? '', consequence_notes: row.consequence_notes ?? '', prevention_notes: row.prevention_notes ?? '', claim_relevance: row.claim_relevance ?? '' })
          setEditing(row.id); setShowForm(true)
        }}
        onDelete={async id => { if (confirm('Delete this failure mode?')) { await deleteFailureMode(id); load() }}}
      />
    </div>
  )
}
