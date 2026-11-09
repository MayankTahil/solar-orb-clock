/* Solar Orb Clock — ESP32 firmware (Seeed XIAO ESP32-C6 target).
 *
 * Layers:
 *   astronomy.c / color_engine.c / render.c — pure C, fixture-validated on
 *     the desktop (firmware/test/run_tests.sh). No Arduino code may leak
 *     into those files.
 *   main.cpp (this file) — device plumbing only: Wi-Fi, NTP time, NVS-persisted
 *     configuration, NeoPixel output, and the REST API for remote control.
 *
 * STATUS: math core is desktop-validated; this file is written but NOT yet
 * compiled on hardware (no board in hand). First bench task: compile, flash,
 * run /api/status against a serial log and compare with the simulator.
 *
 * REST API (see ../api.md):
 *   GET  /api/status      — live astronomical + orb state
 *   GET  /api/astronomy   — today's and tomorrow's rise/set events
 *   GET  /api/config      — current configuration (JSON)
 *   PUT  /api/config      — update configuration (query params or JSON body),
 *                           persisted to NVS, applied on next tick
 *   GET  /api/health      — uptime, RSSI, free heap
 */
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <Adafruit_NeoPixel.h>
#include <time.h>
#include <math.h>

#include "astronomy.h"
#include "color_engine.h"
#include "render.h"
#include "config.h"

/* ---- WiFi credentials: copy wifi_secrets.example.h to wifi_secrets.h ---- */
#include "wifi_secrets.h"

/* ---- pins (from the original project brief; confirm on the bench) ---- */
static const int ORB_PIN = 6, SUN_RING_PIN = 7, MOON_RING_PIN = 8;
static const int ORB_LED_N = 7;               /* NeoPixel Jewel */

Adafruit_NeoPixel orb(ORB_LED_N, ORB_PIN, NEO_GRBW + NEO_KHZ800);
Adafruit_NeoPixel sunRing(ORB_LED_COUNT, SUN_RING_PIN, NEO_GRBW + NEO_KHZ800);
Adafruit_NeoPixel moonRing(ORB_LED_COUNT, MOON_RING_PIN, NEO_GRBW + NEO_KHZ800);
WebServer server(80);
Preferences prefs;

static orb_config_t cfg = ORB_CONFIG_DEFAULTS;

/* forward declarations */
static orb_rgb_t hx_rgb(const char *s);
static int us_dst_active(int y, int mo, int d);

static orb_rgb_t hx_rgb(const char *s) {
    long v = strtol(s + 1, NULL, 16);
    orb_rgb_t c = { (double)((v >> 16) & 255), (double)((v >> 8) & 255), (double)(v & 255) };
    return c;
}

/* ---- cached daily astronomy state (recomputed once per civil day) ---- */
typedef struct {
    int y, mo, d;
    orb_events_t sun[3], moon[3];             /* today, +1, +2 */
} day_state_t;
static day_state_t day_state;
static bool day_state_valid = false;

static void compute_day_state(struct tm *local) {
    day_state.y = local->tm_year + 1900;
    day_state.mo = local->tm_mon + 1;
    day_state.d = local->tm_mday;
    const int off = cfg.tz_offset_min + (cfg.dst_rule ? us_dst_active(day_state.y, day_state.mo, day_state.d) * 60 : 0);
    for (int k = 0; k < 3; k++) {
        int y = day_state.y, m = day_state.mo, dd = day_state.d;
        int z = orb_days_from_civil(y, m, dd) + k;
        orb_civil_from_days(z, &y, &m, &dd);
        orb_body_times(0, y, m, dd, off, cfg.lat, cfg.lon, &day_state.sun[k]);
        orb_body_times(1, y, m, dd, off, cfg.lat, cfg.lon, &day_state.moon[k]);
    }
    day_state_valid = true;
}

/* US DST rule: second Sunday in March .. first Sunday in November.
 * nth_weekday returns the day-of-month of the nth given weekday. */
static int nth_weekday(int y, int m, int nth, int weekday /*0=Sun*/) {
    const int w1 = (orb_days_from_civil(y, m, 1) + 4) % 7;   /* Jan 1 1970 = Thursday */
    const int first = 1 + ((7 + weekday - w1) % 7);
    return first + 7 * (nth - 1);
}
static int us_dst_active(int y, int mo, int d) {
    if (mo < 3 || mo > 11) return 0;
    if (mo > 3 && mo < 11) return 1;
    const int z = orb_days_from_civil(y, mo, d);
    if (mo == 3) return z >= orb_days_from_civil(y, 3, nth_weekday(y, 3, 2, 0)) ? 1 : 0;
    return z < orb_days_from_civil(y, 11, nth_weekday(y, 11, 1, 0)) ? 1 : 0;
}

