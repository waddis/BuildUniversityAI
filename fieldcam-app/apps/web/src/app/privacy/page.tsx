import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — fieldcam.app",
  description:
    "Privacy Policy for fieldcam.app, a field documentation platform operated by Resolution Claims Consulting LLC.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-bold text-slate-900 hover:text-blue-600 transition">
          fieldcam.app
        </Link>
      </nav>

      <main className="px-6 py-12 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: April 7, 2026</p>

        <div className="mt-10 space-y-10 text-slate-600 leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Who We Are</h2>
            <p>
              fieldcam.app is a field documentation platform operated by{" "}
              <strong>Resolution Claims Consulting LLC</strong>, a company registered in the State
              of Florida, United States. Throughout this policy, "we," "us," and "our" refer to
              Resolution Claims Consulting LLC.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              2. Information We Collect
            </h2>

            <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">
              2.1 Account Information
            </h3>
            <p>
              When you create an account we collect your full name, email address, phone number, and
              company name. Your password is cryptographically hashed by our backend before storage;
              we never store plaintext passwords.
            </p>

            <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">
              2.2 Project and Customer Data
            </h3>
            <p>
              You may enter information about your customers and projects, including customer name,
              phone number, email address, and physical address. For insurance-related projects you
              may also provide claim numbers, insurance carrier names, and damage categories. This
              data is stored on our backend servers and is associated with your account.
            </p>

            <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">
              2.3 Photos, Videos, and Media
            </h3>
            <p>
              fieldcam.app is built around field documentation. When you upload photos or videos, we
              capture and preserve the following metadata:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>GPS coordinates (latitude and longitude)</strong> — recorded at the time of
                capture to geolocate each photo or video
              </li>
              <li>
                <strong>Timestamps</strong> — date and time of capture
              </li>
              <li>
                <strong>Device and camera metadata</strong> — as embedded in the original file (EXIF
                data)
              </li>
              <li>
                <strong>File type, size, and resolution</strong>
              </li>
            </ul>
            <p className="mt-2">
              All media files are uploaded to and stored in <strong>Amazon Web Services S3</strong>{" "}
              (AWS S3). Media is retained for as long as the associated project exists in your
              account, or until you delete it.
            </p>

            <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">
              2.4 Location Data
            </h3>
            <p>
              GPS coordinates are a core feature of fieldcam.app. We collect precise geolocation
              data (latitude and longitude) in two contexts:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Per photo/video</strong> — coordinates are embedded in each media file you
                capture or upload
              </li>
              <li>
                <strong>Per project</strong> — a project may include an address that is geocoded to
                coordinates
              </li>
            </ul>
            <p className="mt-2">
              Location data is used to verify the site of documentation, organize projects
              geographically, and include location references in generated reports. Under the
              California Consumer Privacy Act (CCPA), precise geolocation is classified as{" "}
              <strong>sensitive personal information</strong>. See Section 8 below for your rights
              regarding this data.
            </p>

            <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">
              2.5 Annotations and Notes
            </h3>
            <p>
              You may add text annotations, markups, notes, tasks, and comments to photos and
              projects. This content is stored alongside the associated media and project data.
            </p>

            <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">2.6 Activity Logs</h3>
            <p>
              We maintain logs of account activity, including login events, project creation and
              modification, photo uploads, report generation, and other actions within the platform.
              These logs are used for security, debugging, and to provide you with a chronological
              timeline of project activity.
            </p>

            <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">
              2.7 Authentication Tokens
            </h3>
            <p>
              When you log in, a JSON Web Token (JWT) is stored in your browser&apos;s
              localStorage. This token authenticates your session and is sent with each request to
              our backend API.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide and maintain the fieldcam.app service</li>
              <li>To authenticate your identity and secure your account</li>
              <li>To store and organize your field documentation by project</li>
              <li>To generate PDF reports from your photos, annotations, and notes</li>
              <li>To preserve GPS coordinates and timestamps for documentation integrity</li>
              <li>To communicate with you about your account or service updates</li>
              <li>To detect and prevent fraud, abuse, or security incidents</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              4. Third-Party Services
            </h2>
            <p>We use the following third-party services to operate fieldcam.app:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Amazon Web Services (AWS) S3</strong> — used to store uploaded photos,
                videos, and generated PDF reports. Media is stored in AWS data centers located in
                the United States. AWS maintains its own security and compliance certifications.
              </li>
              <li>
                <strong>Backend API Server</strong> — our backend processes structured data
                (accounts, projects, annotations, activity logs) and handles authentication.
              </li>
            </ul>
            <p className="mt-2">
              We do not sell your personal information to any third party. We do not share your data
              with third parties for their marketing purposes.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. Project data,
              including photos, videos, annotations, and reports, is retained for as long as the
              project exists in your account. When you delete a project or your account, associated
              data is queued for permanent deletion from our servers and AWS S3 storage. Activity
              logs may be retained for up to 12 months after account deletion for security and
              compliance purposes.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Passwords are cryptographically hashed before storage</li>
              <li>JWT-based authentication for API requests</li>
              <li>HTTPS encryption for all data in transit</li>
              <li>AWS S3 server-side encryption for stored media</li>
              <li>Access controls limiting data access to authorized users</li>
            </ul>
            <p className="mt-2">
              While we take reasonable precautions, no method of electronic storage or transmission
              is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              7. GDPR Rights (European Economic Area)
            </h2>
            <p>
              If you are located in the European Economic Area (EEA), you have the following rights
              under the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Right of access</strong> — request a copy of the personal data we hold
                about you
              </li>
              <li>
                <strong>Right to rectification</strong> — request correction of inaccurate data
              </li>
              <li>
                <strong>Right to erasure</strong> — request deletion of your personal data
              </li>
              <li>
                <strong>Right to restrict processing</strong> — request that we limit how we use
                your data
              </li>
              <li>
                <strong>Right to data portability</strong> — receive your data in a structured,
                machine-readable format
              </li>
              <li>
                <strong>Right to object</strong> — object to processing of your personal data
              </li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@fieldcam.app" className="text-blue-600 hover:underline">
                privacy@fieldcam.app
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          {/* 8 */}
          <section id="ccpa">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              8. California Privacy Rights (CCPA/CPRA)
            </h2>
            <p>
              If you are a California resident, you have additional rights under the California
              Consumer Privacy Act (CCPA) as amended by the California Privacy Rights Act (CPRA):
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Right to know</strong> — what personal information we collect, use, disclose,
                and sell
              </li>
              <li>
                <strong>Right to delete</strong> — request deletion of your personal information
              </li>
              <li>
                <strong>Right to opt out of sale</strong> — we do not sell your personal information
              </li>
              <li>
                <strong>Right to non-discrimination</strong> — we will not discriminate against you
                for exercising your rights
              </li>
              <li>
                <strong>Right to limit use of sensitive personal information</strong> — you may
                direct us to limit the use of sensitive personal information to what is necessary to
                provide the service
              </li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">
              Sensitive Personal Information Notice
            </h3>
            <p>
              Under the CCPA/CPRA, <strong>precise geolocation data</strong> is classified as
              sensitive personal information. fieldcam.app collects precise GPS coordinates
              (latitude and longitude) as a core feature of the service. Collection of precise
              geolocation requires your opt-in consent. You may withdraw consent at any time by
              adjusting your device location permissions or contacting us. If you withdraw consent,
              location data will no longer be captured with new uploads, but previously collected
              location data will remain associated with existing media unless you request its
              deletion.
            </p>
            <p className="mt-2">
              To exercise any CCPA rights, contact us at{" "}
              <a href="mailto:privacy@fieldcam.app" className="text-blue-600 hover:underline">
                privacy@fieldcam.app
              </a>
              . We will verify your identity and respond within 45 days.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              9. Children&apos;s Privacy
            </h2>
            <p>
              fieldcam.app is not directed at children. You must be at least 18 years of age to
              create an account and use our service. We do not knowingly collect personal
              information from anyone under 18. If we become aware that we have collected data from
              a person under 18, we will delete that information promptly.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the updated policy on this page and updating the "Last updated"
              date. Your continued use of fieldcam.app after changes are posted constitutes
              acceptance of the updated policy.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your data rights,
              contact us at:
            </p>
            <p className="mt-2">
              Resolution Claims Consulting LLC
              <br />
              Email:{" "}
              <a href="mailto:privacy@fieldcam.app" className="text-blue-600 hover:underline">
                privacy@fieldcam.app
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
