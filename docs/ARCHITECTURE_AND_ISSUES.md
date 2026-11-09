# Architecture, simulator behavior and known issues

## Current user-facing simulator features to preserve
- 20-city picker with latitude/longitude; date picker; minute-resolution time slider and Now.
- Play day and Play whole year, year/month scrubber, seasonal palette toggle.
- Five event-mark modes: perimeter, offset halo, horizon chord, semicircles, none.
- Orb color and hex display, Sun/Moon diagnostic cards, moon phase illustration, daily color timeline and elevation curves.
- Self-contained offline HTML, responsive mobile UI, collapsible panels and save/share flow.

## Target architecture
`civil date/time + geolocation -> validated astronomy state -> configurable color engine -> renderer adapters (browser now; embedded RGBW later)`.
Astronomy should output timezone-aware event instants, positions, illumination, above-horizon intervals and data quality metadata. Color engine should be a deterministic pure function of astronomical state and settings; browser UI should not own astronomical formulas. Separate electrical PWM/white-channel mapping from display RGB.

## Known issues / test obligations
- Phase 1 browser still uses approximate Sun/Moon formulas; JPL/Skyfield reference is not wired into browser. Skyfield requires ephemeris data and is unsuitable for direct ESP32 execution.
- Time-zone handling was improved but repeated DST hours and unusual local-day lengths are unresolved; check UI slider semantics.
- Rise/set horizon/refraction/parallax corrections and independent validation remain outstanding.
- Some event arc logic requires both rise and set in the local day, and can fail for polar conditions and cross-midnight lunar intervals.
- Color model should be tested for continuity, gamut clipping, perceptual interpolation and daylight-peak normalization across latitude/season.
- The sky elevation plot is time-based, despite original east/west labels.
- Browser CSS RGB color does not predict physical RGBW brightness or perceived hue; calibration belongs to later hardware work.
- Source has been marked into sections but not fully modularized; do not claim independent JS modules exist.
- `tests/phase1_tests.js` is a minimal smoke test only, with limited coverage.

## Astronomical precision note
A JPL ephemeris is a strong reference for positions, but event times also depend on elevation, refraction, horizon convention, atmospheric assumptions and local obstructions. Explicitly document those choices before setting tolerances.
