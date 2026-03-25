import { create } from 'zustand'

export type DisplayMode = 'stacked' | 'exploded' | 'solo'
export type ViewMode = '3d' | 'plan' | 'section'

interface ViewerState {
  // Camera
  cameraPosition: [number, number, number]
  cameraTarget: [number, number, number]

  // Display
  displayMode: DisplayMode
  explodeOffset: number
  soloLevelId: string | null
  viewMode: ViewMode
  gridVisible: boolean
  wireframe: boolean
  xray: boolean

  // Visibility groups (for training layer system)
  hiddenGroups: string[]

  // Actions
  setCameraPosition: (pos: [number, number, number]) => void
  setCameraTarget: (target: [number, number, number]) => void
  setDisplayMode: (mode: DisplayMode) => void
  setExplodeOffset: (offset: number) => void
  setSoloLevel: (levelId: string | null) => void
  setViewMode: (mode: ViewMode) => void
  toggleGrid: () => void
  toggleWireframe: () => void
  toggleXray: () => void
  toggleGroup: (group: string) => void
  showAllGroups: () => void
}

export const useViewerStore = create<ViewerState>((set) => ({
  cameraPosition: [30, 20, 30],
  cameraTarget: [0, 0, 0],
  displayMode: 'stacked',
  explodeOffset: 0,
  soloLevelId: null,
  viewMode: '3d',
  gridVisible: true,
  wireframe: false,
  xray: false,
  hiddenGroups: [],

  setCameraPosition: (pos) => set({ cameraPosition: pos }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  setExplodeOffset: (offset) => set({ explodeOffset: offset }),
  setSoloLevel: (id) => set({ soloLevelId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleGrid: () => set(s => ({ gridVisible: !s.gridVisible })),
  toggleWireframe: () => set(s => ({ wireframe: !s.wireframe })),
  toggleXray: () => set(s => ({ xray: !s.xray })),
  toggleGroup: (group) => set(s => ({
    hiddenGroups: s.hiddenGroups.includes(group)
      ? s.hiddenGroups.filter(g => g !== group)
      : [...s.hiddenGroups, group],
  })),
  showAllGroups: () => set({ hiddenGroups: [] }),
}))
