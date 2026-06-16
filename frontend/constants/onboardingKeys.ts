/**
 * Butler AI — Onboarding & Consent Storage Keys · CLEAN REWRITE v3
 * ──────────────────────────────────────────────────────────────────
 *
 * Single source of truth for every AsyncStorage key related to
 * onboarding, consent, and first-launch state.
 *
 * READ CONTRACT
 *   • The root route (`app/index.tsx`) and the bootstrap pipeline
 *     in `_layout.tsx` BOTH read `ONBOARDING_DONE_KEY` and
 *     `WELCOME_COMPLETE_KEY`. Either being `'true'` / `'1'` marks
 *     the user as onboarded.
 *
 * WRITE CONTRACT
 *   • The tutorial (`app/(tabs)/onboarding.tsx`) writes ALL keys
 *     atomically via `AsyncStorage.multiSet` on FINISH / SKIP.
 *
 * NEVER rename a key in place — bump to `_v3`, `_v4`, etc. so
 * users with the old key are still recognised as onboarded.
 */

// ── PRIMARY ONBOARDED FLAGS ─────────────────────────────────────
/** v2 contract — set to `'true'` on FINISH or SKIP. */
export const ONBOARDING_DONE_KEY        = '@butler_onboarding_done_v2';
/** Legacy v1 contract — still honoured by the root redirect. */
export const WELCOME_COMPLETE_KEY       = '@butler_welcome_complete_v1';

// ── EXPLICIT CONSENTS (each one set to `'true'`) ────────────────
export const TERMS_ACCEPTED_KEY         = '@butler_terms_accepted_v1';
export const PRIVACY_ACCEPTED_KEY       = '@butler_privacy_accepted_v1';
export const AGE_CONFIRMED_KEY          = '@butler_age_confirmed_v1';
export const LAN_CONSENT_KEY            = '@butler_lan_consent_v1';
export const REMOTE_EXEC_CONSENT_KEY    = '@butler_remote_exec_consent_v1';
export const CAMERA_CONSENT_KEY         = '@butler_camera_consent_v1';
/** Acceptance of the 4 server-privacy facts on screen 8 (Server Privacy). */
export const SERVER_PRIVACY_ACCEPTED_KEY = '@butler_server_privacy_accepted_v1';

// ── CONSENT VERSION ─────────────────────────────────────────────
/** Bumped whenever the consent copy changes — forces re-acceptance. */
export const CONSENT_VERSION            = '1.0.0';
/** Stores the consent version the user accepted. */
export const CONSENT_KEY                = '@butler_consent_version';

// ── DIAGNOSTIC / OBSERVABILITY ──────────────────────────────────
/** Stamped to `'onboarded'` on FINISH — used by external diagnostics. */
export const STABLE_STATE_KEY           = '@butler_stable_state';

// ── HELPER: every key the tutorial writes on FINISH ─────────────
export const ALL_ONBOARDING_WRITE_KEYS: Array<[string, string]> = [
  [ONBOARDING_DONE_KEY,    'true'],
  [WELCOME_COMPLETE_KEY,   'true'],
  [TERMS_ACCEPTED_KEY,     'true'],
  [PRIVACY_ACCEPTED_KEY,   'true'],
  [AGE_CONFIRMED_KEY,      'true'],
  [LAN_CONSENT_KEY,        'true'],
  [REMOTE_EXEC_CONSENT_KEY,'true'],
  [CAMERA_CONSENT_KEY,     'true'],
  [SERVER_PRIVACY_ACCEPTED_KEY, 'true'],
  [CONSENT_KEY,            CONSENT_VERSION],
  [STABLE_STATE_KEY,       'onboarded'],
];
