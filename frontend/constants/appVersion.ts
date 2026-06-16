/**
 * Butler AI — App Version Helper · SINGLE SOURCE OF TRUTH
 * ──────────────────────────────────────────────────────────────────
 *
 * One module that every UI component imports for app version display.
 * Reads from `expo-constants` so the displayed version ALWAYS matches
 * what's in app.json (which EAS uses at build time).
 *
 * Usage:
 *   import { APP_VERSION, APP_VERSION_LABEL } from '@/constants/appVersion';
 *
 *   <Text>{APP_VERSION_LABEL}</Text>     // "v2.1.25"
 *   <Text>{APP_VERSION}</Text>           // "2.1.25"
 *
 * NEVER hardcode a version string in any UI file — always pull from here.
 *
 * Why this matters:
 *   • One place to update when bumping versions (app.json is the truth)
 *   • Display version always matches the binary version
 *   • Survives expo-constants returning undefined on cold-start
 */

import Constants from 'expo-constants';

/** Hard fallback — only used if expo-constants returns undefined. */
const FALLBACK_VERSION = '2.1.26';

/** Raw version string from app.json (e.g. "2.1.25"). */
export const APP_VERSION: string =
  (Constants?.expoConfig as any)?.version ??
  (Constants as any)?.manifest?.version ??
  FALLBACK_VERSION;

/** Pre-formatted version label with leading "v" (e.g. "v2.1.25"). */
export const APP_VERSION_LABEL: string = `v${APP_VERSION}`;

/** Android versionCode from app.json. Undefined on iOS. */
export const ANDROID_VERSION_CODE: number | undefined =
  (Constants?.expoConfig as any)?.android?.versionCode;

/** iOS buildNumber from app.json. Undefined on Android. */
export const IOS_BUILD_NUMBER: string | undefined =
  (Constants?.expoConfig as any)?.ios?.buildNumber;

/**
 * Platform-aware build identifier — useful for crash reports / settings UI.
 * Example: "2.1.25 (135)" on Android, "2.1.25 (117)" on iOS.
 */
export function getBuildIdentifier(): string {
  const code = ANDROID_VERSION_CODE ?? IOS_BUILD_NUMBER;
  return code != null ? `${APP_VERSION} (${code})` : APP_VERSION;
}
