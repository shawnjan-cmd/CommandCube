/**
 * Shared onboarding/consent AsyncStorage keys.
 * Single source of truth — import from here to avoid circular deps.
 */
export const ONBOARDING_DONE_KEY        = '@butler_onboarding_done_v2';
export const WELCOME_COMPLETE_KEY       = '@butler_welcome_complete_v1';
export const CONSENT_KEY                = '@butler_consent_v2';
export const LAN_CONSENT_KEY            = '@butler_lan_consent_v1';
export const TERMS_ACCEPTED_KEY         = '@butler_terms_accepted_v1';
export const PRIVACY_ACCEPTED_KEY       = '@butler_privacy_accepted_v1';
export const AGE_CONFIRMED_KEY          = '@butler_age_confirmed_v1';
export const REMOTE_EXEC_CONSENT_KEY    = '@butler_remote_exec_consent_v1';
export const CAMERA_CONSENT_KEY         = '@butler_camera_consent_v1';
/** NEW v7.2 — explicit acceptance of the 4 server-privacy facts on Screen 8. */
export const SERVER_PRIVACY_ACCEPTED_KEY = '@butler_server_privacy_accepted_v1';