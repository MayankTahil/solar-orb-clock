"""Accurate astronomy reference engine for Solar Orb Clock.

Requires: pip install skyfield jplephem
Provision de440s.bsp (or de421.bsp) locally before running. Runtime is offline.
This is a desktop/reference module, NOT directly executable on ESP32.
Coordinates: latitude north positive, longitude east positive; timezone IANA.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
import math

from skyfield.api import load, load_file, wgs84
from skyfield import almanac

UTC = timezone.utc


@dataclass(frozen=True)
class Position:
    altitude_deg: float  # apparent altitude, atmospheric refraction included
    azimuth_deg: float
    declination_deg: float


@dataclass(frozen=True)
class Events:
    rises: tuple[datetime, ...]  # local timezone-aware instants
    sets: tuple[datetime, ...]
    above_at_start: bool
    above_at_end: bool


class Astronomy:
    def __init__(self, ephemeris_path: str | Path):
        path = Path(ephemeris_path)
        if not path.is_file():
            raise FileNotFoundError(f"Provide a local JPL ephemeris: {path}")
        self.ts = load.timescale(builtin=True)
        self.eph = load_file(str(path))
        self.earth = self.eph['earth']
        self.sun = self.eph['sun']
        self.moon = self.eph['moon']

    def _observer(self, lat: float, lon: float, elevation_m: float):
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError('Invalid latitude or longitude')
        return self.earth + wgs84.latlon(lat, lon, elevation_m=elevation_m)

    def _time(self, dt: datetime):
        if dt.tzinfo is None or dt.utcoffset() is None:
            raise ValueError('Pass a timezone-aware datetime')
        return self.ts.from_datetime(dt.astimezone(UTC))

    def position(self, body: str, when: datetime, lat: float, lon: float,
                 elevation_m: float = 0.0, temperature_C: float = 10.0,
                 pressure_mbar: float = 1010.0) -> Position:
        target = {'sun': self.sun, 'moon': self.moon}[body]
        apparent = self._observer(lat, lon, elevation_m).at(self._time(when)).observe(target).apparent()
        alt, az, _ = apparent.altaz(temperature_C=temperature_C, pressure_mbar=pressure_mbar)
        _, dec, _ = apparent.radec(epoch='date')
        return Position(alt.degrees, az.degrees, dec.degrees)

    def moon_illumination(self, when: datetime) -> float:
        # Geocentric Sun-Moon elongation; standard phase approximation.
        phase_deg = almanac.moon_phase(self.eph, self._time(when)).degrees
        return (1.0 - math.cos(math.radians(phase_deg))) / 2.0

    def moon_phase_angle_deg(self, when: datetime) -> float:
        return almanac.moon_phase(self.eph, self._time(when)).degrees

    def events(self, body: str, local_day: date, tz_name: str,
               lat: float, lon: float, elevation_m: float = 0.0) -> Events:
        """All rise/set events inside a local calendar day, including DST days.

        Uses Skyfield's standard Sun/Moon rise-set horizon conventions.
        Does not account for terrain obstructions; horizon is astronomical.
        """
        if body not in ('sun', 'moon'):
            raise ValueError("body must be 'sun' or 'moon'")
        zone = ZoneInfo(tz_name)
        start = datetime.combine(local_day, time.min, zone)
        end = datetime.combine(local_day + timedelta(days=1), time.min, zone)
        t0, t1 = self._time(start), self._time(end)
        observer = wgs84.latlon(lat, lon, elevation_m=elevation_m)
        target = self.sun if body == 'sun' else self.moon
        rise_t, rise_valid = almanac.find_risings(self.eph, target, observer, t0, t1)
        set_t, set_valid = almanac.find_settings(self.eph, target, observer, t0, t1)
        rises = tuple(t.astimezone(zone) for t, valid in zip(rise_t.utc_datetime(), rise_valid) if valid)
        sets = tuple(t.astimezone(zone) for t, valid in zip(set_t.utc_datetime(), set_valid) if valid)
        # State at boundaries determined by the next/previous event parity,
        # using altitude against Skyfield's conventional rise/set threshold.
        # Skyfield's risings_and_settings function provides the state directly.
        state_fn = almanac.risings_and_settings(self.eph, target, observer)
        above_start = bool(state_fn(t0))
        above_end = bool(state_fn(self.ts.from_datetime(end.astimezone(UTC) - timedelta(seconds=1))))
        return Events(rises, sets, above_start, above_end)

    def snapshot(self, when: datetime, lat: float, lon: float,
                 elevation_m: float = 0.0) -> dict:
        sun = self.position('sun', when, lat, lon, elevation_m)
        moon = self.position('moon', when, lat, lon, elevation_m)
        return {
            'sun_elevation_deg': sun.altitude_deg,
            'sun_declination_deg': sun.declination_deg,
            'sun_azimuth_deg': sun.azimuth_deg,
            'moon_elevation_deg': moon.altitude_deg,
            'moon_azimuth_deg': moon.azimuth_deg,
            'moon_illumination': self.moon_illumination(when),
            'moon_phase_angle_deg': self.moon_phase_angle_deg(when),
        }


def minutes_after_midnight(instant: datetime) -> float:
    """Wall-clock position for a 24h dial (DST repeated hour maps to same spot)."""
    return instant.hour * 60 + instant.minute + instant.second / 60 + instant.microsecond / 60_000_000


if __name__ == '__main__':
    import argparse, json
    parser = argparse.ArgumentParser()
    parser.add_argument('--ephemeris', required=True)
    parser.add_argument('--lat', type=float, required=True)
    parser.add_argument('--lon', type=float, required=True)
    parser.add_argument('--tz', required=True, help='IANA timezone, e.g. America/Los_Angeles')
    parser.add_argument('--date', required=True, help='YYYY-MM-DD')
    parser.add_argument('--time', default='12:00', help='HH:MM')
    args = parser.parse_args()
    zone = ZoneInfo(args.tz)
    local = datetime.fromisoformat(f'{args.date}T{args.time}').replace(tzinfo=zone)
    astro = Astronomy(args.ephemeris)
    result = astro.snapshot(local, args.lat, args.lon)
    for body in ('sun', 'moon'):
        ev = astro.events(body, local.date(), args.tz, args.lat, args.lon)
        result[body + '_rises'] = [t.isoformat() for t in ev.rises]
        result[body + '_sets'] = [t.isoformat() for t in ev.sets]
        result[body + '_above_at_start'] = ev.above_at_start
        result[body + '_above_at_end'] = ev.above_at_end
    print(json.dumps(result, indent=2))
