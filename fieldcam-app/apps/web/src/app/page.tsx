import Link from "next/link";
import { Camera, FolderOpen, FileText } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-slate-900">fieldcam.app</span>
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-slate-900 tracking-tight leading-tight">
          Field documentation
          <br />
          <span className="text-blue-600">from phone to office</span>
        </h1>
        <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto">
          Capture photos, organize by project, and generate professional reports.
          Built for adjusters, inspectors, contractors, and restoration teams.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Get started
          </Link>
          <a
            href="#features"
            className="px-6 py-3 text-base font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
          >
            Learn more
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Capture</h3>
            <p className="mt-2 text-sm text-slate-500">
              Fast photo and video capture from the field with GPS, timestamps,
              and metadata preserved automatically.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Organize</h3>
            <p className="mt-2 text-sm text-slate-500">
              Everything organized by project. Notes, tasks, comments, and a
              chronological timeline of all activity.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Report</h3>
            <p className="mt-2 text-sm text-slate-500">
              Generate professional PDF reports from selected photos, annotations,
              and notes. Share via secure links.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-slate-200 text-center text-sm text-slate-400">
        <p>&copy; 2026 Resolution Claims Consulting LLC. All rights reserved.</p>
        <div className="mt-2 space-x-4">
          <Link href="/privacy" className="hover:text-slate-600 underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-600 underline">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
