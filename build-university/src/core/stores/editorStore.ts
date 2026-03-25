import { create } from 'zustand'

export type EditorTool = 'select' | 'wall' | 'zone' | 'measure' | 'pan'

interface EditorState {
  // Tool
  activeTool: EditorTool
  isDrawing: boolean

  // Panels
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  bottomPanelOpen: boolean

  // Snap
  snapEnabled: boolean
  snapDistance: number  // feet

  // Training mode
  trainingMode: boolean  // when true, locks editing, enables lesson playback

  // Actions
  setTool: (tool: EditorTool) => void
  setDrawing: (drawing: boolean) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  toggleBottomPanel: () => void
  toggleSnap: () => void
  setTrainingMode: (enabled: boolean) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select',
  isDrawing: false,
  leftPanelOpen: true,
  rightPanelOpen: true,
  bottomPanelOpen: false,
  snapEnabled: true,
  snapDistance: 0.5,
  trainingMode: false,

  setTool: (tool) => set({ activeTool: tool, isDrawing: false }),
  setDrawing: (drawing) => set({ isDrawing: drawing }),
  toggleLeftPanel: () => set(s => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleBottomPanel: () => set(s => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  toggleSnap: () => set(s => ({ snapEnabled: !s.snapEnabled })),
  setTrainingMode: (enabled) => set({ trainingMode: enabled, activeTool: enabled ? 'select' : 'select' }),
}))
