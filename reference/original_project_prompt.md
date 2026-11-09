# Solar Orb Clock — prompt and sample code for OpenAI

Use this file in two parts:

1. Paste the prompt in Part 1 into a new OpenAI conversation. It explains the whole project, what is decided, and what is still open.
2. Upload or paste the sample code in Part 2 in the same conversation. It is the reference implementation for the orb colour and the sunrise / sunset and moonrise / moonset halo rings. Ask OpenAI to work from that code, not to invent a different colour model.

Nothing in this project has been ordered yet, and the exact LED ring part is not locked — see the open decisions at the end.

---

## Part 1 — Copy-paste prompt

Copy everything inside the two boxes below, in order — together they are one prompt.

```text
You are helping me design and build a physical clock called the Solar Orb Clock.
Please read this whole brief before suggesting changes, and work from the
sample code I will upload with it. If something here conflicts with the code,
ask me which one wins instead of silently picking one.

WHAT IT IS
A table / bookshelf clock with no hands, no numbers, and no conventional dial.
A single frosted glass orb glows in one colour, and that colour is the time
display. It is ambient and glanceable, not precise. Exact minutes, if ever
shown, must stay quiet and secondary.

THE COLOUR IS THE CLOCK
- Daytime: the orb warms as the sun climbs. It is warmest at solar noon and
  cools again toward sunset. Warmth follows the sun's actual elevation for
  the chosen location and date, not just the clock time.
- Dawn / sunrise: amber-orange at the horizon.
- Morning to noon: amber deepening toward the day's peak colour.
- Afternoon to sunset: the same scale in reverse, through dusk rose.
- Twilight (sun 0 to -12 degrees): blend from dusk rose down toward night.
  If the moon is rising, pull the colour toward indigo.
- Night: the sun hands over to the moon.
  - Moon up: cool silver-blue / indigo. Brightness and blueness follow both
    moon phase (illumination) and moon elevation.
  - Full moon, high: brightest silver-blue.
  - New moon, or moon below the horizon: dimmest deep navy.
  - Moon rising as night falls should visibly shift the orb toward indigo.

SEASONAL TINT
The peak (solar noon) colour changes slowly through the year, blended
smoothly by date with no hard jumps. A toggle turns this on or off.
- Palette ON anchors:
  - Winter solstice: pale gold #f0d48c
  - Spring equinox: blush gold #f4c493 (pale gold with a pink blush)
  - Summer solstice: amber-red #fb7c22 (amber through orange, hint of red)
  - Fall equinox: russet amber #dd7027 (amber deepening to russet)
- Palette OFF (simple scale): interpolate by solar declination between
  pale straw gold #eed9a0 (winter) and deep amber #ffab2e (summer).
```

