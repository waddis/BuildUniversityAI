import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — BuildRight 3D',
  description: 'Terms of Service for BuildRight 3D, an interactive 3D construction training platform by Resolution Claims Consulting LLC.',
}

export default function TermsPage() {
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
        <h1 className="font-headline text-4xl font-bold text-[#e5e2e1] tracking-tight mb-2">Terms of Service</h1>
        <p className="text-[#e5e2e1]/40 text-sm font-label mb-12">Last updated: April 7, 2026</p>

        <div className="space-y-10">

          {/* Acceptance */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">1. Acceptance of Terms</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              By accessing or using BuildRight 3D (the &quot;Service&quot;), operated by Resolution Claims Consulting LLC (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the Service. We reserve the right to modify these Terms at any time. Continued use after modifications constitutes acceptance of updated Terms.
            </p>
          </section>

          {/* Age Requirement */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">2. Eligibility and Age Requirement</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              You must be at least 18 years of age to use BuildRight 3D. By using the Service, you represent and warrant that you are 18 years of age or older. The Service is designed for construction professionals, insurance adjusters, building inspectors, and other qualified individuals.
            </p>
          </section>

          {/* Description of Services */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">3. Description of Services</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              BuildRight 3D is an interactive 3D construction training platform. The Service provides educational content related to building construction, including lessons on framing, roofing, waterproofing, and envelope systems, with references to building codes such as the International Residential Code (IRC), International Building Code (IBC), and ASCE 7. Users learn through interactive 3D models, guided lessons, inspection challenges, and quizzes.
            </p>
          </section>

          {/* Professional Disclaimer */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">4. Professional Disclaimer</h2>
            <div className="bg-[var(--surface-container)] rounded-xl p-5 space-y-3" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,140,0,0.2)' }}>
              <p className="text-[#FF8C00] font-headline font-semibold text-[15px]">IMPORTANT: Please read this section carefully.</p>
              <div className="text-[#e5e2e1]/60 text-[15px] leading-relaxed space-y-3">
                <p>
                  All training content provided through BuildRight 3D is <strong className="text-[#e5e2e1]/80">for educational and informational purposes only</strong>. The content is not a substitute for professional engineering judgment, architectural advice, legal counsel, or the services of a licensed contractor.
                </p>
                <p>
                  <strong className="text-[#e5e2e1]/80">Building codes vary by jurisdiction.</strong> Code requirements referenced in our training materials (including IRC, IBC, and ASCE 7 references) may differ from the codes adopted and enforced in your jurisdiction. Users are solely responsible for verifying all applicable building codes, standards, and regulations with their local Authority Having Jurisdiction (AHJ) before applying any knowledge gained from this platform in professional practice.
                </p>
                <p>
                  <strong className="text-[#e5e2e1]/80">AI-generated content may contain inaccuracies.</strong> Some training content, explanations, and responses within BuildRight 3D are generated or assisted by artificial intelligence (Anthropic Claude). While we strive for accuracy, AI-generated content may contain errors, omissions, or outdated information. Users must independently verify all information before relying on it in professional contexts.
                </p>
                <p>
                  Resolution Claims Consulting LLC makes no warranties or representations regarding the accuracy, completeness, or applicability of any training content to any specific construction project, jurisdiction, or professional situation. Users act on information from this platform at their own risk.
                </p>
              </div>
            </div>
          </section>

          {/* Subscription and Billing */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">5. Subscription Plans and Billing</h2>
            <div className="text-[#e5e2e1]/60 text-[15px] leading-relaxed space-y-3">
              <p>BuildRight 3D offers the following subscription tiers:</p>
              <div className="space-y-2">
                <div className="bg-[var(--surface-container)] rounded-xl p-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                  <span className="font-headline text-[#e5e2e1]/80 font-semibold">Crew</span> — $49/month, 1 seat
                </div>
                <div className="bg-[var(--surface-container)] rounded-xl p-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                  <span className="font-headline text-[#e5e2e1]/80 font-semibold">Company</span> — $199/month, up to 10 seats
                </div>
                <div className="bg-[var(--surface-container)] rounded-xl p-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                  <span className="font-headline text-[#e5e2e1]/80 font-semibold">Enterprise</span> — Custom pricing, unlimited seats
                </div>
              </div>
              <p>All payments are processed securely by Stripe. By subscribing, you authorize us to charge your payment method on a recurring monthly basis until you cancel. You may cancel your subscription at any time through your account dashboard. Cancellation takes effect at the end of the current billing period. We do not provide refunds for partial billing periods unless required by applicable law.</p>
              <p>We reserve the right to modify pricing with 30 days&apos; notice. Price changes will not affect your current billing cycle.</p>
            </div>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">6. User Accounts</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              You are responsible for maintaining the security of your account and for all activities that occur under your account. You must provide accurate information when creating your account. You agree to notify us immediately of any unauthorized use of your account. We are not liable for any loss or damage arising from your failure to maintain account security.
            </p>
          </section>

          {/* User Conduct */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">7. User Conduct</h2>
            <div className="text-[#e5e2e1]/60 text-[15px] leading-relaxed space-y-3">
              <p>When using BuildRight 3D, you agree not to:</p>
              <ul className="space-y-2 list-none">
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> Use the Service for any unlawful purpose</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> Attempt to reverse engineer, decompile, or disassemble any part of the Service</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> Share your account credentials with unauthorized parties</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> Copy, distribute, or reproduce training content without written permission</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> Interfere with or disrupt the Service or its infrastructure</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> Use automated systems or bots to access the Service</li>
                <li className="flex items-start gap-2"><span className="text-[#FF8C00] mt-0.5">--</span> Misrepresent completion of training as a professional certification or license</li>
              </ul>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">8. Intellectual Property</h2>
            <div className="text-[#e5e2e1]/60 text-[15px] leading-relaxed space-y-3">
              <p>
                All content on BuildRight 3D, including but not limited to 3D models, training materials, text, graphics, code references, quizzes, user interface design, and software, is the property of Resolution Claims Consulting LLC or its licensors and is protected by copyright, trademark, and other intellectual property laws.
              </p>
              <p>
                Your subscription grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your personal or internal business training purposes. This license does not include the right to reproduce, distribute, modify, or create derivative works from any content on the platform.
              </p>
              <p>
                References to building codes (IRC, IBC, ASCE 7, ASTM) are used for educational purposes. These codes are the intellectual property of their respective publishers (ICC, ASCE, ASTM International).
              </p>
            </div>
          </section>

          {/* AI-Generated Content */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">9. AI-Generated Content</h2>
            <div className="text-[#e5e2e1]/60 text-[15px] leading-relaxed space-y-3">
              <p>
                BuildRight 3D uses artificial intelligence (Anthropic Claude) to generate and assist with training content, explanations, chat responses, and assessments. AI-generated content is provided &quot;as is&quot; and may contain errors or inaccuracies.
              </p>
              <p>
                We do not guarantee the accuracy, completeness, or reliability of any AI-generated content. Users should treat AI-generated content as a learning aid and not as authoritative professional guidance. Always verify AI-generated information against official code publications and consult qualified professionals before making decisions based on such content.
              </p>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">10. Limitation of Liability</h2>
            <div className="text-[#e5e2e1]/60 text-[15px] leading-relaxed space-y-3">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, RESOLUTION CLAIMS CONSULTING LLC AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
              </p>
              <p>
                WITHOUT LIMITING THE FOREGOING, WE SHALL NOT BE LIABLE FOR ANY DAMAGES, LOSSES, OR COSTS ARISING FROM: (A) YOUR RELIANCE ON ANY TRAINING CONTENT, INCLUDING AI-GENERATED CONTENT, FOR PROFESSIONAL DECISIONS; (B) ERRORS OR INACCURACIES IN BUILDING CODE REFERENCES; (C) DIFFERENCES BETWEEN TRAINING CONTENT AND LOCAL JURISDICTION REQUIREMENTS; OR (D) ANY CONSTRUCTION DEFECTS, FAILURES, OR CODE VIOLATIONS THAT MAY RESULT FROM ACTIONS TAKEN BASED ON INFORMATION PROVIDED THROUGH THE SERVICE.
              </p>
              <p>
                OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </div>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">11. Indemnification</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              You agree to indemnify, defend, and hold harmless Resolution Claims Consulting LLC, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising out of or in connection with: (a) your use of the Service; (b) your violation of these Terms; (c) your reliance on training content for professional decisions; or (d) any third-party claims related to your professional activities that were informed by content on the platform.
            </p>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">12. Disclaimer of Warranties</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS. WE DO NOT WARRANT THE ACCURACY OR COMPLETENESS OF ANY TRAINING CONTENT, INCLUDING AI-GENERATED CONTENT AND BUILDING CODE REFERENCES.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">13. Termination</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              We may suspend or terminate your access to the Service at any time, with or without cause, and with or without notice. Upon termination, your right to use the Service ceases immediately. Sections of these Terms that by their nature should survive termination (including intellectual property, limitation of liability, indemnification, and governing law) will survive.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">14. Governing Law</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of Florida, United States, without regard to its conflict of laws provisions. Any legal action or proceeding arising under these Terms shall be brought exclusively in the state or federal courts located in Florida, and you consent to personal jurisdiction in such courts.
            </p>
          </section>

          {/* Severability */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">15. Severability</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect. The invalid or unenforceable provision shall be modified to the minimum extent necessary to make it valid and enforceable.
            </p>
          </section>

          {/* Entire Agreement */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">16. Entire Agreement</h2>
            <p className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              These Terms, together with our <Link href="/privacy" className="text-[#FF8C00] hover:underline">Privacy Policy</Link>, constitute the entire agreement between you and Resolution Claims Consulting LLC regarding your use of BuildRight 3D and supersede all prior agreements and understandings.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3">17. Contact Us</h2>
            <div className="text-[#e5e2e1]/60 text-[15px] leading-relaxed">
              <p>For questions about these Terms of Service, contact us:</p>
              <div className="mt-3 bg-[var(--surface-container)] rounded-xl p-5" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                <p className="font-headline text-[#e5e2e1]/80 font-semibold">Resolution Claims Consulting LLC</p>
                <p className="mt-1">Email: <a href="mailto:legal@buildright3d.com" className="text-[#FF8C00] hover:underline">legal@buildright3d.com</a></p>
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
