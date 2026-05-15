'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'

// ════════════════════════════════════════════════════════════════════════════════
// DAMAGE DETAIL VIEWER — JigSpace-style cinematic 3D inspection viewer
// Phase-based adjuster training: walkthrough → find → scope → terms → complete.
// All interactive phases are OPTIONAL — a scenario with only stops/annotations
// behaves exactly as a plain cinematic walkthrough.
// ════════════════════════════════════════════════════════════════════════════════

// ── Types ──

/** Visual style of a rendered damage mark. */
export type DamageMarkType =
  | 'hail-bruise' | 'dent' | 'crack' | 'crushed' | 'spatter' | 'puncture' | 'ring'
  | 'blister' | 'alligator'

/** Which way the damaged surface faces, so the mark lies flush against it. */
export type SurfaceFacing = 'up' | 'out' | 'roof-front' | 'roof-back' | [number, number, number]

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
  /** Optional — render a visible damage mark of this type at `position`. */
  damageType?: DamageMarkType
  /** Optional — surface orientation for the mark. Defaults to 'up'. */
  facing?: SurfaceFacing
  /** Optional — visual scale multiplier for the mark (default 1). */
  markScale?: number
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
  /**
   * Optional — mesh groups visible at this stop. When set, overrides the
   * scenario's `visibleGroups` for this stop only. Used by build sequences
   * to reveal the model layer-by-layer. Omit for a static-visibility walkthrough.
   */
  visibleGroups?: string[]
}

/** A piece of damage the learner must locate by clicking the 3D model. */
export interface FindTarget {
  id: string
  label: string
  /** World-space anchor of the damage mark. */
  position: [number, number, number]
  /** Legacy radius (unused now that marks are the click target) — kept for back-compat. */
  radius: number
  /** Legacy surface groups (unused now) — kept for back-compat. */
  meshGroups: string[]
  severity: 'minor' | 'moderate' | 'severe' | 'critical'
  /** Shown once located. */
  explanation: string
  /** Optional — render a visible damage mark of this type at `position`. */
  damageType?: DamageMarkType
  /** Optional — surface orientation for the mark. Defaults to 'up'. */
  facing?: SurfaceFacing
  /** Optional — visual scale multiplier for the mark (default 1). */
  markScale?: number
}

export interface FindChallenge {
  prompt: string
  /** Optional camera framing when the phase opens. */
  startView?: { position: [number, number, number]; target: [number, number, number]; fov: number }
  /** Groups visible during the hunt — defaults to scenario.visibleGroups. */
  visibleGroups?: string[]
  targets: FindTarget[]
}

/** A candidate estimate line item for the scope-sheet builder. */
export interface ScopeLineItem {
  id: string
  label: string
  /** Optional Xactimate-style code, shown muted. */
  code?: string
  /** true = belongs on the estimate; false = it's a distractor. */
  correct: boolean
  /** Why it is / isn't valid — revealed after grading. */
  note: string
  /** Grouping header, e.g. "Roof", "Elevations", "Soft Metals". */
  category?: string
}

export interface ScopeSheet {
  prompt: string
  items: ScopeLineItem[]
  /** Pass mark, 0..1. Default 0.8. */
  passThreshold?: number
}

export interface GlossaryCard {
  id: string
  term: string
  definition: string
  /** If present → multiple-choice; if absent → flip card. */
  distractors?: string[]
  note?: string
}

export interface GlossaryDrill {
  prompt: string
  cards: GlossaryCard[]
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
  /** Optional — interactive "find the damage" phase */
  findChallenge?: FindChallenge
  /** Optional — interactive scope-sheet builder phase */
  scopeSheet?: ScopeSheet
  /** Optional — terminology drill phase */
  glossary?: GlossaryDrill
}

export type DamagePhase = 'walkthrough' | 'find' | 'scope' | 'terms' | 'complete'

interface DamageDetailViewerProps {
  scenario: DamageScenario
  onClose?: () => void
}

interface MeshEntry {
  mesh: THREE.Mesh
  group: string
  meshKey: string
  originalColor: THREE.Color | null
}

interface ScopeResult { score: number; pass: boolean }
interface TermsResult { correct: number; total: number }

// ── Constants ──

