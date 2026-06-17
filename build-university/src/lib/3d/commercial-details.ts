import * as THREE from 'three'

// ════════════════════════════════════════════════════════════════════════════════
// COMMERCIAL HOTEL — DETAIL ELEMENTS (Windows, Doors, MEP, Pool, Site)
// Geometry Builder C: ~400 parts for the commercial hotel model
// ════════════════════════════════════════════════════════════════════════════════

import type { MeshDef } from './complex-house'

// ── Coordinate constants (must match commercial-structure) ──
const G = -16.7
const STORY_1_H = 4.0
const STORY_H = 3.33

// Wing bounds
const MAIN_XL = -10, MAIN_XR = 10, MAIN_ZF = 7, MAIN_ZB = -7
const EAST_XL = 10, EAST_XR = 40, EAST_ZF = 5, EAST_ZB = -5
const WEST_XL = -40, WEST_XR = -10, WEST_ZF = 5, WEST_ZB = -5
const SOUTH_XL = -8, SOUTH_XR = 8, SOUTH_ZF = 7, SOUTH_ZB = 27
const PORTE_XL = -7, PORTE_XR = 7, PORTE_ZF = 27, PORTE_ZB = 35
const POOL_XL = 10, POOL_XR = 34, POOL_ZF = 7, POOL_ZB = 23
const PARK_XL = -40, PARK_XR = -10, PARK_ZB = -25, PARK_ZF_ACTUAL = -5

// Helpers
function box(w: number, h: number, d: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(w, h, d)
}

function cyl(rTop: number, rBot: number, h: number, seg = 12): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg)
}

/** Floor Y center for a given floor index (0-based) */
function floorY(floor: number): number {
  if (floor === 0) return G + STORY_1_H / 2
  return G + STORY_1_H + (floor - 0.5) * STORY_H
}

/** Floor base Y for a given floor index (0-based) */
function floorBaseY(floor: number): number {
  if (floor === 0) return G
  return G + STORY_1_H + (floor - 1) * STORY_H
}

// ── Window dimensions ──
const WIN_W = 0.8
const WIN_H = 1.2
const WIN_FRAME_D = 0.08
const WIN_GLASS_D = 0.04

// ── Arched window dimensions ──
const ARCH_W = 1.2
const ARCH_H = 2.0
const ARCH_FRAME_D = 0.1

// ════════════════════════════════════════════════════════════════════════════════
// ADD COMMERCIAL DETAILS
// ════════════════════════════════════════════════════════════════════════════════

type AddFn = (
  geo: THREE.BufferGeometry, mat: THREE.Material,
  pos: [number, number, number], meshKey: string, group: string,
  explodeOrder: number, rot?: [number, number, number]
) => void

