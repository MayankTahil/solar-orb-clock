# Phase 2 BOM — Design A (mainline: two 60-LED halos)

NOTE 2026-11-09: the power budget in `docs/POWER.md` was corrected (~4x
lower per-LED draw than first computed). At the default 40% cap the PD
trigger + buck are OPTIONAL — the simple USB-C 5 V path (item 2a) covers
all designs. Items 2b/3 are the optional headroom path.

Companion to `docs/POWER.md` (architecture and wiring). Prices verified
2026-11-09 where a source is linked; others marked approximate.

## Power budget per rail

| Rail | Source | Design load | Notes |
|---|---|---|---|
| 5 V bus (simple path) | USB-C breakout (Adafruit 4090) from any ≥15 W charger | ≤1.5 A needed | corrected ceiling ~1.4 A (7 W) for design A at the 40% cap; 3 A port gives 2x headroom |
| 12 V (PD, optional) | HUSB238 trigger (5807) at 12 V → Pololu D36V50F5 buck | only if max_pwm > ~0.6 or future LED growth | see docs/POWER.md headroom path |
| 3.3 V | QT Py S3 onboard regulator | ~0.15–0.35 A | Wi-Fi TX peaks; regulator rated 600 mA peak |

## Bill of materials

| # | Item | Source | Price |
|---|---|---|---|
| 1 | Adafruit QT Py ESP32-S3, 2MB PSRAM (product 5700) | [adafruit.com/product/5700](https://www.adafruit.com/product/5700) | check listing (was out of stock) |
| 2a | USB Type C breakout, downstream, 5.1k CC pull-downs (product 4090) | [adafruit.com/product/4090](https://www.adafruit.com/product/4090) | ~$2 |
| 2b | (optional) USB Type C PD Dummy Breakout, HUSB238 (product 5807), jumpered to 12 V | [adafruit.com/product/5807](https://www.adafruit.com/product/5807) | check listing |
| 3 | (optional) Pololu D36V50F5 5 V/5.5 A buck regulator | [pololu.com/product/4091](https://www.pololu.com/product/4091) | ~$22 |
| 4 | 2× 60-LED SK6812 RGBW ring, 5 V, warm white | [ledlightinghut.com](https://www.ledlightinghut.com/60-sk6812-rgbw-led-pixel-ring.html) (or AliExpress/BTF) | $34.50 ea / ~$40 |
| 5 | NeoPixel Jewel 7× RGBW, warm white (product 2858) | [adafruit.com/product/2858](https://www.adafruit.com/product/2858) | $6.95 |
| 6 | 74AHCT125 quad level shifter (product 1787) | [adafruit.com/product/1787](https://www.adafruit.com/product/1787) | $1.50 (out of stock at Adafruit 2026-11-09; also on Amazon/Mouser) |
| 7 | USB-C PD charger ≥36 W | any owned | — |
| 8 | Full-featured USB-C charge+data cable, ≥3 A | any owned | — |
| 9 | 470 Ω resistors ×3, 1000 µF electrolytic ×3 | parts bin / Adafruit | ~$5 |
| 10 | 20–22 AWG stranded wire, heat-shrink, terminal strip or small perfboard | parts bin | ~$10 |
| 11 | (Optional) 4 A polyfuse on the 5 V bus | parts bin | ~$2 |

Gate 2 check: every line is purchasable as written except item 1 (stock) and
item 6 (Adafruit stock; alternates listed) — both have working alternates.
The optional headroom items (2b, 3) are not needed for Gate 2 at the default cap.

## Sidebar alternative

`docs/DESIGN_B_SIDEBAR.md` evaluates a no-buck, smaller-ring variant
(24-LED halos, 5 V direct from USB-C). It shares items 1, 5, 6, 7, 8, 9, 10
and swaps the rings and everything on the 12 V rail.
