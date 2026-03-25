'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { CameraPreset } from '@/types'
import { generateComplexHouse } from '@/lib/3d/complex-house'
import { generateCommercialHotel } from '@/lib/3d/commercial-hotel'
import CalloutOverlay from './CalloutOverlay'
import type { Callout } from './CalloutOverlay'

export interface CalloutInput {
  id: string
  text: string
  details?: string[]
  worldPosition: [number, number, number]
  anchorPosition: [number, number, number]
}

export type ModelType = 'residential' | 'commercial'

interface SceneViewerProps {
  model?: ModelType
  cameraPreset?: CameraPreset | null
  highlightedGroups?: string[]
  hiddenGroups?: string[]
  onMeshClick?: (meshKey: string) => void
  explodedOffset?: number
  blueprintMode?: boolean
  callouts?: CalloutInput[]
}

interface MeshEntry {
  mesh: THREE.Mesh
  group: string
  meshKey: string
  baseY: number
  explodeOrder: number
  originalColor: THREE.Color | null
  originalMaterial: THREE.Material | null
}

const HIGHLIGHT_COLOR = new THREE.Color(0xFF8C00)  // construction orange to match UI

// Cinematic ease — slow start, smooth middle, gentle settle
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function smootherp(current: number, target: number, rate: number, dt: number): number {
  const t = 1 - Math.pow(1 - rate, dt * 60)
  return current + (target - current) * t
}

function lerpVec3(v: THREE.Vector3, target: THREE.Vector3, rate: number, dt: number) {
  v.x = smootherp(v.x, target.x, rate, dt)
  v.y = smootherp(v.y, target.y, rate, dt)
  v.z = smootherp(v.z, target.z, rate, dt)
}

// Blueprint mode colors
const BLUEPRINT_BG = new THREE.Color(0x1a2a5c)
const BLUEPRINT_FOG = new THREE.Color(0x1a2a5c)
const BLUEPRINT_WIRE_COLOR = new THREE.Color(0xc8deff) // light blue-white wireframe
const BLUEPRINT_GRID_COLOR = 0xffffff