```text
FORM — THE CUBE BUILD (current version)
- A cube about 170 mm (6.7 in) on each side, made from two solid wood
  blocks that meet flush. There is no gap and no exposed strip of orb
  around the middle — the seam is just the split line where the halves meet.
- Inside is one frosted glass orb, 150 mm diameter. Reference part discussed:
  a BOKT 150 mm frosted globe. Note: that globe is a lamp-shade globe with a
  67 mm neck opening, not a closed sphere, so the opening needs a place in
  the design (facing down into the cavity).
- Circular cutouts on all four vertical sides — front, back, left, right.
  The orb bulges into each cutout and should sit flush against the diameter
  of the cutout, with no visible gap between orb and wood.
  - Front / back cutouts: about 144-145 mm diameter, with a halo ring.
  - Left / right cutouts: about 120 mm diameter, plain windows, no ring.
- Top and bottom stay solid wood. Case style is minimal: Scandinavian /
  Japanese modern / Apple-like restraint. No ornate decoration.

HALO RINGS — SUNRISE / SUNSET AND MOONRISE / MOONSET
- Two circular LED rings, one on the front face and one on the back face.
  - Front ring = sun: a gold arc lit from sunrise to sunset.
  - Back ring = moon: a silver / pale silver-blue arc lit from moonrise
    to moonset.
- Each ring is a 24-hour dial: LED 0 at the top = midnight, then clockwise,
  right = 06:00, bottom = noon, left = 18:00.
- The ends of each arc ARE the events. The start of the gold arc is sunrise,
  the end is sunset. The start of the silver arc is moonrise, the end is
  moonset. A brighter travelling "now" bead moves around the active ring.
- The LEDs must not read as individual dots. Each ring sits recessed in a
  routed groove in the wood, masked / diffused (frosted resin fill flush
  with the wood surface was discussed) so the arc reads as one smooth halo.
- Ring size is NOT locked — see "Open decisions" below. My preference has
  been a 48-LED ring (30 minutes per LED). I have also been considering a
  60-LED NeoPixel ring (24 minutes per LED, smoother arc). Do not assume
  dimensions, part numbers, or availability for either until I confirm them.
  Write any code so the LED count is a single configurable constant.

ELECTRONICS — SELF-CONTAINED, NO PI ZERO, NO PHONE APP REQUIRED
- Controller: Seeed XIAO ESP32-C6 (21 x 17.8 mm), recessed underneath the
  orb cavity in the bottom half, pluggable via USB-C through a channel
  routed out a side face.
- ALL logic runs on the ESP32 itself: sun elevation, sunrise / sunset,
  solar noon, moon phase / illumination, moon elevation, moonrise /
  moonset, the seasonal peak colour, the orb colour, and both halo arcs.
  It sets time from NTP on boot over Wi-Fi; an optional DS3231 real-time
  clock covers offline use. There is no required cloud API and no polling
  of an external colour service in version 1.
- Core orb light: an RGBW LED source inside the orb (a 7-LED NeoPixel
  Jewel, SK6812 RGBW warm white, is the reference discussed). Use the white
  channel for cleaner pale gold / silver tones where it helps.
- Power: plugged in only, USB-C 5 V. No battery in this build.
- Brightness must be capped in software. Full white on the orb plus both
  rings would exceed a small 5 V supply, so treat a cap (for example,
  knob 100% = 40% PWM) as a design parameter to tune in the wood, not
  an afterthought.
- Update cadence: colour changes slowly. Recalculating every 60 seconds
  is plenty; the halo bead should still move smoothly.

WHAT I WANT FROM YOU
- Help me improve, test, and port the uploaded sample code — first in
  Python for clarity, then to Arduino / C++ for the ESP32-C6.
- Keep the colour model above. If you propose a different colour, show it
  as an RGB / RGBW value and explain which sun or moon condition it is for.
- Flag power, heat, and physical-fit problems early. The orb, LEDs, and
  controller are enclosed in wood.
- Do not redesign the form, add a conventional display, add hands/numbers,
  or add features I have not asked for without saying so explicitly.
- Ask me before assuming: location / timezone handling, the exact ring
  part and LED count, wood species, or whether the seasonal palette is on.
```

### Hardware at a glance

| Part | Current choice | Notes |
| --- | --- | --- |
| Cube | ~170 mm, two wood halves, flush | Cutouts on all 4 sides; top/bottom solid |
| Orb | 150 mm frosted glass globe | Sits flush against the cutout diameter; no visible gap |
| Front / back windows | ~144–145 mm | Halo ring around each |
| Left / right windows | ~120 mm | Plain orb windows, no ring |
| Controller | Seeed XIAO ESP32-C6, 21 × 17.8 mm | Recess underneath; USB-C channel out a side face |
| Orb light | RGBW LED source inside orb | 7-LED NeoPixel Jewel SK6812 RGBW discussed as reference |
| Halo rings | 2 × circular LED ring | Front = sun (gold), back = moon (silver) |
| Time | NTP on boot; DS3231 optional | All sun/moon maths runs on-device |
| Power | USB-C 5 V, plugged in | No battery; brightness capped in software |

---

## Part 2 — Sample code to upload

Two files are in this part:

1. `orb_color.py` — Python reference implementation. This is the one to upload to OpenAI. It has no dependencies beyond the Python standard library, so it runs anywhere for testing.
2. An ESP32 / Arduino sketch fragment that shows how the Python outputs drive the actual LEDs.

