'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getBuildSequence } from '@/lib/content/build-sequences'

const DamageDetailViewer = dynamic(() => import('@/components/3d/DamageDetailViewer'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-[#131313] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/40 text-sm">Loading walkthrough...</p>
      </div>
    </div>
  ),
})

export default function BuildSequencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const sequence = getBuildSequence(id)

  if (!sequence) {
    return (
      <div className="fixed inset-0 bg-[#131313] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Walkthrough Not Found</h1>
          <p className="text-white/40 text-sm mb-4">No build sequence found for &ldquo;{id}&rdquo;</p>
          <button
            onClick={() => router.push('/build')}
            className="px-4 py-2 bg-[#FF8C00] text-[#131313] text-sm font-semibold rounded-lg hover:opacity-90"
          >
            View All Walkthroughs
          </button>
        </div>
      </div>
    )
  }

  return <DamageDetailViewer scenario={sequence} onClose={() => router.push('/build')} />
}
