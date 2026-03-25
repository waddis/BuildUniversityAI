'use client'

import { useSceneStore } from '@/core/stores/sceneStore'
import { UpdateNodeCommand } from '@/core/commands/types'
import type { AnyNode, Wall, Level, Slab } from '@/core/schema/types'

function Field({ label, value, onChange }: { label: string; value: string | number; onChange?: (val: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-white/30 text-[10px] uppercase tracking-wider w-20 shrink-0">{label}</label>
      {onChange ? (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-xs text-white focus:outline-none focus:border-amber-500/50 focus:bg-amber-500/[0.03] transition-all"
        />
      ) : (
        <span className="text-white/50 text-xs">{value}</span>
      )}
    </div>
  )
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 space-y-2">
      <div className="text-white/20 text-[9px] uppercase tracking-wider font-medium">{title}</div>
      {children}
    </div>
  )
}

function WallInspector({ wall }: { wall: Wall }) {
  const execute = useSceneStore(s => s.execute)

  const update = (changes: Partial<Wall>) => {
    execute(new UpdateNodeCommand(wall.id, changes as Partial<AnyNode>, `Edit ${wall.name}`))
  }

  return (
    <div className="space-y-3">
      <FieldGroup title="Properties">
        <Field label="Name" value={wall.name} onChange={v => update({ name: v })} />
        <Field label="Thickness" value={wall.thickness} onChange={v => update({ thickness: parseFloat(v) || 0.5 })} />
        <Field label="Exterior" value={wall.exterior ? 'Yes' : 'No'} />
        <Field label="Length" value={`${Math.sqrt((wall.end.x - wall.start.x) ** 2 + (wall.end.z - wall.start.z) ** 2).toFixed(1)} ft`} />
      </FieldGroup>
      <FieldGroup title="Start Point">
        <div className="grid grid-cols-2 gap-2">
          <Field label="X" value={wall.start.x.toFixed(1)} onChange={v => update({ start: { x: parseFloat(v) || 0, z: wall.start.z } })} />
          <Field label="Z" value={wall.start.z.toFixed(1)} onChange={v => update({ start: { x: wall.start.x, z: parseFloat(v) || 0 } })} />
        </div>
      </FieldGroup>
      <FieldGroup title="End Point">
        <div className="grid grid-cols-2 gap-2">
          <Field label="X" value={wall.end.x.toFixed(1)} onChange={v => update({ end: { x: parseFloat(v) || 0, z: wall.end.z } })} />
          <Field label="Z" value={wall.end.z.toFixed(1)} onChange={v => update({ end: { x: wall.end.x, z: parseFloat(v) || 0 } })} />
        </div>
      </FieldGroup>
    </div>
  )
}

function LevelInspector({ level }: { level: Level }) {
  const execute = useSceneStore(s => s.execute)
  const update = (changes: Partial<Level>) => {
    execute(new UpdateNodeCommand(level.id, changes as Partial<AnyNode>, `Edit ${level.name}`))
  }

  return (
    <div className="space-y-2">
      <Field label="Name" value={level.name} onChange={v => update({ name: v })} />
      <Field label="Elevation" value={level.elevation} onChange={v => update({ elevation: parseFloat(v) || 0 })} />
      <Field label="Height" value={level.height} onChange={v => update({ height: parseFloat(v) || 9 })} />
      <Field label="Index" value={level.index} />
    </div>
  )
}

function GenericInspector({ node }: { node: AnyNode }) {
  const execute = useSceneStore(s => s.execute)
  return (
    <div className="space-y-2">
      <Field label="Name" value={node.name} onChange={v => execute(new UpdateNodeCommand(node.id, { name: v } as Partial<AnyNode>, `Rename ${node.name}`))} />
      <Field label="Type" value={node.type} />
      <Field label="Visible" value={node.visible ? 'Yes' : 'No'} />
    </div>
  )
}

export default function Inspector() {
  const graph = useSceneStore(s => s.graph)
  const selectedId = graph.selectedIds[0]
  const node = selectedId ? graph.nodes[selectedId] : null

  if (!node) {
    return (
      <div className="p-4 text-white/20 text-xs text-center">
        Select an object to inspect
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-amber-500 text-xs font-semibold uppercase">{node.type}</span>
        <span className="text-white/30 text-[9px] font-mono">{node.id.slice(0, 8)}</span>
      </div>

      {node.type === 'wall' && <WallInspector wall={node} />}
      {node.type === 'level' && <LevelInspector level={node} />}
      {!['wall', 'level'].includes(node.type) && <GenericInspector node={node} />}
    </div>
  )
}