Accuracy note: the solar and lunar maths below is a clear, compact approximation — good to a few minutes for sunrise / sunset and good enough for a glowing orb. It is not a navigation-grade ephemeris. If OpenAI suggests a more accurate library, that is a porting decision, not a colour-model change.

### File 1 — `orb_color.py`

```python
"""
Solar Orb Clock - reference colour + halo calculation.
Stdlib only. Input: local date/time, latitude, longitude.
Output: orb RGB + glow, and LED index lists for the sun and moon halo rings.
LED count is configurable: 48 -> 30 min/LED, 60 -> 24 min/LED.
"""
import math
from datetime import datetime, timedelta

RAD = math.pi / 180.0
SYNODIC = 29.530588853  # days, new moon to new moon

# --- small helpers -------------------------------------------------------
def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))

def lerp(a, b, t):
    return a + (b - a) * t

def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def mix(c1, c2, t):
    return tuple(round(lerp(a, b, t)) for a, b in zip(c1, c2))

def mix_hex(h1, h2, t):
    return mix(hex_rgb(h1), hex_rgb(h2), t)

# --- seasonal peak colour at solar noon ----------------------------------
# (day_of_year, hex, name) - palette ON
ANCHORS = [
    (355, '#f0d48c', 'Winter pale gold'),
    (79,  '#f4c493', 'Spring blush gold'),
    (172, '#fb7c22', 'Summer amber-red'),
    (266, '#dd7027', 'Fall russet amber'),
]

def seasonal_peak(day_of_year, declination_deg, palette_on=True):
    if not palette_on:
        t = (clamp(declination_deg / 23.44, -1, 1) + 1) / 2
        return mix_hex('#eed9a0', '#ffab2e', t)
    base = [(d, h) for d, h, _ in ANCHORS]
    pts = sorted([(d - 365, h) for d, h in base] + base +
                 [(d + 365, h) for d, h in base])
    dd = day_of_year
    for (d1, h1), (d2, h2) in zip(pts, pts[1:]):
        if d1 <= dd <= d2:
            return mix_hex(h1, h2, (dd - d1) / max(1, d2 - d1))
    return hex_rgb(ANCHORS[0][1])

# --- sun -----------------------------------------------------------------
def sun_position(dt_utc, lat, lon):
    """Return (elevation_deg, declination_deg). dt_utc is timezone-aware UTC."""
    days = (dt_utc - datetime(2000, 1, 1, 12, tzinfo=dt_utc.tzinfo)).total_seconds() / 86400
    mean_lon = (280.460 + 0.9856474 * days) % 360
    anomaly = RAD * ((357.528 + 0.9856003 * days) % 360)
    ecl_lon = RAD * ((mean_lon + 1.915 * math.sin(anomaly)
                      + 0.020 * math.sin(2 * anomaly)) % 360)
    decl = math.asin(math.sin(ecl_lon) * math.sin(23.439 * RAD))
    ra = math.atan2(math.cos(23.439 * RAD) * math.sin(ecl_lon), math.cos(ecl_lon))
    gmst = (18.697374558 + 24.06570982441908 * days) % 24
    lst = (gmst * 15 + lon) % 360
    ha = RAD * ((lst - ra / RAD + 180) % 360 - 180)
    elev = math.asin(math.sin(decl) * math.sin(lat * RAD)
                     + math.cos(decl) * math.cos(lat * RAD) * math.cos(ha))
    return elev / RAD, decl / RAD

def find_crossings(day_local, lat, lon, tz_offset_hours, body='sun'):
    """Scan a local day in 6-min steps; return (rise_minutes, set_minutes)
    in local minutes after midnight, or (None, None). Crude but clear."""
    rise = setting = None
    prev = None
    for minute in range(0, 1441, 6):
        local = day_local + timedelta(minutes=minute)
        utc = local - timedelta(hours=tz_offset_hours)
        if body == 'sun':
            alt, _ = sun_position(utc, lat, lon)
        else:
            alt = moon_elevation(utc, lat, lon)
        if prev is not None:
            pm, pa = prev
            if pa < 0 <= alt and rise is None:
                rise = pm + (0 - pa) / (alt - pa) * 6
            if pa >= 0 > alt and setting is None:
                setting = pm + (0 - pa) / (alt - pa) * 6
        prev = (minute, alt)
    return rise, setting

# --- moon ----------------------------------------------------------------
KNOWN_NEW_MOON = datetime(2000, 1, 6, 18, 14)  # UTC, naive for age maths

def moon_illumination(dt_utc_naive):
    age = ((dt_utc_naive - KNOWN_NEW_MOON).total_seconds() / 86400) % SYNODIC
    illum = (1 - math.cos(2 * math.pi * age / SYNODIC)) / 2
    return age, illum

def moon_elevation(dt_utc, lat, lon):
    """Very approximate moon elevation (degrees). Good enough for glow."""
    days = (dt_utc.replace(tzinfo=None) - KNOWN_NEW_MOON).total_seconds() / 86400
    # Mean elongation grows ~12.19 deg/day; treat moon like a body trailing
    # the sun by that elongation, at a similar declination band.
    s_elev, s_decl = sun_position(dt_utc, lat, lon)
    age = days % SYNODIC
    lag_hours = (age / SYNODIC) * 24.0  # moon culminates later each day
    shifted = dt_utc - timedelta(hours=lag_hours * 0.9)
    m_elev, _ = sun_position(shifted, lat, lon)
    return m_elev
```