const SEVERITY_COLORS: Record<string, { hex: number; css: string; bg: string }> = {
  minor:    { hex: 0x94a3b8, css: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20' },
  moderate: { hex: 0xeab308, css: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  severe:   { hex: 0xf97316, css: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  critical: { hex: 0xef4444, css: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
}

const FOUND_HEX = 0x22c55e

// Complex house roof is an 8/12 pitch (rise 3.0 / run 4.5)
const ROOF_SLOPE = Math.atan(3.0 / 4.5)

// Shared theme tokens — Architectural Void
const GHOST = 'shadow-[inset_0_0_0_1px_rgba(86,67,52,0.25)]'
const PANEL = `bg-[#201f1f] rounded-2xl ${GHOST}`
const PRIMARY_BTN = 'bg-[#FF8C00] text-[#131313] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30'
const GHOST_BTN = `text-[#e5e2e1]/60 hover:text-[#e5e2e1] rounded-lg hover:bg-[#2a2a2a] transition-colors ${GHOST}`

const PHASE_LABELS: Record<DamagePhase, string> = {
  walkthrough: 'Walkthrough',
  find: 'Find Damage',
  scope: 'Scope Sheet',
  terms: 'Terminology',
  complete: 'Results',
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function makeRingSprite(hex: number): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 64; canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const css = `#${hex.toString(16).padStart(6, '0')}`
  ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI * 2)
  ctx.strokeStyle = css; ctx.lineWidth = 4; ctx.stroke()
  ctx.beginPath(); ctx.arc(32, 32, 6, 0, Math.PI * 2)
  ctx.fillStyle = css; ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  return new THREE.Sprite(mat)
}

// ── Procedural damage marks ──
// A small THREE.Group per damage point, rendered at the annotation/target position.
// No external assets; one CanvasTexture per (type,severity) shared across marks.

const damageTexCache = new Map<string, THREE.CanvasTexture>()

function damageTexture(type: DamageMarkType, hex: number): THREE.CanvasTexture {
  const key = `${type}:${hex}`
  const cached = damageTexCache.get(key)
  if (cached) return cached

  const cv = document.createElement('canvas')
  cv.width = 128; cv.height = 128
  const x = cv.getContext('2d')!
  const css = `#${hex.toString(16).padStart(6, '0')}`
  const cx = 64, cy = 64

  if (type === 'hail-bruise') {
    const g = x.createRadialGradient(cx, cy, 3, cx, cy, 54)
    g.addColorStop(0, 'rgba(18,14,10,0.95)')
    g.addColorStop(0.5, 'rgba(38,30,22,0.72)')
    g.addColorStop(1, 'rgba(38,30,22,0)')
    x.fillStyle = g
    x.beginPath(); x.arc(cx, cy, 54, 0, Math.PI * 2); x.fill()
    for (let i = 0; i < 64; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.random() * 46
      x.fillStyle = `rgba(12,10,8,${0.3 + Math.random() * 0.5})`
      x.beginPath(); x.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1 + Math.random() * 2, 0, Math.PI * 2); x.fill()
    }
    x.strokeStyle = css; x.lineWidth = 3; x.globalAlpha = 0.85
    x.beginPath(); x.arc(cx, cy, 42, 0, Math.PI * 2); x.stroke()
    x.globalAlpha = 1
  } else if (type === 'dent') {
    const g = x.createRadialGradient(cx - 9, cy - 9, 1, cx, cy, 48)
    g.addColorStop(0, 'rgba(255,255,255,0.6)')
    g.addColorStop(0.34, 'rgba(255,255,255,0)')
    g.addColorStop(0.62, 'rgba(0,0,0,0.55)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = g
    x.beginPath(); x.arc(cx, cy, 48, 0, Math.PI * 2); x.fill()
    x.strokeStyle = css; x.lineWidth = 2.5; x.globalAlpha = 0.75
    x.beginPath(); x.arc(cx, cy, 40, 0, Math.PI * 2); x.stroke()
    x.globalAlpha = 1
  } else if (type === 'crack') {
    x.strokeStyle = '#eef2f5'; x.lineWidth = 2
    x.shadowColor = 'rgba(0,0,0,0.85)'; x.shadowBlur = 2
    const spokes = 8
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2 + Math.random() * 0.45
      let px = cx, py = cy
      x.beginPath(); x.moveTo(cx, cy)
      const segs = 4 + Math.floor(Math.random() * 3)
      for (let s = 0; s < segs; s++) {
        const len = 7 + Math.random() * 9
        px += Math.cos(a) * len + (Math.random() - 0.5) * 6
        py += Math.sin(a) * len + (Math.random() - 0.5) * 6
        x.lineTo(px, py)
      }
      x.stroke()
    }
    x.shadowBlur = 0
    x.fillStyle = 'rgba(10,12,14,0.9)'
    x.beginPath(); x.arc(cx, cy, 5, 0, Math.PI * 2); x.fill()
  } else if (type === 'spatter') {
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.random() * 56
      const sx = cx + Math.cos(a) * rr, sy = cy + Math.sin(a) * rr
      const r = 2 + Math.random() * 4.5
      const g = x.createRadialGradient(sx, sy, 0, sx, sy, r)
      g.addColorStop(0, 'rgba(234,238,242,0.9)')
      g.addColorStop(1, 'rgba(234,238,242,0)')
      x.fillStyle = g
      x.beginPath(); x.arc(sx, sy, r, 0, Math.PI * 2); x.fill()
    }
  } else if (type === 'puncture') {
    const g = x.createRadialGradient(cx, cy, 1, cx, cy, 22)
    g.addColorStop(0, 'rgba(0,0,0,0.95)')
    g.addColorStop(0.8, 'rgba(0,0,0,0.6)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = g
    x.beginPath(); x.arc(cx, cy, 22, 0, Math.PI * 2); x.fill()
    x.strokeStyle = 'rgba(214,206,188,0.85)'; x.lineWidth = 2
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2
      x.beginPath(); x.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16)
      x.lineTo(cx + Math.cos(a) * (28 + Math.random() * 10), cy + Math.sin(a) * (28 + Math.random() * 10))
      x.stroke()
    }
  } else if (type === 'blister') {
    // Raised dome with INTACT granules — the visual opposite of a hail bruise.
    // Bright-side / shadow-side lighting sells the bump; the granule speckle is
    // the same color as the surrounding roof (no fracture, no darkening).
    const g = x.createRadialGradient(cx - 10, cy - 10, 2, cx, cy, 50)
    g.addColorStop(0, 'rgba(255,238,210,0.55)')
    g.addColorStop(0.35, 'rgba(220,200,170,0.18)')
    g.addColorStop(0.62, 'rgba(20,16,12,0.18)')
    g.addColorStop(0.85, 'rgba(20,16,12,0.42)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = g
    x.beginPath(); x.arc(cx, cy, 50, 0, Math.PI * 2); x.fill()
    // Intact granules — same speckle as the field, no fractured spots
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.random() * 42
      const v = 60 + Math.random() * 50 | 0
      x.fillStyle = `rgba(${v},${v-8},${v-18},${0.35 + Math.random() * 0.3})`
      x.beginPath(); x.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.8 + Math.random() * 1.6, 0, Math.PI * 2); x.fill()
    }
    // Soft amber rim — the way a low sun reads a blister edge in a photo
    x.strokeStyle = css; x.lineWidth = 1.5; x.globalAlpha = 0.5
    x.beginPath(); x.arc(cx, cy, 44, 0, Math.PI * 2); x.stroke()
    x.globalAlpha = 1
  } else if (type === 'alligator') {
    // Polygonal crack network — UV-aged membrane / mat exposure pattern.
    // Built as a Voronoi-ish web: scatter seeds, draw boundaries between cells.
    const seeds: [number, number][] = []
    for (let i = 0; i < 22; i++) {
      seeds.push([cx + (Math.random() - 0.5) * 100, cy + (Math.random() - 0.5) * 100])
    }
    x.fillStyle = 'rgba(28,22,18,0.32)'
    x.beginPath(); x.arc(cx, cy, 52, 0, Math.PI * 2); x.fill()
    x.strokeStyle = 'rgba(15,12,10,0.85)'; x.lineWidth = 1.4
    x.shadowColor = 'rgba(255,235,200,0.18)'; x.shadowBlur = 1
    // Draw a short segment from each seed toward each near neighbor — fakes cell edges.
    for (let i = 0; i < seeds.length; i++) {
      for (let j = i + 1; j < seeds.length; j++) {
        const dx = seeds[j][0] - seeds[i][0], dy = seeds[j][1] - seeds[i][1]
        const d2 = dx * dx + dy * dy
        if (d2 > 900) continue // only short connections
        const mx = (seeds[i][0] + seeds[j][0]) / 2, my = (seeds[i][1] + seeds[j][1]) / 2
        // Perpendicular short slash at midpoint, jittered
        const len = 4 + Math.random() * 5
        const pa = Math.atan2(dy, dx) + Math.PI / 2
        x.beginPath()
        x.moveTo(mx - Math.cos(pa) * len + (Math.random() - 0.5) * 2, my - Math.sin(pa) * len + (Math.random() - 0.5) * 2)
        x.lineTo(mx + Math.cos(pa) * len + (Math.random() - 0.5) * 2, my + Math.sin(pa) * len + (Math.random() - 0.5) * 2)
        x.stroke()
      }
    }
    x.shadowBlur = 0
    // Soft outer fade
    const fade = x.createRadialGradient(cx, cy, 36, cx, cy, 60)
    fade.addColorStop(0, 'rgba(0,0,0,0)')
    fade.addColorStop(1, 'rgba(20,16,12,0)')
    x.fillStyle = fade
    x.beginPath(); x.arc(cx, cy, 60, 0, Math.PI * 2); x.fill()
  } else {
    // 'crushed' backing streak, and 'ring' fallback
    x.strokeStyle = css; x.lineWidth = 5
    x.beginPath(); x.arc(cx, cy, 34, 0, Math.PI * 2); x.stroke()
    x.fillStyle = css
    x.beginPath(); x.arc(cx, cy, 7, 0, Math.PI * 2); x.fill()
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 4
  damageTexCache.set(key, tex)
  return tex
}

