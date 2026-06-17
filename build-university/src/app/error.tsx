'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#131313] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[#FF8C00]/10 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-[#FF8C00] text-3xl">error_outline</span>
        </div>
        <h1 className="text-xl font-bold text-[#e5e2e1] font-headline mb-2">Something went wrong</h1>
        <p className="text-[#e5e2e1]/40 text-sm mb-6">{error.message || 'An unexpected error occurred.'}</p>
        <button onClick={reset} className="px-6 py-2.5 bg-[#FF8C00] text-[#131313] font-bold text-sm rounded-lg hover:opacity-90 transition-all font-headline">
          Try Again
        </button>
      </div>
    </div>
  )
}
