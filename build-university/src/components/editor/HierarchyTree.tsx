'use client'

import { useSceneStore } from '@/core/stores/sceneStore'
import type { AnyNode } from '@/core/schema/types'

const TYPE_ICONS: Record<string, string> = {
  building: 'B', level: 'L', zone: 'Z', wall: 'W', slab: 'S',
  opening: 'O', roof: 'R', assembly: 'A',
}

function TreeNode({ node, depth }: { node: AnyNode; depth: number }) {
  const graph = useSceneStore(s => s.graph)
  const select = useSceneStore(s => s.select)
  const children = Object.values(graph.nodes).filter(n => n.parentId === node.id)
  const selected = graph.selectedIds.includes(node.id)
  const hovered = graph.hoveredId === node.id

  return (
    <div>
      <button
        onClick={() => select([node.id])}
        className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
          selected
            ? 'bg-amber-500/15 text-amber-400'
            : hovered
              ? 'bg-white/5 text-white/80'
              : 'text-white/50 hover:bg-white/5 hover:text-white/70'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${
          selected ? 'bg-amber-500/30 text-amber-400' : 'bg-white/8 text-white/30'
        }`}>
          {TYPE_ICONS[node.type] ?? '?'}
        </span>
        <span className="truncate">{node.name}</span>
        {!node.visible && <span className="text-white/20 text-[9px] ml-auto">hidden</span>}
      </button>
      {children.map(child => (
        <TreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function HierarchyTree() {
  const graph = useSceneStore(s => s.graph)
  const root = graph.nodes[graph.rootId]
  if (!root) return null

  return (
    <div className="overflow-y-auto py-2">
      <TreeNode node={root} depth={0} />
    </div>
  )
}
