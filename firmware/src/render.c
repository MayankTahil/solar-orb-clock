#include "render.h"
#include "astronomy.h"
#include <math.h>

static int led_of(double minutes) {           /* minutes-of-day -> LED index */
    if (minutes < 0) minutes += 1440;
    return (int) fmod(minutes, 1440.0) / 1440.0 * ORB_LED_COUNT;
}

void orb_halo_frame(const double rise_min, const double set_min,
                    const double now_min, double out[ORB_LED_COUNT]) {
    for (int i = 0; i < ORB_LED_COUNT; i++) out[i] = 0.0;

    /* ---- arc from rise to set (clockwise, may wrap midnight) ---- */
    if (!isnan(rise_min) && !isnan(set_min)) {
        double dur = set_min - rise_min;
        if (dur <= 0) dur += 1440;
        if (dur < 1440) {
            const int start = led_of(rise_min), end = led_of(set_min);
            const int len = (end >= start) ? end - start + 1 : end + ORB_LED_COUNT - start + 1;
            for (int k = 0; k < len; k++) {
                const int idx = (start + k) % ORB_LED_COUNT;
                double w = ORB_ARC_BRIGHTNESS;
                /* fade ramp at both ends: outermost LED 25%, then 50%, rest 100% */
                if (k == 0) w *= 0.25;
                else if (k == 1 && len > 3) w *= 0.50;
                if (k == len - 1) w *= 0.25;
                else if (k == len - 2 && len > 3) w *= 0.50;
                out[idx] = w;
            }
        }
    }

    /* ---- anti-aliased "now" bead (20-60-20 across 3 LEDs) ----
     * The bead is placed at the fractional LED position; the kernel is
     * redistributed across LEDs so total brightness stays constant. */
    if (!isnan(rise_min) && !isnan(set_min)) {   /* body above horizon? */
        double lo = rise_min, hi = set_min;
        if (hi < lo) hi += 1440;                 /* arc wraps midnight */
        double now = now_min;
        if (now < lo - 720) now += 1440;         /* bring 'now' into arc's day frame */
        if (now >= lo && now <= hi) {
            const double pos = fmod(now, 1440.0) / 1440.0 * ORB_LED_COUNT; /* fractional LED */
            const double frac = pos - floor(pos);
            const int c = (int) floor(pos);       /* centre LED */
            const double k0 = 0.20, k1 = 0.60, k2 = 0.20;
            /* kernel centred on c, redistributed by frac:
             * weight(led) = kernel contribution; sum stays 1.0 */
            out[(c + ORB_LED_COUNT - 1) % ORB_LED_COUNT] += k0 * (1 - frac);
            out[c % ORB_LED_COUNT]                += k1 * (1 - frac) + k0 * frac;
            out[(c + 1) % ORB_LED_COUNT]          += k2 * (1 - frac) + k1 * frac;
            out[(c + 2) % ORB_LED_COUNT]          += k2 * frac;
        }
    }
}

void orb_ring_to_rgbw(const double frame[ORB_LED_COUNT],
                      orb_rgb_t color, double max_pwm,
                      unsigned char rgbw[ORB_LED_COUNT][4]) {
    for (int i = 0; i < ORB_LED_COUNT; i++) {
        double v = frame[i];
        if (v > 1.0) v = 1.0;
        const double r = color.r * v * max_pwm;
        const double g = color.g * v * max_pwm;
        const double b = color.b * v * max_pwm;
        int rr = (int)(r + 0.5), gg = (int)(g + 0.5), bb = (int)(b + 0.5);
        int ww = rr < gg ? (rr < bb ? rr : bb) : (gg < bb ? gg : bb);
        rgbw[i][0] = (unsigned char)(rr - ww);
        rgbw[i][1] = (unsigned char)(gg - ww);
        rgbw[i][2] = (unsigned char)(bb - ww);
        rgbw[i][3] = (unsigned char)ww;
    }
}
