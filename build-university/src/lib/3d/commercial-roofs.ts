import * as THREE from 'three'

// ════════════════════════════════════════════════════════════════════════════════
// COMMERCIAL HOTEL — ROOF SYSTEMS
// Flat BUR roofs (wings), terracotta tile hip roofs (tower, south wing),
// cupola, corner turrets, porte cochere barrel vault
// ════════════════════════════════════════════════════════════════════════════════

// Import MeshDef from complex-house (canonical type)
import type { MeshDef } from './complex-house'

// ── Coordinate Constants (from Architect spec) ──
const G = -16.7                           // ground level
const FLOOR_H = 3.33                      // floor-to-floor height
const LOBBY_H = 4.0                       // ground floor height

// Wing tops (wall plate elevations)
const MAIN_TOP = G + LOBBY_H + 4 * FLOOR_H   // 0.62  — Main Tower (4 upper floors)
const WING_TOP = G + LOBBY_H + 3 * FLOOR_H   // -2.71 — East/West Wings (3 upper floors)
const SOUTH_TOP = G + LOBBY_H + 2 * FLOOR_H  // -6.04 — South Wing (2 upper floors)

// ── Main Tower footprint ──
const MT_W = 14                           // tower width (X)
const MT_D = 14                           // tower depth (Z)
const MT_HW = MT_W / 2                    // 7
const MT_HD = MT_D / 2                    // 7

// ── East Wing footprint ──
const EW_L = MT_HW                        // 7
const EW_R = MT_HW + 20                   // 27
const EW_F = 6                            // front Z
const EW_B = -6                           // back Z
const EW_W = EW_R - EW_L                  // 20
const EW_D = EW_F - EW_B                  // 12
const EW_CX = (EW_L + EW_R) / 2           // 17
const EW_CZ = (EW_F + EW_B) / 2           // 0

// ── West Wing footprint (mirror) ──
const WW_R = -MT_HW                       // -7
const WW_L = -MT_HW - 20                  // -27
const WW_F = 6
const WW_B = -6
const WW_W = WW_R - WW_L                  // 20
const WW_D = WW_F - WW_B                  // 12
const WW_CX = (WW_L + WW_R) / 2           // -17
const WW_CZ = (WW_F + WW_B) / 2           // 0

// ── South Wing footprint ──
const SW_L = -10
const SW_R = 10
const SW_F = -MT_HD                       // -7
const SW_B = -MT_HD - 20                  // -27
const SW_W = SW_R - SW_L                  // 20
const SW_D = SW_F - SW_B                  // 20
const SW_CX = (SW_L + SW_R) / 2           // 0
const SW_CZ = (SW_F + SW_B) / 2           // -17

// ── Porte Cochere ──
const PC_L = -5
const PC_R = 5
const PC_F = MT_HD                        // 7
const PC_B = MT_HD + 6                    // 13
const PC_CX = 0
const PC_CZ = (PC_F + PC_B) / 2           // 10
const PC_TOP = G + LOBBY_H                // -12.7

// ── Parapet height ──
const PARAPET_H = 1.0

// ── Roof pitches ──
// Main Tower: 6:12 pitch, half-depth = 7, rise = 3.5
const MT_RISE = MT_HD * 6 / 12            // 3.5
const MT_RIDGE_Y = MAIN_TOP + MT_RISE     // 4.12

// South Wing: 5:12 pitch, half-width = 10, rise = 4.17
const SW_HALF_SHORT = (SW_R - SW_L) / 2   // 10
const SW_RISE = SW_HALF_SHORT * 5 / 12    // 4.17
const SW_RIDGE_Y = SOUTH_TOP + SW_RISE    // -1.87

// ── Overhang ──
const OVH = 0.6

// ════════════════════════════════════════════════════════════════════════════════
// MATERIALS
// ════════════════════════════════════════════════════════════════════════════════

function procTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, rx = 1, ry = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry)
  return t
}