/* ---- one astronomy + render tick ---- */
static double s_rise, s_set, m_rise, m_set;   /* interpolated display values */
static orb_result_t last_result;
static double last_sun_alt, last_moon_alt, last_illum;
static int last_rgbw[4] = { 0, 0, 0, 0 };   /* orb RGBW actually written to the LEDs */

static void tick(struct tm *local, double frac_day) {
    if (!day_state_valid) compute_day_state(local);
    const double f = frac_day;
    s_rise = orb_smooth_event(day_state.sun[0].rise_min, day_state.sun[1].rise_min, day_state.sun[2].rise_min, f);
    s_set  = orb_smooth_event(day_state.sun[0].set_min,  day_state.sun[1].set_min,  day_state.sun[2].set_min,  f);
    m_rise = orb_smooth_event(day_state.moon[0].rise_min, day_state.moon[1].rise_min, day_state.moon[2].rise_min, f);
    m_set  = orb_smooth_event(day_state.moon[0].set_min,  day_state.moon[1].set_min,  day_state.moon[2].set_min,  f);

    const int off = cfg.tz_offset_min + (cfg.dst_rule ? us_dst_active(day_state.y, day_state.mo, day_state.d) * 60 : 0);
    const double now_min = local->tm_hour * 60.0 + local->tm_min + local->tm_sec / 60.0;
    const double utc = orb_local_to_utc(day_state.y, day_state.mo, day_state.d, now_min, off);

    last_sun_alt = orb_sun_alt(utc, cfg.lat, cfg.lon);
    last_moon_alt = orb_moon_alt(utc, cfg.lat, cfg.lon);
    last_illum = orb_moon_illum(utc);

    int doy = orb_days_from_civil(day_state.y, day_state.mo, day_state.d)
            - orb_days_from_civil(day_state.y, 1, 1) + 1;
    orb_rgb_t peak = orb_seasonal_peak(doy, orb_sun_dec(utc), cfg.palette_on);
    last_result = orb_color(last_sun_alt, last_moon_alt, last_illum, peak, day_state.sun[0].peak_alt);

    /* orb: RGBW with the cap */
    int r, g, b, w;
    orb_rgb_to_rgbw(last_result.color, last_result.glow, cfg.max_pwm, &r, &g, &b, &w);
    last_rgbw[0] = r; last_rgbw[1] = g; last_rgbw[2] = b; last_rgbw[3] = w;
    uint32_t c = orb.Color(r, g, b, w);
    for (int i = 0; i < ORB_LED_N; i++) orb.setPixelColor(i, c);

    /* rings: arc + anti-aliased bead, arc colors from the brief */
    double frame[ORB_LED_COUNT];
    unsigned char rgbw[ORB_LED_COUNT][4];
    orb_halo_frame(s_rise, s_set, now_min, frame);
    orb_ring_to_rgbw(frame, hx_rgb("#ffb35c"), cfg.max_pwm, rgbw);        /* gold sun ring */
    for (int i = 0; i < ORB_LED_COUNT; i++)
        sunRing.setPixelColor(i, sunRing.Color(rgbw[i][0], rgbw[i][1], rgbw[i][2], rgbw[i][3]));
    orb_halo_frame(m_rise, m_set, now_min, frame);
    orb_ring_to_rgbw(frame, hx_rgb("#a9bcf0"), cfg.max_pwm, rgbw);        /* silver moon ring */
    for (int i = 0; i < ORB_LED_COUNT; i++)
        moonRing.setPixelColor(i, moonRing.Color(rgbw[i][0], rgbw[i][1], rgbw[i][2], rgbw[i][3]));

    orb.show(); sunRing.show(); moonRing.show();
}

/* ================= REST API ================= */
static void json_header() { server.sendHeader("Access-Control-Allow-Origin", "*"); server.setContentLength(CONTENT_LENGTH_UNKNOWN); }
static void send_json(const char *s) { server.send(200, "application/json", s); }

static const char *MODE_NAMES[] = { "day", "twilight", "night-moon", "night-dark" };
static void ev_json(char *buf, size_t n, const char *key, double v) {
    if (isnan(v)) snprintf(buf, n, "\"%s\":null", key);
    else snprintf(buf, n, "\"%s\":%.2f", key, v);
}

