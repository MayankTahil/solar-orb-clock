# Ordered development roadmap

## Phase 1 — Simulator and mathematics (COMPLETE, frozen)

Done: module separation; validated astronomy (Sun: VSOP-truncated; Moon: truncated ELP-style series
with Kepler solve, perturbations and topocentric parallax; illumination from elongation; rise/set
scanning at -0.833°); IANA civil-time semantics with DST fixtures; Skyfield/de421 golden fixtures
(4 places, DST days); continuous sunrise/sunset and moonrise/moonset interpolation between today's
and tomorrow's events; color continuity at boundaries; seasonal noon normalization (brightness
deliberately NOT seasonally normalized — confirmed design decision); single-source-of-truth
`index.html`; online simulator on GitHub Pages with regression tests in CI scope.

Tolerances achieved (JS vs Skyfield): moon alt 0.037°, sun alt 0.008°, az 0.085°, illum 0.0016,
rise/set 0.40 min. The C port in `firmware/` matches the fixtures to 0.0000° (exact) and the
browser color engine matches on all 3,200 fixture cases.

Carried forward as known UI limitations (not math): DST repeated-hour ambiguity in the time
slider, non-24-hour local days, days with multiple/zero lunar events at high latitude
(first event only shown), cross-browser QA. These do not block device work.

**Gate 1: PASSED.** Phase 1 outputs are frozen as the behavioral reference for all device work.

## Phase 1.5 — ESP32 firmware (CURRENT)

Goal: the simulator's math and rendering logic running self-sustained on an ESP32, with a REST API
for remote configuration and home-automation integration. Status: math core written and
fixture-validated; device application code written but not yet compiled/flashed (no hardware in
loop yet).

Baked-in design decisions (from the cadence discussion):

- **60-LED rings** (24 min/LED resolution) for the halo; sun arc gold `#ffb35c`, moon arc silver `#a9bcf0`.
- **240 astronomy updates/day** (every 6 min). The render between ticks interpolates; no stale reads.
- **Anti-aliased "now" bead**: 20-60-20 kernel spread across 3 LEDs, total light constant (no flicker),
  shown only while the body is above the horizon.
- **Arc-end fade**: 25% / 50% / 100% ramp over the last 3 LEDs so arcs fade out gracefully.
- **Brightness**: `max_pwm` cap (default 0.40) applied via RGBW split; seasonal color shifts retained,
  seasonal brightness normalization deliberately excluded.

Structure: `firmware/src/astronomy.[ch]` and `color_engine.[ch]` are the fixture-validated core;
`render.[ch]` maps events to halo frames; `main.cpp` is the Arduino app (timekeeping, LED output,
REST API, NVS-persisted config). `firmware/test/` runs the core against the same golden fixtures as
the simulator. See `firmware/README.md` and `firmware/api.md`.

1. Compile and flash on the XIAO ESP32-C6; bring up Wi-Fi + NTP time sync; verify clock drift is
   handled (re-sync periodically, run from a stable local RTC-less estimate between syncs).
2. Validate `/api/status` against the simulator for the same instant (alt/az/illum/events within
   fixture tolerances).
3. Bench-test the 20-60-20 bead and arc fade on a 60-LED strip; tune the ramp if the bead looks
   too diffuse.
4. Add OTA updates and a config web UI (stretch).

**Gate 1.5:** device output matches the simulator within fixture tolerances over a 24-hour bench run.

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
