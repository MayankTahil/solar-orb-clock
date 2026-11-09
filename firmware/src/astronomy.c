/* Solar Orb Clock — astronomy core. Pure C port of the validated browser
 * implementation (see index.html). Do not "simplify" formulas here without
 * re-running the fixture tests (firmware/test/run_tests.sh). */
#include "astronomy.h"
#include <math.h>
#include <stdlib.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

#define RAD (M_PI / 180.0)
#define DEG (180.0 / M_PI)

static double rev360(double x) { x = fmod(x, 360.0); return x < 0 ? x + 360.0 : x; }
static double wrap180(double x) { if (x > 180.0) x -= 360.0; if (x < -180.0) x += 360.0; return x; }
static double jd_of(double utc) { return utc / 86400.0 + 2440587.5; }

/* ---------- dates / civil time ---------- */
int orb_days_from_civil(int y, int m, int d) {          /* Howard Hinnant's algorithm */
    y -= m <= 2;
    const int era = (y >= 0 ? y : y - 399) / 400;
    const int yoe = y - era * 400;
    const int doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    const int doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + doe - 719468;
}
void orb_civil_from_days(int z, int *y, int *m, int *d) {
    z += 719468;
    const int era = (z >= 0 ? z : z - 146096) / 146097;
    const int doe = z - era * 146097;
    const int yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    const int yy = yoe + era * 400;
    const int doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    const int mp = (5 * doy + 2) / 153;
    const int dd = doy - (153 * mp + 2) / 5 + 1;
    const int mm = mp + (mp < 10 ? 3 : -9);
    *y = yy + (mm <= 2); *m = mm; *d = dd;
}
double orb_local_to_utc(int y, int m, int d, double local_minutes, int tz_offset_minutes) {
    return orb_days_from_civil(y, m, d) * 86400.0 + local_minutes * 60.0 - tz_offset_minutes * 60.0;
}

/* ---------- sun ---------- */
static void sun_ra_dec(double jd, double *ra, double *dec, double *lambda_deg) {
    const double n = jd - 2451545.0;
    const double L = fmod(280.460 + 0.9856474 * n, 360.0);
    const double g = fmod(357.528 + 0.9856003 * n, 360.0) * RAD;
    const double lambda = fmod(L + 1.915 * sin(g) + 0.020 * sin(2 * g), 360.0) * RAD;
    const double eps = (23.439 - 0.0000004 * n) * RAD;
    *ra = rev360(atan2(cos(eps) * sin(lambda), cos(lambda)) * DEG);
    *dec = asin(sin(eps) * sin(lambda)) * DEG;
    if (lambda_deg) *lambda_deg = lambda * DEG;
}
static double hour_angle(double jd, double lon, double ra) {
    double gmst = fmod(280.46061837 + 360.98564736629 * (jd - 2451545), 360.0);
    double lst = fmod(gmst + lon, 360.0); if (lst < 0) lst += 360.0;
    return wrap180(lst - ra);
}
static double alt_from(double dec, double lat, double ha) {
    return asin(sin(dec * RAD) * sin(lat * RAD) + cos(dec * RAD) * cos(lat * RAD) * cos(ha * RAD)) * DEG;
}
double orb_sun_alt(double utc, double lat, double lon) {
    double ra, dec; sun_ra_dec(jd_of(utc), &ra, &dec, NULL);
    return alt_from(dec, lat, hour_angle(jd_of(utc), lon, ra));
}
double orb_sun_az(double utc, double lat, double lon) {
    double ra, dec; sun_ra_dec(jd_of(utc), &ra, &dec, NULL);
    const double ha = hour_angle(jd_of(utc), lon, ra);
    return atan2(sin(ha * RAD), cos(ha * RAD) * sin(lat * RAD) - tan(dec * RAD) * cos(lat * RAD)) * DEG + 180.0;
}
double orb_sun_dec(double utc) {
    double ra, dec; sun_ra_dec(jd_of(utc), &ra, &dec, NULL);
    return dec;
}

