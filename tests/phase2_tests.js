/* Phase 2 validation: upgraded moon series + continuous event interpolation.
 *
 * Extracts the astronomy code from the single-source index.html and checks it
 * against golden fixtures generated from Skyfield + JPL de421
 * (tests/generate_reference_fixtures.py). Reports measured error maxima so
 * accuracy is stated, not assumed.
 *
 * Run: node tests/phase2_tests.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('/* ============ helpers ============');
const end = html.indexOf('/* ============ MODULE: color-engine');
assert.ok(start > 0 && end > start, 'could not locate astronomy span in index.html');
const span = html.slice(start, end);

function makeContext(place) {
  // localToUTC reads the selected location for its IANA tz; stub one place.
  const ctx = {
    Intl, Date, Math, console,
    LOCATIONS: [{ name: place, lat: 0, lon: 0, tz: arguments[1] }],
    locSelect: { value: '0' },
  };
  vm.createContext(ctx);
  vm.runInContext(span, ctx);
  return ctx;
}

const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'astronomy_fixtures.json'), 'utf8'));
const PLACES = {
  seattle: { lat: 47.6062, lon: -122.3321, tz: 'America/Los_Angeles' },
  quito: { lat: 0.1807, lon: -78.4678, tz: 'America/Guayaquil' },
  tromso: { lat: 69.6489, lon: 18.9551, tz: 'Europe/Oslo' },
  sydney: { lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
};

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS: ' + name + (detail ? ' — ' + detail : '')); }
  else { failures++; console.log('FAIL: ' + name + (detail ? ' — ' + detail : '')); }
}

/* ---------- 1. positions & illumination vs Skyfield ---------- */
const TOL_ALT = 0.10, TOL_AZ = 0.25, TOL_ILLUM = 0.006;
let maxMA = 0, maxSA = 0, maxMz = 0, maxSz = 0, maxI = 0;
const ctxs = {};
for (const p of Object.keys(PLACES)) ctxs[p] = makeContext(p, PLACES[p].tz);

for (const row of fixtures.positions) {
  const ctx = ctxs[row.place];
  const inst = new Date(row.utc);
  const m = ctx.moonAlt(inst, row.lat, row.lon);
  const s = ctx.sunAlt(inst, row.lat, row.lon);
  const mi = ctx.moonIllum(inst);
  const dm = Math.abs(m.alt - row.moon_alt), ds = Math.abs(s.alt - row.sun_alt);
  const dmz = Math.abs(((m.az - row.moon_az + 540) % 360) - 180);
  const dsz = Math.abs(((s.az - row.sun_az + 540) % 360) - 180);
  const di = Math.abs(mi.illum - row.moon_illum);
  maxMA = Math.max(maxMA, dm); maxSA = Math.max(maxSA, ds);
  maxMz = Math.max(maxMz, dmz); maxSz = Math.max(maxSz, dsz); maxI = Math.max(maxI, di);
}
check('moon altitude within ' + TOL_ALT + '° of Skyfield (48 samples, max err ' + maxMA.toFixed(4) + '°)', maxMA <= TOL_ALT);
check('sun altitude within ' + TOL_ALT + '° of Skyfield (48 samples, max err ' + maxSA.toFixed(4) + '°)', maxSA <= TOL_ALT);
check('moon azimuth within ' + TOL_AZ + '° of Skyfield (max err ' + maxMz.toFixed(3) + '°)', maxMz <= TOL_AZ);
check('sun azimuth within ' + TOL_AZ + '° of Skyfield (max err ' + maxSz.toFixed(3) + '°)', maxSz <= TOL_AZ);
check('moon illumination within ' + TOL_ILLUM + ' of Skyfield (max err ' + maxI.toFixed(4) + ')', maxI <= TOL_ILLUM);