static void handle_status() {
    char ev1[48], ev2[48], ev3[48], ev4[48];
    ev_json(ev1, sizeof ev1, "sunrise", s_rise); ev_json(ev2, sizeof ev2, "sunset", s_set);
    ev_json(ev3, sizeof ev3, "moonrise", m_rise); ev_json(ev4, sizeof ev4, "moonset", m_set);
    time_t now; time(&now);
    char out[640];
    snprintf(out, sizeof out,
        "{\"utc\":%lld,\"sun\":{\"alt\":%.2f,\"az\":%.2f},"
        "\"moon\":{\"alt\":%.2f,\"az\":%.2f,\"illum\":%.3f,\"age_days\":%.2f},"
        "\"mode\":\"%s\",\"orb\":{\"rgb\":[%d,%d,%d],\"rgbw\":[%d,%d,%d,%d],\"glow\":%.3f},"
        "\"events\":{%s,%s,%s,%s}}",
        (long long)now, last_sun_alt, orb_sun_az((double)now, cfg.lat, cfg.lon),
        last_moon_alt, orb_moon_az((double)now, cfg.lat, cfg.lon), last_illum,
        orb_moon_age_days((double)now), MODE_NAMES[last_result.mode],
        (int)(last_result.color.r + 0.5), (int)(last_result.color.g + 0.5), (int)(last_result.color.b + 0.5),
        last_rgbw[0], last_rgbw[1], last_rgbw[2], last_rgbw[3],
        last_result.glow, ev1, ev2, ev3, ev4);
    send_json(out);
}

static void handle_astronomy() {
    char buf[512];
    snprintf(buf, sizeof buf,
        "{\"date\":\"%04d-%02d-%02d\",\"lat\":%.4f,\"lon\":%.4f,"
        "\"today\":{\"sunrise\":%.2f,\"sunset\":%.2f,\"noon\":%.2f,\"peak_alt\":%.2f,"
        "\"moonrise\":%.2f,\"moonset\":%.2f},"
        "\"tomorrow\":{\"sunrise\":%.2f,\"sunset\":%.2f,\"moonrise\":%.2f,\"moonset\":%.2f}}",
        day_state.y, day_state.mo, day_state.d, cfg.lat, cfg.lon,
        day_state.sun[0].rise_min, day_state.sun[0].set_min, day_state.sun[0].noon_min, day_state.sun[0].peak_alt,
        day_state.moon[0].rise_min, day_state.moon[0].set_min,
        day_state.sun[1].rise_min, day_state.sun[1].set_min, day_state.moon[1].rise_min, day_state.moon[1].set_min);
    send_json(buf);
}

static void handle_get_config() {
    char buf[256];
    snprintf(buf, sizeof buf,
        "{\"lat\":%.5f,\"lon\":%.5f,\"tz_offset_min\":%d,\"dst_rule\":%d,"
        "\"palette_on\":%d,\"max_pwm\":%.2f,\"update_per_day\":%d,\"led_count\":%d}",
        cfg.lat, cfg.lon, cfg.tz_offset_min, cfg.dst_rule, cfg.palette_on, cfg.max_pwm,
        cfg.update_per_day, ORB_LED_COUNT);
    send_json(buf);
}

/* Parse "key":number from a JSON body (minimal matcher, no nesting). */
static bool body_num(const char *body, const char *key, double *out) {
    const char *p = strstr(body, key);
    if (!p) return false;
    p = strchr(p + strlen(key), ':');
    if (!p) return false;
    *out = strtod(p + 1, NULL);
    return true;
}

