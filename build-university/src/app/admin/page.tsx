'use client'

import Link from 'next/link'

const SECTIONS = [
  { href: '/admin/models', label: 'House Models', desc: 'Manage 3D house models and versions' },
  { href: '/admin/assemblies', label: 'Assemblies', desc: 'Building components, mesh keys, install order' },
  { href: '/admin/lessons', label: 'Modules & Lessons', desc: 'Curriculum, steps, camera presets' },
  { href: '/admin/code', label: 'Code References', desc: 'IRC, IBC, ASCE, ASTM citations' },
  { href: '/admin/failure-modes', label: 'Failure Modes', desc: 'Incorrect installs, consequences, severity' },
]

export default function AdminOverview() {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-white/40 mb-8">Manage content for BuildRight 3D</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white/3 border border-white/8 rounded-xl p-5 hover:border-amber-500/30 hover:bg-white/5 transition-colors"
          >
            <div className="font-semibold mb-1">{s.label}</div>
            <div className="text-white/40 text-sm">{s.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
