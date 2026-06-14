#!/usr/bin/env node
/**
 * scripts/preflight.js
 * ──────────────────────────────────────────────────────────────────
 * Automated pre-build sanity check. Runs everything that's easy to
 * verify locally before kicking off a 15-minute EAS build:
 *
 *   1. app.json is valid JSON
 *   2. versionCode is a positive integer (not a string, not 0)
 *   3. All Play-Restricted permissions are in blockedPermissions
 *   4. The `remove-system-alert-window` plugin is registered
 *   5. Both Expo config plugins load without throwing
 *   6. abiFilters are limited to arm64-v8a + armeabi-v7a (no x86)
 *   7. playStoreContentRating is NOT "Mature 17+" (per compliance guide)
 *
 * Exits with code 0 (all green) or 1 (something needs fixing).
 *
 * Run manually:  node scripts/preflight.js
 * Run via npm:   yarn preflight
 *
 * Add as a pre-commit hook later if desired.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');
const PLUGINS_DIR = path.join(ROOT, 'plugins');

const RESTRICTED = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.USE_FINGERPRINT',
  'android.permission.MODIFY_AUDIO_SETTINGS',
];

const REQUIRED_PLUGINS = [
  './plugins/with-lan-network-security.js',
  './plugins/remove-system-alert-window.js',
];

let failed = 0;
const ok = (msg) => console.log('\x1b[32m✓\x1b[0m', msg);
const bad = (msg) => { failed++; console.log('\x1b[31m✗\x1b[0m', msg); };

// 1 & 2 — app.json valid JSON + sane versionCode
let appJson;
try {
  appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  ok('app.json parses as valid JSON');
} catch (e) {
  bad('app.json failed to parse: ' + e.message);
  process.exit(1);
}

const vc = appJson?.expo?.android?.versionCode;
if (typeof vc === 'number' && vc > 0 && Number.isInteger(vc)) {
  ok(`versionCode is a positive integer: ${vc}`);
} else {
  bad(`versionCode invalid (${vc} — must be positive integer)`);
}

// 3 — Restricted permissions blocked
const blocked = appJson?.expo?.android?.blockedPermissions || [];
RESTRICTED.forEach((p) => {
  if (blocked.includes(p)) ok(`blocked: ${p}`);
  else bad(`MISSING from blockedPermissions: ${p}`);
});

// 4 — Required plugins registered in app.json
const plugins = (appJson?.expo?.plugins || []).map((p) => Array.isArray(p) ? p[0] : p);
REQUIRED_PLUGINS.forEach((p) => {
  if (plugins.includes(p)) ok(`plugin registered: ${p}`);
  else bad(`MISSING plugin in app.json: ${p}`);
});

// 5 — Plugin files load without throwing
REQUIRED_PLUGINS.forEach((p) => {
  const filePath = path.join(ROOT, p);
  try {
    require(filePath);
    ok(`plugin loads: ${p}`);
  } catch (e) {
    bad(`plugin throws on require: ${p} — ${e.message}`);
  }
});

// 6 — abiFilters limited
const ebp = (appJson?.expo?.plugins || []).find(
  (p) => Array.isArray(p) && p[0] === 'expo-build-properties'
);
const abiFilters = ebp?.[1]?.android?.abiFilters || [];
if (abiFilters.length && !abiFilters.includes('x86') && !abiFilters.includes('x86_64')) {
  ok(`abiFilters scoped to ARM only: ${abiFilters.join(', ')}`);
} else {
  bad(`abiFilters not safely scoped (got ${JSON.stringify(abiFilters)})`);
}

// 7 — content rating
const rating = appJson?.expo?.extra?.playStoreContentRating;
if (rating && rating !== 'Mature 17+') {
  ok(`playStoreContentRating: "${rating}"`);
} else {
  bad(`playStoreContentRating is wrong: "${rating}" (compliance guide says Everyone)`);
}

// Summary
console.log();
if (failed === 0) {
  console.log('\x1b[42m\x1b[30m  ALL PREFLIGHT CHECKS PASSED — SAFE TO BUILD  \x1b[0m');
  process.exit(0);
} else {
  console.log(`\x1b[41m\x1b[37m  ${failed} CHECK(S) FAILED — DO NOT BUILD UNTIL FIXED  \x1b[0m`);
  process.exit(1);
}
