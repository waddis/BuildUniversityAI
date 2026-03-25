'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function Icon({ name }: { name: string }) {
  return <span className="material-symbols-outlined text-[20px]">{name}</span>
}

const TABS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/train', label: 'Training' },
  { href: '/editor', label: 'Editor' },
]

export default function TopNav({ stepInfo }: { stepInfo?: { step: number; total: number; pct: number } }) {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 w-full z-50 h-16 bg-white/85 backdrop-blur-xl shadow-sm flex items-center justify-between px-6 font-sans antialiased tracking-tight">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-xl font-bold tracking-tighter text-[var(--on-surface)]">BuildRight 3D</Link>
        <div className="hidden md:flex gap-6">
          {TABS.map(tab => {
            const active = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`text-[13px] transition-colors duration-200 ${
                  active
                    ? 'text-[var(--primary)] font-semibold border-b-2 border-[var(--primary)]'
                    : 'text-[var(--on-surface)] opacity-40 hover:opacity-80'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {stepInfo && (
          <div className="flex items-center gap-3 mr-4">
            <span className="text-[12px] text-[var(--on-surface)] opacity-40">Step {stepInfo.step} of {stepInfo.total}</span>
            <div className="w-24 h-1.5 bg-[var(--surface-high)] rounded-full overflow-hidden">
              <div className="gradient-primary h-full rounded-full transition-all duration-500" style={{ width: `${stepInfo.pct}%` }} />
            </div>
            <span className="text-[12px] font-semibold text-[var(--primary)]">{stepInfo.pct}% Complete</span>
          </div>
        )}
        <button className="px-4 py-1.5 text-[12px] font-medium rounded-full hover:bg-[var(--surface-low)] transition-colors" style={{ border: '1px solid rgba(193,198,215,0.3)' }}>
          Wireframe Mode
        </button>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-[var(--surface-low)] rounded-full transition-all text-[var(--on-surface)] opacity-40 hover:opacity-80">
            <Icon name="visibility" />
          </button>
          <button className="p-2 hover:bg-[var(--surface-low)] rounded-full transition-all text-[var(--on-surface)] opacity-40 hover:opacity-80">
            <Icon name="help_outline" />
          </button>
          <button className="p-2 hover:bg-[var(--surface-low)] rounded-full transition-all text-[var(--on-surface)] opacity-40 hover:opacity-80">
            <Icon name="account_circle" />
          </button>
        </div>
      </div>
    </nav>
  )
}
