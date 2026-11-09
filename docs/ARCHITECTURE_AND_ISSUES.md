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
- Astronomy (Nov 2026): moon now uses a truncated ELP-2000-style series with topocentric parallax, sun a truncated series; both fixture-validated against Skyfield/JPL de421 (`tests/phase2_tests.js`) to ~0.04° moon / ~0.01° sun altitude and <0.5 min rise/set, including polar and DST days. Rise/set use the −0.833° (refraction + semidiameter) convention. This is still a browser/ESP32-suitable approximation, not an ephemeris; re-validate after any formula change via the fixture generator.
- Displayed event times interpolate continuously between adjacent days (see smoothEvents in index.html); the underlying per-day computation still takes only the FIRST rise/set of the civil day — days with two moonrises or all-day moon at high latitude are not fully represented.
- Time-zone handling was improved but repeated DST hours and unusual local-day lengths are unresolved; check UI slider semantics.
- Color model should be tested for continuity, gamut clipping, perceptual interpolation and daylight-peak normalization across latitude/season.
- The sky elevation plot is time-based, despite original east/west labels.
- Browser CSS RGB color does not predict physical RGBW brightness or perceived hue; calibration belongs to later hardware work.
- Source has been marked into sections but not fully modularized; do not claim independent JS modules exist.
- Tests cover civil time (phase1) and astronomy fixtures + interpolation continuity (phase2); UI smoke/browser QA is still manual.

## Astronomical precision note
A JPL ephemeris is a strong reference for positions, but event times also depend on elevation, refraction, horizon convention, atmospheric assumptions and local obstructions. Explicitly document those choices before setting tolerances.
