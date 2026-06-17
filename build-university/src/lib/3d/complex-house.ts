import * as THREE from 'three'

// ════════════════════════════════════════════════════════════════════════════════
// COMPLEX HOUSE MODEL — Flagship teaching house
// Multiple gables, valleys, dormer, turret, dead valley, 4 roof pitches
// Every mesh has a meshKey + group for lesson control
// ════════════════════════════════════════════════════════════════════════════════

// ── Coordinate constants (verified in verify-house.mjs) ──
const G = -5.0                     // ground
const F1 = 3.0, F2 = 2.7          // floor heights
const WH = F1 + F2                 // 5.7 total wall
const WT = G + WH                  // 0.7 wall top
const FL = G + F1                  // -2.0 floor line
const F1CY = G + F1 / 2            // -3.5
const F2CY = FL + F2 / 2           // -0.65
const TH = 0.18                    // wall thickness
const OVH = 0.5                    // eave overhang

// Main body
const MW = 14, MD = 9
const LX = -7, RX = 7, FZ = 4.5, BZ = -4.5
const MHD = MD / 2                 // 4.5
const MRR = MHD * 8 / 12           // 3.0 ridge rise
const MRY = WT + MRR               // 3.7

// Cross wing (right, perpendicular)
const CWL = RX, CWR = RX + 6, CWF = 4, CWB = -4
const CWCX = (CWL + CWR) / 2      // 10
const CWHW = (CWR - CWL) / 2      // 3
const CWRR = CWHW * 10 / 12        // 2.5
const CWRY = WT + CWRR             // 3.2

// Garage (left, hip roof)
const GL = -12, GR = -7, GF = 3.5, GB = -3.5
const GH = 3.0, GT = G + GH       // -2.0
const GCX = (GL + GR) / 2         // -9.5
const GCZ = (GF + GB) / 2         // 0
const GCY = (G + GT) / 2          // -3.5
const GHWD = (GR - GL) / 2        // 2.5
const GHDD = (GF - GB) / 2        // 3.5
const GHRR = GHWD * 5 / 12        // 1.042
const GRY = GT + GHRR             // -0.958
const GRFZ = GF - GHWD            // 1.0
const GRBZ = GB + GHWD            // -1.0

// Turret (front-right)
const TX = 5.5, TZ = 6.5, TR = 1.5
const TURRET_H = WH + 1.0         // taller than main walls
const TURRET_TOP = G + TURRET_H   // 1.7
const TURRET_PEAK = TURRET_TOP + 2.0  // 3.7

// Dormer (on main front slope)
const DX = -2, DW = 3, DD = 2.5, DZ = 2.0
const DORMER_BASE_Y = MRY - DZ * (MRR / MHD)  // 2.37
const DORMER_H = 1.8
const DORMER_TOP = DORMER_BASE_Y + DORMER_H

// Bump-out (rear, creates dead valley)
const BPL = -7, BPR = -3, BPF = BZ, BPB = BZ - 3
const BPH = 3.0, BPT = G + BPH
const BPCX = (BPL + BPR) / 2, BPCZ = (BPF + BPB) / 2
const SHED_LOW = BPT - 3 * 3 / 12  // -2.75

// Porch
const PL = -3, PR = 3, PF = FZ, PB = FZ + 3

export interface MeshDef {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  position: [number, number, number]
  rotation?: [number, number, number]
  meshKey: string
  group: string
  explodeOrder: number
  castShadow?: boolean
  receiveShadow?: boolean
}

// ── Procedural Texture Generator ──
function procTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, rx = 1, ry = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry)
  t.colorSpace = THREE.SRGBColorSpace   // canvas albedo is sRGB — without this it renders washed-out
  t.anisotropy = 8                       // crisp at grazing angles (roof/siding seen on an angle)
  return t
}

// A linear-data clone of an albedo texture, reused as a bumpMap for surface relief.
function bumpClone(src: THREE.CanvasTexture, rx: number, ry: number): THREE.CanvasTexture {
  const b = src.clone()
  b.repeat.set(rx, ry)
  b.colorSpace = THREE.NoColorSpace
  b.needsUpdate = true
  return b
}

// ── Realistic Materials with Procedural Textures ──

// Lap siding — cream horizontal boards with shadow lines and wood grain
function makeSidingTex(): THREE.CanvasTexture {
  return procTex(512, 512, ctx => {
    ctx.fillStyle = '#EDE8DC'; ctx.fillRect(0, 0, 512, 512)
    for (let y = 0; y < 512; y += 32) {
      // Board shadow line
      const g = ctx.createLinearGradient(0, y, 0, y + 32)
      g.addColorStop(0, 'rgba(255,255,255,0.15)'); g.addColorStop(0.85, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.08)')
      ctx.fillStyle = g; ctx.fillRect(0, y, 512, 32)
      // Board separation line
      ctx.strokeStyle = 'rgba(140,120,80,0.2)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(0, y + 31); ctx.lineTo(512, y + 31); ctx.stroke()
      // Subtle wood grain
      for (let gx = 0; gx < 512; gx += 3) {
        ctx.fillStyle = `rgba(${180 + Math.random()*30|0},${160 + Math.random()*20|0},${120 + Math.random()*20|0},${0.03 + Math.random()*0.04})`
        ctx.fillRect(gx, y, 1, 30)
      }
    }
  }, 4, 2)
}

// Stone — warm fieldstone with mortar joints and color variation
function makeStoneTex(): THREE.CanvasTexture {
  return procTex(512, 512, ctx => {
    // Mortar background
    ctx.fillStyle = '#C0B8A8'; ctx.fillRect(0, 0, 512, 512)
    const colors = ['#8A7E6A', '#A09480', '#786C58', '#B0A490', '#6E6250', '#9A8A70', '#887A66']
    for (let r = 0; r < 10; r++) for (let c = 0; c < 6; c++) {
      const sx = c * 86 + (r % 2) * 43 + ((r * 7 + c * 13) % 12 - 6)
      const sy = r * 52 + ((r * 11 + c * 5) % 6 - 3)
      const sw = 70 + ((r + c) % 3) * 8
      const sh = 38 + (r % 2) * 6
      ctx.fillStyle = colors[(r * 3 + c * 7) % colors.length]
      ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 4); ctx.fill()
      // Stone surface texture
      for (let i = 0; i < 15; i++) {
        ctx.fillStyle = `rgba(${Math.random()>0.5?255:0},${Math.random()>0.5?255:0},${Math.random()>0.5?255:0},0.02)`
        ctx.fillRect(sx + Math.random()*sw, sy + Math.random()*sh, 3, 3)
      }
      // Mortar shadow
      ctx.strokeStyle = 'rgba(160,150,130,0.4)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 4); ctx.stroke()
    }
  }, 2, 1)
}

