# Sidebar: Design B — no buck converter, smaller rings

Status: evaluation sidebar, deliberately NOT the mainline. Mainline (Design A,
60-LED rings + PD trigger + 5 V buck) stays in `docs/POWER.md` / `docs/BOM.md`
until Design B is either adopted or rejected at the bench.

## Concept

Drop the 12 V→5 V buck stage entirely by cutting LED count so the whole
clock runs from plain 5 V USB-C. Two changes do it together:

1. **24-LED RGBW rings** (Adafruit 2861/2862/2860, warm/natural/cool) instead
   of 60-LED rings: 2×24 + 7-LED jewel = 55 pixels.
2. **Power entry without PD negotiation**: a USB-C breakout with the 5.1 kΩ
   CC pull-downs (Adafruit 4090 "Downstream Connection" breakout) taps VBUS
   directly. A USB-C source without PD gives at most 5 V/3 A = 15 W
   (https://learn.adafruit.com/usb-pd-hacks/things-to-know) — which now
   covers the load with margin. Alternatively reuse the already-planned
   HUSB238 (product 5807) with its default 5 V jumper setting, jumpered for
   its fixed 5 V output.

## Power budget (Design B)

Using the same per-LED figures as `docs/POWER.md` (40% cap, white-split):

- 55 pixels × ~32 mA pathological all-on ≈ 1.8 A
- ESP32-S3 + Wi-Fi ≈ 0.15 A
- **Pathological total ≈ 1.9 A (~9.6 W); realistic worst ≈ 1.2–1.4 A (~6–7 W)**

vs. 5 V/3 A (15 W) available: 36% headroom at the pathological extreme,
~2× headroom in realistic operation. No PD trigger, no buck, one USB-C cable
into any ≥15 W charger.

## Resolution trade-off (the real cost)

Visual movement resolution is minutes-per-LED on the 24-hour dial:

| Ring | min/LED | "now" bead step | Bead kernel (3 LEDs) spans | Arc-end fade spans | Notes |
|---|---|---|---|---|---|
| 60 | 24 | 24 min | 72 min | 72 min | mainline; finest dial |
| 24 | 60 | 60 min | 3 h | 3 h | 1 LED = 1 hour — conceptually clean dial |
| 16 | 90 | 90 min | 4.5 h | 4.5 h | too coarse for a clock dial? |
| 12 | 120 | 2 h | 6 h | 6 h | decorative only |

The 20-60-20 bead kernel and 25/50/100% arc-end fade are spread across a
fixed 3-LED window, so at 24 LEDs the bead becomes a 3-hour-wide soft glow
instead of a 72-minute one. Perceived motion stays continuous (the render
interpolates the fractional position), but the dial reads coarser. If Design
B is adopted, consider tightening the kernel (e.g. 0-70-30 over 2 LEDs) at
the Phase 3 optical proof.

Ring geometry: the 24-LED Adafruit ring is 65.5 mm OD vs ~172 mm for 60-LED
SK6812 rings — a much smaller halo, which interacts with the (deferred)
industrial design: a smaller halo pair could sit closer to the orb, or the
whole clock shrinks.

## Firmware impact

Minimal by construction: `firmware/src/render.h` exposes
`#define ORB_LED_COUNT 60`; `render.c` (arc mapping, fade, bead kernel) and
`main.cpp` are fully parameterized on it. Supporting Design B on the bench is
a build-flag change (`-D ORB_LED_COUNT=24` once the define is made
overridable) plus a kernel-tuning decision. No astronomy or color changes.

## Design B BOM delta (vs Design A BOM)

| Remove | Add |
|---|---|
| HUSB238 trigger at 12 V (item 2) — or keep at 5 V default | 2× 24-LED RGBW ring, warm white (Adafruit 2861, $19.95 ea) |
| Pololu D36V50F5 buck (item 3) | USB-C breakout w/ 5.1k CC pulldowns (Adafruit 4090), or reuse 5807 at 5 V |
| 2× 60-LED SK6812 ring (item 4) | — |

Net: fewer parts, all name-brand (no third-party 60-LED ring sourcing risk),
lower current everywhere, simpler wiring, smaller physical halo. Cost: a
coarser time dial and a softer "now" bead.

## 12 vs 24 verdict (2026-11-09)

Both exist from Adafruit in RGBW warm white: 12-LED ring is product 2851
($9.50, 37 mm OD) and 24-LED ring is product 2861 ($19.95, 65.5 mm OD);
ring geometry per the NeoPixel Überguide selector (12=37 mm, 16=44.5 mm,
24=65.5 mm, 60=158 mm as 4 soldered 15-pixel quarters).

Recommendation: **24, not 12.** At 12 LEDs each pixel is 2 hours of the dial,
the 3-LED bead kernel spans 6 hours, and a mid-latitude winter sun arc
(~9.5 h daylight) is only ~5 LEDs — the halo stops reading as a clock and
becomes pure decoration. 24 keeps the 1 LED = 1 hour mapping and still hits
the no-buck goal. 12 is only interesting if the halo becomes intentionally
decorative and the build shrinks to a ~40 mm halo — noted as a fallback, not
the plan. (12 does have one genuine edge: 31 pixels ≈ 1.15 A pathological,
i.e. runs from literally any 5 V/1.5 A USB port.)

## Decision criteria (to resolve at bench / Phase 3)

- If the halo is meant to be READ as a clock (event times to ±half an LED),
  24 LEDs = ±30 min — marginal. 60 LEDs = ±12 min.
- If the halo is ambient/indicative (arcs + a traveling glow), 24 is plenty
  and Design B wins on every axis except resolution.
- Mixed option kept open: 60 front / 24 back is electrically fine (still
  under the 15 W no-buck budget at ~2.5 A pathological) and worth one bench
  evening before committing.