/* ---------- moon ---------- */
typedef struct { double lon, lat, r; } moon_pos_t;       /* ecliptic geocentric, r in Earth radii */
static moon_pos_t moon_position(double jd) {
    const double d = jd - 2451543.5;                    /* days since 2000 Jan 0.0 */
    const double N = rev360(125.1228 - 0.0529538083 * d);
    const double w = rev360(318.0634 + 0.1643573223 * d);
    const double a = 60.2666, e = 0.054900, inc = 5.1454;
    const double M = rev360(115.3654 + 13.0649929527 * d);
    double E = M + DEG * e * sin(M * RAD) * (1 + e * cos(M * RAD));
    for (int k = 0; k < 5; k++) {
        const double dE = (E - DEG * e * sin(E * RAD) - M) / (1 - e * cos(E * RAD));
        E -= dE; if (fabs(dE) < 1e-9) break;
    }
    const double xv = a * (cos(E * RAD) - e), yv = a * sqrt(1 - e * e) * sin(E * RAD);
    const double v = atan2(yv, xv) * DEG, r = sqrt(xv * xv + yv * yv);
    const double vw = (v + w) * RAD, NR = N * RAD, ci = cos(inc * RAD);
    const double xh = r * (cos(NR) * cos(vw) - sin(NR) * sin(vw) * ci);
    const double yh = r * (sin(NR) * cos(vw) + cos(NR) * sin(vw) * ci);
    const double zh = r * sin(vw) * sin(inc * RAD);
    double lon = rev360(atan2(yh, xh) * DEG), lat = asin(zh / r) * DEG;
    /* perturbations */
    const double ws = rev360(282.9404 + 4.70935e-5 * d), Ms = rev360(356.0470 + 0.9856002585 * d);
    const double Ls = rev360(ws + Ms), Lm = rev360(N + w + M);
    const double D = rev360(Lm - Ls), F = rev360(Lm - N);
    lon += -1.274 * sin((M - 2 * D) * RAD) + 0.658 * sin(2 * D * RAD)
         - 0.186 * sin(Ms * RAD) - 0.059 * sin((2 * M - 2 * D) * RAD)
         - 0.057 * sin((M - 2 * D + Ms) * RAD) + 0.053 * sin((M + 2 * D) * RAD)
         + 0.046 * sin((2 * D - Ms) * RAD) + 0.041 * sin((M - Ms) * RAD)
         - 0.035 * sin(D * RAD) - 0.031 * sin((M + Ms) * RAD)
         - 0.015 * sin((2 * F - 2 * D) * RAD) + 0.011 * sin((M - 4 * D) * RAD);
    lat += -0.173 * sin((F - 2 * D) * RAD) - 0.055 * sin((M - F - 2 * D) * RAD)
         - 0.046 * sin((M + F - 2 * D) * RAD) + 0.033 * sin((F + 2 * D) * RAD)
         + 0.017 * sin((2 * M + F) * RAD);
    moon_pos_t p; p.lon = rev360(lon); p.lat = lat; p.r = r;
    return p;
}
static double moon_alt_topo(double utc, double lat, double lon) {
    const double jd = jd_of(utc);
    const moon_pos_t mp = moon_position(jd);
    const double eps = 23.4393 * RAD;
    const double x = cos(mp.lon * RAD) * cos(mp.lat * RAD);
    const double y = sin(mp.lon * RAD) * cos(mp.lat * RAD);
    const double z = sin(mp.lat * RAD);
    const double ye = y * cos(eps) - z * sin(eps), ze = y * sin(eps) + z * cos(eps);
    const double ra = atan2(ye, x) * DEG, dec = atan2(ze, sqrt(x * x + ye * ye)) * DEG;
    const double altG = alt_from(dec, lat, hour_angle(jd, lon, ra));
    const double par = asin(1.0 / mp.r) * DEG;         /* horizontal parallax */
    return altG - par * cos(altG * RAD);                /* topocentric */
}
double orb_moon_alt(double utc, double lat, double lon) { return moon_alt_topo(utc, lat, lon); }
double orb_moon_az(double utc, double lat, double lon) {
    const double jd = jd_of(utc);
    const moon_pos_t mp = moon_position(jd);
    const double eps = 23.4393 * RAD;
    const double x = cos(mp.lon * RAD) * cos(mp.lat * RAD);
    const double y = sin(mp.lon * RAD) * cos(mp.lat * RAD);
    const double z = sin(mp.lat * RAD);
    const double ye = y * cos(eps) - z * sin(eps), ze = y * sin(eps) + z * cos(eps);
    const double ra = atan2(ye, x) * DEG, dec = atan2(ze, sqrt(x * x + ye * ye)) * DEG;
    const double ha = hour_angle(jd, lon, ra);
    return atan2(sin(ha * RAD), cos(ha * RAD) * sin(lat * RAD) - tan(dec * RAD) * cos(lat * RAD)) * DEG + 180.0;
}
double orb_moon_illum(double utc) {
    double ra, dec, lambda_sun;
    sun_ra_dec(jd_of(utc), &ra, &dec, &lambda_sun);
    const moon_pos_t mp = moon_position(jd_of(utc));
    const double elong = rev360(mp.lon - lambda_sun);
    return (1.0 - cos(elong * RAD)) / 2.0;
}
double orb_moon_age_days(double utc) {
    double ra, dec, lambda_sun;
    sun_ra_dec(jd_of(utc), &ra, &dec, &lambda_sun);
    const moon_pos_t mp = moon_position(jd_of(utc));
    return rev360(mp.lon - lambda_sun) / 360.0 * 29.53058867;
}