*`orb_color.py` continued — this is still the same file:*

```python
# --- orb colour model ----------------------------------------------------
NAVY   = hex_rgb('#0a0e2a')  # moon down / new moon: dimmest
INDIGO = hex_rgb('#43489e')  # moon up, low or partial
SILVER = hex_rgb('#b9cdf2')  # full moon, high: brightest silver-blue

def orb_color(sun_elev, moon_elev, illum, peak_rgb):
    """Return dict(rgb=(r,g,b), glow=0..1, mode=str)."""
    if sun_elev >= 0:  # day
        day_t = clamp(math.sin(clamp(sun_elev, 0, 90) * RAD) ** 0.55)
        dawn, mid = hex_rgb('#ff8438'), hex_rgb('#ffb03a')
        rgb = (mix(dawn, mid, day_t / 0.45) if day_t < 0.45
               else mix(mid, peak_rgb, (day_t - 0.45) / 0.55))
        return {'rgb': rgb, 'glow': 0.35 + day_t * 0.65, 'mode': 'day'}
    if sun_elev >= -12:  # twilight
        tw = clamp((sun_elev + 12) / 12)
        rgb = mix(hex_rgb('#2c2a63'), hex_rgb('#e2603c'), tw ** 1.3)
        if moon_elev > -2:
            pull = clamp((moon_elev + 2) / 14) * (0.25 + 0.75 * illum)
            rgb = mix(rgb, INDIGO, pull * 0.55 * (1 - tw * 0.5))
        return {'rgb': rgb, 'glow': 0.22 + tw * 0.3, 'mode': 'twilight'}
    if moon_elev > 0:  # night, moon up
        bright = clamp(illum * (0.35 + 0.65 * clamp(moon_elev / 38)))
        rgb = (mix(NAVY, INDIGO, bright * 2) if bright < 0.5
               else mix(INDIGO, SILVER, (bright - 0.5) * 2))
        return {'rgb': rgb, 'glow': 0.10 + bright * 0.55, 'mode': 'night-moon'}
    return {'rgb': NAVY, 'glow': 0.07, 'mode': 'night-dark'}

def rgb_to_rgbw(rgb, glow, max_pwm=0.40):
    """Split white out of RGB and apply the global brightness cap.
    Returns (r, g, b, w) each 0-255. Tune max_pwm in the wood."""
    scale = glow * max_pwm
    r, g, b = (round(c * scale) for c in rgb)
    w = min(r, g, b)
    return (r - w, g - w, b - w, w)

# --- halo rings ----------------------------------------------------------
def minutes_to_led(minutes, led_count):
    """24-hour dial: LED 0 at top = midnight, clockwise."""
    if minutes is None:
        return None
    return int((minutes % 1440) / 1440 * led_count) % led_count

def arc_leds(rise_min, set_min, led_count):
    """LED indices lit between rise and set, walking clockwise (may wrap)."""
    if rise_min is None or set_min is None:
        return []
    start = minutes_to_led(rise_min, led_count)
    end = minutes_to_led(set_min, led_count)
    leds, i = [], start
    while True:
        leds.append(i)
        if i == end:
            return leds
        i = (i + 1) % led_count

def halo_state(now_min, rise_min, set_min, led_count, arc_rgb):
    """Return {led_index: (r,g,b)} for one ring. Arc dim, 'now' bead bright."""
    frame = {i: tuple(round(c * 0.35) for c in arc_rgb)
             for i in arc_leds(rise_min, set_min, led_count)}
    now_led = minutes_to_led(now_min, led_count)
    if now_led in frame:
        frame[now_led] = arc_rgb  # travelling bead at full brightness
    return frame

GOLD   = hex_rgb('#ffb35c')  # front (sun) ring
SILVER_RING = hex_rgb('#a9bcf0')  # back (moon) ring

# --- putting it together -------------------------------------------------
def compute(local_dt, lat, lon, tz_offset_hours, led_count=48,
            palette_on=True):
    """local_dt: naive datetime in local wall time at the location."""
    from datetime import timezone
    utc = (local_dt - timedelta(hours=tz_offset_hours)).replace(tzinfo=timezone.utc)
    s_elev, decl = sun_position(utc, lat, lon)
    _, illum = moon_illumination(utc.replace(tzinfo=None))
    m_elev = moon_elevation(utc, lat, lon)
    peak = seasonal_peak(local_dt.timetuple().tm_yday, decl, palette_on)
    orb = orb_color(s_elev, m_elev, illum, peak)
    midnight = local_dt.replace(hour=0, minute=0, second=0, microsecond=0)
    s_rise, s_set = find_crossings(midnight, lat, lon, tz_offset_hours, 'sun')
    m_rise, m_set = find_crossings(midnight, lat, lon, tz_offset_hours, 'moon')
    now_min = local_dt.hour * 60 + local_dt.minute
    return {
        'orb_rgb': orb['rgb'],
        'orb_rgbw': rgb_to_rgbw(orb['rgb'], orb['glow']),
        'mode': orb['mode'],
        'sunrise': s_rise, 'sunset': s_set,
        'moonrise': m_rise, 'moonset': m_set,
        'front_sun_ring': halo_state(now_min, s_rise, s_set, led_count, GOLD),
        'back_moon_ring': halo_state(now_min, m_rise, m_set, led_count, SILVER_RING),
        'minutes_per_led': 1440 / led_count,
    }

if __name__ == '__main__':
    # Example: Seattle area, 8 Nov 2026, 15:30 local (UTC-8)
    result = compute(datetime(2026, 11, 8, 15, 30),
                     lat=47.61, lon=-122.33, tz_offset_hours=-8,
                     led_count=48)
    for key, value in result.items():
        print(key, ':', value)
    # Re-run with led_count=60 to compare the 60-LED ring (24 min/LED).
```

