import type { SceneGraph, AnyNode } from '../schema/types'

/** A command that can be executed, undone, and redone */
export interface Command {
  type: string
  label: string  // human-readable for undo UI
  execute(graph: SceneGraph): SceneGraph
  undo(graph: SceneGraph): SceneGraph
}

/** Add a node to the scene */
export class AddNodeCommand implements Command {
  type = 'add_node'
  label: string
  private node: AnyNode

  constructor(node: AnyNode) {
    this.node = node
    this.label = `Add ${node.type}: ${node.name}`
  }

  execute(graph: SceneGraph): SceneGraph {
    return {
      ...graph,
      nodes: { ...graph.nodes, [this.node.id]: this.node },
    }
  }

  undo(graph: SceneGraph): SceneGraph {
    const { [this.node.id]: _, ...rest } = graph.nodes
    return { ...graph, nodes: rest, selectedIds: graph.selectedIds.filter(id => id !== this.node.id) }
  }
}

/** Remove a node (and all descendants) */
export class RemoveNodeCommand implements Command {
  type = 'remove_node'
  label: string
  private nodeId: string
  private removed: Record<string, AnyNode> = {}

  constructor(nodeId: string, nodeName: string) {
    this.nodeId = nodeId
    this.label = `Delete ${nodeName}`
  }

  execute(graph: SceneGraph): SceneGraph {
    // Collect node + all descendants
    this.removed = {}
    const collect = (id: string) => {
      const node = graph.nodes[id]
      if (!node) return
      this.removed[id] = node
      Object.values(graph.nodes)
        .filter(n => n.parentId === id)
        .forEach(n => collect(n.id))
    }
    collect(this.nodeId)

    const nodes = { ...graph.nodes }
    Object.keys(this.removed).forEach(id => delete nodes[id])
    return { ...graph, nodes, selectedIds: graph.selectedIds.filter(id => !this.removed[id]) }
  }

  undo(graph: SceneGraph): SceneGraph {
    return { ...graph, nodes: { ...graph.nodes, ...this.removed } }
  }
}

/** Update properties of a node */
export class UpdateNodeCommand implements Command {
  type = 'update_node'
  label: string
  private nodeId: string
  private changes: Partial<AnyNode>
  private previous: Partial<AnyNode> = {}

  constructor(nodeId: string, changes: Partial<AnyNode>, label?: string) {
    this.nodeId = nodeId
    this.changes = changes
    this.label = label ?? `Update ${nodeId}`
  }

  execute(graph: SceneGraph): SceneGraph {
    const node = graph.nodes[this.nodeId]
    if (!node) return graph

    // Store previous values for undo
    this.previous = {}
    for (const key of Object.keys(this.changes)) {
      (this.previous as Record<string, unknown>)[key] = (node as unknown as Record<string, unknown>)[key]
    }

    return {
      ...graph,
      nodes: {
        ...graph.nodes,
        [this.nodeId]: { ...node, ...this.changes } as AnyNode,
      },
    }
  }

  undo(graph: SceneGraph): SceneGraph {
    const node = graph.nodes[this.nodeId]
    if (!node) return graph
    return {
      ...graph,
      nodes: {
        ...graph.nodes,
        [this.nodeId]: { ...node, ...this.previous } as AnyNode,
      },
    }
  }
}

/** Move a wall endpoint */
export class MoveWallEndpointCommand implements Command {
  type = 'move_wall_endpoint'
  label: string
  private wallId: string
  private endpoint: 'start' | 'end'
  private newPos: { x: number; z: number }
  private oldPos: { x: number; z: number } = { x: 0, z: 0 }

  constructor(wallId: string, endpoint: 'start' | 'end', newPos: { x: number; z: number }) {
    this.wallId = wallId
    this.endpoint = endpoint
    this.newPos = newPos
    this.label = `Move wall ${endpoint}`
  }

  execute(graph: SceneGraph): SceneGraph {
    const wall = graph.nodes[this.wallId]
    if (!wall || wall.type !== 'wall') return graph
    this.oldPos = { ...wall[this.endpoint] }
    return {
      ...graph,
      nodes: {
        ...graph.nodes,
        [this.wallId]: { ...wall, [this.endpoint]: this.newPos },
      },
    }
  }

  undo(graph: SceneGraph): SceneGraph {
    const wall = graph.nodes[this.wallId]
    if (!wall || wall.type !== 'wall') return graph
    return {
      ...graph,
      nodes: {
        ...graph.nodes,
        [this.wallId]: { ...wall, [this.endpoint]: this.oldPos },
      },
    }
  }
}
