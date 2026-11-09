# Solar Orb Clock — portable project handoff

## Purpose
An ambient astronomical clock/lamp. Its illuminated orb communicates time through color: sunlight drives warm daylight colors; after sunset, lunar altitude and phase influence indigo/silver-blue night colors. Optional solar and lunar event halos convey rise/set intervals. The final physical form is **not fixed**; the wood cube and glass sphere are exploratory concepts, not requirements.

## Start here
- `app/index.html` — **current Phase 1 simulator preview**, single-file HTML/CSS/JS. Open locally in a modern browser; no server or dependencies required. This is the file to publish as `index.html` on a static host.
- `reference/original_simulator.html` — original uploaded simulator, preserved unchanged.
- `reference/original_project_prompt.md` — original project brief, preserved unchanged.
- `reference/solar_orb_astronomy.py` — separate Skyfield/JPL-based *desktop reference* astronomy module. **Not integrated into the browser app** and not a verified numerical reference until tested against trusted results.
- `docs/ROADMAP.md` — prioritized phases, milestones and acceptance criteria.
- `docs/ARCHITECTURE_AND_ISSUES.md` — current technical assessment and known limitations.
- `docs/PERPLEXITY_HANDOFF.md` — context and suggested first task for the receiving assistant.
- `docs/DEPLOYMENT.md` — GitHub Pages instructions and repository status.
- `tests/` — preliminary Node test files, not a comprehensive test suite.

## Run
Open `app/index.html` in a browser. To run the preliminary tests, from the project root: `node tests/phase1_tests.js` (requires Node). For astronomy reference: `pip install -r reference/requirements.txt` and supply a local JPL ephemeris `.bsp` file (not included).

## Status and honesty about validation
The Phase 1 simulator improves civil-time conversion and daylight color interpolation but still uses approximate Sun/Moon equations in JavaScript. The Skyfield reference is separate. The app has not been fully regression-tested, cross-browser verified, or calibrated against physical LEDs. Existing tests only exercise a few time-zone examples. Do not describe Phase 1 or astronomy as complete.

## Repository and live simulator
Public GitHub repo: https://github.com/MayankTahil/solar-orb-clock (`main`).

Live simulator (GitHub Pages, verified 2026-11-08): https://mayanktahil.github.io/solar-orb-clock/ — the root `index.html` is a copy of `app/index.html`. When the simulator changes, update both files (or change the Pages source to `app/` if we prefer a single source of truth).

## Deployment status
Deployed and verified. Earlier 403 failures writing through the ChatGPT GitHub integration are resolved; pushes now go through the `gh` CLI.

## Source provenance
This package includes original uploaded material, previously generated Phase 1 code, and a new handoff plan. The project description is a synthesis of the prior discussion, not a new set of confirmed hardware specifications.