### File 2 — ESP32 / Arduino fragment

This fragment shows the mapping only — pin numbers, Wi-Fi, and NTP setup are project setup, not colour logic. It assumes Adafruit NeoPixel-style drivers for an RGBW orb source and two RGB/RGBW rings on separate data pins.

```cpp
// Solar Orb Clock - ESP32-C6 fragment: apply one computed state.
// Values come from porting orb_color.py: orb RGBW, plus for each ring
// an arc start/end LED and a "now" LED. LED_COUNT is the ONLY place the
// ring size lives - set it to 48 or 60 once the ring part is confirmed.
#include <Adafruit_NeoPixel.h>

#define LED_COUNT     48   // <-- 48 = 30 min/LED, 60 = 24 min/LED
#define ORB_PIN        6
#define SUN_RING_PIN   7   // front face, gold arc, sunrise -> sunset
#define MOON_RING_PIN  8   // back face, silver arc, moonrise -> moonset
#define MAX_PWM      0.40f // brightness cap: knob 100% = 40% PWM

Adafruit_NeoPixel orb(7, ORB_PIN, NEO_GRBW + NEO_KHZ800);
Adafruit_NeoPixel sunRing(LED_COUNT, SUN_RING_PIN, NEO_GRBW + NEO_KHZ800);
Adafruit_NeoPixel moonRing(LED_COUNT, MOON_RING_PIN, NEO_GRBW + NEO_KHZ800);

int minutesToLed(float minutes) {
  int m = ((int)minutes % 1440 + 1440) % 1440;
  return (m * LED_COUNT) / 1440;  // LED 0 at top = midnight, clockwise
}

void drawArc(Adafruit_NeoPixel &ring, float riseMin, float setMin,
             float nowMin, uint32_t arcColor) {
  ring.clear();
  if (riseMin < 0 || setMin < 0) { ring.show(); return; }
  int start = minutesToLed(riseMin), end = minutesToLed(setMin);
  int nowLed = minutesToLed(nowMin);
  for (int i = start;; i = (i + 1) % LED_COUNT) {
    // Arc at 35% brightness; the "now" bead at full arc brightness.
    float s = (i == nowLed) ? 1.0f : 0.35f;
    uint8_t r = ((arcColor >> 16) & 0xFF) * s * MAX_PWM;
    uint8_t g = ((arcColor >> 8) & 0xFF) * s * MAX_PWM;
    uint8_t b = (arcColor & 0xFF) * s * MAX_PWM;
    ring.setPixelColor(i, ring.Color(r, g, b, 0));
    if (i == end) break;
  }
  ring.show();
}

void applyState(uint8_t orbR, uint8_t orbG, uint8_t orbB, uint8_t orbW,
                float sunrise, float sunset,
                float moonrise, float moonset, float nowMinutes) {
  uint32_t orbColor = orb.Color(orbR * MAX_PWM, orbG * MAX_PWM,
                                orbB * MAX_PWM, orbW * MAX_PWM);
  for (int i = 0; i < 7; i++) orb.setPixelColor(i, orbColor);
  orb.show();
  drawArc(sunRing,  sunrise,  sunset,  nowMinutes, 0xFFB35C);  // gold
  drawArc(moonRing, moonrise, moonset, nowMinutes, 0xA9BCF0);  // silver
}
// In loop(): recompute sun/moon state every 60 s from NTP/DS3231 time,
// then call applyState(...). No network call is needed to get the colour.
```

