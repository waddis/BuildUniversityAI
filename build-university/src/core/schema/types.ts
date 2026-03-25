// ════════════════════════════════════════════════════════════════════════════════
// BIM DATA MODEL — Parametric building objects
// Building > Level > Zone > Wall > Slab > Opening
// These are the SOURCE OF TRUTH. Geometry is derived.
// ════════════════════════════════════════════════════════════════════════════════

export type NodeType = 'building' | 'level' | 'zone' | 'wall' | 'slab' | 'opening' | 'roof' | 'assembly'

/** 2D point (XZ plane — Y is up) */
export interface Vec2 { x: number; z: number }

/** 3D point */
export interface Vec3 { x: number; y: number; z: number }

/** Base for all scene nodes */
export interface SceneNode {
  id: string
  type: NodeType
  name: string
  parentId: string | null
  visible: boolean
  locked: boolean
  metadata: Record<string, unknown>
}

/** Root container */
export interface Building extends SceneNode {
  type: 'building'
  address?: string
  style?: string
}

/** A floor/story */
export interface Level extends SceneNode {
  type: 'level'
  elevation: number      // Y position of this level's floor (feet)
  height: number         // floor-to-floor height (feet)
  index: number          // 0 = ground, 1 = second floor, -1 = basement
}

/** A closed region on a level (room, space) */
export interface Zone extends SceneNode {
  type: 'zone'
  wallIds: string[]      // ordered wall IDs forming closed loop
  usage?: string         // 'living', 'bedroom', 'garage', 'porch', etc.
  color?: string         // display color hint
}

/** A wall segment between two points */
export interface Wall extends SceneNode {
  type: 'wall'
  start: Vec2            // start point (XZ)
  end: Vec2              // end point (XZ)
  thickness: number      // wall thickness (feet)
  heightOverride?: number // if different from level height
  exterior: boolean      // exterior vs interior wall
  material?: string      // 'frame', 'masonry', 'concrete', etc.
}

/** A horizontal surface (floor or ceiling) */
export interface Slab extends SceneNode {
  type: 'slab'
  outline: Vec2[]        // closed polygon in XZ
  thickness: number      // slab depth (feet)
  offsetY: number        // offset from level elevation (0 = floor, height = ceiling)
  material?: string      // 'concrete', 'wood_frame', etc.
}

/** A hole in a wall (window, door) */
export interface Opening extends SceneNode {
  type: 'opening'
  wallId: string         // which wall this opening is in
  position: number       // 0-1 along wall length
  width: number          // opening width (feet)
  height: number         // opening height (feet)
  sillHeight: number     // bottom of opening above floor (feet)
  openingType: 'window' | 'door' | 'garage_door' | 'pass_through'
}

/** Roof plane (parametric) */
export interface Roof extends SceneNode {
  type: 'roof'
  pitch: number          // rise/run (e.g., 8/12 = 0.667)
  ridgeLine: [Vec2, Vec2]  // ridge start/end in XZ
  eaveLines: Vec2[][]    // eave polylines
  overhang: number       // eave overhang (feet)
  material?: string      // 'asphalt_shingle', 'metal', 'tile', etc.
}

/** A construction assembly layer (for training) */
export interface Assembly extends SceneNode {
  type: 'assembly'
  system: string         // 'roof', 'wall', 'foundation', etc.
  phase: string          // construction phase
  installOrder: number
  meshKey: string        // for 3D identification
  visibilityGroup: string
}

/** Union type of all scene nodes */
export type AnyNode = Building | Level | Zone | Wall | Slab | Opening | Roof | Assembly

/** The full scene graph */
export interface SceneGraph {
  nodes: Record<string, AnyNode>
  rootId: string         // building node id
  selectedIds: string[]
  hoveredId: string | null
}

// ── Utility functions ──

export function createId(): string {
  return crypto.randomUUID()
}

export function getChildren(graph: SceneGraph, parentId: string): AnyNode[] {
  return Object.values(graph.nodes).filter(n => n.parentId === parentId)
}

export function getDescendants(graph: SceneGraph, nodeId: string): AnyNode[] {
  const result: AnyNode[] = []
  const stack = getChildren(graph, nodeId)
  while (stack.length > 0) {
    const node = stack.pop()!
    result.push(node)
    stack.push(...getChildren(graph, node.id))
  }
  return result
}

export function getAncestors(graph: SceneGraph, nodeId: string): AnyNode[] {
  const result: AnyNode[] = []
  let current = graph.nodes[nodeId]
  while (current?.parentId) {
    current = graph.nodes[current.parentId]
    if (current) result.push(current)
  }
  return result
}

export function getLevelForNode(graph: SceneGraph, nodeId: string): Level | null {
  const ancestors = getAncestors(graph, nodeId)
  return (ancestors.find(n => n.type === 'level') as Level) ?? null
}