export function addCommercialDetails(
  parts: MeshDef[],
  add: AddFn,
  useWebGL2: boolean
): void {
  // ── Shared materials ──
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a, roughness: 0.5, metalness: 0.3
  })

  const glassMat = useWebGL2
    ? new (THREE.MeshPhysicalMaterial as typeof THREE.MeshPhysicalMaterial)({
        color: 0x8aafc8, roughness: 0.02, metalness: 0.0,
        transmission: 0.85, thickness: 0.5, ior: 1.52,
        transparent: true, opacity: 0.95, envMapIntensity: 1.0,
      })
    : new THREE.MeshStandardMaterial({
        color: 0x8aafc8, roughness: 0.1, metalness: 0.0,
        transparent: true, opacity: 0.3,
      })

  const greyMetalMat = new THREE.MeshStandardMaterial({
    color: 0x888888, roughness: 0.6, metalness: 0.4
  })

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xb0a898, roughness: 0.9, metalness: 0.0
  })

  const castStoneMat = new THREE.MeshStandardMaterial({
    color: 0xe8dcc8, roughness: 0.7, metalness: 0.05
  })

  const tealWaterMat = new THREE.MeshStandardMaterial({
    color: 0x40b8c4, roughness: 0.1, metalness: 0.0,
    transparent: true, opacity: 0.7,
  })

  const darkVoidMat = new THREE.MeshStandardMaterial({
    color: 0x111111, roughness: 0.95, metalness: 0.0
  })

  const yellowStripeMat = new THREE.MeshStandardMaterial({
    color: 0xeeee44, roughness: 0.7
  })

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x8b6914, roughness: 0.9
  })

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x2d8a2d, roughness: 0.85
  })

  const signMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, roughness: 0.3, metalness: 0.6
  })

  // ══════════════════════════════════════════════════════════════════════════
  // A. STANDARD GUEST ROOM WINDOWS (~200 parts: frame + glass each)
  // ══════════════════════════════════════════════════════════════════════════

  /** Add a standard rectangular window (frame box + glass box) */
  function addWin(
    x: number, y: number, z: number,
    key: string, ry = 0
  ): void {
    add(
      box(WIN_W, WIN_H, WIN_FRAME_D), frameMat,
      [x, y, z], key + '_frame', 'windows_standard', 8,
      ry ? [0, ry, 0] : undefined
    )
    const off = 0.04
    add(
      box(WIN_W - 0.1, WIN_H - 0.1, WIN_GLASS_D), glassMat,
      [x + Math.sin(ry) * off, y, z + Math.cos(ry) * off],
      key + '_glass', 'windows_standard', 8,
      ry ? [0, ry, 0] : undefined
    )
  }

  // Window Y center per floor (centered in upper half of story)
  function winY(floor: number): number {
    const base = floorBaseY(floor)
    const h = floor === 0 ? STORY_1_H : STORY_H
    return base + h * 0.55
  }

  // ── East Wing front face (Z = EAST_ZF) — 8 windows x 4 floors ──
  const eastWinSpacing = (EAST_XR - EAST_XL - 2) / 8
  for (let f = 0; f < 4; f++) {
    const wy = winY(f)
    for (let i = 0; i < 8; i++) {
      const wx = EAST_XL + 1 + eastWinSpacing * (i + 0.5)
      addWin(wx, wy, EAST_ZF + 0.05, `win_east_front_f${f}_${i}`)
    }
  }

  // ── East Wing back face (Z = EAST_ZB) — 8 windows x 4 floors ──
  for (let f = 0; f < 4; f++) {
    const wy = winY(f)
    for (let i = 0; i < 8; i++) {
      const wx = EAST_XL + 1 + eastWinSpacing * (i + 0.5)
      addWin(wx, wy, EAST_ZB - 0.05, `win_east_back_f${f}_${i}`, Math.PI)
    }
  }

  // ── West Wing front face (Z = WEST_ZF) — 8 windows x 4 floors ──
  const westWinSpacing = (WEST_XR - WEST_XL - 2) / 8
  for (let f = 0; f < 4; f++) {
    const wy = winY(f)
    for (let i = 0; i < 8; i++) {
      const wx = WEST_XL + 1 + westWinSpacing * (i + 0.5)
      addWin(wx, wy, WEST_ZF + 0.05, `win_west_front_f${f}_${i}`)
    }
  }

  // ── West Wing back face (Z = WEST_ZB) — 8 windows x 4 floors ──
  for (let f = 0; f < 4; f++) {
    const wy = winY(f)
    for (let i = 0; i < 8; i++) {
      const wx = WEST_XL + 1 + westWinSpacing * (i + 0.5)
      addWin(wx, wy, WEST_ZB - 0.05, `win_west_back_f${f}_${i}`, Math.PI)
    }
  }

  // ── Main Tower front/back — 5 windows x 5 floors x 2 faces ──
  const mainWinSpacing = (MAIN_XR - MAIN_XL - 2) / 5
  for (let f = 0; f < 5; f++) {
    const wy = winY(f)
    for (let i = 0; i < 5; i++) {
      const wx = MAIN_XL + 1 + mainWinSpacing * (i + 0.5)
      addWin(wx, wy, MAIN_ZF + 0.05, `win_main_front_f${f}_${i}`)
      addWin(wx, wy, MAIN_ZB - 0.05, `win_main_back_f${f}_${i}`, Math.PI)
    }
  }

  // ── South Wing — 4 windows x 3 floors x 2 long faces (east/west sides) ──
  const southWinSpacing = (SOUTH_ZB - SOUTH_ZF - 2) / 4
  for (let f = 0; f < 3; f++) {
    const wy = winY(f)
    for (let i = 0; i < 4; i++) {
      const wz = SOUTH_ZF + 1 + southWinSpacing * (i + 0.5)
      // East face (X = SOUTH_XR)
      addWin(SOUTH_XR + 0.05, wy, wz, `win_south_east_f${f}_${i}`, Math.PI / 2)
      // West face (X = SOUTH_XL)
      addWin(SOUTH_XL - 0.05, wy, wz, `win_south_west_f${f}_${i}`, -Math.PI / 2)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // B. ARCHED WINDOWS — Ground floor, Main Tower & South Wing (~24 parts)
  // ══════════════════════════════════════════════════════════════════════════

  function makeArchShape(w: number, h: number): THREE.Shape {
    const shape = new THREE.Shape()
    const halfW = w / 2
    const rectH = h - halfW // rectangle portion below arch
    shape.moveTo(-halfW, 0)
    shape.lineTo(-halfW, rectH)
    // Semicircular arch top
    shape.absarc(0, rectH, halfW, Math.PI, 0, true)
    shape.lineTo(halfW, 0)
    shape.closePath()
    return shape
  }

  function addArchWin(
    x: number, y: number, z: number,
    key: string, ry = 0
  ): void {
    // Frame via ExtrudeGeometry
    const outerShape = makeArchShape(ARCH_W, ARCH_H)
    // Inner cutout
    const innerW = ARCH_W - 0.15
    const innerH = ARCH_H - 0.1
    const innerHalfW = innerW / 2
    const innerRectH = innerH - innerHalfW
    const hole = new THREE.Path()
    hole.moveTo(-innerHalfW, 0.05)
    hole.lineTo(-innerHalfW, innerRectH)
    hole.absarc(0, innerRectH, innerHalfW, Math.PI, 0, true)
    hole.lineTo(innerHalfW, 0.05)
    hole.closePath()
    outerShape.holes.push(hole)

    const frameGeo = new THREE.ExtrudeGeometry(outerShape, {
      depth: ARCH_FRAME_D, bevelEnabled: false
    })
    add(
      frameGeo, frameMat,
      [x, y, z], key + '_frame', 'windows_arched', 8,
      ry ? [0, ry, 0] : undefined
    )

    // Glass fill (solid extruded shape without hole)
    const glassShape = makeArchShape(innerW, innerH)
    const glassGeo = new THREE.ExtrudeGeometry(glassShape, {
      depth: WIN_GLASS_D, bevelEnabled: false
    })
    const off = 0.05
    add(
      glassGeo, glassMat,
      [x + Math.sin(ry) * off, y + 0.05, z + Math.cos(ry) * off],
      key + '_glass', 'windows_arched', 8,
      ry ? [0, ry, 0] : undefined
    )
  }

  // Main Tower ground floor arched windows — front face
  const archMainSpacing = (MAIN_XR - MAIN_XL - 2) / 4
  for (let i = 0; i < 4; i++) {
    const ax = MAIN_XL + 1 + archMainSpacing * (i + 0.5)
    addArchWin(ax, G + 0.3, MAIN_ZF + 0.05, `arch_main_front_${i}`)
  }

  // Main Tower ground floor arched windows — back face
  for (let i = 0; i < 4; i++) {
    const ax = MAIN_XL + 1 + archMainSpacing * (i + 0.5)
    addArchWin(ax, G + 0.3, MAIN_ZB - 0.05, `arch_main_back_${i}`, Math.PI)
  }

  // South Wing ground floor arched windows — east and west long faces
  const archSouthSpacing = (SOUTH_ZB - SOUTH_ZF - 2) / 2
  for (let i = 0; i < 2; i++) {
    const az = SOUTH_ZF + 1 + archSouthSpacing * (i + 0.5)
    addArchWin(SOUTH_XR + 0.05, G + 0.3, az, `arch_south_east_${i}`, Math.PI / 2)
    addArchWin(SOUTH_XL - 0.05, G + 0.3, az, `arch_south_west_${i}`, -Math.PI / 2)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // C. RTU / ROOFTOP HVAC UNITS (~12 parts)
  // ══════════════════════════════════════════════════════════════════════════

  const eastRoofY = G + STORY_1_H + 3 * STORY_H // top of 4-floor east wing
  const westRoofY = eastRoofY // same height

  // 3 units on East Wing roof
  for (let i = 0; i < 3; i++) {
    const rx = EAST_XL + 5 + i * 10
    const rz = 0
    // Curb
    add(
      box(2.0, 0.3, 1.5), greyMetalMat,
      [rx, eastRoofY + 0.15, rz],
      `rtu_east_curb_${i}`, 'rtu_units', 9
    )
    // Cabinet
    add(
      box(1.8, 1.0, 1.3), greyMetalMat,
      [rx, eastRoofY + 0.3 + 0.5, rz],
      `rtu_east_cab_${i}`, 'rtu_units', 9
    )
  }

  // 3 units on West Wing roof
  for (let i = 0; i < 3; i++) {
    const rx = WEST_XL + 5 + i * 10
    const rz = 0
    // Curb
    add(
      box(2.0, 0.3, 1.5), greyMetalMat,
      [rx, westRoofY + 0.15, rz],
      `rtu_west_curb_${i}`, 'rtu_units', 9
    )
    // Cabinet
    add(
      box(1.8, 1.0, 1.3), greyMetalMat,
      [rx, westRoofY + 0.3 + 0.5, rz],
      `rtu_west_cab_${i}`, 'rtu_units', 9
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // D. POOL (~8 parts)
  // ══════════════════════════════════════════════════════════════════════════

  const poolW = POOL_XR - POOL_XL
  const poolD = POOL_ZB - POOL_ZF
  const poolCX = (POOL_XL + POOL_XR) / 2
  const poolCZ = (POOL_ZF + POOL_ZB) / 2

  // Pool shell (walls — recessed box)
  const poolShellMat = new THREE.MeshStandardMaterial({
    color: 0x3a7ca5, roughness: 0.4, metalness: 0.0
  })
  // Pool bottom
  add(
    box(poolW - 1, 0.15, poolD - 1), poolShellMat,
    [poolCX, G - 1.5, poolCZ],
    'pool_bottom', 'pool_equipment', 11
  )
  // Pool walls (4 sides)
  add(
    box(poolW - 1, 1.5, 0.2), poolShellMat,
    [poolCX, G - 0.75, POOL_ZF + 0.6],
    'pool_wall_n', 'pool_equipment', 11
  )
  add(
    box(poolW - 1, 1.5, 0.2), poolShellMat,
    [poolCX, G - 0.75, POOL_ZB - 0.6],
    'pool_wall_s', 'pool_equipment', 11
  )
  add(
    box(0.2, 1.5, poolD - 1), poolShellMat,
    [POOL_XL + 0.6, G - 0.75, poolCZ],
    'pool_wall_w', 'pool_equipment', 11
  )
  add(
    box(0.2, 1.5, poolD - 1), poolShellMat,
    [POOL_XR - 0.6, G - 0.75, poolCZ],
    'pool_wall_e', 'pool_equipment', 11
  )

  // Water surface
  add(
    box(poolW - 1.5, 0.06, poolD - 1.5), tealWaterMat,
    [poolCX, G - 0.1, poolCZ],
    'pool_water', 'pool_equipment', 11
  )

  // Pool deck (concrete surround)
  add(
    box(poolW + 4, 0.12, poolD + 4), concreteMat,
    [poolCX, G - 0.01, poolCZ],
    'pool_deck', 'pool_equipment', 11
  )

  // Pool equipment pad
  add(
    box(2.5, 0.5, 1.5), concreteMat,
    [POOL_XR + 2, G + 0.25, POOL_ZB - 2],
    'pool_equip_pad', 'pool_equipment', 11
  )

  // ══════════════════════════════════════════════════════════════════════════
  // E. PARKING STRUCTURE DETAILS (~10 parts)
  // ══════════════════════════════════════════════════════════════════════════

  const parkW = PARK_XR - PARK_XL
  const parkCX = (PARK_XL + PARK_XR) / 2
  const parkCZ = (PARK_ZB + PARK_ZF_ACTUAL) / 2

  // Vehicle entry openings — 3 dark rectangles on front face (Z = PARK_ZF_ACTUAL)
  const entrySpacing = parkW / 4
  for (let i = 0; i < 3; i++) {
    const ex = PARK_XL + entrySpacing * (i + 1)
    add(
      box(3.0, 2.8, 0.15), darkVoidMat,
      [ex, G + 1.4, PARK_ZF_ACTUAL + 0.1],
      `parking_entry_${i}`, 'parking_details', 10
    )
  }

  // Top deck parking striping (yellow lines)
  const parkTopY = G + STORY_1_H + STORY_H // 2-floor parking
  for (let i = 0; i < 6; i++) {
    const sx = PARK_XL + 2 + i * 4.5
    add(
      box(0.1, 0.025, 4.5), yellowStripeMat,
      [sx, parkTopY + 0.02, parkCZ],
      `park_stripe_${i}`, 'parking_details', 10
    )
  }

  // Ramp indicator (diagonal stripe on side)
  add(
    box(0.1, 0.08, 8), yellowStripeMat,
    [PARK_XL + 0.1, G + STORY_1_H / 2, parkCZ],
    'park_ramp_stripe', 'parking_details', 10,
    [0.3, 0, 0] // slight angle
  )

  // ══════════════════════════════════════════════════════════════════════════
  // F. ARCADE COLUMNS (~16 parts)
  // ══════════════════════════════════════════════════════════════════════════

  // South Wing ground floor colonnade — columns along east and west faces
  const colH = STORY_1_H - 0.3
  const colR = 0.25

  // South Wing east colonnade
  const southColSpacing = (SOUTH_ZB - SOUTH_ZF) / 4
  for (let i = 0; i < 4; i++) {
    const cz = SOUTH_ZF + southColSpacing * (i + 0.5)
    add(
      cyl(colR, colR, colH, 16), castStoneMat,
      [SOUTH_XR + 0.5, G + colH / 2, cz],
      `arcade_south_east_${i}`, 'arcade_columns', 3
    )
  }

  // South Wing west colonnade
  for (let i = 0; i < 4; i++) {
    const cz = SOUTH_ZF + southColSpacing * (i + 0.5)
    add(
      cyl(colR, colR, colH, 16), castStoneMat,
      [SOUTH_XL - 0.5, G + colH / 2, cz],
      `arcade_south_west_${i}`, 'arcade_columns', 3
    )
  }

  // Porte cochere columns — front and back rows
  const porteColSpacing = (PORTE_XR - PORTE_XL) / 4
  for (let i = 0; i < 4; i++) {
    const cx = PORTE_XL + porteColSpacing * (i + 0.5)
    // Front row
    add(
      cyl(colR * 1.1, colR * 1.1, colH + 0.5, 16), castStoneMat,
      [cx, G + (colH + 0.5) / 2, PORTE_ZB + 0.3],
      `arcade_porte_front_${i}`, 'arcade_columns', 3
    )
    // Back row
    add(
      cyl(colR * 1.1, colR * 1.1, colH + 0.5, 16), castStoneMat,
      [cx, G + (colH + 0.5) / 2, PORTE_ZF + 0.3],
      `arcade_porte_back_${i}`, 'arcade_columns', 3
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // G. SIGNAGE (~4 parts)
  // ══════════════════════════════════════════════════════════════════════════

  const mainTopY = G + STORY_1_H + 4 * STORY_H // top of 5-floor main tower

  // Hotel sign on main tower front facade
  add(
    box(6, 1.0, 0.12), signMat,
    [0, mainTopY - 1.5, MAIN_ZF + 0.15],
    'sign_hotel_front', 'signage', 12
  )

  // Hotel sign backing panel
  add(
    box(7, 1.4, 0.06), new THREE.MeshStandardMaterial({
      color: 0x222222, roughness: 0.8
    }),
    [0, mainTopY - 1.5, MAIN_ZF + 0.08],
    'sign_hotel_backing', 'signage', 12
  )

  // Address numbers — smaller sign near entrance (south wing / porte cochere junction)
  add(
    box(2.0, 0.5, 0.08), signMat,
    [0, G + STORY_1_H - 0.5, PORTE_ZB + 0.15],
    'sign_address', 'signage', 12
  )

  // Porte cochere entry sign
  add(
    box(3.0, 0.4, 0.06), signMat,
    [0, G + colH + 0.6, (PORTE_ZF + PORTE_ZB) / 2],
    'sign_porte', 'signage', 12
  )

  // ══════════════════════════════════════════════════════════════════════════
  // H. LANDSCAPING (~10 parts)
  // ══════════════════════════════════════════════════════════════════════════

  const palmPositions: [number, number][] = [
    // Along porte cochere approach
    [-5, PORTE_ZB + 3],
    [5, PORTE_ZB + 3],
    // Pool area
    [POOL_XR + 3, POOL_ZF + 2],
    [POOL_XR + 3, POOL_ZB - 2],
    [POOL_XL - 2, POOL_ZB - 2],
  ]

  palmPositions.forEach(([px, pz], i) => {
    // Trunk
    add(
      cyl(0.15, 0.2, 5.0, 8), trunkMat,
      [px, G + 2.5, pz],
      `palm_trunk_${i}`, 'landscaping', 12
    )
    // Crown (sphere)
    add(
      new THREE.SphereGeometry(1.2, 8, 6), foliageMat,
      [px, G + 5.5, pz],
      `palm_crown_${i}`, 'landscaping', 12
    )
  })
}

// ════════════════════════════════════════════════════════════════════════════════
// DETAIL GROUPS — All visibility groups added by this module
// ════════════════════════════════════════════════════════════════════════════════

export const DETAIL_GROUPS = [
  'windows_standard',
  'windows_arched',
  'rtu_units',
  'pool_equipment',
  'parking_details',
  'arcade_columns',
  'signage',
  'landscaping',
] as const
