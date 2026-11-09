
"use strict";
/* ============ helpers ============ */
const RAD = Math.PI/180, DEG = 180/Math.PI;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
function hexToRgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};}
function rgbStr(c,a){return a===undefined?`rgb(${c.r|0},${c.g|0},${c.b|0})`:`rgba(${c.r|0},${c.g|0},${c.b|0},${a})`;}
function mix(c1,c2,t){return{r:lerp(c1.r,c2.r,t),g:lerp(c1.g,c2.g,t),b:lerp(c1.b,c2.b,t)};}
function mixHex(h1,h2,t){return mix(hexToRgb(h1),hexToRgb(h2),t);}
function toHex(c){const p=v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0');return '#'+p(c.r)+p(c.g)+p(c.b);}
function fmtTime(mins){
  if(mins===null||mins===undefined||isNaN(mins)) return '—';
  mins=((mins%1440)+1440)%1440;
  let h=Math.floor(mins/60), m=Math.floor(mins%60);
  const ap=h>=12?'PM':'AM'; h=h%12; if(h===0)h=12;
  return h+':'+String(m).padStart(2,'0')+' '+ap;
}
function fmtDur(mins){
  if(isNaN(mins)) return '—';
  const h=Math.floor(mins/60), m=Math.round(mins%60);
  return h+'h '+String(m).padStart(2,'0')+'m';
}
/* Safari / file:// hardening: input[type=date] is not reliable everywhere —
   some Safari versions return an empty or free-typed value, and a downloaded
   copy opened locally must never crash render() on it. Parse defensively and
   fall back to today whenever the value isn't a real calendar date. */
function parseSimDate(){
  var el=document.getElementById('dateInput');
  var raw=el && el.value ? String(el.value).trim() : '';
  var m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
  if(m){
    var yy=+m[1], mm=+m[2], dd=+m[3];
    var probe=new Date(Date.UTC(yy,mm-1,dd));
    if(yy>=1900 && yy<=2200 && mm>=1 && mm<=12 && dd>=1 && dd<=31 &&
       probe.getUTCFullYear()===yy && probe.getUTCMonth()===mm-1 && probe.getUTCDate()===dd){
      return {y:yy, mo:mm, d:dd};
    }
  }
  var n=new Date();
  return {y:n.getFullYear(), mo:n.getMonth()+1, d:n.getDate()};
}

/* ============ MODULE: astronomy-preview (unvalidated approximate equations) ============ */
/* ============ astronomy: sun ============ */
// Phase 1: astronomy remains an approximate browser preview until ephemeris validation.
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
function sunCalc(dateUTC){ // dateUTC: JS Date (UTC instant)
  const JD = dateUTC.getTime()/864e5 + 2440587.5;
  const n = JD - 2451545.0;
  const L = (280.460 + 0.9856474*n) % 360;
  const g = ((357.528 + 0.9856003*n) % 360) * RAD;
  const lambda = ((L + 1.915*Math.sin(g) + 0.020*Math.sin(2*g)) % 360) * RAD;
  const eps = (23.439 - 0.0000004*n) * RAD;
  const ra = Math.atan2(Math.cos(eps)*Math.sin(lambda), Math.cos(lambda)) * DEG;
  const dec = Math.asin(Math.sin(eps)*Math.sin(lambda)) * DEG;
  return {ra:((ra%360)+360)%360, dec, lambdaDeg: lambda*DEG};
}
function sunAlt(dateUTC, lat, lon){
  const {ra, dec} = sunCalc(dateUTC);
  const JD = dateUTC.getTime()/864e5 + 2440587.5;
  let gmst = (280.46061837 + 360.98564736629*(JD-2451545)) % 360;
  let lst = (gmst + lon) % 360; if(lst<0)lst+=360;
  let ha = lst - ra; if(ha>180)ha-=360; if(ha<-180)ha+=360;
  const alt = Math.asin(Math.sin(dec*RAD)*Math.sin(lat*RAD)+Math.cos(dec*RAD)*Math.cos(lat*RAD)*Math.cos(ha*RAD))*DEG;
  const az = Math.atan2(Math.sin(ha*RAD), Math.cos(ha*RAD)*Math.sin(lat*RAD)-Math.tan(dec*RAD)*Math.cos(lat*RAD))*DEG+180;
  return {alt, az, dec};
}

function sunTimes(y,m,d,lat,lon){
  // sample the day every 4 min in local mean time, find horizon crossings
  let prev=null, rise=null, set=null, noonMin=720, peak=-90;
  for(let t=0;t<=1440;t+=4){
    const alt = sunAlt(localToUTC(y,m,d,t,lon),lat,lon).alt;
    if(alt>peak){peak=alt;noonMin=t;}
    if(prev!==null){
      if(prev.alt<0 && alt>=0 && rise===null) rise = prev.t + (0-prev.alt)/(alt-prev.alt)*4;
      if(prev.alt>=0 && alt<0) set = prev.t + (0-prev.alt)/(alt-prev.alt)*4;
    }
    prev={t,alt};
  }
  return {rise, set, noon:noonMin, peak, polar: rise===null&&set===null};
}

/* ============ astronomy: moon ============ */
function moonCoords(dateUTC){
  const d = dateUTC.getTime()/864e5 - 10957.5; // days since J2000 (JD-2451545)
  const L = ((218.316 + 13.176396*d)%360)*RAD;      // mean longitude
  const M = ((134.963 + 13.064993*d)%360)*RAD;      // mean anomaly
  const F = ((93.272 + 13.229350*d)%360)*RAD;       // mean distance
  const lonE = L + 6.289*RAD*Math.sin(M);
  const latE = 5.128*RAD*Math.sin(F);
  const eps = 23.4397*RAD;
  const x=Math.cos(lonE), y=Math.sin(lonE)*Math.cos(eps)-Math.tan(latE)*Math.sin(eps), z=Math.sin(lonE)*Math.sin(eps)+Math.tan(latE)*Math.cos(eps);
  const ra=Math.atan2(y,x)*DEG, dec=Math.atan2(z,Math.sqrt(x*x+y*y))*DEG;
  return {ra:((ra%360)+360)%360, dec};
}
function moonAlt(dateUTC, lat, lon){
  const {ra, dec} = moonCoords(dateUTC);
  const JD = dateUTC.getTime()/864e5 + 2440587.5;
  let gmst = (280.46061837 + 360.98564736629*(JD-2451545)) % 360;
  let lst = (gmst + lon) % 360; if(lst<0)lst+=360;
  let ha = lst - ra; if(ha>180)ha-=360; if(ha<-180)ha+=360;
  const alt = Math.asin(Math.sin(dec*RAD)*Math.sin(lat*RAD)+Math.cos(dec*RAD)*Math.cos(lat*RAD)*Math.cos(ha*RAD))*DEG;
  const az = Math.atan2(Math.sin(ha*RAD), Math.cos(ha*RAD)*Math.sin(lat*RAD)-Math.tan(dec*RAD)*Math.cos(lat*RAD))*DEG+180;
  return {alt, az};
}
function moonIllum(dateUTC){
  const synodic = 29.53058867;
  const age = (((dateUTC.getTime()/864e5 + 2440587.5) - 2451550.1) % synodic + synodic) % synodic;
  const illum = (1 - Math.cos(2*Math.PI*age/synodic))/2;
  return {age, illum};
}
function moonPhaseName(age, illum){
  if(age<1.2||age>28.6) return 'New Moon';
  if(age<6.0) return 'Waxing Crescent';
  if(age<8.4) return 'First Quarter';
  if(age<13.6) return 'Waxing Gibbous';
  if(age<16.2) return 'Full Moon';
  if(age<21.4) return 'Waning Gibbous';
  if(age<23.8) return 'Last Quarter';
  return 'Waning Crescent';
}
function moonTimes(y,m,d,lat,lon){
  let prev=null, rise=null, set=null;
  for(let t=0;t<=1440;t+=6){
    const alt = moonAlt(localToUTC(y,m,d,t,lon),lat,lon).alt;
    if(prev!==null){
      if(prev.alt<0 && alt>=0 && rise===null) rise = prev.t + (0-prev.alt)/(alt-prev.alt)*6;
      if(prev.alt>=0 && alt<0 && set===null) set = prev.t + (0-prev.alt)/(alt-prev.alt)*6;
    }
    prev={t,alt};
  }
  return {rise, set};
}

/* ============ MODULE: color-engine ============ */
/* ============ seasonal peak colour ============ */
const ANCHORS = [ // day-of-year anchors for palette ON
  {doy:355, hex:'#f0d48c', name:'Winter pale gold'},        // winter solstice
  {doy: 79, hex:'#f4c493', name:'Spring blush gold'},       // spring equinox (pale gold + pink blush)
  {doy:172, hex:'#fb7c22', name:'Summer amber–red'},        // summer solstice (amber→orange→hint of red)
  {doy:266, hex:'#dd7027', name:'Fall russet amber'},       // fall equinox (amber deepening to russet)
];
function seasonalPeak(doy, paletteOn, dec){
  if(!paletteOn){
    const s = clamp(dec/23.44,-1,1);           // -1 winter solstice, +1 summer (N hemisphere view via declination)
    const t = (s+1)/2;
    return {color: mixHex('#eed9a0','#ffab2e',t), name: t>0.66?'Deep amber (simple scale)':(t<0.33?'Pale straw gold (simple scale)':'Warm gold (simple scale)')};
  }
  // continuous blend around the year between the four anchors
  const pts = [
    {doy:355-365, hex:ANCHORS[0].hex, name:ANCHORS[0].name},
    ...ANCHORS,
    {doy:355+365, hex:ANCHORS[0].hex, name:ANCHORS[0].name},
    {doy: 79+365, hex:ANCHORS[1].hex, name:ANCHORS[1].name},
  ].sort((a,b)=>a.doy-b.doy);
  // normalise: find bracketing anchors for this doy (also try doy+365)
  let dd = doy;
  let a=null,b=null;
  for(let i=0;i<pts.length-1;i++){ if(dd>=pts[i].doy && dd<=pts[i+1].doy){a=pts[i];b=pts[i+1];break;} }
  if(!a){ dd=doy+365; for(let i=0;i<pts.length-1;i++){ if(dd>=pts[i].doy && dd<=pts[i+1].doy){a=pts[i];b=pts[i+1];break;} } }
  if(!a){ a=pts[0]; b=pts[1]; }
  const t = (dd-a.doy)/Math.max(1,(b.doy-a.doy));
  const color = mixHex(a.hex,b.hex,t);
  const name = t<0.4 ? a.name : (t>0.6 ? b.name : a.name+' → '+b.name.replace(/^(Winter|Spring|Summer|Fall) /,''));
  return {color, name};
}
function seasonName(month, lat){
  const north = lat>=0;
  const names = {winter:'Winter',spring:'Spring',summer:'Summer',fall:'Autumn'};
  let s;
  if(month===12||month<=2) s='winter'; else if(month<=5) s='spring'; else if(month<=8) s='summer'; else s='fall';
  if(!north){ s = {winter:'summer',summer:'winter',spring:'fall',fall:'spring'}[s]; }
  return names[s];
}

/* ============ orb colour model ============ */
const NAVY = hexToRgb('#0a0e2a');       // moon below horizon / new moon: dimmest
const INDIGO = hexToRgb('#43489e');     // moon up, low / partial
const SILVER = hexToRgb('#b9cdf2');     // full moon high: brightest silver-blue
function orbColor(sAlt, mAlt, illum, peakColor, peakAlt=90){
  if(sAlt >= 0){
    // day: dawn amber at horizon rising to the seasonal peak colour
    const dayT = clamp(Math.pow(clamp(Math.sin(clamp(sAlt,0,90)*RAD)/Math.max(0.0001,Math.sin(clamp(peakAlt,0.01,90)*RAD)),0,1), 0.55), 0, 1);
    const dawn = hexToRgb('#e2603c');
    const mid  = hexToRgb('#ffb03a');
    let c = dayT < 0.45 ? mix(dawn, mid, dayT/0.45) : mix(mid, peakColor, (dayT-0.45)/0.55);
    return {color:c, glow: 0.35 + dayT*0.65, mode:'day', dayT};
  }
  if(sAlt >= -12){
    // twilight: blend dusk rose down toward night; a rising moon pulls it indigo
    const tw = clamp((sAlt+12)/12, 0, 1); // 0 deep twilight, 1 sunset
    let c = mix(hexToRgb('#2c2a63'), hexToRgb('#e2603c'), Math.pow(tw,1.3));
    if(mAlt > -2){
      const moonPull = clamp((mAlt+2)/14,0,1) * (0.25 + 0.75*illum);
      c = mix(c, INDIGO, moonPull*0.55*(1-tw*0.5));
    }
    return {color:c, glow: 0.22 + tw*0.3, mode:'twilight', dayT:0};
  }
  // night: moon-driven
  if(mAlt > 0){
    const elevF = clamp(mAlt/38, 0, 1);
    const bright = clamp(illum * (0.35 + 0.65*elevF), 0, 1);
    const c = bright < 0.5 ? mix(NAVY, INDIGO, bright*2) : mix(INDIGO, SILVER, (bright-0.5)*2);
    return {color:c, glow: 0.10 + bright*0.55, mode:'night-moon', dayT:0, bright};
  }
  return {color: NAVY, glow: 0.07, mode:'night-dark', dayT:0, bright:0};
}
function kelvinFor(res, sAlt){
  if(res.mode==='day'){
    const k = lerp(2100, 5400, res.dayT);
    return Math.round(k/50)*50 + ' K · daylight';
  }
  if(res.mode==='twilight') return '≈ 2,600 K · dusk';
  if(res.mode==='night-moon') return 'Moonlight · silver-blue';
  return 'Moonless night';
}

/* ============ MODULE: simulator UI / presentation ============ */
/* ============ state & UI ============ */
const LOCATIONS = [ // top 20 US cities by population
  {name:'New York, NY', lat:40.7128, lon:-74.0060, tz:'America/New_York'},
  {name:'Los Angeles, CA', lat:34.0522, lon:-118.2437, tz:'America/Los_Angeles'},
  {name:'Chicago, IL', lat:41.8781, lon:-87.6298, tz:'America/Chicago'},
  {name:'Houston, TX', lat:29.7604, lon:-95.3698, tz:'America/Chicago'},
  {name:'Phoenix, AZ', lat:33.4484, lon:-112.0740, tz:'America/Phoenix'},
  {name:'Philadelphia, PA', lat:39.9526, lon:-75.1652, tz:'America/New_York'},
  {name:'San Antonio, TX', lat:29.4241, lon:-98.4936, tz:'America/Chicago'},
  {name:'San Diego, CA', lat:32.7157, lon:-117.1611, tz:'America/Los_Angeles'},
  {name:'Dallas, TX', lat:32.7767, lon:-96.7970, tz:'America/Chicago'},
  {name:'Austin, TX', lat:30.2672, lon:-97.7431, tz:'America/Chicago'},
  {name:'Jacksonville, FL', lat:30.3322, lon:-81.6557, tz:'America/New_York'},
  {name:'Fort Worth, TX', lat:32.7555, lon:-97.3308, tz:'America/Chicago'},
  {name:'San Jose, CA', lat:37.3387, lon:-121.8853, tz:'America/Los_Angeles'},
  {name:'Columbus, OH', lat:39.9612, lon:-82.9988, tz:'America/New_York'},
  {name:'Charlotte, NC', lat:35.2271, lon:-80.8431, tz:'America/New_York'},
  {name:'Indianapolis, IN', lat:39.7684, lon:-86.1581, tz:'America/Indiana/Indianapolis'},
  {name:'San Francisco, CA', lat:37.7749, lon:-122.4194, tz:'America/Los_Angeles'},
  {name:'Seattle, WA', lat:47.6062, lon:-122.3321, tz:'America/Los_Angeles'},
  {name:'Denver, CO', lat:39.7392, lon:-104.9903, tz:'America/Denver'},
  {name:'Washington, DC', lat:38.9072, lon:-77.0369, tz:'America/New_York'},
];
const $ = id => document.getElementById(id);
const locSelect=$('locSelect'), dateInput=$('dateInput'),
      slider=$('timeSlider'), orb=$('orb'), stage=$('stage');
let paletteOn = true, playing=false, playTimer=null;
let yearPlaying=false, yearTimer=null, yearIdx=0, yearPlayYear=null;
let _dayCache = {key:null, st:null, mt:null, vizKey:null, sunD:'', moonD:'', tlBg:''};

/* The <option>s are already in the HTML, so the picker works in a downloaded
   local copy even before this script runs. Only build them if they are
   somehow missing, and never overwrite a selection the markup already set. */
if(!locSelect.options.length){
  LOCATIONS.forEach((l,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=l.name; locSelect.appendChild(o); });
  locSelect.value = 17; // Seattle — nearest top-20 city to home
}
/* ============ Edge markers on the orb (no ring, no ticks) ============
   The orb itself is 83.333% of the 360 viewBox, so its edge sits at r=150.
   Position still reads as a 24h dial: top = midnight, right = 6 AM,
   bottom = noon, left = 6 PM. A rise is a semicircle bulging OUT above the
   edge; a set is a semicircle tucked IN below the edge. Sun = red-orange,
   moon = white. Current time = black dot centred exactly on the edge. */
const ORB_R = 150;
let markMode = 'perimeter'; // 'perimeter' | 'halo' | 'horizon' | 'semicircles' | 'none'
function ringPoint(mins,r){ const th=(mins/1440)*Math.PI*2; return {x:180+Math.sin(th)*r, y:180-Math.cos(th)*r}; }
function arcPath(startMins, endMins, r){
  if(startMins===null||startMins===undefined||isNaN(startMins)||endMins===null||endMins===undefined||isNaN(endMins)) return null;
  let dur = endMins - startMins; if(dur<=0) dur += 1440; if(dur>=1440) return null;
  const a=ringPoint(startMins,r), b=ringPoint(startMins+dur,r);
  const large = dur>720 ? 1 : 0;
  return 'M'+a.x.toFixed(1)+','+a.y.toFixed(1)+' A'+r+','+r+' 0 '+large+' 1 '+b.x.toFixed(1)+','+b.y.toFixed(1);
}
function setArc(id, d){ const el=document.getElementById(id); if(!el) return; if(!d){ el.style.display='none'; return; } el.setAttribute('d',d); el.style.display=''; }
const MARK_LEGENDS = {
  perimeter: 'The <b>Hairline Halo — on the edge itself</b> (the default): a hairline that <i>is</i> part of the perimeter — <span class="sw-sun">gold from sunrise to sunset</span>, <span class="sw-moon">pale silver just inside it from moonrise to moonset</span>. Its ends <i>are</i> the events — no separate marks.',
  halo: 'An <b>offset halo floating just outside</b> the orb — <span class="sw-sun">gold arc from sunrise to sunset</span>, <span class="sw-moon">fainter silver arc, a touch further out, from moonrise to moonset</span>. The orb itself stays pure; the halo carries the events.',
  horizon: 'No circle at all — <b>one hairline through the centre</b> is the horizon. Dots on it read left → right through the day: <span class="sw-sun">gold for sunrise, then sunset</span>, <span class="sw-moon">silver-white for moonrise, then moonset</span> (moon dots sit just off the line so all four stay readable).',
  semicircles: 'A semicircle sitting <b>above / outside</b> the edge is a rise, one tucked <b>below / inside</b> the edge is a set — <span class="sw-sun">red-orange for sunrise &amp; sunset</span>, <span style="color:#fff;font-weight:700">white for moonrise &amp; moonset</span>.',
  none: 'No event marks at all — the pure orb, colour only. Sunrise, sunset, moonrise and moonset are still listed in the Sun and Moon tiles below.'
};
function semicirclePath(mins, outward){
  // A true semicircle: diameter lies on the tangent at that point of the edge,
  // drawn with a real SVG arc (rx = ry = R, exactly half a circle) — no Bézier
  // dome, no outline. Small and flat so it reads as a quiet notch on the rim.
  // Endpoints ordered tangent −→+ and the tangent runs clockwise (direction of
  // increasing time), so sweep=1 bulges radially outward (rise) and sweep=0
  // bulges inward (set), at every position around the face.
  const th=(mins/1440)*Math.PI*2;
  const dx=Math.sin(th), dy=-Math.cos(th);       // radial outward unit
  const tx=Math.cos(th), ty=Math.sin(th);        // tangent unit
  const R=9, cx=180+dx*ORB_R, cy=180+dy*ORB_R;
  const x1=cx-tx*R, y1=cy-ty*R, x2=cx+tx*R, y2=cy+ty*R;
  const sweep = outward ? 1 : 0;
  return 'M'+x1.toFixed(1)+','+y1.toFixed(1)+' A'+R+','+R+' 0 0 '+sweep+' '+x2.toFixed(1)+','+y2.toFixed(1)+' Z';
}
function setMark(id, mins){
  const el=document.getElementById(id); if(!el) return;
  if(markMode!=='semicircles'||mins===null||mins===undefined||isNaN(mins)){ el.style.display='none'; return; }
  const outward = (id==='markSunrise'||id==='markMoonrise');
  el.setAttribute('d', semicirclePath(mins, outward));
  el.style.display='';
}
function setHorizonDot(id, mins, y){
  const el=document.getElementById(id); if(!el) return;
  if(mins===null||mins===undefined||isNaN(mins)){ el.style.display='none'; return; }
  el.style.display='';
  el.setAttribute('cx',(32+(mins/1440)*296).toFixed(1)); el.setAttribute('cy',y);
}
function updateRing(st, mt, mins){
  setMark('markSunrise', st.polar?null:st.rise);
  setMark('markSunset',  st.polar?null:st.set);
  setMark('markMoonrise', mt.rise);
  setMark('markMoonset',  mt.set);
  // Offset halo — floating outside the orb (sun r=165, moon r=174)
  setArc('haloSun',  markMode==='halo' && !st.polar ? arcPath(st.rise, st.set, 165) : null);
  setArc('haloMoon', markMode==='halo' ? arcPath(mt.rise, mt.set, 174) : null);
  // Hairline Halo — on the edge itself, the default (sun exactly on r=150, moon just inside at r=143)
  setArc('perimSun',  markMode==='perimeter' && !st.polar ? arcPath(st.rise, st.set, ORB_R) : null);
  setArc('perimMoon', markMode==='perimeter' ? arcPath(mt.rise, mt.set, ORB_R-7) : null);
  // Horizon Chord
  const hg=document.getElementById('horizonGroup');
  if(hg) hg.style.display = markMode==='horizon' ? '' : 'none';
  if(markMode==='horizon'){
    setHorizonDot('horSunrise', st.polar?null:st.rise, 180);
    setHorizonDot('horSunset',  st.polar?null:st.set, 180);
    setHorizonDot('horMoonrise', mt.rise, 171);
    setHorizonDot('horMoonset',  mt.set, 189);
  }
  const pt=ringPoint(mins, ORB_R), dot=document.getElementById('timeDot');
  if(dot){ dot.setAttribute('cx',pt.x.toFixed(1)); dot.setAttribute('cy',pt.y.toFixed(1)); }
}

const today = new Date();
if(!dateInput.value){
  dateInput.value = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
}
slider.value = today.getHours()*60 + today.getMinutes();

locSelect.addEventListener('change', render); // changing city mid year-play keeps playing, in the new city
locSelect.addEventListener('input', render);
dateInput.addEventListener('change', ()=>{ stopYearPlay(); render(); });
dateInput.addEventListener('input', ()=>{ stopYearPlay(); render(); });
slider.addEventListener('input', ()=>{ stopPlay(); stopYearPlay(); render(); });
$('nowBtn').addEventListener('click', ()=>{
  stopYearPlay();
  const n=new Date();
  dateInput.value = n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
  slider.value = n.getHours()*60+n.getMinutes();
  render();
});
/* Respect whatever the markup already has selected, so a downloaded copy
   reopens with the same event-mark style and palette it was saved with.
   (In the hosted page these are simply the defaults: Hairline Halo on the
   edge itself, seasonal palette on.) */
markMode = $('markSelect').value || markMode;
(function(){ var lg=$('ringLegendMode'); if(lg && MARK_LEGENDS[markMode]) lg.innerHTML = MARK_LEGENDS[markMode]; })();
if($('palOff').classList.contains('on')) paletteOn=false;
$('markSelect').addEventListener('change', ()=>{
  markMode = $('markSelect').value;
  const lg=$('ringLegendMode'); if(lg && MARK_LEGENDS[markMode]) lg.innerHTML = MARK_LEGENDS[markMode];
  render();
});
$('palOn').addEventListener('click', ()=>{ paletteOn=true; $('palOn').classList.add('on'); $('palOff').classList.remove('on'); render(); });
$('palOff').addEventListener('click', ()=>{ paletteOn=false; $('palOff').classList.add('on'); $('palOn').classList.remove('on'); render(); });
/* Collapsible tiles: Controls / Sun / Moon can be folded away so only the orb stage stays on screen */
document.querySelectorAll('[data-collapse]').forEach(function(btn){
  btn.addEventListener('click', function(){
    var target=document.getElementById(btn.getAttribute('data-collapse'));
    if(!target) return;
    var collapsed=target.classList.toggle('is-collapsed');
    btn.setAttribute('aria-expanded', collapsed?'false':'true');
    btn.innerHTML = collapsed ? '<span class="chev">▾</span> Expand' : '<span class="chev">▾</span> Collapse';
  });
});
/* ============ Save / share: download this page as one standalone file ============
   Serializes the current document into a Blob and downloads it as
   solar-orb-clock.html. Written in plain ES5 style and wrapped in try/catch
   so it degrades gracefully in older Safari, where blob downloads can open
   the file in-tab instead — the status line then points at Share → Save to
   Files. The object URL is revoked on a delay, never immediately, because
   Safari cancels in-flight downloads if it is revoked too early. */
(function(){
  var btn=document.getElementById('downloadBtn');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var status=document.getElementById('saveStatus');
    function note(msg){ if(status) status.textContent=msg; }
    try{
      /* Reflect the current key settings into attributes first, so the saved
         copy reopens with the same city, date and event-mark style. (Class
         changes such as the palette toggle are already in the markup.) */
      try{
        var sync=function(id){
          var s=document.getElementById(id); if(!s || !s.options) return;
          for(var i=0;i<s.options.length;i++){
            if(i===s.selectedIndex) s.options[i].setAttribute('selected','selected');
            else s.options[i].removeAttribute('selected');
          }
        };
        sync('locSelect'); sync('markSelect');
        var di=document.getElementById('dateInput');
        if(di && di.value) di.setAttribute('value', di.value);
      }catch(e){}
      var html='<!doctype html>\n'+document.documentElement.outerHTML;
      var blob=new Blob([html],{type:'text/html'});
      var urlApi=window.URL||window.webkitURL;
      var url=urlApi.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;
      a.download='solar-orb-clock.html';
      document.body.appendChild(a);
      a.click();
      if(a.parentNode) a.parentNode.removeChild(a);
      setTimeout(function(){ try{ urlApi.revokeObjectURL(url); }catch(e){} }, 4000);
      note('Saved as solar-orb-clock.html — look in Downloads or Files, then open it in Safari. If the file opened in this tab instead of downloading (older iOS Safari), tap Share → Save to Files, then reopen it from Files via Share → Open in Safari.');
    }catch(err){
      note("The download didn't start in this browser — use Share → Save to Files instead, then reopen the saved file from Files via Share → Open in Safari.");
    }
  });
})();

