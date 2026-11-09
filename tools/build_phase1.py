from pathlib import Path
import re
src=Path('/mnt/data/Solar Orb Clock Simulator.html').read_text()
# Preserve existing offline app, correct civil-time conversion and continuity while retaining approximate ephemerides.
loc_tzs=['America/New_York','America/Los_Angeles','America/Chicago','America/Chicago','America/Phoenix','America/New_York','America/Chicago','America/Los_Angeles','America/Chicago','America/Chicago','America/New_York','America/Chicago','America/Los_Angeles','America/New_York','America/New_York','America/Indiana/Indianapolis','America/Los_Angeles','America/Los_Angeles','America/Denver','America/New_York']
pat=r"(\{name:'[^']+', lat:[^}]+)(\},?)"
idx=[0]
def inject(m):
 i=idx[0];idx[0]+=1
 return m.group(1)+", tz:'"+loc_tzs[i]+"'"+m.group(2)
src=re.sub(pat,inject,src)
assert idx[0]==20
start=src.index('// Returns a Date in UTC for local wall-clock date + minutes at the location.')
end=src.index('function sunCalc(',start)
src=src[:start]+'''// Phase 1: astronomy remains an approximate browser preview until ephemeris validation.
// All calculations use real UTC instants derived from IANA civil time.
function dayOfYear(y,m,d){return Math.floor((Date.UTC(y,m-1,d)-Date.UTC(y,0,0))/864e5);}
function civilParts(instant, tz){
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:tz, hourCycle:'h23',
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(instant);
  const v={}; for(const p of parts) if(p.type!=='literal') v[p.type]=+p.value;
  return v;
}
function civilToUTC(y,m,d,mins,tz){
  const wall = Date.UTC(y,m-1,d,0,mins);
  let guess=wall;
  // Fixed point offset solution: converges for ordinary times including DST transitions.
  for(let k=0;k<5;k++){
    const p=civilParts(new Date(guess),tz);
    const rendered=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);
    const next=guess+(wall-rendered);
    if(next===guess) break;
    guess=next;
  }
  const check=civilParts(new Date(guess),tz);
  if(Date.UTC(check.year,check.month-1,check.day,check.hour,check.minute)!==wall){
    // Nonexistent wall times (spring DST jump): use first valid minute after gap.
    let cursor=wall-18*3600000;
    for(let k=0;k<36*60;k++){
      const p=civilParts(new Date(cursor),tz);
      const stamp=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);
      if(stamp>=wall) return new Date(cursor);
      cursor+=60000;
    }
  }
  return new Date(guess);
}
function localToUTC(y,m,d,mins,lon){
  const loc=LOCATIONS[+locSelect.value]||LOCATIONS[0];
  return civilToUTC(y,m,d,mins,loc.tz);
}
''' +src[end:]
# Remove original localToUTC
src=re.sub(r'// Build a UTC instant whose \*local mean solar time\* at lon equals date\+mins\.\nfunction localToUTC\(y,m,d,mins,lon\)\{.*?\n\}', '', src, flags=re.S)
# Smooth color transition at horizon
src=src.replace("const dawn = hexToRgb('#ff8438');","const dawn = hexToRgb('#e2603c');")
# Peak-normalize to daily solar maximum (unless polar night)
src=src.replace('function orbColor(sAlt, mAlt, illum, peakColor){','function orbColor(sAlt, mAlt, illum, peakColor, peakAlt=90){')
src=src.replace('Math.pow(Math.sin(clamp(sAlt,0,90)*RAD), 0.55)', 'Math.pow(clamp(Math.sin(clamp(sAlt,0,90)*RAD)/Math.max(0.0001,Math.sin(clamp(peakAlt,0.01,90)*RAD)),0,1), 0.55)')
src=src.replace('orbColor(s.alt, mn.alt, mi.illum, peak.color)', 'orbColor(s.alt, mn.alt, mi.illum, peak.color, st.peak)')
src=src.replace('orbColor(sunAlt(i2,lat,lon).alt, moonAlt(i2,lat,lon).alt, moonIllum(i2).illum, peak.color)', 'orbColor(sunAlt(i2,lat,lon).alt, moonAlt(i2,lat,lon).alt, moonIllum(i2).illum, peak.color, st.peak)')
# timezone visible and clear accuracy disclaimer
src=src.replace("' · ' + Math.abs(lat).toFixed(4)","' · '+loc.tz+' · ' + Math.abs(lat).toFixed(4)")
src=src.replace('accurate to a few minutes for rise/set times','approximate preview calculations; astronomical accuracy is not yet certified')
src=src.replace('<h1>One colour, told by the sky</h1>', '<h1>One colour, told by the sky</h1><p style="color:#ffb35c;font-size:12px;margin-top:7px">Phase 1 preview · civil time zones enabled · ephemeris validation pending</p>')
# year slider initial alignment and leap year
src=src.replace('const MONTH_START=[0,31,59,90,120,151,181,212,243,273,304,334];','const MONTH_START=[0,31,59,90,120,151,181,212,243,273,304,334];')
src=src.replace('render();\n</script>', "$('yearSlider').max=daysInYearFn(parseSimDate().y)-1;\n$('yearSlider').value=dayOfYear(parseSimDate().y,parseSimDate().mo,parseSimDate().d)-1;\nrender();\n</script>")
# Make simulator reference implementation source module boundaries explicit
src=src.replace('/* ============ astronomy: sun ============ */','/* ============ MODULE: astronomy-preview (unvalidated approximate equations) ============ */\n/* ============ astronomy: sun ============ */')
src=src.replace('/* ============ seasonal peak colour ============ */','/* ============ MODULE: color-engine ============ */\n/* ============ seasonal peak colour ============ */')
src=src.replace('/* ============ state & UI ============ */','/* ============ MODULE: simulator UI / presentation ============ */\n/* ============ state & UI ============ */')
out=Path('/mnt/data/Solar_Orb_Simulator_Phase1.html');out.write_text(src)
print(out, len(src))
