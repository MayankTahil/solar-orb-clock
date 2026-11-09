# Context for Perplexity / next engineering assistant

## User objective
Continue building the Solar Orb Clock as a research-driven, physically realizable ambient astronomical clock/lamp. **Current priority is Phase 1 simulator and mathematical validation**, followed by electrical BOM, then breadboard/circuitry, and only then deeper discussion of the physical form. User likes the existing simulator's full scenario-control surface and does not want a premature UI redesign or a fixed enclosure decision.

## First requested task
1. Read `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE_AND_ISSUES.md`, `reference/original_project_prompt.md`, and the original/current HTML.
2. Audit current browser astronomy, timezone and color code against a high-accuracy independent reference. Clearly distinguish measured accuracy from assumptions.
3. Propose the least disruptive way to preserve the self-contained offline app while upgrading the astronomy engine; if a precomputed ephemeris or optional online service is needed, document tradeoffs.
4. Implement small, reviewable commits with tests. Preserve all core simulator controls, responsive styling, playback and event mark styles.
5. Produce an automated test matrix and report pass/fail, including DST ambiguity, polar days, lunar events across midnight, and color continuity.
6. Do not purchase parts or finalize physical construction until validation gates are met.

## Code / environment
- Deployable static entrypoint: `app/index.html`.
- Original HTML: `reference/original_simulator.html`.
- Astronomy Python reference: `reference/solar_orb_astronomy.py`, `reference/requirements.txt`.
- Test entrypoint: `node tests/phase1_tests.js`.
- Public repo target: https://github.com/MayankTahil/solar-orb-clock . At handoff, publishing from ChatGPT was blocked by GitHub integration 403; no live Pages URL is confirmed.

## Working style
Explain mathematical assumptions and validate numerically. Keep parameter controls and visual feedback interactive. Prefer reversible, test-backed changes. Do not claim code is deployed unless the live URL has been verified. Do not mistake approximate browser astronomy for the accurate Python reference.
