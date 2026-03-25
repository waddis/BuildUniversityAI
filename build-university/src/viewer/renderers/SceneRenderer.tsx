'use client'

import { useMemo, useCallback, useRef } from 'react'
import * as THREE from 'three'
import { ThreeEvent, useFrame } from '@react-three/fiber'
import { useSceneStore } from '@/core/stores/sceneStore'
import { useViewerStore } from '@/core/stores/viewerStore'
import { generateWallGeometry } from '@/core/geometry/wallGeometry'
import { generateSlabGeometry } from '@/core/geometry/slabGeometry'
import type { Wall, Level, Slab } from '@/core/schema/types'

const WALL_COLOR = new THREE.Color(0xece4d8)
const WALL_EXTERIOR_COLOR = new THREE.Color(0xe0d8c8)
const SLAB_COLOR = new THREE.Color(0xa09888)
const SELECTED_EMISSIVE = new THREE.Color(0xf59e0b)
const HOVERED_EMISSIVE = new THREE.Color(0x88aacc)

function WallMesh({ wall, level, selected, hovered }: {
  wall: Wall; level: Level; selected: boolean; hovered: boolean
}) {
  const geometry = useMemo(() => generateWallGeometry(wall, level), [wall, level])
  const displayMode = useViewerStore(s => s.displayMode)
  const explodeOffset = useViewerStore(s => s.explodeOffset)
  const wireframe = useViewerStore(s => s.wireframe)
  const xray = useViewerStore(s => s.xray)
  const select = useSceneStore(s => s.select)
  const selectAdd = useSceneStore(s => s.selectAdd)
  const hover = useSceneStore(s => s.hover)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  const yOffset = displayMode === 'exploded' ? level.index * explodeOffset * 5 : 0

  // Pulse emissive when selected
  useFrame(({ clock }) => {
    if (!matRef.current) return
    if (selected) {
      const pulse = (Math.sin(clock.elapsedTime * 4) + 1) / 2
      matRef.current.emissiveIntensity = 0.1 + pulse * 0.3
      matRef.current.emissive = SELECTED_EMISSIVE
    } else if (hovered) {
      matRef.current.emissiveIntensity = 0.2
      matRef.current.emissive = HOVERED_EMISSIVE
    } else {
      matRef.current.emissiveIntensity = 0
    }
  })

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.nativeEvent.shiftKey) selectAdd(wall.id)
    else select([wall.id])
  }, [wall.id, select, selectAdd])

  return (
    <mesh
      geometry={geometry}
      position={[0, yOffset, 0]}
      castShadow receiveShadow
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); hover(wall.id) }}
      onPointerOut={() => hover(null)}
    >
      <meshStandardMaterial
        ref={matRef}
        color={wall.exterior ? WALL_EXTERIOR_COLOR : WALL_COLOR}
        roughness={0.75}
        emissive={new THREE.Color(0x000000)}
        emissiveIntensity={0}
        wireframe={wireframe}
        transparent={xray}
        opacity={xray ? 0.3 : 1}
      />
    </mesh>
  )
}

function SlabMesh({ slab, level, selected, hovered }: {
  slab: Slab; level: Level; selected: boolean; hovered: boolean
}) {
  const geometry = useMemo(() => generateSlabGeometry(slab, level), [slab, level])
  const displayMode = useViewerStore(s => s.displayMode)
  const explodeOffset = useViewerStore(s => s.explodeOffset)
  const select = useSceneStore(s => s.select)
  const hover = useSceneStore(s => s.hover)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  const yOffset = displayMode === 'exploded' ? level.index * explodeOffset * 5 : 0

  useFrame(({ clock }) => {
    if (!matRef.current) return
    if (selected) {
      const pulse = (Math.sin(clock.elapsedTime * 4) + 1) / 2
      matRef.current.emissiveIntensity = 0.1 + pulse * 0.3
      matRef.current.emissive = SELECTED_EMISSIVE
    } else if (hovered) {
      matRef.current.emissiveIntensity = 0.15
      matRef.current.emissive = HOVERED_EMISSIVE
    } else {
      matRef.current.emissiveIntensity = 0
    }
  })

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    select([slab.id])
  }, [slab.id, select])

  return (
    <mesh
      geometry={geometry}
      position={[0, yOffset, 0]}
      receiveShadow
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); hover(slab.id) }}
      onPointerOut={() => hover(null)}
    >
      <meshStandardMaterial
        ref={matRef}
        color={SLAB_COLOR}
        roughness={0.9}
        emissive={new THREE.Color(0x000000)}
        emissiveIntensity={0}
      />
    </mesh>
  )
}

export default function SceneRenderer() {
  const graph = useSceneStore(s => s.graph)
  const displayMode = useViewerStore(s => s.displayMode)
  const soloLevelId = useViewerStore(s => s.soloLevelId)

  const nodes = Object.values(graph.nodes)
  const levels = nodes.filter((n): n is Level => n.type === 'level')

  return (
    <group>
      {levels.map(level => {
        if (displayMode === 'solo' && soloLevelId && soloLevelId !== level.id) return null
        if (!level.visible) return null

        const children = nodes.filter(n => n.parentId === level.id)
        const walls = children.filter((n): n is Wall => n.type === 'wall' && n.visible)
        const slabs = children.filter((n): n is Slab => n.type === 'slab' && n.visible)

        return (
          <group key={level.id}>
            {walls.map(wall => (
              <WallMesh
                key={wall.id} wall={wall} level={level}
                selected={graph.selectedIds.includes(wall.id)}
                hovered={graph.hoveredId === wall.id}
              />
            ))}
            {slabs.map(slab => (
              <SlabMesh
                key={slab.id} slab={slab} level={level}
                selected={graph.selectedIds.includes(slab.id)}
                hovered={graph.hoveredId === slab.id}
              />
            ))}
          </group>
        )
      })}
    </group>
  )
}
