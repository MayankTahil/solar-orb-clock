#include "color_engine.h"
#include <math.h>
#include <stdlib.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

#define RAD (M_PI / 180.0)

static orb_rgb_t hx(const char *s) { /* '#rrggbb' */
    long v = strtol(s + 1, NULL, 16);
    orb_rgb_t c = { (v >> 16) & 255, (v >> 8) & 255, v & 255 };
    return c;
}
static orb_rgb_t mix(orb_rgb_t a, orb_rgb_t b, double t) {
    orb_rgb_t c = { a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t };
    return c;
}
static double clamp01(double v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
static double clampd(double v, double lo, double hi) { return v < lo ? lo : (v > hi ? hi : v); }

static const orb_rgb_t ORB_NAVY = { 10, 14, 42 };
static const orb_rgb_t ORB_INDIGO = { 67, 72, 158 };
static const orb_rgb_t ORB_SILVER = { 185, 205, 242 };

/* Seasonal anchors (palette ON): day-of-year -> hex. Must match index.html. */
orb_rgb_t orb_seasonal_peak(int doy, double dec, int palette_on) {
    if (!palette_on) {
        const double t = (clampd(dec / 23.44, -1, 1) + 1) / 2;
        return mix(hx("#eed9a0"), hx("#ffab2e"), t);
    }
    /* Continuous blend around the year between the four anchors, mirroring
     * seasonalPeak() in index.html (anchors replicated at -365/+365 so every
     * doy 1..366 falls inside a bracket). */
    static const int d[] = { 355 - 365, 79, 172, 266, 355, 79 + 365, 355 + 365 };
    static const char *hex[] = { "#f0d48c", "#f4c493", "#fb7c22", "#dd7027", "#f0d48c", "#f4c493", "#f0d48c" };
    for (int i = 0; i < 6; i++) {
        if (doy >= d[i] && doy <= d[i + 1]) {
            const double t = (double)(doy - d[i]) / (double)(d[i + 1] - d[i]);
            return mix(hx(hex[i]), hx(hex[i + 1]), t);
        }
    }
    return hx("#f0d48c");
}

orb_result_t orb_color(double s_alt, double m_alt, double illum,
                       orb_rgb_t peak_color, double peak_alt) {
    orb_result_t r; r.bright = 0; r.day_t = 0;
    if (s_alt >= 0) { /* day */
        const double pa = peak_alt < 0.01 ? 0.01 : (peak_alt > 90 ? 90 : peak_alt);
        const double s = clampd(s_alt, 0, 90);            /* degrees, NOT 0..1 */
        const double day_t = clamp01(pow(clamp01(sin(s * RAD) / sin(pa * RAD)), 0.55));
        const orb_rgb_t dawn = hx("#e2603c"), mid = hx("#ffb03a");
        r.color = day_t < 0.45 ? mix(dawn, mid, day_t / 0.45)
                               : mix(mid, peak_color, (day_t - 0.45) / 0.55);
        r.glow = 0.35 + day_t * 0.65;
        r.mode = 0; r.day_t = day_t;
        return r;
    }
    if (s_alt >= -12) { /* twilight */
        const double tw = clamp01((s_alt + 12) / 12);
        orb_rgb_t c = mix(hx("#2c2a63"), hx("#e2603c"), pow(tw, 1.3));
        if (m_alt > -2) {
            const double pull = clamp01((m_alt + 2) / 14) * (0.25 + 0.75 * illum);
            c = mix(c, ORB_INDIGO, pull * 0.55 * (1 - tw * 0.5));
        }
        r.color = c; r.glow = 0.22 + tw * 0.3; r.mode = 1;
        return r;
    }
    if (m_alt > 0) { /* night, moon up */
        const double elev_f = clamp01(m_alt / 38);
        const double bright = clamp01(illum * (0.35 + 0.65 * elev_f));
        r.color = bright < 0.5 ? mix(ORB_NAVY, ORB_INDIGO, bright * 2)
                               : mix(ORB_INDIGO, ORB_SILVER, (bright - 0.5) * 2);
        r.glow = 0.10 + bright * 0.55;
        r.mode = 2; r.bright = bright;
        return r;
    }
    r.color = ORB_NAVY; r.glow = 0.07; r.mode = 3;
    return r;
}

void orb_rgb_to_rgbw(orb_rgb_t c, double glow, double max_pwm,
                     int *r, int *g, int *b, int *w) {
    const double scale = glow * max_pwm;
    int rr = (int)(c.r * scale + 0.5);   /* round, matching JS Math.round */
    int gg = (int)(c.g * scale + 0.5);
    int bb = (int)(c.b * scale + 0.5);
    int ww = rr < gg ? (rr < bb ? rr : bb) : (gg < bb ? gg : bb);
    *r = rr - ww; *g = gg - ww; *b = bb - ww; *w = ww;
}