static void handle_put_config() {
    double v; int changed = 0;
    if (server.hasArg("lat")) { cfg.lat = server.arg("lat").toDouble(); changed++; }
    if (server.hasArg("lon")) { cfg.lon = server.arg("lon").toDouble(); changed++; }
    if (server.hasArg("tz_offset_min")) { cfg.tz_offset_min = server.arg("tz_offset_min").toInt(); changed++; }
    if (server.hasArg("dst_rule")) { cfg.dst_rule = server.arg("dst_rule").toInt() != 0; changed++; }
    if (server.hasArg("palette_on")) { cfg.palette_on = server.arg("palette_on").toInt() != 0; changed++; }
    if (server.hasArg("max_pwm")) { cfg.max_pwm = server.arg("max_pwm").toDouble(); changed++; }
    if (server.hasArg("update_per_day")) {
        int u = server.arg("update_per_day").toInt();
        if (u >= 60 && u <= 1440) cfg.update_per_day = u;
        changed++;
    }
    /* JSON body fallback when no query parameters were given */
    if (!changed) {
        String plain = server.arg("plain");
        const char *body = plain.c_str();
        if (body_num(body, "lat", &v)) { cfg.lat = v; changed++; }
        if (body_num(body, "lon", &v)) { cfg.lon = v; changed++; }
        if (body_num(body, "tz_offset_min", &v)) { cfg.tz_offset_min = (int)v; changed++; }
        if (body_num(body, "dst_rule", &v)) { cfg.dst_rule = v != 0; changed++; }
        if (body_num(body, "palette_on", &v)) { cfg.palette_on = v != 0; changed++; }
        if (body_num(body, "max_pwm", &v)) { cfg.max_pwm = v; changed++; }
        if (body_num(body, "update_per_day", &v)) {
            if (v >= 60 && v <= 1440) cfg.update_per_day = (int)v;
            changed++;
        }
    }
    if (changed) {
        prefs.begin("orb", false);
        prefs.putDouble("lat", cfg.lat); prefs.putDouble("lon", cfg.lon);
        prefs.putInt("tz", cfg.tz_offset_min); prefs.putInt("dst", cfg.dst_rule);
        prefs.putBool("palette", cfg.palette_on); prefs.putDouble("pwm", cfg.max_pwm);
        prefs.putInt("upd", cfg.update_per_day);
        prefs.end();
        day_state_valid = false;             /* recompute events with new location */
    }
    handle_get_config();
}

static void handle_health() {
    char buf[192];
    snprintf(buf, sizeof buf,
        "{\"uptime_s\":%lu,\"rssi\":%d,\"free_heap\":%lu,\"wifi\":\"%s\"}",
        (unsigned long)millis() / 1000, WiFi.RSSI(),
        (unsigned long)ESP.getFreeHeap(), WiFi.SSID().c_str());
    send_json(buf);
}

/* ================= setup / loop ================= */
static void load_config() {
    prefs.begin("orb", true);
    cfg.lat = prefs.getDouble("lat", cfg.lat);
    cfg.lon = prefs.getDouble("lon", cfg.lon);
    cfg.tz_offset_min = prefs.getInt("tz", cfg.tz_offset_min);
    cfg.dst_rule = prefs.getInt("dst", cfg.dst_rule);
    cfg.palette_on = prefs.getBool("palette", cfg.palette_on);
    cfg.max_pwm = prefs.getDouble("pwm", cfg.max_pwm);
    cfg.update_per_day = prefs.getInt("upd", cfg.update_per_day);
    prefs.end();
}

void setup() {
    Serial.begin(115200);
    orb.begin(); sunRing.begin(); moonRing.begin();
    orb.setBrightness(255); sunRing.setBrightness(255); moonRing.setBrightness(255); /* cap is in software */

    load_config();
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    for (int i = 0; i < 60 && WiFi.status() != WL_CONNECTED; i++) { delay(500); Serial.print("."); }
    Serial.println(WiFi.localIP());

    /* NTP: UTC only; local offset applied in software (DST rule aware) */
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");

    if (MDNS.begin("solar-orb")) Serial.println("mDNS: http://solar-orb.local");

    server.on("/api/status", handle_status);
    server.on("/api/astronomy", handle_astronomy);
    server.on("/api/config", HTTP_GET, handle_get_config);
    server.on("/api/config", HTTP_PUT, handle_put_config);
    server.on("/api/config", HTTP_OPTIONS, []() { server.sendHeader("Access-Control-Allow-Origin", "*"); server.sendHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS"); server.send(204, "text/plain", ""); });
    server.on("/api/health", handle_health);
    server.begin();
}

void loop() {
    server.handleClient();

    static uint32_t last_tick = 0;
    const uint32_t interval = 86400000UL / (uint32_t)cfg.update_per_day;   /* 240/day -> 6 min */
    if (millis() - last_tick < interval && last_tick != 0) return;
    last_tick = millis();

    time_t now; time(&now);
    struct tm utc; gmtime_r(&now, &utc);
    if (utc.tm_year < 100) return;            /* NTP not yet synced */
    const int off = cfg.tz_offset_min + (cfg.dst_rule ? us_dst_active(utc.tm_year + 1900, utc.tm_mon + 1, utc.tm_mday) * 60 : 0);
    time_t local_now = now + off * 60;
    struct tm local; localtime_r(&local_now, &local);

    if (!day_state_valid || local.tm_mday != day_state.d) compute_day_state(&local);
    const double frac_day = (local.tm_hour * 3600.0 + local.tm_min * 60.0 + local.tm_sec) / 86400.0;
    tick(&local, frac_day);
}
