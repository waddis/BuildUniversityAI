import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — BuildRight 3D',
  description: 'Privacy Policy for BuildRight 3D, an interactive 3D construction training platform by Resolution Claims Consulting LLC.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#131313]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="font-headline text-[#FF8C00] font-bold text-lg tracking-tight">
            BuildRight 3D
          </Link>
          <Link href="/" className="text-[#e5e2e1]/50 hover:text-[#e5e2e1] text-[13px] font-label transition-colors">
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="font-headline text-4xl font-bold text-[#e5e2e1] tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-[#e5e2e1]/40 text-sm font-label mb-12">Last updated: April 7, 2026</p>

        <div className="space-y-10">

          {/* Who We Are */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">1. Who We Are</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              BuildRight 3D is operated by Resolution Claims Consulting LLC, a Florida limited liability company. BuildRight 3D is an interactive 3D construction training platform designed for construction professionals, insurance adjusters, and building inspectors. Throughout this policy, &quot;we,&quot; &quot;us,&quot; and &quot;our&quot; refer to Resolution Claims Consulting LLC.
            </p>
          </section>

          {/* Data We Collect */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">2. Information We Collect</h2>
            <div className="space-y-4 text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              <div>
                <h3 className="font-headline text-[#e5e2e1]/80 font-semibold mb-1">Account Information</h3>
                <p>When you create an account, we collect your email address through Supabase magic link authentication. We do not collect passwords.</p>
              </div>
              <div>
                <h3 className="font-headline text-[#e5e2e1]/80 font-semibold mb-1">Payment Information</h3>
                <p>Payments are processed by Stripe. We do not store your credit card number, bank account details, or other payment credentials on our servers. Stripe receives and processes your payment information directly. Please refer to <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#FF8C00] hover:underline">Stripe&apos;s Privacy Policy</a> for details.</p>
              </div>
              <div>
                <h3 className="font-headline text-[#e5e2e1]/80 font-semibold mb-1">Learning Progress</h3>
                <p>We collect data about your training progress, including lesson completions, quiz scores, and module progress. This data is stored in our Supabase database and is used to personalize your learning experience.</p>
              </div>
              <div>
                <h3 className="font-headline text-[#e5e2e1]/80 font-semibold mb-1">AI Chat Messages</h3>
                <p>When you use our AI assistant feature, your chat messages are sent to Anthropic (Claude) for processing. Anthropic may retain these messages in accordance with their usage policies. Please refer to <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#FF8C00] hover:underline">Anthropic&apos;s Privacy Policy</a> for details.</p>
              </div>
              <div>
                <h3 className="font-headline text-[#e5e2e1]/80 font-semibold mb-1">Usage Data</h3>
                <p>We may collect standard usage data such as browser type, device information, pages visited, and interaction patterns to improve the platform.</p>
              </div>
            </div>
          </section>

          {/* How We Use Data */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">3. How We Use Your Information</h2>
            <ul className="text-[#e5e2e1]/60 text-[15px] leading-relaxed space-y-2 list-none">
              <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> To provide, maintain, and improve the BuildRight 3D platform</li>
              <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> To authenticate your identity and manage your account</li>
              <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> To process subscription payments via Stripe</li>
              <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> To track and display your learning progress</li>
              <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> To power AI-assisted learning features via Anthropic Claude</li>
              <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> To respond to support requests</li>
              <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> To comply with legal obligations</li>
            </ul>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed mt-4">We do not currently send marketing emails. If this changes, you will be notified and given the option to opt out.</p>
          </section>

          {/* Third-Party Sharing */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">4. Third-Party Services</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed mb-4">
              We share data with the following third-party service providers, solely for the purposes described:
            </p>
            <div className="space-y-3 text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              <div className="bg-[var(--surface-container)] rounded-xl p-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                <span className="font-headline text-[#e5e2e1]/80 font-semibold">Supabase</span> — Authentication (email, magic link tokens) and database hosting (user profiles, progress data).
              </div>
              <div className="bg-[var(--surface-container)] rounded-xl p-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                <span className="font-headline text-[#e5e2e1]/80 font-semibold">Stripe</span> — Payment processing for subscription billing. Stripe receives your payment details directly.
              </div>
              <div className="bg-[var(--surface-container)] rounded-xl p-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                <span className="font-headline text-[#e5e2e1]/80 font-semibold">Anthropic (Claude)</span> — AI-powered chat and lesson assistance. Chat messages are sent to Anthropic for processing.
              </div>
              <div className="bg-[var(--surface-container)] rounded-xl p-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                <span className="font-headline text-[#e5e2e1]/80 font-semibold">Google Fonts</span> — Font delivery via CDN. Google may collect standard web request data (IP address, browser info). We plan to self-host fonts in the future to eliminate this data sharing.
              </div>
              <div className="bg-[var(--surface-container)] rounded-xl p-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                <span className="font-headline text-[#e5e2e1]/80 font-semibold">Stitch by Google</span> — UI generation tooling used during development.
              </div>
            </div>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          {/* Cookies & Local Storage */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">5. Cookies and Local Storage</h2>
            <div className="text-[#e5e2e1]/60 text-[15px] leading-relaxed space-y-3">
              <p>We use the following browser storage mechanisms:</p>
              <div className="bg-[var(--surface-container)] rounded-xl p-4 space-y-2" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                <div><span className="font-label text-[#e5e2e1]/80">Authentication cookies</span> — Set by Supabase to maintain your login session. These are essential for the platform to function.</div>
                <div><span className="font-label text-[#e5e2e1]/80">buildright_completed</span> — Stored in localStorage to track which lessons you have completed.</div>
                <div><span className="font-label text-[#e5e2e1]/80">buildright_progress</span> — Stored in localStorage to track your current progress within lessons.</div>
              </div>
              <p>We do not use third-party tracking cookies or advertising cookies.</p>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">6. Data Retention</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              We retain your account data and learning progress for as long as your account is active. If you request account deletion, we will delete your personal data within 30 days, except where retention is required by law (e.g., financial transaction records as required by tax regulations). Anonymized, aggregated usage data may be retained indefinitely for analytics purposes.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">7. Data Security</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              We implement reasonable technical and organizational measures to protect your data, including encryption in transit (TLS/HTTPS), secure authentication via Supabase, and row-level security on our database. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          {/* CCPA */}
          <section id="ccpa">
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">8. California Privacy Rights (CCPA)</h2>
            <div className="text-[#e5e2e1]/60 text-[15px] leading-relaxed space-y-3">
              <p>If you are a California resident, the California Consumer Privacy Act (CCPA) provides you with the following rights:</p>
              <ul className="space-y-2 list-none">
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> <strong className="text-[#e5e2e1]/80">Right to Know:</strong> You may request that we disclose the categories and specific pieces of personal information we have collected about you.</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> <strong className="text-[#e5e2e1]/80">Right to Delete:</strong> You may request that we delete personal information we have collected from you.</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> <strong className="text-[#e5e2e1]/80">Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights.</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> <strong className="text-[#e5e2e1]/80">No Sale of Personal Information:</strong> We do not sell your personal information as defined by the CCPA.</li>
              </ul>
              <p>To exercise these rights, contact us at <a href="mailto:privacy@buildright3d.com" className="text-[#FF8C00] hover:underline">privacy@buildright3d.com</a>. We will respond within 45 days.</p>
            </div>
          </section>

          {/* GDPR */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">9. European Privacy Rights (GDPR)</h2>
            <div className="text-[#e5e2e1]/60 text-[15px] leading-relaxed space-y-3">
              <p>If you are located in the European Economic Area (EEA) or United Kingdom, you have the following rights under the General Data Protection Regulation (GDPR):</p>
              <ul className="space-y-2 list-none">
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> <strong className="text-[#e5e2e1]/80">Right of Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> <strong className="text-[#e5e2e1]/80">Right to Rectification:</strong> Request correction of inaccurate personal data.</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> <strong className="text-[#e5e2e1]/80">Right to Erasure:</strong> Request deletion of your personal data.</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> <strong className="text-[#e5e2e1]/80">Right to Restrict Processing:</strong> Request that we limit how we use your data.</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> <strong className="text-[#e5e2e1]/80">Right to Data Portability:</strong> Receive your data in a structured, commonly used format.</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> <strong className="text-[#e5e2e1]/80">Right to Object:</strong> Object to the processing of your personal data.</li>
              </ul>
              <p>Our legal basis for processing your data is contractual necessity (to provide the service you subscribed to) and legitimate interest (to improve the platform). To exercise any of these rights, contact us at <a href="mailto:privacy@buildright3d.com" className="text-[#FF8C00] hover:underline">privacy@buildright3d.com</a>.</p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">10. Children&apos;s Privacy</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              BuildRight 3D is not directed at individuals under the age of 18. We do not knowingly collect personal information from children. The platform is designed for construction professionals, insurance adjusters, and building inspectors. If we become aware that we have collected personal information from someone under 18, we will delete that information promptly.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">11. Changes to This Policy</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              We may update this Privacy Policy from time to time. If we make material changes, we will notify you by posting a notice on the platform or by email. Your continued use of BuildRight 3D after changes become effective constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">12. Contact Us</h2>
            <div className="text-[#e5e2e1]/60 text-[15px] leading-relaxed space-y-1">
              <p>If you have questions about this Privacy Policy or wish to exercise your privacy rights, contact us:</p>
              <div className="mt-3 bg-[var(--surface-container)] rounded-xl p-5" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                <p className="font-headline text-[#e5e2e1]/80 font-semibold">Resolution Claims Consulting LLC</p>
                <p className="mt-1">Email: <a href="mailto:privacy@buildright3d.com" className="text-[#FF8C00] hover:underline">privacy@buildright3d.com</a></p>
                <p>State of Organization: Florida, United States</p>
              </div>
            </div>
          </section>

        </div>
      </main>

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