function stopPlay(){ playing=false; if(playTimer)clearInterval(playTimer); playTimer=null; $('playBtn').textContent='▶ Play day'; }
$('playBtn').addEventListener('click', ()=>{
  if(playing){ stopPlay(); return; }
  stopYearPlay();
  playing=true; $('playBtn').textContent='⏸ Pause';
  playTimer=setInterval(()=>{ slider.value=(+slider.value+4)%1440; render(); }, 50);
});

/* ============ Play whole year — 4.8 seconds per day + month slider ============
   One full midnight-to-midnight day takes 4.8s, so the orb runs through
   sunrise -> seasonal noon peak -> sunset -> moonlit night for each day.
   The slider underneath (0..364) IS the year position: while playing it
   tracks playback, and dragging it seeks — playback resumes from the
   dropped day, still at 4.8s/day. A full year at this speed is ~29 min,
   which is exactly why the slider exists: skip to the month you want. */
const MONTH_NAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_START=[0,31,59,90,120,151,181,212,243,273,304,334];
const DAY_MS = 4800; // 4.8 seconds per day
let yearRaf=null, yearLastTs=0, yearDayFloat=0; // fractional day-of-year position
let yearTotalDays=365; // MUST be declared: the script is strict-mode, so assigning
                       // to an undeclared yearTotalDays threw a ReferenceError that
                       // silently killed Play whole year and the year slider.