function orientMark(group: THREE.Group, facing: SurfaceFacing) {
  if (facing === 'up') {
    group.rotation.x = -Math.PI / 2
  } else if (facing === 'out') {
    // default plane already faces +Z
  } else if (facing === 'roof-front') {
    group.rotation.x = -Math.PI / 2 + ROOF_SLOPE
  } else if (facing === 'roof-back') {
    group.rotation.x = -Math.PI / 2 - ROOF_SLOPE
  } else if (Array.isArray(facing)) {
    const n = new THREE.Vector3(facing[0], facing[1], facing[2]).normalize()
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
  }
}

/** Build a visible damage mark group. The group's children are raycastable. */
function makeDamageMark(type: DamageMarkType, hex: number, facing: SurfaceFacing, scale: number): THREE.Group {
  const group = new THREE.Group()

  if (type === 'ring') {
    // Fallback — a simple camera-facing ring sprite
    const s = makeRingSprite(hex)
    s.scale.setScalar(0.6)
    group.add(s)
  } else {
    // Decal plane — the visible damage texture, laid flush on the surface
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.62),
      new THREE.MeshBasicMaterial({
        map: damageTexture(type, hex),
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      })
    )
    decal.position.z = 0.02 // push along local normal — beats z-fighting
    group.add(decal)

    // Light relief geometry for the types that need 3D read at close-up
    if (type === 'crushed') {
      const finMat = new THREE.MeshStandardMaterial({ color: 0x33332f, metalness: 0.5, roughness: 0.6 })
      for (let i = 0; i < 5; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.28, 0.1), finMat)
        fin.position.set(-0.16 + i * 0.08, 0, 0.04)
        fin.rotation.z = (Math.random() - 0.5) * 0.7
        fin.rotation.x = (Math.random() - 0.5) * 0.4
        group.add(fin)
      }
    } else if (type === 'puncture') {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.05, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.85, side: THREE.DoubleSide })
      )
      ring.position.z = 0.018
      group.add(ring)
    } else if (type === 'blister') {
      // The whole point of a blister: it's RAISED. A flattened hemisphere
      // sits proud of the surface and reads in 3D from any close angle.
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({
          // Same dark roof tone as the asphalt field — no granule fracture,
          // just an intact bubble in the mat.
          color: 0x33302c, roughness: 0.78, metalness: 0,
        })
      )
      // Squash the dome — real shingle blisters are wide and shallow, not round.
      dome.scale.set(1, 1, 0.45)
      dome.position.z = 0.018
      dome.castShadow = true
      group.add(dome)
    } else if (type === 'alligator') {
      // Light raised relief along the cracked perimeter — the surface curls at
      // the edges of each cell as the mat dries out. A thin torus reads it.
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.012, 8, 32),
        new THREE.MeshStandardMaterial({ color: 0x2a241e, roughness: 0.92, metalness: 0 })
      )
      rim.position.z = 0.019
      group.add(rim)
    }
  }

  // Invisible-but-raycastable hit pad — a forgiving, uniform click target
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(0.44, 16),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  )
  pad.position.z = 0.012
  pad.name = 'hitPad'
  group.add(pad)

  // Found-confirmation ring — toggled on once the mark is located
  const foundRing = makeRingSprite(FOUND_HEX)
  foundRing.scale.setScalar(1.0)
  foundRing.visible = false
  foundRing.name = 'foundRing'
  group.add(foundRing)

  orientMark(group, facing)
  group.scale.setScalar(scale)
  group.userData.baseScale = scale
  group.userData.foundRing = foundRing
  group.userData.pulsePhase = Math.random() * Math.PI * 2
  return group
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

  // Phase machine
  const [phase, setPhase] = useState<DamagePhase>('walkthrough')
  const [houseReady, setHouseReady] = useState(false)
  const [showIntro, setShowIntro] = useState(true)

  // Find-phase state
  const [foundIds, setFoundIds] = useState<string[]>([])
  const [misses, setMisses] = useState(0)
  const [findToast, setFindToast] = useState<{ kind: 'hit' | 'miss'; label: string; explanation: string } | null>(null)

  // Results from later phases
  const [scopeResult, setScopeResult] = useState<ScopeResult | null>(null)
  const [termsResult, setTermsResult] = useState<TermsResult | null>(null)

  const internalsRef = useRef<{
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    controls: { update: () => void; target: THREE.Vector3; dispose: () => void; enabled: boolean } | null
    annotationSprites: Map<string, THREE.Sprite>
    damageMarks: Map<string, THREE.Group>
    meshEntries: MeshEntry[]
    raycaster: THREE.Raycaster
    pointer: THREE.Vector2
    houseLoaded: boolean
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
  const phaseRef = useRef<DamagePhase>(phase)
  phaseRef.current = phase
  const foundIdsRef = useRef<string[]>(foundIds)
  foundIdsRef.current = foundIds
  // Brief "pulse the unfound marks" window, set by the Hint button.
  const hintUntilRef = useRef(0)
  // Bridge from the (once-bound) pointer listener into fresh React closures.
  const pickHandlerRef = useRef<(id: string | null) => void>(() => {})

  // Ordered list of phases this scenario actually has.
  const phaseOrder = useMemo<DamagePhase[]>(() => {
    const p: DamagePhase[] = ['walkthrough']
    if (scenario.findChallenge?.targets.length) p.push('find')
    if (scenario.scopeSheet?.items.length) p.push('scope')
    if (scenario.glossary?.cards.length) p.push('terms')
    p.push('complete')
    return p
  }, [scenario])

  // Navigate to a specific cinematic stop
  const goToStop = useCallback((index: number) => {
    if (!internalsRef.current || index < 0 || index >= scenario.stops.length) return
    const r = internalsRef.current
    const stop = scenario.stops[index]

    const startPos = r.camera.position.clone()
    const endPos = new THREE.Vector3(...stop.position)
    const startTarget = r.controls ? r.controls.target.clone() : new THREE.Vector3(0, 0, 0)
    const endTarget = new THREE.Vector3(...stop.target)

    const dist = startPos.distanceTo(endPos)
    const duration = Math.min(Math.max(dist * 0.08, 1.0), 3.0) // 1s–3s

    r.transitionState = {
      active: true, startPos, endPos, startTarget, endTarget,
      startFov: r.camera.fov, endFov: stop.fov,
      startTime: performance.now(), duration,
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

  // Advance to the next phase in phaseOrder
  const advancePhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phaseRef.current)
    if (idx >= 0 && idx < phaseOrder.length - 1) setPhase(phaseOrder[idx + 1])
  }, [phaseOrder])

  // Step back one phase
  const goBackPhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phaseRef.current)
    if (idx > 0) setPhase(phaseOrder[idx - 1])
  }, [phaseOrder])

  const goToPhase = useCallback((target: DamagePhase) => {
    const curIdx = phaseOrder.indexOf(phaseRef.current)
    const tgtIdx = phaseOrder.indexOf(target)
    // Only allow jumping to a phase already reached.
    if (tgtIdx >= 0 && tgtIdx <= curIdx) setPhase(target)
  }, [phaseOrder])

  const restart = useCallback(() => {
    setFoundIds([]); setMisses(0); setFindToast(null)
    setScopeResult(null); setTermsResult(null)
    setCurrentStop(0)
    setPhase('walkthrough')
  }, [])

  // Show the intro card whenever a 3D phase opens
  useEffect(() => {
    setShowIntro(phase === 'walkthrough' || phase === 'find')
  }, [phase])

  // Keyboard navigation — cinematic nav only during the walkthrough phase
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) { onClose(); return }
      if (phaseRef.current !== 'walkthrough') return
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextStop() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevStop() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [nextStop, prevStop, onClose])

  // Three.js scene setup — built ONCE
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth || window.innerWidth
    const h = mount.clientHeight || window.innerHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.VSMShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x9fc6e8)
    scene.fog = new THREE.FogExp2(0xc7dcec, 0.011)

    // Sky dome — vertical gradient, daytime property look
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(150, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        fog: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x4a90d9) },
          bottomColor: { value: new THREE.Color(0xb5d4ea) },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vP;
          void main(){ float hgt = clamp(normalize(vP).y * 0.5 + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(mix(bottomColor, topColor, hgt), 1.0); }`,
      })
    )
    scene.add(sky)

    const camera = new THREE.PerspectiveCamera(scenario.stops[0]?.fov ?? 35, w / h, 0.05, 200)
    const initPos = scenario.stops[0]?.position ?? [10, 8, 10]
    camera.position.set(...initPos)

    // Environment — outdoor daylight IBL
    const pmremGen = new THREE.PMREMGenerator(renderer)
    const envScene = new THREE.Scene()
    envScene.add(new THREE.HemisphereLight(0xbcd6f0, 0x6b5d4f, 1.2))
    envScene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const envMap = pmremGen.fromScene(envScene, 0, 0.1, 100).texture
    scene.environment = envMap
    pmremGen.dispose()

    // Lighting — sun + sky
    const keyLight = new THREE.DirectionalLight(0xfff4e2, 2.3)
    keyLight.position.set(12, 22, 10)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.setScalar(4096)
    keyLight.shadow.camera.left = -20; keyLight.shadow.camera.right = 20
    keyLight.shadow.camera.top = 20; keyLight.shadow.camera.bottom = -20
    keyLight.shadow.bias = -0.0001; keyLight.shadow.radius = 2
    scene.add(keyLight)

    const skyFill = new THREE.DirectionalLight(0x9fc0e0, 0.45)
    skyFill.position.set(-8, 12, -10)
    scene.add(skyFill)

    const bounceFill = new THREE.DirectionalLight(0xfff0dc, 0.5)
    bounceFill.position.set(5, 3, 15)
    scene.add(bounceFill)

    scene.add(new THREE.HemisphereLight(0xaecfff, 0x6b5d4f, 1.1))
    scene.add(new THREE.AmbientLight(0xffffff, 0.12))

    // Ground — grass / lot
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x5f6b48, roughness: 0.96, metalness: 0 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -5.1
    ground.receiveShadow = true
    scene.add(ground)

    // Load house model (async)
    const meshEntries: MeshEntry[] = []
    import('@/lib/3d/complex-house').then(({ generateComplexHouse }) => {
      const parts = generateComplexHouse()
      parts.forEach(def => {
        const mesh = new THREE.Mesh(def.geometry, def.material.clone())
        mesh.position.set(...def.position)
        if (def.rotation) mesh.rotation.set(...def.rotation)
        if (def.castShadow) mesh.castShadow = true
        if (def.receiveShadow) mesh.receiveShadow = true
        mesh.visible = scenario.visibleGroups.includes(def.group)
        scene.add(mesh)
        const origColor = (mesh.material instanceof THREE.MeshStandardMaterial) ? mesh.material.color.clone() : null
        meshEntries.push({ mesh, group: def.group, meshKey: def.meshKey, originalColor: origColor })
      })
      if (internalsRef.current) internalsRef.current.houseLoaded = true
      setHouseReady(true)
    })

    // Annotation sprites — anchors for the projected HTML labels
    const annotationSprites = new Map<string, THREE.Sprite>()
    scenario.annotations.forEach(ann => {
      const sprite = makeRingSprite(SEVERITY_COLORS[ann.severity].hex)
      sprite.position.set(...ann.position)
      sprite.scale.setScalar(0.0001) // invisible anchor — the damage mark is the visual
      sprite.visible = false
      scene.add(sprite)
      annotationSprites.set(ann.id, sprite)
    })

    // Damage marks — the visible, clickable damage (annotations + find targets)
    const damageMarks = new Map<string, THREE.Group>()
    const spawnMark = (
      id: string, position: [number, number, number], severity: string,
      damageType?: DamageMarkType, facing?: SurfaceFacing, markScale?: number,
    ) => {
      const hex = SEVERITY_COLORS[severity].hex
      const g = makeDamageMark(damageType ?? 'ring', hex, facing ?? 'up', markScale ?? 1)
      g.position.set(...position)
      g.visible = false
      g.userData.id = id
      scene.add(g)
      damageMarks.set(id, g)
    }
    scenario.annotations.forEach(a => spawnMark(a.id, a.position, a.severity, a.damageType, a.facing, a.markScale))
    scenario.findChallenge?.targets.forEach(t => spawnMark(t.id, t.position, t.severity, t.damageType, t.facing, t.markScale))

    internalsRef.current = {
      camera, renderer, scene, controls: null,
      annotationSprites, damageMarks, meshEntries,
      raycaster: new THREE.Raycaster(), pointer: new THREE.Vector2(),
      houseLoaded: false, transitionState: null,
    }

    // ── Pointer interaction ──
    let pointerIsDown = false
    let dragging = false
    let hovered: THREE.Group | null = null
    const down = { x: 0, y: 0 }

    const setPointerFromEvent = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      internalsRef.current!.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      internalsRef.current!.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }
    const markUnder = (): THREE.Group | null => {
      const r = internalsRef.current!
      r.raycaster.setFromCamera(r.pointer, r.camera)
      const groups = [...r.damageMarks.values()].filter(g => g.visible)
      const hits = r.raycaster.intersectObjects(groups, true)
      if (!hits.length) return null
      let obj: THREE.Object3D | null = hits[0].object
      while (obj && obj.userData.id === undefined) obj = obj.parent
      return (obj as THREE.Group) ?? null
    }

    const onPointerDown = (e: PointerEvent) => {
      pointerIsDown = true; dragging = false
      down.x = e.clientX; down.y = e.clientY
    }
    const onPointerMove = (e: PointerEvent) => {
      if (pointerIsDown && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) dragging = true
      if (phaseRef.current !== 'find') {
        if (hovered) { hovered = null }
        renderer.domElement.style.cursor = ''
        return
      }
      if (pointerIsDown) return // don't hover-test mid-drag
      setPointerFromEvent(e)
      hovered = markUnder()
      renderer.domElement.style.cursor = hovered ? 'pointer' : ''
    }
    const onPointerUp = (e: PointerEvent) => {
      pointerIsDown = false
      if (phaseRef.current !== 'find' || dragging) return
      setPointerFromEvent(e)
      const mark = markUnder()
      if (mark) { pickHandlerRef.current(mark.userData.id ?? null); return }
      // No mark — did they at least click the house? (a teaching "miss")
      const r = internalsRef.current!
      const houseHits = r.raycaster.intersectObjects(
        r.meshEntries.filter(m => m.mesh.visible).map(m => m.mesh), false,
      )
      if (houseHits.length) pickHandlerRef.current(null)
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)

    // Orbit controls + animate loop
    let orbitCleanup: (() => void) | null = null
    const frameRef = { current: 0 }
    const tmpScale = new THREE.Vector3()

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
          const r = internalsRef.current!
          const ph = phaseRef.current

          // ── Cinematic transition ──
          if (r.transitionState?.active) {
            const ts = r.transitionState
            const rawT = Math.min((now - ts.startTime) / 1000 / ts.duration, 1)
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

          // ── Material state per phase ──
          if (ph === 'walkthrough') {
            const stop = scenario.stops[stopRef.current]
            const highlighted = stop?.highlightedGroups ?? []
            const hasHighlight = highlighted.length > 0
            const pulseT = (Math.sin(now * 0.004) + 1) / 2
            const pulseIntensity = 0.12 + pulseT * 0.28
            r.meshEntries.forEach(entry => {
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
                mat.opacity = 0.4; mat.transparent = true
                if (entry.originalColor) mat.color.copy(entry.originalColor).lerp(new THREE.Color(0x6a6f60), 0.45)
              } else {
                mat.emissive.setHex(0x000000)
                mat.emissiveIntensity = 0
                mat.opacity = 1; mat.transparent = false
                if (entry.originalColor) mat.color.copy(entry.originalColor)
              }
            })
          } else {
            // find / scope / terms / complete — show the model clean & unbiased
            r.meshEntries.forEach(entry => {
              const mat = entry.mesh.material
              if (!(mat instanceof THREE.MeshStandardMaterial)) return
              mat.emissive.setHex(0x000000)
              mat.emissiveIntensity = 0
              mat.opacity = 1; mat.transparent = false
              if (entry.originalColor) mat.color.copy(entry.originalColor)
            })
          }

          // ── Damage marks — visibility, found state, hover / hint / idle scale ──
          const stopAnnIds = ph === 'walkthrough'
            ? (scenario.stops[stopRef.current]?.annotationIds ?? [])
            : []
          const findTargetIds = ph === 'find'
            ? (scenario.findChallenge?.targets.map(t => t.id) ?? [])
            : []
          const hinting = now < hintUntilRef.current
          r.damageMarks.forEach((g, id) => {
            let vis = false
            if (ph === 'walkthrough') vis = stopAnnIds.includes(id)
            else if (ph === 'find') vis = findTargetIds.includes(id)
            g.visible = vis
            if (!vis) return
            const found = ph === 'find' && foundIdsRef.current.includes(id)
            const fr = g.userData.foundRing as THREE.Sprite | undefined
            if (fr) fr.visible = found
            const base = g.userData.baseScale ?? 1
            const idle = 1 + Math.sin(now * 0.004 + (g.userData.pulsePhase ?? 0)) * 0.05
            const hover = g === hovered ? 1.28 : 1
            const hint = hinting && !found ? 1.32 : 1
            const target = base * idle * Math.max(hover, hint)
            g.scale.lerp(tmpScale.setScalar(target), 0.22)
          })

          // ── Annotation pulse (anchors are invisible; kept for parity) ──
          // ── Project annotation positions to screen ──
          const newPositions: Record<string, { x: number; y: number; visible: boolean }> = {}
          r.annotationSprites.forEach((sprite, id) => {
            if (!sprite.visible) return
            const pos = sprite.position.clone().project(camera)
            const hw = renderer.domElement.clientWidth / 2
            const hh = renderer.domElement.clientHeight / 2
            newPositions[id] = { x: pos.x * hw + hw, y: -pos.y * hh + hh, visible: pos.z < 1 }
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
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      damageMarks.forEach(g => g.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          const m = o.material
          if (Array.isArray(m)) m.forEach(mm => mm.dispose()); else m.dispose()
        }
      }))
      orbitCleanup?.()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update annotation anchor visibility when the stop changes
  useEffect(() => {
    if (!internalsRef.current) return
    internalsRef.current.annotationSprites.forEach((sprite, id) => {
      sprite.visible = phaseRef.current === 'walkthrough' && visibleAnnotations.includes(id)
    })
  }, [visibleAnnotations])

  // Per-stop mesh visibility — owns walkthrough visibility. A stop's own
  // `visibleGroups` (build sequences) overrides the scenario default, which
  // lets the model reveal layer-by-layer. Falls back to scenario.visibleGroups.
  useEffect(() => {
    const r = internalsRef.current
    if (!r || phase !== 'walkthrough') return
    const groups = scenario.stops[currentStop]?.visibleGroups ?? scenario.visibleGroups
    r.meshEntries.forEach(e => { e.mesh.visible = groups.includes(e.group) })
  }, [currentStop, phase, houseReady, scenario])

  // Reconfigure the shared scene when the phase changes
  useEffect(() => {
    const r = internalsRef.current
    if (!r) return

    if (phase === 'walkthrough') {
      // Mesh visibility for the walkthrough is owned by the per-stop effect below.
      if (r.controls) r.controls.enabled = true
      goToStop(stopRef.current)
      return
    }

    // Non-walkthrough phases hide the cinematic annotation anchors
    r.annotationSprites.forEach(sprite => { sprite.visible = false })
    setVisibleAnnotations([])
    setSelectedAnnotation(null)

    if (phase === 'find' && scenario.findChallenge) {
      const fc = scenario.findChallenge
      const groups = fc.visibleGroups ?? scenario.visibleGroups
      r.meshEntries.forEach(e => { e.mesh.visible = groups.includes(e.group) })
      if (r.controls) r.controls.enabled = true
      if (fc.startView && r.controls) {
        r.transitionState = {
          active: true,
          startPos: r.camera.position.clone(),
          endPos: new THREE.Vector3(...fc.startView.position),
          startTarget: r.controls.target.clone(),
          endTarget: new THREE.Vector3(...fc.startView.target),
          startFov: r.camera.fov,
          endFov: fc.startView.fov,
          startTime: performance.now(),
          duration: 1.5,
        }
        r.controls.enabled = false
        setIsTransitioning(true)
      }
    }
  }, [phase, houseReady, scenario, goToStop])

  // Keep the pointer-pick handler pointing at a fresh closure
  useEffect(() => {
    pickHandlerRef.current = (id: string | null) => {
      const fc = scenario.findChallenge
      if (phaseRef.current !== 'find' || !fc) return
      const target = id ? fc.targets.find(t => t.id === id) : null
      if (target) {
        if (foundIds.includes(target.id)) return // already documented — no penalty, no repeat
        setFoundIds(prev => prev.includes(target.id) ? prev : [...prev, target.id])
        setFindToast({ kind: 'hit', label: target.label, explanation: target.explanation })
      } else {
        setMisses(m => m + 1)
        setFindToast({
          kind: 'miss',
          label: 'No documentable damage there',
          explanation: 'Look for dents, bruises, cracks, and spatter on the storm-facing surfaces and soft metals.',
        })
      }
    }
  }, [scenario, foundIds])

  // Auto-dismiss the find toast
  useEffect(() => {
    if (!findToast) return
    const id = setTimeout(() => setFindToast(null), 4600)
    return () => clearTimeout(id)
  }, [findToast])

  const stop = scenario.stops[currentStop]
  const totalStops = scenario.stops.length
  const phaseIdx = phaseOrder.indexOf(phase)
  const hasNextPhase = phaseIdx < phaseOrder.length - 1
  const onLastStop = currentStop === totalStops - 1

  const findChallenge = scenario.findChallenge
  const allFound = !!findChallenge && foundIds.length === findChallenge.targets.length

  const intro = phase === 'find'
    ? {
        eyebrow: `Phase ${phaseIdx + 1} of ${phaseOrder.length - 1}`,
        title: 'Find the Damage',
        body: `${findChallenge?.prompt ?? ''} Click-drag to orbit the property, scroll to zoom, then click each piece of hail damage. ${findChallenge?.targets.length ?? 0} to find.`,
        cta: 'Start Inspecting',
      }
    : {
        eyebrow: 'Guided Walkthrough',
        title: scenario.title,
        body: `${scenario.subtitle}. Move through each inspection stop with the arrows below — or your left / right arrow keys and spacebar. The damage being described is marked on the model.`,
        cta: 'Begin Walkthrough',
      }

  return (
    <div className="fixed inset-0 bg-[#1c1b1b] flex z-50 text-[#e5e2e1]">
      <div className="flex-1 relative">
        <div ref={mountRef} className="w-full h-full" style={{ touchAction: 'none' }} />

        {/* Annotation labels (projected to screen space) — walkthrough only */}
        {phase === 'walkthrough' && scenario.annotations.map(ann => {
          const pos = annotationScreenPositions[ann.id]
          if (!pos?.visible) return null
          const sev = SEVERITY_COLORS[ann.severity]
          return (
            <button
              key={ann.id}
              className={`absolute z-20 transform -translate-x-1/2 transition-all duration-300 ${
                selectedAnnotation?.id === ann.id ? 'scale-110' : 'hover:scale-105'
              }`}
              style={{ left: pos.x, top: pos.y, marginTop: -34 }}
              onClick={() => setSelectedAnnotation(ann.id === selectedAnnotation?.id ? null : ann)}
            >
              <div className={`px-2 py-1 rounded-md border text-[10px] font-semibold backdrop-blur-sm ${sev.bg} ${sev.css}`}>
                {ann.title}
              </div>
            </button>
          )
        })}

        {/* Top bar — title + phase breadcrumb + close (z-40 so it stays reachable above overlay panels) */}
        <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/75 to-transparent px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight truncate">{scenario.title}</h1>
              <p className="text-[#e5e2e1]/50 text-xs mt-0.5 truncate">{scenario.subtitle}</p>
            </div>

            {/* Phase breadcrumb */}
            {phaseOrder.length > 2 && (
              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                {phaseOrder.filter(p => p !== 'complete').map((p, i) => {
                  const idx = phaseOrder.indexOf(p)
                  const state = idx < phaseIdx ? 'done' : idx === phaseIdx ? 'active' : 'future'
                  return (
                    <button
                      key={p}
                      onClick={() => goToPhase(p)}
                      disabled={state === 'future'}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide transition-colors ${
                        state === 'active'
                          ? 'bg-[#FF8C00] text-[#131313]'
                          : state === 'done'
                          ? 'text-[#FF8C00]/80 hover:text-[#FF8C00] bg-black/30'
                          : 'text-[#e5e2e1]/25 bg-black/20'
                      }`}
                    >
                      {i + 1}. {PHASE_LABELS[p]}
                    </button>
                  )
                })}
              </div>
            )}

            {onClose && (
              <button onClick={onClose} className={`px-3 py-1.5 text-sm shrink-0 bg-black/30 ${GHOST_BTN}`}>
                Close
              </button>
            )}
          </div>
        </div>

        {/* ── PHASE INTRO CARD ── */}
        {showIntro && (phase === 'walkthrough' || phase === 'find') && (
          <div className="absolute inset-0 z-30 bg-black/65 backdrop-blur-sm flex items-center justify-center p-6">
            <div className={`${PANEL} w-[min(94vw,460px)] p-7`}>
              <div className="text-[#FF8C00] text-[10px] font-semibold uppercase tracking-widest mb-1">{intro.eyebrow}</div>
              <h2 className="text-xl font-bold mb-2">{intro.title}</h2>
              <p className="text-sm text-[#e5e2e1]/65 leading-relaxed mb-6">{intro.body}</p>
              <button onClick={() => setShowIntro(false)} className={`w-full h-11 text-sm ${PRIMARY_BTN}`}>
                {intro.cta}
              </button>
            </div>
          </div>
        )}

        {/* ── WALKTHROUGH — cinematic bar ── */}
        {phase === 'walkthrough' && (
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/55 to-transparent">
            <div className="flex justify-center gap-2 mb-3">
              {scenario.stops.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToStop(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === currentStop ? 'w-8 bg-[#FF8C00]'
                      : i < currentStop ? 'w-1.5 bg-[#FF8C00]/40'
                      : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
            <div className="px-6 pb-6">
              <div className="flex items-end gap-6">
                <div className="flex-1 min-w-0">
                  <div className="text-[#FF8C00] text-[10px] font-semibold uppercase tracking-widest mb-1">
                    Step {currentStop + 1} of {totalStops}
                  </div>
                  <h2 className="text-base font-semibold mb-1">{stop?.title}</h2>
                  <p className="text-[#e5e2e1]/60 text-sm leading-relaxed line-clamp-3">{stop?.narration}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={prevStop}
                    disabled={currentStop === 0 || isTransitioning}
                    className={`w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-20 bg-black/30 ${GHOST_BTN}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {onLastStop && hasNextPhase ? (
                    <button
                      onClick={advancePhase}
                      disabled={isTransitioning}
                      className={`h-10 px-5 text-sm ${PRIMARY_BTN}`}
                    >
                      Continue to {PHASE_LABELS[phaseOrder[phaseIdx + 1]]}
                    </button>
                  ) : (
                    <button
                      onClick={nextStop}
                      disabled={onLastStop || isTransitioning}
                      className="w-10 h-10 rounded-full bg-[#FF8C00] flex items-center justify-center text-[#131313] hover:opacity-90 disabled:opacity-20 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── WALKTHROUGH — selected annotation card ── */}
        {phase === 'walkthrough' && selectedAnnotation && (
          <div className={`absolute right-4 top-24 z-30 w-72 bg-black/90 backdrop-blur-md rounded-xl p-4 animate-[slideIn_0.2s_ease-out] ${GHOST}`}>
            <div className="flex items-start gap-2 mb-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${SEVERITY_COLORS[selectedAnnotation.severity].bg} ${SEVERITY_COLORS[selectedAnnotation.severity].css}`}>
                {selectedAnnotation.severity}
              </span>
              <button onClick={() => setSelectedAnnotation(null)} className="ml-auto text-[#e5e2e1]/30 hover:text-[#e5e2e1] text-xs">close</button>
            </div>
            <h3 className="font-semibold text-sm mb-1">{selectedAnnotation.title}</h3>
            <p className="text-[#e5e2e1]/55 text-xs leading-relaxed">{selectedAnnotation.description}</p>
            {selectedAnnotation.codeRef && (
              <span className="inline-block mt-2 text-[#FF8C00]/70 text-xs font-mono bg-[#FF8C00]/5 px-2 py-0.5 rounded">
                {selectedAnnotation.codeRef}
              </span>
            )}
          </div>
        )}

        {/* ── FIND — HUD ── */}
        {phase === 'find' && findChallenge && !showIntro && (
          <>
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-[min(92vw,640px)]">
              <div className={`px-4 py-3 bg-black/80 backdrop-blur-md rounded-xl ${GHOST}`}>
                <div className="text-[#FF8C00] text-[10px] font-semibold uppercase tracking-widest mb-1">Find the Damage</div>
                <p className="text-sm text-[#e5e2e1]/85 leading-snug">{findChallenge.prompt}</p>
              </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 flex-wrap justify-center px-4">
              {phaseIdx > 0 && (
                <button onClick={goBackPhase} className={`h-10 px-3 text-sm bg-black/60 ${GHOST_BTN}`}>Back</button>
              )}
              <div className={`px-3 py-2 bg-black/80 backdrop-blur-md rounded-lg ${GHOST}`}>
                <span className="text-[#22c55e] font-semibold text-sm">{foundIds.length}</span>
                <span className="text-[#e5e2e1]/45 text-sm"> / {findChallenge.targets.length} found</span>
              </div>
              <div className={`px-3 py-2 bg-black/80 backdrop-blur-md rounded-lg ${GHOST}`}>
                <span className="text-[#e5e2e1]/45 text-sm">Misses </span>
                <span className="text-red-400 font-semibold text-sm">{misses}</span>
              </div>
              <button
                onClick={() => { hintUntilRef.current = performance.now() + 2200 }}
                disabled={allFound}
                className={`h-10 px-3 text-sm bg-black/60 disabled:opacity-30 ${GHOST_BTN}`}
              >
                Hint
              </button>
              <button onClick={advancePhase} className={`h-10 px-5 text-sm ${PRIMARY_BTN}`}>
                {allFound ? 'Continue' : 'Skip & Continue'}
              </button>
            </div>

            {findToast && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-[min(92vw,420px)] animate-[slideIn_0.2s_ease-out]">
                <div className={`px-4 py-3 bg-black/90 backdrop-blur-md rounded-xl ${GHOST}`}>
                  <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${findToast.kind === 'hit' ? 'text-[#22c55e]' : 'text-red-400'}`}>
                    {findToast.kind === 'hit' ? 'Damage located' : 'Miss'}
                  </div>
                  <p className="text-sm font-semibold mb-0.5">{findToast.label}</p>
                  <p className="text-xs text-[#e5e2e1]/60 leading-snug">{findToast.explanation}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SCOPE — overlay panel ── */}
        {phase === 'scope' && scenario.scopeSheet && (
          <ScopeSheetPanel
            scopeSheet={scenario.scopeSheet}
            onBack={phaseIdx > 0 ? goBackPhase : undefined}
            onComplete={(result) => { setScopeResult(result); advancePhase() }}
          />
        )}

        {/* ── TERMS — overlay panel ── */}
        {phase === 'terms' && scenario.glossary && (
          <GlossaryDrillPanel
            glossary={scenario.glossary}
            onBack={phaseIdx > 0 ? goBackPhase : undefined}
            onComplete={(result) => { setTermsResult(result); advancePhase() }}
          />
        )}

        {/* ── COMPLETE — results summary ── */}
        {phase === 'complete' && (
          <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
            <div className={`${PANEL} w-[min(94vw,520px)] p-7`}>
              <div className="text-[#FF8C00] text-[10px] font-semibold uppercase tracking-widest mb-1">Training Complete</div>
              <h2 className="text-xl font-bold mb-1">{scenario.title}</h2>
              <p className="text-[#e5e2e1]/50 text-sm mb-6">You finished every phase of this inspection.</p>

              <div className="space-y-2.5 mb-7">
                {findChallenge && (
                  <ResultRow
                    label="Find the Damage"
                    value={`${foundIds.length} / ${findChallenge.targets.length} located`}
                    sub={`${misses} miss${misses === 1 ? '' : 'es'}`}
                    good={foundIds.length === findChallenge.targets.length}
                  />
                )}
                {scenario.scopeSheet && scopeResult && (
                  <ResultRow
                    label="Scope Sheet"
                    value={`${Math.round(scopeResult.score * 100)}%`}
                    sub={scopeResult.pass ? 'Passed' : 'Review recommended'}
                    good={scopeResult.pass}
                  />
                )}
                {scenario.glossary && termsResult && (
                  <ResultRow
                    label="Terminology"
                    value={`${termsResult.correct} / ${termsResult.total} correct`}
                    sub={termsResult.correct === termsResult.total ? 'Perfect' : 'Keep drilling'}
                    good={termsResult.correct === termsResult.total}
                  />
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={restart} className={`flex-1 h-11 text-sm ${GHOST_BTN}`}>Restart</button>
                {onClose && (
                  <button onClick={onClose} className={`flex-1 h-11 text-sm ${PRIMARY_BTN}`}>Back to Library</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Results row ──

function ResultRow({ label, value, sub, good }: { label: string; value: string; sub: string; good: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl bg-[#1c1b1b] ${GHOST}`}>
      <span className="text-sm text-[#e5e2e1]/70">{label}</span>
      <div className="text-right">
        <div className={`text-sm font-semibold ${good ? 'text-[#22c55e]' : 'text-[#FF8C00]'}`}>{value}</div>
        <div className="text-[10px] text-[#e5e2e1]/35">{sub}</div>
      </div>
    </div>
  )
}

// ── Scope-sheet builder panel ──

function ScopeSheetPanel({ scopeSheet, onBack, onComplete }: {
  scopeSheet: ScopeSheet
  onBack?: () => void
  onComplete: (r: ScopeResult) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [graded, setGraded] = useState(false)

  const categories = useMemo(() => {
    const map = new Map<string, ScopeLineItem[]>()
    scopeSheet.items.forEach(item => {
      const key = item.category ?? 'Line Items'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    })
    return Array.from(map.entries())
  }, [scopeSheet.items])

  const toggle = (id: string) => {
    if (graded) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const result = useMemo<ScopeResult>(() => {
    const correctCount = scopeSheet.items.filter(i => selected.has(i.id) === i.correct).length
    const score = scopeSheet.items.length ? correctCount / scopeSheet.items.length : 0
    return { score, pass: score >= (scopeSheet.passThreshold ?? 0.8) }
  }, [selected, scopeSheet])

  return (
    <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className={`${PANEL} w-[min(94vw,680px)] max-h-[84vh] flex flex-col`}>
        <div className="p-6 pb-4 shrink-0">
          <div className="text-[#FF8C00] text-[10px] font-semibold uppercase tracking-widest mb-1">Scope Sheet Builder</div>
          <p className="text-sm text-[#e5e2e1]/80 leading-snug">{scopeSheet.prompt}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-5 min-h-0">
          {categories.map(([cat, items]) => (
            <div key={cat}>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#e5e2e1]/40 mb-2">{cat}</div>
              <div className="space-y-2">
                {items.map(item => {
                  const isSel = selected.has(item.id)
                  let chip: { text: string; cls: string } | null = null
                  if (graded) {
                    if (isSel && item.correct) chip = { text: 'Correct include', cls: 'text-[#22c55e] bg-[#22c55e]/10' }
                    else if (!isSel && !item.correct) chip = { text: 'Correctly excluded', cls: 'text-[#22c55e] bg-[#22c55e]/10' }
                    else if (isSel && !item.correct) chip = { text: 'Not a valid line item', cls: 'text-red-400 bg-red-500/10' }
                    else chip = { text: 'Missed', cls: 'text-[#FF8C00] bg-[#FF8C00]/10' }
                  }
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl transition-colors ${
                        isSel ? 'bg-[#FF8C00]/10 shadow-[inset_0_0_0_1px_rgba(255,140,0,0.4)]' : `bg-[#1c1b1b] ${GHOST}`
                      } ${graded ? 'cursor-default' : 'hover:bg-[#2a2a2a]'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded shrink-0 flex items-center justify-center ${
                          isSel ? 'bg-[#FF8C00]' : 'shadow-[inset_0_0_0_1px_rgba(86,67,52,0.5)]'
                        }`}>
                          {isSel && (
                            <svg className="w-3.5 h-3.5 text-[#131313]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm">{item.label}</span>
                            {item.code && <span className="text-[10px] font-mono text-[#e5e2e1]/35">{item.code}</span>}
                            {chip && <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${chip.cls}`}>{chip.text}</span>}
                          </div>
                          {graded && <p className="text-xs text-[#e5e2e1]/55 leading-snug mt-1.5">{item.note}</p>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 pt-4 flex items-center gap-3 shrink-0">
          {onBack && !graded && (
            <button onClick={onBack} className={`h-11 px-4 text-sm bg-[#1c1b1b] ${GHOST_BTN}`}>Back</button>
          )}
          {graded ? (
            <>
              <div className="flex-1">
                <span className={`text-sm font-semibold ${result.pass ? 'text-[#22c55e]' : 'text-[#FF8C00]'}`}>
                  {Math.round(result.score * 100)}%
                </span>
                <span className="text-xs text-[#e5e2e1]/45"> — {result.pass ? 'Solid scope' : 'Review the notes above'}</span>
              </div>
              <button onClick={() => onComplete(result)} className={`h-11 px-6 text-sm ${PRIMARY_BTN}`}>Continue</button>
            </>
          ) : (
            <>
              <div className="flex-1 text-xs text-[#e5e2e1]/45">{selected.size} item{selected.size === 1 ? '' : 's'} selected</div>
              <button onClick={() => setGraded(true)} className={`h-11 px-6 text-sm ${PRIMARY_BTN}`}>Grade Scope Sheet</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Terminology drill panel ──

function GlossaryDrillPanel({ glossary, onBack, onComplete }: {
  glossary: GlossaryDrill
  onBack?: () => void
  onComplete: (r: TermsResult) => void
}) {
  const [idx, setIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)

  const card = glossary.cards[idx]
  const isLast = idx === glossary.cards.length - 1

  // Shuffled options for multiple-choice cards (stable per card)
  const options = useMemo(() => {
    if (!card.distractors?.length) return null
    return [card.definition, ...card.distractors]
      .map(v => ({ v, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map(x => x.v)
  }, [card])

  const answered = options ? picked !== null : flipped

  const advance = () => {
    if (isLast) {
      onComplete({ correct: correctCount, total: glossary.cards.length })
      return
    }
    setIdx(idx + 1); setFlipped(false); setPicked(null)
  }

  const pickOption = (opt: string) => {
    if (picked !== null) return
    setPicked(opt)
    if (opt === card.definition) setCorrectCount(c => c + 1)
  }

  const selfGrade = (gotIt: boolean) => {
    if (gotIt) setCorrectCount(c => c + 1)
    advance()
  }

  return (
    <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className={`${PANEL} w-[min(94vw,560px)] p-7`}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-[#FF8C00] text-[10px] font-semibold uppercase tracking-widest">Terminology Drill</div>
          <div className="text-[10px] text-[#e5e2e1]/40">Card {idx + 1} / {glossary.cards.length}</div>
        </div>
        <p className="text-xs text-[#e5e2e1]/50 mb-5">{glossary.prompt}</p>

        {options ? (
          // ── Multiple choice ──
          <>
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-widest text-[#e5e2e1]/40 mb-1">Define the term</div>
              <h3 className="text-xl font-bold">{card.term}</h3>
            </div>
            <div className="space-y-2 mb-5">
              {options.map(opt => {
                let cls = `bg-[#1c1b1b] ${GHOST} hover:bg-[#2a2a2a]`
                if (picked !== null) {
                  if (opt === card.definition) cls = 'bg-[#22c55e]/10 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.4)]'
                  else if (opt === picked) cls = 'bg-red-500/10 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.4)]'
                  else cls = `bg-[#1c1b1b] ${GHOST} opacity-50`
                }
                return (
                  <button
                    key={opt}
                    onClick={() => pickOption(opt)}
                    disabled={picked !== null}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm leading-snug transition-colors ${cls}`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            {picked !== null && card.note && (
              <p className="text-xs text-[#e5e2e1]/55 leading-snug mb-5">{card.note}</p>
            )}
            <div className="flex gap-3">
              {onBack && idx === 0 && (
                <button onClick={onBack} className={`h-11 px-4 text-sm ${GHOST_BTN}`}>Back</button>
              )}
              <button onClick={advance} disabled={!answered} className={`flex-1 h-11 text-sm ${PRIMARY_BTN}`}>
                {isLast ? 'Finish' : 'Next Card'}
              </button>
            </div>
          </>
        ) : (
          // ── Flip card ──
          <>
            <button
              onClick={() => setFlipped(true)}
              className={`w-full min-h-[160px] rounded-xl px-5 py-6 mb-5 text-left transition-colors ${
                flipped ? `bg-[#1c1b1b] ${GHOST}` : `bg-[#2a2a2a] ${GHOST} hover:bg-[#353534]`
              }`}
            >
              {flipped ? (
                <>
                  <div className="text-[10px] uppercase tracking-widest text-[#e5e2e1]/40 mb-1">{card.term}</div>
                  <p className="text-sm text-[#e5e2e1]/85 leading-snug">{card.definition}</p>
                  {card.note && <p className="text-xs text-[#e5e2e1]/50 leading-snug mt-2">{card.note}</p>}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <h3 className="text-xl font-bold mb-1">{card.term}</h3>
                  <span className="text-[11px] text-[#e5e2e1]/40">Tap to reveal definition</span>
                </div>
              )}
            </button>
            {flipped ? (
              <div className="flex gap-3">
                <button onClick={() => selfGrade(false)} className={`flex-1 h-11 text-sm ${GHOST_BTN}`}>Missed it</button>
                <button onClick={() => selfGrade(true)} className={`flex-1 h-11 text-sm ${PRIMARY_BTN}`}>Got it</button>
              </div>
            ) : (
              <div className="flex gap-3">
                {onBack && idx === 0 && (
                  <button onClick={onBack} className={`h-11 px-4 text-sm ${GHOST_BTN}`}>Back</button>
                )}
                <button onClick={() => setFlipped(true)} className={`flex-1 h-11 text-sm ${GHOST_BTN}`}>Reveal</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
