#!/usr/bin/env node
/* Generate color-engine golden fixtures from the browser implementation in
 * index.html (the reference implementation). The C port (firmware/src/
 * color_engine.c) must reproduce these values — run from the repo root:
 *   node firmware/tools/make_color_fixtures.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const start = html.indexOf('/* ============ helpers ============');
const end = html.indexOf('/* ============ MODULE: simulator UI');
if (start < 0 || end < 0) { console.error('span not found'); process.exit(1); }
const ctx = { Intl, Date, Math };
vm.createContext(ctx);
vm.runInContext(html.slice(start, end), ctx);

const MODES = { 'day': 0, 'twilight': 1, 'night-moon': 2, 'night-dark': 3 };
const cases = [];
const salts = [-30, -15, -6, -1, 0, 3, 10, 25, 45, 70];
const malts = [-30, -5, 5, 25, 60];
const illums = [0, 0.15, 0.5, 1.0];
const doys = [1, 80, 130, 172, 220, 266, 320, 355];
for (const paletteOn of [1, 0]) {
  for (const doy of doys) {
    const dec = 23.44 * Math.sin((2 * Math.PI / 365) * (doy - 80));
    const peak = ctx.seasonalPeak(doy, paletteOn, dec).color;
    for (const s of salts) for (const m of malts) for (const il of illums) {
      const r = ctx.orbColor(s, m, il, peak, 45);
      const scale = r.glow * 0.40;
      // mirror orb_rgb_to_rgbw exactly
      const rr = Math.round(r.color.r * scale), gg = Math.round(r.color.g * scale), bb = Math.round(r.color.b * scale);
      const ww = Math.min(rr, gg, bb);
      cases.push([s, m, il, doy, dec, paletteOn, MODES[r.mode],
        Math.round(r.color.r), Math.round(r.color.g), Math.round(r.color.b),
        r.glow.toFixed(4), rr - ww, gg - ww, bb - ww, ww].join(' '));
    }
  }
}
fs.writeFileSync(path.join(__dirname, '..', 'test', 'color_fixtures.txt'),
  cases.length + '\n' + cases.join('\n') + '\n');
console.log('wrote firmware/test/color_fixtures.txt:', cases.length, 'cases');
