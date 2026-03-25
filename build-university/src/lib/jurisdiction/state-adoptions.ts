// State building code adoption data — current as of 2025
// Sources: ICC State Adoption Tracker, individual state building departments
// IRC = International Residential Code (1-2 family dwellings)
// IBC = International Building Code (commercial/multi-family)
// IECC = International Energy Conservation Code

import { JurisdictionAdoptions } from './types'

// Wind speed baselines by state (mph, Vult ASCE 7-22 Risk Cat II inland)
// Source: ASCE 7-22 basic wind speed maps (inland/non-coastal values)
// Coastal and special exposure zones require site-specific ASCE 7 analysis
export const STATE_WIND_INLAND: Record<string, number> = {
  AL: 115, AK: 110, AZ: 110, AR: 115, CA: 110, CO: 115, CT: 115, DE: 120,
  DC: 115, FL: 130, GA: 115, HI: 130, ID: 115, IL: 115, IN: 115, IA: 115,
  KS: 115, KY: 115, LA: 130, ME: 120, MD: 120, MA: 120, MI: 115, MN: 115,
  MS: 130, MO: 115, MT: 115, NE: 115, NV: 115, NH: 120, NJ: 120, NM: 115,
  NY: 115, NC: 120, ND: 115, OH: 115, OK: 115, OR: 115, PA: 115, RI: 120,
  SC: 120, SD: 115, TN: 115, TX: 120, UT: 115, VT: 115, VA: 120, WA: 115,
  WV: 115, WI: 115, WY: 115,
}

// Ground snow load by state (psf, ASCE 7-22 Fig 7.2-1 — representative value for main populated areas)
// Mountain/elevated areas have significantly higher values — use ASCE 7 site-specific for sloped terrain
export const STATE_GROUND_SNOW: Record<string, number> = {
  AL: 5,  AK: 60, AZ: 10, AR: 10, CA: 10, CO: 30, CT: 25, DE: 20,
  DC: 25, FL: 0,  GA: 5,  HI: 0,  ID: 30, IL: 25, IN: 20, IA: 25,
  KS: 20, KY: 20, LA: 0,  ME: 50, MD: 25, MA: 35, MI: 30, MN: 40,
  MS: 5,  MO: 20, MT: 40, NE: 25, NV: 20, NH: 50, NJ: 25, NM: 20,
  NY: 35, NC: 15, ND: 40, OH: 25, OK: 15, OR: 25, PA: 30, RI: 30,
  SC: 10, SD: 40, TN: 15, TX: 5,  UT: 25, VT: 60, VA: 20, WA: 25,
  WV: 30, WI: 35, WY: 50,
}

// Seismic Ss value (g) — short-period design spectral acceleration
// Source: ASCE 7-22 hazard maps — representative inland value (coastal/mountain may differ)
export const STATE_SEISMIC_SS: Record<string, number> = {
  AL: 0.2, AK: 2.5, AZ: 0.3, AR: 0.6, CA: 1.8, CO: 0.3, CT: 0.2, DE: 0.2,
  DC: 0.2, FL: 0.1, GA: 0.2, HI: 1.5, ID: 0.5, IL: 0.3, IN: 0.3, IA: 0.2,
  KS: 0.2, KY: 0.5, LA: 0.2, ME: 0.2, MD: 0.2, MA: 0.2, MI: 0.1, MN: 0.1,
  MS: 0.3, MO: 0.8, MT: 0.4, NE: 0.2, NV: 0.6, NH: 0.2, NJ: 0.2, NM: 0.4,
  NY: 0.3, NC: 0.2, ND: 0.1, OH: 0.2, OK: 0.4, OR: 0.9, PA: 0.2, RI: 0.2,
  SC: 0.6, SD: 0.1, TN: 0.5, TX: 0.2, UT: 0.8, VT: 0.2, VA: 0.3, WA: 1.4,
  WV: 0.2, WI: 0.1, WY: 0.3,
}

interface StateAdoptionRecord {
  irc: string
  ibc: string
  iecc: string
  stateName: string
  notes: string
}

