# Solar Orb Clock — Phase 1 preview

## Open
Open `Solar_Orb_Simulator_Phase1.html` in a modern browser. It is a standalone HTML file and needs no server.

## Changes in this iteration
- Preserved the original layout, controls, event-mark styles, and day/year playback.
- Added IANA time zones to the 20 existing cities and converted selected civil wall-clock time to UTC before astronomy calculations.
- Adjusted the daylight color curve to reach the seasonal peak at the day's maximum solar elevation.
- Made the day/twilight color agree at the 0-degree solar-elevation boundary.
- Labeled astronomy, color-engine, and UI sections for later module extraction.
- Added a clear unvalidated-astronomy status label.
- Initialized the year slider to the selected date, with leap-year maximum.

## Validation performed
- JavaScript syntax: `node --check phase1_check.js`
- Civil time conversion: summer/winter Pacific offset and spring DST gap (`node phase1_tests.js`).

## Not yet complete
- Astronomical ephemeris integration: existing solar/lunar approximations remain. Do not use rise/set times as a precision reference.
- Rise/set horizon corrections, lunar parallax, polar day intervals, and missing moonrise/moonset handling.
- DST repeated hour ambiguity, non-24-hour local days, and global/custom location support.
- Browser visual QA and full regression coverage.
- Standalone code is sectioned but not yet extracted into independently testable modules.

## Static hosting
For a public URL, upload `Solar_Orb_Simulator_Phase1.html` to a static host (e.g. GitHub Pages, Cloudflare Pages, or Netlify) as `index.html`. No backend is required for this preview. This environment has not published a public endpoint.