// Asphalt shingle — architectural laminate. Real shingles read as a mosaic of
// mineral granules in three tones (charcoal, sand, slate-blue undertone) over a
// dimensional tab pattern. Weathering bands fade vertically along each course.
function makeRoofTex(): THREE.CanvasTexture {
  return procTex(512, 256, ctx => {
    // Asphalt mat base
    ctx.fillStyle = '#2E2A26'; ctx.fillRect(0, 0, 512, 256)
    // Granule layer — three mineral tones woven together, NOT a uniform speckle
    const tones: Array<[number, number, number]> = [
      [42, 38, 32],   // charcoal granule
      [56, 50, 44],   // mid-grey granule
      [78, 70, 60],   // sand granule
      [34, 36, 42],   // slate-blue undertone (catches reflected sky)
      [92, 84, 70],   // warm highlight granule
    ]
    for (let i = 0; i < 32000; i++) {
      const [r, g, b] = tones[(Math.random() * tones.length) | 0]
      const j = (Math.random() - 0.5) * 12
      ctx.fillStyle = `rgba(${r + j | 0},${g + j | 0},${b + j | 0},${0.35 + Math.random() * 0.45})`
      const s = 0.8 + Math.random() * 1.4
      ctx.fillRect(Math.random() * 512, Math.random() * 256, s, s)
    }
    // Soft vertical weathering bands — sun-fade across the course
    for (let bx = 0; bx < 512; bx += 64 + (Math.random() * 24 | 0)) {
      const bw = 24 + Math.random() * 28
      const op = 0.04 + Math.random() * 0.06
      const lg = ctx.createLinearGradient(bx, 0, bx + bw, 0)
      lg.addColorStop(0, 'rgba(0,0,0,0)')
      lg.addColorStop(0.5, `rgba(180,170,150,${op})`)
      lg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = lg
      ctx.fillRect(bx, 0, bw, 256)
    }
    // Shingle course shadow + highlight — top edge dark, kicker just below catches light
    for (let y = 0; y < 256; y += 42) {
      ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke()
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, y + 1); ctx.lineTo(512, y + 1); ctx.stroke()
      ctx.strokeStyle = 'rgba(255,242,220,0.07)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, y + 3); ctx.lineTo(512, y + 3); ctx.stroke()
    }
    // Tab cuts — staggered, with a faint shadow on the leading edge for depth
    for (let y = 0; y < 256; y += 42) {
      for (let x = (y % 84 < 42 ? 0 : 85); x < 512; x += 170) {
        ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 42); ctx.stroke()
        ctx.strokeStyle = 'rgba(255,242,220,0.05)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x + 1, y); ctx.lineTo(x + 1, y + 42); ctx.stroke()
      }
    }
    // Occasional darker "shadow tab" — laminate dimensional shingle look
    for (let y = 12; y < 256; y += 42) {
      for (let x = 0; x < 512; x += 170) {
        const tw = 30 + Math.random() * 60
        ctx.fillStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.06})`
        ctx.fillRect(x + Math.random() * 80, y, tw, 14)
      }
    }
  }, 6, 4)
}

// Concrete foundation — poured concrete with form lines
function makeFoundTex(): THREE.CanvasTexture {
  return procTex(256, 256, ctx => {
    ctx.fillStyle = '#A09888'; ctx.fillRect(0, 0, 256, 256)
    // Surface aggregate noise
    for (let i = 0; i < 5000; i++) {
      const v = 140 + Math.random() * 50 | 0
      ctx.fillStyle = `rgba(${v},${v-10},${v-20},0.15)`
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2)
    }
    // Form board lines
    for (let y = 0; y < 256; y += 64) {
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke()
    }
  }, 3, 2)
}

// Lumber — SPF with grain lines
function makeLumberTex(): THREE.CanvasTexture {
  return procTex(128, 256, ctx => {
    ctx.fillStyle = '#C4A86C'; ctx.fillRect(0, 0, 128, 256)
    // Wood grain (vertical lines)
    for (let x = 0; x < 128; x += 2) {
      ctx.fillStyle = `rgba(${160 + Math.random()*40|0},${130 + Math.random()*30|0},${70 + Math.random()*30|0},${0.1 + Math.random()*0.15})`
      ctx.fillRect(x, 0, 1, 256)
    }
    // Growth rings (curved lines)
    for (let y = 0; y < 256; y += 18 + Math.random() * 8) {
      ctx.strokeStyle = `rgba(${120 + Math.random()*20|0},${90 + Math.random()*20|0},${50},0.12)`
      ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, y + Math.random()*4)
      ctx.quadraticCurveTo(64, y + 4 + Math.random()*6, 128, y + Math.random()*4); ctx.stroke()
    }
    // Knots (occasional dark circles)
    if (Math.random() > 0.5) {
      const kx = 20 + Math.random() * 88, ky = 50 + Math.random() * 156
      ctx.fillStyle = 'rgba(100,70,30,0.3)'; ctx.beginPath(); ctx.ellipse(kx, ky, 6, 8, 0, 0, Math.PI*2); ctx.fill()
    }
  }, 1, 1)
}

// Felt underlayment — dark grey with printing
function makeUnderlayTex(): THREE.CanvasTexture {
  return procTex(256, 256, ctx => {
    ctx.fillStyle = '#2A2A2A'; ctx.fillRect(0, 0, 256, 256)
    // Felt fiber texture
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(${Math.random()>0.5?50:20},${Math.random()>0.5?50:20},${Math.random()>0.5?50:20},0.3)`
      ctx.fillRect(Math.random()*256, Math.random()*256, 1 + Math.random()*3, 1)
    }
    // Printed lines (like real #30 felt)
    for (let y = 64; y < 256; y += 64) {
      ctx.strokeStyle = 'rgba(80,80,80,0.3)'; ctx.lineWidth = 2
      ctx.setLineDash([8, 12]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke()
      ctx.setLineDash([])
    }
  }, 4, 3)
}

// Cache textures
let _sidingTex: THREE.CanvasTexture | null = null
let _stoneTex: THREE.CanvasTexture | null = null
let _roofTex: THREE.CanvasTexture | null = null
let _foundTex: THREE.CanvasTexture | null = null
let _lumberTex: THREE.CanvasTexture | null = null
let _underlayTex: THREE.CanvasTexture | null = null

function sidingMat(rx = 4, ry = 2): THREE.MeshStandardMaterial {
  if (!_sidingTex) _sidingTex = makeSidingTex()
  const t = _sidingTex.clone(); t.repeat.set(rx, ry); t.needsUpdate = true
  return new THREE.MeshStandardMaterial({
    map: t, bumpMap: bumpClone(_sidingTex, rx, ry), bumpScale: 1.2,
    roughness: 0.82, metalness: 0, envMapIntensity: 0.35,
  })
}

function stoneMat(): THREE.MeshStandardMaterial {
  if (!_stoneTex) _stoneTex = makeStoneTex()
  const t = _stoneTex.clone(); t.needsUpdate = true
  return new THREE.MeshStandardMaterial({
    map: t, bumpMap: bumpClone(_stoneTex, 1, 1), bumpScale: 2.0,
    roughness: 0.92, metalness: 0, envMapIntensity: 0.45,
  })
}

function roofMat(): THREE.MeshStandardMaterial {
  if (!_roofTex) _roofTex = makeRoofTex()
  const t = _roofTex.clone(); t.needsUpdate = true
  return new THREE.MeshStandardMaterial({
    map: t, bumpMap: bumpClone(_roofTex, 1, 1), bumpScale: 1.1,
    roughness: 0.96, metalness: 0, envMapIntensity: 0.22,
  })
}

function foundMat(): THREE.MeshStandardMaterial {
  if (!_foundTex) _foundTex = makeFoundTex()
  const t = _foundTex.clone(); t.needsUpdate = true
  return new THREE.MeshStandardMaterial({
    map: t, bumpMap: bumpClone(_foundTex, 1, 1), bumpScale: 0.7,
    roughness: 0.95, metalness: 0, envMapIntensity: 0.25,
  })
}

function lumberMat(): THREE.MeshStandardMaterial {
  if (!_lumberTex) _lumberTex = makeLumberTex()
  const t = _lumberTex.clone(); t.needsUpdate = true
  return new THREE.MeshStandardMaterial({
    map: t, bumpMap: bumpClone(_lumberTex, 1, 1), bumpScale: 0.5,
    roughness: 0.85, metalness: 0, envMapIntensity: 0.3,
  })
}

function underlayMat(): THREE.MeshStandardMaterial {
  if (!_underlayTex) _underlayTex = makeUnderlayTex()
  const t = _underlayTex.clone(); t.needsUpdate = true
  return new THREE.MeshStandardMaterial({
    map: t, bumpMap: bumpClone(_underlayTex, 1, 1), bumpScale: 0.5,
    roughness: 0.95, metalness: 0, envMapIntensity: 0.18,
  })
}

const roofColor = roofMat
const trimColor = () => new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.45, envMapIntensity: 0.3 })
const frameColor = () => new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.05 })
const foundColor = foundMat
const lumberColor = lumberMat
const battenColor = () => new THREE.MeshStandardMaterial({ color: 0xf2ede6, roughness: 0.7, envMapIntensity: 0.15 })
const ridgeColor = () => new THREE.MeshStandardMaterial({ color: 0x252220, roughness: 0.82, envMapIntensity: 0.1 })
const valleyMetalColor = () => new THREE.MeshStandardMaterial({ color: 0x909498, roughness: 0.2, metalness: 0.8, envMapIntensity: 0.6 })
const flashingColor = () => new THREE.MeshStandardMaterial({ color: 0x8a8e92, roughness: 0.25, metalness: 0.75, envMapIntensity: 0.5 })
const iceBarrierColor = () => new THREE.MeshStandardMaterial({ color: 0x1a55a8, roughness: 0.55, transparent: true, opacity: 0.6, envMapIntensity: 0.2 })
const underlayColor = underlayMat

// ── Helpers ──
function box(w: number, h: number, d: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(w, h, d)
}

function triGeo(v0: number[], v1: number[], v2: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...v0, ...v1, ...v2]), 3))
  g.computeVertexNormals()
  return g
}

function quadGeo(v0: number[], v1: number[], v2: number[], v3: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...v0, ...v1, ...v2, ...v0, ...v2, ...v3]), 3))
  g.computeVertexNormals()
  return g
}

// ════════════════════════════════════════════════════════════════════════════════
// GENERATE THE HOUSE
// ════════════════════════════════════════════════════════════════════════════════
let _cache: MeshDef[] | null = null
let _cacheKey: boolean | null = null

