// Build University — Jurisdiction Service
// Resolves a ZIP code to a complete JurisdictionSnapshot with real geospatial data.
//
// Pipeline:
//   1. api.zippopotam.us  → lat/lng + city + state (free, no API key)
//   2. ASCE 7-22 Hazard Tool API → wind/snow/seismic at lat/lng (free, no key)
//   3. Embedded climate zone logic (ASHRAE 169-2013 DOE data)
//   4. Embedded state adoption table (ICC 2025)
//   5. Special jurisdiction detection (HVHZ, WUI, NYC, TX, etc.)

import { JurisdictionSnapshot, JurisdictionHazards } from './types'
import { getClimateZone } from './climate-zones'
import {
  getStateAdoptions,
  STATE_WIND_INLAND,
  STATE_GROUND_SNOW,
  STATE_SEISMIC_SS,
} from './state-adoptions'
import { getSpecialJurisdiction } from './special'

// In-memory cache for the API route (avoids duplicate fetches per session)
const cache = new Map<string, JurisdictionSnapshot>()

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getJurisdictionByZip(zip: string): Promise<JurisdictionSnapshot> {
  const normalised = zip.trim().replace(/\D/g, '').slice(0, 5)
  if (normalised.length !== 5) throw new Error(`Invalid ZIP code: ${zip}`)

  const cached = cache.get(normalised)
  if (cached && Date.now() - cached.cachedAt < 24 * 60 * 60 * 1000) return cached

  // Step 1: Geocode the ZIP code
  const geo = await geocodeZip(normalised)

  // Step 2: Get climate zone from embedded DOE data
  const climate = getClimateZone(geo.stateAbbr, geo.lat, geo.lng)

  // Step 3: Get ASCE 7-22 hazard data (try live API, fall back to embedded)
  const hazards = await getHazards(geo.lat, geo.lng, geo.stateAbbr)

  // Step 4: Get state code adoption
  const adoptions = getStateAdoptions(geo.stateAbbr)

  // Step 5: Detect special jurisdictions
  const special = getSpecialJurisdiction(geo.stateAbbr, geo.lat, geo.lng, geo.city)

  const snapshot: JurisdictionSnapshot = {
    zip: normalised,
    city: geo.city,
    county: geo.county,
    state: geo.state,
    stateAbbr: geo.stateAbbr,
    lat: geo.lat,
    lng: geo.lng,
    climate,
    hazards,
    adoptions,
    amendments: special.amendments,
    isHVHZ: special.isHVHZ,
    isWBI: special.isWBI,
    specialFlags: special.specialFlags,
    cachedAt: Date.now(),
  }

  cache.set(normalised, snapshot)
  return snapshot
}

// ─── Geocoding ───────────────────────────────────────────────────────────────

interface GeoResult {
  city: string
  county: string
  state: string
  stateAbbr: string
  lat: number
  lng: number
}

async function geocodeZip(zip: string): Promise<GeoResult> {
  const res = await fetch(`https://api.zippopotam.us/us/${zip}`, {
    next: { revalidate: 86400 }, // Next.js cache: 24 hours
  })

  if (!res.ok) throw new Error(`ZIP code ${zip} not found`)

  const data = await res.json() as {
    'post code': string
    country: string
    'country abbreviation': string
    places: Array<{
      'place name': string
      longitude: string
      state: string
      'state abbreviation': string
      latitude: string
    }>
  }

  if (!data.places?.length) throw new Error(`No location data for ZIP ${zip}`)

  const place = data.places[0]
  return {
    city: place['place name'],
    county: place['place name'],  // zippopotam returns city; county requires census lookup
    state: place['state'],
    stateAbbr: place['state abbreviation'],
    lat: parseFloat(place['latitude']),
    lng: parseFloat(place['longitude']),
  }
}

// ─── ASCE 7-22 Hazard Data ───────────────────────────────────────────────────

async function getHazards(lat: number, lng: number, stateAbbr: string): Promise<JurisdictionHazards> {
  // Try the ASCE 7 Hazard Tool API first (free, no key required)
  try {
    const url = `https://asce7hazardtool.online/api/?lat=${lat}&lon=${lng}&riskcat=ii`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000), // 4 second timeout
      next: { revalidate: 86400 },
    })

    if (res.ok) {
      const d = await res.json() as {
        'Wind Speeds'?: { Vult?: number; Vasd?: number }
        'Ground Snow Load'?: { Pg?: number }
        'Seismic Design'?: { Ss?: number; S1?: number }
      }

      const wind = d['Wind Speeds']
      const snow = d['Ground Snow Load']
      const seismic = d['Seismic Design']

      if (wind?.Vult && wind.Vult > 80) {
        return {
          windVult: wind.Vult,
          windVasd: wind.Vasd ?? Math.round(wind.Vult * 0.6),
          groundSnowPg: snow?.Pg ?? STATE_GROUND_SNOW[stateAbbr] ?? 20,
          seismicSs: seismic?.Ss ?? STATE_SEISMIC_SS[stateAbbr] ?? 0.2,
          floodZone: null, // FEMA FIRM lookup would be a separate API call
          source: 'ASCE 7-22 Hazard Tool (asce7hazardtool.online)',
        }
      }
    }
  } catch {
    // ASCE API unavailable — fall through to embedded data
  }

  // Embedded fallback: state-level conservative values from ASCE 7-22 maps
  // Coastal values are higher — use special jurisdiction detection for coastal specifics
  const windVult = STATE_WIND_INLAND[stateAbbr] ?? 115
  return {
    windVult,
    windVasd: Math.round(windVult * 0.6),
    groundSnowPg: STATE_GROUND_SNOW[stateAbbr] ?? 20,
    seismicSs: STATE_SEISMIC_SS[stateAbbr] ?? 0.2,
    floodZone: null,
    source: 'ASCE 7-22 maps — embedded state-level data (inland, conservative)',
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Key code requirements derived from jurisdiction snapshot for display in course viewer */
export function getJurisdictionRequirements(snap: JurisdictionSnapshot): {
  label: string
  value: string
  critical: boolean
}[] {
  const reqs: { label: string; value: string; critical: boolean }[] = []

  reqs.push({ label: 'Climate Zone', value: `${snap.climate.ieccZone}`, critical: false })
  reqs.push({ label: 'Design Wind Speed', value: `${snap.hazards.windVult} mph Vult`, critical: snap.hazards.windVult > 130 })
  reqs.push({ label: 'Ground Snow Load', value: `${snap.hazards.groundSnowPg} psf`, critical: snap.hazards.groundSnowPg > 40 })
  reqs.push({ label: 'Code Edition', value: snap.adoptions.irc === 'none' || snap.adoptions.irc === 'local' ? snap.adoptions.stateName : `IRC ${snap.adoptions.irc}`, critical: false })

  if (snap.climate.iceBarrierRequired) {
    reqs.push({ label: 'Ice Barrier', value: 'REQUIRED — 24" inside wall line per IRC R905.2.7.1', critical: true })
  } else {
    reqs.push({ label: 'Ice Barrier', value: 'Not required in your climate zone', critical: false })
  }

  if (snap.isHVHZ) {
    reqs.push({ label: 'HVHZ Status', value: 'HIGH-VELOCITY HURRICANE ZONE — NOA required for all products', critical: true })
  }

  if (snap.hazards.windVult >= 130) {
    reqs.push({ label: 'Fastening', value: '6 nails per shingle required (not 4) per high-wind zone', critical: true })
  }

  return reqs
}

// Re-export types for consumers
export type { JurisdictionSnapshot } from './types'
export { getClimateZoneDescription } from './climate-zones'
