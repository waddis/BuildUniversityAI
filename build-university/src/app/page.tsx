'use client'

import Link from 'next/link'

const FEATURES = [
  {
    title: 'Learn Mode',
    desc: 'Step-by-step guided walkthroughs. Every component explained in context, in the correct install sequence.',
    icon: 'school',
  },
  {
    title: 'Build Mode',
    desc: 'Parametric BIM editor. Place walls, generate roofs, assign assemblies. Data-driven geometry.',
    icon: 'architecture',
  },
]

const DATA_FEATURES = [
  'Parametric wall, slab, and roof generation',
  'IRC/IBC/ASCE 7 code references per assembly',
  'Jurisdiction-aware wind, snow, and climate zones',
  'Failure mode overlays with claim relevance',
  'Exploded system views — structure, sheathing, flashing',
  'Real construction sequencing across 14 phases',
]

const PRICING = [
  { tier: 'Crew', price: '$49', period: '/mo', seats: '1 seat', features: ['All learning modes', '3D model viewer', 'Code reference library', 'Progress tracking'], highlight: false },
  { tier: 'Company', price: '$199', period: '/mo', seats: 'Up to 10 seats', features: ['Everything in Crew', 'BIM editor access', 'Team analytics', 'Priority support', 'Custom content pipeline'], highlight: true },
  { tier: 'Enterprise', price: 'Custom', period: '', seats: 'Unlimited seats', features: ['Everything in Company', 'SSO integration', 'Dedicated CSM', 'API access', 'White-label options'], highlight: false },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#131313]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="font-headline text-[#FF8C00] font-bold text-lg tracking-tight">
            BuildRight 3D
          </Link>
          <div className="flex items-center gap-8">
            <Link href="#features" className="text-[#e5e2e1]/50 hover:text-[#e5e2e1] text-[13px] font-label transition-colors">Product</Link>
            <Link href="/learn" className="text-[#e5e2e1]/50 hover:text-[#e5e2e1] text-[13px] font-label transition-colors">Learn</Link>
            <Link href="#pricing" className="text-[#e5e2e1]/50 hover:text-[#e5e2e1] text-[13px] font-label transition-colors">Pricing</Link>
            <Link href="/login" className="text-[#e5e2e1]/60 hover:text-[#e5e2e1] text-[13px] font-label transition-colors">Login</Link>
            <Link href="/dashboard" className="px-5 py-2 gradient-primary text-[#131313] font-semibold text-[13px] rounded-lg hover:opacity-90 transition-opacity font-label">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-32 pb-36 text-center overflow-hidden animate-[fadeIn_0.5s_ease-out]">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 40% 40% at 50% 35%, rgba(255,140,0,0.06) 0%, transparent 70%)' }} />

        <h1 className="relative font-headline text-5xl sm:text-6xl lg:text-[80px] font-bold max-w-5xl leading-[1.05] tracking-[-0.03em]">
          <span className="text-[#e5e2e1]">Master Construction</span>
          <br />
          <span className="text-[#e5e2e1]">in 3D. </span>
          <span className="text-gradient-primary">Before the</span>
          <br />
          <span className="text-gradient-primary">First Nail.</span>
        </h1>
        <p className="relative text-[#e5e2e1]/40 text-lg sm:text-xl mt-8 max-w-lg leading-relaxed tracking-tight">
          Interactive 3D construction training. Phase by phase. Code aware. Built for professionals who build it right.
        </p>
        <div className="relative flex gap-4 mt-12">
          <Link href="/dashboard" className="px-8 py-3.5 gradient-primary text-[#131313] font-bold text-[15px] rounded-lg hover:opacity-90 shadow-lg transition-all active:scale-[0.97] font-headline">
            Start Training
          </Link>
        </div>
      </section>

      {/* 3D Model Preview Placeholder */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="bg-[var(--surface-low)] rounded-2xl overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
          <div className="flex items-center justify-center h-[400px] relative">
            {/* Wireframe grid aesthetic */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'linear-gradient(rgba(255,183,125,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,183,125,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />
            <div className="text-center relative z-10">
              <div className="text-[#ffb77d]/20 text-8xl font-bold font-headline tracking-tighter">3D</div>
              <p className="text-[#e5e2e1]/20 text-sm mt-2 font-label">Interactive Model Preview</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features — Engineered for Accuracy */}
      <section id="features" className="px-6 py-24 max-w-6xl mx-auto animate-[fadeIn_0.4s_ease-out]">
        <div className="text-center mb-16">
          <p className="text-[#FF8C00] text-[11px] uppercase tracking-[0.2em] font-label mb-4">Purpose-Built Platform</p>
          <h2 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight text-[#e5e2e1]">Engineered for Accuracy</h2>
          <p className="text-[#e5e2e1]/35 text-lg mt-4 max-w-lg mx-auto leading-relaxed">
            Two modes. One goal. Build it right, the first time.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-[var(--surface-container)] rounded-2xl p-8 hover:bg-[var(--surface-high)] transition-all duration-300" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
              <span className="material-symbols-outlined text-[28px] text-[#FF8C00] mb-4 block">{f.icon}</span>
              <h3 className="font-headline text-xl font-bold text-[#e5e2e1] mb-2 tracking-tight">{f.title}</h3>
              <p className="text-[#e5e2e1]/40 text-[14px] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data-Driven Geometry */}
      <section className="px-6 py-24 bg-[var(--surface-low)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#82CFFF] text-[11px] uppercase tracking-[0.2em] font-label mb-4">Technical Foundation</p>
            <h2 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight text-[#e5e2e1]">Data-Driven Geometry</h2>
            <p className="text-[#e5e2e1]/35 text-lg mt-4 max-w-lg mx-auto leading-relaxed">
              Every assembly is parametric. Every measurement is code-referenced. Every sequence is real.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DATA_FEATURES.map(feat => (
              <div key={feat} className="flex items-start gap-3 bg-[var(--surface-container)] rounded-xl p-5" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.1)' }}>
                <span className="text-[#FF8C00] mt-0.5 text-sm font-label">--</span>
                <span className="text-[#e5e2e1]/60 text-[14px] leading-relaxed">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#FF8C00] text-[11px] uppercase tracking-[0.2em] font-label mb-4">Plans</p>
          <h2 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight text-[#e5e2e1]">Simple, Transparent Pricing</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {PRICING.map(plan => (
            <div
              key={plan.tier}
              className={`rounded-2xl p-8 transition-all duration-300 ${
                plan.highlight
                  ? 'bg-[var(--surface-high)] ring-2 ring-[#FF8C00]/30'
                  : 'bg-[var(--surface-container)]'
              }`}
              style={!plan.highlight ? { boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' } : undefined}
            >
              {plan.highlight && (
                <span className="text-[10px] uppercase tracking-[0.15em] font-label gradient-primary text-[#131313] px-3 py-1 rounded-md font-semibold inline-block mb-4">Most Popular</span>
              )}
              <h3 className="font-headline text-lg font-bold text-[#e5e2e1] tracking-tight">{plan.tier}</h3>
              <p className="text-[#e5e2e1]/30 text-[12px] font-label mt-1">{plan.seats}</p>
              <div className="mt-4 mb-6">
                <span className="font-headline text-4xl font-bold text-[#e5e2e1]">{plan.price}</span>
                <span className="text-[#e5e2e1]/30 text-sm font-label">{plan.period}</span>
              </div>
              <ul className="space-y-2.5 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="text-[#e5e2e1]/50 text-[13px] flex items-center gap-2">
                    <span className="text-[#FF8C00] text-[10px]">+</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className={`block text-center py-3 rounded-lg text-[13px] font-semibold font-label transition-all ${
                  plan.highlight
                    ? 'gradient-primary text-[#131313] hover:opacity-90'
                    : 'bg-[var(--surface-high)] text-[#e5e2e1]/70 hover:bg-[var(--surface-highest)] hover:text-[#e5e2e1]'
                }`}
              >
                {plan.tier === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-16 text-center" style={{ borderTop: '1px solid rgba(86,67,52,0.15)' }}>
        <p className="font-headline text-[#e5e2e1]/20 text-lg tracking-tight">Build it right, the first time.</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/privacy" className="text-[#e5e2e1]/20 hover:text-[#e5e2e1]/50 text-[12px] font-label transition-colors">Privacy</Link>
          <span className="text-[#e5e2e1]/10 text-[12px]">|</span>
          <Link href="/terms" className="text-[#e5e2e1]/20 hover:text-[#e5e2e1]/50 text-[12px] font-label transition-colors">Terms</Link>
        </div>
        <p className="text-[#e5e2e1]/10 text-[12px] font-label mt-3">&copy; 2026 Resolution Claims Consulting LLC. All rights reserved.</p>
      </footer>
    </div>
  )
}
