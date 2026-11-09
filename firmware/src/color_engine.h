/* Solar Orb Clock — color engine (pure C port of orbColor in index.html).
 * Deterministic function of (sun alt, moon alt, illumination, date) -> orb
 * color + glow. Shared design constants live here so the browser and the
 * device cannot drift apart. */
#ifndef ORB_COLOR_H
#define ORB_COLOR_H

#ifdef __cplusplus
extern "C" {
#endif

typedef struct { double r, g, b; } orb_rgb_t;

typedef struct {
    orb_rgb_t color;    /* 0..255 per channel (display RGB) */
    double    glow;     /* 0..1 overall luminosity */
    double    bright;   /* night: moon brightness factor 0..1 */
    int       mode;     /* 0 day, 1 twilight, 2 night-moon, 3 night-dark */
    double    day_t;    /* day: normalized elevation 0..1 */
} orb_result_t;

/* Seasonal noon peak color. doy = day of year 1..366, dec = sun declination. */
orb_rgb_t orb_seasonal_peak(int doy, double dec, int palette_on);

/* Main color model. peak_alt = today's peak solar altitude (for normalization). */
orb_result_t orb_color(double sun_alt, double moon_alt, double illum,
                       orb_rgb_t peak_color, double peak_alt);

/* Split white out of RGB and apply the brightness cap -> RGBW 0..255. */
void orb_rgb_to_rgbw(orb_rgb_t c, double glow, double max_pwm,
                     int *r, int *g, int *b, int *w);

#ifdef __cplusplus
}
#endif

#endif /* ORB_COLOR_H */
