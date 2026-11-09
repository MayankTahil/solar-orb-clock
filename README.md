# Solar Orb Clock — portable project handoff

## Purpose
An ambient astronomical clock/lamp. Its illuminated orb communicates time through color: sunlight drives warm daylight colors; after sunset, lunar altitude and phase influence indigo/silver-blue night colors. Optional solar and lunar event halos convey rise/set intervals. The final physical form is **not fixed**; the wood cube and glass sphere are exploratory concepts, not requirements.

## Start here
- `index.html` — **current simulator**, single-file HTML/CSS/JS at the repo root (single source of truth; GitHub Pages serves it directly). Open locally in a modern browser; no server or dependencies required.
- `reference/original_simulator.html` — original uploaded simulator, preserved unchanged.
- `reference/original_project_prompt.md` — original project brief, preserved unchanged.
- `reference/solar_orb_astronomy.py` — separate Skyfield/JPL-based *desktop reference* astronomy module. **Not integrated into the browser app** and not a verified numerical reference until tested against trusted results.
- `docs/ROADMAP.md` — prioritized phases, milestones and acceptance criteria.
- `docs/ARCHITECTURE_AND_ISSUES.md` — current technical assessment and known limitations.
- `docs/PERPLEXITY_HANDOFF.md` — context and suggested first task for the receiving assistant.
- `docs/DEPLOYMENT.md` — GitHub Pages instructions and repository status.
- `tests/` — preliminary Node test files, not a comprehensive test suite.

## Run
Open `index.html` in a browser. To run the tests, from the project root: `node tests/phase1_tests.js` and `node tests/phase2_tests.js` (require Node). To regenerate the astronomy reference fixtures: `pip install skyfield && python3 tests/generate_reference_fixtures.py` (downloads the JPL de421 ephemeris automatically).

## Status and honesty about validation
Astronomy: the simulator now uses a truncated ELP-2000-style lunar series (with topocentric parallax) and a solar series, both **fixture-validated against Skyfield + JPL de421** (`node tests/phase2_tests.js`): measured worst-case errors are ~0.04° in moon altitude, ~0.01° in sun altitude, and under ½ minute in rise/set times across mid-latitude, equatorial, southern-hemisphere and polar locations, including DST transition days. Rise/set use the standard −0.833° (refraction + semidiameter) convention. Displayed event times interpolate continuously between adjacent days, so year playback drifts smoothly instead of stepping at midnight.

Still not done: DST repeated-hour ambiguity in the UI slider, non-24-hour local days, days with multiple/zero lunar events at high latitude (first event only is shown), cross-browser QA, and physical LED calibration. Do not describe Phase 1 as complete.

## Repository and live simulator
Public GitHub repo: https://github.com/MayankTahil/solar-orb-clock (`main`).

Live simulator (GitHub Pages, verified 2026-11-08): https://mayanktahil.github.io/solar-orb-clock/ — the root `index.html` is the single source of truth for the simulator. There is no second copy under `app/`; GitHub Pages builds straight from the repo root, so every commit to `main` updates the live site within a minute or two.

## Deployment status
Deployed and verified. Earlier 403 failures writing through the ChatGPT GitHub integration are resolved; pushes now go through the `gh` CLI.

## Source provenance
This package includes original uploaded material, previously generated Phase 1 code, and a new handoff plan. The project description is a synthesis of the prior discussion, not a new set of confirmed hardware specifications.