export default function SceneViewer({
  model = 'residential',
  cameraPreset,
  highlightedGroups,
  hiddenGroups,
  onMeshClick,
  explodedOffset = 0,
  blueprintMode = false,
  callouts: calloutInputs,
}: SceneViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [cameraState, setCameraState] = useState<THREE.PerspectiveCamera | null>(null)
  const [rendererDomState, setRendererDomState] = useState<HTMLCanvasElement | null>(null)
  const internalsRef = useRef<{
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    meshes: MeshEntry[]
    targetCamPos: THREE.Vector3
    targetCamTarget: THREE.Vector3
    targetFov: number
    isTransitioning: boolean
    transitionStart: number
    transitionDuration: number
    startCamPos: THREE.Vector3
    startCamTarget: THREE.Vector3
    startFov: number
    userInteracting: boolean
    lastInteraction: number
    controls: { update: () => void; target: THREE.Vector3; dispose: () => void; enabled: boolean } | null
    // Blueprint mode transition
    blueprintT: number // 0 = realistic, 1 = full blueprint
    blueprintWireMaterials: Map<THREE.Mesh, THREE.MeshBasicMaterial>
    scene: THREE.Scene
    skyDome: THREE.Mesh
    ground: THREE.Mesh
    grid: THREE.GridHelper
    sun: THREE.DirectionalLight
    skyFill: THREE.DirectionalLight
    bounce: THREE.DirectionalLight
    originalBg: THREE.Color
    originalFogColor: THREE.Color
    originalFogNear: number
    originalFogFar: number
  } | null>(null)

  const onClickRef = useRef(onMeshClick)
  onClickRef.current = onMeshClick
  const highlightedRef = useRef(highlightedGroups)
  highlightedRef.current = highlightedGroups
  const hiddenRef = useRef(hiddenGroups)
  hiddenRef.current = hiddenGroups
  const explodeRef = useRef(explodedOffset)
  explodeRef.current = explodedOffset
  const blueprintRef = useRef(blueprintMode)
  blueprintRef.current = blueprintMode

  // Camera preset changes trigger cinematic transition
  useEffect(() => {
    if (!cameraPreset || !internalsRef.current) return
    const r = internalsRef.current
    // Store start state for curve interpolation
    r.startCamPos = r.camera.position.clone()
    r.startCamTarget = r.controls ? r.controls.target.clone() : new THREE.Vector3(1, -1, 0)
    r.startFov = r.camera.fov
    r.targetCamPos.set(...cameraPreset.position)
    r.targetCamTarget.set(...cameraPreset.target)
    r.targetFov = cameraPreset.fov ?? 35
    // Compute duration based on distance — farther moves take longer
    const dist = r.startCamPos.distanceTo(r.targetCamPos)
    r.transitionDuration = Math.min(Math.max(dist * 0.06, 0.8), 2.5) // 0.8s–2.5s
    r.isTransitioning = true
    r.transitionStart = performance.now()
    if (r.controls) r.controls.enabled = false
  }, [cameraPreset])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth || window.innerWidth
    const h = mount.clientHeight || window.innerHeight

    // Renderer — high quality architectural visualization
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.VSMShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
    mount.appendChild(renderer.domElement)

    const isWebGL2 = renderer.capabilities.isWebGL2
    const isCommercial = model === 'commercial'

    const scene = new THREE.Scene()

    // Sky dome — realistic gradient from blue sky to horizon haze
    const skyC = document.createElement('canvas'); skyC.width = 512; skyC.height = 512
    const skyCtx = skyC.getContext('2d')!
    const skyGr = skyCtx.createLinearGradient(0, 0, 0, 512)
    skyGr.addColorStop(0, '#5B8EC9')     // zenith — medium blue
    skyGr.addColorStop(0.3, '#8CB4D8')   // upper sky
    skyGr.addColorStop(0.55, '#B8D4E8')  // mid sky
    skyGr.addColorStop(0.75, '#D6E6F0')  // lower sky
    skyGr.addColorStop(0.9, '#E8EEF2')   // horizon haze
    skyGr.addColorStop(1.0, '#EFF2F4')   // ground blend
    skyCtx.fillStyle = skyGr; skyCtx.fillRect(0, 0, 512, 512)
    const skyTex = new THREE.CanvasTexture(skyC)
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(120, 32, 16),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })
    )
    scene.add(skyDome)

    scene.fog = new THREE.Fog(0xdde6ee, 50, 130)

    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 300)
    if (isCommercial) {
      camera.position.set(60, 30, 50)
    } else {
      camera.position.set(28, 16, 26)
    }

    // Environment map for reflections (procedural cubemap from canvas)
    // PMREMGenerator requires WebGL2 for proper rendering
    let envMap: THREE.Texture | null = null
    if (isWebGL2) {
      const pmremGen = new THREE.PMREMGenerator(renderer)
      const envScene = new THREE.Scene()
      envScene.add(new THREE.HemisphereLight(0x88bbee, 0xc8d4cc, 1.0))
      envScene.add(new THREE.AmbientLight(0xffffff, 0.5))
      envMap = pmremGen.fromScene(envScene, 0, 0.1, 100).texture
      scene.environment = envMap
      pmremGen.dispose()
    }

    // Sunlight — warm afternoon, casts realistic shadows
    const sun = new THREE.DirectionalLight(0xfff4e8, 2.5)
    sun.position.set(20, 35, 15)
    sun.castShadow = true
    sun.shadow.mapSize.setScalar(4096)
    const shadowExtent = isCommercial ? 60 : 30
    sun.shadow.camera.left = -shadowExtent; sun.shadow.camera.right = shadowExtent
    sun.shadow.camera.top = shadowExtent; sun.shadow.camera.bottom = -shadowExtent
    sun.shadow.bias = -0.0001; sun.shadow.radius = 2
    sun.shadow.normalBias = 0.03
    scene.add(sun)

    // Sky fill — cool blue to simulate sky bounce
    const skyFill = new THREE.DirectionalLight(0x8aacc8, 0.8)
    skyFill.position.set(-15, 20, -10)
    scene.add(skyFill)

    // Ground bounce — warm reflected light from below
    const bounce = new THREE.DirectionalLight(0xe8dcc8, 0.3)
    bounce.position.set(0, -5, 0)
    scene.add(bounce)

    // Hemisphere — sky vs ground ambient
    scene.add(new THREE.HemisphereLight(0xc8daea, 0x94a484, 0.6))
    scene.add(new THREE.AmbientLight(0xffffff, 0.25))

    // Ground — realistic grass/dirt texture
    const groundC = document.createElement('canvas'); groundC.width = 1024; groundC.height = 1024
    const gCtx = groundC.getContext('2d')!
    // Base green
    gCtx.fillStyle = '#5a8a3a'; gCtx.fillRect(0, 0, 1024, 1024)
    // Mow stripes
    for (let sy = 0; sy < 1024; sy += 60) {
      gCtx.fillStyle = sy % 120 < 60 ? 'rgba(70,140,50,0.08)' : 'rgba(40,100,25,0.06)'
      gCtx.fillRect(0, sy, 1024, 60)
    }
    // Grass blades
    for (let i = 0; i < 15000; i++) {
      const v = 40 + Math.random() * 50 | 0
      gCtx.fillStyle = `rgba(${v},${90 + Math.random()*60|0},${15 + Math.random()*20|0},${0.2 + Math.random()*0.3})`
      gCtx.fillRect(Math.random() * 1024, Math.random() * 1024, 1, 2 + Math.random() * 5)
    }
    // Bare patches near house
    gCtx.fillStyle = 'rgba(140,120,80,0.08)'
    gCtx.fillRect(400, 400, 250, 200)
    const groundTex = new THREE.CanvasTexture(groundC)
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping
    groundTex.repeat.set(12, 12)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, envMapIntensity: 0.1 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -5
    ground.receiveShadow = true
    scene.add(ground)

    // Subtle construction grid (lighter, recedes)
    const grid = new THREE.GridHelper(50, 50, 0xc0c8c0, 0xd0d8d0)
    grid.position.y = -4.98
    grid.material.opacity = 0.3
    grid.material.transparent = true
    scene.add(grid)

    // House model
    const meshes: MeshEntry[] = []
    const houseParts = isCommercial ? generateCommercialHotel(isWebGL2) : generateComplexHouse(isWebGL2)
    houseParts.forEach(def => {
      const mesh = new THREE.Mesh(def.geometry, def.material)
      mesh.position.set(...def.position)
      if (def.rotation) mesh.rotation.set(...def.rotation)
      if (def.castShadow) mesh.castShadow = true
      if (def.receiveShadow) mesh.receiveShadow = true
      scene.add(mesh)
      const origColor = (def.material instanceof THREE.MeshStandardMaterial) ? def.material.color.clone() : null
      meshes.push({ mesh, group: def.group, meshKey: def.meshKey, baseY: def.position[1], explodeOrder: def.explodeOrder, originalColor: origColor, originalMaterial: def.material })
    })

    // Apply initial visibility IMMEDIATELY (before animation loop starts)
    const initHidden = hiddenRef.current
    const initHighlighted = highlightedRef.current
    const initHasHighlight = initHighlighted && initHighlighted.length > 0
    meshes.forEach(entry => {
      const isHidden = initHidden?.includes(entry.group)
      const isActive = initHasHighlight && initHighlighted!.includes(entry.group)
      entry.mesh.visible = !isHidden
      const mat = entry.mesh.material
      if (mat instanceof THREE.MeshStandardMaterial) {
        if (isHidden) {
          mat.opacity = 0; mat.transparent = true
        } else if (isActive) {
          mat.emissive = HIGHLIGHT_COLOR; mat.emissiveIntensity = 0.25
        } else if (initHasHighlight) {
          mat.opacity = 0.15; mat.transparent = true
          if (entry.originalColor) mat.color.copy(entry.originalColor).lerp(new THREE.Color(0xd0d0d8), 0.7)
        }
      }
    })

    const houseCenter = isCommercial ? new THREE.Vector3(0, -8, 5) : new THREE.Vector3(1, -1, 0)
    const targetCamPos = new THREE.Vector3(28, 16, 26)
    const targetCamTarget = houseCenter.clone()

    // Pre-create wireframe materials for blueprint mode
    const blueprintWireMaterials = new Map<THREE.Mesh, THREE.MeshBasicMaterial>()
    meshes.forEach(entry => {
      const wireMat = new THREE.MeshBasicMaterial({
        color: BLUEPRINT_WIRE_COLOR,
        wireframe: true,
        transparent: true,
        opacity: 1,
      })
      blueprintWireMaterials.set(entry.mesh, wireMat)
    })

    internalsRef.current = {
      camera, renderer, meshes, targetCamPos, targetCamTarget,
      targetFov: 35,
      isTransitioning: false, transitionStart: 0, transitionDuration: 1.5,
      startCamPos: camera.position.clone(),
      startCamTarget: houseCenter.clone(),
      startFov: 35,
      userInteracting: false, lastInteraction: 0,
      controls: null,
      // Blueprint
      blueprintT: 0,
      blueprintWireMaterials,
      scene,
      skyDome,
      ground,
      grid,
      sun,
      skyFill,
      bounce,
      originalBg: new THREE.Color(0x000000), // scene has no solid bg by default (uses sky dome)
      originalFogColor: new THREE.Color(0xdde6ee),
      originalFogNear: 50,
      originalFogFar: 130,
    }

    // Expose camera and renderer DOM for callout overlay
    setCameraState(camera)
    setRendererDomState(renderer.domElement)

    // Click handler
    const handleClick = (e: MouseEvent) => {
      if (!onClickRef.current || !internalsRef.current) return
      const rect = renderer.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(meshes.map(m => m.mesh))
      if (hits.length > 0) {
        const entry = meshes.find(m => m.mesh === hits[0].object)
        if (entry) onClickRef.current(entry.meshKey)
      }
    }
    renderer.domElement.addEventListener('click', handleClick)

    // Track user interaction to pause idle drift
    const markInteraction = () => {
      if (internalsRef.current) {
        internalsRef.current.userInteracting = true
        internalsRef.current.lastInteraction = performance.now()
      }
    }
    const clearInteraction = () => {
      if (internalsRef.current) internalsRef.current.userInteracting = false
    }
    renderer.domElement.addEventListener('pointerdown', markInteraction)
    renderer.domElement.addEventListener('pointerup', clearInteraction)
    renderer.domElement.addEventListener('wheel', markInteraction)

    // Animation
    let orbitCleanup: (() => void) | null = null
    const frameRef = { current: 0 }
    let lastTime = performance.now()

    ;(async () => {
      try {
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
        const oc = new OrbitControls(camera, renderer.domElement)
        oc.enableDamping = true; oc.dampingFactor = 0.06
        oc.minDistance = 4; oc.maxDistance = 80
        oc.maxPolarAngle = Math.PI / 2.05
        oc.target.copy(houseCenter)
        oc.update()
        internalsRef.current!.controls = oc
        orbitCleanup = () => oc.dispose()

        const animate = () => {
          frameRef.current = requestAnimationFrame(animate)
          const now = performance.now()
          const dt = Math.min((now - lastTime) / 1000, 0.05)
          lastTime = now

          const r = internalsRef.current!

          // ── Cinematic camera transition ──
          if (r.isTransitioning) {
            const elapsed = (now - r.transitionStart) / 1000
            const rawT = Math.min(elapsed / r.transitionDuration, 1)
            const t = easeInOutCubic(rawT) // smooth S-curve

            // Interpolate position, target, FOV
            camera.position.lerpVectors(r.startCamPos, targetCamPos, t)
            oc.target.lerpVectors(r.startCamTarget, targetCamTarget, t)
            camera.fov = r.startFov + (r.targetFov - r.startFov) * t
            camera.updateProjectionMatrix()

            if (rawT >= 1) {
              r.isTransitioning = false
              oc.enabled = true
            }
          }

          // ── Idle drift — slow orbit when user isn't interacting ──
          if (!r.isTransitioning && !r.userInteracting) {
            const idleDelay = 3000 // 3s after last interaction
            if (now - r.lastInteraction > idleDelay) {
              // Very slow orbit around target
              const driftSpeed = 0.08 * dt // degrees per frame
              const radius = camera.position.distanceTo(oc.target)
              const angle = Math.atan2(camera.position.z - oc.target.z, camera.position.x - oc.target.x)
              const newAngle = angle + driftSpeed * Math.PI / 180
              camera.position.x = oc.target.x + Math.cos(newAngle) * radius
              camera.position.z = oc.target.z + Math.sin(newAngle) * radius
            }
          }

          // ── Visibility, highlight glow, explode ──
          const hidden = hiddenRef.current
          const highlighted = highlightedRef.current
          const explode = explodeRef.current
          const hasHighlight = highlighted && highlighted.length > 0

          // Pulse: gentle sine breathing for highlighted elements
          const pulseT = (Math.sin(now * 0.004) + 1) / 2
          const pulseIntensity = 0.15 + pulseT * 0.35  // stronger for light bg

          meshes.forEach(entry => {
            const isHidden = hidden?.includes(entry.group)
            const isActiveTarget = hasHighlight && highlighted!.includes(entry.group)

            entry.mesh.visible = !isHidden

            const mat = entry.mesh.material
            if (mat instanceof THREE.MeshStandardMaterial) {
              if (isHidden) {
                mat.opacity = 0
                mat.transparent = true
              } else if (isActiveTarget) {
                // HIGHLIGHTED: full color + pulsing blue glow
                mat.opacity = 1
                mat.transparent = false
                mat.emissive = HIGHLIGHT_COLOR
                mat.emissiveIntensity = pulseIntensity
                if (entry.originalColor) {
                  mat.color.copy(entry.originalColor)
                }
              } else if (hasHighlight) {
                // DIMMED: faded, desaturated toward light grey (not black)
                mat.opacity = 0.15
                mat.transparent = true
                mat.emissive = mat.emissive || new THREE.Color()
                mat.emissive.setHex(0x000000)
                mat.emissiveIntensity = 0
                if (entry.originalColor) {
                  mat.color.copy(entry.originalColor).lerp(new THREE.Color(0xd0d0d8), 0.7)
                }
              } else {
                // NORMAL: original appearance
                mat.opacity = 1
                mat.transparent = false
                mat.emissive = mat.emissive || new THREE.Color()
                mat.emissive.setHex(0x000000)
                mat.emissiveIntensity = 0
                if (entry.originalColor) mat.color.copy(entry.originalColor)
              }
            }
            entry.mesh.position.y = entry.baseY + entry.explodeOrder * explode
          })

          // ── Blueprint mode transition ──
          const bpTarget = blueprintRef.current ? 1 : 0
          const bpSpeed = 3.0 // transition speed (higher = faster, ~0.5s at 3.0)
          r.blueprintT = r.blueprintT + (bpTarget - r.blueprintT) * Math.min(bpSpeed * dt, 1)
          // Snap when very close
          if (Math.abs(r.blueprintT - bpTarget) < 0.005) r.blueprintT = bpTarget

          const bpT = r.blueprintT

          if (bpT > 0) {
            // Interpolate background
            if (!scene.background || !(scene.background instanceof THREE.Color)) {
              scene.background = new THREE.Color()
            }
            ;(scene.background as THREE.Color).copy(r.originalBg).lerp(BLUEPRINT_BG, bpT)

            // Fade sky dome out
            const skyMat = skyDome.material as THREE.MeshBasicMaterial
            skyMat.opacity = 1 - bpT
            skyMat.transparent = bpT > 0

            // Fade ground out
            const groundMat = ground.material as THREE.MeshStandardMaterial
            groundMat.opacity = 1 - bpT
            groundMat.transparent = bpT > 0

            // Fade fog to blueprint blue
            if (scene.fog instanceof THREE.Fog) {
              scene.fog.color.copy(r.originalFogColor).lerp(BLUEPRINT_FOG, bpT)
              scene.fog.near = r.originalFogNear + (200 - r.originalFogNear) * bpT
              scene.fog.far = r.originalFogFar + (300 - r.originalFogFar) * bpT
            }

            // Dim lights
            sun.intensity = 2.5 * (1 - bpT * 0.9)
            skyFill.intensity = 0.8 * (1 - bpT)
            bounce.intensity = 0.3 * (1 - bpT)

            // Disable shadows in blueprint
            renderer.shadowMap.enabled = bpT < 0.5

            // Grid to white on blue
            const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material]
            gridMats.forEach(gm => {
              if (gm instanceof THREE.LineBasicMaterial) {
                gm.color.set(0xd0d8d0).lerp(new THREE.Color(BLUEPRINT_GRID_COLOR), bpT)
                gm.opacity = 0.3 + bpT * 0.4
              }
            })

            // Swap materials on meshes
            meshes.forEach(entry => {
              if (!entry.mesh.visible) return
              const wireMat = r.blueprintWireMaterials.get(entry.mesh)
              if (!wireMat) return

              if (bpT > 0.5) {
                // Blueprint: show wireframe material
                if (entry.mesh.material !== wireMat) {
                  entry.mesh.material = wireMat
                }
                wireMat.opacity = Math.min(bpT * 2 - 0.5, 1) // fade in from 0.5→1
              } else {
                // Realistic: restore original material
                if (entry.originalMaterial && entry.mesh.material !== entry.originalMaterial) {
                  entry.mesh.material = entry.originalMaterial
                }
              }
            })

            // Tone mapping off in blueprint
            renderer.toneMapping = bpT > 0.5 ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping
          } else {
            // Fully realistic — ensure everything is restored
            scene.background = null
            const skyMat = skyDome.material as THREE.MeshBasicMaterial
            skyMat.opacity = 1; skyMat.transparent = false
            const groundMat = ground.material as THREE.MeshStandardMaterial
            groundMat.opacity = 1; groundMat.transparent = false
            renderer.shadowMap.enabled = true
            renderer.toneMapping = THREE.ACESFilmicToneMapping
            sun.intensity = 2.5
            skyFill.intensity = 0.8
            bounce.intensity = 0.3
            if (scene.fog instanceof THREE.Fog) {
              scene.fog.color.copy(r.originalFogColor)
              scene.fog.near = r.originalFogNear
              scene.fog.far = r.originalFogFar
            }
            // Restore original materials if needed
            meshes.forEach(entry => {
              if (entry.originalMaterial && entry.mesh.material !== entry.originalMaterial) {
                entry.mesh.material = entry.originalMaterial
              }
            })
          }

          oc.update()
          renderer.render(scene, camera)
        }
        animate()
      } catch {
        const animate = () => {
          frameRef.current = requestAnimationFrame(animate)
          renderer.render(scene, camera)
        }
        animate()
      }
    })()

    const handleResize = () => {
      if (!mount) return
      const nw = mount.clientWidth || 1
      const nh = mount.clientHeight || 1
      camera.aspect = nw / nh; camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('click', handleClick)
      renderer.domElement.removeEventListener('pointerdown', markInteraction)
      renderer.domElement.removeEventListener('pointerup', clearInteraction)
      renderer.domElement.removeEventListener('wheel', markInteraction)
      orbitCleanup?.()

      // Dispose all mesh geometries and materials to prevent GPU memory leaks
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose()
          const mat = obj.material
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose())
          } else if (mat) {
            mat.dispose()
          }
        }
      })

      // Dispose blueprint wireframe materials
      if (internalsRef.current) {
        internalsRef.current.blueprintWireMaterials.forEach(mat => mat.dispose())
      }

      // Dispose canvas textures
      skyTex.dispose()
      groundTex.dispose()

      // Dispose environment map
      if (envMap) envMap.dispose()

      scene.clear()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Convert callout inputs to Callout objects (all visible when provided)
  const callouts: Callout[] = (calloutInputs ?? []).map(c => ({
    ...c,
    visible: true,
  }))

  return (
    <div ref={mountRef} className="w-full h-full relative" style={{ touchAction: 'none' }}>
      {callouts.length > 0 && cameraState && rendererDomState && (
        <CalloutOverlay
          callouts={callouts}
          camera={cameraState}
          rendererDom={rendererDomState}
        />
      )}
    </div>
  )
}
