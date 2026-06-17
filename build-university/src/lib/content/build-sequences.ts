import type { DamageScenario } from '@/components/3d/DamageDetailViewer'

// ════════════════════════════════════════════════════════════════════════════════
// BUILD SEQUENCES — cinematic "how it goes together" construction walkthroughs.
// Reuses the DamageScenario shape (a generic cinematic scenario): each stop carries
// its own `visibleGroups`, so the model reveals layer-by-layer as the camera flies.
// Walkthrough-only — no findChallenge / scopeSheet / glossary.
// ════════════════════════════════════════════════════════════════════════════════

// Camera preset shorthand
const C = (p: [number, number, number], t: [number, number, number], fov: number) =>
  ({ position: p, target: t, fov })

// Base context — the structure the roof sits on, visible the whole walkthrough.
const BASE = ['foundation', 'walls_1st', 'walls_2nd']

// Cumulative roof assembly — each layer adds to the one before it.
const L1 = [...BASE, 'gable_ends']
const L2 = [...L1, 'sheathing', 'garage_roof', 'turret', 'dormer', 'bump_roof']
const L3 = [...L2, 'underlayment']
const L4 = [...L3, 'ice_barrier']
const L5 = [...L4, 'drip_edge']
const L6 = [...L5, 'valley_metal']
const L7 = [...L6, 'step_flashing']
const L8 = [...L7, 'ridge_cap']
const L9 = [...L8, 'fascia_soffit', 'gutters']
const L10 = [...L9, 'chimney']

// ════════════════════════════════════════════════════════════════════════════════
// ROOF — Framing to Finished
// ════════════════════════════════════════════════════════════════════════════════

export const ROOF_CONSTRUCTION: DamageScenario = {
  id: 'roof-construction',
  title: 'How a Roof Is Built',
  subtitle: 'Framing to finished — every layer of a complex residential roof, in install order',
  visibleGroups: L10,
  annotations: [],
  stops: [
    {
      ...C([15, 12, 16], [1, 2.8, 0], 40),
      title: '1 · Roof Structure',
      narration: 'A roof starts as structure. Rafters or trusses run from the exterior walls up to the ridge, and the gable ends close off the triangles. The geometry set here — pitch, ridge lines, where planes meet — drives everything that follows. Get the framing wrong and no amount of shingles fixes it.',
      annotationIds: [],
      visibleGroups: L1,
    },
    {
      ...C([10, 10, 12], [1, 2.6, 0], 38),
      title: '2 · Roof Deck (Sheathing)',
      narration: 'Plywood or OSB sheathing is nailed across the framing — the structural deck the whole roof assembly is built on. It ties the rafters together, braces the structure, and gives every layer above it something to fasten to. Panels are gapped slightly and staggered, fastened on a tight nailing schedule.',
      annotationIds: [],
      visibleGroups: L2,
    },
    {
      ...C([11, 9, 12], [0, 3, 0], 36),
      title: '3 · Underlayment',
      narration: 'Underlayment goes down over the entire deck — synthetic or felt. It is the secondary water barrier: if wind drives water past the shingles, the underlayment carries it back down to the eave. It also protects the deck during the dry-in before the roof covering goes on.',
      annotationIds: [],
      visibleGroups: L3,
    },
    {
      ...C([12, 6, 12], [3, 1.6, 2.5], 36),
      title: '4 · Ice & Water Barrier',
      narration: 'Self-adhering ice-and-water membrane is applied at the eaves and up every valley — the spots most likely to back up water from ice dams or heavy runoff. It seals around fasteners. Code typically requires it to extend from the eave edge to at least 24 inches inside the warm wall line.',
      annotationIds: [],
      visibleGroups: L4,
    },
    {
      ...C([5, 4, 12], [0, 0.7, 5.0], 34),
      title: '5 · Drip Edge',
      narration: 'Metal drip edge is installed along the eaves and rakes. At the eave it goes under the underlayment; at the rake, over it. It kicks runoff out into the gutter instead of letting it wick back onto the fascia and rot the edge of the deck.',
      annotationIds: [],
      visibleGroups: L5,
    },
    {
      ...C([13, 6, 10], [7.2, 2.4, 2.3], 32),
      title: '6 · Valley Metal',
      narration: 'Where two roof planes meet — here the main slope into the cross-wing — an open valley gets metal flashing over the ice-and-water barrier. The W-profile crimp keeps the two sides of runoff separated. Fasteners stay outside the water channel; nailing in the flow path is one of the most common valley leaks.',
      annotationIds: [],
      visibleGroups: L6,
    },
    {
      ...C([2, 5, 9], [-2, 2.6, 2.5], 30),
      title: '7 · Step Flashing',
      narration: 'Where the dormer wall pierces the roof slope, step flashing is woven in — one bent piece per shingle course, each lapped over the one below, never a single continuous strip. Done right, water running down the wall is always directed out onto the roof surface, never behind it.',
      annotationIds: [],
      visibleGroups: L7,
    },
    {
      ...C([12, 9, 12], [1, 3.6, 0], 36),
      title: '8 · Ridge Cap',
      narration: 'The field shingles run up each slope, and the ridge cap closes the top where the planes meet. On a complex roof every ridge and every hip gets capped. The ridge is also where ventilation usually exits — a ridge vent under the cap lets the attic breathe.',
      annotationIds: [],
      visibleGroups: L8,
    },
    {
      ...C([6, 4, 13], [0, 0.4, 5.0], 38),
      title: '9 · Fascia, Soffit & Gutters',
      narration: 'The eave is finished out: fascia covers the rafter tails, soffit closes the underside and feeds intake ventilation, and gutters and downspouts carry the water the roof sheds away from the foundation. The roof is not done until the water has somewhere to go.',
      annotationIds: [],
      visibleGroups: L9,
    },
    {
      ...C([12, 7, 8], [7, 4.0, 0], 30),
      title: '10 · Chimney Saddle & Flashing',
      narration: 'The masonry chimney pierces the roof. Step flashing is woven into the courses on the sides, counter-flashing tucks into a sawn reglet in the masonry, and on the uphill side a cricket — a small ridged saddle — sheds water around the chimney instead of letting it pond against the back face. Every plane is layered shingle-style; water can only run down, never sideways into a joint.',
      annotationIds: [],
      visibleGroups: L10,
    },
    {
      ...C([17, 14, 18], [1, 2, 0], 44),
      title: '11 · Finished Roof',
      narration: 'Every layer in order — structure, deck, underlayment, ice-and-water barrier, drip edge, valley metal, step flashing, covering, ridge cap, eave trim, and chimney saddle. Each one depends on the one beneath it. When you inspect a roof, you are reading this stack in reverse.',
      annotationIds: [],
      visibleGroups: L10,
    },
  ],
}

// ── All build sequences ──

export const ALL_BUILD_SEQUENCES: DamageScenario[] = [
  ROOF_CONSTRUCTION,
]

export function getBuildSequence(id: string): DamageScenario | undefined {
  return ALL_BUILD_SEQUENCES.find(s => s.id === id)
}