// Terracotta barrel tile — orange-red with half-cylinder rows
let _terracottaTex: THREE.CanvasTexture | null = null
function makeTerracottaTex(): THREE.CanvasTexture {
  return procTex(512, 512, ctx => {
    ctx.fillStyle = '#B85C38'; ctx.fillRect(0, 0, 512, 512)
    // Barrel tile rows
    for (let y = 0; y < 512; y += 40) {
      // Barrel highlight
      const g = ctx.createLinearGradient(0, y, 0, y + 40)
      g.addColorStop(0, 'rgba(255,200,150,0.2)')
      g.addColorStop(0.4, 'rgba(255,255,255,0.1)')
      g.addColorStop(0.6, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,0,0.15)')
      ctx.fillStyle = g; ctx.fillRect(0, y, 512, 40)
      // Shadow line between rows
      ctx.strokeStyle = 'rgba(80,30,10,0.3)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke()
    }
    // Vertical seams (staggered)
    for (let y = 0; y < 512; y += 80) {
      const offset = (y % 160 < 80) ? 0 : 42
      for (let x = offset; x < 512; x += 85) {
        ctx.strokeStyle = 'rgba(100,40,15,0.2)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 40); ctx.stroke()
      }
    }
    // Surface variation
    for (let i = 0; i < 8000; i++) {
      const v = Math.random()
      ctx.fillStyle = `rgba(${160 + v * 40 | 0},${70 + v * 30 | 0},${30 + v * 30 | 0},0.06)`
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2)
    }
  }, 4, 4)
}

function terracottaMat(): THREE.MeshStandardMaterial {
  if (!_terracottaTex) _terracottaTex = makeTerracottaTex()
  const t = _terracottaTex.clone(); t.needsUpdate = true
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.78, color: 0xB85C38 })
}

// Copper patina — green aged copper
function copperPatinaMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x5A8A6A, roughness: 0.45, metalness: 0.6, envMapIntensity: 0.4
  })
}

// Parapet CMU wall
function parapetMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x9A9488, roughness: 0.9 })
}

// Aluminum coping cap
function copingMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0xC0BEB8, roughness: 0.25, metalness: 0.7 })
}

// BUR membrane — black smooth
function burMembraneMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.4 })
}

// Polyiso insulation — yellow-green foam
function isoMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0xA8B840, roughness: 0.85 })
}

// Gravel ballast — grey aggregate
let _gravelTex: THREE.CanvasTexture | null = null
function makeGravelTex(): THREE.CanvasTexture {
  return procTex(256, 256, ctx => {
    ctx.fillStyle = '#8A8880'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 10000; i++) {
      const v = 100 + Math.random() * 80 | 0
      const s = 1 + Math.random() * 3
      ctx.fillStyle = `rgba(${v},${v - 5},${v - 10},0.5)`
      ctx.beginPath()
      ctx.ellipse(Math.random() * 256, Math.random() * 256, s, s * 0.7, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
  }, 6, 6)
}

function gravelMat(): THREE.MeshStandardMaterial {
  if (!_gravelTex) _gravelTex = makeGravelTex()
  const t = _gravelTex.clone(); t.needsUpdate = true
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })
}

// Tile ridge cap
function ridgeCapMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0xA04828, roughness: 0.7 })
}

// Underlayment (beneath tile)
function tileUnderlayMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x2A2A2A, roughness: 0.9 })
}

// Glulam timber
function glulamMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0xC4A86C, roughness: 0.7 })
}

// Drain strainer (metal grate)
function drainMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x505050, roughness: 0.3, metalness: 0.8 })
}

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════════

function box(w: number, h: number, d: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(w, h, d)
}

function quadGeo(v0: number[], v1: number[], v2: number[], v3: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...v0, ...v1, ...v2, ...v0, ...v2, ...v3]), 3))
  g.computeVertexNormals()
  return g
}

function triGeo(v0: number[], v1: number[], v2: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...v0, ...v1, ...v2]), 3))
  g.computeVertexNormals()
  return g
}

// ════════════════════════════════════════════════════════════════════════════════
// ROOF GROUPS REGISTRY
// ════════════════════════════════════════════════════════════════════════════════

