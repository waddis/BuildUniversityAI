import type { GlossaryCard, GlossaryDrill } from '@/components/3d/DamageDetailViewer'

// ════════════════════════════════════════════════════════════════════════════════
// HAIL GLOSSARY — shared adjuster / Xactimate terminology for the residential
// hail damage training scenarios. Scenarios reference cards by id via
// pickGlossary(ids) rather than re-declaring definitions.
// ════════════════════════════════════════════════════════════════════════════════

export const HAIL_GLOSSARY: GlossaryCard[] = [
  {
    id: 'bruise',
    term: 'Bruise (mat fracture)',
    definition:
      'A soft spot on an asphalt shingle where a hailstone fractured the fiberglass mat. It feels soft like a fresh bruise on fruit and often has granule loss at the impact point. It is functional damage — the mat is the shingle’s structural layer.',
    distractors: [
      'A raised bubble in the shingle caused by trapped moisture or solvent gassing off during manufacture.',
      'Surface scuffing left by foot traffic or a ladder dragged across the roof.',
      'A manufacturing flaw where granules were never adhered to part of the shingle.',
    ],
    note: 'A bruise is the single most important hail signature on a composition roof. Press around suspect spots — a true hail bruise gives slightly under finger pressure.',
  },
  {
    id: 'blister',
    term: 'Blister',
    definition:
      'A raised pock in the shingle surface from trapped moisture or asphalt off-gassing during manufacture or heat aging. The granules pop off but the mat below is intact and hard — it is not hail and not functional damage.',
    distractors: [
      'A fractured fiberglass mat under a soft, granule-stripped impact point.',
      'A wind-driven crease across the shingle tab.',
      'Hail spatter marks left on the shingle surface.',
    ],
    note: 'Blisters are random, often uniform in size, and have no soft give. The bruise-vs-blister call is the most contested part of a hail roof inspection.',
  },
  {
    id: 'soft-metals',
    term: 'Soft metals',
    definition:
      'Thin, easily dented metal components — gutters, downspouts, roof vents, valley metal, drip edge, flashing, gutter aprons, and AC condenser fins. They dent readily and are the most reliable physical record of hail size and direction.',
    distractors: [
      'Lead and copper flashings used only on historic or high-end homes.',
      'Metal roofing panels rated for impact resistance.',
      'The galvanized fasteners used to attach shingles and flashing.',
    ],
    note: 'Always inspect soft metals first. If the soft metals are clean, be skeptical of claimed shingle damage.',
  },
  {
    id: 'test-square',
    term: 'Test square',
    definition:
      'A marked-off 10′ × 10′ (100 sq ft) area of roof slope used to count hail hits and document damage density per slope. Standard practice is one test square per slope, marked with chalk or a square of tape.',
    distractors: [
      'A 1′ × 1′ sample shingle cut out and sent to a lab for analysis.',
      'The minimum roof area a carrier will pay to replace.',
      'A tool used to verify shingle alignment during installation.',
    ],
    note: 'Photograph the test square with the chalk marks visible, then close-ups of each hit inside it. Note hits-per-square on every slope.',
  },
  {
    id: 'granule-loss',
    term: 'Granule loss',
    definition:
      'Loss of the protective mineral granules from the asphalt surface. Hail granule loss is concentrated at round impact points; weathering granule loss is broad and uniform. Granules in the gutters are a supporting indicator, not proof on their own.',
    distractors: [
      'Cracking of the shingle along the seal-down line.',
      'Curling of the shingle corners due to age.',
      'Discoloration from algae or moss growth.',
    ],
    note: 'Granule loss alone is not functional damage — pair it with a fractured mat (a bruise) to support a roof claim.',
  },
  {
    id: 'igu',
    term: 'IGU (insulated glass unit)',
    definition:
      'A sealed double- or triple-pane window assembly with a gas-filled space between lites. A hail strike can break the hermetic seal, causing the unit to fog or show condensation between the panes — sometimes days or weeks after the loss.',
    note: 'A fogged IGU is a separate line item from the sash and frame. Document the date of loss, since seal failure can be delayed.',
  },
  {
    id: 'functional-vs-cosmetic',
    term: 'Functional vs. cosmetic damage',
    definition:
      'Functional damage shortens the useful life or impairs the component’s job (a fractured shingle mat, a punctured screen, a leaking IGU seal). Cosmetic damage only affects appearance (a dent in a gutter that still drains). Many policies exclude cosmetic-only damage by endorsement.',
    distractors: [
      'Functional damage is anything visible from the ground; cosmetic damage is only visible up close.',
      'Functional damage is covered; cosmetic damage is whatever the contractor wants to add.',
      'They mean the same thing — the terms are interchangeable on a scope.',
    ],
    note: 'Check the policy for a cosmetic damage exclusion before scoping dented-but-working metal components.',
  },
  {
    id: 'acv-rcv',
    term: 'ACV vs. RCV',
    definition:
      'RCV (Replacement Cost Value) is the cost to repair or replace with like kind and quality at today’s prices. ACV (Actual Cash Value) is RCV minus depreciation — what the carrier typically pays first, before recoverable depreciation is released.',
    distractors: [
      'ACV is the contractor’s price; RCV is the carrier’s price.',
      'ACV includes overhead and profit; RCV does not.',
      'RCV applies to the roof; ACV applies to everything else.',
    ],
    note: 'On an RCV policy the depreciation is recoverable once the work is completed and invoiced.',
  },
  {
    id: 'recoverable-depreciation',
    term: 'Recoverable depreciation',
    definition:
      'The depreciation amount withheld from the first (ACV) payment that the carrier releases once the repairs are actually completed and documented. Non-recoverable depreciation is never paid.',
    note: 'Track which depreciation is recoverable vs. non-recoverable — it changes the net claim value the policyholder receives.',
  },
  {
    id: 'detach-reset',
    term: 'Detach & reset (D&R)',
    definition:
      'A line item for temporarily removing an undamaged component so adjacent work can be done, then reinstalling the same component — e.g., detach & reset gutters to replace the drip edge and fascia behind them.',
    distractors: [
      'Removing a damaged component and installing a brand-new replacement.',
      'Resetting the Xactimate estimate to its default pricing.',
      'A code upgrade required when more than 25% of a slope is replaced.',
    ],
    note: 'D&R is cheaper than replacement and is the correct call when the component itself is fine but is in the way of covered work.',
  },
  {
    id: 'spatter',
    term: 'Spatter marks (oxidation marks)',
    definition:
      'Round clean spots where a hailstone knocked dirt, oxidation, or chalking off a surface without denting it — common on painted metal, AC fins, and oxidized aluminum. Spatter confirms a hail event and helps establish hail size and direction.',
    distractors: [
      'Paint overspray left from a previous repair.',
      'Rust blooms forming on galvanized flashing.',
      'Water staining from a roof leak running down a wall.',
    ],
    note: 'Spatter is corroborating evidence of the storm — it dates and sizes the event even where harder surfaces show little.',
  },
  {
    id: 'directional-damage',
    term: 'Directional damage',
    definition:
      'A consistent pattern showing hail came from one direction — dents concentrated on one or two elevations and roof slopes, soft-metal dents pushed the same way. It distinguishes a real storm pattern from random mechanical or pre-existing damage.',
    note: 'Map damage by elevation and slope. A storm leaves a directional, repeating pattern; foot traffic and blistering do not.',
  },
  {
    id: 'brittleness',
    term: 'Brittleness (brittle test)',
    definition:
      'Aged asphalt shingles lose flexibility and crack when lifted or walked. A brittleness assessment matters because brittle shingles can be damaged by the inspection itself and may not be repairable — supporting full replacement over spot repair.',
    distractors: [
      'A lab test that measures the tensile strength of the fiberglass mat.',
      'The manufacturer’s impact-resistance rating stamped on the shingle.',
      'A test for whether sealant strips have bonded properly.',
    ],
    note: 'Document brittleness — it supports repairability arguments and explains why test lifts must be done carefully.',
  },
  {
    id: 'matching',
    term: 'Matching / line of sight',
    definition:
      'Many states and policies require repairs to reasonably match the surrounding undamaged material. When a damaged section cannot be matched within a continuous line of sight, the scope may extend to the full elevation or slope.',
    distractors: [
      'A requirement that the contractor match the carrier’s estimate line for line.',
      'Aligning shingle courses straight during installation.',
      'Confirming the new material matches the original manufacturer’s warranty.',
    ],
    note: 'Check the policy language and the state matching statute before limiting a scope to a partial slope or wall.',
  },
  {
    id: 'line-item',
    term: 'Xactimate line item',
    definition:
      'A single priced unit of work in an estimate — material plus labor — identified by a category/selector code (e.g., RFG 300 for a 3-tab shingle square). The scope sheet is built by selecting the correct line items at the correct quantities.',
    note: 'Each distinct component and each distinct task is its own line item. Combining unrelated work into one line hides scope and undervalues the claim.',
  },
  {
    id: 'op',
    term: 'Overhead & profit (O&P)',
    definition:
      'A markup (commonly 10% + 10%) added to a repair estimate to cover a general contractor’s overhead and profit when the job is complex enough to require GC coordination of multiple trades.',
    distractors: [
      'A penalty the carrier adds for late-filed claims.',
      'The deductible the policyholder owes before coverage applies.',
      'The depreciation withheld until repairs are complete.',
    ],
    note: 'O&P is generally warranted when three or more trades are involved or the job genuinely needs GC oversight.',
  },
  {
    id: 'supplement',
    term: 'Supplement',
    definition:
      'A request to add to an approved estimate for scope, quantities, or costs missed in the original — discovered once work is underway or on re-inspection. It must be supported with photos and documentation.',
    note: 'A clean original scope reduces supplements. When one is needed, document the omitted item exactly as you would an original line.',
  },
  {
    id: 'dol',
    term: 'Date of loss (DOL)',
    definition:
      'The date the damaging event occurred. It anchors the claim — it must be supported by storm data for the property’s location and it governs policy periods, deadlines, and whether delayed damage (like a fogged IGU) ties back to the event.',
    note: 'Verify the DOL against hail-verification storm data for the exact address before scoping.',
  },
  {
    id: 'scope-sheet',
    term: 'Scope / scope sheet',
    definition:
      'The itemized list of every component, task, and quantity needed to return the property to pre-loss condition. It is the foundation of the estimate — one missed component is one missed line item and one underpaid claim.',
    note: 'Build the scope from the inspection, not from a template. Inspect every elevation and slope before writing it.',
  },
  {
    id: 'collateral-damage',
    term: 'Collateral damage',
    definition:
      'Hail damage to non-roof components — screens, window wraps, fascia, soffit, gutters, garage doors, AC fins, light fixtures, fencing, and painted surfaces. It is frequently under-scoped because inspections stop at the roof.',
    note: 'Walk every elevation and the yard. Collateral damage is often where the most line items are left off the scope.',
  },
]

const BY_ID = new Map(HAIL_GLOSSARY.map(c => [c.id, c]))

/** Build a GlossaryDrill from a set of glossary card ids. */
export function pickGlossary(
  ids: string[],
  prompt = 'Lock in the adjuster terminology behind this inspection.',
): GlossaryDrill {
  const cards = ids.map(id => BY_ID.get(id)).filter((c): c is GlossaryCard => !!c)
  return { prompt, cards }
}
