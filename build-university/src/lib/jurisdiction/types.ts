// Jurisdiction snapshot — mirrors the iOS JurisdictionSnapshot model exactly
// Data sources: ASHRAE 169-2013 (climate), ASCE 7-22 (hazards), ICC (adoptions)

export interface JurisdictionClimate {
  ieccZone: string          // '1A' | '2A' | '2B' | '3A' | '3B' | '3C' | '4A' | '4B' | '4C' | '5A' | '5B' | '6A' | '6B' | '7' | '8'
  isMarine: boolean          // C suffix zones (3C, 4C) per ASHRAE 169
  iceBarrierRequired: boolean // IRC R905.2.7.1 — required in Zones 5-8
  vaporRetarderClass: string  // Class I/II/III per IRC R702.7
  source: string
}

export interface JurisdictionHazards {
  windVult: number          // mph, ASCE 7-22 basic wind speed (Risk Cat II, Exp C)
  windVasd: number          // mph, allowable stress design equivalent
  groundSnowPg: number      // psf, ground snow load per ASCE 7-22 Fig 7.2-1
  seismicSs: number         // g, short-period spectral acceleration
  floodZone: string | null  // 'AE' | 'VE' | 'X' | 'AO' per FEMA FIRM
  source: string
}

export interface JurisdictionAdoptions {
  irc: string               // IRC edition: '2021' | '2018' | '2015' | 'state-amended'
  ibc: string               // IBC edition
  iecc: string              // IECC edition
  stateName: string         // human-readable state code name e.g. 'FBC 2023'
  adoptionNotes: string     // special notes about local adoption / amendments
  source: string
}

export interface JurisdictionAmendment {
  jurisdictionName: string
  section: string
  summary: string
  url?: string
}

export interface JurisdictionSnapshot {
  zip: string
  city: string
  county: string
  state: string             // full state name
  stateAbbr: string         // 2-letter abbreviation
  lat: number
  lng: number
  climate: JurisdictionClimate
  hazards: JurisdictionHazards
  adoptions: JurisdictionAdoptions
  amendments: JurisdictionAmendment[]
  isHVHZ: boolean           // Miami-Dade / Broward High-Velocity Hurricane Zone
  isWBI: boolean            // Wind-Borne Debris Region (FBC definition)
  specialFlags: string[]    // ['CA-Title24', 'TX-NoStateCode', 'WI-UDC', etc.]
  cachedAt: number          // timestamp
}
