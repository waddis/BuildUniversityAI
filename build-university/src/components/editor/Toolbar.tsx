'use client'

import { useSceneStore } from '@/core/stores/sceneStore'
import { useViewerStore } from '@/core/stores/viewerStore'
import { useEditorStore, type EditorTool } from '@/core/stores/editorStore'
import { AddNodeCommand, RemoveNodeCommand } from '@/core/commands/types'
import { createId } from '@/core/schema/types'
import type { Level, Wall } from '@/core/schema/types'

const TOOLS: { id: EditorTool; label: string; key: string }[] = [
  { id: 'select', label: 'Select', key: 'V' },
  { id: 'wall', label: 'Wall', key: 'W' },
  { id: 'pan', label: 'Pan', key: 'H' },
  { id: 'measure', label: 'Measure', key: 'M' },
]

export default function Toolbar() {
  const { activeTool, setTool } = useEditorStore()
  const { undo, redo, canUndo, canRedo, execute, graph, getChildren } = useSceneStore()
  const { displayMode, setDisplayMode, setExplodeOffset, explodeOffset, toggleGrid, toggleWireframe, toggleXray, wireframe, xray } = useViewerStore()

  function addLevel() {
    const levels = Object.values(graph.nodes).filter(n => n.type === 'level') as Level[]
    const maxIndex = levels.length > 0 ? Math.max(...levels.map(l => l.index)) : -1
    const topLevel = levels.find(l => l.index === maxIndex)
    const newElevation = topLevel ? topLevel.elevation + topLevel.height : 0
    const newLevel: Level = {
      id: createId(), type: 'level', name: `Level ${maxIndex + 2}`,
      parentId: graph.rootId, visible: true, locked: false,
      elevation: newElevation, height: 9, index: maxIndex + 1, metadata: {},
    }
    execute(new AddNodeCommand(newLevel))
  }

  function addWall() {
    const levels = Object.values(graph.nodes).filter(n => n.type === 'level') as Level[]
    if (levels.length === 0) return
    const level = levels[0]
    const wall: Wall = {
      id: createId(), type: 'wall', name: 'New Wall',
      parentId: level.id, visible: true, locked: false,
      start: { x: -5, z: 0 }, end: { x: 5, z: 0 },
      thickness: 0.5, exterior: true, metadata: {},
    }
    execute(new AddNodeCommand(wall))
  }

  function deleteSelected() {
    const id = graph.selectedIds[0]
    if (!id) return
    const node = graph.nodes[id]
    if (!node || node.type === 'building') return
    execute(new RemoveNodeCommand(id, node.name))
  }

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-white/[0.02] border-b border-white/[0.06]">
      {/* Tools */}
      <div className="flex gap-0.5 mr-3">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.key})`}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              activeTool === t.id ? 'bg-amber-500/15 text-amber-400' : 'text-white/40 hover:bg-white/5 hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-white/15 mx-2" />

      {/* Add */}
      <button onClick={addLevel} className="px-2.5 py-1 text-xs text-white/40 hover:text-white/80 hover:bg-white/5 rounded transition-colors">+ Level</button>
      <button onClick={addWall} className="px-2.5 py-1 text-xs text-white/40 hover:text-white/80 hover:bg-white/5 rounded transition-colors">+ Wall</button>
      <button onClick={deleteSelected} disabled={!graph.selectedIds.length} className={`px-2.5 py-1 text-xs rounded transition-colors ${graph.selectedIds.length ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10' : 'text-white/10'}`}>Delete</button>

      <div className="w-px h-5 bg-white/15 mx-2" />

      {/* Undo/Redo */}
      <button onClick={undo} disabled={!canUndo} className={`px-2.5 py-1 text-xs rounded transition-colors ${canUndo ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-white/10'}`}>Undo</button>
      <button onClick={redo} disabled={!canRedo} className={`px-2.5 py-1 text-xs rounded transition-colors ${canRedo ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-white/10'}`}>Redo</button>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Display mode */}
      <div className="flex gap-0.5 bg-white/[0.03] rounded-lg p-0.5">
        {(['stacked', 'exploded', 'solo'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setDisplayMode(mode)}
            className={`px-2.5 py-1 text-xs rounded-md capitalize transition-all ${displayMode === mode ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white/60'}`}
          >
            {mode}
          </button>
        ))}
      </div>

      {displayMode === 'exploded' && (
        <input
          type="range" min={0} max={3} step={0.1}
          value={explodeOffset}
          onChange={e => setExplodeOffset(parseFloat(e.target.value))}
          className="w-20 accent-amber-500 ml-1"
        />
      )}

      <div className="flex-1" />

      {/* View toggles */}
      <button onClick={toggleGrid} className="px-2 py-1 text-xs text-white/30 hover:text-white/60 rounded">Grid</button>
      <button onClick={toggleWireframe} className={`px-2 py-1 text-xs rounded ${wireframe ? 'text-amber-400' : 'text-white/30 hover:text-white/60'}`}>Wire</button>
      <button onClick={toggleXray} className={`px-2 py-1 text-xs rounded ${xray ? 'text-amber-400' : 'text-white/30 hover:text-white/60'}`}>X-Ray</button>
    </div>
  )
}
