const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'phase1_check.js'),'utf8');
const cut=src.slice(src.indexOf('function dayOfYear'),src.indexOf('function sunCalc'));
const ctx={Intl,Date,LOCATIONS:[{tz:'America/Los_Angeles'}],locSelect:{value:'0'}};
vm.createContext(ctx);vm.runInContext(cut,ctx);
function iso(y,m,d,mins){return ctx.localToUTC(y,m,d,mins,-122.33).toISOString()}
assert.equal(iso(2026,7,1,720),'2026-07-01T19:00:00.000Z');
assert.equal(iso(2026,1,1,720),'2026-01-01T20:00:00.000Z');
assert.equal(iso(2026,3,8,180),'2026-03-08T10:00:00.000Z');
console.log('PASS: summer/winter civil time and spring-forward handling');
