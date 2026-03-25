import * as THREE from 'three'
import type { MeshDef } from './complex-house'
import { addCommercialRoofs, ROOF_GROUPS } from './commercial-roofs'
import { addCommercialDetails, DETAIL_GROUPS } from './commercial-details'

// ════════════════════════════════════════════════════════════════════════════════
// COMMERCIAL HOTEL MODEL — Mediterranean Revival
// Foundation, structural frame, and exterior walls (Pass 1–3)
// Every mesh has a meshKey + group for lesson control
// ════════════════════════════════════════════════════════════════════════════════

// ── Coordinate constants (1 unit = 3 feet) ──
const G = -16.7                    // ground level
const STORY_H = 3.33               // 10ft standard floor
const STORY_1_H = 4.0              // 12ft ground floor
const TH = 0.20                    // wall thickness

// ── Wing definitions ──
// Main Tower: X[-10,10] Z[-7,7], 5 stories
const MT_L = -10, MT_R = 10, MT_F = 7, MT_B = -7
const MT_W = MT_R - MT_L           // 20
const MT_D = MT_F - MT_B           // 14
const MT_CX = (MT_L + MT_R) / 2   // 0
const MT_CZ = (MT_F + MT_B) / 2   // 0
const MT_FLOORS = 5

// East Wing: X[10,40] Z[-5,5], 4 stories
const EW_L = 10, EW_R = 40, EW_F = 5, EW_B = -5
const EW_W = EW_R - EW_L          // 30
const EW_D = EW_F - EW_B          // 10
const EW_CX = (EW_L + EW_R) / 2   // 25
const EW_CZ = (EW_F + EW_B) / 2   // 0
const EW_FLOORS = 4

// West Wing: X[-40,-10] Z[-5,5], 4 stories
const WW_L = -40, WW_R = -10, WW_F = 5, WW_B = -5
const WW_W = WW_R - WW_L          // 30
const WW_D = WW_F - WW_B          // 10
const WW_CX = (WW_L + WW_R) / 2   // -25
const WW_CZ = (WW_F + WW_B) / 2   // 0
const WW_FLOORS = 4

// South Wing: X[-8,8] Z[7,27], 3 stories
const SW_L = -8, SW_R = 8, SW_F = 27, SW_B = 7
const SW_W = SW_R - SW_L           // 16
const SW_D = SW_F - SW_B           // 20
const SW_CX = (SW_L + SW_R) / 2   // 0
const SW_CZ = (SW_F + SW_B) / 2   // 17
const SW_FLOORS = 3

// Porte Cochere: X[-7,7] Z[27,35], 1 story open columns
const PC_L = -7, PC_R = 7, PC_F = 35, PC_B = 27
const PC_W = PC_R - PC_L           // 14
const PC_D = PC_F - PC_B           // 8
const PC_CX = (PC_L + PC_R) / 2   // 0
const PC_CZ = (PC_F + PC_B) / 2   // 31
const PC_FLOORS = 1

// Pool Deck: X[10,34] Z[7,23], ground level
const PD_L = 10, PD_R = 34, PD_F = 23, PD_B = 7
const PD_W = PD_R - PD_L           // 24
const PD_D = PD_F - PD_B           // 16
const PD_CX = (PD_L + PD_R) / 2   // 22
const PD_CZ = (PD_F + PD_B) / 2   // 15

// Parking Structure: X[-40,-10] Z[-25,-5], 2 stories
const PK_L = -40, PK_R = -10, PK_F = -5, PK_B = -25
const PK_W = PK_R - PK_L           // 30
const PK_D = PK_F - PK_B           // 20
const PK_CX = (PK_L + PK_R) / 2   // -25
const PK_CZ = (PK_F + PK_B) / 2   // -15
const PK_FLOORS = 2

// ── Procedural Texture Generator ──
function procTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, rx = 1, ry = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry)
  return t
}

// ── Material Texture Makers ──

// Salmon pink stucco with sand texture
function makeStuccoTex(): THREE.CanvasTexture {
  return procTex(512, 512, ctx => {
    ctx.fillStyle = '#D4887A'; ctx.fillRect(0, 0, 512, 512)
    // Sand / aggregate noise
    for (let i = 0; i < 15000; i++) {
      const r = 180 + Math.random() * 40 | 0
      const g = 110 + Math.random() * 30 | 0
      const b = 90 + Math.random() * 40 | 0
      ctx.fillStyle = `rgba(${r},${g},${b},${0.04 + Math.random() * 0.06})`
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2)
    }
    // Subtle horizontal trowel marks
    for (let y = 0; y < 512; y += 48) {
      ctx.strokeStyle = 'rgba(0,0,0,0.03)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, y + Math.random() * 4); ctx.lineTo(512, y + Math.random() * 4); ctx.stroke()
    }
  }, 4, 4)
}

