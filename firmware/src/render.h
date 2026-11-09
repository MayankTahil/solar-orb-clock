/* Solar Orb Clock — halo ring rendering.
 *
 * Design decisions (baked 2026-11-08, see docs/ROADMAP.md):
 *   - 60-LED rings, 24-hour dial: LED 0 at top = midnight, clockwise.
 *   - 240 updates/day (every 6 min) of the astronomy state.
 *   - "Now" bead: 20-60-20 brightness kernel across 3 LEDs, anti-aliased to
 *     the fractional position so it glides instead of ticking.
 *   - Arc ends (rise/set) fade in over the last LEDs (25%-50%-100% ramp) so
 *     the daily growth/shrink of the arc reads as a smooth bloom.
 *   - Bead shown only while its body is above the horizon (active ring),
 *     matching the original brief's "travelling now bead on the active ring".
 */
#ifndef ORB_RENDER_H
#define ORB_RENDER_H

#include "color_engine.h"

#define ORB_LED_COUNT      60
#define ORB_UPDATE_PER_DAY 240          /* astronomy recomputation cadence */
#define ORB_ARC_BRIGHTNESS 0.35         /* arc body, relative to bead */
#define ORB_BEAD_KERNEL    {0.20, 0.60, 0.20}
#define ORB_ARC_END_RAMP   {0.25, 0.50, 1.00}   /* outermost -> inward */

/* Compute one ring's frame: brightness 0..1 per LED for the arc + bead.
 * rise_min/set_min: event minutes-of-day (interpolated/continuum values);
 * NAN for "no event" hides the arc. now_min: current local minutes-of-day.
 * Returns the number of LEDs written into out[] (always ORB_LED_COUNT). */
void orb_halo_frame(const double rise_min, const double set_min,
                    const double now_min, double out[ORB_LED_COUNT]);

/* Map one ring frame to RGBW (color * brightness * global cap). */
void orb_ring_to_rgbw(const double frame[ORB_LED_COUNT],
                      orb_rgb_t color, double max_pwm,
                      unsigned char rgbw[ORB_LED_COUNT][4]);

#endif /* ORB_RENDER_H */
