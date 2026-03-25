'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function Icon({ name, filled }: { name: string; filled?: boolean }) {
  return <span className="material-symbols-outlined text-[20px]" style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}>{name}</span>
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/train', label: 'Training', icon: 'school' },
  { href: '/editor', label: 'Editor', icon: 'architecture' },
  { href: '/admin', label: 'Admin CMS', icon: 'settings' },
  { href: '/train', label: 'Learning Library', icon: 'menu_book' },
]

export default function AppSidebar({ currentModule, progress }: { currentModule?: string; progress?: { done: number; total: number } }) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 z-40 bg-[#f7f7f9] hidden md:flex flex-col py-4 text-sm font-medium tracking-wide">
      {/* Project card */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-ambient-sm">
          <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center text-white">
            <Icon name="architecture" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[var(--on-surface)] leading-tight">Main Project</h3>
            <p className="text-[10px] text-[var(--on-surface)] opacity-40 uppercase tracking-[0.12em]">V.2.4.0</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div className="px-4 space-y-0.5 mb-6">
        <p className="px-2 mb-2 text-[10px] uppercase tracking-[0.12em] text-[var(--on-surface)] opacity-30 font-bold">Training Module</p>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/train' && pathname.startsWith(item.href))
          const isTraining = item.label === 'Training' && pathname.startsWith('/train')
          const isActive = active || isTraining
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 mx-2 my-0.5 rounded-lg p-2.5 transition-all duration-150 hover:translate-x-0.5 ${
                isActive
                  ? 'bg-white text-[var(--primary)] shadow-ambient-sm font-semibold'
                  : 'text-[var(--on-surface)] opacity-50 hover:bg-white/50'
              }`}
            >
              <Icon name={item.icon} filled={isActive} />
              <span className="text-[13px]">{item.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Progress section */}
      {progress && (
        <div className="px-4 mb-4">
          <div className="p-4 bg-[var(--primary)]/5 rounded-xl" style={{ background: 'rgba(0,78,159,0.05)', border: '1px solid rgba(0,78,159,0.1)' }}>
            <p className="text-[11px] font-bold text-[var(--primary)] mb-2">{currentModule || 'Module'} Progress</p>
            <div className="w-full bg-[var(--surface-high)] h-1.5 rounded-full overflow-hidden">
              <div className="gradient-primary h-full rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <p className="text-[10px] mt-2 text-[var(--on-surface)] opacity-40">{progress.done} of {progress.total} Tasks Completed</p>
          </div>
        </div>
      )}

      {/* Bottom links */}
      <div className="px-4 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        <Link href="/login" className="flex items-center gap-3 text-[var(--on-surface)] opacity-40 p-2 hover:bg-white/50 rounded-lg text-[13px]">
          <Icon name="settings" /><span>Settings</span>
        </Link>
        <Link href="/" className="flex items-center gap-3 text-red-600 opacity-60 p-2 hover:bg-red-50 rounded-lg text-[13px]">
          <Icon name="logout" /><span>Logout</span>
        </Link>
      </div>
    </aside>
  )
}
