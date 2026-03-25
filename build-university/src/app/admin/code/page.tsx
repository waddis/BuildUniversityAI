'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminTable from '@/components/ui/AdminTable'
import FormField from '@/components/ui/FormField'
import { fetchCodeReferences, upsertCodeReference, deleteCodeReference } from '@/lib/db/admin'
import type { CodeReference } from '@/types'

const CODE_FAMILIES = ['IRC', 'IBC', 'ASCE', 'ASTM', 'NRCA', 'SMACNA', 'FBC', 'IECC'].map(f => ({ value: f, label: f }))

const EMPTY = { code_family: 'IRC', code_section: '', title: '', short_summary: '', long_explanation: '', jurisdiction_scope: '', climate_scope: '' }

export default function CodeRefsPage() {
  const [rows, setRows] = useState<CodeReference[]>([])
  const [form, setForm] = useState<Record<string, string>>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    try { setRows(await fetchCodeReferences()) } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleChange = (n: string, v: string) => setForm(f => ({ ...f, [n]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rec = { ...form, ...(editing ? { id: editing } : {}) }
    await upsertCodeReference(rec)
    setForm(EMPTY); setEditing(null); setShowForm(false); load()
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Code References</h1>
          <p className="text-white/40 text-sm">IRC, IBC, ASCE, ASTM citations — reusable across assemblies</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(s => !s) }}
          className="px-4 py-2 bg-amber-500 text-black text-sm font-semibold rounded-lg hover:bg-amber-400">
          {showForm ? 'Cancel' : '+ New Reference'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/3 border border-white/8 rounded-xl p-5 mb-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Code Family" name="code_family" value={form.code_family} onChange={handleChange} type="select" options={CODE_FAMILIES} />
            <FormField label="Section" name="code_section" value={form.code_section} onChange={handleChange} required placeholder="R905.2.7" />
            <FormField label="Title" name="title" value={form.title} onChange={handleChange} required placeholder="Ice Barrier Requirements" />
          </div>
          <FormField label="Short Summary" name="short_summary" value={form.short_summary} onChange={handleChange} required placeholder="Ice barrier required in areas with 30-year mean temp <= 32F" />
          <FormField label="Long Explanation" name="long_explanation" value={form.long_explanation} onChange={handleChange} type="textarea" placeholder="Detailed explanation of the code requirement..." />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Jurisdiction Scope" name="jurisdiction_scope" value={form.jurisdiction_scope} onChange={handleChange} placeholder="Universal, Florida-only, etc." />
            <FormField label="Climate Scope" name="climate_scope" value={form.climate_scope} onChange={handleChange} placeholder="All, Cold (zones 5-8), etc." />
          </div>
          <button type="submit" className="px-4 py-2 bg-amber-500 text-black text-sm font-semibold rounded-lg hover:bg-amber-400">
            {editing ? 'Update' : 'Create'}
          </button>
        </form>
      )}

      <AdminTable
        columns={[
          { key: 'code_family', label: 'Family', render: (r: CodeReference) => <span className="text-amber-500 font-mono text-xs">{r.code_family}</span> },
          { key: 'code_section', label: 'Section', render: (r: CodeReference) => <code className="text-xs">{r.code_section}</code> },
          { key: 'title', label: 'Title' },
          { key: 'short_summary', label: 'Summary', render: (r: CodeReference) => <span className="text-white/50 text-xs line-clamp-1">{r.short_summary}</span> },
        ]}
        rows={rows}
        onEdit={row => {
          setForm({ code_family: row.code_family, code_section: row.code_section, title: row.title, short_summary: row.short_summary, long_explanation: row.long_explanation ?? '', jurisdiction_scope: row.jurisdiction_scope ?? '', climate_scope: row.climate_scope ?? '' })
          setEditing(row.id); setShowForm(true)
        }}
        onDelete={async id => { if (confirm('Delete this code reference?')) { await deleteCodeReference(id); load() }}}
      />
    </div>
  )
}
