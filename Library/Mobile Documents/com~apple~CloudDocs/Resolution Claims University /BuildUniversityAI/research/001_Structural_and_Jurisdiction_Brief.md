# Structural and Jurisdiction Research Brief

**Prepared by ResearchCore – 2024-05-01**

## Structural Highlights
- Adopted dead and live load defaults follow IRC 2021 Table R301.5 with ASCE 7-22 load combinations for strength and allowable stress design.
- Standard 2x6 SPF No.2 wall assembly and a 30 ft fink truss baseline support the first RealityKit modules, referencing AWC NDS 2018 and ANSI/TPI 1-2014 for capacities and bracing requirements.
- Foundation parameters align with IRC Table R401.4.1 and ACI 332-14, ensuring frost protection and slab reinforcement meet prescriptive thresholds for cold-climate deployments.

## Jurisdiction Highlights
- ZIP 10001 (New York, NY): Climate Zone 4A, basic wind speed 115 mph, ground snow load 30 psf, frost depth 42 in., per ASCE 7-22 and NYC DOB guidance.
- ZIP 98101 (Seattle, WA): Climate Zone 4C, seismic design category D1, frost depth 12 in., and 25 psf ground snow load with FEMA floodplain overlays for coastal exposure.
- ZIP 73301 (Austin, TX): Climate Zone 2A, basic wind speed 115 mph, frost depth 12 in., zero snow load, requiring flood compliance via Austin FloodPro+ data.

## Next Steps
1. Expand jurisdiction dataset to cover priority service ZIP codes with automated ingestion from ASCE Hazard Tool exports.
2. Produce `/docs/StructuralGuide.md` with detailed framing schematics and AR storyboard references.
3. Draft `/data/environment/profiles.json` parameters for integrating NOAA Atlas 14 rainfall intensities.

## References
- International Code Council. *2021 International Residential Code*.
- ASCE/SEI. *Minimum Design Loads and Associated Criteria for Buildings and Other Structures (ASCE/SEI 7-22)*.
- American Wood Council. *National Design Specification (NDS) for Wood Construction, 2018 Edition*.
- ANSI/TPI. *National Design Standard for Metal Plate Connected Wood Truss Construction, 2014 Edition*.
- Federal Emergency Management Agency. *Flood Insurance Rate Maps (FIRMs)*.
