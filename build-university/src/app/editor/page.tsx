'use client'

import dynamic from 'next/dynamic'
import { useEditorStore } from '@/core/stores/editorStore'
import Toolbar from '@/components/editor/Toolbar'
import HierarchyTree from '@/components/editor/HierarchyTree'
import Inspector from '@/components/editor/Inspector'

const SceneCanvas = dynamic(() => import('@/viewer/canvas/SceneCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a14]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-white/20 text-sm">Loading 3D editor...</p>
      </div>
    </div>
  ),
})

export default function EditorPage() {
  const leftOpen = useEditorStore(s => s.leftPanelOpen)
  const rightOpen = useEditorStore(s => s.rightPanelOpen)
  const toggleLeft = useEditorStore(s => s.toggleLeftPanel)
  const toggleRight = useEditorStore(s => s.toggleRightPanel)

  return (
    <div className="fixed inset-0 bg-[#06060e] flex flex-col">
      {/* Toolbar */}
      <Toolbar />

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — Hierarchy */}
        {leftOpen && (
          <div className="w-56 bg-[#1c1c1e]/80 backdrop-blur-xl border-r border-white/[0.06] flex flex-col shrink-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
              <span className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">Scene</span>
              <button onClick={toggleLeft} className="text-white/20 hover:text-white text-xs">x</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <HierarchyTree />
            </div>
          </div>
        )}

        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <SceneCanvas />
          {!leftOpen && (
            <button onClick={toggleLeft} className="absolute top-2 left-2 z-10 bg-black/50 rounded px-2 py-1 text-white/30 text-xs hover:text-white">
              Scene
            </button>
          )}
          {!rightOpen && (
            <button onClick={toggleRight} className="absolute top-2 right-2 z-10 bg-black/50 rounded px-2 py-1 text-white/30 text-xs hover:text-white">
              Inspector
            </button>
          )}
        </div>

        {/* Right panel — Inspector */}
        {rightOpen && (
          <div className="w-64 bg-[#1c1c1e]/80 backdrop-blur-xl border-l border-white/[0.06] flex flex-col shrink-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
              <span className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">Inspector</span>
              <button onClick={toggleRight} className="text-white/20 hover:text-white text-xs">x</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Inspector />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
