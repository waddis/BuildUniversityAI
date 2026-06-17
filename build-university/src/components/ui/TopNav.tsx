'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function Icon({ name }: { name: string }) {
  return <span className="material-symbols-outlined text-[20px]">{name}</span>
}

const TABS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/train', label: 'Training' },
]

export default function TopNav({ stepInfo }: { stepInfo?: { step: number; total: number; pct: number } }) {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 w-full z-50 h-16 glass flex items-center justify-between px-6 font-sans antialiased tracking-tight">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-headline text-lg font-bold tracking-tighter text-[#FF8C00]">BuildRight 3D</Link>
        <div className="hidden md:flex gap-6">
          {TABS.map(tab => {
            const active = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`text-[13px] font-label transition-colors duration-200 ${
                  active
                    ? 'text-[#FF8C00] font-semibold'
                    : 'text-[#e5e2e1]/35 hover:text-[#e5e2e1]/70'
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
            <span className="text-[12px] text-[#e5e2e1]/35 font-label">Step {stepInfo.step} of {stepInfo.total}</span>
            <div className="w-24 h-1.5 bg-[var(--surface-high)] rounded-full overflow-hidden">
              <div className="gradient-primary h-full rounded-full transition-all duration-500" style={{ width: `${stepInfo.pct}%` }} />
            </div>
            <span className="text-[12px] font-semibold text-[#FF8C00] font-label">{stepInfo.pct}%</span>
          </div>
        )}
        <button className="px-4 py-1.5 text-[12px] font-label font-medium rounded-lg bg-[var(--surface-high)] text-[#e5e2e1]/50 hover:bg-[var(--surface-highest)] hover:text-[#e5e2e1]/80 transition-colors" aria-label="Toggle wireframe view">
          Wireframe
        </button>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-[var(--surface-high)] rounded-lg transition-all text-[#e5e2e1]/30 hover:text-[#e5e2e1]/60" aria-label="Toggle visibility">
            <Icon name="visibility" />
          </button>
          <button className="p-2 hover:bg-[var(--surface-high)] rounded-lg transition-all text-[#e5e2e1]/30 hover:text-[#e5e2e1]/60" aria-label="Help">
            <Icon name="help_outline" />
          </button>
          <button className="p-2 hover:bg-[var(--surface-high)] rounded-lg transition-all text-[#e5e2e1]/30 hover:text-[#e5e2e1]/60" aria-label="Account">
            <Icon name="account_circle" />
          </button>
        </div>
      </div>
    </nav>
  )
}