// Concrete foundation with form lines
function makeFoundTex(): THREE.CanvasTexture {
  return procTex(256, 256, ctx => {
    ctx.fillStyle = '#A09888'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 5000; i++) {
      const v = 140 + Math.random() * 50 | 0
      ctx.fillStyle = `rgba(${v},${v - 10},${v - 20},0.15)`
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2)
    }
    for (let y = 0; y < 256; y += 64) {
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke()
    }
  }, 3, 2)
}

// ── Texture cache ──
let _stuccoTex: THREE.CanvasTexture | null = null
let _foundTex: THREE.CanvasTexture | null = null

function stuccoMat(rx = 4, ry = 4): THREE.MeshStandardMaterial {
  if (!_stuccoTex) _stuccoTex = makeStuccoTex()
  const t = _stuccoTex.clone(); t.repeat.set(rx, ry); t.needsUpdate = true
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 })
}

function foundMat(): THREE.MeshStandardMaterial {
  if (!_foundTex) _foundTex = makeFoundTex()
  const t = _foundTex.clone(); t.needsUpdate = true
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 })
}

function columnMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.80 })
}

function slabMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0xA0A0A0, roughness: 0.85 })
}

// ── Helpers ──
function box(w: number, h: number, d: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(w, h, d)
}

// ════════════════════════════════════════════════════════════════════════════════
// WING DEFINITIONS for loop generation
// ════════════════════════════════════════════════════════════════════════════════

interface WingDef {
  name: string
  l: number; r: number; f: number; b: number
  w: number; d: number
  cx: number; cz: number
  floors: number
  colGridX: number; colGridZ: number   // column grid counts
}

const WINGS: WingDef[] = [
  { name: 'mt', l: MT_L, r: MT_R, f: MT_F, b: MT_B, w: MT_W, d: MT_D, cx: MT_CX, cz: MT_CZ, floors: MT_FLOORS, colGridX: 4, colGridZ: 3 },
  { name: 'ew', l: EW_L, r: EW_R, f: EW_F, b: EW_B, w: EW_W, d: EW_D, cx: EW_CX, cz: EW_CZ, floors: EW_FLOORS, colGridX: 8, colGridZ: 2 },
  { name: 'ww', l: WW_L, r: WW_R, f: WW_F, b: WW_B, w: WW_W, d: WW_D, cx: WW_CX, cz: WW_CZ, floors: WW_FLOORS, colGridX: 8, colGridZ: 2 },
  { name: 'sw', l: SW_L, r: SW_R, f: SW_F, b: SW_B, w: SW_W, d: SW_D, cx: SW_CX, cz: SW_CZ, floors: SW_FLOORS, colGridX: 4, colGridZ: 5 },
  { name: 'pc', l: PC_L, r: PC_R, f: PC_F, b: PC_B, w: PC_W, d: PC_D, cx: PC_CX, cz: PC_CZ, floors: PC_FLOORS, colGridX: 4, colGridZ: 2 },
  { name: 'pk', l: PK_L, r: PK_R, f: PK_F, b: PK_B, w: PK_W, d: PK_D, cx: PK_CX, cz: PK_CZ, floors: PK_FLOORS, colGridX: 8, colGridZ: 5 },
]

// Pool deck has no columns/walls — just a slab
const POOL_DECK: WingDef = { name: 'pd', l: PD_L, r: PD_R, f: PD_F, b: PD_B, w: PD_W, d: PD_D, cx: PD_CX, cz: PD_CZ, floors: 0, colGridX: 0, colGridZ: 0 }

// ════════════════════════════════════════════════════════════════════════════════
// Helper: floor Y positions
// ════════════════════════════════════════════════════════════════════════════════
function floorBaseY(floor: number): number {
  // floor 0 = ground floor (12ft), floor 1+ = standard (10ft)
  if (floor === 0) return G
  return G + STORY_1_H + (floor - 1) * STORY_H
}

function floorHeight(floor: number): number {
  return floor === 0 ? STORY_1_H : STORY_H
}