// Current (2025) state building code adoption — sourced from ICC adoption tracker
// Last updated: March 2025. Always verify with local AHJ before permit submission.
export const STATE_ADOPTIONS: Record<string, StateAdoptionRecord> = {
  AL: { irc: '2021', ibc: '2021', iecc: '2021', stateName: 'Alabama Building Code 2023',       notes: 'Adopted 2021 I-Codes with Alabama amendments effective January 2023.' },
  AK: { irc: '2018', ibc: '2018', iecc: '2018', stateName: 'Alaska Residential Building Code', notes: 'Anchorage and Fairbanks may have local amendments. Seismic design is critical.' },
  AZ: { irc: '2018', ibc: '2018', iecc: '2018', stateName: 'Arizona Building Code 2018',        notes: 'Local jurisdictions (Phoenix, Tucson) adopt independently and may be on 2021.' },
  AR: { irc: '2018', ibc: '2018', iecc: '2018', stateName: 'Arkansas Building Code 2018',       notes: 'Statewide adoption through Arkansas Fire Prevention Code Board.' },
  CA: { irc: '2022', ibc: '2022', iecc: '2022', stateName: '2022 California Residential Code',  notes: 'Based on 2021 IRC with extensive CA amendments. Title 24 energy code applies. Class A fire rating statewide. WUI zones require ignition-resistant construction per CBC Chapter 7A.' },
  CO: { irc: '2021', ibc: '2021', iecc: '2021', stateName: 'Colorado Building Code 2021',       notes: 'Municipalities adopt independently. Denver, Aurora, Boulder on 2021 IBC. Local amendments for wildfire interface zones common in mountain communities.' },
  CT: { irc: '2021', ibc: '2021', iecc: '2021', stateName: '2021 Connecticut RCNYS',            notes: 'Residential Code for One- and Two-Family Dwellings. Based on 2021 IRC.' },
  DE: { irc: '2021', ibc: '2021', iecc: '2021', stateName: 'Delaware Building Code 2021',       notes: 'Coastal construction standards apply in flood hazard areas (Sussex County).' },
  DC: { irc: '2018', ibc: '2018', iecc: '2018', stateName: '2020 DC Construction Codes',        notes: 'Based on 2018 I-Codes with DC amendments. High-density urban construction rules.' },
  FL: { irc: '2021', ibc: '2021', iecc: '2021', stateName: '2023 Florida Building Code (FBC)',  notes: 'Based on 2021 I-Codes with significant FL amendments. HVHZ (Miami-Dade/Broward) requires NOA-approved products per FBC Section 1524. Wind-borne debris region (WBR) triggers impact-resistant glazing per FBC R301.2.1.2. Coastal construction controls apply statewide.' },
  GA: { irc: '2018', ibc: '2018', iecc: '2018', stateName: '2020 Georgia Residential Code',     notes: 'Based on 2018 IRC. Georgia DCA issues statewide amendments. Atlanta may be on local adoption.' },
  HI: { irc: '2018', ibc: '2018', iecc: '2018', stateName: 'Hawaii Building Code',              notes: 'Each county adopts independently. Honolulu on 2018 IBC with county amendments. Significant wind and seismic requirements. Hurricane zone fastening requirements throughout.' },
  ID: { irc: '2018', ibc: '2018', iecc: '2018', stateName: 'Idaho Building Code 2018',          notes: 'Boise City and other municipalities may adopt 2021. Seismic Zone D applies in eastern ID.' },
  IL: { irc: 'N/A',  ibc: '2021', iecc: '2021', stateName: 'No Statewide IRC — Local Adoption', notes: 'Illinois has NO statewide residential building code. Chicago uses the Chicago Building Code (CBC), a unique local code. Suburban Cook County municipalities vary widely. Check local AHJ.' },
  IN: { irc: '2021', ibc: '2021', iecc: '2021', stateName: '2020 Indiana Residential Code',     notes: 'Based on 2021 IRC. Indiana DNR administers state code. Local amendments common in Indianapolis metro.' },
  IA: { irc: '2021', ibc: '2021', iecc: '2021', stateName: 'Iowa Building Code 2021',           notes: 'Based on 2021 I-Codes. Iowa State Fire Marshal enforces statewide.' },
  KS: { irc: '2018', ibc: '2018', iecc: '2018', stateName: 'Kansas Building Code 2018',         notes: 'No statewide adoption enforcement; most major cities (Wichita, OKC) on 2018 IBC.' },
  KY: { irc: '2018', ibc: '2018', iecc: '2018', stateName: 'Kentucky Residential Code 2018',    notes: 'Based on 2018 IRC. Kentucky DHR administers. New Madrid Seismic Zone affects western KY.' },
  LA: { irc: '2021', ibc: '2021', iecc: '2021', stateName: '2021 Louisiana Residential Code',   notes: 'Based on 2021 IRC. Wind-borne debris requirements apply statewide. Post-Katrina ICC-ES requirements for coastal parishes. Wind zone requirements per LRS 14:202.' },
  ME: { irc: '2015', ibc: '2015', iecc: '2015', stateName: '2015 MUBEC',                        notes: 'Maine Uniform Building and Energy Code based on 2015 IRC/IECC. Slow to update — verify with local AHJ. Very high snow loads apply statewide (50-100 psf in northern ME).' },
  MD: { irc: '2021', ibc: '2021', iecc: '2021', stateName: 'Maryland Building Code 2021',       notes: 'Coastal construction requirements apply in tidal areas (Chesapeake Bay, Atlantic). Local amendments common in Montgomery County, Prince George\'s County.' },
  MA: { irc: '2015', ibc: '2015', iecc: '2015', stateName: '9th Edition MA State Building Code',notes: 'Based on 2015 IBC with extensive Massachusetts amendments. 9th Edition since 2018. MA DPS administers. High snow loads in western MA (Berkshires: 70-100 psf).' },
  MI: { irc: '2021', ibc: '2021', iecc: '2021', stateName: '2021 Michigan Residential Code',    notes: 'Based on 2021 IRC. Michigan LARA administers. Great Lakes coastal exposure affects wind design.' },
  MN: { irc: '2018', ibc: '2018', iecc: '2018', stateName: '2020 Minnesota Residential Code',   notes: 'Based on 2018 IRC with MN amendments. Minnesota DLI administers. Climate Zone 6A-7 triggers strict ice barrier and vapor retarder requirements. R-49 minimum attic insulation.' },
  MS: { irc: '2015', ibc: '2015', iecc: '2015', stateName: 'Mississippi State Building Code',   notes: 'Based on 2015 IRC. One of the few states still on 2015. Gulf Coast counties have higher wind speed requirements per FBC-equivalent coastal construction rules.' },
  MO: { irc: 'local', ibc: 'local', iecc: 'local', stateName: 'Missouri — Local Adoption',      notes: 'Missouri has NO statewide building code. All adoption is local. St. Louis City, St. Louis County, Kansas City on their own codes. New Madrid Seismic Zone covers southwestern MO.' },
  MT: { irc: '2021', ibc: '2021', iecc: '2021', stateName: 'Montana Building Codes 2021',       notes: 'Montana DOLI administers. Cold climate: ice barrier, vapor retarder, R-49 attic in Climate Zone 6-7.' },
  NE: { irc: '2018', ibc: '2018', iecc: '2018', stateName: 'Nebraska Building Code 2018',       notes: 'State adopts via Nebraska SFMD. Omaha and Lincoln may be on 2021.' },
  NV: { irc: '2018', ibc: '2018', iecc: '2018', stateName: 'Nevada Building Code 2018',         notes: 'Clark County (Las Vegas) and Washoe County (Reno) adopt independently, currently on 2021 IBC.' },
  NH: { irc: '2021', ibc: '2021', iecc: '2021', stateName: 'NH State Building Code 2021',       notes: 'Based on 2021 IRC. NH BOCA administers. Very high snow loads in White Mountains (70-100+ psf). Ice dams are major failure mode.' },
  NJ: { irc: '2018', ibc: '2018', iecc: '2018', stateName: 'NJ Uniform Construction Code',      notes: 'Based on 2015 IBC with extensive NJ amendments. DCA administers. Coastal construction per N.J.A.C. 5:23. Shore communities require flood-resistant construction.' },
  NM: { irc: '2021', ibc: '2021', iecc: '2021', stateName: '2021 NM Residential Building Code', notes: 'Based on 2021 IRC. NMCID administers. High desert requires special attention to UV degradation. Seismic Zone D2 affects Rio Grande corridor.' },
  NY: { irc: '2017', ibc: '2017', iecc: '2016', stateName: '2020 RCNYS',                        notes: 'Based on 2017 IRC with NY amendments. Residential Code for One- and Two-Family Dwellings. NYC uses NYC Building Code (a completely separate code). High seismic design requirements in some upstate areas.' },
  NC: { irc: '2018', ibc: '2018', iecc: '2018', stateName: '2018 NC Residential Code',          notes: 'Based on 2018 IRC. NC DOI administers. Coastal areas have Enhanced Building Code requirements per NCEM. Wind-borne debris regions apply along coast and within 1 mile of sounds.' },
  ND: { irc: '2018', ibc: '2018', iecc: '2018', stateName: 'North Dakota Building Code 2018',   notes: 'Very high snow loads (40-80 psf). Climate Zone 6A-7. Ice barrier required statewide.' },
  OH: { irc: '2015', ibc: '2015', iecc: '2015', stateName: '2017 Ohio Residential Code',        notes: 'Based on 2015 IRC with Ohio amendments. ODPS administers. Currently slow to update — some jurisdictions adopting 2021 locally.' },
  OK: { irc: '2021', ibc: '2021', iecc: '2021', stateName: 'Oklahoma Building Code 2021',       notes: 'Tornado alley: IBHS FORTIFIED programs widely used. Higher fastening requirements recommended even where not code-required.' },
  OR: { irc: '2021', ibc: '2021', iecc: '2021', stateName: '2021 Oregon Residential Specialty Code', notes: 'ORSC based on 2021 IRC. BCD administers. Seismic Zone D1 (Portland) to D2 (coast). Cascadia Subduction Zone preparedness standards increasingly adopted.' },
  PA: { irc: '2015', ibc: '2015', iecc: '2015', stateName: 'Pennsylvania UCC (PURBA)',          notes: 'UCC based on 2015 I-Codes. Pennsylvania L&I administers. Philadelphia Code (Philly Building Code) is separate. Municipalities may locally adopt amendments.' },
  RI: { irc: '2015', ibc: '2015', iecc: '2015', stateName: 'Rhode Island SBC',                  notes: 'Based on 2015 IRC with RI amendments. CRIM administers. Coastal construction requirements apply statewide due to state\'s coastal nature.' },
  SC: { irc: '2018', ibc: '2018', iecc: '2018', stateName: '2018 SC Residential Code',          notes: 'Based on 2018 IRC. LLRC administers. Hurricane zone requirements apply coastal counties (Horry, Georgetown, etc.).' },
  SD: { irc: '2021', ibc: '2021', iecc: '2021', stateName: 'South Dakota Building Code 2021',   notes: 'High snow loads. Climate Zone 6-7 requires ice barrier and R-49 attic.' },
  TN: { irc: '2018', ibc: '2018', iecc: '2018', stateName: '2018 Tennessee Residential Code',   notes: 'Based on 2018 IRC. TDCI administers. Memphis area: New Madrid Seismic Zone. Nashville has local amendments.' },
  TX: { irc: 'none', ibc: '2015', iecc: '2015', stateName: 'Texas — No Statewide Residential Code', notes: 'Texas has NO statewide residential building code (unincorporated areas). City of Austin: 2021 IRC. Houston: Houston Building Code (HBC). Dallas: 2021 IBC. Coastal counties: TDI-Windstorm requirements mandatory (TDI Form W-9). Gulf Coast requires engineered windstorm certification (WPI-8).' },
  UT: { irc: '2021', ibc: '2021', iecc: '2021', stateName: 'Utah Building Code 2021',           notes: 'Based on 2021 IRC. DOPL administers. Wasatch Front has significant seismic risk (Salt Lake City on Wasatch Fault). High desert: UV degradation affects roofing faster than national averages.' },
  VT: { irc: '2021', ibc: '2021', iecc: '2021', stateName: '2020 Vermont Residential BESAR',    notes: 'Very high snow loads statewide (60-100+ psf). Climate Zone 6A. Strict energy codes. Ice dams are primary failure mechanism — ice barrier and ventilation are critical.' },
  VA: { irc: '2021', ibc: '2021', iecc: '2021', stateName: '2021 Virginia USBC',                notes: 'Uniform Statewide Building Code based on 2021 I-Codes. DHCD administers. Coastal areas: IBC Chapter 16 coastal construction. Hampton Roads area flood zone requirements.' },
  WA: { irc: '2021', ibc: '2021', iecc: '2021', stateName: '2021 WA State Residential Code',    notes: 'Based on 2021 IRC. L&I administers. Seismic Zone D1 (Seattle area) — anchor bolts, hold-downs, shear walls critical. Western WA: marine climate Zone 4C, no ice barrier required but extensive moisture management needed.' },
  WV: { irc: '2021', ibc: '2021', iecc: '2021', stateName: 'West Virginia Building Code 2021',  notes: 'Based on 2021 IRC. WVSFM administers. Appalachian ridge/valley terrain requires site-specific snow load analysis in many counties.' },
  WI: { irc: 'UDC',  ibc: 'UDC',  iecc: 'UDC',  stateName: 'Wisconsin Uniform Dwelling Code',  notes: 'Wisconsin uses the UDC, NOT the IRC. Unique Wisconsin code for 1-2 family dwellings. DSPS administers. Very different from IRC — framing spans, insulation R-values, and ventilation requirements differ significantly. Climate Zone 5A-7 applies.' },
  WY: { irc: '2021', ibc: '2021', iecc: '2021', stateName: 'Wyoming Building Code 2021',        notes: 'Based on 2021 IRC. Extreme snow loads in mountain counties (Jackson Hole: 150+ psf). Wind and seismic requirements vary significantly by county.' },
}

export function getStateAdoptions(stateAbbr: string): JurisdictionAdoptions {
  const record = STATE_ADOPTIONS[stateAbbr] ?? STATE_ADOPTIONS['AL']
  return {
    irc: record.irc,
    ibc: record.ibc,
    iecc: record.iecc,
    stateName: record.stateName,
    adoptionNotes: record.notes,
    source: 'ICC State Code Adoption Tracker 2025 / State Building Department Publications',
  }
}
