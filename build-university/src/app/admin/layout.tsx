'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/models', label: 'House Models' },
  { href: '/admin/assemblies', label: 'Assemblies' },
  { href: '/admin/lessons', label: 'Modules & Lessons' },
  { href: '/admin/code', label: 'Code References' },
  { href: '/admin/failure-modes', label: 'Failure Modes' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white/3 border-r border-white/8 flex flex-col py-6 shrink-0">
        <Link href="/" className="px-5 text-amber-500 font-bold text-sm tracking-wider uppercase mb-8">
          BuildRight 3D
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-5 text-white/20 text-xs">Admin CMS</div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
