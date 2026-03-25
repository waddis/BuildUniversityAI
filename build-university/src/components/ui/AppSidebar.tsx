'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function Icon({ name, filled }: { name: string; filled?: boolean }) {
  return <span className="material-symbols-outlined text-[20px]" style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}>{name}</span>
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/train', label: 'Courses', icon: 'school' },
  { href: '/learn', label: 'Library', icon: 'menu_book' },
  { href: '/admin', label: 'Settings', icon: 'settings' },
]

export default function AppSidebar({ currentModule, progress }: { currentModule?: string; progress?: { done: number; total: number } }) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 z-40 bg-[var(--surface-low)] hidden md:flex flex-col py-5 text-sm font-medium tracking-wide">
      {/* Project header */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-3 p-3.5 bg-[var(--surface-container)] rounded-xl" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.12)' }}>
          <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
            <Icon name="architecture" />
          </div>
          <div>
            <h3 className="text-[13px] font-headline font-bold text-[#e5e2e1] leading-tight tracking-tight">PROJECT ALPHA</h3>
            <p className="text-[10px] text-[#e5e2e1]/30 uppercase tracking-[0.12em] font-label mt-0.5">V.2.4.0</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div className="px-5 space-y-0.5 mb-6">
        <p className="px-2 mb-3 text-[10px] uppercase tracking-[0.15em] text-[#e5e2e1]/20 font-label font-bold">Navigation</p>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/train' && pathname.startsWith(item.href))
          const isTraining = item.label === 'Courses' && pathname.startsWith('/train')
          const isActive = active || isTraining
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 mx-1 my-0.5 rounded-lg p-2.5 transition-all duration-150 hover:translate-x-0.5 ${
                isActive
                  ? 'bg-[var(--surface-high)] text-[#FF8C00] font-semibold'
                  : 'text-[#e5e2e1]/40 hover:bg-[var(--surface-container)] hover:text-[#e5e2e1]/70'
              }`}
            >
              <Icon name={item.icon} filled={isActive} />
              <span className="text-[13px] font-label">{item.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Progress section */}
      {progress && (
        <div className="px-5 mb-4">
          <div className="p-4 bg-[var(--surface-container)] rounded-xl" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.12)' }}>
            <p className="text-[11px] font-label font-bold text-[#FF8C00] mb-2">{currentModule || 'Module'} Progress</p>
            <div className="w-full bg-[var(--surface-high)] h-1.5 rounded-full overflow-hidden">
              <div className="gradient-primary h-full rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <p className="text-[10px] mt-2 text-[#e5e2e1]/30 font-label">{progress.done} of {progress.total} Tasks Completed</p>
          </div>
        </div>
      )}

      {/* Bottom links */}
      <div className="px-5 pt-3" style={{ borderTop: '1px solid rgba(86,67,52,0.12)' }}>
        <Link href="/login" className="flex items-center gap-3 text-[#e5e2e1]/30 p-2 hover:bg-[var(--surface-container)] rounded-lg text-[13px] font-label transition-colors">
          <Icon name="settings" /><span>Account</span>
        </Link>
        <Link href="/" className="flex items-center gap-3 text-red-400/60 p-2 hover:bg-red-400/5 rounded-lg text-[13px] font-label transition-colors">
          <Icon name="logout" /><span>Logout</span>
        </Link>
      </div>
    </aside>
  )
}
