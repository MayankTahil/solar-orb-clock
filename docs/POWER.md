# Power architecture (Phase 2 pre-work)

Status: design note, not yet bench-validated. **CORRECTED 2026-11-09**: the
original budget applied the ~60 mA all-channels maximum as if it were
per-channel-sum, overstating per-LED draw ~4x. Corrected basis: ~20 mA per
channel at full 255 duty; an LED draws (channel-duty-sum / 255) x 20 mA.
The firmware's RGBW white split also puts white on the W channel alone — a
full-scale white pixel draws ~20 mA, not 60 mA. Numbers below are corrected.

## Budget (corrected)

Per-LED draw at the default `max_pwm = 0.40` cap, actual palette:

- sun gold `#ffb35c` full arc: ~11 mA
- moon silver `#a9bcf0`: ~8 mA
- indigo/white overlap: ~8–9 mA
- near-white jewel pixel: ~7–8 mA
- ESP32-S3 + Wi-Fi: ~150 mA

Design totals at 5 V:

| Design | Pixels | Realistic worst day | Firmware ceiling (every LED at cap) |
|---|---|---|---|
| A — two 60-LED rings | 127 | ~0.9 A / 4.5 W | ~1.4 A / 7 W |
| B — two 24-LED rings | 55 | ~0.5 A / 2.5 W | ~0.7 A / 3.5 W |
| C — one 60-LED ring, blended arcs | 67 | ~0.8 A / 4 W | ~0.9 A / 4.3 W |

A plain USB-C port without PD negotiation provides 5 V up to 3 A (15 W)
(https://learn.adafruit.com/usb-pd-hacks/things-to-know) — which now covers
every design at the default cap with 2–10x headroom. The QT Py's onboard
3.3 V regulator (600 mA peak) still only powers the MCU itself; LEDs need
the 5 V bus.

## Decision (revised after correction)

The 12 V trigger + buck chain below was sized on the erroneous figures and
is now OPTIONAL, not required:

- **Simple path (recommended at default cap)**: a USB-C breakout with 5.1 kΩ
  CC pull-downs (Adafruit product 4090) taps 5 V straight from any USB-C
  charger ≥15 W. No PD negotiation, no buck. Works for designs A, B and C.
- **Headroom path (only if raising `max_pwm` above ~0.6 or adding LEDs
  later)**: the HUSB238 trigger at 12 V + Pololu D36V50F5 buck, as specified
  in the architecture section below.

Firmware safeguard to add with the simple path: clamp the `max_pwm`
REST/config value (suggest ≤0.60) so a remote tweak cannot push the clock
past what a 5 V/3 A port delivers (each 0.1 of cap ≈ 0.25–0.35 A on
designs A/C).

## Architecture (headroom path, optional): one USB-C port via PD + buck

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
