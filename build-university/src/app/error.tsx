'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface,#f9f9fb)]">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-500 mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-[#004e9f] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#003d7a] transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