export function generateComplexHouse(useWebGL2 = true): MeshDef[] {
  if (_cache && _cacheKey === useWebGL2) return _cache
  const parts: MeshDef[] = []

  function add(
    geo: THREE.BufferGeometry, mat: THREE.Material,
    pos: [number, number, number], meshKey: string, group: string,
    explodeOrder: number, rot?: [number, number, number]
  ) {
    parts.push({ geometry: geo, material: mat, position: pos, rotation: rot, meshKey, group, explodeOrder, castShadow: true, receiveShadow: true })
  }

  // ═══════ PHASE 0: FOUNDATION ═══════
  add(box(MW + 0.4, 0.5, MD + 0.4), foundColor(), [0, G - 0.25, 0], 'found_main', 'foundation', 0)
  add(box(CWR - CWL + 0.3, 0.5, CWF - CWB + 0.3), foundColor(), [CWCX, G - 0.25, 0], 'found_wing', 'foundation', 0)
  add(box(GR - GL + 0.3, 0.5, GF - GB + 0.3), foundColor(), [GCX, G - 0.25, GCZ], 'found_garage', 'foundation', 0)
  add(box(BPR - BPL + 0.3, 0.5, BPF - BPB + 0.3), foundColor(), [BPCX, G - 0.25, BPCZ], 'found_bump', 'foundation', 0)

  // ═══════ PHASE 1: FIRST FLOOR WALLS ═══════
  // Main body
  add(box(MW, F1, TH), sidingMat(5, 1), [0, F1CY, FZ], 'w1_main_f', 'walls_1st', 1)
  add(box(MW, F1, TH), sidingMat(5, 1), [0, F1CY, BZ], 'w1_main_b', 'walls_1st', 1)
  add(box(TH, F1, MD), sidingMat(3, 1), [LX, F1CY, 0], 'w1_main_l', 'walls_1st', 1)
  add(box(TH, F1, MD), sidingMat(3, 1), [RX, F1CY, 0], 'w1_main_r', 'walls_1st', 1)

  // Cross wing
  add(box(CWR - CWL, F1, TH), sidingMat(3, 1), [CWCX, F1CY, CWF], 'w1_cw_f', 'walls_1st', 1)
  add(box(CWR - CWL, F1, TH), sidingMat(3, 1), [CWCX, F1CY, CWB], 'w1_cw_b', 'walls_1st', 1)
  add(box(TH, F1, CWF - CWB), sidingMat(2, 1), [CWR, F1CY, 0], 'w1_cw_r', 'walls_1st', 1)

  // Garage
  add(box(GR - GL, GH, TH), sidingMat(2.5, 1), [GCX, GCY, GF], 'w1_gar_f', 'walls_1st', 1)
  add(box(GR - GL, GH, TH), sidingMat(2.5, 1), [GCX, GCY, GB], 'w1_gar_b', 'walls_1st', 1)
  add(box(TH, GH, GF - GB), sidingMat(3, 1), [GL, GCY, GCZ], 'w1_gar_l', 'walls_1st', 1)

  // Bump-out
  add(box(BPR - BPL, BPH, TH), sidingMat(2, 1), [BPCX, (G + BPT) / 2, BPB], 'w1_bp_b', 'walls_1st', 1)
  add(box(TH, BPH, BPF - BPB), sidingMat(1.5, 1), [BPL, (G + BPT) / 2, BPCZ], 'w1_bp_l', 'walls_1st', 1)
  add(box(TH, BPH, BPF - BPB), sidingMat(1.5, 1), [BPR, (G + BPT) / 2, BPCZ], 'w1_bp_r', 'walls_1st', 1)

  // ═══════ PHASE 2: SECOND FLOOR WALLS ═══════
  add(box(MW, F2, TH), sidingMat(5, 1), [0, F2CY, FZ], 'w2_main_f', 'walls_2nd', 2)
  add(box(MW, F2, TH), sidingMat(5, 1), [0, F2CY, BZ], 'w2_main_b', 'walls_2nd', 2)
  add(box(TH, F2, MD), sidingMat(3, 1), [LX, F2CY, 0], 'w2_main_l', 'walls_2nd', 2)
  add(box(TH, F2, MD), sidingMat(3, 1), [RX, F2CY, 0], 'w2_main_r', 'walls_2nd', 2)

  add(box(CWR - CWL, F2, TH), sidingMat(3, 1), [CWCX, F2CY, CWF], 'w2_cw_f', 'walls_2nd', 2)
  add(box(CWR - CWL, F2, TH), sidingMat(3, 1), [CWCX, F2CY, CWB], 'w2_cw_b', 'walls_2nd', 2)
  add(box(TH, F2, CWF - CWB), sidingMat(2, 1), [CWR, F2CY, 0], 'w2_cw_r', 'walls_2nd', 2)

  // Floor band trim
  add(box(MW + 0.08, 0.12, TH + 0.08), trimColor(), [0, FL, FZ], 'band_f', 'floor_band', 2)
  add(box(MW + 0.08, 0.12, TH + 0.08), trimColor(), [0, FL, BZ], 'band_b', 'floor_band', 2)
  add(box(TH + 0.08, 0.12, MD + 0.08), trimColor(), [LX, FL, 0], 'band_l', 'floor_band', 2)
  add(box(TH + 0.08, 0.12, MD + 0.08), trimColor(), [RX, FL, 0], 'band_r', 'floor_band', 2)

  // Gable ends (main — left and right)
  const mainGable = new THREE.Shape()
  mainGable.moveTo(-MHD, 0); mainGable.lineTo(MHD, 0); mainGable.lineTo(0, MRR); mainGable.closePath()
  const mainGableGeo = new THREE.ExtrudeGeometry(mainGable, { depth: TH, bevelEnabled: false })
  add(mainGableGeo, battenColor(), [LX + TH / 2, WT, 0], 'gable_l', 'gable_ends', 3, [0, Math.PI / 2, 0])
  add(mainGableGeo.clone(), battenColor(), [RX - TH / 2, WT, 0], 'gable_r', 'gable_ends', 3, [0, Math.PI / 2, 0])

  // Gable ends (cross wing — front and back)
  const cwGable = new THREE.Shape()
  cwGable.moveTo(-CWHW, 0); cwGable.lineTo(CWHW, 0); cwGable.lineTo(0, CWRR); cwGable.closePath()
  const cwGableGeo = new THREE.ExtrudeGeometry(cwGable, { depth: TH, bevelEnabled: false })
  add(cwGableGeo, battenColor(), [CWCX, WT, CWF], 'gable_cw_f', 'gable_ends', 3)
  add(cwGableGeo.clone(), battenColor(), [CWCX, WT, CWB], 'gable_cw_b', 'gable_ends', 3)

  // ═══════ PHASE 3: ROOF SHEATHING ═══════
  // Main gable roof
  const mainRoofShape = new THREE.Shape()
  mainRoofShape.moveTo(-(MHD + OVH), -0.08)
  mainRoofShape.lineTo(0, MRR)
  mainRoofShape.lineTo(MHD + OVH, -0.08)
  mainRoofShape.closePath()
  const mainRoofGeo = new THREE.ExtrudeGeometry(mainRoofShape, { depth: MW + 2 * OVH, bevelEnabled: false })
  add(mainRoofGeo, roofColor(), [-(MW / 2 + OVH), WT, 0], 'roof_main', 'sheathing', 4, [0, Math.PI / 2, 0])

  // Cross wing roof
  const cwRoofShape = new THREE.Shape()
  cwRoofShape.moveTo(-(CWHW + OVH), -0.08)
  cwRoofShape.lineTo(0, CWRR)
  cwRoofShape.lineTo(CWHW + OVH, -0.08)
  cwRoofShape.closePath()
  const cwRoofLen = CWF - CWB + OVH  // extends back to main + overhang on front
  const cwRoofGeo = new THREE.ExtrudeGeometry(cwRoofShape, { depth: cwRoofLen, bevelEnabled: false })
  add(cwRoofGeo, roofColor(), [CWCX, WT, CWF + OVH / 2], 'roof_cross', 'sheathing', 4, [0, Math.PI, 0])

  // Main ridge cap
  add(box(MW + 2 * OVH, 0.08, 0.16), ridgeColor(), [0, MRY + 0.04, 0], 'ridge_main', 'ridge_cap', 7)
  // Cross wing ridge cap
  add(box(0.12, 0.08, CWF - CWB + OVH), ridgeColor(), [CWCX, CWRY + 0.04, 0], 'ridge_cross', 'ridge_cap', 7)

  // ═══════ VALLEY METAL — mathematically precise ═══════
  // Front valley: from (7, 0.7, 4) to (10, 3.2, 0.75)
  // Back valley: from (7, 0.7, -4) to (10, 3.2, -0.75)

  // Valley geometry helper — builds a W-profile along the valley line
  function buildValleyMetal(
    start: [number,number,number],
    end: [number,number,number],
    prefix: string
  ) {
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    const dz = end[2] - start[2]
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz)
    const mid: [number,number,number] = [(start[0]+end[0])/2, (start[1]+end[1])/2, (start[2]+end[2])/2]

    // Direction angles
    const pitchAngle = Math.atan2(dy, Math.sqrt(dx*dx + dz*dz))
    const yawAngle = Math.atan2(dx, -dz)

    // W-profile valley metal: center channel + two flanges
    const metalW = 0.7      // total width (24" valley = ~0.67 scene units)
    const channelW = 0.12   // center crimp width
    const flangeW = (metalW - channelW) / 2
    const metalThick = 0.02 // sheet metal thickness

    // Center channel (the V/W crimp — slightly lower than flanges)
    add(box(channelW, metalThick, len + 0.3), valleyMetalColor(),
      mid, `${prefix}_channel`, 'valley_metal', 6,
      [pitchAngle, yawAngle, 0])

    // Left flange (slopes up from center)
    const flangeAngle = 0.15 // slight V angle outward
    add(box(flangeW, metalThick, len + 0.3), valleyMetalColor(),
      [mid[0] - 0.12, mid[1] + 0.02, mid[2]], `${prefix}_flange_l`, 'valley_metal', 6,
      [pitchAngle, yawAngle, flangeAngle])

    // Right flange
    add(box(flangeW, metalThick, len + 0.3), valleyMetalColor(),
      [mid[0] + 0.12, mid[1] + 0.02, mid[2]], `${prefix}_flange_r`, 'valley_metal', 6,
      [pitchAngle, yawAngle, -flangeAngle])

    // Nail exclusion zone markers (red lines at outer edges — shows where fasteners go)
    const nailZoneMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.5 })
    add(box(0.02, metalThick + 0.01, len), nailZoneMat,
      [mid[0] - metalW/2 + 0.02, mid[1] + 0.015, mid[2]], `${prefix}_nail_l`, 'valley_metal', 6,
      [pitchAngle, yawAngle, 0])
    add(box(0.02, metalThick + 0.01, len), nailZoneMat,
      [mid[0] + metalW/2 - 0.02, mid[1] + 0.015, mid[2]], `${prefix}_nail_r`, 'valley_metal', 6,
      [pitchAngle, yawAngle, 0])

    // Overlap seam (where two pieces of valley metal join — shows 6" overlap)
    const seamMat = new THREE.MeshStandardMaterial({ color: 0x707070, roughness: 0.4, metalness: 0.5 })
    add(box(metalW - 0.04, metalThick + 0.005, 0.2), seamMat,
      mid, `${prefix}_seam`, 'valley_metal', 6,
      [pitchAngle, yawAngle, 0])

    return { mid, pitchAngle, yawAngle, len }
  }

  // Front valley
  const vf = buildValleyMetal([RX, WT, CWF], [CWCX, CWRY, 0.75], 'valley_f')

  // Back valley
  const vb = buildValleyMetal([RX, WT, CWB], [CWCX, CWRY, -0.75], 'valley_b')

  // ═══════ ICE BARRIER (blue, self-adhering membrane) ═══════
  // Eave ice barrier — 24" inside exterior wall line (about 0.67 scene units)
  const iceW = 1.0  // 36" total width in scene scale
  add(box(MW + 1, 0.015, iceW), iceBarrierColor(), [0, WT + 0.04, FZ - iceW/2 + 0.1], 'ice_eave_f', 'ice_barrier', 5)
  add(box(MW + 1, 0.015, iceW), iceBarrierColor(), [0, WT + 0.04, BZ + iceW/2 - 0.1], 'ice_eave_b', 'ice_barrier', 5)

  // Valley ice barrier — 24" from centerline each side (wider than the metal)
  const iceValleyW = 1.4  // 48" total valley ice barrier width
  add(box(iceValleyW, 0.012, vf.len + 0.4), iceBarrierColor(),
    vf.mid, 'ice_valley_f', 'ice_barrier', 5,
    [vf.pitchAngle, vf.yawAngle, 0])
  add(box(iceValleyW, 0.012, vb.len + 0.4), iceBarrierColor(),
    vb.mid, 'ice_valley_b', 'ice_barrier', 5,
    [vb.pitchAngle, vb.yawAngle, 0])

  // ═══════ UNDERLAYMENT ═══════
  add(box(MW + 0.8, 0.02, MD + 0.8), underlayColor(), [0, WT + 0.03, 0], 'underlay_main', 'underlayment', 5)

  // ═══════ DRIP EDGE ═══════
  add(box(MW + 1, 0.06, 0.08), flashingColor(), [0, WT - 0.1, FZ + OVH], 'drip_eave_f', 'drip_edge', 5)
  add(box(MW + 1, 0.06, 0.08), flashingColor(), [0, WT - 0.1, BZ - OVH], 'drip_eave_b', 'drip_edge', 5)

  // ═══════ STEP FLASHING (where cross wing meets main) ═══════
  for (let i = 0; i < 6; i++) {
    const sz = CWB + 0.5 + i * 1.2
    add(box(0.2, 0.15, 0.08), flashingColor(), [RX + 0.1, WT + 0.5 + i * 0.3, sz], `step_flash_${i}`, 'step_flashing', 6)
  }

  // ═══════ GARAGE HIP ROOF ═══════
  const gOvh = 0.3, gEY = GT - 0.04
  const gRidgeF: [number, number, number] = [GCX, GRY, GRFZ]
  const gRidgeB: [number, number, number] = [GCX, GRY, GRBZ]

  add(triGeo([GL - gOvh, gEY, GF + gOvh], [GR + gOvh, gEY, GF + gOvh], gRidgeF), roofColor(), [0, 0, 0], 'gar_hip_f', 'garage_roof', 4)
  add(triGeo([GR + gOvh, gEY, GB - gOvh], [GL - gOvh, gEY, GB - gOvh], gRidgeB), roofColor(), [0, 0, 0], 'gar_hip_b', 'garage_roof', 4)
  add(quadGeo([GR + gOvh, gEY, GF + gOvh], [GR + gOvh, gEY, GB - gOvh], gRidgeB, gRidgeF), roofColor(), [0, 0, 0], 'gar_hip_r', 'garage_roof', 4)
  add(quadGeo([GL - gOvh, gEY, GB - gOvh], [GL - gOvh, gEY, GF + gOvh], gRidgeF, gRidgeB), roofColor(), [0, 0, 0], 'gar_hip_l', 'garage_roof', 4)

  // ═══════ TURRET ═══════
  // Octagonal walls
  const turretGeo = new THREE.CylinderGeometry(TR, TR, TURRET_H, 8)
  add(turretGeo, sidingMat(3, 2), [TX, G + TURRET_H / 2, TZ], 'turret_walls', 'turret', 2)
  // Conical roof
  const coneGeo = new THREE.ConeGeometry(TR + 0.2, TURRET_PEAK - TURRET_TOP + 0.3, 8)
  add(coneGeo, roofColor(), [TX, (TURRET_TOP + TURRET_PEAK) / 2 + 0.15, TZ], 'turret_roof', 'turret', 4)
  // Turret foundation
  add(new THREE.CylinderGeometry(TR + 0.15, TR + 0.15, 0.5, 8), foundColor(), [TX, G - 0.25, TZ], 'turret_found', 'foundation', 0)

  // ═══════ DORMER ═══════
  const dhw = DW / 2
  // Dormer front wall
  add(box(DW, DORMER_H, TH), battenColor(), [DX, DORMER_BASE_Y + DORMER_H / 2, DZ + DD], 'dormer_front', 'dormer', 3)
  // Dormer side walls (triangular would be ideal, box is approximate)
  add(box(TH, DORMER_H, DD), sidingMat(1, 1), [DX - dhw, DORMER_BASE_Y + DORMER_H / 2, DZ + DD / 2], 'dormer_side_l', 'dormer', 3)
  add(box(TH, DORMER_H, DD), sidingMat(1, 1), [DX + dhw, DORMER_BASE_Y + DORMER_H / 2, DZ + DD / 2], 'dormer_side_r', 'dormer', 3)
  // Dormer gable roof
  const dormRoofShape = new THREE.Shape()
  dormRoofShape.moveTo(-(dhw + 0.2), 0); dormRoofShape.lineTo(0, dhw * 8 / 12); dormRoofShape.lineTo(dhw + 0.2, 0)
  dormRoofShape.closePath()
  const dormRoofGeo = new THREE.ExtrudeGeometry(dormRoofShape, { depth: DD + 0.3, bevelEnabled: false })
  add(dormRoofGeo, roofColor(), [DX, DORMER_TOP, DZ + DD + 0.15], 'dormer_roof', 'dormer', 4, [0, Math.PI, 0])
  // Dormer window
  add(box(1.2, 1.0, 0.08), frameColor(), [DX, DORMER_BASE_Y + DORMER_H / 2, DZ + DD + 0.05], 'dormer_window', 'windows', 8)

  // ═══════ BUMP-OUT SHED ROOF (dead valley) ═══════
  add(quadGeo(
    [BPL - 0.3, BPT + 0.05, BPF],
    [BPR + 0.3, BPT + 0.05, BPF],
    [BPR + 0.3, SHED_LOW - 0.05, BPB - 0.3],
    [BPL - 0.3, SHED_LOW - 0.05, BPB - 0.3]
  ), roofColor(), [0, 0, 0], 'bump_shed_roof', 'bump_roof', 4)

  // ═══════ PORCH ═══════
  const porchRoofY = WT - 0.5
  add(box(PR - PL + 0.4, 0.10, PB - PF + 0.3), roofColor(), [0, porchRoofY, (PF + PB) / 2], 'porch_roof', 'porch', 8)
  add(box(PR - PL, 0.04, PB - PF), trimColor(), [0, porchRoofY - 0.08, (PF + PB) / 2], 'porch_ceiling', 'porch', 8)
  // Porch columns
  const pColH = porchRoofY - G - 0.1
  ;[[PL + 0.3, PB - 0.2], [PR - 0.3, PB - 0.2], [PL + 0.3, PF + 0.3], [PR - 0.3, PF + 0.3]].forEach(([cx, cz], i) => {
    add(box(0.3, pColH, 0.3), stoneMat(), [cx, G + pColH / 2 + 0.05, cz], `porch_col_${i}`, 'porch', 8)
  })
  // Porch floor
  add(box(PR - PL + 0.2, 0.12, PB - PF + 0.1), new THREE.MeshStandardMaterial({ color: 0x9a8e7a, roughness: 0.92 }),
    [0, G + 0.06, (PF + PB) / 2], 'porch_floor', 'porch', 8)

  // ═══════ CHIMNEY (at wing junction) ═══════
  const chimH = MRY + 1.0 - G
  add(box(0.8, chimH, 0.6), new THREE.MeshStandardMaterial({ color: 0x7a7062, roughness: 0.92 }),
    [RX, G + chimH / 2, 0], 'chimney', 'chimney', 8)
  add(box(1.0, 0.10, 0.8), new THREE.MeshStandardMaterial({ color: 0xc0b8a8, roughness: 0.80 }),
    [RX, G + chimH + 0.05, 0], 'chimney_cap', 'chimney', 8)

  // ═══════ STONE WAINSCOT ═══════
  const stH = 1.2, stY = G + stH / 2 + 0.05
  add(box(MW + 0.06, stH, TH + 0.06), stoneMat(), [0, stY, FZ], 'stone_main_f', 'stone_wainscot', 8)
  add(box(MW + 0.06, stH, TH + 0.06), stoneMat(), [0, stY, BZ], 'stone_main_b', 'stone_wainscot', 8)
  add(box(TH + 0.06, stH, MD + 0.06), stoneMat(), [LX, stY, 0], 'stone_main_l', 'stone_wainscot', 8)

  // ═══════ WINDOWS ═══════
  const glassMat = useWebGL2
    ? new THREE.MeshPhysicalMaterial({
        color: 0x8aafc8, roughness: 0.02, metalness: 0.0,
        transmission: 0.85, thickness: 0.5, ior: 1.52,
        transparent: true, opacity: 0.95,
        envMapIntensity: 1.0,
      })
    : new THREE.MeshStandardMaterial({
        color: 0x8aafc8, roughness: 0.1, metalness: 0.0,
        transparent: true, opacity: 0.3,
      })
  function addWin(x: number, y: number, z: number, key: string, ry = 0) {
    add(box(1.0, 1.4, 0.08), frameColor(), [x, y, z], key + '_frame', 'windows', 8, ry ? [0, ry, 0] : undefined)
    const off = 0.04
    add(box(0.9, 1.3, 0.04), glassMat, [x + Math.sin(ry) * off, y, z + Math.cos(ry) * off], key + '_glass', 'windows', 8, ry ? [0, ry, 0] : undefined)
  }
  const wy1 = G + F1 / 2 + 0.3, wy2 = FL + F2 / 2 + 0.2
  // Front
  ;[-5, -3, 3, 5].forEach((wx, i) => { addWin(wx, wy1, FZ + 0.1, `win_f1_${i}`); addWin(wx, wy2, FZ + 0.1, `win_f2_${i}`) })
  // Back
  ;[-4, -1, 2, 5].forEach((wx, i) => { addWin(wx, wy1, BZ - 0.04, `win_b1_${i}`); addWin(wx, wy2, BZ - 0.04, `win_b2_${i}`) })
  // Cross wing front
  addWin(CWCX, wy1, CWF + 0.1, 'win_cw_f1'); addWin(CWCX, wy2, CWF + 0.1, 'win_cw_f2')
  // Cross wing right
  addWin(CWR + 0.04, wy1, 1, 'win_cw_r1', Math.PI / 2); addWin(CWR + 0.04, wy2, -1, 'win_cw_r2', Math.PI / 2)

  // ═══════ DOORS ═══════
  add(box(1.0, 1.8, 0.14), new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.65 }),
    [0, G + 0.9, FZ + 0.08], 'front_door', 'doors', 8)
  // Garage door
  add(box(3.4, 2.2, 0.12), new THREE.MeshStandardMaterial({ color: 0x3a3228, roughness: 0.7 }),
    [GCX, G + 1.1, GF + 0.08], 'garage_door', 'doors', 8)

  // ═══════ FASCIA / SOFFIT ═══════
  add(box(MW + 2 * OVH, 0.3, 0.06), trimColor(), [0, WT - 0.15, FZ + OVH], 'fascia_f', 'fascia_soffit', 7)
  add(box(MW + 2 * OVH, 0.3, 0.06), trimColor(), [0, WT - 0.15, BZ - OVH], 'fascia_b', 'fascia_soffit', 7)
  add(box(MW + 2 * OVH, 0.04, OVH), trimColor(), [0, WT - 0.28, FZ + OVH / 2], 'soffit_f', 'fascia_soffit', 7)
  add(box(MW + 2 * OVH, 0.04, OVH), trimColor(), [0, WT - 0.28, BZ - OVH / 2], 'soffit_b', 'fascia_soffit', 7)

  // ═══════ GUTTERS ═══════
  const gutterMat = new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.35, metalness: 0.4 })
  add(box(MW + 2 * OVH, 0.1, 0.12), gutterMat, [0, WT - 0.38, FZ + OVH], 'gutter_f', 'gutters', 9)
  add(box(MW + 2 * OVH, 0.1, 0.12), gutterMat, [0, WT - 0.38, BZ - OVH], 'gutter_b', 'gutters', 9)

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURAL FRAMING — studs, joists, rafters, headers
  // ═══════════════════════════════════════════════════════════════════════════

  // Lumber dimensions (scene scale: 1 unit ≈ 3 feet)
  // 2x4 stud: 1.5" x 3.5" → 0.04 x 0.10 scene units (but scaled up 2x for visibility)
  const SWide = 0.08           // stud face width (visible from outside)
  const SDeep = 0.30           // stud depth (3.5" scaled — how far it sticks out from wall plane)
  const studSpacing = 1.33     // ~16" o.c. in scene units
  const JHt = 0.65             // joist height (2x10 ≈ 9.25" → 0.65 for visibility)
  const JWide = 0.08           // joist width

  // ── Floor joists (1st floor) — run front-to-back (Z direction) ──
  const joistMat = lumberColor()
  const joistCount = Math.floor(MW / studSpacing) - 1
  for (let i = 0; i < joistCount; i++) {
    const jx = LX + 0.7 + i * studSpacing
    add(box(JWide, JHt, MD - 0.6), joistMat, [jx, G + JHt / 2, 0], `joist_1_${i}`, 'floor_joists', 1.5)
  }
  // Rim joists (band at perimeter — same height as floor joists)
  add(box(MW, JHt, JWide), lumberColor(), [0, G + JHt / 2, FZ - 0.1], 'rim_f', 'floor_joists', 1.5)
  add(box(MW, JHt, JWide), lumberColor(), [0, G + JHt / 2, BZ + 0.1], 'rim_b', 'floor_joists', 1.5)
  add(box(JWide, JHt, MD), lumberColor(), [LX + 0.1, G + JHt / 2, 0], 'rim_l', 'floor_joists', 1.5)
  add(box(JWide, JHt, MD), lumberColor(), [RX - 0.1, G + JHt / 2, 0], 'rim_r', 'floor_joists', 1.5)

  // ── 2nd floor joists ──
  for (let i = 0; i < joistCount; i++) {
    const jx = LX + 0.7 + i * studSpacing
    add(box(JWide, JHt, MD - 0.6), joistMat, [jx, FL + JHt / 2, 0], `joist_2_${i}`, 'floor_joists', 2.5)
  }

  // ── Wall studs — positioned so they're visible (inside the wall line) ──
  // Studs are the SKELETON — siding (walls_1st/2nd) is the SKIN that covers them later
  const studH1 = F1 - 0.2       // stud height (floor to plate, minus plates)
  const studY1 = G + 0.1 + studH1 / 2  // centered vertically

  // Front wall studs (at Z = FZ, visible from inside looking out)
  const frontStudCount = Math.floor(MW / studSpacing)
  for (let i = 0; i < frontStudCount; i++) {
    const sx = LX + 0.7 + i * studSpacing
    add(box(SWide, studH1, SDeep), lumberColor(), [sx, studY1, FZ - SDeep / 2], `stud_f1_${i}`, 'wall_studs', 1.8)
  }
  // Back wall studs
  for (let i = 0; i < frontStudCount; i++) {
    const sx = LX + 0.7 + i * studSpacing
    add(box(SWide, studH1, SDeep), lumberColor(), [sx, studY1, BZ + SDeep / 2], `stud_b1_${i}`, 'wall_studs', 1.8)
  }
  // Left wall studs
  const sideStudCount = Math.floor(MD / studSpacing)
  for (let i = 0; i < sideStudCount; i++) {
    const sz = BZ + 0.7 + i * studSpacing
    add(box(SDeep, studH1, SWide), lumberColor(), [LX + SDeep / 2, studY1, sz], `stud_l1_${i}`, 'wall_studs', 1.8)
  }
  // Right wall studs
  for (let i = 0; i < sideStudCount; i++) {
    const sz = BZ + 0.7 + i * studSpacing
    add(box(SDeep, studH1, SWide), lumberColor(), [RX - SDeep / 2, studY1, sz], `stud_r1_${i}`, 'wall_studs', 1.8)
  }

  // Top & bottom plates (all 4 walls)
  const plateH = 0.06
  // Front wall plates
  add(box(MW, plateH, SDeep), lumberColor(), [0, G + plateH / 2, FZ - SDeep / 2], 'plate_bot_f', 'wall_studs', 1.8)
  add(box(MW, plateH, SDeep), lumberColor(), [0, G + F1 - plateH / 2, FZ - SDeep / 2], 'plate_top_f', 'wall_studs', 1.8)
  add(box(MW, plateH, SDeep), lumberColor(), [0, G + F1 + plateH / 2, FZ - SDeep / 2], 'plate_dbl_f', 'wall_studs', 1.8)
  // Back wall plates
  add(box(MW, plateH, SDeep), lumberColor(), [0, G + plateH / 2, BZ + SDeep / 2], 'plate_bot_b', 'wall_studs', 1.8)
  add(box(MW, plateH, SDeep), lumberColor(), [0, G + F1 - plateH / 2, BZ + SDeep / 2], 'plate_top_b', 'wall_studs', 1.8)
  // Left wall plates
  add(box(SDeep, plateH, MD), lumberColor(), [LX + SDeep / 2, G + plateH / 2, 0], 'plate_bot_l', 'wall_studs', 1.8)
  add(box(SDeep, plateH, MD), lumberColor(), [LX + SDeep / 2, G + F1 - plateH / 2, 0], 'plate_top_l', 'wall_studs', 1.8)
  // Right wall plates
  add(box(SDeep, plateH, MD), lumberColor(), [RX - SDeep / 2, G + plateH / 2, 0], 'plate_bot_r', 'wall_studs', 1.8)
  add(box(SDeep, plateH, MD), lumberColor(), [RX - SDeep / 2, G + F1 - plateH / 2, 0], 'plate_top_r', 'wall_studs', 1.8)

  // ── Headers (over window openings, front wall — doubled 2x lumber) ──
  const headerMat = new THREE.MeshStandardMaterial({ color: 0xb89050, roughness: 0.8 })
  ;[-5, -3, 3, 5].forEach((wx, i) => {
    add(box(1.4, 0.4, SDeep), headerMat, [wx, wy1 + 0.9, FZ - SDeep / 2], `header_f_${i}`, 'wall_studs', 1.8)
    // Jack studs (under headers)
    add(box(SWide, wy1 + 0.7 - G - 0.1, SDeep), lumberColor(), [wx - 0.6, G + 0.1 + (wy1 + 0.7 - G - 0.1) / 2, FZ - SDeep / 2], `jack_f_${i}_l`, 'wall_studs', 1.8)
    add(box(SWide, wy1 + 0.7 - G - 0.1, SDeep), lumberColor(), [wx + 0.6, G + 0.1 + (wy1 + 0.7 - G - 0.1) / 2, FZ - SDeep / 2], `jack_f_${i}_r`, 'wall_studs', 1.8)
  })

  // ── Interior walls (1st floor) ──
  const intWallMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: 0.8 })
  // Kitchen/living divider (runs front-to-back at x=-1)
  add(box(TH, F1, 5), intWallMat, [-1, F1CY, -1], 'intwall_1', 'interior_walls', 2)
  // Bathroom wall (runs left-right at z=1)
  add(box(5, F1, TH), intWallMat, [-4.5, F1CY, 1], 'intwall_2', 'interior_walls', 2)
  // Hallway wall
  add(box(TH, F1, 4), intWallMat, [3, F1CY, 0], 'intwall_3', 'interior_walls', 2)

  // ── Interior walls (2nd floor) ──
  add(box(TH, F2, 5), intWallMat, [-1, F2CY, -1], 'intwall_2f_1', 'interior_walls', 2)
  add(box(5, F2, TH), intWallMat, [-4.5, F2CY, 1], 'intwall_2f_2', 'interior_walls', 2)
  add(box(TH, F2, 4), intWallMat, [3, F2CY, 0], 'intwall_2f_3', 'interior_walls', 2)

  // ── Interior door openings (represented as dark rectangles) ──
  const intDoorMat = new THREE.MeshStandardMaterial({ color: 0x6b5b4a, roughness: 0.65 })
  add(box(0.8, 1.6, TH + 0.02), intDoorMat, [-1, G + 0.8, 1.5], 'intdoor_1', 'interior_walls', 2)
  add(box(TH + 0.02, 1.6, 0.8), intDoorMat, [3, G + 0.8, 2], 'intdoor_2', 'interior_walls', 2)

  // ── Stairs (1st to 2nd floor) ──
  const stairMat = new THREE.MeshStandardMaterial({ color: 0xa0906c, roughness: 0.75 })
  const stairCount = 14
  const stairRise = F1 / stairCount  // ~0.214 per step
  const stairRun = 0.22
  for (let s = 0; s < stairCount; s++) {
    add(box(1.0, 0.06, stairRun), stairMat,
      [1, G + (s + 0.5) * stairRise, BZ + 1 + s * stairRun],
      `stair_${s}`, 'stairs', 2)
  }
  // Stair stringer (side supports)
  const stringerLen = Math.sqrt((F1 * F1) + (stairCount * stairRun) ** 2)
  const stringerAngle = Math.atan2(F1, stairCount * stairRun)
  add(box(0.06, 0.3, stringerLen), stairMat,
    [0.5, G + F1 / 2, BZ + 1 + stairCount * stairRun / 2],
    'stringer_l', 'stairs', 2, [-stringerAngle, 0, 0])
  add(box(0.06, 0.3, stringerLen), stairMat,
    [1.5, G + F1 / 2, BZ + 1 + stairCount * stairRun / 2],
    'stringer_r', 'stairs', 2, [-stringerAngle, 0, 0])

  // ═══════════════════════════════════════════════════════════════════════════
  // MEP ROUGH-IN — plumbing, electrical, HVAC
  // ═══════════════════════════════════════════════════════════════════════════

  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.3, metalness: 0.4 })
  const drainMat = new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.5 })
  const ventMat = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.5 })
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xeebb33, roughness: 0.6 })
  const ductMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.4, metalness: 0.3 })

  // ── Supply pipes (blue PEX, 1st floor) ──
  // Main supply from basement up through kitchen wall
  add(new THREE.CylinderGeometry(0.04, 0.04, F1, 8), pipeMat, [-3, F1CY, 1.5], 'pipe_supply_vert', 'plumbing_supply', 3)
  // Horizontal run to kitchen
  add(box(4, 0.08, 0.08), pipeMat, [-3, G + 2.5, 1.5], 'pipe_supply_h1', 'plumbing_supply', 3)
  // Hot line branch to bathroom
  add(box(0.08, 0.08, 3), new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.3, metalness: 0.4 }),
    [-5, G + 2.5, 0], 'pipe_hot_bath', 'plumbing_supply', 3)
  // Supply to 2nd floor
  add(new THREE.CylinderGeometry(0.04, 0.04, F2, 8), pipeMat, [-3, F2CY, 1.5], 'pipe_supply_2f', 'plumbing_supply', 3)

  // ── Drain pipes (grey ABS/PVC) ──
  // Kitchen drain (vertical)
  add(new THREE.CylinderGeometry(0.06, 0.06, F1 + 0.5, 8), drainMat, [-2, F1CY - 0.2, 2], 'drain_kitchen', 'plumbing_drain', 3)
  // Bathroom drain
  add(new THREE.CylinderGeometry(0.06, 0.06, F1 + 0.5, 8), drainMat, [-5, F1CY - 0.2, 0], 'drain_bath', 'plumbing_drain', 3)
  // Main drain (horizontal, under 1st floor)
  add(box(0.12, 0.12, 8), drainMat, [-3, G + 0.2, -0.5], 'drain_main', 'plumbing_drain', 3)
  // Toilet drain (larger)
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), drainMat, [-5.5, G + 0.2, -0.5], 'drain_toilet', 'plumbing_drain', 3)

  // ── Vent stack (goes through roof) ──
  add(new THREE.CylinderGeometry(0.05, 0.05, WH + MRR + 1, 8), ventMat, [-4, G + (WH + MRR + 1) / 2, 0.5], 'vent_stack', 'plumbing_vent', 3)

  // ── Electrical runs (yellow romex) ──
  // Horizontal runs along top plates
  add(box(10, 0.04, 0.04), wireMat, [0, G + F1 - 0.2, FZ - 0.15], 'wire_run_f1', 'electrical', 3)
  add(box(10, 0.04, 0.04), wireMat, [0, G + F1 - 0.2, BZ + 0.15], 'wire_run_b1', 'electrical', 3)
  add(box(0.04, 0.04, 7), wireMat, [LX + 0.15, G + F1 - 0.2, 0], 'wire_run_l1', 'electrical', 3)
  // Vertical drops to outlets (every ~4 feet)
  for (let i = 0; i < 6; i++) {
    add(box(0.04, 1.0, 0.04), wireMat, [LX + 2 + i * 2, G + 0.8, FZ - 0.15], `wire_drop_f_${i}`, 'electrical', 3)
  }
  // Panel box (grey box on garage wall)
  add(box(0.4, 0.6, 0.15), new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6 }),
    [GR - 0.2, GCY + 0.5, GF - 0.15], 'elec_panel', 'electrical', 3)
  // Main feed to panel
  add(new THREE.CylinderGeometry(0.05, 0.05, GH, 8), wireMat, [GR - 0.2, GCY, GF - 0.15], 'elec_main_feed', 'electrical', 3)

  // ── HVAC ductwork ──
  // Main trunk (rectangular duct running through 1st floor ceiling)
  add(box(8, 0.35, 0.5), ductMat, [0, G + F1 - 0.4, 0], 'duct_trunk', 'hvac', 3)
  // Branch ducts (round, going to rooms)
  const ductR = 0.12
  add(new THREE.CylinderGeometry(ductR, ductR, 3, 8), ductMat, [-3, G + F1 - 0.4, 2.5], 'duct_branch_1', 'hvac', 3, [0, 0, Math.PI / 2])
  add(new THREE.CylinderGeometry(ductR, ductR, 3, 8), ductMat, [3, G + F1 - 0.4, -2], 'duct_branch_2', 'hvac', 3, [0, 0, Math.PI / 2])
  add(new THREE.CylinderGeometry(ductR, ductR, 2.5, 8), ductMat, [-4, G + F1 - 0.4, 0], 'duct_branch_3', 'hvac', 3, [Math.PI / 2, 0, 0])
  // Furnace/air handler (box in utility area)
  add(box(0.8, 1.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5 }),
    [5, G + 0.6, -3], 'hvac_unit', 'hvac', 3)
  // Return duct
  add(box(0.5, 0.4, 3), ductMat, [5, G + F1 - 0.4, -1.5], 'duct_return', 'hvac', 3)

  // ═══════════════════════════════════════════════════════════════════════════
  // INSULATION
  // ═══════════════════════════════════════════════════════════════════════════

  const battMat = new THREE.MeshStandardMaterial({ color: 0xf0c8d0, roughness: 0.95, transparent: true, opacity: 0.6 })
  // Exterior wall batts (between studs — fill the cavity between studs)
  // Batts fill the space between studs: width = spacing - stud width, depth = stud depth
  const battW = studSpacing - SWide - 0.04  // gap between studs minus clearance
  const battD = SDeep - 0.04               // slightly less than stud depth
  for (let i = 0; i < frontStudCount - 1; i++) {
    const bx = LX + 0.7 + studSpacing / 2 + i * studSpacing
    add(box(battW, studH1 - 0.1, battD), battMat,
      [bx, studY1, FZ - SDeep / 2], `batt_f_${i}`, 'insulation_batts', 4.5)
  }
  // Back wall batts
  for (let i = 0; i < frontStudCount - 1; i++) {
    const bx = LX + 0.7 + studSpacing / 2 + i * studSpacing
    add(box(battW, studH1 - 0.1, battD), battMat,
      [bx, studY1, BZ + SDeep / 2], `batt_b_${i}`, 'insulation_batts', 4.5)
  }
  // Left wall batts
  for (let i = 0; i < sideStudCount - 1; i++) {
    const bz = BZ + 0.7 + studSpacing / 2 + i * studSpacing
    add(box(battD, studH1 - 0.1, battW), battMat,
      [LX + SDeep / 2, studY1, bz], `batt_l_${i}`, 'insulation_batts', 4.5)
  }
  // Right wall batts
  for (let i = 0; i < sideStudCount - 1; i++) {
    const bz = BZ + 0.7 + studSpacing / 2 + i * studSpacing
    add(box(battD, studH1 - 0.1, battW), battMat,
      [RX - SDeep / 2, studY1, bz], `batt_r_${i}`, 'insulation_batts', 4.5)
  }
  // Attic floor insulation (between ceiling joists)
  const atticInsulMat = new THREE.MeshStandardMaterial({ color: 0xf0d0b0, roughness: 0.95, transparent: true, opacity: 0.5 })
  add(box(MW - 0.4, 0.3, MD - 0.4), atticInsulMat, [0, WT + 0.15, 0], 'attic_insul', 'insulation_batts', 4.5)

  // ═══════════════════════════════════════════════════════════════════════════
  // DRYWALL
  // ═══════════════════════════════════════════════════════════════════════════

  const drywallMat = new THREE.MeshStandardMaterial({ color: 0xf5f2ec, roughness: 0.9 })
  // 1st floor ceiling
  add(box(MW - 0.2, 0.04, MD - 0.2), drywallMat, [0, G + F1 - 0.05, 0], 'drywall_ceil_1', 'drywall', 5)
  // 2nd floor ceiling
  add(box(MW - 0.2, 0.04, MD - 0.2), drywallMat, [0, WT - 0.05, 0], 'drywall_ceil_2', 'drywall', 5)
  // 1st floor subfloor surface
  add(box(MW - 0.2, 0.04, MD - 0.2), new THREE.MeshStandardMaterial({ color: 0xc4a870, roughness: 0.7 }),
    [0, G + 0.22, 0], 'subfloor_1', 'drywall', 5)
  // 2nd floor subfloor
  add(box(MW - 0.2, 0.04, MD - 0.2), new THREE.MeshStandardMaterial({ color: 0xc4a870, roughness: 0.7 }),
    [0, FL + 0.22, 0], 'subfloor_2', 'drywall', 5)

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERIOR FINISHES — kitchen, bathroom, fixtures
  // ═══════════════════════════════════════════════════════════════════════════

  const counterMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.15, metalness: 0.1 })
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.6 })
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.2 })

  // ── Kitchen (back-right area of 1st floor) ──
  // Base cabinets (L-shaped along back and right walls)
  add(box(5, 0.9, 0.6), cabinetMat, [3.5, G + 0.45, BZ + 0.4], 'cab_base_back', 'kitchen', 6)
  add(box(0.6, 0.9, 3), cabinetMat, [RX - 0.4, G + 0.45, BZ + 2], 'cab_base_right', 'kitchen', 6)
  // Countertop (dark granite)
  add(box(5.2, 0.06, 0.65), counterMat, [3.5, G + 0.93, BZ + 0.42], 'counter_back', 'kitchen', 6)
  add(box(0.65, 0.06, 3.2), counterMat, [RX - 0.42, G + 0.93, BZ + 2], 'counter_right', 'kitchen', 6)
  // Upper cabinets
  add(box(5, 0.7, 0.35), cabinetMat, [3.5, G + 2.1, BZ + 0.25], 'cab_upper_back', 'kitchen', 6)
  add(box(0.35, 0.7, 3), cabinetMat, [RX - 0.25, G + 2.1, BZ + 2], 'cab_upper_right', 'kitchen', 6)
  // Kitchen island
  add(box(2.5, 0.9, 1.0), cabinetMat, [2.5, G + 0.45, -1.5], 'island_base', 'kitchen', 6)
  add(box(2.7, 0.06, 1.1), counterMat, [2.5, G + 0.93, -1.5], 'island_counter', 'kitchen', 6)
  // Sink (in countertop)
  add(box(0.7, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.1, metalness: 0.8 }),
    [4, G + 0.96, BZ + 0.42], 'kitchen_sink', 'kitchen', 6)
  // Range/stove
  add(box(0.8, 0.9, 0.6), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.5 }),
    [2, G + 0.45, BZ + 0.4], 'range', 'kitchen', 6)
  // Refrigerator
  add(box(0.8, 1.8, 0.7), new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 0.6 }),
    [RX - 0.45, G + 0.9, BZ + 3.8], 'fridge', 'kitchen', 6)

  // ── Bathroom (left-center area of 1st floor) ──
  // Bathtub
  add(box(1.5, 0.45, 0.7), fixtureMat, [-5.5, G + 0.23, 2.5], 'bathtub', 'bathroom', 6)
  // Toilet
  add(box(0.4, 0.5, 0.6), fixtureMat, [-5.5, G + 0.25, -0.5], 'toilet', 'bathroom', 6)
  // Bathroom vanity
  add(box(1.2, 0.8, 0.5), cabinetMat, [-5.5, G + 0.4, 0.5], 'vanity', 'bathroom', 6)
  add(box(1.3, 0.04, 0.55), counterMat, [-5.5, G + 0.82, 0.5], 'vanity_counter', 'bathroom', 6)
  // Bathroom sink
  add(box(0.5, 0.06, 0.4), fixtureMat, [-5.5, G + 0.85, 0.5], 'bath_sink', 'bathroom', 6)
  // Mirror (on wall)
  add(box(1.0, 0.8, 0.03), new THREE.MeshPhysicalMaterial({ color: 0xaabbcc, roughness: 0.02, metalness: 0.9 }),
    [-5.5, G + 1.6, 1 - 0.05], 'mirror', 'bathroom', 6)

  // ── 2nd Floor Bathroom ──
  add(box(1.5, 0.45, 0.7), fixtureMat, [-5.5, FL + 0.23, 2.5], 'bathtub_2f', 'bathroom', 6)
  add(box(0.4, 0.5, 0.6), fixtureMat, [-5.5, FL + 0.25, -0.5], 'toilet_2f', 'bathroom', 6)
  add(box(1.2, 0.8, 0.5), cabinetMat, [-5.5, FL + 0.4, 0.5], 'vanity_2f', 'bathroom', 6)

  // ── Fireplace (living room, front-left) ──
  add(box(1.5, 1.2, 0.3), new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.85 }),
    [-4, G + 0.6, FZ - 0.25], 'fireplace', 'interior_finishes', 6)
  add(box(1.7, 0.1, 0.35), new THREE.MeshStandardMaterial({ color: 0x8a7e6a, roughness: 0.9 }),
    [-4, G + 1.25, FZ - 0.27], 'mantel', 'interior_finishes', 6)

  // ── Closet shelving (2nd floor bedrooms) ──
  add(box(2, 0.04, 0.5), cabinetMat, [-5, FL + 1.5, BZ + 0.35], 'closet_shelf_1', 'interior_finishes', 6)
  add(new THREE.CylinderGeometry(0.03, 0.03, 2, 8), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.5 }),
    [-5, FL + 1.3, BZ + 0.55], 'closet_rod_1', 'interior_finishes', 6, [0, 0, Math.PI / 2])

  // ── Baseboard trim (1st floor perimeter) ──
  const baseboardMat = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.6 })
  add(box(MW - 0.3, 0.12, 0.03), baseboardMat, [0, G + 0.28, FZ - TH - 0.01], 'baseboard_f', 'interior_finishes', 6)
  add(box(MW - 0.3, 0.12, 0.03), baseboardMat, [0, G + 0.28, BZ + TH + 0.01], 'baseboard_b', 'interior_finishes', 6)

  // ── Light fixtures (ceiling-mounted boxes) ──
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, emissive: new THREE.Color(0xfff8e0), emissiveIntensity: 0.3 })
  ;[[-3, 2], [3, 0], [0, -2], [-4, -3]].forEach(([lx, lz], i) => {
    add(box(0.3, 0.04, 0.3), lightMat, [lx, G + F1 - 0.07, lz], `light_1f_${i}`, 'interior_finishes', 6)
  })
  // 2nd floor lights
  ;[[-3, 2], [3, 0], [0, -2]].forEach(([lx, lz], i) => {
    add(box(0.3, 0.04, 0.3), lightMat, [lx, WT - 0.07, lz], `light_2f_${i}`, 'interior_finishes', 6)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // ADJUSTER INSPECTION ELEMENTS — exterior components for hail scoping
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Building Sign (front elevation, mounted on wall) ──
  const signBg = new THREE.MeshStandardMaterial({ color: 0x1a3a6a, roughness: 0.4 })
  const signText = new THREE.MeshStandardMaterial({ color: 0xf0e8d0, roughness: 0.5 })
  // Sign backing
  add(box(3.0, 0.8, 0.08), signBg, [0, G + F1 + F2 / 2 + 0.3, FZ + 0.12], 'sign_backing', 'signage', 8)
  // Sign text area (lighter inset)
  add(box(2.6, 0.5, 0.02), signText, [0, G + F1 + F2 / 2 + 0.3, FZ + 0.17], 'sign_text', 'signage', 8)
  // Sign mounting brackets
  add(box(0.06, 0.15, 0.1), new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4, metalness: 0.5 }),
    [-1.2, G + F1 + F2 / 2 + 0.7, FZ + 0.1], 'sign_bracket_l', 'signage', 8)
  add(box(0.06, 0.15, 0.1), new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4, metalness: 0.5 }),
    [1.2, G + F1 + F2 / 2 + 0.7, FZ + 0.1], 'sign_bracket_r', 'signage', 8)

  // ── Rooftop HVAC/RTU Unit (on garage flat area) ──
  const rtuMat = new THREE.MeshStandardMaterial({ color: 0x8a8a88, roughness: 0.5, metalness: 0.3 })
  const rtuFinMat = new THREE.MeshStandardMaterial({ color: 0x707068, roughness: 0.6, metalness: 0.2 })
  // RTU cabinet (sits on garage roof)
  const rtuX = GCX, rtuZ = GCZ, rtuY = GT + 0.5
  add(box(1.6, 1.0, 1.2), rtuMat, [rtuX, rtuY, rtuZ], 'rtu_cabinet', 'rooftop_hvac', 8)
  // RTU top panel (slightly wider)
  add(box(1.7, 0.04, 1.3), new THREE.MeshStandardMaterial({ color: 0x7a7a78, roughness: 0.5, metalness: 0.3 }),
    [rtuX, rtuY + 0.52, rtuZ], 'rtu_top', 'rooftop_hvac', 8)
  // Condenser fins (visible grille on two sides)
  add(box(0.04, 0.7, 1.0), rtuFinMat, [rtuX - 0.82, rtuY - 0.1, rtuZ], 'rtu_fins_l', 'rooftop_hvac', 8)
  add(box(0.04, 0.7, 1.0), rtuFinMat, [rtuX + 0.82, rtuY - 0.1, rtuZ], 'rtu_fins_r', 'rooftop_hvac', 8)
  // RTU curb (raised platform it sits on)
  add(box(1.8, 0.2, 1.4), new THREE.MeshStandardMaterial({ color: 0x606058, roughness: 0.7 }),
    [rtuX, GT + 0.1, rtuZ], 'rtu_curb', 'rooftop_hvac', 8)
  // Electrical disconnect (small box on the side)
  add(box(0.2, 0.3, 0.08), new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5 }),
    [rtuX + 0.9, rtuY - 0.2, rtuZ + 0.5], 'rtu_disconnect', 'rooftop_hvac', 8)
  // Refrigerant lines (two pipes from RTU down through curb)
  const refLineMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
  add(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), refLineMat,
    [rtuX + 0.6, GT + 0.3, rtuZ - 0.5], 'ref_line_lg', 'rooftop_hvac', 8)
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8), refLineMat,
    [rtuX + 0.5, GT + 0.3, rtuZ - 0.5], 'ref_line_sm', 'rooftop_hvac', 8)

  // ── Soft Metal Roof Vents (aluminum, show hail dents) ──
  const softMetalMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.3, metalness: 0.6 })
  // Turbine vent (on main roof, near ridge)
  add(new THREE.CylinderGeometry(0.2, 0.25, 0.3, 12), softMetalMat,
    [-2, MRY - 0.5, -1], 'turbine_vent', 'soft_metals', 8)
  add(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), softMetalMat,
    [-2, MRY - 0.35, -1], 'turbine_dome', 'soft_metals', 8)
  // Exhaust cap (bathroom fan exhaust)
  add(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8), softMetalMat,
    [-5, MRY - 0.8, 1], 'exhaust_cap', 'soft_metals', 8)
  add(box(0.3, 0.02, 0.3), softMetalMat,
    [-5, MRY - 0.72, 1], 'exhaust_cap_top', 'soft_metals', 8)
  // Pipe boot (plumbing vent penetration flashing — lead/aluminum)
  add(new THREE.CylinderGeometry(0.1, 0.15, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.4 }),
    [-4, MRY - 0.6, 0.5], 'pipe_boot', 'soft_metals', 8)
  // Gooseneck vent (kitchen exhaust)
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), softMetalMat,
    [3, MRY - 0.3, -2], 'gooseneck_base', 'soft_metals', 8)
  add(box(0.08, 0.08, 0.25), softMetalMat,
    [3, MRY - 0.08, -2.1], 'gooseneck_elbow', 'soft_metals', 8, [0.5, 0, 0])

  // ── Parapet Cap Flashing (on bump-out parapet) ──
  const capFlashMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.35, metalness: 0.5 })
  // Cap on bump-out back wall (acts as parapet)
  add(box(BPR - BPL + 0.4, 0.03, 0.35), capFlashMat,
    [BPCX, BPT + 0.02, BPB], 'cap_flash_bump_b', 'cap_flashing', 8)
  add(box(0.35, 0.03, (BPF - BPB) + 0.4), capFlashMat,
    [BPL, BPT + 0.02, BPCZ], 'cap_flash_bump_l', 'cap_flashing', 8)
  add(box(0.35, 0.03, (BPF - BPB) + 0.4), capFlashMat,
    [BPR, BPT + 0.02, BPCZ], 'cap_flash_bump_r', 'cap_flashing', 8)

  // ── Downspouts (visible from elevation) ──
  const dsMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d4, roughness: 0.5 })
  // Front corners
  add(box(0.1, WH, 0.1), dsMat, [RX + OVH - 0.1, (G + WT) / 2, FZ + OVH - 0.1], 'downspout_fr', 'gutters', 8)
  add(box(0.1, WH, 0.1), dsMat, [LX - OVH + 0.1, (G + WT) / 2, FZ + OVH - 0.1], 'downspout_fl', 'gutters', 8)
  // Back corners
  add(box(0.1, WH, 0.1), dsMat, [RX + OVH - 0.1, (G + WT) / 2, BZ - OVH + 0.1], 'downspout_br', 'gutters', 8)
  add(box(0.1, WH, 0.1), dsMat, [LX - OVH + 0.1, (G + WT) / 2, BZ - OVH + 0.1], 'downspout_bl', 'gutters', 8)

  // ── Parking lot surface (for spatter/striping documentation) ──
  add(box(20, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.95 }),
    [GCX, G - 0.01, FZ + 8], 'parking_lot', 'site_elements', 0)
  // Parking stripes
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xeeee66, roughness: 0.7 })
  for (let i = 0; i < 5; i++) {
    add(box(0.08, 0.025, 2.5), stripeMat,
      [GCX - 3 + i * 1.8, G, FZ + 8], `stripe_${i}`, 'site_elements', 0)
  }

  _cache = parts
  _cacheKey = useWebGL2
  return parts
}

/** All unique visibility groups in the model */
export const VISIBILITY_GROUPS = [
  'foundation', 'floor_joists', 'wall_studs', 'walls_1st', 'walls_2nd', 'floor_band',
  'interior_walls', 'stairs', 'gable_ends',
  'sheathing', 'underlayment', 'ice_barrier', 'valley_metal', 'drip_edge',
  'step_flashing', 'ridge_cap', 'fascia_soffit', 'gutters',
  'turret', 'dormer', 'garage_roof', 'bump_roof', 'porch',
  'plumbing_supply', 'plumbing_drain', 'plumbing_vent', 'electrical', 'hvac',
  'insulation_batts', 'drywall',
  'kitchen', 'bathroom', 'interior_finishes',
  'chimney', 'stone_wainscot', 'windows', 'doors',
  'signage', 'rooftop_hvac', 'soft_metals', 'cap_flashing', 'site_elements',
]
