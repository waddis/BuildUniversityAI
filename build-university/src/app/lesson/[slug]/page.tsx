'use client'

import { use } from 'react'
import LessonPlayer from '@/components/lesson/LessonPlayer'
import type { Lesson, LessonStep, CodeReference } from '@/types'

// ── Demo data — drives real model visibility/camera state ──
const DEMO_LESSON: Lesson = {
  id: 'demo-1', module_id: 'demo-mod', slug: 'valley-metal-installation',
  title: 'Valley Metal Installation on Intersecting Gable Roof',
  objective: 'Learn correct sequencing and placement of valley underlayment and valley metal in a high-risk leak zone on a complex roof.',
  description: null, difficulty: 'intermediate', lesson_type: 'learn',
  house_model_id: null, duration_minutes: 15, order_index: 0,
  prerequisite_lesson_id: null, status: 'published', config: {},
  created_at: '', updated_at: '',
}

const DEMO_CODE_REFS: CodeReference[] = [
  {
    id: 'cr-1', code_family: 'IRC', code_section: 'R905.2.7.1',
    title: 'Ice Barrier in Valley Areas',
    short_summary: 'Ice barrier membrane required in valley areas. Must extend at least 24 inches from centerline on each side.',
    long_explanation: 'In areas where the average daily temperature in January is 25°F or less, or where there is a possibility of ice forming along the eaves, an ice barrier that consists of at least two layers of underlayment cemented together or of a self-adhering polymer modified bitumen sheet shall extend from the lowest edges of all roof surfaces to a point at least 24 inches inside the exterior wall line of the building. This also applies to valley areas where water concentration creates similar risk.',
    jurisdiction_scope: null, climate_scope: 'Cold (zones 5-8) + all valleys', tags: ['ice barrier', 'valley'],
    created_at: '', updated_at: '',
  },
  {
    id: 'cr-2', code_family: 'IRC', code_section: 'R905.2.8.2',
    title: 'Valley Flashing',
    short_summary: 'Valley flashing shall be a minimum 24-gauge corrosion-resistant metal, or mineral-surfaced roll roofing.',
    long_explanation: 'Valleys shall be lined with not less than one ply of 36-inch wide Type W mineral-surfaced roll roofing, complying with ASTM D6380 Class M, or with metal valley flashing of 24-gauge galvanized steel, 0.019-inch aluminum, or 16-ounce copper. Open valleys shall have a minimum exposed width of 4 inches at the ridge and increase 1/8 inch per foot toward the eave.',
    jurisdiction_scope: null, climate_scope: null, tags: ['valley', 'flashing', 'metal'],
    created_at: '', updated_at: '',
  },
  {
    id: 'cr-3', code_family: 'NRCA', code_section: 'RMS-7.3',
    title: 'Valley Metal Fastener Exclusion Zone',
    short_summary: 'No fasteners within the water channel of valley metal. Fasten at outer edges only, where shingles will cover nail heads.',
    long_explanation: null,
    jurisdiction_scope: null, climate_scope: null, tags: ['valley', 'fastening'],
    created_at: '', updated_at: '',
  },
]

