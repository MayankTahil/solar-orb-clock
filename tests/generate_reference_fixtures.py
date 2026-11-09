#!/usr/bin/env python3
"""Generate golden reference fixtures for the simulator's astronomy code.

Compares against Skyfield + JPL de421 to measure the accuracy of the
browser-friendly truncated lunar series. Regenerate with:
    pip install skyfield
    python3 tests/generate_reference_fixtures.py
(the de421.bsp ephemeris is downloaded automatically on first run).

Conventions mirrored from index.html:
  - Sun altitude: geocentric (solar parallax negligible).
  - Moon altitude: topocentric (horizontal parallax applied).
  - No refraction in altitude fixtures (geometric/apparent altitudes).
  - Rise/set when center altitude crosses -0.833 deg (34' refraction + 16'
    semidiameter, USNO convention), sampled per minute with linear
    interpolation, first rise / first set of the local civil day.
"""
import json
import math
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from skyfield.api import load, wgs84

HERE = Path(__file__).parent
RISE_SET_ALT = -0.833

# (name, lat, lon, IANA tz) - spread across latitude, both hemispheres, polar.
PLACES = [
    ("seattle", 47.6062, -122.3321, "America/Los_Angeles"),
    ("quito", 0.1807, -78.4678, "America/Guayaquil"),
    ("tromso", 69.6489, 18.9551, "Europe/Oslo"),
    ("sydney", -33.8688, 151.2093, "Australia/Sydney"),
]

# Instants for position/illumination fixtures (UTC ISO).
POSITION_INSTANTS = [
    "2026-01-03T06:00:00Z", "2026-02-14T18:30:00Z", "2026-03-20T12:00:00Z",
    "2026-04-22T03:15:00Z", "2026-05-27T09:45:00Z", "2026-06-21T00:00:00Z",
    "2026-07-13T21:20:00Z", "2026-08-19T14:05:00Z", "2026-09-23T02:00:00Z",
    "2026-10-17T07:40:00Z", "2026-11-08T04:30:00Z", "2026-12-21T16:00:00Z",
]

# Local dates for rise/set fixtures: solstices/equinox + today-ish + polar.
EVENT_DAYS = [
    ("seattle", "2026-03-08"),   # US DST spring-forward day
    ("seattle", "2026-11-01"),   # US DST fall-back day
    ("seattle", "2026-06-21"),
    ("seattle", "2026-11-08"),
    ("quito", "2026-03-20"),
    ("tromso", "2026-06-21"),    # midnight sun
    ("tromso", "2026-12-21"),    # polar night (moon events still exist)
    ("sydney", "2026-12-25"),
]


def main():
    eph = load("de421.bsp")
    ts = load.timescale()
    earth, sun, moon = eph["earth"], eph["sun"], eph["moon"]

    positions = []
    for iso in POSITION_INSTANTS:
        t = ts.from_datetime(datetime.fromisoformat(iso.replace("Z", "+00:00")))
        for name, lat, lon, tz in PLACES:
            obs = earth + wgs84.latlon(lat, lon)
            m_app = obs.at(t).observe(moon).apparent()
            m_alt, m_az, _ = m_app.altaz()  # no refraction (no pressure)
            s_app = obs.at(t).observe(sun).apparent()
            s_alt, s_az, _ = s_app.altaz()
            # illuminated fraction from geocentric elongation
            sv = earth.at(t).observe(sun).apparent()
            mv = earth.at(t).observe(moon).apparent()
            elong = sv.separation_from(mv).degrees
            illum = (1 - math.cos(math.radians(elong))) / 2
            positions.append({
                "utc": iso, "place": name, "lat": lat, "lon": lon,
                "moon_alt": round(m_alt.degrees, 4), "moon_az": round(m_az.degrees, 2),
                "sun_alt": round(s_alt.degrees, 4), "sun_az": round(s_az.degrees, 2),
                "moon_illum": round(illum, 4),
            })

    events = []
    for place, datestr in EVENT_DAYS:
        name, lat, lon, tzname = next(p for p in PLACES if p[0] == place)
        tz = ZoneInfo(tzname)
        y, mo, d = (int(x) for x in datestr.split("-"))
        day0 = datetime(y, mo, d, tzinfo=tz)
        for body, target in (("sun", sun), ("moon", moon)):
            obs = earth + wgs84.latlon(lat, lon)
            rise = set_ = None
            prev_min, prev_alt = None, None
            for k in range(0, 1441):
                inst = day0 + timedelta(minutes=k)
                alt = obs.at(ts.from_datetime(inst)).observe(target).apparent().altaz()[0].degrees
                if prev_alt is not None:
                    if prev_alt < RISE_SET_ALT <= alt and rise is None:
                        rise = prev_min + (RISE_SET_ALT - prev_alt) / (alt - prev_alt)
                    if prev_alt >= RISE_SET_ALT > alt and set_ is None:
                        set_ = prev_min + (RISE_SET_ALT - prev_alt) / (alt - prev_alt)
                prev_min, prev_alt = k, alt
            events.append({
                "date": datestr, "place": name, "lat": lat, "lon": lon, "tz": tzname,
                "body": body,
                "rise_min": None if rise is None else round(rise, 2),
                "set_min": None if set_ is None else round(set_, 2),
            })

    out = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "ephemeris": "de421",
        "rise_set_alt_deg": RISE_SET_ALT,
        "positions": positions,
        "events": events,
    }
    outpath = HERE / "fixtures" / "astronomy_fixtures.json"
    outpath.parent.mkdir(exist_ok=True)
    outpath.write_text(json.dumps(out, indent=1))
    print(f"wrote {outpath}: {len(positions)} position rows, {len(events)} event rows")


if __name__ == "__main__":
    main()
