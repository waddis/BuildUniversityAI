'use client'

import Link from 'next/link'

export default function LessonError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#131313] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[#FF8C00]/10 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-[#FF8C00] text-3xl">view_in_ar</span>
        </div>
        <h1 className="text-xl font-bold text-[#e5e2e1] font-headline mb-2">3D Viewer Error</h1>
        <p className="text-[#e5e2e1]/40 text-sm mb-6">The 3D viewer encountered an error. This may be a browser compatibility issue.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-6 py-2.5 bg-[#FF8C00] text-[#131313] font-bold text-sm rounded-lg hover:opacity-90 transition-all font-headline">
            Try Again
          </button>
          <Link href="/train" className="px-6 py-2.5 bg-[#2a2a2a] text-[#e5e2e1]/70 font-medium text-sm rounded-lg hover:bg-[#353534] transition-all">
            Back to Training
          </Link>
        </div>
      </div>
    </div>
  )
}
