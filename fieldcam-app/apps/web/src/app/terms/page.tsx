import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — fieldcam.app",
  description:
    "Terms of Service for fieldcam.app, a field documentation platform operated by Resolution Claims Consulting LLC.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-bold text-slate-900 hover:text-blue-600 transition">
          fieldcam.app
        </Link>
      </nav>

      <main className="px-6 py-12 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: April 7, 2026</p>

        <div className="mt-10 space-y-10 text-slate-600 leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using fieldcam.app (the &quot;Service&quot;), you agree to be bound
              by these Terms of Service (&quot;Terms&quot;). The Service is operated by{" "}
              <strong>Resolution Claims Consulting LLC</strong> (&quot;Company,&quot;
              &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), a company registered in the State
              of Florida. If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              2. Description of Service
            </h2>
            <p>
              fieldcam.app is a field documentation platform designed for public adjusters,
              insurance inspectors, contractors, and restoration teams. The Service allows you to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Capture and upload photos and videos with GPS coordinates and timestamps</li>
              <li>
                Organize documentation by project, including customer information and insurance
                claim data
              </li>
              <li>Add annotations, notes, tasks, and comments to photos and projects</li>
              <li>
                Generate professional PDF reports from your documentation for sharing and record
                keeping
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Eligibility</h2>
            <p>
              You must be at least <strong>18 years of age</strong> to create an account and use
              fieldcam.app. By using the Service, you represent and warrant that you are at least 18
              years old and have the legal capacity to enter into these Terms.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              4. User Accounts and Responsibilities
            </h2>
            <p>You are responsible for:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                Maintaining the confidentiality of your account credentials and keeping your
                password secure
              </li>
              <li>All activity that occurs under your account</li>
              <li>
                Ensuring the accuracy of documentation you create, including photos, notes,
                annotations, and project data
              </li>
              <li>
                Obtaining any necessary consents before uploading photos, videos, or personal
                information of third parties (such as customer PII)
              </li>
              <li>
                Using field data properly and in compliance with all applicable laws, regulations,
                and professional standards
              </li>
            </ul>
            <p className="mt-2">
              You agree to notify us immediately if you become aware of any unauthorized use of your
              account.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Data Ownership</h2>
            <p>
              <strong>You retain ownership of all content you upload or create</strong> on
              fieldcam.app, including photos, videos, annotations, notes, and generated reports. By
              using the Service, you grant us a limited, non-exclusive license to store, process,
              and display your content solely for the purpose of providing the Service to you.
            </p>
            <p className="mt-2">
              We do not claim ownership of your project data, customer information, or media files.
              You may export or delete your data at any time. Upon account deletion, we will remove
              your data in accordance with our{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Acceptable Use</h2>
            <p>You agree not to use fieldcam.app to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                Upload, store, or transmit any content that is unlawful, fraudulent, defamatory, or
                otherwise objectionable
              </li>
              <li>Fabricate, alter, or misrepresent field documentation</li>
              <li>
                Interfere with or disrupt the Service, servers, or networks connected to the Service
              </li>
              <li>
                Attempt to gain unauthorized access to other user accounts, systems, or data
              </li>
              <li>Use the Service for any purpose that violates applicable laws or regulations</li>
              <li>
                Reverse engineer, decompile, or disassemble any part of the Service
              </li>
              <li>
                Use automated tools, bots, or scrapers to access the Service without our prior
                written consent
              </li>
            </ul>
            <p className="mt-2">
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              7. Professional Disclaimer
            </h2>
            <p>
              fieldcam.app is a <strong>documentation tool</strong>. It is not a substitute for
              professional judgment, expertise, or advice. The Service does not provide engineering
              assessments, insurance adjusting opinions, construction recommendations, legal advice,
              or any other professional determinations.
            </p>
            <p className="mt-2">
              You are solely responsible for the professional conclusions, recommendations, and
              decisions you make based on documentation captured through the Service. We make no
              representations or warranties regarding the suitability of fieldcam.app for any
              specific professional, legal, or regulatory purpose.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              8. Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, RESOLUTION CLAIMS CONSULTING LLC AND ITS
              OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO
              LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE
              SERVICE.
            </p>
            <p className="mt-2">
              OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM OR RELATED TO THESE TERMS OR THE
              SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US, IF ANY, DURING THE TWELVE (12)
              MONTHS PRECEDING THE CLAIM.
            </p>
            <p className="mt-2">
              WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE
              ARE NOT LIABLE FOR ANY LOSS OR CORRUPTION OF DATA, INCLUDING PHOTOS, VIDEOS, OR
              REPORTS STORED ON THE PLATFORM.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              9. Disclaimer of Warranties
            </h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
              WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. WE DISCLAIM ALL
              WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Resolution Claims Consulting LLC and
              its officers, directors, employees, and agents from and against any claims, damages,
              losses, liabilities, and expenses (including reasonable attorneys&apos; fees) arising
              out of or related to your use of the Service, your violation of these Terms, or your
              violation of any rights of a third party.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the{" "}
              <strong>State of Florida</strong>, without regard to its conflict of law provisions.
              Any legal action or proceeding arising under these Terms shall be brought exclusively
              in the state or federal courts located in Florida, and you consent to the personal
              jurisdiction of such courts.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              12. Modifications to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of material
              changes by posting the updated Terms on this page and updating the &quot;Last
              updated&quot; date. Your continued use of the Service after changes are posted
              constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">13. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time, with or without
              cause, and with or without notice. Upon termination, your right to use the Service
              ceases immediately. Provisions of these Terms that by their nature should survive
              termination (including ownership, disclaimers, indemnification, and limitations of
              liability) will survive.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">14. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that
              provision will be limited or eliminated to the minimum extent necessary so that these
              Terms will otherwise remain in full force and effect.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">15. Contact Us</h2>
            <p>
              If you have questions about these Terms of Service, contact us at:
            </p>
            <p className="mt-2">
              Resolution Claims Consulting LLC
              <br />
              Email:{" "}
              <a href="mailto:legal@fieldcam.app" className="text-blue-600 hover:underline">
                legal@fieldcam.app
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="px-6 py-8 border-t border-slate-200 text-center text-sm text-slate-400">
        <Link href="/" className="hover:text-slate-600 underline">
          Back to fieldcam.app
        </Link>
      </footer>
    </div>
  );
}