function daysInYearFn(y){ return ((y%4===0 && y%100!==0) || y%400===0) ? 366 : 365; }
function applyYearPosition(){
  const total=yearTotalDays;
  const wrapped=((yearDayFloat%total)+total)%total;
  const dayIdx=Math.floor(wrapped);
  const minsOfDay=Math.floor((wrapped-dayIdx)*1440);
  const dt=new Date(Date.UTC(yearPlayYear, 0, 1+dayIdx));
  const m=dt.getUTCMonth()+1, d=dt.getUTCDate();
  dateInput.value=yearPlayYear+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  slider.value=minsOfDay;
  const ys=$('yearSlider'); if(ys) ys.value=dayIdx;
  const loc=(LOCATIONS[+locSelect.value]||LOCATIONS[0]).name;
  $('yearStatus').textContent=MONTH_NAMES[m-1]+' '+d+', '+yearPlayYear+' · '+fmtTime(minsOfDay)+' · Day '+(dayIdx+1)+' of '+total+' · '+loc+' · 4.8s/day';
  render();
}
function yearFrame(ts){
  if(!yearPlaying) return;
  yearRaf=requestAnimationFrame(yearFrame);
  if(!yearLastTs) yearLastTs=ts;
  const dtMs=ts-yearLastTs; yearLastTs=ts;
  if(dtMs>250) return; // tab was hidden — don't jump
  yearDayFloat += dtMs/DAY_MS;
  if(yearDayFloat>=yearTotalDays) yearDayFloat-=yearTotalDays;
  applyYearPosition();
}
function stopYearPlay(keepStatus){
  yearPlaying=false;
  if(yearRaf) cancelAnimationFrame(yearRaf);
  yearRaf=null; yearTimer=null; yearLastTs=0;
  orb.classList.remove('no-trans');
  const b=$('yearPlayBtn');
  if(b){ b.textContent='▶ Play whole year'; b.classList.remove('playing'); b.setAttribute('aria-pressed','false'); }
  if(!keepStatus) $('yearStatus').textContent='365 days · 4.8 sec per day · drag the slider to jump to a month';
}
function startYearPlay(fromDay){
  stopPlay();
  yearPlayYear=parseSimDate().y;
  yearTotalDays=daysInYearFn(yearPlayYear);
  const ys=$('yearSlider'); if(ys) ys.max=yearTotalDays-1;
  if(typeof fromDay==='number'){ yearDayFloat=fromDay; }
  else {
    // start from the slider if it was scrubbed, else Jan 1
    yearDayFloat = ys ? (+ys.value||0) : 0;
    // preserve time of day the user had set, as a fraction into that day
    yearDayFloat += (+slider.value||0)/1440;
  }
  yearPlaying=true;
  orb.classList.add('no-trans');
  const b=$('yearPlayBtn');
  b.textContent='⏸ Pause year'; b.classList.add('playing'); b.setAttribute('aria-pressed','true');
  yearLastTs=0;
  applyYearPosition();
  yearRaf=requestAnimationFrame(yearFrame);
}
$('yearPlayBtn').addEventListener('click', ()=>{ yearPlaying ? stopYearPlay(true) : startYearPlay(); });
(function wireYearSlider(){
  const ys=$('yearSlider'); if(!ys) return;
  ys.addEventListener('input', ()=>{
    const day=+ys.value||0;
    if(yearPlaying){
      yearDayFloat=day+(yearDayFloat-Math.floor(yearDayFloat)); yearLastTs=0; applyYearPosition();
    } else {
      // Scrubbing while paused: jump the date to that day (keeping time of day), and remember it as the play start
      yearPlayYear=parseSimDate().y;
      yearTotalDays=daysInYearFn(yearPlayYear);
      yearDayFloat=day+(+slider.value||0)/1440;
      const dt=new Date(Date.UTC(yearPlayYear,0,1+day));
      const m=dt.getUTCMonth()+1, d=dt.getUTCDate();
      dateInput.value=yearPlayYear+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      $('yearStatus').textContent=MONTH_NAMES[m-1]+' '+d+', '+yearPlayYear+' · Day '+(day+1)+' — press Play whole year to run at 4.8s/day from here';
      render();
    }
  });
})();

