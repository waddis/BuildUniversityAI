import type { DamageScenario } from '@/components/3d/DamageDetailViewer'

// ════════════════════════════════════════════════════════════════════════════════
// DAMAGE SCENARIOS — JigSpace-style cinematic damage inspection walkthroughs
// Each scenario guides the user through identifying specific damage types
// ════════════════════════════════════════════════════════════════════════════════

// Helper — camera preset shorthand
const C = (p: [number, number, number], t: [number, number, number], fov: number) =>
  ({ position: p, target: t, fov })

// ── Scenario 1: Hail Damage on Windows ──

export const HAIL_WINDOW_DAMAGE: DamageScenario = {
  id: 'hail-window-damage',
  title: 'Hail Damage: Window Inspection',
  subtitle: 'Learn to identify and document hail impact on window components',
  visibleGroups: ['walls_1st', 'walls_2nd', 'windows', 'doors', 'stone_wainscot', 'fascia_soffit', 'foundation'],
  annotations: [
    {
      id: 'hw-1',
      position: [3, -1, 4.8],
      title: 'Cracked glazing',
      description: 'Hail impact fractures window glazing in a characteristic starburst or bullseye pattern. The crack radiates from a round point of impact. Photograph the crack with a ruler at the impact point to document hail diameter. Single-pane and older double-pane windows are most susceptible.',
      severity: 'severe',
      codeRef: 'IRC R613.1',
      indicator: 'circle',
      radius: 0.3,
    },
    {
      id: 'hw-2',
      position: [5, -0.5, 4.8],
      title: 'Dented window frame',
      description: 'Aluminum window frames show round dents from hail impact on the exposed face. Each dented frame is a separate line item. Document the frame material (aluminum, vinyl, wood clad), size, and type (single hung, double hung, casement, fixed). Vinyl frames crack rather than dent.',
      severity: 'moderate',
      indicator: 'circle',
      radius: 0.2,
    },
    {
      id: 'hw-3',
      position: [-3, -1, 4.8],
      title: 'Damaged screen',
      description: 'Window screens are the first indicator of hail at a property. Look for stretched or torn mesh, bent frames, and punctures. Each screen is a line item by size. Screens are cheap to replace but valuable as proof of hail direction and approximate size.',
      severity: 'minor',
      indicator: 'circle',
      radius: 0.3,
    },
    {
      id: 'hw-4',
      position: [0, 0.5, 4.8],
      title: 'Broken seal (fogged IGU)',
      description: 'Hail impact can break the hermetic seal on insulated glass units (IGUs), causing the space between panes to fog with condensation. This may not appear immediately — it can take days or weeks after the storm event. If the claim was recent and you see fogged units, document them and note the date of loss.',
      severity: 'severe',
      codeRef: 'ASTM E2190',
      indicator: 'circle',
      radius: 0.25,
    },
    {
      id: 'hw-5',
      position: [3, 1.5, 4.8],
      title: 'Damaged window trim',
      description: 'Exterior window trim (casing, brick mold, sill) shows dents, cracks, or chips from hail. Wood trim splinters; aluminum dents; vinyl cracks. Each window\'s trim is a separate line item. Photograph with ruler.',
      severity: 'moderate',
      indicator: 'circle',
      radius: 0.2,
    },
  ],
  stops: [
    {
      ...C([0, 3, 28], [0, -1, 0], 38),
      title: 'Front Elevation Overview',
      narration: 'Start with a full front elevation photo showing all fenestrations (windows and doors). This establishes the building face and shows the carrier how many windows are exposed to the storm direction. Count every window unit visible from this elevation.',
      annotationIds: [],
      highlightedGroups: ['windows'],
    },
    {
      ...C([4, 0, 12], [3, -0.5, 4.8], 28),
      title: 'Approach the Windows',
      narration: 'Move closer to inspect individual windows. On a hail claim, you need to inspect every window on the storm-facing elevation. Each window is a potential line item: glazing, frame, screen, hardware, and trim are all separate components.',
      annotationIds: ['hw-1', 'hw-2', 'hw-3'],
      highlightedGroups: ['windows'],
    },
    {
      ...C([3.5, -0.5, 8], [3, -1, 4.8], 18),
      title: 'Glazing Damage Close-Up',
      narration: 'Zoom into the glazing. Hail creates a distinctive starburst or bullseye fracture pattern. The impact point is round — matching the hailstone diameter. Place your ruler at the impact point. For double-pane windows, check if both panes are damaged or just the outer lite. Each pane is a separate line item.',
      annotationIds: ['hw-1', 'hw-4'],
      highlightedGroups: ['windows'],
    },
    {
      ...C([5.5, 0, 8], [5, -0.5, 4.8], 20),
      title: 'Frame and Trim Inspection',
      narration: 'Inspect the window frame and exterior trim. Aluminum frames dent; vinyl frames crack and chip; wood frames splinter. Measure the window (width x height) and note the operation type. The frame damage and trim damage are separate line items on the estimate. Do not combine them.',
      annotationIds: ['hw-2', 'hw-5'],
      highlightedGroups: ['windows'],
    },
    {
      ...C([-3.5, -0.5, 8], [-3, -1, 4.8], 22),
      title: 'Screen Damage',
      narration: 'Window screens are soft and show hail impact clearly — stretched mesh, punctures, bent frames. They are your proof of hail at the property even when harder materials show less obvious damage. Document every damaged screen with its size (window dimensions) and frame color.',
      annotationIds: ['hw-3'],
      highlightedGroups: ['windows'],
    },
    {
      ...C([0, 3, 16], [0, -0.5, 4.8], 32),
      title: 'Complete Window Documentation',
      narration: 'For the scope sheet, you need: (1) number of damaged windows per type and size, (2) specific damage per window (glazing, frame, screen, trim), (3) photos with ruler for each damage type, (4) window specifications (material, type, size, manufacturer if visible). One missed window is one missed line item.',
      annotationIds: ['hw-1', 'hw-2', 'hw-3', 'hw-4', 'hw-5'],
      highlightedGroups: ['windows'],
    },
  ],
}

