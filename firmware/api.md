# Solar Orb Clock — device REST API

The ESP32 hosts a small HTTP server (port 80) on the local network, also
reachable at `http://solar-orb.local` via mDNS. Intended for home-automation
integration (Home Assistant RESTful sensor/command examples below) and remote
tuning of preferences without reflashing.

Security: LAN-only, no authentication. Treat it like any other unauthenticated
device on a trusted home network; do not port-forward it.

## GET /api/status

Live astronomical + orb state (values from the most recent tick, ≤6 min old).

```json
{
  "utc": 1791619200,
  "sun":  { "alt": -35.2, "az": 12.4 },
  "moon": { "alt": 42.1, "az": 88.0, "illum": 0.973, "age_days": 14.2 },
  "mode": "night-moon",
  "orb":  { "rgb": [126, 150, 233], "rgbw": [40, 51, 89, 37], "glow": 0.641 },
  "events": {
    "sunrise": 437.2, "sunset": 990.8,
    "moonrise": 289.1, "moonset": 1230.5
  }
}
```

- `events` are minutes-after-local-midnight, **interpolated continuously**
  toward tomorrow's values (the same continuum the simulator displays).
- `mode`: `day` | `twilight` | `night-moon` | `night-dark`.
- `orb.rgbw` is what is actually being written to the LEDs (after the
  brightness cap).

## GET /api/astronomy

Raw (non-interpolated) events for today and tomorrow — useful for automations
that want exact almanac times.

```json
{
  "date": "2026-11-09", "lat": 47.6062, "lon": -122.3321,
  "today":    { "sunrise": 431.9, "sunset": 986.7, "noon": 712.4, "peak_alt": 22.1,
                "moonrise": 240.3, "moonset": 1188.9 },
  "tomorrow": { "sunrise": 433.4, "sunset": 985.2, "moonrise": 305.1, "moonset": 1245.7 }
}
```

## GET /api/config

```json
{
  "lat": 47.6062, "lon": -122.3321, "tz_offset_min": -480,
  "dst_rule": 1, "palette_on": 1, "max_pwm": 0.40,
  "update_per_day": 240, "led_count": 60
}
```

## PUT /api/config

Update any subset of parameters as query parameters (or as a JSON body with
matching keys). Values are persisted to NVS (survives reboots) and events are
recomputed on the next tick.

```
curl -X PUT "http://solar-orb.local/api/config?lat=40.7128&lon=-74.0060&tz_offset_min=-300"
curl -X PUT -H "Content-Type: application/json" \
     -d '{"palette_on":0,"max_pwm":0.30}' http://solar-orb.local/api/config
```

| Parameter | Range | Notes |
| --- | --- | --- |
| `lat`, `lon` | ±90, ±180 | relocating the clock |
| `tz_offset_min` | -720..+840 | standard-time UTC offset |
| `dst_rule` | 0/1 | 1 = US rule (2nd Sun Mar – 1st Sun Nov) |
| `palette_on` | 0/1 | seasonal noon palette toggle |
| `max_pwm` | 0..1 | brightness cap (default 0.40 — tune in the wood) |
| `update_per_day` | 60..1440 | astronomy cadence (default 240 = every 6 min) |

## GET /api/health

```json
{ "uptime_s": 86342, "rssi": -58, "free_heap": 192048, "wifi": "homenet" }
```

## Home Assistant sketch

```yaml
rest:
  - resource: http://solar-orb.local/api/status
    scan_interval: 60
    sensor:
      - name: "Orb mode"
        json_attributes_path: "$"
        value_template: "{{ value_json.mode }}"
      - name: "Moon illumination"
        value_template: "{{ value_json.moon.illum }}"
```

Future work (deliberately out of scope for v1): auth token, HTTPS, MQTT
discovery, a proper JSON parser (currently the PUT body parser is a minimal
key/value matcher), and daylight color-brightness curves as separate API
parameters.
