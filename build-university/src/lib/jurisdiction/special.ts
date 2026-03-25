// Special jurisdiction detection
// These are jurisdictions where roofing requirements differ MATERIALLY from baseline IRC
// Sources: Florida Building Code, NYC Building Code, CA Title 24, TDLR TDI-Windstorm

import { JurisdictionAmendment } from './types'

export interface SpecialJurisdictionResult {
  isHVHZ: boolean
  isWBI: boolean         // Wind-Borne Debris Region (FBC R301.2.1.2)
  specialFlags: string[]
  amendments: JurisdictionAmendment[]
}

/**
 * Detect special jurisdiction requirements based on location.
 * These override or supplement baseline code requirements significantly.
 */
export function getSpecialJurisdiction(
  stateAbbr: string,
  lat: number,
  lng: number,
  city: string
): SpecialJurisdictionResult {
  const flags: string[] = []
  const amendments: JurisdictionAmendment[] = []
  let isHVHZ = false
  let isWBI = false

  // ─── FLORIDA — Most complex special jurisdiction in the US ────────────────

  if (stateAbbr === 'FL') {
    // HVHZ: Miami-Dade + Broward Counties (lat < 26.5)
    // FBC Section 1524 — ALL roofing products require NOA (Notice of Acceptance)
    // TAS (Testing Application Standard) testing required for all products
    if (lat < 26.5) {
      isHVHZ = true
      isWBI = true
      flags.push('FL-HVHZ')
      amendments.push({
        jurisdictionName: lat < 26.0 ? 'Miami-Dade County' : 'Broward County',
        section: 'FBC R301.2.1.2 / FBC 1524',
        summary: 'HIGH-VELOCITY HURRICANE ZONE (HVHZ): All roofing products must have a current Miami-Dade County Notice of Acceptance (NOA) or Florida Product Approval. TAS testing required. Enhanced wind uplift attachment per ASTM D 7158, D 3161 Class H (150 mph minimum). No product may be installed without valid NOA on the job site.',
      })
      amendments.push({
        jurisdictionName: 'HVHZ',
        section: 'FBC 1524.1 — Product Approval',
        summary: 'Asphalt shingles must be Class H wind-rated (150 mph per ASTM D3161/D7158), with starter strip, 6 nails per shingle, and double-layer ice and water shield from eave to ridge (not just first 6 feet). Drip edge must be minimum 26-gauge galvanized, 2-piece system.',
      })
    }

    // Wind-borne Debris Region: within 1 mile of coast OR Vult > 130 mph (roughly lat < 29)
    if (lat < 29.5 && !isHVHZ) {
      isWBI = true
      flags.push('FL-WBI')
      amendments.push({
        jurisdictionName: 'Florida Wind-Borne Debris Region',
        section: 'FBC R301.2.1.2',
        summary: 'Wind-Borne Debris Region: Impact-resistant glazing or approved shutters required. Garage doors must meet FBC R301.2.1.2. Roofing fastening must meet high-wind requirements (6 nails per shingle minimum). Continuous load path required from roof to foundation.',
      })
    }

    // General FL amendments
    flags.push('FL-FBC')
    amendments.push({
      jurisdictionName: 'Florida Statewide',
      section: '2023 Florida Building Code — Residential',
      summary: 'FBC requires Class A fire-rated roofing statewide. Single-ply membranes require FM Global or UL approval. Standing seam metal systems require FMG 4471 or UL 580 Class 90 uplift rating. All roofing over 1,500 sq ft requires a licensed roofing contractor (DBPR license).',
    })
  }

  // ─── NEW YORK CITY ────────────────────────────────────────────────────────
  if (stateAbbr === 'NY' && lat < 41.0 && lng > -74.3) {
    flags.push('NYC-BuildingCode')
    amendments.push({
      jurisdictionName: 'New York City',
      section: 'NYC Building Code (BC) Chapter 15',
      summary: 'NYC uses the NYC Building Code, NOT the IRC/IBC. Chapter 15 governs roofing. Cool roof requirements apply: roofing must meet NYC Local Law 92 (2019) — vegetated or high-albedo roof required on new construction and full roof replacement. TPO/EPDM must be white or light-colored. NYC DEP stormwater management rules may apply.',
    })
    amendments.push({
      jurisdictionName: 'New York City',
      section: 'NYC BC 1511 — Existing Roofs',
      summary: 'NYC BC 1511 limits roof-over installations: maximum one existing roof layer before complete tear-off is required. Fire-department-approved roof access hatches required on all multi-family buildings. Licensed NYC registered architect or PE required for permits on buildings over 3 stories.',
    })
  }

  // ─── CALIFORNIA ──────────────────────────────────────────────────────────
  if (stateAbbr === 'CA') {
    flags.push('CA-Title24')
    amendments.push({
      jurisdictionName: 'California Statewide',
      section: '2022 CRC — Title 24 Part 6 Energy Code',
      summary: 'California Title 24 Energy Code: Steep-slope roofing must meet solar reflectance index (SRI) requirements — minimum SRI 16 for low-slope, SRI 78 for steep-slope above conditioned space in Climate Zones 2-15. Cool roof credits apply. Class A fire rating required statewide per CBC Section 1505.',
    })

    // WUI / Fire Hazard Severity Zone
    // Rough detection: most of non-coastal CA mountain interface
    if (lng > -118 || (lat > 34.5 && lng < -117 && lng > -119)) {
      flags.push('CA-WUI')
      amendments.push({
        jurisdictionName: 'California WUI Zone',
        section: 'CRC Section R327 / CBC Chapter 7A',
        summary: 'Wildland-Urban Interface (WUI) Zone: Ignition-resistant construction required. Class A fire-rated roofing assembly required (not just Class A shingle — the full assembly must be listed). Ember-resistant vents required (California State Fire Marshal listed). Gutters must be non-combustible or screened with 1/8" non-combustible mesh.',
      })
    }
  }

  // ─── TEXAS — Coastal TDI-Windstorm ───────────────────────────────────────
  if (stateAbbr === 'TX') {
    // TDI Windstorm Inspection area: counties along Gulf Coast
    // Roughly: lat < 29.5 AND close to coast (lng > -97.5)
    if (lat < 29.5 && lng > -97.5) {
      flags.push('TX-TDI-Windstorm')
      amendments.push({
        jurisdictionName: 'Texas Coastal — TDI Windstorm Area',
        section: 'Texas Ins. Code Chapter 2210 / TBCL Windstorm Rules',
        summary: 'TDI Windstorm Inspection Area: Roofing must be inspected and certified by a TDI-authorized Inspector (WPI-2 inspection). Installation must meet ASCE 7-22 wind design for the specific county wind speed (130-155 mph Vult in coastal TX). TDI Form WPI-8 certification required for insurance coverage. Galveston, Aransas, Corpus Christi: minimum Class H shingles (150 mph ASTM D3161) with 6-nail pattern.',
      })
    }
    // No statewide code flag
    flags.push('TX-NoStateCode')
    amendments.push({
      jurisdictionName: 'Texas',
      section: 'Texas — No Statewide Residential Building Code',
      summary: 'Texas does NOT have a statewide residential building code for unincorporated areas. City and county adoption is voluntary and inconsistent. Major cities: Austin (2021 IRC), Houston (HBC — unique code), Dallas (2021 IBC), San Antonio (2015 IBC). Always verify with local AHJ before permit submission.',
    })
  }

  // ─── LOUISIANA — Post-Katrina coastal ─────────────────────────────────────
  if (stateAbbr === 'LA' && lat < 30.5) {
    flags.push('LA-Coastal')
    amendments.push({
      jurisdictionName: 'Louisiana Coastal Parishes',
      section: 'LRC 2021 / ICC-ES AC238',
      summary: 'Post-Katrina coastal requirements: Roofing must meet wind design for exposure category C/D. All roofing products must have valid ICC-ES report confirming performance at design wind speed. Structural sheathing attachment per ASCE 7 wind zone minimum 8d ring-shank nails at 6" o.c. Continuous load path from roof to slab-on-grade required in Flood Zone AE/VE.',
    })
  }

  // ─── HAWAII ───────────────────────────────────────────────────────────────
  if (stateAbbr === 'HI') {
    flags.push('HI-LocalCode')
    amendments.push({
      jurisdictionName: 'Hawaii',
      section: 'Hawaii County Building Codes (each county)',
      summary: 'Each Hawaiian county adopts building codes independently. Honolulu on 2018 IBC amendments. Vog (volcanic gas) corrosion affects metal components on Big Island — stainless steel or coated fasteners required. Hurricane design wind speeds: 130-165 mph Vult across islands. Seismic Zone D2 applies.',
    })
  }

  // ─── WISCONSIN — UDC, not IRC ─────────────────────────────────────────────
  if (stateAbbr === 'WI') {
    flags.push('WI-UDC')
    amendments.push({
      jurisdictionName: 'Wisconsin',
      section: 'Wisconsin Uniform Dwelling Code (UDC) COMM 20-25',
      summary: 'Wisconsin uses the UDC, NOT the IRC. Key differences: Minimum roof slope 3:12 for asphalt shingles (IRC allows 2:12 with modified underlayment). R-38 minimum attic insulation in southern WI, R-49 in northern WI. Triple-layer underlayment in Climate Zones 6-7 areas. Wisconsin DSPS administers all code enforcement.',
    })
  }

  // ─── CHICAGO (IL has no statewide code) ──────────────────────────────────
  if (stateAbbr === 'IL' && lat > 41.5 && lat < 42.2 && lng > -88.5) {
    flags.push('IL-ChicagoBuildingCode')
    amendments.push({
      jurisdictionName: 'City of Chicago',
      section: 'Chicago Building Code (CBC) — Title 14B',
      summary: 'Chicago uses the CBC, a unique locally-written code, NOT the IBC or IRC. Title 14B governs roofing. Cool roof requirements apply: low-slope roofs on buildings over 50,000 sq ft require minimum SRI 29. Contractor licensing: City of Chicago Roofing Contractor License required (separate from state license). Permit required for all roofing over 1,500 sq ft.',
    })
  }

  // ─── HURRICANE-PRONE REGIONS (general southeast coast) ───────────────────
  if (['NC', 'SC', 'GA', 'MS', 'AL'].includes(stateAbbr) && lng > -82) {
    if (lat < 33.5) {
      isWBI = true
      flags.push('Southeast-CoastalWind')
      amendments.push({
        jurisdictionName: `${stateAbbr} Coastal Region`,
        section: 'IRC R301.2.1 / ASCE 7-22',
        summary: `Coastal wind-borne debris region: Design wind speed exceeds 130 mph Vult within 1 mile of coast. 6-nail pattern for asphalt shingles required. Hip roof or equivalent required per IBHS FORTIFIED standard in many insurance programs. Gable-end bracing per WFCM 2015 required for new construction.`,
      })
    }
  }

  return { isHVHZ, isWBI, specialFlags: flags, amendments }
}