export const ROOF_GROUPS = [
  'parapet_walls',
  'parapet_cap_flash',
  'bur_insulation',
  'bur_membrane',
  'bur_gravel',
  'roof_drains',
  'scuppers',
  'terracotta_tile',
  'tile_ridge',
  'tile_underlayment',
  'cupola_base',
  'cupola_windows',
  'cupola_dome',
  'cupola_finial',
  'corner_turrets',
  'corner_turret_caps',
  'barrel_vault_tile',
] as const

type AddFn = (
  geo: THREE.BufferGeometry, mat: THREE.Material,
  pos: [number, number, number], meshKey: string, group: string,
  explodeOrder: number, rot?: [number, number, number]
) => void

// ════════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════════════

export function addCommercialRoofs(parts: MeshDef[], add: AddFn): void {

  // ═══════════════════════════════════════════════════════════════════════════
  // A. FLAT BUR ROOFS — East Wing & West Wing (~50 parts)
  // ═══════════════════════════════════════════════════════════════════════════

  const wings = [
    { prefix: 'ew', cx: EW_CX, cz: EW_CZ, l: EW_L, r: EW_R, f: EW_F, b: EW_B, w: EW_W, d: EW_D, top: WING_TOP },
    { prefix: 'ww', cx: WW_CX, cz: WW_CZ, l: WW_L, r: WW_R, f: WW_F, b: WW_B, w: WW_W, d: WW_D, top: WING_TOP },
  ]

  for (const wing of wings) {
    const { prefix, cx, cz, l, r, f, b, w, d, top } = wing
    const parapetY = top + PARAPET_H / 2

    // ── Parapet walls (4 sides) ──
    add(box(w, PARAPET_H, 0.25), parapetMat(),
      [cx, parapetY, f], `${prefix}_parapet_f`, 'parapet_walls', 5)
    add(box(w, PARAPET_H, 0.25), parapetMat(),
      [cx, parapetY, b], `${prefix}_parapet_b`, 'parapet_walls', 5)
    add(box(0.25, PARAPET_H, d), parapetMat(),
      [l, parapetY, cz], `${prefix}_parapet_l`, 'parapet_walls', 5)
    add(box(0.25, PARAPET_H, d), parapetMat(),
      [r, parapetY, cz], `${prefix}_parapet_r`, 'parapet_walls', 5)

    // ── Parapet cap flashing (metal coping on top) ──
    add(box(w + 0.2, 0.08, 0.4), copingMat(),
      [cx, top + PARAPET_H + 0.04, f], `${prefix}_coping_f`, 'parapet_cap_flash', 5)
    add(box(w + 0.2, 0.08, 0.4), copingMat(),
      [cx, top + PARAPET_H + 0.04, b], `${prefix}_coping_b`, 'parapet_cap_flash', 5)
    add(box(0.4, 0.08, d + 0.4), copingMat(),
      [l, top + PARAPET_H + 0.04, cz], `${prefix}_coping_l`, 'parapet_cap_flash', 5)
    add(box(0.4, 0.08, d + 0.4), copingMat(),
      [r, top + PARAPET_H + 0.04, cz], `${prefix}_coping_r`, 'parapet_cap_flash', 5)

    // ── Polyiso insulation layer ──
    add(box(w - 0.6, 0.15, d - 0.6), isoMat(),
      [cx, top + 0.075, cz], `${prefix}_iso`, 'bur_insulation', 5)

    // ── BUR membrane ──
    add(box(w - 0.5, 0.04, d - 0.5), burMembraneMat(),
      [cx, top + 0.17, cz], `${prefix}_membrane`, 'bur_membrane', 5)

    // ── Gravel ballast surface ──
    add(box(w - 0.5, 0.08, d - 0.5), gravelMat(),
      [cx, top + 0.23, cz], `${prefix}_gravel`, 'bur_gravel', 5)

    // ── Roof drains (4 per wing) ──
    const drainPositions: [number, number][] = [
      [l + w * 0.25, b + d * 0.25],
      [l + w * 0.75, b + d * 0.25],
      [l + w * 0.25, b + d * 0.75],
      [l + w * 0.75, b + d * 0.75],
    ]
    for (let di = 0; di < drainPositions.length; di++) {
      const [dx, dz] = drainPositions[di]
      // Drain body (cylinder going through roof)
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 12), drainMat(),
        [dx, top + 0.05, dz], `${prefix}_drain_${di}`, 'roof_drains', 5)
      // Strainer dome
      add(new THREE.SphereGeometry(0.25, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), drainMat(),
        [dx, top + 0.25, dz], `${prefix}_strainer_${di}`, 'roof_drains', 5)
    }

    // ── Scuppers (through-wall openings — 2 per wing, on long sides) ──
    const scupperMat = new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.3, metalness: 0.6 })
    // Front wall scupper
    add(box(0.5, 0.3, 0.35), scupperMat,
      [cx - w * 0.2, top + 0.15, f], `${prefix}_scupper_f`, 'scuppers', 5)
    add(box(0.5, 0.3, 0.35), scupperMat,
      [cx + w * 0.2, top + 0.15, b], `${prefix}_scupper_b`, 'scuppers', 5)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // B. TERRACOTTA TILE HIP ROOFS — Main Tower & South Wing (~80 parts)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Tile underlayment (beneath tile, on sheathing) ──
  // Main Tower underlayment
  add(box(MT_W + 0.4, 0.03, MT_D + 0.4), tileUnderlayMat(),
    [0, MAIN_TOP + 0.015, 0], 'mt_underlay', 'tile_underlayment', 5)
  // South Wing underlayment
  add(box(SW_W + 0.4, 0.03, SW_D + 0.4), tileUnderlayMat(),
    [SW_CX, SOUTH_TOP + 0.015, SW_CZ], 'sw_underlay', 'tile_underlayment', 5)

  // ── Main Tower Hip Roof (6:12 pitch) ──
  // 4 slopes meeting at a central ridge
  // The tower is square (14x14), so the hip roof forms a pyramid
  // Eave corners at MAIN_TOP, peak at MT_RIDGE_Y
  const mtEY = MAIN_TOP - 0.02 // eave Y (slightly below wall top for visual)
  const mtPeak: [number, number, number] = [0, MT_RIDGE_Y, 0]

  // Front slope (triangle — square footprint means all faces are triangles)
  add(triGeo(
    [-MT_HW - OVH, mtEY, MT_HD + OVH],
    [MT_HW + OVH, mtEY, MT_HD + OVH],
    [0, MT_RIDGE_Y, 0]
  ), terracottaMat(), [0, 0, 0], 'mt_hip_f', 'terracotta_tile', 6)

  // Back slope
  add(triGeo(
    [MT_HW + OVH, mtEY, -MT_HD - OVH],
    [-MT_HW - OVH, mtEY, -MT_HD - OVH],
    [0, MT_RIDGE_Y, 0]
  ), terracottaMat(), [0, 0, 0], 'mt_hip_b', 'terracotta_tile', 6)

  // Right slope
  add(triGeo(
    [MT_HW + OVH, mtEY, MT_HD + OVH],
    [MT_HW + OVH, mtEY, -MT_HD - OVH],
    [0, MT_RIDGE_Y, 0]
  ), terracottaMat(), [0, 0, 0], 'mt_hip_r', 'terracotta_tile', 6)

  // Left slope
  add(triGeo(
    [-MT_HW - OVH, mtEY, -MT_HD - OVH],
    [-MT_HW - OVH, mtEY, MT_HD + OVH],
    [0, MT_RIDGE_Y, 0]
  ), terracottaMat(), [0, 0, 0], 'mt_hip_l', 'terracotta_tile', 6)

  // ── Main Tower hip/ridge cap tiles (4 hip lines from corners to peak) ──
  const mtCorners: [number, number][] = [
    [MT_HW, MT_HD], [MT_HW, -MT_HD], [-MT_HW, -MT_HD], [-MT_HW, MT_HD]
  ]
  for (let hi = 0; hi < mtCorners.length; hi++) {
    const [cx, cz] = mtCorners[hi]
    // Hip cap as a series of small boxes along the hip line
    const segments = 6
    for (let s = 0; s < segments; s++) {
      const t = (s + 0.5) / segments
      const hx = cx * (1 - t)
      const hy = mtEY + (MT_RIDGE_Y - mtEY) * t
      const hz = cz * (1 - t)
      const hipAngleY = Math.atan2(cx, cz)
      const hipAngleX = Math.atan2(MT_RISE, Math.sqrt(MT_HW * MT_HW + MT_HD * MT_HD))
      add(box(0.25, 0.1, 0.4), ridgeCapMat(),
        [hx, hy + 0.05, hz], `mt_hipcap_${hi}_${s}`, 'tile_ridge', 6,
        [hipAngleX, hipAngleY, 0])
    }
  }

  // ── South Wing Hip Roof (5:12 pitch) ──
  // Rectangular footprint (20 wide x 20 deep), hip roof with ridge
  // Short dimension = 20 (both same since square), so it's also a pyramid
  const swEY = SOUTH_TOP - 0.02
  const swPeak: [number, number, number] = [SW_CX, SW_RIDGE_Y, SW_CZ]

  // Since SW is square (20x20), it forms a pyramid like the tower
  // Front slope
  add(triGeo(
    [SW_L - OVH, swEY, SW_F + OVH],
    [SW_R + OVH, swEY, SW_F + OVH],
    [SW_CX, SW_RIDGE_Y, SW_CZ]
  ), terracottaMat(), [0, 0, 0], 'sw_hip_f', 'terracotta_tile', 6)

  // Back slope
  add(triGeo(
    [SW_R + OVH, swEY, SW_B - OVH],
    [SW_L - OVH, swEY, SW_B - OVH],
    [SW_CX, SW_RIDGE_Y, SW_CZ]
  ), terracottaMat(), [0, 0, 0], 'sw_hip_b', 'terracotta_tile', 6)

  // Right slope
  add(triGeo(
    [SW_R + OVH, swEY, SW_F + OVH],
    [SW_R + OVH, swEY, SW_B - OVH],
    [SW_CX, SW_RIDGE_Y, SW_CZ]
  ), terracottaMat(), [0, 0, 0], 'sw_hip_r', 'terracotta_tile', 6)

  // Left slope
  add(triGeo(
    [SW_L - OVH, swEY, SW_B - OVH],
    [SW_L - OVH, swEY, SW_F + OVH],
    [SW_CX, SW_RIDGE_Y, SW_CZ]
  ), terracottaMat(), [0, 0, 0], 'sw_hip_l', 'terracotta_tile', 6)

  // ── South Wing hip cap tiles (4 hip lines) ──
  const swCorners: [number, number][] = [
    [SW_R, SW_F], [SW_R, SW_B], [SW_L, SW_B], [SW_L, SW_F]
  ]
  for (let hi = 0; hi < swCorners.length; hi++) {
    const [cx, cz] = swCorners[hi]
    const segments = 8
    for (let s = 0; s < segments; s++) {
      const t = (s + 0.5) / segments
      const hx = cx + (SW_CX - cx) * t
      const hy = swEY + (SW_RIDGE_Y - swEY) * t
      const hz = cz + (SW_CZ - cz) * t
      const hipAngleY = Math.atan2(cx - SW_CX, cz - SW_CZ)
      const hipLen = Math.sqrt((SW_R - SW_CX) ** 2 + (SW_F - SW_CZ) ** 2)
      const hipAngleX = Math.atan2(SW_RISE, hipLen)
      add(box(0.25, 0.1, 0.4), ridgeCapMat(),
        [hx, hy + 0.05, hz], `sw_hipcap_${hi}_${s}`, 'tile_ridge', 6,
        [hipAngleX, hipAngleY, 0])
    }
  }

  // ── Additional tile detail: eave trim (fascia tiles) ──
  // Main tower eave trim (4 sides)
  add(box(MT_W + 2 * OVH, 0.12, 0.15), ridgeCapMat(),
    [0, mtEY - 0.06, MT_HD + OVH], 'mt_eave_trim_f', 'terracotta_tile', 6)
  add(box(MT_W + 2 * OVH, 0.12, 0.15), ridgeCapMat(),
    [0, mtEY - 0.06, -MT_HD - OVH], 'mt_eave_trim_b', 'terracotta_tile', 6)
  add(box(0.15, 0.12, MT_D + 2 * OVH), ridgeCapMat(),
    [MT_HW + OVH, mtEY - 0.06, 0], 'mt_eave_trim_r', 'terracotta_tile', 6)
  add(box(0.15, 0.12, MT_D + 2 * OVH), ridgeCapMat(),
    [-MT_HW - OVH, mtEY - 0.06, 0], 'mt_eave_trim_l', 'terracotta_tile', 6)

  // South wing eave trim (4 sides)
  add(box(SW_W + 2 * OVH, 0.12, 0.15), ridgeCapMat(),
    [SW_CX, swEY - 0.06, SW_F + OVH], 'sw_eave_trim_f', 'terracotta_tile', 6)
  add(box(SW_W + 2 * OVH, 0.12, 0.15), ridgeCapMat(),
    [SW_CX, swEY - 0.06, SW_B - OVH], 'sw_eave_trim_b', 'terracotta_tile', 6)
  add(box(0.15, 0.12, SW_D + 2 * OVH), ridgeCapMat(),
    [SW_R + OVH, swEY - 0.06, SW_CZ], 'sw_eave_trim_r', 'terracotta_tile', 6)
  add(box(0.15, 0.12, SW_D + 2 * OVH), ridgeCapMat(),
    [SW_L - OVH, swEY - 0.06, SW_CZ], 'sw_eave_trim_l', 'terracotta_tile', 6)

  // ═══════════════════════════════════════════════════════════════════════════
  // C. CUPOLA (~20 parts)
  // ═══════════════════════════════════════════════════════════════════════════

  const CUPOLA_BASE_Y = MT_RIDGE_Y
  const CUPOLA_DRUM_H = 1.5
  const CUPOLA_R = 2.0
  const CUPOLA_TOP = CUPOLA_BASE_Y + CUPOLA_DRUM_H

  // ── Octagonal drum ──
  add(new THREE.CylinderGeometry(CUPOLA_R, CUPOLA_R, CUPOLA_DRUM_H, 8),
    new THREE.MeshStandardMaterial({ color: 0xE8E0D0, roughness: 0.7 }),
    [0, CUPOLA_BASE_Y + CUPOLA_DRUM_H / 2, 0], 'cupola_drum', 'cupola_base', 7)

  // ── Base molding ring ──
  add(new THREE.CylinderGeometry(CUPOLA_R + 0.15, CUPOLA_R + 0.15, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0xD0C8B8, roughness: 0.6 }),
    [0, CUPOLA_BASE_Y + 0.06, 0], 'cupola_base_mold', 'cupola_base', 7)

  // ── Top cornice ring ──
  add(new THREE.CylinderGeometry(CUPOLA_R + 0.1, CUPOLA_R + 0.1, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0xD0C8B8, roughness: 0.6 }),
    [0, CUPOLA_TOP - 0.05, 0], 'cupola_top_mold', 'cupola_base', 7)

  // ── 8 arched windows ──
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x6090B0, roughness: 0.1, transparent: true, opacity: 0.5
  })
  const winFrameMat = new THREE.MeshStandardMaterial({ color: 0xE0D8C8, roughness: 0.5 })
  for (let wi = 0; wi < 8; wi++) {
    const angle = (wi / 8) * Math.PI * 2
    const wx = Math.sin(angle) * (CUPOLA_R - 0.05)
    const wz = Math.cos(angle) * (CUPOLA_R - 0.05)
    const wy = CUPOLA_BASE_Y + CUPOLA_DRUM_H / 2

    // Window frame
    add(box(0.6, 0.9, 0.08), winFrameMat,
      [wx, wy, wz], `cupola_winframe_${wi}`, 'cupola_windows', 7,
      [0, angle, 0])
    // Window glass
    add(box(0.45, 0.7, 0.04), winMat,
      [wx, wy, wz], `cupola_winglass_${wi}`, 'cupola_windows', 7,
      [0, angle, 0])
  }

  // ── Copper dome (hemisphere) ──
  const domeR = CUPOLA_R + 0.05
  const domeGeo = new THREE.SphereGeometry(domeR, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  add(domeGeo, copperPatinaMat(),
    [0, CUPOLA_TOP, 0], 'cupola_dome', 'cupola_dome', 7)

  // ── Dome transition ring ──
  add(new THREE.TorusGeometry(domeR, 0.06, 8, 16),
    copperPatinaMat(),
    [0, CUPOLA_TOP, 0], 'cupola_dome_ring', 'cupola_dome', 7,
    [Math.PI / 2, 0, 0])

  // ── Finial/spire ──
  const spireBaseY = CUPOLA_TOP + domeR - 0.1
  // Spire cone
  add(new THREE.ConeGeometry(0.12, 1.2, 8), copperPatinaMat(),
    [0, spireBaseY + 0.6, 0], 'cupola_spire', 'cupola_finial', 7)
  // Spire ball
  add(new THREE.SphereGeometry(0.15, 8, 8), copperPatinaMat(),
    [0, spireBaseY + 1.2 + 0.15, 0], 'cupola_spire_ball', 'cupola_finial', 7)
  // Spire tip
  add(new THREE.ConeGeometry(0.04, 0.3, 6), copperPatinaMat(),
    [0, spireBaseY + 1.2 + 0.3 + 0.15, 0], 'cupola_spire_tip', 'cupola_finial', 7)

  // ═══════════════════════════════════════════════════════════════════════════
  // D. CORNER TURRETS (4 x ~5 parts = 20)
  // ═══════════════════════════════════════════════════════════════════════════

  const TURRET_R = 1.2
  const TURRET_H = 2.5          // extends above wall top
  const TURRET_CAP_H = 2.0      // conical cap height
  const turretCorners: [number, number, string][] = [
    [MT_HW, MT_HD, 'ne'],
    [MT_HW, -MT_HD, 'se'],
    [-MT_HW, -MT_HD, 'sw'],
    [-MT_HW, MT_HD, 'nw'],
  ]

  for (const [tx, tz, label] of turretCorners) {
    const turretBaseY = MAIN_TOP - 1.0  // starts below wall top
    const turretTopY = MAIN_TOP + TURRET_H

    // Turret cylinder body
    add(new THREE.CylinderGeometry(TURRET_R, TURRET_R, TURRET_H + 1.0, 12),
      new THREE.MeshStandardMaterial({ color: 0xD8D0C0, roughness: 0.75 }),
      [tx, turretBaseY + (TURRET_H + 1.0) / 2, tz],
      `turret_${label}_body`, 'corner_turrets', 6)

    // Turret cornice ring
    add(new THREE.CylinderGeometry(TURRET_R + 0.12, TURRET_R + 0.12, 0.15, 12),
      new THREE.MeshStandardMaterial({ color: 0xC8C0B0, roughness: 0.6 }),
      [tx, turretTopY + 0.075, tz],
      `turret_${label}_cornice`, 'corner_turrets', 6)

    // Turret window (one per turret, facing outward)
    const outAngle = Math.atan2(tx, tz)
    const winX = tx + Math.sin(outAngle) * (TURRET_R - 0.02)
    const winZ = tz + Math.cos(outAngle) * (TURRET_R - 0.02)
    add(box(0.5, 0.8, 0.06), winFrameMat,
      [winX, MAIN_TOP + TURRET_H * 0.4, winZ],
      `turret_${label}_win`, 'corner_turrets', 6,
      [0, outAngle, 0])

    // Conical copper cap
    add(new THREE.ConeGeometry(TURRET_R + 0.15, TURRET_CAP_H, 12),
      copperPatinaMat(),
      [tx, turretTopY + TURRET_CAP_H / 2 + 0.1, tz],
      `turret_${label}_cap`, 'corner_turret_caps', 7)

    // Cap finial (small ball + spike)
    const capTopY = turretTopY + TURRET_CAP_H + 0.1
    add(new THREE.SphereGeometry(0.08, 6, 6), copperPatinaMat(),
      [tx, capTopY + 0.08, tz],
      `turret_${label}_finial`, 'corner_turret_caps', 7)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // E. PORTE COCHERE BARREL VAULT (~10 parts)
  // ═══════════════════════════════════════════════════════════════════════════

  const VAULT_SPAN = PC_R - PC_L           // 10
  const VAULT_DEPTH = PC_B - PC_F          // 6
  const VAULT_R = VAULT_SPAN / 2           // 5 — radius of barrel
  const VAULT_RISE = 2.5                   // how high the vault rises above PC_TOP
  const VAULT_BASE_Y = PC_TOP

  // ── 6 glulam arch ribs ──
  const ribCount = 6
  const ribSpacing = VAULT_DEPTH / (ribCount - 1)
  const ribWidth = 0.2
  const ribDepth = 0.15

  for (let ri = 0; ri < ribCount; ri++) {
    const ribZ = PC_F + ri * ribSpacing

    // Build arch rib from segments (approximate half-circle with boxes)
    const archSegments = 10
    for (let ai = 0; ai < archSegments; ai++) {
      const a0 = (ai / archSegments) * Math.PI
      const a1 = ((ai + 1) / archSegments) * Math.PI
      const aMid = (a0 + a1) / 2

      const segX = PC_CX + Math.cos(aMid) * VAULT_R * 0.9
      const segY = VAULT_BASE_Y + Math.sin(aMid) * VAULT_RISE
      const segLen = VAULT_R * Math.PI / archSegments * 0.95

      add(box(segLen, ribWidth, ribDepth), glulamMat(),
        [segX, segY, ribZ],
        `vault_rib_${ri}_${ai}`, 'barrel_vault_tile', 5,
        [0, 0, -(aMid - Math.PI / 2)])
    }
  }

  // ── Curved tile surface (approximated with segments) ──
  const tileSegments = 12
  for (let ti = 0; ti < tileSegments; ti++) {
    const a0 = (ti / tileSegments) * Math.PI
    const a1 = ((ti + 1) / tileSegments) * Math.PI
    const aMid = (a0 + a1) / 2

    const tileX = PC_CX + Math.cos(aMid) * (VAULT_R * 0.92)
    const tileY = VAULT_BASE_Y + Math.sin(aMid) * VAULT_RISE + 0.08
    const tileW = VAULT_R * Math.PI / tileSegments

    add(box(tileW, 0.06, VAULT_DEPTH + 0.2), terracottaMat(),
      [tileX, tileY, PC_CZ],
      `vault_tile_${ti}`, 'barrel_vault_tile', 5,
      [0, 0, -(aMid - Math.PI / 2)])
  }

  // ── Vault end caps (semicircle walls at front and back) ──
  // Approximated as triangular fan of thin wedges
  const endCapSegments = 8
  for (let side = 0; side < 2; side++) {
    const capZ = side === 0 ? PC_F : PC_B
    const label = side === 0 ? 'front' : 'back'
    for (let ei = 0; ei < endCapSegments; ei++) {
      const a0 = (ei / endCapSegments) * Math.PI
      const a1 = ((ei + 1) / endCapSegments) * Math.PI

      const v0: number[] = [PC_CX + Math.cos(a0) * VAULT_R * 0.9, VAULT_BASE_Y + Math.sin(a0) * VAULT_RISE, capZ]
      const v1: number[] = [PC_CX + Math.cos(a1) * VAULT_R * 0.9, VAULT_BASE_Y + Math.sin(a1) * VAULT_RISE, capZ]
      const v2: number[] = [PC_CX, VAULT_BASE_Y, capZ]

      add(triGeo(v0, v1, v2),
        new THREE.MeshStandardMaterial({ color: 0xD8D0C0, roughness: 0.8 }),
        [0, 0, 0],
        `vault_endcap_${label}_${ei}`, 'barrel_vault_tile', 5)
    }
  }
}
