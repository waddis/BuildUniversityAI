'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function LessonError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams()
  const moduleSlug = params?.moduleSlug as string | undefined

  useEffect(() => {
    console.error('Lesson viewer error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface,#f9f9fb)]">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          The 3D viewer encountered an error
        </h2>
        <p className="text-gray-500 mb-6">
          The lesson could not be displayed. This may be caused by a graphics
          compatibility issue with your browser.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-[#004e9f] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#003d7a] transition-colors"
          >
            Try Again
          </button>
          {moduleSlug && (
            <Link
              href={`/train/${moduleSlug}`}
              className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Module
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