// ── Scenario 2: Roof Membrane Blistering ──

export const ROOF_BLISTERING: DamageScenario = {
  id: 'roof-blistering',
  title: 'Roof Membrane Blistering',
  subtitle: 'Identify blisters on modified bitumen and BUR membranes — and distinguish from hail',
  visibleGroups: ['sheathing', 'underlayment', 'ridge_cap', 'valley_metal', 'chimney', 'soft_metals', 'rooftop_hvac', 'cap_flashing'],
  annotations: [
    {
      id: 'rb-1',
      position: [0, 2.5, 0],
      title: 'Thermal blister',
      description: 'Thermal blisters form when trapped moisture or air between membrane plies expands under solar heat. They appear as raised, dome-shaped bubbles with smooth, undamaged granule surfaces. Key distinction: blisters are ROUND and RAISED with intact granules; hail bruises are FLAT with fractured granules.',
      severity: 'moderate',
      indicator: 'area',
      radius: 0.5,
    },
    {
      id: 'rb-2',
      position: [3, 2.5, -2],
      title: 'Open blister (ruptured)',
      description: 'When a blister ruptures, moisture enters the membrane system. The exposed layers deteriorate rapidly. A ruptured blister is a maintenance defect and is PRE-EXISTING — not storm damage. Carriers will deny claims where ruptured blisters are mixed with hail bruises.',
      severity: 'severe',
      indicator: 'circle',
      radius: 0.3,
    },
    {
      id: 'rb-3',
      position: [-2, 2.5, 2],
      title: 'Hail bruise (for comparison)',
      description: 'A hail bruise is a round depression where the granule surface is fractured. It is FLAT or concave, not raised like a blister. The chalk test reveals fracture patterns. Hail bruises are consistent in size across the roof (matching the hailstone diameter). Blisters vary in size randomly.',
      severity: 'severe',
      codeRef: 'NRCA Guidelines',
      indicator: 'circle',
      radius: 0.2,
    },
    {
      id: 'rb-4',
      position: [-4, 2.5, -1],
      title: 'Alligatoring (aged membrane)',
      description: 'Alligatoring is a network of surface cracks resembling alligator skin. It indicates UV degradation and membrane aging — pre-existing condition. Do NOT report as storm damage. However, alligatored membrane IS more susceptible to hail damage, which can affect coverage.',
      severity: 'moderate',
      indicator: 'area',
      radius: 0.4,
    },
    {
      id: 'rb-5',
      position: [2, 2.5, 3],
      title: 'Granule loss pattern',
      description: 'Wind-driven rain and foot traffic cause granule loss over time — this is pre-existing. It appears as uniform, gradual loss in traffic paths or across the membrane face. Storm-related granule loss is concentrated in round hail impact zones. Document the pattern to distinguish.',
      severity: 'minor',
      indicator: 'area',
      radius: 0.5,
    },
  ],
  stops: [
    {
      ...C([2, 28, 2], [0, 0, 0], 50),
      title: 'Roof Overview — Before Getting Close',
      narration: 'Start with an overview from the highest point. Before you get close to the membrane, observe the overall condition: are there visible blisters, ponding areas, or deterioration patterns? Note where the HVAC equipment, drains, and penetrations are. These landmarks help you orient your test squares.',
      annotationIds: [],
      highlightedGroups: ['sheathing'],
    },
    {
      ...C([4, 8, 4], [0, 2, 0], 30),
      title: 'Getting Closer — What You See',
      narration: 'As you approach the membrane, you will see raised areas (blisters), discoloration, and possibly granule irregularities. Do NOT assume everything you see is hail damage. The most common adjuster mistake is calling blisters as hail bruises — this gets the claim denied and damages your credibility.',
      annotationIds: ['rb-1', 'rb-2'],
      highlightedGroups: ['sheathing', 'underlayment'],
    },
    {
      ...C([1, 4, 2], [0, 2.5, 0], 20),
      title: 'Thermal Blister — Close Up',
      narration: 'A thermal blister is RAISED like a dome. The granule surface on top is smooth and intact — because no impact occurred. Blisters form from trapped moisture expanding under heat. They vary in size from a few inches to several feet. Press gently — a blister may feel soft or spongy. DO NOT puncture it.',
      annotationIds: ['rb-1'],
      highlightedGroups: ['sheathing'],
    },
    {
      ...C([-2, 4, 3], [-2, 2.5, 2], 18),
      title: 'Hail Bruise — The Difference',
      narration: 'A hail bruise is FLAT or slightly concave — the opposite of a blister. The granule surface is fractured in a round pattern matching the hailstone diameter. The chalk test reveals the fracture: rub chalk across the surface and the fractured zone accepts chalk differently than surrounding intact granules. Bruise sizes are CONSISTENT across the roof.',
      annotationIds: ['rb-3'],
      highlightedGroups: ['sheathing'],
    },
    {
      ...C([3.5, 4, -1], [3, 2.5, -2], 18),
      title: 'Ruptured Blister — Pre-Existing',
      narration: 'A ruptured blister exposes the inner membrane layers to moisture. The edges curl upward, and you may see deteriorated felts or insulation below. This is ALWAYS pre-existing damage — it happens over months or years of thermal cycling. Document it separately from storm damage. If the carrier sees ruptured blisters mixed into your hail scope, the entire claim loses credibility.',
      annotationIds: ['rb-2'],
      highlightedGroups: ['sheathing'],
    },
    {
      ...C([-4, 4, 0], [-4, 2.5, -1], 20),
      title: 'Alligatoring — Age Indicator',
      narration: 'The crack pattern you see here is alligatoring — UV breakdown of the membrane surface over years of exposure. It means the roof is at or near end of life. Alligatoring is never storm damage. However, an alligatored roof IS more vulnerable to hail because the membrane has lost flexibility. Some carriers will still cover hail damage on an aged roof if you clearly separate storm damage from pre-existing.',
      annotationIds: ['rb-4'],
      highlightedGroups: ['sheathing'],
    },
    {
      ...C([6, 12, 6], [0, 2, 0], 35),
      title: 'Documentation Standard',
      narration: 'When scoping a flat roof with both blisters and hail: (1) Photograph blisters and label as pre-existing in your report, (2) Chalk-test and photograph at least 3 test squares in different areas for hail bruises, (3) Document soft metals for independent hail confirmation, (4) Note the roof age and overall condition. The carrier expects you to separate the two — if you do not, the entire claim is denied.',
      annotationIds: ['rb-1', 'rb-2', 'rb-3', 'rb-4', 'rb-5'],
      highlightedGroups: ['sheathing', 'soft_metals'],
    },
  ],
}

