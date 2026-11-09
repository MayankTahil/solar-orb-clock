/* Solar Orb Clock — device configuration (persisted to NVS via Preferences).
 * Defaults reflect the baked design decisions (docs/ROADMAP.md):
 * 60-LED rings, 240 astronomy updates/day, 40% PWM brightness cap. */
#ifndef ORB_CONFIG_H
#define ORB_CONFIG_H

typedef struct {
    double lat;             /* +north */
    double lon;             /* +east  */
    int    tz_offset_min;   /* standard-time UTC offset, minutes (e.g. -480 = PST) */
    int    dst_rule;        /* 0 = none, 1 = US (2nd Sun Mar – 1st Sun Nov) */
    int    palette_on;      /* seasonal noon palette */
    double max_pwm;         /* global brightness cap (knob 100% = this) */
    int    update_per_day;  /* astronomy recomputation cadence (default 240) */
} orb_config_t;

static const orb_config_t ORB_CONFIG_DEFAULTS = {
    47.6062, -122.3321,     /* Seattle */
    -480,                   /* PST */
    1,                      /* US DST */
    1,                      /* palette on */
    0.40,                   /* 40% PWM cap — tune in the wood */
    240                     /* every 6 minutes */
};

#endif /* ORB_CONFIG_H */