/* moon face drawing */
function drawMoon(age, illum){
  const cv=$('moonCanvas'), ctx=cv.getContext('2d'), R=30, cx=36, cy=36;
  ctx.clearRect(0,0,72,72);
  ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.fillStyle='#141a33'; ctx.fill();
  ctx.strokeStyle='#39426a'; ctx.stroke();
  const waxing = age < 14.77;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.clip();
  ctx.fillStyle='#dbe6fb';
  const k = Math.cos(2*Math.PI*age/29.53058867); // terminator factor
  ctx.beginPath();
  if(waxing){ ctx.arc(cx,cy,R,-Math.PI/2,Math.PI/2,false); ctx.ellipse(cx,cy,Math.abs(k)*R,R,0,Math.PI/2,-Math.PI/2,k>0); }
  else { ctx.arc(cx,cy,R,Math.PI/2,Math.PI*1.5,false); ctx.ellipse(cx,cy,Math.abs(k)*R,R,0,-Math.PI/2,Math.PI/2,k>0); }
  ctx.fill();
  ctx.restore();
}

/* arc paths */
function buildArc(y,m,d,lat,lon,which){
  // x: 20..540 maps local time 0..24h is wrong for an arc; instead map azimuth-ish:
  // classic sky arc: x maps hour angle across the day (sunrise left, sunset right is wrong too —
  // we map *time of day* 0..24 across the width and elevation to height, showing both bodies' daily tracks)
  let pts=[];
  for(let t=0;t<=1440;t+=15){
    const inst=localToUTC(y,m,d,t,lon);
    const a = which==='sun' ? sunAlt(inst,lat,lon).alt : moonAlt(inst,lat,lon).alt;
    const x = 20 + (t/1440)*520;
    const yy = 168 - clamp(a,-32,90)/90*148 + Math.min(0,-a)*0.0; // above horizon up; below handled by clamp into band
    const y2 = a>=0 ? 168 - (a/90)*148 : 168 + clamp(-a,0,32)/32*34;
    pts.push(x.toFixed(1)+','+y2.toFixed(1));
  }
  return 'M'+pts.join(' L');
}
function arcXY(t, alt){
  const x = 20 + (t/1440)*520;
  const y = alt>=0 ? 168 - (alt/90)*148 : 168 + clamp(-alt,0,32)/32*34;
  return {x,y};
}

