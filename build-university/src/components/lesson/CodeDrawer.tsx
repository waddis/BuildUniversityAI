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
      className="absolute bottom-0 left-0 right-0 z-20 max-h-[45%] flex flex-col animate-[slideUp_0.25s_ease-out]"
      style={{ background: 'rgba(42,42,42,0.70)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(86,67,52,0.15)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Code references"
    >
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(86,67,52,0.15)' }}>
        <h3 className="text-sm font-semibold text-[#FF8C00]">Code References</h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#e5e2e1] opacity-25">Esc to close</span>
          <button
            onClick={onClose}
            aria-label="Close code references"
            className="w-6 h-6 flex items-center justify-center rounded-md bg-[#353534] hover:bg-[#2a2a2a] text-[#e5e2e1] opacity-50 hover:opacity-80 text-xs transition-colors"
          >
            X
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {references.length === 0 ? (
          <p className="text-[#e5e2e1] opacity-30 text-sm text-center py-4">No code references for this step</p>
        ) : (
          references.map(ref => (
            <div key={ref.id} className="bg-[#1c1b1b] rounded-lg p-4 animate-[fadeIn_0.2s_ease-out]" style={{ border: '1px solid rgba(86,67,52,0.15)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#FF8C00] font-mono text-xs font-bold bg-[#FF8C00]/10 px-1.5 py-0.5 rounded">{ref.code_family}</span>
                <span className="text-[#e5e2e1] opacity-50 font-mono text-xs">{ref.code_section}</span>
              </div>
              <h4 className="font-semibold text-sm text-[#e5e2e1] mb-1">{ref.title}</h4>
              <p className="text-[#e5e2e1] opacity-40 text-xs leading-relaxed">{ref.short_summary}</p>
              {ref.long_explanation && (
                <details className="mt-2">
                  <summary className="text-[#FF8C00]/60 text-xs cursor-pointer hover:text-[#FF8C00]">Full explanation</summary>
                  <p className="text-[#e5e2e1] opacity-35 text-xs leading-relaxed mt-2">{ref.long_explanation}</p>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
