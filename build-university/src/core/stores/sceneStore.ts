import { create } from 'zustand'
import type { SceneGraph, AnyNode } from '../schema/types'
import type { Command } from '../commands/types'
import { createDefaultBuilding } from '../schema/defaults'

const MAX_UNDO = 50

interface SceneState {
  graph: SceneGraph

  // Undo/redo
  undoStack: Command[]
  redoStack: Command[]
  canUndo: boolean
  canRedo: boolean

  // Actions
  execute: (command: Command) => void
  undo: () => void
  redo: () => void

  // Selection
  select: (ids: string[]) => void
  selectAdd: (id: string) => void
  deselect: (id: string) => void
  clearSelection: () => void
  hover: (id: string | null) => void

  // Direct graph access
  getNode: (id: string) => AnyNode | undefined
  getChildren: (parentId: string) => AnyNode[]
  reset: () => void
  loadGraph: (graph: SceneGraph) => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  graph: createDefaultBuilding(),
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  execute(command: Command) {
    const { graph, undoStack } = get()
    const newGraph = command.execute(graph)
    const newUndo = [...undoStack, command].slice(-MAX_UNDO)
    set({
      graph: newGraph,
      undoStack: newUndo,
      redoStack: [],
      canUndo: true,
      canRedo: false,
    })
  },

  undo() {
    const { graph, undoStack, redoStack } = get()
    if (undoStack.length === 0) return
    const command = undoStack[undoStack.length - 1]
    const newGraph = command.undo(graph)
    const newUndo = undoStack.slice(0, -1)
    set({
      graph: newGraph,
      undoStack: newUndo,
      redoStack: [...redoStack, command],
      canUndo: newUndo.length > 0,
      canRedo: true,
    })
  },

  redo() {
    const { graph, undoStack, redoStack } = get()
    if (redoStack.length === 0) return
    const command = redoStack[redoStack.length - 1]
    const newGraph = command.execute(graph)
    const newRedo = redoStack.slice(0, -1)
    set({
      graph: newGraph,
      undoStack: [...undoStack, command],
      redoStack: newRedo,
      canUndo: true,
      canRedo: newRedo.length > 0,
    })
  },

  select(ids: string[]) {
    set(state => ({ graph: { ...state.graph, selectedIds: ids } }))
  },

  selectAdd(id: string) {
    set(state => ({
      graph: {
        ...state.graph,
        selectedIds: state.graph.selectedIds.includes(id)
          ? state.graph.selectedIds
          : [...state.graph.selectedIds, id],
      },
    }))
  },

  deselect(id: string) {
    set(state => ({
      graph: { ...state.graph, selectedIds: state.graph.selectedIds.filter(i => i !== id) },
    }))
  },

  clearSelection() {
    set(state => ({ graph: { ...state.graph, selectedIds: [] } }))
  },

  hover(id: string | null) {
    set(state => ({ graph: { ...state.graph, hoveredId: id } }))
  },

  getNode(id: string) {
    return get().graph.nodes[id]
  },

  getChildren(parentId: string) {
    return Object.values(get().graph.nodes).filter(n => n.parentId === parentId)
  },

  reset() {
    set({ graph: createDefaultBuilding(), undoStack: [], redoStack: [], canUndo: false, canRedo: false })
  },

  loadGraph(graph: SceneGraph) {
    set({ graph, undoStack: [], redoStack: [], canUndo: false, canRedo: false })
  },
}))
