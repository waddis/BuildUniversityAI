'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useViewerStore } from '@/core/stores/viewerStore'
import { useSceneStore } from '@/core/stores/sceneStore'
import SceneRenderer from '../renderers/SceneRenderer'

export default function SceneCanvas() {
  const gridVisible = useViewerStore(s => s.gridVisible)
  const clearSelection = useSceneStore(s => s.clearSelection)

  return (
    <Canvas
      shadows
      camera={{ position: [30, 20, 30], fov: 40, near: 0.1, far: 500 }}
      gl={{ antialias: true, toneMapping: 3 /* ACESFilmic */, toneMappingExposure: 1.4 }}
      style={{ background: '#f0f0f2' }}
      onPointerMissed={() => clearSelection()}
    >
      {/* Lighting — bright, architectural */}
      <hemisphereLight args={[0xeef2ff, 0xd0d4e0, 0.8]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[25, 30, 20]}
        intensity={2.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-18, 14, -12]} intensity={1.0} color={0xddeeff} />

      {/* Grid */}
      {gridVisible && (
        <Grid
          args={[100, 100]}
          position={[0, -0.01, 0]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#d0d0d8"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#b8b8c0"
          fadeDistance={60}
          fadeStrength={1}
          infiniteGrid
        />
      )}

      {/* Shadow ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial opacity={0.15} />
      </mesh>

      {/* Scene graph */}
      <SceneRenderer />

      {/* Controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.06}
        minDistance={5}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2.05}
      />

      {/* Orientation gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="white" axisHeadScale={0.8} />
      </GizmoHelper>
    </Canvas>
  )
}
