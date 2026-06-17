'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminTable from '@/components/ui/AdminTable'
import FormField from '@/components/ui/FormField'
import { fetchHouseModels, upsertHouseModel, deleteHouseModel } from '@/lib/db/admin'
import type { HouseModel } from '@/types'

const COMPLEXITY = [
  { value: 'simple', label: 'Simple' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'complex', label: 'Complex' },
  { value: 'expert', label: 'Expert' },
]

const EMPTY = { slug: '', title: '', description: '', complexity_level: 'complex' }

export default function ModelsPage() {
  const [rows, setRows] = useState<HouseModel[]>([])
  const [form, setForm] = useState<Record<string, string>>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    try { setRows(await fetchHouseModels()) } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleChange = (name: string, value: string) => setForm(f => ({ ...f, [name]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const record = editing ? { ...form, id: editing } : form
    await upsertHouseModel(record)
    setForm(EMPTY); setEditing(null); setShowForm(false)
    load()
  }

  function handleEdit(row: HouseModel) {
    setForm({ slug: row.slug, title: row.title, description: row.description ?? '', complexity_level: row.complexity_level })
    setEditing(row.id); setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this house model?')) return
    await deleteHouseModel(id); load()
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">House Models</h1>
          <p className="text-[#e5e2e1]/40 text-sm">3D house models and their versions</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(s => !s) }}
          className="px-4 py-2 bg-[#FF8C00] text-[#131313] text-sm font-semibold rounded-lg hover:opacity-90"
        >
          {showForm ? 'Cancel' : '+ New Model'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#201f1f] rounded-xl p-5 mb-6 space-y-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Slug" name="slug" value={form.slug} onChange={handleChange} required placeholder="complex-farmhouse" />
            <FormField label="Title" name="title" value={form.title} onChange={handleChange} required placeholder="Complex Modern Farmhouse" />
          </div>
          <FormField label="Description" name="description" value={form.description} onChange={handleChange} type="textarea" />
          <FormField label="Complexity" name="complexity_level" value={form.complexity_level} onChange={handleChange} type="select" options={COMPLEXITY} />
          <button type="submit" className="px-4 py-2 bg-[#FF8C00] text-[#131313] text-sm font-semibold rounded-lg hover:opacity-90">
            {editing ? 'Update' : 'Create'}
          </button>
        </form>
      )}

      <AdminTable
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'slug', label: 'Slug', render: r => <code className="text-[#FF8C00]/60 text-xs">{r.slug}</code> },
          { key: 'complexity_level', label: 'Complexity', render: r => (
            <span className="text-xs bg-[#2a2a2a] px-2 py-0.5 rounded-full capitalize">{r.complexity_level}</span>
          )},
          { key: 'active_version', label: 'Version', render: r => <span className="text-[#e5e2e1]/40">v{r.active_version}</span> },
        ]}
        rows={rows}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}
