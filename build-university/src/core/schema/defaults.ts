import { createId } from './types'
import type { Building, Level, Wall, Zone, Slab, SceneGraph } from './types'

/** Create a default single-story building with 4 walls */
export function createDefaultBuilding(): SceneGraph {
  const buildingId = createId()
  const levelId = createId()
  const zoneId = createId()

  // Simple rectangular house: 30ft x 24ft
  const w = 15, d = 12  // half-extents
  const corners = [
    { x: -w, z: -d },
    { x: w, z: -d },
    { x: w, z: d },
    { x: -w, z: d },
  ]

  const wallIds: string[] = []
  const walls: Wall[] = corners.map((start, i) => {
    const end = corners[(i + 1) % corners.length]
    const id = createId()
    wallIds.push(id)
    return {
      id, type: 'wall' as const, name: `Wall ${i + 1}`,
      parentId: levelId, visible: true, locked: false,
      start, end, thickness: 0.5, exterior: true,
      metadata: {},
    }
  })

  const building: Building = {
    id: buildingId, type: 'building', name: 'New Building',
    parentId: null, visible: true, locked: false, metadata: {},
  }

  const level: Level = {
    id: levelId, type: 'level', name: 'Ground Floor',
    parentId: buildingId, visible: true, locked: false,
    elevation: 0, height: 9, index: 0, metadata: {},
  }

  const zone: Zone = {
    id: zoneId, type: 'zone', name: 'Main Space',
    parentId: levelId, visible: true, locked: false,
    wallIds, usage: 'living', metadata: {},
  }

  const slab: Slab = {
    id: createId(), type: 'slab', name: 'Floor Slab',
    parentId: levelId, visible: true, locked: false,
    outline: corners, thickness: 0.5, offsetY: 0, material: 'concrete',
    metadata: {},
  }

  const nodes: SceneGraph['nodes'] = {
    [building.id]: building,
    [level.id]: level,
    [zone.id]: zone,
    [slab.id]: slab,
  }
  walls.forEach(w => { nodes[w.id] = w })

  return { nodes, rootId: buildingId, selectedIds: [], hoveredId: null }
}
