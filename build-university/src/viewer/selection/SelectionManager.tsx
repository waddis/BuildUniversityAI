'use client'

// Selection is now handled directly on meshes in SceneRenderer
// This component handles "click on nothing" to deselect
import { useSceneStore } from '@/core/stores/sceneStore'

export default function SelectionManager() {
  // No-op — deselection is handled via Canvas onPointerMissed
  // This component exists as a hook point for future selection features
  // (box select, lasso, etc.)
  return null
}
