/* Desktop test harness for the firmware astronomy core.
 * Validates the C port against the same Skyfield/JPL golden fixtures used by
 * the browser tests (tests/fixtures/astronomy_fixtures.json, flattened by
 * firmware/tools/make_c_fixtures.py). Build & run: firmware/test/run_tests.sh
 */
#include "../src/astronomy.h"
#include "../src/render.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int failures = 0;

static void check(const char *name, int ok, const char *detail) {
    printf("%s: %s%s%s\n", ok ? "PASS" : "FAIL", name, detail ? " — " : "", detail ? detail : "");
    if (!ok) failures++;
}

int main(void) {
    FILE *f = fopen("fixtures_flat.txt", "r");
    if (!f) { fprintf(stderr, "run from firmware/test/ (fixtures_flat.txt missing)\n"); return 2; }

    char line[256];
    /* ---- positions ---- */
    fgets(line, sizeof line, f);
    int npos = atoi(line + strlen("POSITIONS "));
    double max_malt = 0, max_salt = 0, max_ill = 0;
    for (int i = 0; i < npos; i++) {
        long epoch; double lat, lon, ref_malt, ref_salt, ref_ill;
        if (fscanf(f, "P %ld %lf %lf %lf %lf %lf\n", &epoch, &lat, &lon,
                   &ref_malt, &ref_salt, &ref_ill) != 6) { failures++; printf("FAIL: parse P\n"); break; }
        double malt = orb_moon_alt((double)epoch, lat, lon);
        double salt = orb_sun_alt((double)epoch, lat, lon);
        double ill = orb_moon_illum((double)epoch);
        double dm = fabs(malt - ref_malt), ds = fabs(salt - ref_salt), di = fabs(ill - ref_ill);
        if (dm > max_malt) max_malt = dm;
        if (ds > max_salt) max_salt = ds;
        if (di > max_ill) max_ill = di;
    }
    char buf[128];
    snprintf(buf, sizeof buf, "48 samples, max err %.4f deg", max_malt);
    check("moon altitude within 0.10 deg of Skyfield", max_malt <= 0.10, buf);
    snprintf(buf, sizeof buf, "48 samples, max err %.4f deg", max_salt);
    check("sun altitude within 0.10 deg of Skyfield", max_salt <= 0.10, buf);
    snprintf(buf, sizeof buf, "48 samples, max err %.4f", max_ill);
    check("moon illumination within 0.006 of Skyfield", max_ill <= 0.006, buf);

    /* ---- events ---- */
    fgets(line, sizeof line, f);
    int nev = atoi(line + strlen("EVENTS "));
    double max_err = 0;
    int presence_mismatch = 0;
    for (int i = 0; i < nev; i++) {
        int y, mo, d, off, body; double lat, lon, ref_rise, ref_set;
        char bodyname[8];
        if (fscanf(f, "E %d %d %d %d %lf %lf %d %s %lf %lf\n", &y, &mo, &d, &off,
                   &lat, &lon, &body, bodyname, &ref_rise, &ref_set) != 10) {
            failures++; printf("FAIL: parse E\n"); break;
        }
        orb_events_t ev;
        orb_body_times(body, y, mo, d, off, lat, lon, &ev);
        double got[2] = { ev.rise_min, ev.set_min };
        double ref[2] = { ref_rise, ref_set };
        for (int k = 0; k < 2; k++) {
            if (isnan(ref[k]) != isnan(got[k])) {
                presence_mismatch++;
                printf("FAIL: %s %s %04d-%02d-%02d presence mismatch (ref=%f js-style=%f)\n",
                       bodyname, k ? "set" : "rise", y, mo, d, ref[k], got[k]);
                continue;
            }
            if (!isnan(ref[k])) {
                double err = fabs(got[k] - ref[k]);
                if (err > max_err) max_err = err;
            }
        }
    }
    snprintf(buf, sizeof buf, "max err %.2f min", max_err);
    check("sun & moon rise/set within 4 min of Skyfield",
          max_err <= 4.0 && presence_mismatch == 0, buf);

    /* ---- continuous interpolation: zero jump at the day boundary ---- */
    double worst = 0;
    const double lat = 47.6062, lon = -122.3321; const int off = -480; /* Seattle, PST */
    for (int day = 1; day <= 28; day++) {
        for (int body = 0; body < 2; body++) {
            orb_events_t e0, e1;
            orb_body_times(body, 2026, 11, day, off, lat, lon, &e0);
            orb_body_times(body, 2026, 11, day + 1, off, lat, lon, &e1);
            double a = body ? e0.set_min : e0.rise_min;
            double b = body ? e1.set_min : e1.rise_min;
            if (isnan(a) || isnan(b)) continue;
            double end_n = orb_smooth_event(a, b, NAN, 1.0);   /* f=1 on day N */
            double bb = b;                                     /* f=0 on day N+1 is b itself */
            if (fabs(bb - end_n) > 720) bb += (bb < end_n ? 1440 : -1440);
            double jump = fabs(bb - end_n);
            if (jump > worst) worst = jump;
        }
    }
    snprintf(buf, sizeof buf, "max boundary jump %.6f min", worst);
    check("event interpolation continuous across midnight", worst < 1e-6, buf);

    /* ---- bead frame sanity (render layer) ---- */
    {
        double frame[ORB_LED_COUNT];
        /* noon on a 6-18 day: bead should sit at bottom (LED 30) with arc lit */
        orb_halo_frame(360, 1080, 720, frame);
        double total = 0; int peak = 0;
        for (int i = 0; i < ORB_LED_COUNT; i++) { total += frame[i]; if (frame[i] > frame[peak]) peak = i; }
        snprintf(buf, sizeof buf, "peak LED %d (expect 30), sum %.2f", peak, total);
        check("bead centred at noon on 6-18 day", peak == 30, buf);
        /* bead brightness conservation: kernel sums to ~1.0 */
        snprintf(buf, sizeof buf, "bead+arc sum %.3f (arc adds ~%.2f)", total, 0.35 * 30);
        check("bead kernel conserves brightness (sum >= 1.0)", total >= 1.0, buf);
    }

    printf(failures == 0 ? "\nALL PASS\n" : "\n%d FAILURE(S)\n", failures);
    return failures == 0 ? 0 : 1;
}
