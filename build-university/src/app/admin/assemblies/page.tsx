'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminTable from '@/components/ui/AdminTable'
import FormField from '@/components/ui/FormField'
import { fetchAssemblies, upsertAssembly, deleteAssembly, fetchHouseModels } from '@/lib/db/admin'
import type { Assembly, HouseModel } from '@/types'
import { CONSTRUCTION_PHASES, BUILDING_SYSTEMS } from '@/types'

const PHASE_OPTIONS = CONSTRUCTION_PHASES.map(p => ({ value: p, label: p.replace(/_/g, ' ') }))
const SYSTEM_OPTIONS = BUILDING_SYSTEMS.map(s => ({ value: s, label: s }))
const CATEGORIES = ['structural', 'sheathing', 'waterproofing', 'flashing', 'roofing', 'cladding', 'insulation', 'mep', 'finish', 'hardware'].map(c => ({ value: c, label: c }))

const EMPTY = { slug: '', name: '', category: 'structural', system: 'roof', phase: 'framing_roof', subphase: '', mesh_key: '', install_order: '0', visibility_group: '' }

export default function AssembliesPage() {
  const [rows, setRows] = useState<Assembly[]>([])
  const [models, setModels] = useState<HouseModel[]>([])
  const [form, setForm] = useState<Record<string, string>>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    try {
      setRows(await fetchAssemblies())
      setModels(await fetchHouseModels())
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleChange = (n: string, v: string) => setForm(f => ({ ...f, [n]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rec = { ...form, install_order: parseInt(form.install_order) || 0, ...(editing ? { id: editing } : {}) }
    await upsertAssembly(rec)
    setForm(EMPTY); setEditing(null); setShowForm(false); load()
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Assemblies</h1>
          <p className="text-white/40 text-sm">Building components with mesh keys and install order</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(s => !s) }}
          className="px-4 py-2 bg-amber-500 text-black text-sm font-semibold rounded-lg hover:bg-amber-400">
          {showForm ? 'Cancel' : '+ New Assembly'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/3 border border-white/8 rounded-xl p-5 mb-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Slug" name="slug" value={form.slug} onChange={handleChange} required placeholder="valley-metal" />
            <FormField label="Name" name="name" value={form.name} onChange={handleChange} required placeholder="Valley Metal Flashing" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Category" name="category" value={form.category} onChange={handleChange} type="select" options={CATEGORIES} />
            <FormField label="System" name="system" value={form.system} onChange={handleChange} type="select" options={SYSTEM_OPTIONS} />
            <FormField label="Phase" name="phase" value={form.phase} onChange={handleChange} type="select" options={PHASE_OPTIONS} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Mesh Key" name="mesh_key" value={form.mesh_key} onChange={handleChange} placeholder="valley_metal_01" />
            <FormField label="Visibility Group" name="visibility_group" value={form.visibility_group} onChange={handleChange} placeholder="waterproofing" />
            <FormField label="Install Order" name="install_order" value={form.install_order} onChange={handleChange} type="number" />
          </div>
          <FormField label="Subphase" name="subphase" value={form.subphase} onChange={handleChange} placeholder="flashing" />
          {models.length > 0 && (
            <FormField label="House Model Version" name="house_model_version_id" value={form.house_model_version_id ?? ''} onChange={handleChange} placeholder="UUID of model version" />
          )}
          <button type="submit" className="px-4 py-2 bg-amber-500 text-black text-sm font-semibold rounded-lg hover:bg-amber-400">
            {editing ? 'Update' : 'Create'}
          </button>
        </form>
      )}

      <AdminTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'system', label: 'System', render: (r: Assembly) => <span className="text-xs capitalize bg-white/5 px-2 py-0.5 rounded-full">{r.system}</span> },
          { key: 'phase', label: 'Phase', render: (r: Assembly) => <span className="text-xs capitalize">{r.phase.replace(/_/g, ' ')}</span> },
          { key: 'category', label: 'Category', render: (r: Assembly) => <span className="text-xs capitalize">{r.category}</span> },
          { key: 'mesh_key', label: 'Mesh Key', render: (r: Assembly) => r.mesh_key ? <code className="text-amber-500/60 text-xs">{r.mesh_key}</code> : <span className="text-white/20">—</span> },
          { key: 'install_order', label: 'Order' },
        ]}
        rows={rows}
        onEdit={row => {
          setForm({ slug: row.slug, name: row.name, category: row.category, system: row.system, phase: row.phase, subphase: row.subphase ?? '', mesh_key: row.mesh_key ?? '', install_order: String(row.install_order), visibility_group: row.visibility_group ?? '', house_model_version_id: row.house_model_version_id })
          setEditing(row.id); setShowForm(true)
        }}
        onDelete={async id => { if (confirm('Delete this assembly?')) { await deleteAssembly(id); load() }}}
      />
    </div>
  )
}