/* ---------- events ---------- */
void orb_body_times(int body, int y, int m, int d, int tz_offset_minutes,
                    double lat, double lon, orb_events_t *out) {
    const double R = ORB_RISE_SET_ALT;
    const int step = body == 0 ? 4 : 6;
    double prev_t = 0, prev_alt = -999;
    int have_prev = 0;
    out->rise_min = NAN; out->set_min = NAN; out->noon_min = 720; out->peak_alt = -90;
    for (int t = 0; t <= 1440; t += step) {
        const double utc = orb_local_to_utc(y, m, d, t, tz_offset_minutes);
        const double alt = body == 0 ? orb_sun_alt(utc, lat, lon) : orb_moon_alt(utc, lat, lon);
        if (body == 0 && alt > out->peak_alt) { out->peak_alt = alt; out->noon_min = t; }
        if (have_prev) {
            if (prev_alt < R && alt >= R && isnan(out->rise_min))
                out->rise_min = prev_t + (R - prev_alt) / (alt - prev_alt) * step;
            if (prev_alt >= R && alt < R && isnan(out->set_min))
                out->set_min = prev_t + (R - prev_alt) / (alt - prev_alt) * step;
        }
        prev_t = t; prev_alt = alt; have_prev = 1;
    }
}

/* ---------- continuous event interpolation ---------- */
double orb_unwrap_lerp(double a, double b, double f) {
    if (b < a - 720.0) b += 1440.0;
    if (b > a + 720.0) b -= 1440.0;
    double r = fmod(a + (b - a) * f, 1440.0);
    return r < 0 ? r + 1440.0 : r;
}
double orb_smooth_event(double cur, double next, double next2, double f) {
    const int has_cur = !isnan(cur), has_next = !isnan(next), has_next2 = !isnan(next2);
    if (!has_cur && !has_next) return NAN;
    if (!has_cur) return next;
    if (!has_next) {
        if (has_next2) return orb_unwrap_lerp(cur, next2, f / 2.0);  /* skip day */
        return cur;
    }
    return orb_unwrap_lerp(cur, next, f);
}
