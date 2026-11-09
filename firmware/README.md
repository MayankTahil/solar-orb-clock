# Solar Orb Clock — ESP32 firmware

Self-sustained device logic for the Solar Orb Clock: the same validated astronomy and
color math as the [online simulator](https://mayanktahil.github.io/solar-orb-clock/),
running on an ESP32 and driving a 150 mm RGBW orb plus two 60-LED halo rings
(sun arc, moon arc).

Status: **math core complete and fixture-validated; application layer written but not yet
compiled or flashed** — hardware bring-up is the next milestone (see the
[roadmap](../docs/ROADMAP.md), Phase 1.5).

## Layout

| File | Role |
| --- | --- |
| `src/astronomy.[ch]` | Sun/Moon positions (VSOP-truncated sun, truncated ELP-style moon with topocentric parallax), rise/set event scanning, local↔UTC helpers. Pure C, no dynamic allocation. |
| `src/color_engine.[ch]` | Orb color, seasonal noon palette, RGBW split. Exact C port of the simulator's color engine. |
| `src/render.[ch]` | Halo rendering: arcs with end fade, anti-aliased "now" bead (20-60-20 across 3 LEDs). |
| `src/config.h` | Device defaults (location, TZ, DST rule, brightness cap, update cadence). |
| `src/main.cpp` | Arduino app: timekeeping, LED output, REST API, NVS-persisted configuration. |
| `test/` | Host-runnable tests for the core against the same golden fixtures as the simulator. |
| `tools/` | Fixture generation: flattens `tests/fixtures/astronomy_fixtures.json` and extracts browser color-engine cases from `index.html`. |
| `api.md` | REST API specification with curl and Home Assistant examples. |

The core (`astronomy`, `color_engine`, `render`) is plain C so it compiles both on the
ESP32 (Arduino) and on the host for testing. `main.cpp` is the only ESP32-specific file.

## Design decisions (baked in)

- 60-LED rings; sun arc gold `#ffb35c`, moon arc silver `#a9bcf0`
- 240 astronomy updates/day (every 6 min), events interpolated continuously between them
- "Now" bead: 20-60-20 kernel across 3 LEDs — constant total light, no flicker
- Arc-end fade: 25% / 50% / 100% ramp over the last 3 LEDs
- Brightness cap `max_pwm` (default 0.40) via RGBW split; seasonal color retained,
  seasonal brightness normalization deliberately excluded

## Building and testing

Host tests (no hardware needed):

```bash
./test/run_tests.sh     # from firmware/
```

This compiles the core with the host C compiler and runs it against the golden fixtures:

- astronomy: 48 position rows + 16 event rows vs Skyfield/de421 — currently exact (0.0000°)
- color engine: 3,200 browser-generated cases — 3200/3200 (RGB, mode, glow, RGBW split exact)

To regenerate fixtures after changing the simulator, run `tools/make_c_fixtures.py` and
`tools/make_color_fixtures.js` from the repo root (see each script's header).

Flashing (Seeed XIAO ESP32-C6, PlatformIO):

```bash
cp src/wifi_secrets.example.h src/wifi_secrets.h   # then edit credentials
pio run -e xiao_esp32c6 -t upload
```

## REST API

See `api.md`. Summary: `GET /api/status` (live alt/az/illum/mode/orb colors/events),
`GET /api/astronomy` (today + tomorrow almanac), `GET|PUT /api/config` (location, TZ,
DST, palette, brightness cap, cadence — persisted to NVS), `GET /api/health`. Also
discoverable at `http://solar-orb.local` via mDNS.

## Ports (assumed, adjust to wiring)

| Component | ESP32 GPIO |
| --- | --- |
| Orb (NeoPixel Jewel, 7× RGBW) | 6 |
| Sun halo ring (60× RGBW) | 7 |
| Moon halo ring (60× RGBW) | 8 |

## Known limitations (v1)

- The `PUT /api/config` JSON-body parser is a minimal key/value matcher, not a real
  JSON parser — query parameters are the reliable path.
- No auth/HTTPS: LAN-only device on a trusted network; do not port-forward.
- Time zone is a fixed UTC offset + US DST rule, not full IANA rules (fixtures cover
  US DST transitions; other rules would need the ESP32 TZ database).
