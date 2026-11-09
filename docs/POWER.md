# Power architecture (Phase 2 pre-work)

Status: design note, not yet bench-validated. Numbers below are computed from the
firmware's actual RGBW output paths (`firmware/src/main.cpp`, `render.c`,
`color_engine.c`) with the default `max_pwm = 0.40` cap.

## Budget

LED inventory: 2 x 60-LED RGBW rings + 7-LED RGBW jewel = 127 pixels
(SK6812-style RGBW, ~60 mA absolute max per pixel, all channels full).

Worst-case per LED at the 40% cap, using the firmware's white-channel split
(min-channel moved to W):

- Sun ring, gold `#ffb35c`, arc value 1.0: R=65, G=35, B=0, W=37 of 255
  → ~32 mA. Full 60-LED ring: ~1.9 A.
- Moon ring, silver `#a9bcf0`: ~24 mA → ~1.45 A for the full ring.
- Orb jewel (7 px, near-white peak): ~0.2 A.
- ESP32-S3 + Wi-Fi: ~0.15 A at the 5 V rail.

Both rings are never fully lit at once in normal operation (arcs are
complementary day/night), so realistic worst case is ~2.3–2.5 A at 5 V
(~12 W); pathological all-on cap is ~3.7 A (~18.5 W). A plain USB-C port
without PD negotiation tops out at 5 V/3 A = 15 W — no headroom. The QT Py's
onboard 3.3 V regulator (600 mA peak) can only ever power the MCU itself.

**Design target: 5 V at 4 A continuous (20 W).**

## Decision

A separate power stage is warranted from the first full-ring bench test
(Roadmap Phase 1.5 step 3) onward. Bring-up with a short test strip
(≤20 pixels) can run off the QT Py's own USB port.

## Architecture: one USB-C port

USB-C PD wall charger (≥30 W) → PD trigger/decoy board set to 12 V →
5 V buck → 5 V bus feeding rings and the QT Py's 5 V pin.

- **PD trigger:** CH224K-based decoy (DIP-selectable 5/9/12/15/20 V, up to
  100 W) or the Adafruit HUSB238 "USB Type C Power Delivery Dummy Breakout".
  Set to 12 V. Sources: done.land CH224 family overview
  (https://done.land/components/power/powersupplies/usb/usbtriggers/ch224/),
  Adafruit USB-PD Hacks guide
  (https://learn.adafruit.com/usb-pd-hacks).
- **Buck:** Pololu D36V50F5 (5 V, 5.5 A, input 5.5–50 V, reverse-polarity
  and overcurrent protected, 80–95% efficient). 12 V/3 A in (36 W) is ample
  headroom over the 20 W target. Source: https://www.pololu.com/product/4091.
- **Level shifting:** the QT Py's GPIO data lines are 3.3 V; NeoPixel DIN
  wants ~0.7×VCC ≈ 3.5 V for a reliable high. Use a 74AHCT125 quad buffer
  powered from the 5 V bus (TTL-compatible input threshold, accepts 3.3 V
  logic) — one gate per strip. Per Adafruit best practice also put 300–500 Ω
  in series with each DIN and 1000 µF electrolytic across 5 V/GND at each
  ring's power entry. Source: Adafruit NeoPixel Überguide, Powering
  (https://learn.adafruit.com/adafruit-neopixel-uberguide/powering-neopixels).

## Wiring

```
USB-C PD charger (≥30 W)
  │  (full-featured charge+data rated cable, ≥3 A)
  ▼
PD trigger, DIP = 12V          Pololu D36V50F5
  OUT+ ─────────────────────►  VIN
  OUT– ─────────────────────►  GND
                               VOUT ──► 5 V BUS
                               GND  ──► GND BUS

5 V BUS ──► ring1 +5V, ring2 +5V, jewel +5V, QT Py 5V pin, AHCT125 VCC
GND BUS ──► all GND (star ground at the buck output)

QT Py ESP32-S3
  GPIO18 (A0) ──► AHCT125 in A ──► out ──470Ω──► jewel DIN
  GPIO17 (A1) ──► AHCT125 in B ──► out ──470Ω──► sun ring DIN
  GPIO9  (A2) ──► AHCT125 in C ──► out ──470Ω──► moon ring DIN
  (AHCT125 OE pins tied to GND; 4th gate unused, input tied to GND)
```

Notes:

- Inject 5 V at **both ends** of each 60-LED ring if the ring PCB exposes
  end pads; ~2 A through one entry point risks visible voltage droop
  (reddish tint) at the far side.
- Program the QT Py over its own USB-C first, then switch to bus power via
  the 5 V pin. Leaving USB connected for serial logs while bus-powered is
  normally safe on Adafruit ESP32-S3 boards (diode-isolated 5 V input), but
  avoid it during first bring-up.
- Never feed 5 V into the 3V3 pin; never back-feed the buck from the rings.
- Optional: 4 A polyfuse inline on the 5 V bus, plus the `max_pwm` REST
  parameter as the software current limiter (each 0.1 of cap ≈ 0.9 A at the
  pathological all-on extreme).

## Alternatives considered

- 5 V-only USB-C (no PD): 15 W hard ceiling, no margin. Rejected.
- USB-C PD 5 V/5 A supplies (e.g., Raspberry Pi 27 W): 5 A at 5 V requires
  the source to advertise a 5 V/5 A PDO and the sink to request it; most
  trigger boards request the standard 5 V/3 A PDO. Workable but fragile.
- Dedicated 5 V/4 A barrel-jack supply: simplest electrically, but loses the
  single USB-C port requirement.
