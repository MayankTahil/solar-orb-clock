# Ordered development roadmap

## Phase 1 — Simulator and mathematics (CURRENT)
1. Separate astronomy, color engine, and presentation into testable modules while preserving the original UI.
2. Replace approximate Sun/Moon calculations with validated astronomical data or a validated browser-compatible implementation. Use `reference/solar_orb_astronomy.py` as a candidate reference, after testing it.
3. Correct IANA civil time handling: DST skipped/repeated times, non-24-hour days, local-day boundaries, leap years, and location selection.
4. Build numerical regression fixtures: representative seasons, latitudes, moon phases, rise/set events, polar conditions, and DST transitions.
5. Correct color continuity at sunrise/sunset and normalize midday color to daily peak solar altitude; keep physical brightness a separate control.
6. Make seasonal anchor colors, twilight thresholds, easing, moon influence and brightness configurable.
7. Render above-horizon intervals robustly, including arcs across midnight and days with no rise or set event.
8. Save/load scenario presets; compare versions; add reproducible day/year playback tests.
9. Freeze Phase 1 reference outputs and document tolerances.

**Gate 1:** astronomy matches independently checked reference within explicit tolerances; color outputs are continuous at boundaries; deterministic scenarios and UI smoke tests pass. Do not assert a numeric accuracy target until selected and validated.

## Phase 2 — Electrical architecture and bill of materials
1. Define orb and halo lighting zones, LED channel needs, update frequency and dimming floor.
2. Compare addressable RGBW LED options, diffuse strips, and other emitters; evaluate LED protocols and available libraries.
3. Select controller (ESP32-C6 candidate, not final); choose timekeeping and offline strategy.
4. Calculate maximum/typical power, protection, signal-level compatibility, current injection, wiring and thermal budget.
5. Prepare schematic, part numbers, vendors, substitutes, costs, and compatibility matrix.

**Gate 2:** purchasable BOM, defensible electrical design and power budget.

## Phase 3 — Breadboard, circuitry and optical proof
1. Bring up controller and one LED; verify channel order, dimming and signal reliability.
2. Prototype orb illumination and diffuser; measure low-light color, flicker and uniformity.
3. Prototype a halo segment, arc endpoint resolution and optical isolation.
4. Assemble independent lighting zones; map simulator outputs to actual RGBW hardware.
5. Validate thermal, electrical, offline, reboot and prolonged-operation behavior.

**Gate 3:** measured prototype reproduces intended behavior within defined tolerances and passes safety/reliability tests.

## Phase 4 — Industrial design and physical manifestation (DEFER FORM DECISION)
1. Revisit whether it should read as clock, ambient lamp, astronomical sculpture, or hybrid.
2. Compare sphere, cube, cylinder, wall-mounted and pedestal forms; explore event-halo integration.
3. Compare glass, acrylic, resin, ceramic, wood and metal with actual light samples.
4. Evaluate serviceability, cooling, cable routing, optical uniformity and fabrication constraints.
5. Build low-cost appearance mockups before final CAD, tolerances and machining.

**Gate 4:** chosen form validated through mockups and engineering review. The 170 mm cube / 150 mm orb is only an earlier candidate.
