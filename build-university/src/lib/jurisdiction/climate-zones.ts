// IECC / ASHRAE 169-2013 Climate Zone determination
// Source: DOE Building America Climate Zone Map + ASHRAE 169-2013 Appendix B
// Each state defines a default zone + lat/lng logic for states with multiple zones

import { JurisdictionClimate } from './types'

// Zone → code requirements lookup
const ZONE_REQUIREMENTS: Record<string, { iceBarrier: boolean; vaporClass: string; description: string }> = {
  '1A': { iceBarrier: false, vaporClass: 'III',  description: 'Very Hot–Humid (Miami, Honolulu)' },
  '2A': { iceBarrier: false, vaporClass: 'III',  description: 'Hot–Humid (Houston, Orlando, New Orleans)' },
  '2B': { iceBarrier: false, vaporClass: 'III',  description: 'Hot–Dry (Phoenix, El Paso, Las Vegas)' },
  '3A': { iceBarrier: false, vaporClass: 'III',  description: 'Warm–Humid (Atlanta, Dallas, Charlotte)' },
  '3B': { iceBarrier: false, vaporClass: 'III',  description: 'Warm–Dry (Los Angeles, Albuquerque, Sacramento)' },
  '3C': { iceBarrier: false, vaporClass: 'III',  description: 'Warm–Marine (San Francisco, coastal CA)' },
  '4A': { iceBarrier: false, vaporClass: 'II',   description: 'Mixed–Humid (Baltimore, Louisville, Kansas City)' },
  '4B': { iceBarrier: false, vaporClass: 'II',   description: 'Mixed–Dry (Albuquerque upland, west TX)' },
  '4C': { iceBarrier: false, vaporClass: 'II',   description: 'Mixed–Marine (Seattle, Portland)' },
  '5A': { iceBarrier: true,  vaporClass: 'II',   description: 'Cool–Humid (Chicago, Cleveland, Minneapolis)' },
  '5B': { iceBarrier: true,  vaporClass: 'II',   description: 'Cool–Dry (Denver, Salt Lake City, Boise)' },
  '6A': { iceBarrier: true,  vaporClass: 'I',    description: 'Cold–Humid (Burlington, Duluth, Helena)' },
  '6B': { iceBarrier: true,  vaporClass: 'I',    description: 'Cold–Dry (Missoula, Reno area highlands)' },
  '7':  { iceBarrier: true,  vaporClass: 'I',    description: 'Very Cold (International Falls, Fairbanks area)' },
  '8':  { iceBarrier: true,  vaporClass: 'I',    description: 'Subarctic (extreme northern AK)' },
}

/**
 * Determine IECC climate zone from state abbreviation + lat/lng.
 * Uses DOE county-level data condensed into lat/lng logic for multi-zone states.
 * Single-zone states use a direct lookup.
 */
export function getClimateZone(stateAbbr: string, lat: number, lng: number): JurisdictionClimate {
  const zone = resolveZone(stateAbbr, lat, lng)
  const isMarine = zone.endsWith('C')
  const reqs = ZONE_REQUIREMENTS[zone] ?? ZONE_REQUIREMENTS['4A']
  return {
    ieccZone: zone,
    isMarine,
    iceBarrierRequired: reqs.iceBarrier,
    vaporRetarderClass: reqs.vaporClass,
    source: 'ASHRAE 169-2013 / DOE Building America Climate Zone Map',
  }
}

export function getClimateZoneDescription(zone: string): string {
  return ZONE_REQUIREMENTS[zone]?.description ?? zone
}

// ---------------------------------------------------------------------------
// Internal zone resolution — state-by-state logic
// ---------------------------------------------------------------------------

