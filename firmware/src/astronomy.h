/* Solar Orb Clock — astronomy core (pure C, no platform dependencies).
 *
 * Port of the browser simulator's validated astronomy (index.html), kept
 * line-for-line equivalent so both implementations can be checked against the
 * same Skyfield/JPL golden fixtures (tests/fixtures/astronomy_fixtures.json).
 *
 * Validated accuracy (vs Skyfield + de421, see firmware/test/):
 *   sun altitude  ~0.01 deg, moon altitude ~0.04 deg (topocentric),
 *   rise/set     < 0.5 min at mid-latitudes.
 *
 * Time is a double Unix epoch (seconds UTC). All angles in degrees unless
 * noted. Latitude north positive, longitude east positive.
 */
#ifndef ORB_ASTRONOMY_H
#define ORB_ASTRONOMY_H

#define ORB_RISE_SET_ALT (-0.833)   /* USNO: 34' refraction + 16' semidiameter */

/* --- dates / civil time --- */
int    orb_days_from_civil(int y, int m, int d);          /* days since 1970-01-01 */
void   orb_civil_from_days(int z, int *y, int *m, int *d);
double orb_local_to_utc(int y, int m, int d, double local_minutes,
                        int tz_offset_minutes);

/* --- sun --- */
double orb_sun_alt(double utc, double lat, double lon);
double orb_sun_az(double utc, double lat, double lon);
double orb_sun_dec(double utc);                            /* for seasonal palette */

/* --- moon (truncated ELP-2000-style series, topocentric) --- */
double orb_moon_alt(double utc, double lat, double lon);
double orb_moon_az(double utc, double lat, double lon);
double orb_moon_illum(double utc);                        /* 0..1 from elongation */
double orb_moon_age_days(double utc);                     /* elongation-derived age */

/* --- events (first rise / first set of the local civil day) --- */
typedef struct {
    double rise_min;    /* minutes after local midnight, or NAN if none */
    double set_min;     /* minutes after local midnight, or NAN if none */
    double noon_min;    /* sun only: minute of peak altitude */
    double peak_alt;    /* sun only: peak altitude, deg (polar day/night sign) */
} orb_events_t;

void orb_body_times(int body /*0=sun 1=moon*/, int y, int m, int d,
                    int tz_offset_minutes, double lat, double lon,
                    orb_events_t *out);

/* --- continuous event interpolation (mirrors smoothEvents in index.html) --- */
double orb_unwrap_lerp(double a, double b, double f);      /* minutes-of-day */
/* Interpolated rise or set for fraction f of the current day. Any of
 * cur/next/next2 may be NAN (no event that day). */
double orb_smooth_event(double cur, double next, double next2, double f);

#endif /* ORB_ASTRONOMY_H */