function floorCenterY(floor: number): number {
  return floorBaseY(floor) + floorHeight(floor) / 2
}

function floorTopY(floor: number): number {
  return floorBaseY(floor) + floorHeight(floor)
}

// ════════════════════════════════════════════════════════════════════════════════
// GENERATE THE HOTEL
// ════════════════════════════════════════════════════════════════════════════════
let _cache: MeshDef[] | null = null
let _cacheKey: boolean | null = null

export function generateCommercialHotel(useWebGL2 = true): MeshDef[] {
  if (_cache && _cacheKey === useWebGL2) return _cache
  const parts: MeshDef[] = []

  function add(
    geo: THREE.BufferGeometry, mat: THREE.Material,
    pos: [number, number, number], meshKey: string, group: string,
    explodeOrder: number, rot?: [number, number, number]
  ) {
    parts.push({ geometry: geo, material: mat, position: pos, rotation: rot, meshKey, group, explodeOrder, castShadow: true, receiveShadow: true })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASS 1 — FOUNDATION (~27 parts)
  // ═══════════════════════════════════════════════════════════════════════════

  const FOOTING_H = 0.60   // spread footing height
  const FOOTING_PAD = 0.50  // footing extends beyond wing edges
  const SLAB_H = 0.30       // foundation slab thickness

  // Spread footings — one per wing
  for (const wing of WINGS) {
    add(
      box(wing.w + FOOTING_PAD, FOOTING_H, wing.d + FOOTING_PAD),
      foundMat(),
      [wing.cx, G - FOOTING_H / 2, wing.cz],
      `found_spread_${wing.name}`, 'foundation_spread', 0
    )
  }
  // Pool deck footing
  add(
    box(POOL_DECK.w + FOOTING_PAD, FOOTING_H, POOL_DECK.d + FOOTING_PAD),
    foundMat(),
    [POOL_DECK.cx, G - FOOTING_H / 2, POOL_DECK.cz],
    'found_spread_pd', 'foundation_spread', 0
  )

  // Foundation slabs — one per wing
  for (const wing of WINGS) {
    add(
      box(wing.w, SLAB_H, wing.d),
      foundMat(),
      [wing.cx, G - SLAB_H / 2 + FOOTING_H / 2, wing.cz],
      `found_slab_${wing.name}`, 'foundation_slab', 0
    )
  }
  // Pool deck slab (thinner, at ground)
  add(
    box(POOL_DECK.w, 0.15, POOL_DECK.d),
    foundMat(),
    [POOL_DECK.cx, G - 0.075, POOL_DECK.cz],
    'found_slab_pd', 'foundation_slab', 0
  )

  // Transition footings between wings (at junctions)
  // MT ↔ EW junction
  add(box(1.0, FOOTING_H, Math.min(MT_D, EW_D) + FOOTING_PAD), foundMat(),
    [MT_R, G - FOOTING_H / 2, 0], 'found_spread_mt_ew', 'foundation_spread', 0)
  // MT ↔ WW junction
  add(box(1.0, FOOTING_H, Math.min(MT_D, WW_D) + FOOTING_PAD), foundMat(),
    [MT_L, G - FOOTING_H / 2, 0], 'found_spread_mt_ww', 'foundation_spread', 0)
  // MT ↔ SW junction
  add(box(Math.min(MT_W, SW_W) + FOOTING_PAD, FOOTING_H, 1.0), foundMat(),
    [0, G - FOOTING_H / 2, MT_F], 'found_spread_mt_sw', 'foundation_spread', 0)
  // SW ↔ PC junction
  add(box(Math.min(SW_W, PC_W) + FOOTING_PAD, FOOTING_H, 1.0), foundMat(),
    [0, G - FOOTING_H / 2, SW_F], 'found_spread_sw_pc', 'foundation_spread', 0)
  // WW ↔ PK junction
  add(box(WW_W + FOOTING_PAD, FOOTING_H, 1.0), foundMat(),
    [WW_CX, G - FOOTING_H / 2, WW_B], 'found_spread_ww_pk', 'foundation_spread', 0)
  // Transition slabs at junctions
  add(box(1.0, SLAB_H, Math.min(MT_D, EW_D)), foundMat(),
    [MT_R, G - SLAB_H / 2 + FOOTING_H / 2, 0], 'found_slab_mt_ew', 'foundation_slab', 0)
  add(box(1.0, SLAB_H, Math.min(MT_D, WW_D)), foundMat(),
    [MT_L, G - SLAB_H / 2 + FOOTING_H / 2, 0], 'found_slab_mt_ww', 'foundation_slab', 0)
  add(box(Math.min(MT_W, SW_W), SLAB_H, 1.0), foundMat(),
    [0, G - SLAB_H / 2 + FOOTING_H / 2, MT_F], 'found_slab_mt_sw', 'foundation_slab', 0)
  add(box(Math.min(SW_W, PC_W), SLAB_H, 1.0), foundMat(),
    [0, G - SLAB_H / 2 + FOOTING_H / 2, SW_F], 'found_slab_sw_pc', 'foundation_slab', 0)
  add(box(WW_W, SLAB_H, 1.0), foundMat(),
    [WW_CX, G - SLAB_H / 2 + FOOTING_H / 2, WW_B], 'found_slab_ww_pk', 'foundation_slab', 0)

  // ═══════════════════════════════════════════════════════════════════════════
  // PASS 2 — STRUCTURAL FRAME (~180 parts)
  // ═══════════════════════════════════════════════════════════════════════════

  const COL_SIZE = 0.40     // column cross-section
  const COL_INSET = 0.50    // columns inset from wing edge

  // --- Concrete columns per floor per wing ---
  for (const wing of WINGS) {
    for (let floor = 0; floor < wing.floors; floor++) {
      const fh = floorHeight(floor)
      const fcy = floorCenterY(floor)

      for (let ix = 0; ix <= wing.colGridX; ix++) {
        const x = wing.l + COL_INSET + ix * ((wing.w - 2 * COL_INSET) / wing.colGridX)
        for (let iz = 0; iz <= wing.colGridZ; iz++) {
          const z = wing.b + COL_INSET + iz * ((wing.d - 2 * COL_INSET) / wing.colGridZ)
          add(
            box(COL_SIZE, fh - 0.05, COL_SIZE),
            columnMat(),
            [x, fcy, z],
            `col_${wing.name}_f${floor}_${ix}_${iz}`, 'struct_columns', 2
          )
        }
      }
    }
  }

  // --- Floor slabs per wing per floor ---
  const SLAB_THICK = 0.25
  for (const wing of WINGS) {
    // Ground floor slab (at ground level)
    add(
      box(wing.w, SLAB_THICK, wing.d),
      slabMat(),
      [wing.cx, G + SLAB_THICK / 2, wing.cz],
      `slab_${wing.name}_g`, 'struct_slabs', 2
    )
    // Upper floor slabs
    for (let floor = 1; floor <= wing.floors; floor++) {
      const slabY = floorBaseY(floor)
      add(
        box(wing.w, SLAB_THICK, wing.d),
        slabMat(),
        [wing.cx, slabY + SLAB_THICK / 2, wing.cz],
        `slab_${wing.name}_f${floor}`, 'struct_slabs', 2
      )
    }
  }
  // Pool deck slab (structural)
  add(
    box(POOL_DECK.w, SLAB_THICK, POOL_DECK.d),
    slabMat(),
    [POOL_DECK.cx, G + SLAB_THICK / 2, POOL_DECK.cz],
    'slab_pd_g', 'struct_slabs', 2
  )

  // Roof-level slabs (flat roof for wings that have them)
  // East Wing top slab
  const ewTopY = floorBaseY(EW_FLOORS)
  add(box(EW_W, SLAB_THICK, EW_D), slabMat(),
    [EW_CX, ewTopY + SLAB_THICK / 2, EW_CZ], 'slab_ew_roof', 'struct_slabs', 2)
  // West Wing top slab
  const wwTopY = floorBaseY(WW_FLOORS)
  add(box(WW_W, SLAB_THICK, WW_D), slabMat(),
    [WW_CX, wwTopY + SLAB_THICK / 2, WW_CZ], 'slab_ww_roof', 'struct_slabs', 2)
  // Parking structure top slab
  const pkTopY = floorBaseY(PK_FLOORS)
  add(box(PK_W, SLAB_THICK, PK_D), slabMat(),
    [PK_CX, pkTopY + SLAB_THICK / 2, PK_CZ], 'slab_pk_roof', 'struct_slabs', 2)
  // Porte Cochere top slab
  const pcTopY = floorBaseY(PC_FLOORS)
  add(box(PC_W, SLAB_THICK, PC_D), slabMat(),
    [PC_CX, pcTopY + SLAB_THICK / 2, PC_CZ], 'slab_pc_roof', 'struct_slabs', 2)

  // ═══════════════════════════════════════════════════════════════════════════
  // PASS 3 — EXTERIOR WALLS (~128 parts)
  // ═══════════════════════════════════════════════════════════════════════════

  // Walls for each wing, per floor, per face (front/back/left/right)
  // Porte Cochere and Parking Structure get no front/back stucco (open)
  const WALL_WINGS = [
    { wing: WINGS[0], faces: ['front', 'back', 'left', 'right'] as const },  // Main Tower
    { wing: WINGS[1], faces: ['front', 'back', 'left', 'right'] as const },  // East Wing
    { wing: WINGS[2], faces: ['front', 'back', 'left', 'right'] as const },  // West Wing
    { wing: WINGS[3], faces: ['front', 'back', 'left', 'right'] as const },  // South Wing
    { wing: WINGS[5], faces: ['left', 'right'] as const },                    // Parking — sides only
  ]

  for (const { wing, faces } of WALL_WINGS) {
    for (let floor = 0; floor < wing.floors; floor++) {
      const fh = floorHeight(floor)
      const fcy = floorCenterY(floor)

      // Stucco repeat scaled to wing dimensions
      const rxLong = Math.max(2, Math.round(wing.w / 5))
      const rxShort = Math.max(2, Math.round(wing.d / 5))

      for (const face of faces) {
        let geo: THREE.BoxGeometry
        let pos: [number, number, number]
        let rx: number

        switch (face) {
          case 'front':
            geo = box(wing.w, fh, TH)
            pos = [wing.cx, fcy, wing.f]
            rx = rxLong
            break
          case 'back':
            geo = box(wing.w, fh, TH)
            pos = [wing.cx, fcy, wing.b]
            rx = rxLong
            break
          case 'left':
            geo = box(TH, fh, wing.d)
            pos = [wing.l, fcy, wing.cz]
            rx = rxShort
            break
          case 'right':
            geo = box(TH, fh, wing.d)
            pos = [wing.r, fcy, wing.cz]
            rx = rxShort
            break
        }

        add(
          geo!, stuccoMat(rx, 1), pos!,
          `wall_${wing.name}_f${floor}_${face}`, 'stucco_base', 3
        )
      }
    }
  }

  // Parking structure front/back walls (half-height parapets on upper level only)
  add(box(PK_W, STORY_1_H, TH), stuccoMat(6, 1),
    [PK_CX, floorCenterY(0), PK_F], 'wall_pk_f0_front', 'stucco_base', 3)
  add(box(PK_W, STORY_1_H, TH), stuccoMat(6, 1),
    [PK_CX, floorCenterY(0), PK_B], 'wall_pk_f0_back', 'stucco_base', 3)
  add(box(PK_W, STORY_H, TH), stuccoMat(6, 1),
    [PK_CX, floorCenterY(1), PK_F], 'wall_pk_f1_front', 'stucco_base', 3)
  add(box(PK_W, STORY_H, TH), stuccoMat(6, 1),
    [PK_CX, floorCenterY(1), PK_B], 'wall_pk_f1_back', 'stucco_base', 3)

  // Porte Cochere — no full walls, but parapet/beam outlines at top
  // Represented as thin slab edge beams on sides only
  for (let floor = 0; floor < PC_FLOORS; floor++) {
    const fh = floorHeight(floor)
    const fcy = floorCenterY(floor)
    // Left side
    add(box(TH, fh, PC_D), stuccoMat(2, 1),
      [PC_L, fcy, PC_CZ], `wall_pc_f${floor}_left`, 'stucco_base', 3)
    // Right side
    add(box(TH, fh, PC_D), stuccoMat(2, 1),
      [PC_R, fcy, PC_CZ], `wall_pc_f${floor}_right`, 'stucco_base', 3)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASS 4-6 — ROOFS (delegated to commercial-roofs.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  addCommercialRoofs(parts, add)

  // ═══════════════════════════════════════════════════════════════════════════
  // PASS 7-9 — DETAILS (delegated to commercial-details.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  addCommercialDetails(parts, add, useWebGL2)

  _cache = parts
  _cacheKey = useWebGL2
  return parts
}

/** All unique visibility groups in this model */
export const COMMERCIAL_VISIBILITY_GROUPS = [
  'foundation_spread',
  'foundation_slab',
  'struct_columns',
  'struct_slabs',
  'stucco_base',
  ...ROOF_GROUPS,
  ...DETAIL_GROUPS,
]
