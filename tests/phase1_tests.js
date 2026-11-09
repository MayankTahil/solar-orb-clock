/* Phase 1 regression: civil-time conversion (IANA zones, DST).
 * Extracts code from the single-source index.html at the repo root.
 * Run: node tests/phase1_tests.js
 */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('/* ============ helpers ============');
const end=html.indexOf('/* ============ MODULE: color-engine');
assert.ok(start>0&&end>start,'could not locate astronomy span in index.html');
const span=html.slice(start,end);
const ctx={Intl,Date,LOCATIONS:[{tz:'America/Los_Angeles'}],locSelect:{value:'0'}};
vm.createContext(ctx);vm.runInContext(span,ctx);
function iso(y,m,d,mins){return ctx.localToUTC(y,m,d,mins,-122.33).toISOString()}
assert.equal(iso(2026,7,1,720),'2026-07-01T19:00:00.000Z');
assert.equal(iso(2026,1,1,720),'2026-01-01T20:00:00.000Z');
assert.equal(iso(2026,3,8,180),'2026-03-08T10:00:00.000Z');
console.log('PASS: summer/winter civil time and spring-forward handling');
