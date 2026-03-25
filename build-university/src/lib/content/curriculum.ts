// ════════════════════════════════════════════════════════════════════════════════
// FULL CURRICULUM — All 14 construction phases, every lesson with 3D steps
// 66 lessons, 200+ 3D camera-choreographed steps
// ════════════════════════════════════════════════════════════════════════════════

import type { CameraPreset } from '@/types'

export interface CurriculumModule {
  slug: string; title: string; description: string; phase: string; track: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'; lessons: CurriculumLesson[]; icon: string
}
export interface CurriculumLesson {
  slug: string; title: string; objective: string; type: 'learn' | 'inspect' | 'quiz'
  durationMinutes: number; steps?: LessonStepData[]; quizQuestions?: QuizQuestionData[]; inspectIssues?: InspectIssueData[]
}
export interface LessonStepData {
  title: string; instruction: string; narration?: string; actionType?: 'observe' | 'click' | 'identify' | 'compare'
  camera: CameraPreset; hiddenGroups?: string[]; highlightedGroups?: string[]; explodeOffset?: number
  codeRefs?: { family: string; section: string; summary: string }[]
}
export interface QuizQuestionData { text: string; type: 'multiple_choice' | 'true_false'; options?: string[]; correctAnswer: number | string; explanation: string }
export interface InspectIssueData { meshKey: string; title: string; description: string; severity: 'minor' | 'moderate' | 'severe' | 'critical'; codeRef?: string }

// Camera shorthand
const C = (p: [number,number,number], t: [number,number,number], fov?: number): CameraPreset => ({ position: p, target: t, fov })

// ── PHASE-PROGRESSIVE VISIBILITY ──
// Each phase shows only what has been built up to that point.
// Everything NOT in the "visible" list gets hidden.
const ALL_GROUPS = [
  'foundation','floor_joists','wall_studs','walls_1st','walls_2nd','floor_band',
  'interior_walls','stairs','gable_ends',
  'sheathing','underlayment','ice_barrier','valley_metal','drip_edge',
  'step_flashing','ridge_cap','fascia_soffit','gutters',
  'turret','dormer','garage_roof','bump_roof','porch',
  'plumbing_supply','plumbing_drain','plumbing_vent','electrical','hvac',
  'insulation_batts','drywall',
  'kitchen','bathroom','interior_finishes',
  'chimney','stone_wainscot','windows','doors',
  'signage','rooftop_hvac','soft_metals','cap_flashing','site_elements',
]

function hideExcept(...visible: string[]): string[] {
  return ALL_GROUPS.filter(g => !visible.includes(g))
}

// What's been built at each phase (cumulative — matches real construction)
const PHASE_VISIBLE = {
  site_prep:     [] as string[],
  excavation:    [] as string[],
  foundation:    ['foundation'],
  framing_floor: ['foundation','floor_joists'],
  framing_walls: ['foundation','floor_joists','wall_studs','floor_band','interior_walls','stairs'],
  framing_roof:  ['foundation','floor_joists','wall_studs','floor_band','interior_walls','stairs','gable_ends','sheathing','ridge_cap','garage_roof','turret','dormer','bump_roof'],
  sheathing:     ['foundation','floor_joists','wall_studs','floor_band','interior_walls','stairs','gable_ends','sheathing','ridge_cap','garage_roof','turret','dormer','bump_roof'],
  dry_in:        ['foundation','floor_joists','wall_studs','floor_band','interior_walls','stairs','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','garage_roof','turret','dormer','bump_roof'],
  windows_doors: ['foundation','floor_joists','wall_studs','walls_1st','walls_2nd','floor_band','interior_walls','stairs','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','garage_roof','turret','dormer','bump_roof','windows','doors','porch'],
  wrb_cladding:  ['foundation','floor_joists','wall_studs','walls_1st','walls_2nd','floor_band','interior_walls','stairs','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','garage_roof','turret','dormer','bump_roof','windows','doors','porch','stone_wainscot'],
  mep_rough:     ['foundation','floor_joists','wall_studs','floor_band','interior_walls','stairs','plumbing_supply','plumbing_drain','plumbing_vent','electrical','hvac'],
  insulation:    ['foundation','floor_joists','wall_studs','floor_band','interior_walls','stairs','gable_ends','sheathing','plumbing_supply','plumbing_drain','plumbing_vent','electrical','hvac','insulation_batts'],
  drywall:       ['foundation','walls_1st','walls_2nd','floor_band','interior_walls','stairs','windows','doors','drywall'],
  final:         ALL_GROUPS,
}

// Shorthand: get hidden groups for a construction phase
const PH = (phase: keyof typeof PHASE_VISIBLE): string[] => hideExcept(...PHASE_VISIBLE[phase])

// For lessons that need to highlight specific systems within their phase
// Helper presets — what to hide to focus on a specific system
const HIDE_ALL_BUT_FOUNDATION = hideExcept('foundation')
// Framing view: studs, joists, plates, interior walls — NO SIDING
const HIDE_ALL_BUT_FRAMING = hideExcept('foundation','floor_joists','wall_studs','floor_band','interior_walls','stairs')
// Walls view (includes siding — for later phases like windows/doors)
const HIDE_ALL_BUT_WALLS = hideExcept('foundation','floor_joists','wall_studs','walls_1st','walls_2nd','floor_band','interior_walls','stairs')
// Roof view: framing + roof structure
const HIDE_ALL_BUT_ROOF = hideExcept('foundation','floor_joists','wall_studs','floor_band','interior_walls','stairs','gable_ends','sheathing','ridge_cap','valley_metal','ice_barrier','underlayment','drip_edge','step_flashing','fascia_soffit','garage_roof','turret','dormer','bump_roof')
const HIDE_DETAILS = ['stone_wainscot','windows','doors','porch','gutters','chimney']
const HIDE_NON_ENVELOPE = hideExcept('walls_1st','walls_2nd','floor_band','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','gable_ends','windows','doors')