const DEMO_STEPS: LessonStep[] = [
  {
    id: 's1', lesson_id: 'demo-1', step_number: 1,
    title: 'Overview: The Completed House',
    instruction: 'This complex house has two intersecting gable roofs — the main body (8:12 pitch) and a cross wing (10:12 pitch). Where these roof planes meet, they create valleys — the highest-risk areas for water entry on any roof.',
    narration: 'Every valley concentrates water from two separate roof planes into a single channel. This means double the volume of water flowing through one concentrated point. The valley on this house runs diagonally from the eave up to where the cross wing ridge meets the main roof slope. Understanding how water moves here is the foundation of valley flashing.',
    action_type: 'observe',
    target_assembly_ids: [], camera_preset: { position: [22, 14, 22], target: [2, -1, 0] },
    exploded_state: null, hidden_groups: [], highlighted_groups: [],
    code_reference_ids: [], validation_rule: null, config: {}, created_at: '',
  },
  {
    id: 's2', lesson_id: 'demo-1', step_number: 2,
    title: 'Isolate the Roof System',
    instruction: 'We have hidden everything except the roof structure. You can now see the main gable roof and the cross wing gable roof clearly. Notice how the cross wing is steeper (10:12 vs 8:12) — water travels faster on the steeper pitch, which means the valley must handle high-velocity runoff.',
    narration: null, action_type: 'observe',
    target_assembly_ids: [], camera_preset: { position: [18, 12, 18], target: [3, 1, 0] },
    exploded_state: null,
    hidden_groups: ['foundation', 'walls_1st', 'walls_2nd', 'floor_band', 'stone_wainscot', 'windows', 'doors', 'porch', 'gutters'],
    highlighted_groups: ['sheathing', 'gable_ends'],
    code_reference_ids: [], validation_rule: null, config: {}, created_at: '',
  },
  {
    id: 's3', lesson_id: 'demo-1', step_number: 3,
    title: 'Expose the Layers — Exploded View',
    instruction: 'Now the roof layers are separated. From bottom to top: sheathing (deck), underlayment, ice barrier (blue), valley metal, and roofing. Each layer has a specific install order that must be followed exactly.',
    narration: 'Pull the explode slider to see how these layers stack. The key insight: water sheds downhill, so every upper layer must lap OVER every lower layer. A single reverse-lap anywhere in this stack creates a funnel that drives water into the roof assembly instead of shedding it.',
    action_type: 'observe',
    target_assembly_ids: [], camera_preset: { position: [16, 16, 14], target: [5, 2, 0] },
    exploded_state: { offset: 1.5, axis: 'y' },
    hidden_groups: ['foundation', 'walls_1st', 'walls_2nd', 'floor_band', 'stone_wainscot', 'windows', 'doors', 'porch', 'gutters', 'chimney', 'turret', 'dormer', 'garage_roof', 'bump_roof'],
    highlighted_groups: ['sheathing', 'underlayment', 'ice_barrier', 'valley_metal', 'drip_edge'],
    code_reference_ids: [], validation_rule: null, config: {}, created_at: '',
  },
  {
    id: 's4', lesson_id: 'demo-1', step_number: 4,
    title: 'Ice Barrier Installation (IRC R905.2.7.1)',
    instruction: 'The ice barrier (shown in blue) must be installed FIRST in valley areas. It extends at least 24 inches from the valley centerline on each side. This self-adhering membrane creates a waterproof seal even if fasteners penetrate it.',
    narration: 'This is where most valley failures begin. The ice barrier provides the last line of defense — if water gets past the valley metal and underlayment, the ice barrier stops it from reaching the deck. In cold climates, this is code-required. In all climates, it is best practice for valleys.',
    action_type: 'observe',
    target_assembly_ids: [], camera_preset: { position: [14, 10, 12], target: [7, 1, 1] },
    exploded_state: { offset: 0.8, axis: 'y' },
    hidden_groups: ['foundation', 'walls_1st', 'walls_2nd', 'floor_band', 'stone_wainscot', 'windows', 'doors', 'porch', 'gutters', 'chimney', 'turret', 'dormer', 'garage_roof', 'bump_roof', 'ridge_cap', 'fascia_soffit', 'step_flashing'],
    highlighted_groups: ['ice_barrier'],
    code_reference_ids: ['cr-1'], validation_rule: null, config: {}, created_at: '',
  },
  {
    id: 's5', lesson_id: 'demo-1', step_number: 5,
    title: 'Valley Metal Placement (IRC R905.2.8.2)',
    instruction: 'Valley metal is installed OVER the ice barrier and underlayment. It extends the full length of the valley. The metal is W-shaped or flat, minimum 24-gauge galvanized steel. Critical rule: NO fasteners in the water channel — fasten at outer edges only.',
    narration: 'The cardinal rule of valley metal: no fasteners in the water flow path. Every nail hole in the channel is a potential leak point. Fasten at the outer edges only, where shingles will eventually cover the nail heads. Use a minimum 24-gauge galvanized or aluminum W-valley. Open valley exposure width should be minimum 4 inches at the ridge, widening 1/8 inch per foot toward the eave.',
    action_type: 'observe',
    target_assembly_ids: [], camera_preset: { position: [12, 8, 14], target: [8, 0, 0] },
    exploded_state: null,
    hidden_groups: ['foundation', 'walls_1st', 'walls_2nd', 'floor_band', 'stone_wainscot', 'windows', 'doors', 'porch', 'gutters', 'chimney', 'turret', 'dormer', 'garage_roof', 'bump_roof'],
    highlighted_groups: ['valley_metal'],
    code_reference_ids: ['cr-2', 'cr-3'], validation_rule: null, config: {}, created_at: '',
  },
  {
    id: 's6', lesson_id: 'demo-1', step_number: 6,
    title: 'Step Flashing at Roof-to-Wall',
    instruction: 'Where the cross wing roof meets the main body wall, step flashing is required. Each piece of step flashing interlocks with a shingle course, directing water away from the wall and onto the roof surface below.',
    narration: 'Step flashing is installed one piece at a time as shingles are laid. Each L-shaped piece extends at least 4 inches up the wall and 4 inches onto the roof. The key mistake builders make: installing a continuous piece of flashing instead of individual step pieces. Continuous flashing creates a dam that traps water behind the shingles.',
    action_type: 'observe',
    target_assembly_ids: [], camera_preset: { position: [10, 6, 8], target: [7, 0, -1] },
    exploded_state: null,
    hidden_groups: ['foundation', 'walls_1st', 'floor_band', 'stone_wainscot', 'windows', 'doors', 'porch', 'gutters', 'turret', 'dormer', 'garage_roof', 'bump_roof'],
    highlighted_groups: ['step_flashing'],
    code_reference_ids: [], validation_rule: null, config: {}, created_at: '',
  },
  {
    id: 's7', lesson_id: 'demo-1', step_number: 7,
    title: 'Full Assembly — Check Your Understanding',
    instruction: 'The complete roof is visible. Review the assembly from valley metal to step flashing. Can you identify: (1) Where the valley runs, (2) Where step flashing protects the wall intersection, (3) Where the dead valley on the rear bump-out creates risk?',
    narration: null, action_type: 'identify',
    target_assembly_ids: [], camera_preset: { position: [20, 12, 20], target: [0, 0, 0] },
    exploded_state: null, hidden_groups: [], highlighted_groups: [],
    code_reference_ids: ['cr-1', 'cr-2', 'cr-3'],
    validation_rule: { type: 'identify_issue', expected: ['valley_line', 'step_flash_zone', 'dead_valley'], feedback_correct: 'Correct — you identified all three critical areas.', feedback_incorrect: 'Look at: (1) where the two gable planes meet diagonally, (2) where the cross wing wall meets the main roof, (3) where the rear bump-out shed roof meets the main body back wall.' },
    config: {}, created_at: '',
  },
]

export default function LessonPlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  // TODO: Replace with Supabase queries
  const lesson = { ...DEMO_LESSON, slug }
  const steps = DEMO_STEPS
  const codeRefs = DEMO_CODE_REFS

  return <LessonPlayer lesson={lesson} steps={steps} codeReferences={codeRefs} />
}
