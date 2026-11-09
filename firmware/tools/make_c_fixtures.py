#!/usr/bin/env python3
"""Convert tests/fixtures/astronomy_fixtures.json into the flat text format
read by the C test harness (firmware/test/test_astronomy.c).

The JSON uses IANA timezone names; the firmware uses a fixed UTC offset per
day, so this script resolves each event day's actual offset via zoneinfo and
emits it as an integer minute offset — exactly how the device will be
configured (lat/lon/offset, optional US DST rule).

Run from the repo root: python3 firmware/tools/make_c_fixtures.py
"""
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent.parent
FIX = ROOT / "tests" / "fixtures" / "astronomy_fixtures.json"
OUT = ROOT / "firmware" / "test" / "fixtures_flat.txt"


def main():
    d = json.loads(FIX.read_text())
    lines = [f"# generated from {FIX.name} — do not edit by hand"]

    lines.append(f"POSITIONS {len(d['positions'])}")
    for p in d["positions"]:
        t = datetime.fromisoformat(p["utc"].replace("Z", "+00:00"))
        epoch = int(t.timestamp())
        lines.append("P %d %.4f %.4f %.4f %.4f %.4f" % (
            epoch, p["lat"], p["lon"], p["moon_alt"], p["sun_alt"], p["moon_illum"]))

    lines.append(f"EVENTS {len(d['events'])}")
    for e in d["events"]:
        y, mo, dd = (int(x) for x in e["date"].split("-"))
        tz = ZoneInfo(e["tz"])
        off = int(tz.utcoffset(datetime(y, mo, dd)).total_seconds() // 60)
        rise = "nan" if e["rise_min"] is None else "%.2f" % e["rise_min"]
        set_ = "nan" if e["set_min"] is None else "%.2f" % e["set_min"]
        lines.append("E %d %d %d %d %.4f %.4f %d %s %s %s" % (
            y, mo, dd, off, e["lat"], e["lon"], 0 if e["body"] == "sun" else 1,
            e["body"], rise, set_))

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text("\n".join(lines) + "\n")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