// ════════════════════════════════════════════════════════════════════════════════
// 1. SITE PREP
// ════════════════════════════════════════════════════════════════════════════════
const M01: CurriculumModule = {
  slug: 'site-prep', title: 'Site Prep & Leveling', phase: 'site_prep', track: 'foundation', difficulty: 'beginner', icon: 'site',
  description: 'Where every build begins. Reading the site, establishing benchmarks, grading for drainage, and preparing the building pad.',
  lessons: [
    { slug: 'reading-the-site', title: 'Reading the Site', objective: 'Assess slope, drainage patterns, soil conditions, and setback requirements before any equipment arrives.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'The Empty Lot', instruction: 'Before anything is built, you must read the site. Slope direction determines where water flows. Soil type determines foundation design. Setbacks determine where you can build.', camera: C([35,20,30],[0,-5,0],45), hiddenGroups: PH('site_prep') },
      { title: 'Water Flows Downhill', instruction: 'Look at the surrounding grade. Water must always flow AWAY from where the house will sit. If the lot drains toward the building pad, you must regrade before starting.', camera: C([30,8,25],[0,-5,0],38), hiddenGroups: PH('site_prep') },
      { title: 'The Building Envelope', instruction: 'Setbacks define the buildable area — how far the house must be from property lines. Front, side, and rear setbacks are set by local zoning. The house footprint must fit within these limits.', camera: C([0,30,0],[0,-5,0],50), hiddenGroups: PH('site_prep') },
    ]},
    { slug: 'benchmarks-layout', title: 'Benchmarks & Layout', objective: 'Establish elevation benchmarks, set batter boards, and transfer the building footprint from plans to the ground.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'The Benchmark', instruction: 'A benchmark is a fixed elevation reference point — usually a stake, nail, or mark on an existing structure. Every vertical measurement on the project references this single point. Lose it and all elevations are guesses.', camera: C([20,6,20],[0,-5,0],32), hiddenGroups: PH('site_prep') },
      { title: 'Batter Boards', instruction: 'Batter boards are set 4-6 feet beyond each corner. String lines stretched between them define the exact building footprint. The strings can be removed for excavation and reset precisely.', camera: C([15,4,15],[0,-5,0],28), hiddenGroups: PH('site_prep') },
      { title: 'Squaring the Layout', instruction: 'Use the 3-4-5 rule (or 6-8-10) to verify corners are square. Measure diagonals — if they are equal, the rectangle is square. A layout that is off even 1 inch at the foundation becomes 2 inches at the roof.', camera: C([0,12,18],[0,-5,0],35), hiddenGroups: PH('site_prep') },
    ]},
    { slug: 'grading-drainage', title: 'Grading & Drainage', objective: 'Grade the lot to move water away from the foundation — 6 inches of fall in the first 10 feet per IRC R401.3.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'The 6-in-10 Rule', instruction: 'IRC R401.3: Finish grade must slope at least 6 inches downward within the first 10 feet from the foundation wall. This is the most violated code section in residential construction.', camera: C([20,4,18],[0,-5,2],30), hiddenGroups: PH('site_prep'), codeRefs: [{ family: 'IRC', section: 'R401.3', summary: 'Finish grade: min 6" fall in first 10 feet from foundation. Impervious surfaces: min 2% slope.' }] },
      { title: 'Why Grading Fails', instruction: 'Builders get the grade right at CO. Then landscapers add mulch and soil against the foundation, reversing the slope. Within 2 years, water pools against the wall. This causes more basement water than any other single factor.', camera: C([12,2,14],[0,-5,0],26), hiddenGroups: PH('site_prep') },
      { title: 'Swales and Drains', instruction: 'Where natural grade cannot move water away, swales (shallow surface channels) or French drains (subsurface perforated pipe with gravel) redirect flow. Downspout discharge must extend at least 6 feet from the foundation.', camera: C([-15,6,12],[0,-5,-3],32), hiddenGroups: PH('site_prep') },
    ]},
    { slug: 'compaction', title: 'Cut, Fill & Compaction', objective: 'Understand earthwork basics, why proper compaction prevents settlement, and when a compaction test is required.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Cut vs Fill', instruction: 'Cut removes soil to reach the target elevation. Fill adds soil to raise the elevation. The critical rule: fill must be compacted in lifts (6-8 inch layers) to prevent future settlement.', camera: C([22,10,22],[0,-5,0],38), hiddenGroups: PH('site_prep') },
      { title: 'Why Settlement Destroys Houses', instruction: 'Uncompacted fill under a slab or footing will settle over time. This causes slab cracks, drywall cracks, door misalignment, and in severe cases, structural failure. A $200 compaction test prevents $50,000 in repairs.', camera: C([16,4,16],[0,-5,0],30), hiddenGroups: PH('site_prep') },
    ]},
    { slug: 'site-prep-quiz', title: 'Site Prep Quiz', objective: 'Test your understanding of site preparation, grading, and layout.', type: 'quiz', durationMinutes: 8, quizQuestions: [
      { text: 'Finish grade must slope at least ___ inches in the first 10 feet from the foundation.', type: 'multiple_choice', options: ['2 inches','4 inches','6 inches','12 inches'], correctAnswer: 2, explanation: 'IRC R401.3 requires a minimum 6-inch fall within the first 10 feet from the foundation wall.' },
      { text: 'The 3-4-5 method is used to verify corners are square.', type: 'true_false', correctAnswer: 'true', explanation: 'If a triangle with sides of 3, 4, and 5 units has a right angle at the 3-4 corner. Scale up (6-8-10, 9-12-15) for more accuracy.' },
      { text: 'Fill soil should be compacted in what maximum lift thickness?', type: 'multiple_choice', options: ['12 inches','6-8 inches','24 inches','It does not matter'], correctAnswer: 1, explanation: 'Fill must be placed and compacted in lifts of 6-8 inches. Thicker lifts cannot be adequately compacted and will settle.' },
      { text: 'What tool is used to establish the building footprint on the ground?', type: 'multiple_choice', options: ['Transit only','Batter boards with string lines','Spray paint','Wooden stakes only'], correctAnswer: 1, explanation: 'Batter boards set beyond corners with string lines stretched between them define the exact footprint. They can be removed and reset accurately.' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 2. EXCAVATION
// ════════════════════════════════════════════════════════════════════════════════
const M02: CurriculumModule = {
  slug: 'excavation', title: 'Excavation', phase: 'excavation', track: 'foundation', difficulty: 'beginner', icon: 'dig',
  description: 'The earthwork phase — utility locates, trench types, shoring, dewatering, and the safety protocols that keep people alive.',
  lessons: [
    { slug: 'before-you-dig', title: 'Before You Dig', objective: 'Complete utility locates, obtain permits, and establish the excavation plan before any equipment arrives.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Call Before You Dig', instruction: 'Every state requires utility locates before excavation (811 in the US). Gas, electric, water, sewer, telecom — hitting a buried line can be fatal. Wait for all utilities to be marked. No exceptions.', camera: C([30,10,28],[0,-5,0],42), hiddenGroups: PH('excavation') },
      { title: 'The Excavation Plan', instruction: 'Before the machine starts: know the target depth, the soil type (from the geotech report or visual assessment), where spoil will be stockpiled, and where equipment will access. Plan the sequence to avoid re-excavating.', camera: C([22,8,20],[0,-5,0],36), hiddenGroups: PH('excavation') },
      { title: 'Existing Conditions', instruction: 'Document what is there now: trees to protect (root zones), neighboring structures (which need underpinning if you dig close), existing drainage patterns, and overhead utilities. Excavation changes everything.', camera: C([26,12,24],[0,-5,0],40), hiddenGroups: PH('excavation') },
    ]},
    { slug: 'excavation-sequence', title: 'Excavation Sequence', objective: 'Execute excavation in the correct order: topsoil strip, mass excavation, fine grading, footing trench.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Strip Topsoil', instruction: 'Remove the top 6-12 inches of organic soil. Stockpile it separately — this is valuable material for final grading but cannot support structures. Keep it away from the excavation edge.', camera: C([28,12,24],[0,-5,0],40), hiddenGroups: PH('excavation') },
      { title: 'Mass Excavation', instruction: 'Remove soil to within 6 inches of the target elevation. For basements: 8-9 feet deep. For crawlspaces: 2-3 feet. For slabs: 12-18 inches. Over-excavate and you must backfill with compacted material.', camera: C([20,6,18],[0,-5,0],34), hiddenGroups: PH('excavation') },
      { title: 'Footing Trench', instruction: 'The final cut to exact footing width and depth. Trench walls vertical, bottom dead level. Never disturb the bearing soil at the bottom — stepping in it, driving on it, or letting it freeze all reduce bearing capacity.', camera: C([12,2,14],[0,-5,0],28), hiddenGroups: PH('excavation'), codeRefs: [{ family: 'IRC', section: 'R403.1', summary: 'Footings shall be placed on undisturbed natural soil or engineered fill.' }] },
      { title: 'Dewatering', instruction: 'If groundwater enters the excavation, you must remove it before placing concrete. Sump pumps, well points, or perimeter ditches keep the trench dry. Concrete placed in standing water is compromised concrete.', camera: C([16,4,16],[0,-5,0],30), hiddenGroups: PH('excavation') },
    ]},
    { slug: 'trench-safety', title: 'Trench Safety & Shoring', objective: 'Understand OSHA trench safety requirements that apply even on residential sites.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'The 5-Foot Rule', instruction: 'OSHA requires protective systems (sloping, shoring, or shielding) for any trench 5 feet or deeper. A cubic yard of soil weighs 2,700-3,000 lbs. A trench collapse buries a person in seconds.', camera: C([14,4,14],[0,-5,0],30), hiddenGroups: PH('excavation') },
      { title: 'Sloping vs Shoring', instruction: 'Sloping: cut trench walls at a safe angle (3/4:1 for Type C soil). Shoring: install hydraulic or timber braces to hold walls vertical. Trench boxes: prefab steel shields for workers. The choice depends on soil type and depth.', camera: C([18,6,16],[0,-5,0],32), hiddenGroups: PH('excavation') },
      { title: 'Access and Egress', instruction: 'Workers in trenches over 4 feet deep must have a means of egress (ladder, ramp, or stairs) within 25 feet of travel. Never jump into or climb out of a deep trench. Ladders extend 3 feet above the trench edge.', camera: C([22,8,20],[0,-5,0],36), hiddenGroups: PH('excavation') },
    ]},
    { slug: 'soil-identification', title: 'Soil Identification in the Field', objective: 'Identify soil types visually and by feel to assess bearing capacity and excavation behavior.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'The Four Types', instruction: 'Rock: solid, no excavation without breaking. Gravel: granular, drains freely, good bearing (3,000 psf). Sand: granular, less stable when wet, moderate bearing (2,000 psf). Clay: cohesive, plastic when wet, lowest bearing (1,500 psf).', camera: C([20,6,18],[0,-5,0],34), hiddenGroups: PH('excavation'), codeRefs: [{ family: 'IRC', section: 'R401.4.1', summary: 'Presumptive soil bearing: rock 12,000 psf, gravel 3,000, sand 2,000, clay 1,500 psf.' }] },
      { title: 'Ribbon Test', instruction: 'Take a moist sample and roll it between your palms. If it forms a ribbon over 2 inches long, it has high clay content. If it crumbles immediately, it is sand or gravel. This field test tells you if the soil can support the planned footing.', camera: C([14,2,14],[0,-5,0],28), hiddenGroups: PH('excavation') },
      { title: 'Problem Soils', instruction: 'Expansive clay swells when wet and shrinks when dry — it can lift or crack foundations. Fill soil may not be compacted. Organic soil (peat, muck) has zero bearing capacity. All three require engineering solutions, not guesswork.', camera: C([18,4,16],[0,-5,0],30), hiddenGroups: PH('excavation') },
    ]},
    { slug: 'excavation-quiz', title: 'Excavation Quiz', objective: 'Test your knowledge of excavation sequence, safety, and soil identification.', type: 'quiz', durationMinutes: 8, quizQuestions: [
      { text: 'OSHA requires trench protection at what depth?', type: 'multiple_choice', options: ['3 feet','4 feet','5 feet','6 feet'], correctAnswer: 2, explanation: 'OSHA requires sloping, shoring, or shielding for trenches 5 feet or deeper.' },
      { text: 'What must you do before any excavation?', type: 'multiple_choice', options: ['Call for utility locates (811)','Start digging immediately','Only check for water lines','Nothing — utilities are always deep'], correctAnswer: 0, explanation: 'Call 811 (or your state equivalent) before ANY digging. All buried utilities must be marked. This is law in every state.' },
      { text: 'Topsoil should be left in place under the foundation.', type: 'true_false', correctAnswer: 'false', explanation: 'Topsoil contains organic material that decomposes and settles. Strip it and stockpile it for final grading.' },
      { text: 'Which soil type has the lowest bearing capacity?', type: 'multiple_choice', options: ['Gravel','Sand','Clay','Rock'], correctAnswer: 2, explanation: 'Clay: 1,500 psf. Sand: 2,000. Gravel: 3,000. Rock: 12,000. Per IRC Table R401.4.1.' },
      { text: 'Concrete may be placed in standing water.', type: 'true_false', correctAnswer: 'false', explanation: 'Standing water dilutes and displaces concrete. The trench must be dewatered before placing footings.' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. FOUNDATION
// ════════════════════════════════════════════════════════════════════════════════
const M03: CurriculumModule = {
  slug: 'foundation-systems', title: 'Foundation Systems', phase: 'foundation', track: 'foundation', difficulty: 'intermediate', icon: 'foundation',
  description: 'Footings, stem walls, slabs, anchor bolts, waterproofing, and perimeter drainage — the base everything sits on.',
  lessons: [
    { slug: 'footing-reinforcing', title: 'Footing Layout & Reinforcing', objective: 'Layout continuous footings with proper rebar placement, cover, and lap splicing.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'The Foundation', instruction: 'The foundation transfers the entire weight of the house to the soil. A standard residential footing is typically 16-24 inches wide and 8 inches thick, made of 2,500-3,000 psi concrete.', camera: C([22,8,20],[0,-5,0],36), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION },
      { title: 'Rebar Placement', instruction: 'Minimum #4 rebar (1/2" diameter) placed 3 inches from the bottom of the footing. Lap splices: 40 bar diameters minimum (20 inches for #4). Rebar must be supported on chairs — never laid on the ground.', camera: C([14,3,12],[0,-5,0],28), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION, codeRefs: [{ family: 'IRC', section: 'R403.1.3', summary: 'Footing reinforcement: min #4 rebar. Min 3" cover. Lap splice 40 diameters.' }] },
      { title: 'Frost Depth', instruction: 'Footings must extend below the local frost line — the depth at which soil freezes. Frost depth ranges from 0" in South Florida to 60"+ in northern Minnesota. Footings above the frost line are lifted by frost heave, cracking the foundation.', camera: C([18,6,16],[0,-5,0],32), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION, codeRefs: [{ family: 'IRC', section: 'R403.1.4', summary: 'Footings shall extend below the frost line per local jurisdiction requirements.' }] },
      { title: 'Stepped Footings', instruction: 'On sloped lots, footings step to follow the grade. Each step must be at least 2 feet long (horizontal) and the vertical rise must not exceed 3/4 of the horizontal distance between steps.', camera: C([14,4,12],[0,-5,0],28), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION },
    ]},
    { slug: 'stem-walls-slabs', title: 'Stem Walls & Slab Systems', objective: 'Compare stem wall, monolithic slab, and basement foundations and know when each is appropriate.', type: 'learn', durationMinutes: 14, steps: [
      { title: 'Stem Wall + Crawlspace', instruction: 'A stem wall rises from the footing to above grade. The crawlspace beneath allows access to plumbing and provides ventilation. Minimum crawl height: 18 inches under joists, 12 inches under beams.', camera: C([16,4,14],[0,-5,0],30), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION, codeRefs: [{ family: 'IRC', section: 'R408.1', summary: 'Crawlspace ventilation: 1 sq ft per 150 sq ft. Access opening min 18"x24".' }] },
      { title: 'Monolithic Slab', instruction: 'Footing and slab are poured as one piece. Common in warm climates where frost is not a concern. The thickened edge (turned-down footing) integrates with the slab. Must include vapor barrier and insulation per climate zone.', camera: C([20,6,18],[0,-5,0],34), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION },
      { title: 'Full Basement', instruction: 'Concrete or block walls extending 7-8 feet below grade. Provides living or storage space. Requires waterproofing (not just dampproofing), perimeter drain, and positive drainage away from the wall.', camera: C([24,10,22],[0,-5,0],38), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION },
    ]},
    { slug: 'anchor-bolts', title: 'Anchor Bolts & Sill Plates', objective: 'Install anchor bolts at correct spacing and attach the sill plate with capillary break gasket.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Anchor Bolt Placement', instruction: '1/2" diameter bolts embedded 7" into concrete. Maximum spacing: 6 feet on center. Must be within 12" of each end of a sill plate and 12" of each corner. This is what holds the house down in wind.', camera: C([14,2,12],[0,-5,0],26), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION, codeRefs: [{ family: 'IRC', section: 'R403.1.6', summary: 'Anchor bolts: 1/2" dia, 7" embed, 6 ft o.c. max, within 12" of plate ends.' }] },
      { title: 'Sill Seal & Capillary Break', instruction: 'Before the sill plate goes down, install a sill seal gasket (closed-cell foam). This creates a capillary break preventing moisture from wicking from concrete into wood, and provides an air seal.', camera: C([10,1,10],[0,-5,0],24), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION },
    ]},
    { slug: 'foundation-waterproofing', title: 'Foundation Waterproofing', objective: 'Apply waterproofing, install perimeter drains, and place vapor barrier under slabs.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Dampproofing vs Waterproofing', instruction: 'Dampproofing (bituminous coating) resists moisture vapor. Waterproofing (membrane system) resists liquid water under hydrostatic pressure. Below the water table or in wet soils, you need waterproofing — not just dampproofing.', camera: C([18,4,16],[0,-5,0],30), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION, codeRefs: [{ family: 'IRC', section: 'R406.1', summary: 'Dampproofing required on below-grade walls. Waterproofing required where hydrostatic pressure exists.' }] },
      { title: 'Perimeter Drain', instruction: 'A 4" perforated pipe bedded in gravel at the footing base, sloping to daylight or a sump. Filter fabric wraps the gravel to prevent clogging. This is the last defense against basement water.', camera: C([14,2,14],[0,-5,0],28), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION },
      { title: 'Sub-Slab Vapor Barrier', instruction: 'Minimum 6-mil polyethylene under all concrete slabs on ground. Lapped 6 inches at seams, sealed at penetrations. Prevents soil moisture from migrating through the slab and causing floor covering failures.', camera: C([20,8,18],[0,-5,0],34), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION, codeRefs: [{ family: 'IRC', section: 'R506.2.3', summary: 'Vapor retarder: min 6-mil poly under concrete slabs on ground, lapped 6" at joints.' }] },
    ]},
    { slug: 'foundation-inspect', title: 'Foundation Inspection', objective: 'Identify anchor bolt, drainage, and waterproofing defects.', type: 'inspect', durationMinutes: 8, inspectIssues: [
      { meshKey: 'found_main', title: 'Missing perimeter drain', description: 'No perimeter drain tile at footing base. Water will accumulate against the foundation wall, causing hydrostatic pressure.', severity: 'severe', codeRef: 'IRC R405.1' },
      { meshKey: 'found_wing', title: 'Anchor bolt spacing exceeds 6 feet', description: 'IRC R403.1.6 requires 1/2" anchor bolts at 6 ft o.c. max and within 12" of plate ends.', severity: 'critical', codeRef: 'IRC R403.1.6' },
      { meshKey: 'found_garage', title: 'No capillary break under sill plate', description: 'Sill plate placed directly on concrete without sill seal gasket. Moisture will wick into framing.', severity: 'moderate' },
    ]},
    { slug: 'foundation-quiz', title: 'Foundation Quiz', objective: 'Test your foundation knowledge.', type: 'quiz', durationMinutes: 8, quizQuestions: [
      { text: 'Maximum anchor bolt spacing per IRC?', type: 'multiple_choice', options: ['4 feet','6 feet','8 feet','10 feet'], correctAnswer: 1, explanation: 'IRC R403.1.6: 1/2" anchor bolts, 6 ft o.c. max, within 12" of plate ends.' },
      { text: 'A capillary break prevents moisture wicking from concrete into wood.', type: 'true_false', correctAnswer: 'true', explanation: 'Concrete is porous. Without a sill seal gasket, ground moisture wicks upward into wood framing, causing decay.' },
      { text: 'Sub-slab vapor barrier minimum thickness?', type: 'multiple_choice', options: ['4-mil','6-mil','10-mil','15-mil'], correctAnswer: 1, explanation: 'IRC R506.2.3 requires minimum 6-mil polyethylene vapor retarder under concrete slabs on ground.' },
      { text: 'Dampproofing alone is sufficient below the water table.', type: 'true_false', correctAnswer: 'false', explanation: 'Below the water table, hydrostatic pressure pushes liquid water through dampproofing. A waterproof membrane system is required.' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. FLOOR FRAMING
// ════════════════════════════════════════════════════════════════════════════════
const M04: CurriculumModule = {
  slug: 'floor-framing', title: 'Floor Framing', phase: 'framing_floor', track: 'structural', difficulty: 'intermediate', icon: 'floor',
  description: 'Joists, beams, subfloor, rim board — the platform that everything stands on and how loads transfer through it.',
  lessons: [
    { slug: 'joist-layout', title: 'Joist Layout & Sizing', objective: 'Select joist sizes from span tables and lay out at proper on-center spacing.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Reading Span Tables', instruction: 'IRC Table R502.3.1 gives maximum joist spans by species, grade, size, and spacing. A 2x10 SPF#2 at 16" o.c. spans about 15 feet. The table accounts for a 40 psf live load and 10 psf dead load.', camera: C([22,6,20],[0,-3,0],34), highlightedGroups: ['foundation','floor_joists'], hiddenGroups: PH('framing_walls'), codeRefs: [{ family: 'IRC', section: 'R502.3.1', summary: 'Floor joist spans: based on species, grade, size, spacing. 40 psf live + 10 psf dead load.' }] },
      { title: 'Layout Marks', instruction: 'Mark joist locations on the sill plate and beam at 16" or 24" on center. Start from the same end on both sides so joists align. Mark X on the side the joist goes, crown up.', camera: C([14,3,14],[0,-4,0],28), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION },
      { title: 'Crown Up', instruction: 'Every joist has a slight curve (crown). Always install crown facing UP. Gravity and load will flatten it. Crown down creates a permanent dip in the floor that no amount of shimming fixes.', camera: C([10,2,10],[0,-4,0],26), highlightedGroups: ['floor_joists'], hiddenGroups: PH('framing_floor') },
    ]},
    { slug: 'beams-bearing', title: 'Beams & Point Loads', objective: 'Size beams for span and load, and trace the load path from roof to foundation.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'The Load Path', instruction: 'Every pound of roof, wall, floor, furniture, and snow must travel through a continuous path to the foundation. Roof loads → bearing walls → beams → posts → footings. Break any link and the house fails.', camera: C([28,18,26],[0,0,0],42), highlightedGroups: ['foundation','walls_1st','walls_2nd','sheathing','ridge_cap'], hiddenGroups: HIDE_DETAILS },
      { title: 'Beam Sizing', instruction: 'Beams carry accumulated loads from joists. A beam supporting a 12-foot span of joists on each side carries 24 feet of floor. Size from IRC Table R602.7 or engineered lumber tables.', camera: C([16,4,14],[0,-3,0],30), highlightedGroups: ['foundation','floor_joists'], hiddenGroups: PH('framing_walls') },
      { title: 'Post-to-Beam Connection', instruction: 'Posts under beams must bear on footings sized for the point load. The connection must resist lateral displacement — a simple toe-nail is not adequate. Use post-beam connectors.', camera: C([12,1,10],[0,-4,0],24), highlightedGroups: ['foundation'], hiddenGroups: HIDE_ALL_BUT_FOUNDATION },
    ]},
    { slug: 'rim-subfloor', title: 'Rim Board & Subfloor', objective: 'Install rim joist and subfloor sheathing with proper fastening and adhesive.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Rim/Band Joist', instruction: 'The rim joist closes the floor system at the perimeter. It transfers loads, provides nailing for exterior sheathing, and must be air-sealed and insulated. This is the #1 air leakage point in most houses.', camera: C([16,2,14],[0,-4,2],28), highlightedGroups: ['wall_studs'], hiddenGroups: HIDE_ALL_BUT_WALLS },
      { title: 'Subfloor Installation', instruction: '3/4" tongue-and-groove OSB or plywood. Glue AND nail — construction adhesive eliminates floor squeaks by preventing micro-movement between subfloor and joists. Stagger end joints by at least 2 joist spaces.', camera: C([18,6,16],[0,-3,0],32), highlightedGroups: ['wall_studs','foundation'], hiddenGroups: PH('framing_walls') },
    ]},
    { slug: 'floor-quiz', title: 'Floor Framing Quiz', objective: 'Test your floor framing knowledge.', type: 'quiz', durationMinutes: 6, quizQuestions: [
      { text: 'Joists should be installed with the crown facing which direction?', type: 'multiple_choice', options: ['Down','Up','Alternating','It does not matter'], correctAnswer: 1, explanation: 'Crown UP. Gravity and load will flatten the curve. Crown down creates a permanent floor dip.' },
      { text: 'The rim joist is the #1 air leakage point in most houses.', type: 'true_false', correctAnswer: 'true', explanation: 'The rim/band joist area has gaps between framing, sheathing, and foundation. Air sealing here is critical for energy performance.' },
      { text: 'Why is construction adhesive used under subfloor panels?', type: 'multiple_choice', options: ['To add structural strength','To prevent floor squeaks','To act as a vapor barrier','It is required by code'], correctAnswer: 1, explanation: 'Glue prevents micro-movement between subfloor and joists that causes squeaks. The APA recommends glue-nail for all subfloor installations.' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. WALL FRAMING
// ════════════════════════════════════════════════════════════════════════════════
const M05: CurriculumModule = {
  slug: 'wall-framing', title: 'Wall Framing', phase: 'framing_walls', track: 'structural', difficulty: 'intermediate', icon: 'walls',
  description: 'Studs, headers, king/jack studs, shear walls, corners, and the continuous load path.',
  lessons: [
    { slug: 'wall-layout', title: 'Wall Layout & Plate Marking', objective: 'Mark stud locations on top and bottom plates for standard and cripple studs.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'First Floor Walls', instruction: 'Walls are framed flat on the subfloor, then tilted up into position. The bottom plate sits on the subfloor. Studs at 16" o.c. The top plate gets a double top plate lapped at corners and intersections.', camera: C([22,8,20],[0,-2,0],36), highlightedGroups: ['wall_studs'], hiddenGroups: PH('framing_walls') },
      { title: 'Second Floor Walls', instruction: 'Second floor walls sit on the second floor subfloor. Same layout procedure — but now bearing walls must align with bearing walls below. A bearing wall above a non-bearing wall below = structural failure.', camera: C([22,8,20],[0,0,0],36), highlightedGroups: ['wall_studs'], hiddenGroups: PH('framing_walls') },
      { title: 'Marking the Plates', instruction: 'Lay top and bottom plates together. Mark stud locations, king studs (K), jack studs (J), and cripples (C). Use an X to show which side of the line the stud goes on. This layout drives every wall.', camera: C([14,3,12],[0,-3,0],28), highlightedGroups: ['wall_studs'], hiddenGroups: PH('framing_walls') },
    ]},
    { slug: 'headers-load-path', title: 'Headers & Load Paths', objective: 'Size headers for openings and trace loads from ridge to foundation.', type: 'learn', durationMinutes: 14, steps: [
      { title: 'What a Header Does', instruction: 'A header spans over an opening (window, door) and transfers the load from above to the jack studs on each side. The wider the opening, the deeper the header must be. IRC Table R602.7 provides sizes.', camera: C([16,4,16],[0,-2,0],30), highlightedGroups: ['walls_1st','walls_2nd','windows','doors'], hiddenGroups: ['foundation','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','turret','dormer','garage_roof','bump_roof','chimney','stone_wainscot','porch'], codeRefs: [{ family: 'IRC', section: 'R602.7', summary: 'Header spans: size based on building width, snow load, and number of stories supported.' }] },
      { title: 'The Complete Load Path', instruction: 'Trace it: ridge beam → rafters → top plate → studs → bottom plate → floor joists → beams → posts → footings → soil. Every connection must transfer both gravity and lateral (wind/seismic) loads.', camera: C([30,16,28],[0,0,0],42), highlightedGroups: ['foundation','walls_1st','walls_2nd','gable_ends','sheathing','ridge_cap'], hiddenGroups: HIDE_DETAILS },
      { title: 'Point Load Problems', instruction: 'When a beam above (like a ridge beam or hip header) concentrates load at one point, that point load must have a continuous path of support down through every floor to the foundation. A missed point load = a sagging floor.', camera: C([18,8,16],[0,0,0],34), highlightedGroups: ['walls_1st','walls_2nd','foundation','sheathing'], hiddenGroups: HIDE_DETAILS },
    ]},
    { slug: 'shear-walls-bracing', title: 'Shear Walls & Lateral Bracing', objective: 'Understand how shear walls resist wind and seismic forces and where they are required.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Why Lateral Bracing Matters', instruction: 'Gravity pulls down, but wind pushes sideways. Without lateral bracing, a house is a stack of cards. Shear walls (braced wall panels with structural sheathing) are the primary lateral force system.', camera: C([24,10,22],[0,-1,0],38), highlightedGroups: ['wall_studs','interior_walls'], hiddenGroups: HIDE_ALL_BUT_WALLS },
      { title: 'Braced Wall Lines', instruction: 'IRC R602.10 requires braced wall lines at each story. The total length of bracing depends on wind speed, seismic zone, and wall height. In high-wind zones, every exterior wall may need to be fully sheathed.', camera: C([20,6,18],[0,-1,0],34), highlightedGroups: ['wall_studs','interior_walls'], hiddenGroups: HIDE_ALL_BUT_WALLS, codeRefs: [{ family: 'IRC', section: 'R602.10', summary: 'Braced wall panels: method, length, and location requirements for lateral resistance.' }] },
      { title: 'Hold-Down Hardware', instruction: 'At shear wall ends, hold-downs (Simpson HDU or equivalent) anchor the shear wall to the foundation. Without hold-downs, wind uplift can pull the corner of the house off the foundation.', camera: C([12,2,10],[0,-4,0],26), highlightedGroups: ['wall_studs','foundation'], hiddenGroups: PH('framing_walls') },
    ]},
    { slug: 'wall-framing-quiz', title: 'Wall Framing Quiz', objective: 'Test your wall framing knowledge.', type: 'quiz', durationMinutes: 8, quizQuestions: [
      { text: 'A jack stud transfers header loads down to the...', type: 'multiple_choice', options: ['Top plate','King stud','Bottom plate and foundation below','Cripple studs'], correctAnswer: 2, explanation: 'Jack studs support the header from below. The load path continues through the bottom plate, floor system, and foundation.' },
      { text: 'Shear walls resist lateral forces from wind and earthquakes.', type: 'true_false', correctAnswer: 'true', explanation: 'Shear walls are braced panels that transfer horizontal forces from upper floors down to the foundation.' },
      { text: 'Bearing walls on the second floor must align with what below?', type: 'multiple_choice', options: ['Non-bearing walls','Bearing walls or beams','Windows','Any wall'], correctAnswer: 1, explanation: 'Bearing walls must stack or align with bearing support below — either another bearing wall or a beam. Misaligned bearing creates point loads on unsupported floor framing.' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 6. COMPLEX ROOF GEOMETRY (hero module — full 3D content)
// This is the existing MODULE_1 content, copied in full
// ════════════════════════════════════════════════════════════════════════════════
const M06: CurriculumModule = {
  slug: 'complex-roof-geometry', title: 'Complex Roof Geometry & Framing', phase: 'framing_roof', track: 'roof', difficulty: 'intermediate', icon: 'roof',
  description: 'Gables, valleys, hips, dormers, turrets — the geometry that defines real roofs and creates the most complex construction challenges.',
  lessons: [
    { slug: 'roof-planes-overview', title: 'Understanding Roof Planes', objective: 'Identify the primary roof planes on a complex residential structure.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'The Completed House', instruction: 'This house has 4 distinct roof types: a main gable (8:12), a cross-wing gable (10:12), a garage hip (5:12), and a turret cone.', camera: C([32,12,28],[1,0,0],42), highlightedGroups: ['sheathing','gable_ends','ridge_cap','garage_roof','turret','dormer','bump_roof'], hiddenGroups: PH('framing_roof') },
      { title: 'Main Gable Roof', instruction: 'The primary roof is an 8:12 gable running east-west. The ridge runs along the longest dimension. Two triangular gable ends close each side.', camera: C([5,6,22],[0,2.5,0],32), highlightedGroups: ['sheathing','gable_ends','ridge_cap'], hiddenGroups: HIDE_ALL_BUT_ROOF },
      { title: 'Cross Wing — Valley Creator', instruction: 'The perpendicular cross wing at 10:12 pitch creates two diagonal VALLEY lines where it meets the main roof — the highest-risk leak areas.', camera: C([22,6,14],[10,2,0],30), highlightedGroups: ['sheathing','valley_metal','gable_ends'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,'turret','dormer','bump_roof'] },
      { title: 'Garage Hip Roof', instruction: 'The garage uses a 5:12 hip roof. Unlike a gable, all four sides slope — better wind resistance but requires hip ridge flashing.', camera: C([-14,3,14],[-9.5,-1.5,0],30), highlightedGroups: ['garage_roof'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'sheathing','gable_ends','ridge_cap','valley_metal','ice_barrier','underlayment','drip_edge','step_flashing','fascia_soffit'] },
      { title: 'Turret — Conical Roof', instruction: 'The octagonal turret has a conical roof. Every facet joint requires careful flashing work.', camera: C([8,2,11],[5.5,1.5,6.5],26), highlightedGroups: ['turret'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'sheathing','garage_roof','dormer','bump_roof','gable_ends','ridge_cap','valley_metal','ice_barrier','underlayment','drip_edge','step_flashing','fascia_soffit'] },
      { title: 'Four Pitches, One House', instruction: 'Review: 8:12 main, 10:12 cross wing, 5:12 garage hip, conical turret. Steeper pitches shed water faster but are harder to work on.', camera: C([26,18,20],[1,0,0],40), highlightedGroups: ['sheathing','gable_ends','ridge_cap','garage_roof','turret','dormer','bump_roof'], hiddenGroups: PH('framing_roof') },
    ]},
    { slug: 'gable-anatomy', title: 'Gable Roof Anatomy', objective: 'Name every component from ridge to eave.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Ridge — The Backbone', instruction: 'The highest horizontal line where both slopes meet. On this house, the main ridge runs 14 feet plus overhang.', camera: C([6,8,16],[0,3.7,0],28), highlightedGroups: ['ridge_cap'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,'walls_1st'] },
      { title: 'Roof Slopes', instruction: 'Two sloped planes descend from ridge to eaves. 8:12 pitch = 8 inches of rise per 12 inches of horizontal run.', camera: C([16,5,18],[0,1.5,0],32), highlightedGroups: ['sheathing'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,'walls_1st'] },
      { title: 'Gable Ends', instruction: 'Triangular wall sections between wall top and roof slopes. Clad in board-and-batten here for accent.', camera: C([-16,3,6],[-7,1.5,0],28), highlightedGroups: ['gable_ends'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,'walls_1st','sheathing','ridge_cap'] },
      { title: 'Eaves', instruction: 'The lower edge where roof overhangs the wall. Fascia covers rafter tails, soffit closes the underside. This protects walls from rain.', camera: C([8,-2,9],[0,0.3,4.5],24), highlightedGroups: ['fascia_soffit','gutters','drip_edge'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,'walls_1st'] },
      { title: 'Exploded Layer View', instruction: 'Layers from bottom to top: sheathing → underlayment → ice barrier → flashing → shingles → ridge cap.', camera: C([14,10,14],[0,5,0],36), explodeOffset: 1.5, hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','walls_2nd','turret','dormer','garage_roof','bump_roof'] },
    ]},
    { slug: 'valley-framing', title: 'Valley Framing & Water Management', objective: 'Understand how valleys concentrate water and why they are the highest-risk areas.', type: 'learn', durationMinutes: 15, steps: [
      { title: 'Where Valleys Form', instruction: 'A valley forms wherever two roof slopes meet at an interior angle. This house has two valleys — front and back — where the cross wing meets the main roof.', camera: C([18,4,12],[8,1.5,1],30), highlightedGroups: ['valley_metal','sheathing'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,'turret','dormer','bump_roof'] },
      { title: 'Water Volume Doubles', instruction: 'Every valley collects runoff from two separate drainage areas. In heavy rain, valleys carry 2-3x the water volume of normal eave sections.', camera: C([14,3,10],[8,0.5,1],26), highlightedGroups: ['valley_metal'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,'turret','dormer','bump_roof'] },
      { title: 'Valley Protection Stack', instruction: 'Ice barrier membrane → valley metal → shingle cutback. Miss any layer or reverse the lap and water enters the assembly.', camera: C([16,8,8],[8,2,0],32), explodeOffset: 1.0, highlightedGroups: ['ice_barrier','valley_metal','sheathing'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'turret','dormer','bump_roof','ridge_cap','fascia_soffit','step_flashing','drip_edge'], codeRefs: [{ family: 'IRC', section: 'R905.2.7.1', summary: 'Ice barrier required at eaves in cold climates (mean Jan temp ≤ 25°F). NRCA best practice extends this to valleys — 24" from centerline each side.' },{ family: 'IRC', section: 'R905.2.8.2', summary: 'Valley lining: 36" wide mineral-surfaced roll roofing or min 24-gauge metal. Open valley exposure min 4" at ridge.' }] },
      { title: 'Dead Valley', instruction: 'The rear bump-out creates a dead valley where its shed roof meets the main wall. Water and debris collect here. Without a cricket or diverter, this fails within 5-10 years.', camera: C([-8,-1,-8],[-5,-2.2,-5.5],28), highlightedGroups: ['bump_roof','walls_2nd'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','turret','dormer','garage_roof','sheathing','ridge_cap','valley_metal','ice_barrier','drip_edge','step_flashing','fascia_soffit','underlayment','gable_ends'] },
    ]},
    { slug: 'roof-wall-transitions', title: 'Roof-to-Wall Transitions', objective: 'Learn step flashing, kickout flashing, and why these junctions fail.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Where Roof Meets Wall', instruction: 'When a lower roof terminates against a taller wall, step flashing diverts water at each shingle course.', camera: C([13,2,6],[7,0.5,0],28), highlightedGroups: ['step_flashing','walls_2nd'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','turret','dormer','garage_roof','bump_roof'] },
      { title: 'Step Flashing Sequence', instruction: 'Each L-shaped piece: 4" up the wall, 4" onto the roof. Installed one-at-a-time with each shingle course. Each overlaps the one below by 2". Never use a continuous strip.', camera: C([10,1,4],[7.2,0.5,-1],24), highlightedGroups: ['step_flashing'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','turret','dormer','garage_roof','bump_roof'], codeRefs: [{ family: 'IRC', section: 'R905.2.8.3', summary: 'Step flashing: min 4" x 4" L-shape, installed with each shingle course.' }] },
      { title: 'Kickout Flashing', instruction: 'Where step flashing terminates at eave, a kickout diverts water INTO the gutter instead of behind the wall. Missing kickout = rotted sheathing within 3-5 years.', camera: C([11,-1,8],[7,-0.5,3.5],24), highlightedGroups: ['step_flashing','gutters'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,'walls_1st','turret','dormer','garage_roof','bump_roof'] },
    ]},
    { slug: 'roof-geometry-quiz', title: 'Roof Geometry Quiz', objective: 'Test your understanding of roof planes, valleys, and transitions.', type: 'quiz', durationMinutes: 8, quizQuestions: [
      { text: 'What creates a valley on a roof?', type: 'multiple_choice', options: ['Two slopes at an exterior angle','Two slopes at an interior angle','A ridge changing direction','A gable end'], correctAnswer: 1, explanation: 'Valleys form where two planes meet at an interior (concave) angle.' },
      { text: '8:12 pitch means how many inches of rise per foot?', type: 'multiple_choice', options: ['4','6','8','12'], correctAnswer: 2, explanation: '8:12 = 8 inches rise per 12 inches horizontal run.' },
      { text: 'Step flashing should be installed as one continuous strip.', type: 'true_false', correctAnswer: 'false', explanation: 'Individual pieces installed with each shingle course. Continuous strip creates a dam.' },
      { text: 'How many drainage areas feed a single valley?', type: 'multiple_choice', options: ['One','Two','Three','Depends'], correctAnswer: 1, explanation: 'Two — one roof plane on each side. This doubles the water volume.' },
      { text: 'A dead valley occurs where a lower roof meets a vertical wall.', type: 'true_false', correctAnswer: 'true', explanation: 'Dead valley: low-slope area where water and debris accumulate against a wall with no escape path.' },
    ]},
    { slug: 'roof-inspection', title: 'Roof Inspection Challenge', objective: 'Identify roof geometry and flashing defects.', type: 'inspect', durationMinutes: 10, inspectIssues: [
      { meshKey: 'valley_f_channel', title: 'Valley metal fasteners in water channel', description: 'Nails in the valley flow path. Fasten at outer edges only.', severity: 'critical', codeRef: 'NRCA RMS-7.3' },
      { meshKey: 'ice_valley_f', title: 'Missing valley ice barrier', description: 'No self-adhering membrane beneath valley metal.', severity: 'critical', codeRef: 'IRC R905.2.7.1' },
      { meshKey: 'step_flash_2', title: 'Continuous flashing at roof-to-wall', description: 'Single strip instead of individual step pieces with each course.', severity: 'severe', codeRef: 'IRC R905.2.8.3' },
      { meshKey: 'bump_shed_roof', title: 'Dead valley with no cricket', description: 'Shed roof creates dead valley against main wall. No diverter.', severity: 'severe' },
      { meshKey: 'drip_eave_f', title: 'Drip edge over underlayment at eave', description: 'At eave, drip edge should be UNDER underlayment.', severity: 'moderate', codeRef: 'IRC R905.2.8.5' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 7. SHEATHING
// ════════════════════════════════════════════════════════════════════════════════
const M07: CurriculumModule = {
  slug: 'sheathing-systems', title: 'Sheathing Systems', phase: 'sheathing', track: 'structural', difficulty: 'intermediate', icon: 'sheathing',
  description: 'Wall and roof sheathing — the structural skin that resists racking, carries loads to framing, and receives the weather barrier.',
  lessons: [
    { slug: 'wall-sheathing', title: 'Wall Sheathing', objective: 'Install structural wall sheathing with proper nailing, edge distance, and panel orientation.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Panel Orientation', instruction: 'Structural panels (OSB or plywood) installed vertically — strength axis perpendicular to studs. Long edges land on studs. Short edges staggered by at least one stud space between courses.', camera: C([20,6,18],[0,-1,0],34), highlightedGroups: ['wall_studs','interior_walls'], hiddenGroups: [...HIDE_ALL_BUT_WALLS,'gable_ends'] },
      { title: 'Nailing Schedule', instruction: 'IRC Table R602.3(1): 8d common nails, 6" o.c. at edges, 12" o.c. in field. Edge distance: 3/8" minimum from panel edge. Over-driven nails (heads break paper) do not count.', camera: C([14,3,14],[0,-2,0],28), highlightedGroups: ['wall_studs'], hiddenGroups: PH('framing_walls'), codeRefs: [{ family: 'IRC', section: 'R602.3(1)', summary: 'Wall sheathing: 8d nails, 6" edges / 12" field. Min 3/8" edge distance.' }] },
    ]},
    { slug: 'roof-sheathing', title: 'Roof Sheathing', objective: 'Install roof sheathing from eave to ridge with H-clips, stagger, and proper nailing.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Start at the Eave', instruction: 'First course flush with the fascia line, long edge perpendicular to rafters. Leave 1/8" gap between panels for expansion (or use H-clips). Clip or block unsupported edges between rafters.', camera: C([16,6,16],[0,2.5,0],32), highlightedGroups: ['sheathing'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','walls_2nd','turret','dormer','garage_roof','bump_roof','ridge_cap','valley_metal','ice_barrier','underlayment','drip_edge','step_flashing','fascia_soffit','gable_ends'] },
      { title: 'Nailing for Wind', instruction: 'IRC Table R803.1: 8d common nails, 6" at supported edges, 12" in field. In high-wind zones (Vult > 130 mph), spacing tightens per engineered design. Under-nailing causes sheathing blow-off in storms.', camera: C([10,4,14],[0,2.5,0],28), highlightedGroups: ['sheathing'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','walls_2nd','turret','dormer','garage_roof','bump_roof','ridge_cap','valley_metal','ice_barrier','underlayment','drip_edge','step_flashing','fascia_soffit','gable_ends'], codeRefs: [{ family: 'IRC', section: 'R803.1', summary: 'Roof sheathing: 8d nails, 6" at supported edges / 12" field. High-wind requires engineered schedules.' }] },
      { title: 'Stagger and Inspect', instruction: 'Stagger end joints by at least 2 rafter spaces. Before underlayment, walk the entire deck — look for missed nails, gaps, unsupported edges, and damage. This is your last chance to fix the deck.', camera: C([20,12,16],[0,3,0],36), highlightedGroups: ['sheathing'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','walls_2nd','turret','dormer','garage_roof','bump_roof','ridge_cap','valley_metal','ice_barrier','underlayment','drip_edge','step_flashing','fascia_soffit','gable_ends'] },
    ]},
    { slug: 'sheathing-quiz', title: 'Sheathing Quiz', objective: 'Test your sheathing knowledge.', type: 'quiz', durationMinutes: 6, quizQuestions: [
      { text: 'H-clips between roof sheathing panels serve what purpose?', type: 'multiple_choice', options: ['Add strength','Maintain 1/8" expansion gap and support unsupported edges','Attach underlayment','Decorative'], correctAnswer: 1, explanation: 'H-clips maintain expansion gap and support panel edges between rafters.' },
      { text: 'Over-driven nails (heads break paper surface) count as properly fastened.', type: 'true_false', correctAnswer: 'false', explanation: 'Over-driven nails have reduced pull-through resistance. They do not count for structural nailing schedules.' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 8. DRY-IN (full 3D content)
// ════════════════════════════════════════════════════════════════════════════════
const M08: CurriculumModule = {
  slug: 'dry-in-waterproofing', title: 'Dry-In & Waterproofing', phase: 'dry_in', track: 'roof', difficulty: 'intermediate', icon: 'layers',
  description: 'Underlayment, ice barrier, valley metal, drip edge sequencing — the layered system that keeps water out.',
  lessons: [
    { slug: 'underlayment-ice', title: 'Underlayment & Ice Barrier', objective: 'Know where ice barrier is required, where underlayment goes, and why lap direction is critical.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Underlayment Purpose', instruction: 'The secondary water barrier beneath roofing. If a shingle blows off or a nail backs out, underlayment keeps water off the deck.', camera: C([16,8,16],[0,2,0],34), highlightedGroups: ['underlayment','sheathing'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','walls_2nd','turret','dormer','garage_roof','bump_roof','ridge_cap','valley_metal','drip_edge','step_flashing','fascia_soffit','gable_ends'], explodeOffset: 0.8 },
      { title: 'Ice Barrier Zones', instruction: 'Self-adhering ice barrier at eaves (24" inside exterior wall line) and valleys. It seals around fastener penetrations — felt alone does not.', camera: C([12,3,12],[0,0.5,3],30), highlightedGroups: ['ice_barrier'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','walls_2nd','turret','dormer','garage_roof','bump_roof','ridge_cap','valley_metal','drip_edge','step_flashing','fascia_soffit','gable_ends','underlayment'], codeRefs: [{ family: 'IRC', section: 'R905.2.7.1', summary: 'Ice barrier required at eaves where mean daily Jan temp ≤ 25°F. Best practice extends to valleys and other high-risk areas.' }] },
      { title: 'Lap Direction', instruction: 'ALWAYS upper courses OVER lower courses. Water flows downhill — every lap must shed water onto the layer below. A single reverse lap funnels water into the deck.', camera: C([12,6,10],[0,3,0],34), highlightedGroups: ['underlayment','ice_barrier','sheathing'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','walls_2nd','turret','dormer','garage_roof','bump_roof','ridge_cap','valley_metal','drip_edge','step_flashing','fascia_soffit','gable_ends'], explodeOffset: 1.2 },
    ]},
    { slug: 'valley-metal', title: 'Valley Metal Installation', objective: 'Master valley metal sequencing, placement, and the fastener exclusion zone.', type: 'learn', durationMinutes: 14, steps: [
      { title: 'Valley Location', instruction: 'Two valleys where the cross wing meets the main roof. Each collects runoff from two planes, doubling water volume.', camera: C([18,5,14],[8,1.5,1],30), highlightedGroups: ['valley_metal','sheathing'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,'turret','dormer','bump_roof'] },
      { title: 'Ice Barrier First', instruction: 'Install ice barrier membrane extending 24" from valley centerline each side. This self-adhering layer is the last defense.', camera: C([14,3,8],[8,0.5,1],26), highlightedGroups: ['ice_barrier'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'turret','dormer','bump_roof','sheathing','ridge_cap','drip_edge','step_flashing','fascia_soffit','gable_ends','underlayment'] },
      { title: 'Valley Metal Placement', instruction: 'W-shaped or flat, minimum 24-gauge galvanized. Full valley length. CARDINAL RULE: NO fasteners in the water channel. Outer edges only.', camera: C([12,2,8],[8,0.5,0],24), highlightedGroups: ['valley_metal'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,'turret','dormer','bump_roof'], codeRefs: [{ family: 'IRC', section: 'R905.2.8.2', summary: 'Valley lining: 36" wide mineral-surfaced roll roofing or min 24-gauge metal. Open valley exposure min 4" at ridge.' },{ family: 'NRCA', section: 'RMS-7.3', summary: 'No fasteners in valley water channel.' }] },
    ]},
    { slug: 'drip-edge', title: 'Drip Edge Sequencing', objective: 'Know the critical installation order difference between eave and rake.', type: 'learn', durationMinutes: 8, steps: [
      { title: 'Eave: UNDER Underlayment', instruction: 'At the eave, drip edge goes on the deck UNDER the underlayment. Water running off felt flows ONTO drip edge and into the gutter.', camera: C([6,-2,9],[0,0.2,4.5],22), highlightedGroups: ['drip_edge','fascia_soffit'], hiddenGroups: HIDE_NON_ENVELOPE, codeRefs: [{ family: 'IRC', section: 'R905.2.8.5', summary: 'Drip edge at eave: under underlayment. At rake: over underlayment.' }] },
      { title: 'Rake: OVER Underlayment', instruction: 'At the rake (gable edge), drip edge goes OVER the underlayment. Prevents wind-driven rain from lifting the edge. UNDER at eave, OVER at rake.', camera: C([-12,2,5],[-7,2,0],26), highlightedGroups: ['drip_edge','gable_ends'], hiddenGroups: HIDE_NON_ENVELOPE },
    ]},
    { slug: 'starter-shingles', title: 'Starter Strip & Shingle Installation', objective: 'Install starter strip at the eave, lay field shingles with proper exposure and offset, and cap the ridge.', type: 'learn', durationMinutes: 14, steps: [
      { title: 'Starter Strip', instruction: 'The starter strip is the first course at the eave — installed with the adhesive strip facing UP and the tabs cut off (or use manufactured starter). It seals the first shingle course against wind uplift and provides a water barrier at the most vulnerable edge.', camera: C([8,-1,10],[0,0.3,4.5],24), highlightedGroups: ['sheathing','drip_edge','fascia_soffit'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','walls_2nd','turret','dormer','garage_roof','bump_roof','ridge_cap','valley_metal','ice_barrier','step_flashing','gable_ends'] },
      { title: 'Field Shingles', instruction: 'Standard 3-tab: 5" exposure. Architectural/laminate: 5-5/8" typical (check manufacturer). Offset each course by 6" (half a tab) to stagger the cutouts. Nail 1" above the cutout line — 4 nails standard, 6 in high-wind zones.', camera: C([14,6,14],[0,2,0],32), highlightedGroups: ['sheathing'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','walls_2nd','turret','dormer','garage_roof','bump_roof','gable_ends'], codeRefs: [{ family: 'IRC', section: 'R905.2.6', summary: 'Asphalt shingle fastening: 4 nails per shingle. 6 nails in high-wind areas (Vult > 110 mph).' }] },
      { title: 'Working Up the Slope', instruction: 'Always shingle from eave to ridge, and from the rake inward. Each course laps over the course below. At valleys, shingles are cut along a chalk line — never across the valley metal. Maintain a 2-inch clearance from the valley centerline.', camera: C([16,4,12],[0,1.5,0],30), highlightedGroups: ['sheathing','valley_metal'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','walls_2nd','turret','dormer','garage_roof','bump_roof','gable_ends'] },
      { title: 'Ridge Cap', instruction: 'The last step: ridge cap shingles or a ridge vent with cap. Each cap piece laps over the one before it, with the final piece facing away from the prevailing wind. The ridge is the last defense — if it blows off, water enters at the peak.', camera: C([6,8,14],[0,3.7,0],28), highlightedGroups: ['ridge_cap'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,...HIDE_DETAILS,'walls_1st','walls_2nd','turret','dormer','garage_roof','bump_roof','gable_ends'] },
    ]},
    { slug: 'dry-in-quiz', title: 'Dry-In Quiz', objective: 'Test your waterproofing knowledge.', type: 'quiz', durationMinutes: 8, quizQuestions: [
      { text: 'At the eave, drip edge goes ___ the underlayment.', type: 'multiple_choice', options: ['Over','Under','It doesn\'t matter','No drip edge needed'], correctAnswer: 1, explanation: 'Under at eave (water flows onto drip edge). Over at rake.' },
      { text: 'Minimum gauge for valley metal flashing?', type: 'multiple_choice', options: ['28-gauge','26-gauge','24-gauge','22-gauge'], correctAnswer: 2, explanation: 'IRC R905.2.8.2: minimum 24-gauge galvanized steel.' },
      { text: 'Valley metal fasteners should be placed where?', type: 'multiple_choice', options: ['Center channel','Centerline','Outer edges only','Adhesive only'], correctAnswer: 2, explanation: 'Outer edges only, where shingles cover them. Never in the water flow path.' },
      { text: 'Upper underlayment courses lap UNDER lower courses.', type: 'true_false', correctAnswer: 'false', explanation: 'Upper OVER lower. Water flows downhill — every lap sheds onto the course below.' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 9. WINDOWS & DOORS
// ════════════════════════════════════════════════════════════════════════════════
const M09: CurriculumModule = {
  slug: 'windows-doors', title: 'Windows & Doors', phase: 'windows_doors', track: 'envelope', difficulty: 'intermediate', icon: 'window',
  description: 'Installation, shimming, flashing integration, nailing fins, and the connection between openings and envelope.',
  lessons: [
    { slug: 'window-install', title: 'Window Installation', objective: 'Set a window in a rough opening with proper shimming, leveling, and nailing fin attachment.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Rough Opening Prep', instruction: 'Rough opening should be 1/2" wider and 1/2" taller than the window frame. Apply sill pan flashing BEFORE the window — this creates a drainage trough under the unit.', camera: C([14,4,14],[0,-1,4],30), highlightedGroups: ['windows','walls_1st','walls_2nd'], hiddenGroups: ['foundation','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','turret','dormer','garage_roof','bump_roof','chimney','stone_wainscot','porch'] },
      { title: 'Setting the Window', instruction: 'Set window on sill pan. Shim at sides and head for plumb and level. Fasten nailing fin with roofing nails — do not over-drive. The window must operate smoothly before final fastening.', camera: C([10,2,10],[0,-1,4],26), highlightedGroups: ['windows'], hiddenGroups: ['foundation','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','turret','dormer','garage_roof','bump_roof','chimney','stone_wainscot','porch','doors'] },
      { title: 'Flashing Integration', instruction: 'After the window is set: jamb flashing tape over the nailing fin sides, then head flashing tape lapping OVER the jamb tape. Never reverse this order — water must always shed outward.', camera: C([8,0,8],[0,-1,4],24), highlightedGroups: ['windows','walls_2nd'], hiddenGroups: ['foundation','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','turret','dormer','garage_roof','bump_roof','chimney','stone_wainscot','porch','doors'] },
    ]},
    { slug: 'door-thresholds', title: 'Door Thresholds & Drainage', objective: 'Flash and seal exterior door thresholds — the most vulnerable penetration in the wall.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'The Threshold Problem', instruction: 'Exterior door thresholds sit at floor level — inches above grade. Splash-back, snow melt, and wind-driven rain attack this point. More doors fail at the threshold than any other location.', camera: C([6,0,10],[0,-4,6.5],24), highlightedGroups: ['doors','porch'], hiddenGroups: ['foundation','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','turret','dormer','garage_roof','bump_roof','chimney','stone_wainscot','windows'] },
      { title: 'Sill Pan and Slope', instruction: 'The sill pan under a door must slope to the exterior. Use a formed metal or membrane pan that extends under the threshold and laps over the WRB below. No flat sill pans — water must drain out.', camera: C([4,-2,8],[0,-4,6.5],22), highlightedGroups: ['doors'], hiddenGroups: ['foundation','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','turret','dormer','garage_roof','bump_roof','chimney','stone_wainscot','windows','porch'] },
    ]},
    { slug: 'windows-doors-quiz', title: 'Windows & Doors Quiz', objective: 'Test your opening installation knowledge.', type: 'quiz', durationMinutes: 6, quizQuestions: [
      { text: 'The sill pan flashing is installed before or after the window?', type: 'multiple_choice', options: ['Before','After','At the same time','No sill pan needed'], correctAnswer: 0, explanation: 'Sill pan goes in FIRST to create a drainage trough. The window sits on top of it.' },
      { text: 'Head flashing tape should lap OVER or UNDER jamb flashing tape?', type: 'multiple_choice', options: ['Under','Over','It does not matter','They should not overlap'], correctAnswer: 1, explanation: 'Head tape laps OVER jamb tape so water running down from above sheds outward, not behind the jamb tape.' },
      { text: 'Door sill pans should be flat and level.', type: 'true_false', correctAnswer: 'false', explanation: 'Sill pans must slope to the exterior so trapped water drains out. A flat pan holds water.' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 10. EXTERIOR DRAINAGE PLANE
// ════════════════════════════════════════════════════════════════════════════════
const M10: CurriculumModule = {
  slug: 'drainage-plane', title: 'Exterior Drainage Plane', phase: 'wrb_cladding', track: 'envelope', difficulty: 'advanced', icon: 'shield',
  description: 'WRB fundamentals, drainage plane logic, kickout flashing, and how cladding interfaces with the weather barrier.',
  lessons: [
    { slug: 'wrb-fundamentals', title: 'WRB Fundamentals', objective: 'Understand the weather-resistive barrier and why the drainage plane is the most important system in the wall.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'What the WRB Does', instruction: 'The weather-resistive barrier (housewrap, fluid-applied, or self-adhered) is the primary defense against liquid water entering the wall. Cladding (siding) is the first line — WRB is the second and final line.', camera: C([20,6,18],[0,-1,0],34), highlightedGroups: ['wall_studs','interior_walls'], hiddenGroups: ['foundation','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','turret','dormer','garage_roof','bump_roof','chimney','porch'] },
      { title: 'Shingling Principle', instruction: 'Every layer laps over the one below — just like roof shingles. WRB courses start at the bottom. Upper courses lap over lower. Flashing laps over WRB below, under WRB above. One rule: water always sheds outward.', camera: C([14,4,14],[0,-1,0],30), highlightedGroups: ['walls_1st','walls_2nd','stone_wainscot'], hiddenGroups: ['foundation','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','turret','dormer','garage_roof','bump_roof','chimney','porch'] },
      { title: 'Integration Points', instruction: 'The WRB must integrate with: window/door flashing, roof step flashing, kickout flashing, deck ledger flashing, utility penetrations. Every integration point is a potential failure.', camera: C([16,2,12],[0,-1,2],28), highlightedGroups: ['walls_1st','walls_2nd','windows','doors','step_flashing'], hiddenGroups: ['foundation','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','ridge_cap','fascia_soffit','gutters','turret','dormer','garage_roof','bump_roof','chimney','porch','stone_wainscot'] },
    ]},
    { slug: 'kickout-cladding', title: 'Kickout Flashing & Cladding', objective: 'Install kickout flashing at roof-to-wall-to-eave transitions and maintain cladding clearances.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'The Kickout', instruction: 'Where step flashing ends at a wall-to-eave transition, the kickout diverts water into the gutter instead of behind the cladding. This is the single most missed flashing on residential construction.', camera: C([11,-1,8],[7,-0.5,3.5],24), highlightedGroups: ['step_flashing','gutters','walls_2nd'], hiddenGroups: [...HIDE_ALL_BUT_ROOF,'walls_1st','turret','dormer','garage_roof','bump_roof'] },
      { title: 'Cladding Clearances', instruction: 'All cladding must maintain clearance from horizontal surfaces: 2" above roofing, 6" above grade, 1" above decks/patios. Direct contact wicks moisture into the cladding and wall assembly.', camera: C([16,2,14],[0,-3,2],28), highlightedGroups: ['walls_1st','walls_2nd','stone_wainscot'], hiddenGroups: ['gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','turret','dormer','garage_roof','bump_roof','chimney','porch','windows','doors'] },
    ]},
    { slug: 'drainage-quiz', title: 'Drainage Plane Quiz', objective: 'Test your WRB and cladding knowledge.', type: 'quiz', durationMinutes: 6, quizQuestions: [
      { text: 'WRB courses should be installed starting from the...', type: 'multiple_choice', options: ['Top of the wall','Bottom of the wall','Middle','Any direction'], correctAnswer: 1, explanation: 'Start at the bottom. Upper courses lap OVER lower courses so water always sheds outward — the shingling principle.' },
      { text: 'Minimum cladding clearance above grade is...', type: 'multiple_choice', options: ['2 inches','4 inches','6 inches','No clearance needed'], correctAnswer: 2, explanation: '6 inches above grade prevents splash-back and soil moisture from wicking into cladding materials.' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 11. MEP ROUGH-IN
// ════════════════════════════════════════════════════════════════════════════════
const M11: CurriculumModule = {
  slug: 'mep-rough', title: 'MEP Rough-In', phase: 'mep_rough', track: 'mep', difficulty: 'intermediate', icon: 'mep',
  description: 'Plumbing, HVAC, and electrical routing through framing. Boring/notching limits, penetration sealing, and fireblocking.',
  lessons: [
    { slug: 'plumbing-routing', title: 'Plumbing Routing', objective: 'Route supply and DWV piping without compromising structural framing.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Supply Lines', instruction: 'Hot and cold supply lines (PEX, copper, or CPVC) route through bored holes in studs and joists. Holes must follow boring limits — too large or too close to the edge weakens the framing member.', camera: C([16,4,14],[0,-2,0],30), highlightedGroups: ['wall_studs','interior_walls'], hiddenGroups: HIDE_ALL_BUT_WALLS },
      { title: 'DWV System', instruction: 'Drain-waste-vent pipes are larger (1.5"-4") and require more framing accommodation. Vertical stacks pass through plates. Horizontal runs require notching or oversized holes. Always maintain proper slope: 1/4" per foot for drains.', camera: C([12,2,12],[0,-3,0],28), highlightedGroups: ['wall_studs'], hiddenGroups: PH('framing_walls') },
    ]},
    { slug: 'boring-notching', title: 'Boring & Notching Rules', objective: 'Know the IRC limits for holes and notches in studs, joists, and rafters.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Stud Rules', instruction: 'Bored holes: max 40% of stud depth (1-3/8" for 2x4), min 5/8" from edge. Notches: max 25% of depth, not in the middle third of bearing walls. Double studs at large penetrations.', camera: C([14,3,12],[0,-2,0],28), highlightedGroups: ['wall_studs'], hiddenGroups: PH('framing_walls'), codeRefs: [{ family: 'IRC', section: 'R602.6', summary: 'Stud boring: max 40% depth, 5/8" from edge. Notching: max 25% depth, not in middle 1/3 of bearing studs.' }] },
      { title: 'Joist Rules', instruction: 'Bored holes: max 1/3 of joist depth, min 2" from top or bottom edge. Notches: max 1/6 of depth, only in outer 1/3 of span. No notches in the middle 1/3. These rules prevent structural failure.', camera: C([16,1,14],[0,-4,0],26), highlightedGroups: ['foundation','floor_joists'], hiddenGroups: PH('framing_walls'), codeRefs: [{ family: 'IRC', section: 'R502.8', summary: 'Joist boring: max D/3, min 2" from edges. Notching: max D/6, outer 1/3 of span only.' }] },
    ]},
    { slug: 'fireblocking', title: 'Fireblocking', objective: 'Block concealed spaces to prevent fire spread through walls, floors, and soffits.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Why Fireblocking', instruction: 'Open stud cavities, soffits, and chases act as chimneys during a fire — flames and hot gases travel rapidly through concealed spaces. Fireblocking cuts off these pathways.', camera: C([18,8,16],[0,-1,0],34), highlightedGroups: ['wall_studs','interior_walls'], hiddenGroups: HIDE_ALL_BUT_WALLS },
      { title: 'Required Locations', instruction: 'IRC R602.8: Fireblocking required at floor/ceiling levels, soffits, stair stringers, and where walls connect to roof assemblies. Materials: 2x lumber, 1/2" drywall, or caulk/foam at penetrations.', camera: C([14,4,12],[0,-1,0],30), highlightedGroups: ['wall_studs','interior_walls','floor_band'], hiddenGroups: [...HIDE_ALL_BUT_WALLS,'gable_ends'], codeRefs: [{ family: 'IRC', section: 'R602.8', summary: 'Fireblocking: required at floor/ceiling levels, soffits, stairs, and concealed spaces exceeding 10 feet.' }] },
    ]},
    { slug: 'mep-quiz', title: 'MEP Quiz', objective: 'Test your MEP rough-in knowledge.', type: 'quiz', durationMinutes: 6, quizQuestions: [
      { text: 'Max bored hole in a 2x4 stud (3.5" depth)?', type: 'multiple_choice', options: ['1"','1-3/8"','2"','2-1/2"'], correctAnswer: 1, explanation: '40% of 3.5" = 1.4", so max 1-3/8". Per IRC R602.6.' },
      { text: 'Joists may be notched in the middle 1/3 of the span.', type: 'true_false', correctAnswer: 'false', explanation: 'Notches only in the outer 1/3 of span. Middle 1/3 is the highest-stress zone. IRC R502.8.' },
      { text: 'Fireblocking is required at what locations?', type: 'multiple_choice', options: ['Only at the foundation','Floor/ceiling levels and concealed spaces','Only in commercial buildings','Around windows only'], correctAnswer: 1, explanation: 'IRC R602.8: at floor/ceiling levels, soffits, stairs, and concealed spaces exceeding 10 feet.' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 12. INSULATION & AIR SEALING
// ════════════════════════════════════════════════════════════════════════════════
const M12: CurriculumModule = {
  slug: 'insulation-air-sealing', title: 'Insulation & Air Sealing', phase: 'insulation', track: 'energy', difficulty: 'advanced', icon: 'insulation',
  description: 'Thermal boundary, air barriers, thermal bridging, vented vs conditioned attics, and moisture risk management.',
  lessons: [
    { slug: 'thermal-boundary', title: 'The Continuous Thermal Boundary', objective: 'Build an insulation envelope with no gaps, compressions, or thermal bridges.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'The Envelope Concept', instruction: 'The thermal boundary must be continuous from foundation to ridge — under the slab, up the walls, across the ceiling or roof. Any gap is a thermal short-circuit that wastes energy and creates condensation risk.', camera: C([28,14,26],[0,0,0],40), highlightedGroups: ['foundation','walls_1st','walls_2nd','sheathing'], hiddenGroups: HIDE_DETAILS },
      { title: 'Thermal Bridging', instruction: 'Wood studs at 16" o.c. are R-1/inch. Fiberglass batts are R-3.5/inch. At every stud, heat bypasses the insulation. This reduces whole-wall R-value by 15-25%. Continuous insulation (CI) eliminates this.', camera: C([14,4,14],[0,-1,0],28), highlightedGroups: ['wall_studs','interior_walls'], hiddenGroups: HIDE_ALL_BUT_WALLS },
      { title: 'Common Gaps', instruction: 'The most missed insulation locations: rim joist, behind tubs/showers on exterior walls, above dropped ceilings, around recessed lights, and at cantilevers. Each gap is a condensation and energy failure point.', camera: C([18,6,16],[0,-1,0],32), highlightedGroups: ['wall_studs','interior_walls','floor_band'], hiddenGroups: [...HIDE_ALL_BUT_WALLS,'gable_ends'] },
    ]},
    { slug: 'air-sealing', title: 'Air Sealing Strategy', objective: 'Seal the air barrier at every penetration before insulation goes in.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Air Sealing Before Insulation', instruction: 'Insulation slows conduction. But air movement through gaps carries 100x more heat than conduction alone. Seal every penetration — wires, pipes, ducts, boxes — BEFORE installing insulation.', camera: C([16,4,14],[0,-2,0],30), highlightedGroups: ['wall_studs','interior_walls'], hiddenGroups: HIDE_ALL_BUT_WALLS },
      { title: 'The Big Three', instruction: 'Three locations account for 50%+ of residential air leakage: (1) attic penetrations (top plates, duct chases, recessed lights), (2) rim joists, (3) window/door rough openings. Seal these first.', camera: C([20,8,18],[0,0,0],36), highlightedGroups: ['walls_1st','walls_2nd','windows','doors','floor_band'], hiddenGroups: ['foundation','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','turret','dormer','garage_roof','bump_roof','chimney','stone_wainscot','porch'] },
    ]},
    { slug: 'vented-vs-conditioned', title: 'Vented vs Conditioned Attics', objective: 'Compare vented attic assemblies with conditioned strategies and their moisture implications.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Vented Attic', instruction: 'Insulation at the ceiling plane. Attic space is ventilated and unconditioned. Requires 1:150 net free vent area (or 1:300 with balanced intake/exhaust). The most common residential approach.', camera: C([18,10,16],[0,2,0],34), highlightedGroups: ['sheathing','ridge_cap','fascia_soffit','walls_2nd','gable_ends'], hiddenGroups: [...HIDE_DETAILS,'walls_1st','turret','dormer','garage_roof','bump_roof'], codeRefs: [{ family: 'IRC', section: 'R806.1', summary: 'Ventilated attics: min 1 sq ft NFA per 150 sq ft attic area. 1:300 with balanced vents.' }] },
      { title: 'Conditioned (Unvented) Attic', instruction: 'Insulation at the roof deck (spray foam or rigid + batts). No ventilation — the attic becomes conditioned space. HVAC equipment in the attic performs better. Requires specific vapor retarder strategy per climate.', camera: C([14,8,14],[0,3,0],32), highlightedGroups: ['sheathing','walls_2nd','gable_ends'], hiddenGroups: [...HIDE_DETAILS,'walls_1st','turret','dormer','garage_roof','bump_roof'], codeRefs: [{ family: 'IRC', section: 'R806.5', summary: 'Unvented attics: air-impermeable insulation at roof deck. R-value and vapor retarder per climate zone.' }] },
      { title: 'Moisture Risks', instruction: 'In a vented attic, warm moist air from below can condense on cold sheathing — air seal the ceiling plane. In an unvented attic, the sheathing stays warm but you must prevent interior moisture from reaching it. Both assemblies fail if air sealing is inadequate.', camera: C([20,12,18],[0,2,0],36), highlightedGroups: ['sheathing','gable_ends','ridge_cap'], hiddenGroups: [...HIDE_DETAILS,'walls_1st','turret','dormer','garage_roof','bump_roof'] },
    ]},
    { slug: 'insulation-inspect', title: 'Insulation Inspection', objective: 'Find insulation gaps, compressions, and air sealing defects.', type: 'inspect', durationMinutes: 8, inspectIssues: [
      { meshKey: 'w1_main_f', title: 'Compressed batt at junction box', description: 'Insulation stuffed behind electrical box. Compressed insulation loses R-value dramatically.', severity: 'moderate' },
      { meshKey: 'w1_main_l', title: 'Missing rim joist air seal', description: 'No spray foam or caulk at rim joist — a major air leakage point.', severity: 'severe' },
      { meshKey: 'w2_main_b', title: 'Gap above dropped soffit', description: 'Insulation stops at the dropped ceiling instead of continuing over the top. Heat escapes into the attic.', severity: 'moderate' },
    ]},
    { slug: 'insulation-quiz', title: 'Insulation Quiz', objective: 'Test your thermal envelope knowledge.', type: 'quiz', durationMinutes: 8, quizQuestions: [
      { text: 'Air sealing should be done before or after insulation?', type: 'multiple_choice', options: ['Before','After','Same time','Does not matter'], correctAnswer: 0, explanation: 'Before. All penetrations must be accessible for sealing before insulation covers them.' },
      { text: 'Thermal bridging through studs reduces whole-wall R-value by what percentage?', type: 'multiple_choice', options: ['5-10%','15-25%','40-50%','Less than 1%'], correctAnswer: 1, explanation: '15-25%. Wood studs at R-1/inch vs cavity insulation at R-3.5/inch create significant thermal shorts.' },
      { text: 'In a vented attic, insulation is placed at the roof deck.', type: 'true_false', correctAnswer: 'false', explanation: 'In a vented attic, insulation is at the CEILING plane (attic floor). Roof deck insulation is for unvented/conditioned attics.' },
      { text: 'Minimum attic ventilation ratio with balanced intake/exhaust?', type: 'multiple_choice', options: ['1:50','1:150','1:300','1:500'], correctAnswer: 2, explanation: 'IRC R806.1: 1:300 NFA-to-attic-area ratio when balanced between intake (soffit) and exhaust (ridge).' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 13. DRYWALL & FINISHES
// ════════════════════════════════════════════════════════════════════════════════
const M13: CurriculumModule = {
  slug: 'drywall-finishes', title: 'Drywall & Interior Finishes', phase: 'drywall_finishes', track: 'finishes', difficulty: 'beginner', icon: 'finishes',
  description: 'Drywall hanging and finishing, wet-area prep, trim, and the finish sequence that determines final quality.',
  lessons: [
    { slug: 'drywall-sequence', title: 'Drywall Hanging Sequence', objective: 'Hang drywall ceiling-first, then walls, with proper screw patterns and moisture-resistant board placement.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Ceilings First', instruction: 'Always hang ceiling sheets before walls. Wall sheets butt up underneath, supporting ceiling edges. Screws at 12" o.c. in field, 8" at edges. Perpendicular to framing for maximum strength.', camera: C([18,8,16],[0,0,0],34), highlightedGroups: ['drywall'], hiddenGroups: PH('drywall') },
      { title: 'Walls Next', instruction: 'Hang top sheet first, tight to ceiling. Bottom sheet lifts to meet it. Stagger joints from the ceiling and from adjacent walls. Leave 1/2" gap at the floor — baseboard covers it.', camera: C([14,4,14],[0,-2,0],30), highlightedGroups: ['wall_studs','interior_walls'], hiddenGroups: HIDE_ALL_BUT_WALLS },
      { title: 'Moisture-Resistant Board', instruction: 'Green board or cement board in bathrooms and kitchens within 3 feet of water sources. Regular drywall absorbs water, swells, and grows mold. Never use regular drywall behind tile in a shower.', camera: C([10,2,10],[0,-2,0],26), highlightedGroups: ['wall_studs'], hiddenGroups: PH('framing_walls') },
    ]},
    { slug: 'wet-area-prep', title: 'Wet Area Preparation', objective: 'Prepare shower and tub surrounds with cement board and waterproof membrane.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Cement Board', instruction: 'Cement backer board (1/2") on studs. Tape and thin-set the joints — not drywall compound. The board itself is not waterproof — it is water-stable. A waterproof membrane must go over it.', camera: C([12,3,12],[0,-2,0],28), highlightedGroups: ['wall_studs'], hiddenGroups: PH('framing_walls') },
      { title: 'Waterproof Membrane', instruction: 'Apply a liquid or sheet membrane (Kerdi, RedGard, or equivalent) over all cement board in the wet zone. Overlap seams 2 inches. This is the actual waterproofing — not the tile, not the grout, not the backer board.', camera: C([8,1,8],[0,-2,0],24), highlightedGroups: ['wall_studs'], hiddenGroups: PH('framing_walls') },
    ]},
    { slug: 'trim-flooring', title: 'Trim & Flooring Sequence', objective: 'Install trim and flooring in the correct order for clean results.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'The Correct Order', instruction: 'Paint walls → install flooring → install baseboard → install casing around doors/windows → final paint touch-up. Reversing any step means rework. Baseboard always goes OVER flooring, never under.', camera: C([18,6,16],[0,-1,0],32), highlightedGroups: ['walls_1st','walls_2nd','windows','doors'], hiddenGroups: ['foundation','gable_ends','sheathing','underlayment','ice_barrier','valley_metal','drip_edge','step_flashing','ridge_cap','fascia_soffit','gutters','turret','dormer','garage_roof','bump_roof','chimney','porch'] },
      { title: 'Expansion Gaps', instruction: 'Hard flooring (laminate, engineered wood, LVP) needs a 1/4" expansion gap at all walls. Baseboard covers this gap. Without the gap, the floor buckles as it expands with humidity changes.', camera: C([10,1,10],[0,-4,0],24), highlightedGroups: ['drywall'], hiddenGroups: PH('drywall') },
    ]},
    { slug: 'finishes-quiz', title: 'Finishes Quiz', objective: 'Test your interior finish knowledge.', type: 'quiz', durationMinutes: 5, quizQuestions: [
      { text: 'Drywall should be hung on the ceiling before the walls.', type: 'true_false', correctAnswer: 'true', explanation: 'Ceiling first. Wall sheets butt up underneath, supporting ceiling edges.' },
      { text: 'Regular drywall may be used behind shower tile.', type: 'true_false', correctAnswer: 'false', explanation: 'Never. Use cement backer board with a waterproof membrane. Regular drywall absorbs water and grows mold.' },
      { text: 'The actual waterproofing in a shower is provided by...', type: 'multiple_choice', options: ['Tile','Grout','Waterproof membrane over cement board','The cement board itself'], correctAnswer: 2, explanation: 'The membrane (Kerdi, RedGard, etc.) is the waterproofing. Tile and grout are not waterproof — water passes through both.' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 14. FINAL INSPECTION
// ════════════════════════════════════════════════════════════════════════════════
const M14: CurriculumModule = {
  slug: 'final-inspection', title: 'Final Inspection & Handoff', phase: 'final_inspection', track: 'general', difficulty: 'advanced', icon: 'inspect',
  description: 'The complete checklist — moisture management, life safety, code compliance, and the punch list protocol that earns the certificate of occupancy.',
  lessons: [
    { slug: 'inspection-checklist', title: 'Inspection Checklist', objective: 'Walk through a final inspection covering structure, envelope, MEP, and safety.', type: 'learn', durationMinutes: 15, steps: [
      { title: 'Structural Check', instruction: 'Verify: continuous load path from ridge to footing, all connections made, shear wall nailing complete, hold-downs installed. Walk the attic — look for cracked framing, missing hangers, and bearing misalignment.', camera: C([28,16,26],[0,0,0],42), highlightedGroups: ['foundation','floor_joists','wall_studs','walls_1st','walls_2nd'], hiddenGroups: PH('final') },
      { title: 'Envelope Check', instruction: 'Verify: all flashing installed and properly lapped, WRB continuous, window/door integration complete, cladding clearances met. Check the valleys, step flashing, and kickout locations specifically.', camera: C([22,8,20],[0,0,0],36), highlightedGroups: ['sheathing','valley_metal','step_flashing','drip_edge','fascia_soffit','ice_barrier'], hiddenGroups: ['foundation','walls_1st','floor_band','stone_wainscot','windows','doors','porch','gutters','chimney','turret','dormer','garage_roof','bump_roof'] },
      { title: 'MEP Check', instruction: 'Verify: all plumbing tested and leak-free, HVAC operational, electrical panels accessible and properly labeled, smoke/CO detectors installed per IRC R314/R315 (every bedroom + each level).', camera: C([18,6,16],[0,-1,0],34), highlightedGroups: ['plumbing_supply','plumbing_drain','electrical','hvac'], hiddenGroups: PH('final'), codeRefs: [{ family: 'IRC', section: 'R314.3', summary: 'Smoke alarms: each bedroom, outside bedrooms, each story. Interconnected.' }] },
      { title: 'Grade and Drainage', instruction: 'Final check: finish grade slopes 6" in 10 feet from foundation, downspouts discharge 6 feet from house, no standing water, window wells have drainage, crawlspace vapor barrier intact.', camera: C([30,10,28],[0,-3,0],42), highlightedGroups: ['foundation'], hiddenGroups: PH('final'), codeRefs: [{ family: 'IRC', section: 'R401.3', summary: 'Finish grade: min 6" fall in 10 feet from foundation.' }] },
    ]},
    { slug: 'common-failures', title: 'Top 10 Inspection Failures', objective: 'Know the most common items that fail final inspection and how to prevent each one.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'The Top Five', instruction: '1. Missing GFCI protection in kitchens/baths/garages. 2. Grade sloping toward foundation. 3. Missing smoke/CO detectors. 4. Incomplete fireblocking. 5. Inadequate attic ventilation. These five account for 60% of final inspection failures.', camera: C([24,12,22],[0,0,0],38), highlightedGroups: ['electrical','step_flashing','drip_edge','gutters','wall_studs'], hiddenGroups: PH('final') },
      { title: 'The Next Five', instruction: '6. Missing kickout flashing. 7. Window flashing not integrated with WRB. 8. Drip edge sequence wrong at eave. 9. Insufficient bracing/shear wall nailing. 10. Handrail/guardrail height wrong (34-38" and 36" min respectively).', camera: C([20,8,18],[0,0,0],36), highlightedGroups: ['step_flashing','drip_edge','gutters','walls_1st','walls_2nd'], hiddenGroups: ['foundation','turret','dormer','garage_roof','bump_roof','chimney','porch'] },
      { title: 'Prevention Mindset', instruction: 'Every item on this list is preventable with a mid-construction walk. Do not wait for the inspector to find these — check every item yourself at each phase before calling for inspection. The best builders never fail an inspection.', camera: C([28,14,26],[0,0,0],40), hiddenGroups: PH('final') },
    ]},
    { slug: 'punch-list', title: 'Punch List Protocol', objective: 'Document and prioritize punch list items for efficient correction.', type: 'learn', durationMinutes: 8, steps: [
      { title: 'The Walk-Through', instruction: 'Walk every room with the homeowner. Note every deficiency: paint touch-ups, trim gaps, hardware adjustments, cleaning, landscaping incomplete. Use a numbered list with photos. Be thorough — missed items become warranty calls.', camera: C([18,6,16],[0,-1,0],34), highlightedGroups: ['kitchen','bathroom','interior_finishes','drywall'], hiddenGroups: PH('final') },
      { title: 'Prioritize by System', instruction: 'Group punch items: structural first, then waterproofing, then MEP, then cosmetic. Fix the invisible-but-critical items before the visible-but-cosmetic ones. A dripping faucet matters more than a paint scuff.', camera: C([22,10,20],[0,0,0],38), highlightedGroups: ['plumbing_supply','plumbing_drain','electrical','hvac'], hiddenGroups: PH('final') },
    ]},
    { slug: 'final-inspect-challenge', title: 'Final Inspection Challenge', objective: 'Walk the complete house and find defects across every system.', type: 'inspect', durationMinutes: 15, inspectIssues: [
      { meshKey: 'valley_f_channel', title: 'Valley metal fasteners in water channel', description: 'Fasteners in the flow path — critical leak risk.', severity: 'critical', codeRef: 'NRCA RMS-7.3' },
      { meshKey: 'bump_shed_roof', title: 'Dead valley with no cricket', description: 'Shed roof dumps into main wall with no diverter installed.', severity: 'severe' },
      { meshKey: 'drip_eave_f', title: 'Drip edge sequence wrong at eave', description: 'Over underlayment instead of under at eave.', severity: 'moderate', codeRef: 'IRC R905.2.8.5' },
      { meshKey: 'found_main', title: 'Grade slopes toward foundation', description: 'Finish grade directs water toward the house instead of away. IRC R401.3 requires 6" fall in 10 feet.', severity: 'severe', codeRef: 'IRC R401.3' },
      { meshKey: 'step_flash_5', title: 'Missing kickout flashing', description: 'Step flashing terminates at eave without kickout. Water enters behind wall cladding.', severity: 'severe' },
    ]},
    { slug: 'final-comprehensive-quiz', title: 'Comprehensive Final Quiz', objective: 'Test your knowledge across all 14 construction phases.', type: 'quiz', durationMinutes: 15, quizQuestions: [
      { text: 'Drip edge at the eave goes ___ the underlayment.', type: 'multiple_choice', options: ['Over','Under','Either','No drip edge needed'], correctAnswer: 1, explanation: 'Under at eave per IRC R905.2.8.5.' },
      { text: 'Finish grade: min fall from foundation in first 10 feet?', type: 'multiple_choice', options: ['2 inches','4 inches','6 inches','12 inches'], correctAnswer: 2, explanation: 'IRC R401.3: 6 inches in 10 feet.' },
      { text: 'What connects wood framing to the concrete foundation?', type: 'multiple_choice', options: ['Concrete nails','Anchor bolts with sill seal','Construction adhesive','Gravity'], correctAnswer: 1, explanation: 'Anchor bolts (1/2" dia, 6 ft o.c. max) with sill seal gasket. IRC R403.1.6.' },
      { text: 'Air sealing should be done after insulation.', type: 'true_false', correctAnswer: 'false', explanation: 'Before. Penetrations must be accessible before insulation covers them.' },
      { text: 'In a vented attic, insulation goes at the...', type: 'multiple_choice', options: ['Roof deck','Ceiling plane (attic floor)','Exterior walls only','Not insulated'], correctAnswer: 1, explanation: 'Ceiling plane. Attic space above is ventilated and unconditioned.' },
      { text: 'Max hole diameter in a 2x4 stud?', type: 'multiple_choice', options: ['1"','1-3/8"','2"','2-1/2"'], correctAnswer: 1, explanation: '40% of 3.5" = 1.4", so max 1-3/8". IRC R602.6.' },
      { text: 'The waterproof layer in a shower is the tile.', type: 'true_false', correctAnswer: 'false', explanation: 'The membrane (Kerdi, RedGard) over cement board is the waterproofing. Tile and grout are not waterproof.' },
      { text: 'Valley metal fasteners go in the water channel.', type: 'true_false', correctAnswer: 'false', explanation: 'Outer edges only. Every nail in the channel is a leak point. NRCA RMS-7.3.' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// 15. ADJUSTER BASICS — Scoping a Flat Roof Hail Loss
// Based on Resolution Claims Consulting inspection protocol
// ════════════════════════════════════════════════════════════════════════════════

const M15: CurriculumModule = {
  slug: 'adjuster-basics', title: 'Adjuster Basics: Scoping a Hail Loss', phase: 'final_inspection', track: 'adjuster', difficulty: 'intermediate', icon: 'inspect',
  description: 'Learn the complete field inspection protocol for a flat roof hail damage claim. Elevation photos, roof overview, membrane testing, soft metals, HVAC, interior — the full scope in the order carriers expect it.',
  lessons: [
    // ── Lesson 1: The Inspection Protocol ──
    { slug: 'inspection-protocol', title: 'The Inspection Protocol', objective: 'Understand the complete photo and documentation sequence for a flat roof hail inspection before you get on the ladder.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Before You Arrive', instruction: 'Review the claim file before leaving the office. Know: date of loss, reported damage, policy type, deductible, prior claims. Pull hail reports (HailTrace, NOAA) for the DOL. Confirm the insured will be present or has authorized access.', camera: C([35,18,30],[0,0,0],45), hiddenGroups: PH('final') },
      { title: 'Required Photo Sequence', instruction: 'Every carrier expects a specific documentation order. The Resolution Claims protocol requires: 4 elevation shots, signage, elevation damages, roof overview, HVAC/RTU (all sides), soft metals, roof components, chalk membrane, parapet walls, cap flashing, spatter marks, pitch measurement, gutters/fasteners, interior decking, interior leaks, and pre-existing damage. Miss any category and the claim gets sent back.', camera: C([30,14,26],[0,0,0],40), hiddenGroups: PH('final') },
      { title: 'Tools You Need', instruction: 'Chalk or crayon (for marking test squares on membrane). Tape measure or ruler (in EVERY damage photo for scale). Pitch gauge or app. Camera with good close-up capability. Ladder. Safety harness if required. Moisture meter for interior inspection. Core sample tool if membrane type is unknown.', camera: C([22,10,20],[0,-2,0],36), hiddenGroups: PH('final') },
      { title: 'The Golden Rule', instruction: 'EVERY hail damage photo must include a ruler or tape showing the hail impact size. Without scale reference, the carrier cannot determine hail diameter. No ruler = no documentation = denied line items. This is the single most common adjuster mistake.', camera: C([16,8,16],[0,-1,0],32), hiddenGroups: PH('final') },
    ]},

    // ── Lesson 2: Elevation Photos ──
    { slug: 'elevation-photos', title: 'Four-Sided Elevation Photos', objective: 'Document all four building elevations plus signage, establishing the subject property and showing exterior damage from grade level.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Front Elevation', instruction: 'Stand far enough back to capture the entire front face of the building in one shot. Include the roofline, signage, all fenestrations (windows/doors), and the ground-to-roof transition. This establishes the subject property for the claim file.', camera: C([0,3,28],[0,-1,0],38), hiddenGroups: PH('final'), highlightedGroups: ['walls_1st','walls_2nd','windows','doors','porch','signage'] },
      { title: 'Right Elevation', instruction: 'Same protocol — full building face. Capture any exterior damage visible from grade: dented downspouts, damaged siding, cracked window glazing, dented window frames, fascia damage. Note the compass direction for each elevation.', camera: C([28,3,0],[0,-1,0],38), hiddenGroups: PH('final'), highlightedGroups: ['walls_1st','walls_2nd','windows','gutters'] },
      { title: 'Back Elevation', instruction: 'Capture the rear face. This is often where HVAC condensers, utility connections, and dumpster enclosures are located. Each of these may have hail damage. Document them all.', camera: C([0,3,-28],[0,-1,0],38), hiddenGroups: PH('final'), highlightedGroups: ['walls_1st','walls_2nd','chimney','bump_roof'] },
      { title: 'Left Elevation + Signage', instruction: 'Complete the four-sided documentation. After all four elevations, photograph any building signage — this confirms the property address and business name for the claim file. The sign on this building is mounted on the front face above the second floor.', camera: C([-28,3,0],[0,-1,0],38), hiddenGroups: PH('final'), highlightedGroups: ['walls_1st','walls_2nd','garage_roof','signage'] },
      { title: 'Signage Close-Up', instruction: 'Get a clear close-up of the building signage showing the business name and address. This is your proof of the subject property. If there is no signage, photograph the street address numbers and a street sign or GPS coordinates.', camera: C([3,4,18],[0,2,4.7],24), hiddenGroups: PH('final'), highlightedGroups: ['signage'] },
      { title: 'Elevation Damages', instruction: 'Now walk each elevation again looking specifically for hail damage. Dented gutters, dented downspouts, pocked siding, cracked glass, damaged trim. Photograph each with a ruler showing the impact diameter. Mark the compass direction.', camera: C([16,1,16],[0,-3,3],28), hiddenGroups: PH('final'), highlightedGroups: ['gutters','fascia_soffit','stone_wainscot'] },
    ]},

    // ── Lesson 3: Roof Overview ──
    { slug: 'roof-overview', title: 'Roof Overview & Orientation', objective: 'Document the overall roof condition, orientation, sections, and key features before focusing on damage details.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Full Roof Overview', instruction: 'From the highest accessible point, photograph the entire roof showing all sections, HVAC equipment, drains, penetrations, and parapet walls. Note the RTU on the garage section. This overview tells the carrier the scope of what they are looking at.', camera: C([2,28,2],[0,0,0],50), hiddenGroups: PH('final'), highlightedGroups: ['sheathing','garage_roof','bump_roof','ridge_cap','rooftop_hvac','soft_metals'] },
      { title: 'Roof Sections', instruction: 'Identify each distinct roof section. This property has: main gable, cross-wing gable, garage hip with RTU, rear bump-out shed, porch, dormer, and turret. Each section may have different membrane types or ages. Each section needs its own scope.', camera: C([22,20,20],[0,2,0],42), hiddenGroups: PH('final'), highlightedGroups: ['sheathing','garage_roof','bump_roof','turret','dormer','rooftop_hvac'] },
      { title: 'Pitch Measurement', instruction: 'Document the roof pitch with a pitch gauge or smartphone app. Pitch affects: material quantities, labor rates (steep charge above 7:12), walkability, and warranty requirements. Photograph the gauge reading for the file. This house has 8:12 main, 10:12 cross wing, 5:12 garage.', camera: C([12,6,14],[0,2,0],32), hiddenGroups: PH('final'), highlightedGroups: ['sheathing','ridge_cap'] },
    ]},

    // ── Lesson 4: HVAC & Rooftop Units ──
    { slug: 'hvac-inspection', title: 'HVAC / RTU Inspection', objective: 'Document hail damage to rooftop HVAC equipment from all four sides — condenser fins, cabinet panels, and refrigerant lines.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'RTU Overview — Front', instruction: 'Photograph the rooftop unit from the front. The RTU sits on a curb on the garage flat roof. Show the full unit including curb, cabinet, and condenser section. Get the unit tag/nameplate (model, serial, tonnage) in a separate close-up.', camera: C([-6,0,4],[-9.5,-1.5,0],26), hiddenGroups: PH('final'), highlightedGroups: ['rooftop_hvac'] },
      { title: 'RTU — Side with Fins', instruction: 'Move to the side showing the condenser fins. Hail crushes these aluminum fins, reducing airflow and efficiency. Photograph at an angle that shows the denting pattern. Use a ruler to show impact size. Document the percentage of fin area damaged — carriers use this to determine repair vs replace.', camera: C([-12,0,2],[-9.5,-1.5,0],24), hiddenGroups: PH('final'), highlightedGroups: ['rooftop_hvac'] },
      { title: 'RTU — Opposite Side', instruction: 'Photograph the opposite side showing the other condenser fin panel. Both sides may have different damage patterns depending on hail direction. Document each side separately.', camera: C([-7,0,-2],[-9.5,-1.5,0],24), hiddenGroups: PH('final'), highlightedGroups: ['rooftop_hvac'] },
      { title: 'RTU — Disconnect & Lines', instruction: 'Photograph the electrical disconnect box and refrigerant lines. Dents in the disconnect cabinet, torn line insulation, and kinked copper lines are each separate line items. The disconnect should also show the unit amperage for pricing.', camera: C([-8,-1,2],[-9.5,-1.8,0.5],22), hiddenGroups: PH('final'), highlightedGroups: ['rooftop_hvac'] },
    ]},

    // ── Lesson 5: Membrane Testing & Soft Metals ──
    { slug: 'membrane-soft-metals', title: 'Membrane Testing & Soft Metals', objective: 'Chalk-test the membrane for hail bruises, inspect soft metals for impact marks, and document test squares.', type: 'learn', durationMinutes: 14, steps: [
      { title: 'What is Membrane Chalking?', instruction: 'On a flat (low-slope) roof with modified bitumen or BUR membrane, hail creates bruises — round depressions where the granule surface is fractured. Chalking reveals these: rub chalk across the membrane surface. Bruises show as circles where the chalk fills the fractured granules.', camera: C([10,4,10],[0,0,2],30), hiddenGroups: PH('final'), highlightedGroups: ['sheathing','underlayment'] },
      { title: 'Test Squares', instruction: 'Mark a 10x10 foot test square on the membrane. Count every hail bruise inside the square. Photograph the square from above showing all marked bruises. 8+ bruises per 100 sq ft typically meets threshold for replacement on most carrier guidelines. Document at least 3 test squares in different roof areas.', camera: C([6,8,6],[0,0,0],28), hiddenGroups: PH('final'), highlightedGroups: ['sheathing'] },
      { title: 'Soft Metal Indicators', instruction: 'Soft metals (aluminum vents, pipe boots, exhaust caps, turbine vents) show hail impact clearly because they dent easily. This property has: a turbine vent, exhaust cap, pipe boot, and gooseneck vent — all on the main roof. These are your PROOF of hail at the property. Photograph every dented soft metal with a ruler.', camera: C([0,10,4],[-2,2,-0.5],30), hiddenGroups: PH('final'), highlightedGroups: ['soft_metals'] },
      { title: 'Spatter Marks', instruction: 'Hail hits wet or dirty surfaces and leaves spatter marks — radial splash patterns on walls, parapet caps, and vertical surfaces. Check the cap flashing on the bump-out parapet. These prove the hail direction and approximate size.', camera: C([-6,2,-6],[-5,-1.5,-5.5],26), hiddenGroups: PH('final'), highlightedGroups: ['cap_flashing','walls_2nd','gable_ends'] },
      { title: 'Core Sample', instruction: 'If the membrane type is unknown or if you need to verify the number of roof layers, take a core sample. Cut a small square (about 2x2 inches) through all membrane layers down to the deck. This reveals: membrane type, number of plies, insulation type and thickness, and deck type. Photograph the core in cross-section.', camera: C([8,2,6],[0,0,0],24), hiddenGroups: PH('final'), highlightedGroups: ['sheathing','underlayment'] },
    ]},

    // ── Lesson 6: Flashings & Parapet Walls ──
    { slug: 'flashings-parapets', title: 'Flashings, Parapets & Cap Metal', objective: 'Inspect parapet walls, cap flashing, roof-to-wall transitions, and all edge metal for hail damage and pre-existing conditions.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Parapet Walls', instruction: 'Walk every parapet wall. The rear bump-out has a parapet with cap flashing. Look for: hail dents in the cap metal, cracks in coping stones, deteriorated sealant at cap-to-wall joints, and spatter marks on the wall face.', camera: C([-8,2,-8],[-5,-1.5,-6],28), hiddenGroups: PH('final'), highlightedGroups: ['cap_flashing','bump_roof'] },
      { title: 'Cap Flashing Detail', instruction: 'Cap flashing covers the top of parapet walls. Hail dents cap metal and breaks the sealant bond at laps. Photograph every dent with a ruler. Also document any existing deterioration — open laps, rust, missing sealant — as pre-existing damage the carrier will exclude.', camera: C([-6,0,-8],[-5,-1.8,-7],24), hiddenGroups: PH('final'), highlightedGroups: ['cap_flashing'] },
      { title: 'Roof-to-Wall Transitions', instruction: 'Where the membrane meets a wall (base flashing), inspect for hail impacts that cracked the flashing or broke the sealant. Also check for existing water damage at these transitions — ponding stains, algae growth, and membrane shrinkage pulling away from the wall. Distinguish storm damage from maintenance issues.', camera: C([12,2,6],[7,0,0],26), hiddenGroups: PH('final'), highlightedGroups: ['step_flashing','walls_2nd'] },
    ]},

    // ── Lesson 7: Gutters, Fasteners & Drainage ──
    { slug: 'gutters-drainage', title: 'Gutters, Fasteners & Drainage', objective: 'Document gutter damage, exposed fastener condition, and roof drainage system for the complete scope.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Gutter Damage', instruction: 'Walk every run of gutter. Hail dents gutters on the top (horizontal) face and the front (vertical) face — two separate line items. Photograph representative damage with a ruler. Document gutter type (K-style, half-round, commercial box), material (aluminum, steel, copper), and linear footage.', camera: C([10,-1,10],[0,0,4.5],24), hiddenGroups: PH('final'), highlightedGroups: ['gutters'] },
      { title: 'Downspouts', instruction: 'Hail dents downspouts on the exposed face. Each downspout is a separate line item by size (2x3, 3x4, round). Photograph dents with ruler. Also note: do the downspouts discharge at grade or into underground drain? If underground, verify they are flowing — blocked underground drains cause foundation damage.', camera: C([8,0,8],[6,-3,4.5],24), hiddenGroups: PH('final'), highlightedGroups: ['gutters'] },
      { title: 'Exposed Fasteners', instruction: 'On metal roofs and some flat systems, exposed fasteners can be damaged by hail — loose screws, cracked neoprene washers, and backed-out fasteners. Photograph any damaged fasteners as they create leak points. This is especially important on standing seam and screw-down metal panels.', camera: C([8,4,6],[0,1,0],26), hiddenGroups: PH('final'), highlightedGroups: ['ridge_cap','sheathing'] },
    ]},

    // ── Lesson 8: Interior Inspection ──
    { slug: 'interior-inspection', title: 'Interior Inspection', objective: 'Inspect the building interior for active leaks, staining, decking condition, and secondary damage caused by the hail event.', type: 'learn', durationMinutes: 10, steps: [
      { title: 'Decking from Interior', instruction: 'If the building has exposed deck (metal deck, wood deck), inspect from below. Look for: rust staining from leaks, deflected or damaged deck panels, and water-stained insulation. On a metal deck, standing water on top shows as rust trails on the bottom.', camera: C([4,2,4],[0,-2,0],28), hiddenGroups: hideExcept('foundation','floor_joists','wall_studs','interior_walls','stairs','drywall','kitchen','bathroom','interior_finishes') },
      { title: 'Interior Leaks & Staining', instruction: 'Walk the entire interior directly below the roof. Look for: active drips, water stains on ceiling tiles, buckled or sagging tiles, wet insulation visible above tiles, and stains running down walls. Each leak location must be mapped to a roof area above for the scope.', camera: C([0,0,0],[0,-3,2],26), hiddenGroups: hideExcept('foundation','floor_joists','wall_studs','interior_walls','stairs','drywall','kitchen','bathroom','interior_finishes'), highlightedGroups: ['drywall','interior_finishes'] },
      { title: 'Secondary Damage', instruction: 'Water from roof leaks causes secondary damage: mold on drywall, warped flooring, damaged inventory, stained carpet, shorted electrical. Document ALL secondary damage — it is part of the claim. Photograph with wide and close-up shots. Note the room/area for each item.', camera: C([6,2,4],[0,-3,0],30), hiddenGroups: hideExcept('foundation','floor_joists','wall_studs','interior_walls','stairs','drywall','kitchen','bathroom','interior_finishes'), highlightedGroups: ['kitchen','bathroom'] },
    ]},

    // ── Lesson 9: Pre-Existing vs Storm Damage ──
    { slug: 'pre-existing-damage', title: 'Pre-Existing vs Storm Damage', objective: 'Distinguish pre-existing maintenance issues from storm damage — the most contested area in every hail claim.', type: 'learn', durationMinutes: 12, steps: [
      { title: 'Why This Matters', instruction: 'Carriers will deny or reduce every claim where pre-existing damage is commingled with storm damage. YOUR job is to clearly separate the two. Photograph pre-existing damage SEPARATELY from storm damage and label it in your report. If you do not, the carrier will attribute everything to pre-existing and deny the claim.', camera: C([22,12,20],[0,0,0],38), hiddenGroups: PH('final') },
      { title: 'Pre-Existing Indicators', instruction: 'Weathering: oxidation, granule loss from UV (uniform, not round impacts). Foot traffic damage: scuff marks, crushed gravel in traffic paths. Ponding: algae rings, membrane discoloration in low areas. Open seams: membrane shrinkage pulling laps apart. Biological growth: moss, lichen on north-facing slopes. None of these are hail.', camera: C([14,6,14],[0,0,0],32), hiddenGroups: PH('final'), highlightedGroups: ['sheathing','underlayment'] },
      { title: 'Storm Damage Indicators', instruction: 'Hail: round impacts with fractured granules, soft metal dents, spatter marks — all consistent in size with the storm report. Wind: lifted shingles, creased shingles at the nail line, missing shingles on wind-facing slopes. Both show PATTERN (consistent size, directional) rather than random deterioration.', camera: C([16,8,12],[0,1,0],30), hiddenGroups: PH('final'), highlightedGroups: ['sheathing','valley_metal','ridge_cap'] },
      { title: 'Documentation Standard', instruction: 'For every damage item: (1) wide shot showing location on the structure, (2) close-up with ruler showing the damage, (3) note whether you are calling it storm or pre-existing in your report. If uncertain, photograph it and note "causation to be determined." Never guess — document and let the evidence speak.', camera: C([20,10,18],[0,0,0],36), hiddenGroups: PH('final') },
    ]},

    // ── Lesson 10: Scoping Quiz ──
    { slug: 'scoping-quiz', title: 'Hail Inspection Protocol Quiz', objective: 'Test your knowledge of the complete flat roof hail inspection protocol.', type: 'quiz', durationMinutes: 10, quizQuestions: [
      { text: 'What must appear in EVERY hail damage photograph?', type: 'multiple_choice', options: ['The adjuster\'s business card','A ruler or tape measure showing scale','The date written on paper','A compass direction'], correctAnswer: 1, explanation: 'A ruler or tape must be in every hail damage photo so the carrier can determine hail impact diameter. Without scale reference, the damage cannot be sized.' },
      { text: 'How many building elevations must be photographed?', type: 'multiple_choice', options: ['Two (front and back)','Three (front, back, one side)','Four (all sides) plus signage','Only the damaged side'], correctAnswer: 2, explanation: 'All four elevations (front, right, back, left) plus building signage. This establishes the subject property and documents damage from all directions.' },
      { text: 'What does chalking a flat roof membrane reveal?', type: 'multiple_choice', options: ['The membrane color','Hail bruises where granules are fractured','The membrane manufacturer','Whether the roof is under warranty'], correctAnswer: 1, explanation: 'Chalk fills the fractured granule pattern left by hail impact, revealing round bruise marks that are otherwise difficult to see on dark membrane.' },
      { text: 'How many test squares should you document?', type: 'multiple_choice', options: ['One is sufficient','At least 3 in different areas','Only if the carrier asks','None — just photograph individual bruises'], correctAnswer: 1, explanation: 'At least 3 test squares (10x10 ft) in different roof areas. This establishes hail density across the roof and prevents the carrier from claiming damage is isolated.' },
      { text: 'Soft metal dents prove hail hit the property.', type: 'true_false', correctAnswer: 'true', explanation: 'Soft metals (aluminum vents, pipe boots, exhaust caps) dent easily from hail. If soft metals are dented in a pattern consistent with the storm report, it proves hail contact at the property — even if membrane bruises are subtle.' },
      { text: 'Pre-existing damage should be mixed in with storm damage photos.', type: 'true_false', correctAnswer: 'false', explanation: 'Pre-existing damage must be documented SEPARATELY and clearly labeled. Commingling pre-existing with storm damage gives the carrier grounds to deny the entire claim.' },
      { text: 'Why must HVAC units be photographed from all four sides?', type: 'multiple_choice', options: ['For aesthetic purposes','To document the unit tag and show damage on every exposed face','Only two sides are needed','HVAC is not part of a roof claim'], correctAnswer: 1, explanation: 'Each side of an HVAC unit can have different damage. The tag/nameplate provides model, serial, and tonnage for pricing. Condenser fin damage, cabinet dents, and disconnect damage are all separate line items.' },
      { text: 'What determines whether damaged condenser fins are repaired or replaced?', type: 'multiple_choice', options: ['The age of the unit','The percentage of fin area damaged','The brand of the unit','Whether the unit is still running'], correctAnswer: 1, explanation: 'Carriers use the percentage of total fin area that is damaged (typically >15-25%) to determine whether fin combing (repair) or unit replacement is warranted.' },
    ]},

    // ── Lesson 11: Inspection Challenge ──
    { slug: 'hail-inspection-challenge', title: 'Hail Inspection Challenge', objective: 'Inspect the 3D model and identify all items that would need documentation in a hail claim scope.', type: 'inspect', durationMinutes: 12, inspectIssues: [
      { meshKey: 'gutter_f', title: 'Front gutter — hail dents', description: 'K-style gutter with round dents on the top (horizontal) surface. Photograph with ruler. Document linear footage and material type. Top and front face are separate line items.', severity: 'moderate' },
      { meshKey: 'downspout_fr', title: 'Downspout — front right corner', description: 'Downspout showing hail dents on the exposed face. Each downspout is a separate line item by size. Photograph with ruler.', severity: 'moderate' },
      { meshKey: 'rtu_cabinet', title: 'Rooftop RTU — cabinet and fins', description: 'Rooftop HVAC unit with dented cabinet panels and crushed condenser fins. Document all 4 sides, nameplate, and fin damage percentage. Each is a separate line item.', severity: 'severe' },
      { meshKey: 'turbine_vent', title: 'Turbine vent — soft metal dents', description: 'Aluminum turbine vent with round hail dents. Key soft metal indicator proving hail contact at the property. Photo with ruler.', severity: 'moderate' },
      { meshKey: 'pipe_boot', title: 'Pipe boot — lead/aluminum flashing', description: 'Soft metal pipe boot with hail dents. Also check the neoprene collar for cracking — a common secondary failure.', severity: 'moderate' },
      { meshKey: 'cap_flash_bump_b', title: 'Cap flashing — parapet dents', description: 'Metal cap flashing on bump-out parapet wall showing hail impact marks. Document dents and any broken sealant at laps.', severity: 'severe' },
      { meshKey: 'valley_f_channel', title: 'Valley metal — impact marks', description: 'Valley flashing with round dents from hail. Valley damage creates leak paths at the highest-risk area. Document carefully with ruler.', severity: 'severe' },
      { meshKey: 'sign_backing', title: 'Building signage — document for file', description: 'Photograph the building sign to establish the subject property. Also check the sign face for hail dents — illuminated signs with plastic lenses crack from hail impact.', severity: 'minor' },
    ]},
  ],
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORT — construction sequence + adjuster basics
// ════════════════════════════════════════════════════════════════════════════════

export const CURRICULUM: CurriculumModule[] = [
  M01, M02, M03, M04, M05, M06, M07, M08, M09, M10, M11, M12, M13, M14,
  M15,  // Adjuster Basics — separate track
]

export function getModule(slug: string): CurriculumModule | undefined {
  return CURRICULUM.find(m => m.slug === slug)
}

export function getLesson(moduleSlug: string, lessonSlug: string): { module: CurriculumModule; lesson: CurriculumLesson } | undefined {
  const mod = getModule(moduleSlug)
  if (!mod) return undefined
  const lesson = mod.lessons.find(l => l.slug === lessonSlug)
  if (!lesson) return undefined
  return { module: mod, lesson }
}
