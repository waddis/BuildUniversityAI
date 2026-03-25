'use client'

import { useEffect } from 'react'
import type { CodeReference } from '@/types'

interface CodeDrawerProps {
  references: CodeReference[]
  open: boolean
  onClose: () => void
}

export default function CodeDrawer({ references, open, onClose }: CodeDrawerProps) {
  // Escape to close
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-gray-200 max-h-[45%] flex flex-col animate-[slideUp_0.25s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label="Code references"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-transparent">
        <h3 className="text-sm font-semibold text-blue-600">Code References</h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-300">Esc to close</span>
          <button
            onClick={onClose}
            aria-label="Close code references"
            className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 text-xs transition-colors"
          >
            X
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {references.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No code references for this step</p>
        ) : (
          references.map(ref => (
            <div key={ref.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-[fadeIn_0.2s_ease-out]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600 font-mono text-xs font-bold bg-blue-50 px-1.5 py-0.5 rounded">{ref.code_family}</span>
                <span className="text-gray-600 font-mono text-xs">{ref.code_section}</span>
              </div>
              <h4 className="font-semibold text-sm mb-1">{ref.title}</h4>
              <p className="text-gray-500 text-xs leading-relaxed">{ref.short_summary}</p>
              {ref.long_explanation && (
                <details className="mt-2">
                  <summary className="text-blue-600/60 text-xs cursor-pointer hover:text-blue-600">Full explanation</summary>
                  <p className="text-gray-500 text-xs leading-relaxed mt-2">{ref.long_explanation}</p>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
