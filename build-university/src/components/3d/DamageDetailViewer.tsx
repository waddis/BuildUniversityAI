'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'

// ════════════════════════════════════════════════════════════════════════════════
// DAMAGE DETAIL VIEWER — JigSpace-style cinematic 3D inspection viewer
// Guided camera paths, annotations, zoom-to-damage, and cinematic transitions
// ════════════════════════════════════════════════════════════════════════════════

// ── Types ──

export interface DamageAnnotation {
  id: string
  position: [number, number, number]
  title: string
  description: string
  severity: 'minor' | 'moderate' | 'severe' | 'critical'
  /** Optional: code reference (e.g., "IRC R905.2.7.1") */
  codeRef?: string
  /** Visual indicator type */
  indicator: 'circle' | 'arrow' | 'area'
  /** Radius for circle/area indicators (world units) */
  radius?: number
}

export interface CinematicStop {
  /** Camera position */
  position: [number, number, number]
  /** Look-at target */
  target: [number, number, number]
  /** Field of view (smaller = more zoomed in) */
  fov: number
  /** Title displayed during this stop */
  title: string
  /** Detailed narration text */
  narration: string
  /** How long to hold this view before user advances (seconds) */
  holdDuration?: number
  /** Annotations visible at this stop */
  annotationIds?: string[]
  /** Highlighted mesh groups */
  highlightedGroups?: string[]
}

export interface DamageScenario {
  id: string
  title: string
  subtitle: string
  /** Mesh groups to show (everything else hidden) */
  visibleGroups: string[]
  /** Cinematic camera path stops */
  stops: CinematicStop[]
  /** Damage annotations pinned in 3D space */
  annotations: DamageAnnotation[]
}

interface DamageDetailViewerProps {
  scenario: DamageScenario
  onClose?: () => void
}

// ── Constants ──