/* timeline markers */
function setMarkers(st, mt){
  const bar=$('tlBar');
  bar.querySelectorAll('.tl-marker').forEach(e=>e.remove());
  const add=(mins,label,moon)=>{
    if(mins===null||mins===undefined||isNaN(mins))return;
    const el=document.createElement('div'); el.className='tl-marker'+(moon?' moon':'');
    el.style.left=(mins/1440*100)+'%';
    el.innerHTML='<span>'+label+'<br>'+fmtTime(mins)+'</span>';
    bar.appendChild(el);
  };
  add(st.rise,'☀↑',false); add(st.set,'☀↓',false); add(mt.rise,'☾↑',true); add(mt.set,'☾↓',true);
}

/* ============ render ============ */
function render(){
  const loc = LOCATIONS[+locSelect.value] || LOCATIONS[0];
  const lat = loc.lat, lon = loc.lon;
  $('locCoords').textContent = loc.name + ' · '+loc.tz+' · ' + Math.abs(lat).toFixed(4) + '° ' + (lat>=0?'N':'S') + ', ' + Math.abs(lon).toFixed(4) + '° ' + (lon>=0?'E':'W');
  const _pd = parseSimDate();
  const y=_pd.y, mo=_pd.mo, d=_pd.d;
  const mins = isNaN(+slider.value) ? 720 : +slider.value;
  const doy = dayOfYear(y,mo,d);

  const inst = localToUTC(y,mo,d,mins,lon);
  const s = sunAlt(inst,lat,lon);
  const mn = moonAlt(inst,lat,lon);
  /* Rise/set times, arc paths and the day spectrum only depend on the date
     and place, so cache them per day — during Play Whole Year the same day
     is rendered many times as the hours sweep past, and recomputing them
     every frame would waste most of the frame budget. */
  const dayKey = y+'-'+mo+'-'+d+'|'+lat+'|'+lon;
  if(_dayCache.key !== dayKey){
    _dayCache = {key:dayKey, st:sunTimes(y,mo,d,lat,lon), mt:moonTimes(y,mo,d,lat,lon), vizKey:null, sunD:'', moonD:'', tlBg:''};
  }
  const st = _dayCache.st;
  const mt = _dayCache.mt;
  const mi = moonIllum(inst);
  const peak = seasonalPeak(doy, paletteOn, s.dec);

  const res = orbColor(s.alt, mn.alt, mi.illum, peak.color, st.peak);
  const c = res.color, colStr = rgbStr(c), hex = toHex(c);
  orb.style.background = colStr;
  orb.style.boxShadow = `0 0 ${50+res.glow*70}px ${8+res.glow*16}px ${rgbStr(c,0.28+res.glow*0.3)}, 0 0 ${130+res.glow*110}px ${30+res.glow*30}px ${rgbStr(c,0.10+res.glow*0.16)}`;
  stage.style.setProperty('--amb', rgbStr(c, 0.10));
  $('swatch').style.background = colStr;
  $('hexRead').textContent = hex.toUpperCase();
  $('kelvinRead').textContent = kelvinFor(res, s.alt);

  $('clockTime').textContent = fmtTime(mins);
  $('sliderTime').textContent = fmtTime(mins);
  let phase, sub;
  if(res.mode==='day'){
    phase = s.alt > st.peak*0.82 ? 'Near solar noon — peak warmth' : (mins < st.noon ? 'Morning — warming as the sun climbs' : 'Afternoon — cooling from the peak');
    sub = 'Sun elevation ' + s.alt.toFixed(1) + '° · warmest at solar noon (' + fmtTime(st.noon) + ')';
  } else if(res.mode==='twilight'){
    phase = mins < 720 ? 'Dawn twilight' : 'Dusk twilight';
    sub = (mins<720 ? 'Sunrise at '+fmtTime(st.rise) : 'Sunset at '+fmtTime(st.set)) + (mn.alt>-2 ? ' · moon already up — indigo creeping in' : '');
  } else if(res.mode==='night-moon'){
    phase = 'Night — moon glow';
    sub = moonPhaseName(mi.age, mi.illum) + ' · ' + Math.round(mi.illum*100) + '% lit · moon elevation ' + mn.alt.toFixed(1) + '°';
  } else {
    phase = 'Night — moonless dark';
    sub = 'Moon is below the horizon · orb at its dimmest navy';
  }
  $('clockPhase').textContent = phase;
  $('clockPhase').style.color = res.mode.startsWith('night') ? '#a9bcf0' : '#ffb35c';
  $('clockSub').textContent = sub;

  /* info: sun & season */
  $('rSunrise').textContent = st.polar ? (st.peak>0?'Polar day':'Polar night') : fmtTime(st.rise);
  $('rSunset').textContent = st.polar ? '—' : fmtTime(st.set);
  $('rNoon').textContent = fmtTime(st.noon);
  $('rDayLen').innerHTML = st.polar ? (st.peak>0?'24h daylight':'0h daylight') : fmtDur(st.set-st.rise) + '<small>' + (st.set-st.rise>=720?'long day':'short day') + ' · sunrise→sunset</small>';
  $('rSunElev').textContent = s.alt.toFixed(1)+'°' + (s.alt<0?' (below horizon)':'');
  $('rPeakElev').textContent = st.peak.toFixed(1)+'°';
  const season = seasonName(mo, lat);
  $('rSeason').innerHTML = season + '<small>declination ' + s.dec.toFixed(1) + '°</small>';
  $('rTint').innerHTML = (paletteOn ? peak.name : peak.name) + '<small>' + hexFor(peak.color) + (paletteOn?' · seasonal palette ON':' · seasonal palette OFF') + '</small>';

  /* info: moon */
  const pName = moonPhaseName(mi.age, mi.illum);
  $('rMoonName').textContent = pName;
  $('rMoonSub').textContent = 'Moon age ' + mi.age.toFixed(1) + ' days · ' + (mn.alt>0 ? 'currently above the horizon' : 'currently below the horizon');
  $('rMoonIllum').textContent = Math.round(mi.illum*100)+'%';
  $('rMoonrise').textContent = mt.rise===null?'No moonrise today':fmtTime(mt.rise);
  $('rMoonset').textContent = mt.set===null?'No moonset today':fmtTime(mt.set);
  $('rMoonElev').textContent = mn.alt.toFixed(1)+'°' + (mn.alt<0?' (below horizon)':'');
  $('rNightGlow').innerHTML = res.mode==='night-moon'
    ? 'Indigo silver-blue<small>brightness ' + Math.round((res.bright||0)*100) + '% of full-moon peak</small>'
    : (res.mode==='night-dark' ? 'Deep navy — moon down<small>the orb rests at its coolest</small>' : '— (daytime)<small>night glow follows the moon</small>');
  drawMoon(mi.age, mi.illum);

  /* arc + day spectrum (cached per day — see above) */
  const vizKey = dayKey+'|'+(paletteOn?'on':'off')+'|'+toHex(peak.color);
  if(_dayCache.vizKey !== vizKey){
    _dayCache.vizKey = vizKey;
    _dayCache.sunD = buildArc(y,mo,d,lat,lon,'sun');
    _dayCache.moonD = buildArc(y,mo,d,lat,lon,'moon');
    let stops=[];
    for(let t=0;t<=1440;t+=30){
      const i2=localToUTC(y,mo,d,t,lon);
      const r2=orbColor(sunAlt(i2,lat,lon).alt, moonAlt(i2,lat,lon).alt, moonIllum(i2).illum, peak.color, st.peak);
      stops.push(toHex(r2.color)+' '+(t/1440*100).toFixed(1)+'%');
    }
    _dayCache.tlBg = 'linear-gradient(90deg,'+stops.join(',')+')';
  }
  $('sunPath').setAttribute('d', _dayCache.sunD);
  $('moonPath').setAttribute('d', _dayCache.moonD);
  const sp = arcXY(mins, s.alt), mp = arcXY(mins, mn.alt);
  $('sunDot').setAttribute('cx',sp.x); $('sunDot').setAttribute('cy',sp.y);
  $('sunDot').setAttribute('fill', s.alt<0 ? '#5a6080' : '#ffd76a');
  $('moonDot').setAttribute('cx',mp.x); $('moonDot').setAttribute('cy',mp.y);
  $('moonDot').setAttribute('fill', mn.alt<0 ? '#4a5478' : '#c9d6f5');

  /* timeline: the orb's colour across the whole day (gradient cached above) */
  $('tlFill').style.background = _dayCache.tlBg;
  $('tlHead').style.left = (mins/1440*100)+'%';
  if(_dayCache.markersKey !== dayKey){ _dayCache.markersKey = dayKey; setMarkers(st, mt); }

  /* 24-hour ring: sunrise / sunset / moonrise / moonset ticks + time dot */
  updateRing(st, mt, mins);
}
function hexFor(c){ return toHex(c).toUpperCase(); }

$('yearSlider').max=daysInYearFn(parseSimDate().y)-1;
$('yearSlider').value=dayOfYear(parseSimDate().y,parseSimDate().mo,parseSimDate().d)-1;
render();