---

## Questions to ask OpenAI once it has the prompt and code

- Port `orb_color.py` to Arduino C++ for the XIAO ESP32-C6, keeping the colour values identical, and show me a test table for sunrise, solar noon, sunset, full-moon midnight, and new-moon midnight.
- Check the power budget: orb source plus two full rings at the capped brightness — what 5 V supply size do I actually need?
- Compare a 48-LED ring (30 minutes per LED) with a 60-LED ring (24 minutes per LED) for arc smoothness, parts cost, groove size in a 170 mm cube, and soldering effort — using only dimensions I confirm, not assumed part numbers.
- Suggest a diffusion test I can run before routing the wood, so I can measure how far the ring needs to sit behind frosted resin before individual LEDs disappear.

## Open decisions — do not let OpenAI close these for you

- **Exact ring part:** the 48-LED preference is stated, and a 60-LED Adafruit NeoPixel ring (four quarter-rings) has been discussed as the smoother, verified alternative. No ring dimension, groove size, or window size should be treated as final until the actual part is in hand and measured. Earlier sizing around a 48-LED ring that could not be verified for sale has already been flagged in this project — do not reuse those dimensions.
- **Seasonal palette:** on by default in the simulator; confirm it stays a toggle on the hardware build.
- **Wood species and finish:** not chosen.
- **Brightness cap:** 40% PWM is a starting value to tune once the orb is in wood, not a final setting.