/* ---------- 2. rise/set times vs Skyfield ---------- */
const TOL_EVENT = 4.0; // minutes
let maxEv = 0, evDetails = [];
for (const ev of fixtures.events) {
  const ctx = ctxs[ev.place];
  const [y, mo, d] = ev.date.split('-').map(Number);
  const got = ev.body === 'sun' ? ctx.sunTimes(y, mo, d, ev.lat, ev.lon) : ctx.moonTimes(y, mo, d, ev.lat, ev.lon);
  for (const k of ['rise', 'set']) {
    const ref = ev[k + '_min'], js = got[k];
    if (ref === null || js === null) {
      if ((ref === null) !== (js === null)) {
        failures++; console.log('FAIL: ' + ev.body + ' ' + k + ' presence mismatch ' + ev.place + ' ' + ev.date + ' (ref=' + ref + ' js=' + js + ')');
      }
      continue;
    }
    const err = Math.abs(js - ref);
    maxEv = Math.max(maxEv, err);
    if (err > TOL_EVENT) {
      failures++; console.log('FAIL: ' + ev.body + ' ' + k + ' ' + ev.place + ' ' + ev.date + ' off by ' + err.toFixed(1) + ' min (ref ' + ref.toFixed(1) + ' vs ' + js.toFixed(1) + ')');
    }
  }
}
check('sun & moon rise/set within ' + TOL_EVENT + ' min of Skyfield (max err ' + maxEv.toFixed(2) + ' min)', maxEv <= TOL_EVENT);

/* ---------- 3. continuous event interpolation ---------- */
const ctx = ctxs.seattle;
// Continuity at the day boundary: value at end of day N must equal value at
// start of day N+1 (no step at midnight). Scan Nov 2026 for wrap-around cases.
let worstJump = 0, worstDate = '';
for (let day = 1; day <= 28; day++) {
  const y = 2026, mo = 11;
  const ev0 = ctx.cachedDayEvents(y, mo, day, PLACES.seattle.lat, PLACES.seattle.lon);
  const n1 = ctx.nextDate(y, mo, day, 1);
  const ev1 = ctx.cachedDayEvents(n1.y, n1.mo, n1.d, PLACES.seattle.lat, PLACES.seattle.lon);
  for (const body of ['st', 'mt']) {
    for (const k of ['rise', 'set']) {
      if (ev0[body][k] === null || ev1[body][k] === null) continue;
      const endOfN = ctx.smoothEvents(ev0[body], ev1[body], null, 1)[k];          // f=1 on day N
      const startOfN1 = ctx.smoothEvents(ev1[body], ev0[body], null, 0)[k];       // f=0 on day N+1
      // f=0 on N+1 is just ev1 value; unwrap-compare with endOfN
      let a = endOfN, b = startOfN1;
      if (Math.abs(b - a) > 720) { b += (b < a ? 1440 : -1440); }
      const jump = Math.abs(b - a);
      if (jump > worstJump) { worstJump = jump; worstDate = '2026-11-' + day + ' ' + body + '.' + k; }
    }
  }
}
check('event interpolation continuous across midnight (max boundary jump ' + worstJump.toFixed(4) + ' min, worst ' + worstDate + ')', worstJump < 1e-6);

// Interpolation must actually move: mid-day value strictly between day N and N+1 values (moonrise, Seattle Nov 8-9 2026)
const e0 = ctx.cachedDayEvents(2026, 11, 8, PLACES.seattle.lat, PLACES.seattle.lon);
const e1d = ctx.nextDate(2026, 11, 8, 1);
const e1 = ctx.cachedDayEvents(e1d.y, e1d.mo, e1d.d, PLACES.seattle.lat, PLACES.seattle.lon);
const mid = ctx.smoothEvents(e0.mt, e1.mt, null, 0.5);
const moved = e0.mt.rise !== null && e1.mt.rise !== null &&
  Math.abs(mid.rise - e0.mt.rise) > 1 && Math.abs(mid.rise - e1.mt.rise) > 1;
check('moonrise marker drifts through the day (Nov 8 midday ' + (mid.rise === null ? '—' : mid.rise.toFixed(1)) + ' between ' + e0.mt.rise.toFixed(1) + ' and ' + e1.mt.rise.toFixed(1) + ')', moved);

/* ---------- 4. keep the Phase 1 civil-time regression ---------- */
function iso(y, m, d, mins) { return ctx.localToUTC(y, m, d, mins, -122.33).toISOString(); }
check('summer/winter civil time and spring-forward handling (Phase 1 regression)',
  iso(2026, 7, 1, 720) === '2026-07-01T19:00:00.000Z' &&
  iso(2026, 1, 1, 720) === '2026-01-01T20:00:00.000Z' &&
  iso(2026, 3, 8, 180) === '2026-03-08T10:00:00.000Z');

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
