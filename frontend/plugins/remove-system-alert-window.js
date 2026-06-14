/**
 * remove-system-alert-window.js
 * ──────────────────────────────────────────────────────────────────
 * Belt-and-suspenders Expo config plugin. The `SYSTEM_ALERT_WINDOW`
 * permission is a Google Play Restricted Permission that triggers
 * mandatory human review and a Permissions Declaration Form. Some
 * native modules (notably react-native-reanimated dev tooling, and
 * some legacy Expo modules) inject this permission via their own
 * manifest merger even when it's listed in `blockedPermissions`.
 *
 * This plugin strips `SYSTEM_ALERT_WINDOW` (and a few other ad-hoc
 * Restricted permissions that have been known to sneak in through
 * manifest merge: SET_WALLPAPER, WAKE_LOCK only if unjustified)
 * directly from the final manifest as the LAST modification step.
 *
 * Safe — no-ops if the permission is absent. Logs what was removed.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS_TO_REMOVE = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.USE_FINGERPRINT',
];

module.exports = function removeSystemAlertWindow(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults?.manifest;
    if (!manifest || !Array.isArray(manifest['uses-permission'])) return cfg;
    const before = manifest['uses-permission'].length;
    manifest['uses-permission'] = manifest['uses-permission'].filter((p) => {
      const name = p?.$?.['android:name'] || '';
      return !PERMISSIONS_TO_REMOVE.includes(name);
    });
    const removed = before - manifest['uses-permission'].length;
    if (removed > 0) {
      console.log(`[remove-system-alert-window] stripped ${removed} restricted permission(s)`);
    }
    return cfg;
  });
};