// ── Scenario 3: Hail Damage on Soft Metals ──

export const SOFT_METAL_DAMAGE: DamageScenario = {
  id: 'soft-metal-damage',
  title: 'Soft Metal Hail Indicators',
  subtitle: 'Soft metals prove hail contact at the property — learn to find and document them',
  visibleGroups: ['sheathing', 'soft_metals', 'rooftop_hvac', 'ridge_cap', 'gutters', 'fascia_soffit', 'chimney', 'cap_flashing'],
  annotations: [
    {
      id: 'sm-1',
      position: [-2, 3, -0.5],
      title: 'Turbine vent dents',
      description: 'Aluminum turbine vents dent easily from hail. Round dents on the dome and throat confirm hail contact. The pattern should be consistent with the storm direction. Photograph dents with ruler — each turbine vent is a line item.',
      severity: 'moderate',
      indicator: 'circle',
      radius: 0.3,
    },
    {
      id: 'sm-2',
      position: [1, 2.5, 1],
      title: 'Pipe boot — lead flashing',
      description: 'Lead pipe boots are the softest metal on a roof. Even small hail leaves visible dents. Also check the neoprene collar for cracking — a secondary failure from UV and hail impact. Each pipe boot is a line item.',
      severity: 'moderate',
      indicator: 'circle',
      radius: 0.2,
    },
    {
      id: 'sm-3',
      position: [-9.5, -0.5, 0],
      title: 'RTU condenser fins',
      description: 'Aluminum condenser fins crush from hail impact, reducing airflow. Document the percentage of fin area damaged. The unit nameplate (model, serial, tonnage) determines pricing. Each HVAC unit is a major line item.',
      severity: 'severe',
      indicator: 'circle',
      radius: 0.5,
    },
    {
      id: 'sm-4',
      position: [0, -3, 5],
      title: 'Gutter top face',
      description: 'Hail dents the horizontal (top) face and vertical (front) face of gutters — these are two separate line items. Document gutter type, material, and linear footage. K-style aluminum is most common.',
      severity: 'moderate',
      indicator: 'circle',
      radius: 0.3,
    },
  ],
  stops: [
    {
      ...C([2, 20, 2], [0, 0, 0], 45),
      title: 'Why Soft Metals Matter',
      narration: 'Soft metals are your PROOF of hail at the property. Even when membrane bruises are subtle or hard to see, soft metal dents are unmistakable. Carriers cannot dispute round dents in aluminum that match the storm report. Always document soft metals first — they establish hail contact before you even look at the roof membrane.',
      annotationIds: [],
      highlightedGroups: ['soft_metals', 'rooftop_hvac', 'gutters'],
    },
    {
      ...C([-1, 6, 2], [-2, 3, -0.5], 24),
      title: 'Turbine Vent Inspection',
      narration: 'The turbine vent is aluminum and shows hail damage clearly. Look for round dents on the dome (top) and throat (cylindrical body). The dents should be consistent in size. Place your ruler next to a dent for scale. Note whether the vent still spins freely — seized turbines from hail damage are a replacement, not repair.',
      annotationIds: ['sm-1'],
      highlightedGroups: ['soft_metals'],
    },
    {
      ...C([2, 4, 3], [1, 2.5, 1], 20),
      title: 'Pipe Boot Close-Up',
      narration: 'Lead pipe boots are the softest metal on any roof. They show dents from even 1-inch hail. Inspect the lead flashing for round dents and the neoprene collar for cracks. A cracked collar allows water intrusion around the pipe penetration — this is secondary damage from the storm event even if the crack was caused by UV exposure weakened by hail impact.',
      annotationIds: ['sm-2'],
      highlightedGroups: ['soft_metals'],
    },
    {
      ...C([-6, 2, 4], [-9.5, -0.5, 0], 28),
      title: 'HVAC Unit — Condenser Fins',
      narration: 'Move to the rooftop HVAC unit. Hail crushes the aluminum condenser fins. Photograph from the side that shows the fin damage pattern. Use your ruler. Document the percentage of total fin area damaged — typically >15-25% means replacement rather than fin combing (repair). Get the unit nameplate for model and tonnage.',
      annotationIds: ['sm-3'],
      highlightedGroups: ['rooftop_hvac'],
    },
    {
      ...C([6, 0, 10], [0, -3, 5], 26),
      title: 'Gutter Damage — Two Line Items',
      narration: 'Gutters are often overlooked. Hail hits the TOP face (horizontal) and the FRONT face (vertical) — each is a separate line item. Walk the full gutter run with your ruler. Document the gutter type (K-style, half-round), material (aluminum, steel, copper), size (5-inch, 6-inch), and total linear footage. Downspouts are separate items by size.',
      annotationIds: ['sm-4'],
      highlightedGroups: ['gutters', 'fascia_soffit'],
    },
    {
      ...C([12, 10, 12], [0, 0, 0], 40),
      title: 'Building Your Evidence Chain',
      narration: 'Soft metals build an evidence chain: if the turbine vent is dented, the pipe boot is dented, the HVAC fins are crushed, and the gutters are dented — all with consistent round impacts matching the storm report — the carrier cannot deny hail contact at the property. This evidence supports your membrane test squares. Document soft metals BEFORE the membrane.',
      annotationIds: ['sm-1', 'sm-2', 'sm-3', 'sm-4'],
      highlightedGroups: ['soft_metals', 'rooftop_hvac', 'gutters'],
    },
  ],
}

// ── All scenarios ──

export const ALL_DAMAGE_SCENARIOS: DamageScenario[] = [
  HAIL_WINDOW_DAMAGE,
  ROOF_BLISTERING,
  SOFT_METAL_DAMAGE,
]

export function getDamageScenario(id: string): DamageScenario | undefined {
  return ALL_DAMAGE_SCENARIOS.find(s => s.id === id)
}