const SEVERITY_COLORS: Record<string, { hex: number; css: string; bg: string }> = {
  minor:    { hex: 0x94a3b8, css: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20' },
  moderate: { hex: 0xeab308, css: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  severe:   { hex: 0xf97316, css: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  critical: { hex: 0xef4444, css: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// ── Component ──

export default function DamageDetailViewer({ scenario, onClose }: DamageDetailViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [currentStop, setCurrentStop] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [visibleAnnotations, setVisibleAnnotations] = useState<string[]>([])
  const [selectedAnnotation, setSelectedAnnotation] = useState<DamageAnnotation | null>(null)
  const [annotationScreenPositions, setAnnotationScreenPositions] = useState<
    Record<string, { x: number; y: number; visible: boolean }>
  >({})

  const internalsRef = useRef<{
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    controls: { update: () => void; target: THREE.Vector3; dispose: () => void; enabled: boolean } | null
    annotationSprites: Map<string, THREE.Sprite>
    meshEntries: { mesh: THREE.Mesh; group: string; meshKey: string; originalColor: THREE.Color | null }[]
    transitionState: {
      active: boolean
      startPos: THREE.Vector3
      endPos: THREE.Vector3
      startTarget: THREE.Vector3
      endTarget: THREE.Vector3
      startFov: number
      endFov: number
      startTime: number
      duration: number
    } | null
  } | null>(null)

  const stopRef = useRef(currentStop)
  stopRef.current = currentStop

  // Navigate to a specific stop
  const goToStop = useCallback((index: number) => {
    if (!internalsRef.current || index < 0 || index >= scenario.stops.length) return
    const r = internalsRef.current
    const stop = scenario.stops[index]

    // Set up cinematic transition
    const startPos = r.camera.position.clone()
    const endPos = new THREE.Vector3(...stop.position)
    const startTarget = r.controls ? r.controls.target.clone() : new THREE.Vector3(0, 0, 0)
    const endTarget = new THREE.Vector3(...stop.target)

    const dist = startPos.distanceTo(endPos)
    const duration = Math.min(Math.max(dist * 0.08, 1.0), 3.0) // 1s–3s

    r.transitionState = {
      active: true,
      startPos,
      endPos,
      startTarget,
      endTarget,
      startFov: r.camera.fov,
      endFov: stop.fov,
      startTime: performance.now(),
      duration,
    }

    if (r.controls) r.controls.enabled = false
    setIsTransitioning(true)
    setCurrentStop(index)
    setVisibleAnnotations(stop.annotationIds ?? [])
    setSelectedAnnotation(null)
  }, [scenario.stops])

  const nextStop = useCallback(() => {
    if (stopRef.current < scenario.stops.length - 1) goToStop(stopRef.current + 1)
  }, [goToStop, scenario.stops.length])

  const prevStop = useCallback(() => {
    if (stopRef.current > 0) goToStop(stopRef.current - 1)
  }, [goToStop])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextStop() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevStop() }
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [nextStop, prevStop, onClose])

  // Three.js scene setup
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth || window.innerWidth
    const h = mount.clientHeight || window.innerHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.VSMShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.4
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()

    // Dark studio background for damage inspection (like JigSpace)
    scene.background = new THREE.Color(0x0a0a14)
    scene.fog = new THREE.FogExp2(0x0a0a14, 0.008)

    const camera = new THREE.PerspectiveCamera(scenario.stops[0]?.fov ?? 35, w / h, 0.05, 200)
    const initPos = scenario.stops[0]?.position ?? [10, 8, 10]
    camera.position.set(...initPos)

    // Environment
    const pmremGen = new THREE.PMREMGenerator(renderer)
    const envScene = new THREE.Scene()
    envScene.add(new THREE.HemisphereLight(0x88bbee, 0x444444, 0.8))
    envScene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const envMap = pmremGen.fromScene(envScene, 0, 0.1, 100).texture
    scene.environment = envMap
    pmremGen.dispose()

    // Lighting — studio-style for detail inspection
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 3.0)
    keyLight.position.set(12, 20, 10)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.setScalar(4096)
    keyLight.shadow.camera.left = -20; keyLight.shadow.camera.right = 20
    keyLight.shadow.camera.top = 20; keyLight.shadow.camera.bottom = -20
    keyLight.shadow.bias = -0.0001; keyLight.shadow.radius = 2
    scene.add(keyLight)

    // Rim light — edge definition
    const rimLight = new THREE.DirectionalLight(0x4488cc, 1.2)
    rimLight.position.set(-8, 12, -10)
    scene.add(rimLight)

    // Fill light — soft front fill
    const fillLight = new THREE.DirectionalLight(0xffeedd, 0.6)
    fillLight.position.set(5, 3, 15)
    scene.add(fillLight)

    scene.add(new THREE.HemisphereLight(0x8899aa, 0x222222, 0.5))
    scene.add(new THREE.AmbientLight(0xffffff, 0.15))

    // Ground — dark reflective surface (studio floor)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({
        color: 0x111118,
        roughness: 0.3,
        metalness: 0.1,
        envMapIntensity: 0.2,
      })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -5.1
    ground.receiveShadow = true
    scene.add(ground)

    // Load house model
    const meshEntries: typeof internalsRef.current extends null ? never : NonNullable<typeof internalsRef.current>['meshEntries'] = []
    import('@/lib/3d/complex-house').then(({ generateComplexHouse }) => {
      const parts = generateComplexHouse()
      parts.forEach(def => {
        const mesh = new THREE.Mesh(def.geometry, def.material.clone())
        mesh.position.set(...def.position)
        if (def.rotation) mesh.rotation.set(...def.rotation)
        if (def.castShadow) mesh.castShadow = true
        if (def.receiveShadow) mesh.receiveShadow = true

        // Visibility based on scenario
        const isVisible = scenario.visibleGroups.includes(def.group)
        mesh.visible = isVisible

        scene.add(mesh)
        const origColor = (mesh.material instanceof THREE.MeshStandardMaterial) ? mesh.material.color.clone() : null
        meshEntries.push({ mesh, group: def.group, meshKey: def.meshKey, originalColor: origColor })
      })
    })

    // Annotation sprites (3D markers)
    const annotationSprites = new Map<string, THREE.Sprite>()
    scenario.annotations.forEach(ann => {
      const canvas = document.createElement('canvas')
      canvas.width = 64; canvas.height = 64
      const ctx = canvas.getContext('2d')!
      const color = SEVERITY_COLORS[ann.severity]

      // Pulsing ring marker
      ctx.beginPath()
      ctx.arc(32, 32, 24, 0, Math.PI * 2)
      ctx.strokeStyle = `#${color.hex.toString(16).padStart(6, '0')}`
      ctx.lineWidth = 4
      ctx.stroke()

      // Center dot
      ctx.beginPath()
      ctx.arc(32, 32, 6, 0, Math.PI * 2)
      ctx.fillStyle = `#${color.hex.toString(16).padStart(6, '0')}`
      ctx.fill()

      const texture = new THREE.CanvasTexture(canvas)
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.position.set(...ann.position)
      sprite.scale.set(0.6, 0.6, 0.6)
      sprite.visible = false
      scene.add(sprite)
      annotationSprites.set(ann.id, sprite)
    })

    internalsRef.current = {
      camera, renderer, scene, controls: null,
      annotationSprites, meshEntries,
      transitionState: null,
    }

    // Orbit controls
    let orbitCleanup: (() => void) | null = null
    const frameRef = { current: 0 }
    let lastTime = performance.now()

    ;(async () => {
      try {
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
        const oc = new OrbitControls(camera, renderer.domElement)
        oc.enableDamping = true; oc.dampingFactor = 0.06
        oc.minDistance = 0.5; oc.maxDistance = 60
        oc.maxPolarAngle = Math.PI * 0.95
        const initTarget = scenario.stops[0]?.target ?? [0, 0, 0]
        oc.target.set(...initTarget)
        oc.update()
        internalsRef.current!.controls = oc
        orbitCleanup = () => oc.dispose()

        const animate = () => {
          frameRef.current = requestAnimationFrame(animate)
          const now = performance.now()
          const _dt = Math.min((now - lastTime) / 1000, 0.05)
          lastTime = now

          const r = internalsRef.current!

          // ── Cinematic transition ──
          if (r.transitionState?.active) {
            const ts = r.transitionState
            const elapsed = (now - ts.startTime) / 1000
            const rawT = Math.min(elapsed / ts.duration, 1)
            const t = easeInOutCubic(rawT)

            camera.position.lerpVectors(ts.startPos, ts.endPos, t)
            oc.target.lerpVectors(ts.startTarget, ts.endTarget, t)
            camera.fov = ts.startFov + (ts.endFov - ts.startFov) * t
            camera.updateProjectionMatrix()

            if (rawT >= 1) {
              ts.active = false
              oc.enabled = true
              setIsTransitioning(false)
            }
          }

          // ── Highlight active groups ──
          const stop = scenario.stops[stopRef.current]
          const highlighted = stop?.highlightedGroups ?? []
          const hasHighlight = highlighted.length > 0
          const pulseT = (Math.sin(now * 0.004) + 1) / 2
          const pulseIntensity = 0.15 + pulseT * 0.35

          meshEntries.forEach(entry => {
            if (!entry.mesh.visible) return
            const mat = entry.mesh.material
            if (!(mat instanceof THREE.MeshStandardMaterial)) return

            const isActive = hasHighlight && highlighted.includes(entry.group)
            if (isActive) {
              mat.emissive.setHex(0x2563eb)
              mat.emissiveIntensity = pulseIntensity
              mat.opacity = 1; mat.transparent = false
              if (entry.originalColor) mat.color.copy(entry.originalColor)
            } else if (hasHighlight) {
              mat.emissive.setHex(0x000000)
              mat.emissiveIntensity = 0
              mat.opacity = 0.25; mat.transparent = true
              if (entry.originalColor) mat.color.copy(entry.originalColor).lerp(new THREE.Color(0x333340), 0.6)
            } else {
              mat.emissive.setHex(0x000000)
              mat.emissiveIntensity = 0
              mat.opacity = 1; mat.transparent = false
              if (entry.originalColor) mat.color.copy(entry.originalColor)
            }
          })

          // ── Annotation sprite pulsing ──
          r.annotationSprites.forEach((sprite, id) => {
            const isVis = visibleAnnotations.includes(id)
            sprite.visible = isVis
            if (isVis) {
              const pulse = 0.5 + Math.sin(now * 0.005) * 0.15
              sprite.scale.setScalar(pulse)
            }
          })

          // ── Project annotation positions to screen ──
          const newPositions: Record<string, { x: number; y: number; visible: boolean }> = {}
          r.annotationSprites.forEach((sprite, id) => {
            if (!sprite.visible) return
            const pos = sprite.position.clone().project(camera)
            const hw = renderer.domElement.clientWidth / 2
            const hh = renderer.domElement.clientHeight / 2
            newPositions[id] = {
              x: pos.x * hw + hw,
              y: -pos.y * hh + hh,
              visible: pos.z < 1, // in front of camera
            }
          })
          setAnnotationScreenPositions(newPositions)

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

    // Resize
    const handleResize = () => {
      if (!mount) return
      const nw = mount.clientWidth || 1
      const nh = mount.clientHeight || 1
      camera.aspect = nw / nh; camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', handleResize)

    // Trigger initial stop
    setTimeout(() => goToStop(0), 100)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', handleResize)
      orbitCleanup?.()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update annotation visibility when stop changes
  useEffect(() => {
    if (!internalsRef.current) return
    const r = internalsRef.current
    r.annotationSprites.forEach((sprite, id) => {
      sprite.visible = visibleAnnotations.includes(id)
    })
  }, [visibleAnnotations])

  const stop = scenario.stops[currentStop]
  const totalStops = scenario.stops.length

  return (
    <div className="fixed inset-0 bg-[#0a0a14] flex z-50">
      {/* 3D Viewer */}
      <div className="flex-1 relative">
        <div ref={mountRef} className="w-full h-full" style={{ touchAction: 'none' }} />

        {/* Annotation labels (projected to screen space) */}
        {scenario.annotations.map(ann => {
          const pos = annotationScreenPositions[ann.id]
          if (!pos?.visible) return null
          const sev = SEVERITY_COLORS[ann.severity]
          return (
            <button
              key={ann.id}
              className={`absolute z-20 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                selectedAnnotation?.id === ann.id ? 'scale-125' : 'hover:scale-110'
              }`}
              style={{ left: pos.x, top: pos.y }}
              onClick={() => setSelectedAnnotation(ann.id === selectedAnnotation?.id ? null : ann)}
            >
              <div className={`px-2 py-1 rounded-md border text-[10px] font-semibold backdrop-blur-sm ${sev.bg} ${sev.css}`}>
                {ann.title}
              </div>
            </button>
          )
        })}

        {/* Top bar — title + close */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight">{scenario.title}</h1>
              <p className="text-white/40 text-xs mt-0.5">{scenario.subtitle}</p>
            </div>
            {onClose && (
              <button onClick={onClose} className="px-3 py-1.5 text-white/50 hover:text-white text-sm border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                Close
              </button>
            )}
          </div>
        </div>

        {/* Bottom cinematic bar — stop info + navigation */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-3">
            {scenario.stops.map((_, i) => (
              <button
                key={i}
                onClick={() => goToStop(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === currentStop
                    ? 'w-8 bg-amber-500'
                    : i < currentStop
                    ? 'w-1.5 bg-amber-500/40'
                    : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-end gap-6">
              {/* Stop text */}
              <div className="flex-1 min-w-0">
                <div className="text-amber-500 text-[10px] font-semibold uppercase tracking-widest mb-1">
                  Step {currentStop + 1} of {totalStops}
                </div>
                <h2 className="text-base font-semibold mb-1">{stop?.title}</h2>
                <p className="text-white/50 text-sm leading-relaxed line-clamp-3">{stop?.narration}</p>
              </div>

              {/* Navigation */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={prevStop}
                  disabled={currentStop === 0 || isTransitioning}
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  onClick={nextStop}
                  disabled={currentStop === totalStops - 1 || isTransitioning}
                  className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black hover:bg-amber-400 disabled:opacity-20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Selected annotation detail card */}
        {selectedAnnotation && (
          <div className="absolute right-4 top-20 z-30 w-72 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-4 animate-[slideIn_0.2s_ease-out]">
            <div className="flex items-start gap-2 mb-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${SEVERITY_COLORS[selectedAnnotation.severity].bg} ${SEVERITY_COLORS[selectedAnnotation.severity].css}`}>
                {selectedAnnotation.severity}
              </span>
              <button onClick={() => setSelectedAnnotation(null)} className="ml-auto text-white/30 hover:text-white text-xs">
                close
              </button>
            </div>
            <h3 className="font-semibold text-sm mb-1">{selectedAnnotation.title}</h3>
            <p className="text-white/50 text-xs leading-relaxed">{selectedAnnotation.description}</p>
            {selectedAnnotation.codeRef && (
              <span className="inline-block mt-2 text-amber-500/70 text-xs font-mono bg-amber-500/5 px-2 py-0.5 rounded">
                {selectedAnnotation.codeRef}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