function resolveZone(state: string, lat: number, lng: number): string {
  switch (state) {
    // ── Single-zone states (simple lookup) ──────────────────────────────────
    case 'CT': return '5A'
    case 'DE': return '4A'
    case 'DC': return '4A'
    case 'HI': return '1A'
    case 'KY': return '4A'
    case 'MD': return lat > 39.4 && lng < -78.5 ? '5A' : '4A'      // Garrett/Allegany highlands
    case 'MS': return lat < 30.7 ? '2A' : '3A'
    case 'NJ': return lat > 41.0 || (lng < -74.8) ? '5A' : '4A'
    case 'OH': return '5A'
    case 'RI': return '5A'
    case 'VT': return '6A'

    // ── Florida — most critical for roofing ─────────────────────────────────
    // DOE/ASHRAE zones: 1A (South FL), 2A (Central FL), 3A (North FL/Panhandle)
    case 'FL':
      if (lat < 26.5) return '1A'     // Miami-Dade, Monroe, Broward
      if (lat < 29.7) return '2A'     // Palm Beach → Tampa → Orlando → Daytona
      return '3A'                     // Jacksonville, Gainesville, Panhandle

    // ── California — highly variable ────────────────────────────────────────
    // Coastal 3B/3C, Bay Area 3C, Central Valley 3B, Mountains 5B-6B
    case 'CA':
      if (lat > 40.5 && lng < -122.5) return '5B'   // Northern Sierras / Trinity
      if (lat > 39.0 && lng > -119.5) return '6B'   // Lake Tahoe / Sierras
      if (lat > 37.8 && lng < -122.0) return '4C'   // North Bay / Sonoma / Marin
      if (lat > 36.5 && lng < -121.5) return '3C'   // Central coast: Monterey → SF
      if (lat > 34.5 && lat < 38.0 && lng < -120.5) return '3C'  // Bay Area
      if (lat > 34.5 && lng > -117.5) return '5B'   // Big Bear / San Bernardino Mtns
      if (lng > -119.5 && lat < 37.5) return '3B'   // Central Valley, Inland Empire, desert
      return '3B'                                    // SoCal coast, LA, San Diego

    // ── Texas — no statewide code; zones vary dramatically ──────────────────
    case 'TX':
      if (lat < 27.5) return lng < -99.5 ? '2B' : '2A'   // Rio Grande Valley
      if (lat < 30.5 && lng < -100) return '3B'           // West TX: Midland, Odessa, El Paso
      if (lat < 30.5) return '3A'                         // Houston, Austin, San Antonio
      if (lat > 34.5) return lng < -100 ? '4B' : '4A'    // Panhandle
      return lat > 32 && lng < -98 ? '3B' : '3A'         // DFW west vs east

    // ── New York ─────────────────────────────────────────────────────────────
    case 'NY':
      if (lat < 41.3 && lng > -74.5) return '4A'     // NYC metro, Long Island
      if (lat > 43.5 || lng < -75.5) return '6A'     // Adirondacks, far north/west
      return '5A'                                     // Rest of upstate

    // ── Pennsylvania ─────────────────────────────────────────────────────────
    case 'PA':
      if (lat < 40.3 && lng > -75.8) return '4A'     // Philadelphia metro
      if (lat > 41.5 && lng < -77.5) return '6A'     // McKean, Potter, Cameron counties
      return '5A'

    // ── Virginia ─────────────────────────────────────────────────────────────
    case 'VA':
      if (lat < 37.2 && lng > -77.0) return '3A'     // Hampton Roads / Tidewater
      if (lat > 37.5 && lng < -80.0) return '5A'     // Blue Ridge highlands
      return '4A'

    // ── North Carolina ───────────────────────────────────────────────────────
    case 'NC':
      if (lat > 35.5 && lng < -81.5) return '5A'     // High country: Boone, Asheville area peaks
      if (lat > 35.0 && lng < -79.5) return '4A'     // Piedmont foothills / western
      return '3A'                                     // Coastal plain, Charlotte, Raleigh

    // ── Georgia ──────────────────────────────────────────────────────────────
    case 'GA':
      if (lat > 34.8 && lng < -83.5) return '4A'     // Blue Ridge GA (Dahlonega, Blue Ridge)
      if (lat < 31.2) return '2A'                     // Coastal GA: Brunswick, Savannah area
      return '3A'

    // ── Alabama ──────────────────────────────────────────────────────────────
    case 'AL':
      if (lat > 34.5) return '4A'                     // North AL: Huntsville, Decatur
      return '3A'

    // ── South Carolina ───────────────────────────────────────────────────────
    case 'SC':
      if (lat > 34.5 && lng < -82.0) return '4A'     // Upstate: Greenville, Spartanburg
      return '3A'

    // ── Tennessee ────────────────────────────────────────────────────────────
    case 'TN':
      if (lat < 35.5 && lng > -87.0) return '3A'     // Memphis area
      if (lng < -82.0 && lat > 36.0) return '5A'     // High knobs of Appalachian TN
      return '4A'

    // ── Arkansas ─────────────────────────────────────────────────────────────
    case 'AR':
      if (lat > 36.0 && lng < -93.5) return '4A'     // Ozark highlands (extreme north)
      return '3A'

    // ── Louisiana ────────────────────────────────────────────────────────────
    case 'LA':
      if (lat > 32.0) return '3A'                     // North LA: Shreveport, Monroe
      return '2A'                                     // South LA: New Orleans, Baton Rouge

    // ── Missouri ─────────────────────────────────────────────────────────────
    case 'MO':
      if (lat > 39.5) return '5A'                     // Far north MO
      return '4A'

    // ── Illinois ─────────────────────────────────────────────────────────────
    case 'IL':
      if (lat > 41.5) return '5A'                     // Chicago metro and north
      return '4A'

    // ── Indiana ──────────────────────────────────────────────────────────────
    case 'IN':
      if (lat < 38.5) return '4A'                     // Southern IN: Evansville area
      return '5A'

    // ── Michigan ─────────────────────────────────────────────────────────────
    case 'MI':
      if (lat > 46.5) return '6A'                     // Upper Peninsula
      if (lat > 45.5 && lng < -84.5) return '6A'     // Far north lower peninsula
      return '5A'

    // ── Wisconsin ────────────────────────────────────────────────────────────
    case 'WI':
      if (lat > 45.5) return '7'                      // North WI: Ashland, Rhinelander
      if (lat > 44.5) return '6A'                     // Central WI
      return lat < 43.0 ? '5A' : '6A'                // South WI (Kenosha/Racine) vs. rest

    // ── Minnesota ────────────────────────────────────────────────────────────
    case 'MN':
      if (lat > 47.0) return '7'                      // International Falls / Iron Range
      return '6A'                                     // Twin Cities, Duluth

    // ── Iowa ─────────────────────────────────────────────────────────────────
    case 'IA':
      if (lat > 43.3) return '6A'                     // Far north IA: Mason City
      return '5A'

    // ── North Dakota ─────────────────────────────────────────────────────────
    case 'ND':
      if (lat < 46.5) return '6A'                     // Southeast ND: Fargo
      return '7'

    // ── South Dakota ─────────────────────────────────────────────────────────
    case 'SD':
      if (lng < -102.5 && lat > 43.5) return '7'     // Black Hills region
      if (lng < -103 && lat < 43.5) return '6B'      // Southwest SD: Rapid City
      return '6A'

    // ── Nebraska ─────────────────────────────────────────────────────────────
    case 'NE':
      if (lng < -102 && lat > 41.5) return '6B'      // Panhandle north
      if (lng < -99) return '5B'                      // West NE: North Platte, Scottsbluff
      return '5A'                                     // Omaha, Lincoln

    // ── Kansas ───────────────────────────────────────────────────────────────
    case 'KS':
      if (lng < -100) return '4B'                     // Western KS: Dodge City, Garden City
      return '4A'

    // ── Oklahoma ─────────────────────────────────────────────────────────────
    case 'OK':
      if (lat > 36.5 && lng > -97) return '4A'       // NE OK: Tulsa
      if (lng < -99.5) return '4B'                    // Panhandle area
      return '3A'                                     // OKC, Lawton, Tulsa

    // ── Colorado ─────────────────────────────────────────────────────────────
    case 'CO':
      if (lng < -106 && lat > 39) return '7'          // San Juan / Rockies high country
      if (lat > 40 && lng < -104.5) return '6B'       // North Front Range / Rocky Mtns
      if (lng < -104.5) return '5B'                   // Denver Metro, Colorado Springs
      if (lat < 38 && lng > -104) return '4B'         // SE CO: Pueblo, Trinidad
      return '5B'                                     // Default CO

    // ── Wyoming ──────────────────────────────────────────────────────────────
    case 'WY':
      if (lat > 44 || (lng < -108 && lat > 43)) return '7'  // Jackson Hole, Yellowstone area
      return '6B'

    // ── Montana ──────────────────────────────────────────────────────────────
    case 'MT':
      if (lat > 48.5 && lng > -105) return '7'        // Northeast MT: Great Plains
      return '6B'

    // ── Idaho ─────────────────────────────────────────────────────────────────
    case 'ID':
      if (lat > 44.5 && lng < -114.5) return '6B'    // Sawtooth / Salmon ranges
      if (lat > 46.5) return '6B'                     // North ID: Coeur d'Alene area
      return '5B'                                     // SW ID: Boise, Twin Falls

    // ── Nevada ───────────────────────────────────────────────────────────────
    case 'NV':
      if (lat < 37 && lng > -117) return '3B'        // Las Vegas / Clark County
      if (lat > 40 || lng < -116.5) return '6B'      // NE Nevada: Elko
      return '5B'                                     // Reno, Carson City

    // ── Utah ─────────────────────────────────────────────────────────────────
    case 'UT':
      if (lat < 38 && lng > -113.5) return '3B'      // St. George / Washington County
      if (lat > 40.5 && lng < -110.5) return '7'     // Uinta mountains
      if (lng < -110 && lat > 40.5) return '6B'      // East UT highlands
      return '5B'                                     // SLC, Provo, Ogden

    // ── Arizona ──────────────────────────────────────────────────────────────
    case 'AZ':
      if (lat > 35.5 || (lat > 34.5 && lng < -111.5)) return '4B'  // Flagstaff, Navajo Nation
      if (lat > 34 && lng < -110) return '3B'        // North AZ middle elevation
      return '2B'                                     // Phoenix, Tucson, Yuma

    // ── New Mexico ────────────────────────────────────────────────────────────
    case 'NM':
      if (lat > 36 || (lat > 34.5 && lng < -106.5)) return '5B'   // Santa Fe, Taos, ABQ highlands
      if (lat > 33 && lng < -107) return '4B'        // Central NM: Albuquerque
      return '3B'                                     // South NM: Las Cruces, Roswell

    // ── Oregon ───────────────────────────────────────────────────────────────
    case 'OR':
      if (lng > -118.5 && lat < 44.5) return '3B'    // East OR: Malheur, Ontario (dry / hot)
      if (lng > -119.5) return '5B'                   // Eastern plateau: Bend highland, Klamath
      if (lat > 44.5 && lng > -120.5) return '6B'    // Blue Mountains / Wallowa
      return '4C'                                     // Portland, Salem, Willamette Valley

    // ── Washington ───────────────────────────────────────────────────────────
    case 'WA':
      if (lng > -118.5 && lat < 47.5) return '5B'    // Eastern WA: Spokane, Yakima, Kennewick
      if (lng > -118.5) return '6B'                   // NE WA: Colville
      return '4C'                                     // Seattle, Tacoma, Olympia, Bellingham

    // ── Maine ────────────────────────────────────────────────────────────────
    case 'ME':
      if (lat > 46.5) return '7'                      // Aroostook County
      return '6A'

    // ── New Hampshire ─────────────────────────────────────────────────────────
    case 'NH':
      if (lat > 44.5 || (lng < -71.8 && lat > 43.8)) return '6A'  // White Mountains / North Country
      return '5A'

    // ── Massachusetts ─────────────────────────────────────────────────────────
    case 'MA':
      if (lng < -72.5 && lat > 42.2) return '6A'     // Berkshires: Pittsfield
      return '5A'

    // ── Alaska ────────────────────────────────────────────────────────────────
    case 'AK':
      if (lat < 59.5 && lng < -134) return '6A'      // Southeast AK: Juneau, Ketchikan
      if (lat > 65) return '8'                        // Arctic: Prudhoe Bay, Nome
      if (lat > 63.5) return '7'                      // Fairbanks area
      return '7'                                      // Anchorage is technically 7

    // ── Simple state defaults ─────────────────────────────────────────────────
    case 'WV': return lat > 38.5 && lng < -80 ? '5A' : '4A'
    case 'KS': return lng < -100 ? '4B' : '4A'
    case 'ID': return lat > 44 ? '6B' : '5B'
    default:   return '4A'   // safe fallback for unmapped
  }
}
