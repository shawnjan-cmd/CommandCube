/**
 * Device Identifier Service — Stable across APK rebuilds
 *
 * Strategy (most stable → least stable):
 *   1. Derive from hardware fingerprint: sha256(brand+model+deviceName+osVersion)
 *      → Survives uninstall + reinstall, APK rebuild, even factory-reset-same-device
 *   2. Cache in AsyncStorage as `commandcube_device_id` so we don't re-hash every call
 *   3. If expo-device/expo-crypto unavailable, fall back to a persisted random ID
 *   4. In-memory fallback for complete storage failure (never null)
 *
 * KEY RULE: storage key MUST match serverConnection.ts KEYS.DEVICE_ID exactly
 * ('commandcube_device_id' — NO '@' prefix).
 *
 * WHY THIS MATTERS:
 *   The server locks to the first deviceId that pairs. If the deviceId changes on
 *   APK rebuild the server sees a "new device" and rejects with 403 — forcing the
 *   user to wait 5 minutes for the stale-device auto-unlock. A hardware-derived ID
 *   survives reinstalls so the server always recognises the same phone.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Must be identical to serverConnection.ts KEYS.DEVICE_ID
const DEVICE_ID_KEY = 'commandcube_device_id';
// Legacy key that some builds accidentally used
const LEGACY_KEY    = '@commandcube_device_id';

// ── Hardware-fingerprint helpers ─────────────────────────────────────────────

/**
 * Build a stable string from device hardware attributes.
 * Uses expo-device (dynamic import so the build doesn't break if unavailable).
 */
async function buildHardwareFingerprint(): Promise<string | null> {
  try {
    const Device = await import('expo-device');
    const parts: string[] = [
      Device.brand        || '',   // e.g. "samsung"
      Device.manufacturer || '',   // e.g. "Samsung"
      Device.modelName    || '',   // e.g. "SM-G991B"
      Device.deviceName   || '',   // e.g. "Galaxy S21"
      Device.osName       || '',   // e.g. "Android"
      Device.osVersion    || '',   // e.g. "14"
    ];
    const fp = parts.filter(Boolean).join('|').toLowerCase();
    // Require at least brand + model to be useful
    if (!Device.brand && !Device.modelName) return null;
    return fp;
  } catch {
    return null;
  }
}

/**
 * SHA-256 the fingerprint string using expo-crypto and return a hex string.
 * Truncated to 32 chars to keep the deviceId concise.
 */
async function hashFingerprint(fp: string): Promise<string | null> {
  try {
    const Crypto = await import('expo-crypto');
    const hex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      fp,
      { encoding: Crypto.CryptoEncoding.HEX },
    );
    // Prefix so it's identifiable in server logs; first 32 hex chars = 128 bits
    return 'butler-hw-' + hex.slice(0, 32);
  } catch {
    return null;
  }
}

// ── Main service ─────────────────────────────────────────────────────────────

class DeviceIdentifierService {
  private deviceId: string | null = null;

  /**
   * Get or generate the stable device ID.
   * Priority: cached AsyncStorage → hardware-derived → persisted random → in-memory fallback
   */
  async getDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;

    try {
      // 1. Canonical key (fastest path on subsequent calls)
      let id = await AsyncStorage.getItem(DEVICE_ID_KEY).catch(() => null);

      // 2. Migrate from legacy '@'-prefixed key (one-time cleanup)
      if (!id) {
        const legacy = await AsyncStorage.getItem(LEGACY_KEY).catch(() => null);
        if (legacy && legacy.startsWith('butler-')) {
          id = legacy;
          await AsyncStorage.setItem(DEVICE_ID_KEY, id).catch(() => {});
          await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
        }
      }

      // 3. If we have a cached ID but it's the old Math.random() format,
      //    try to upgrade it to a hardware-derived one silently.
      //    (Old format: 'butler-xxxxxxxx-<base36timestamp>')
      const isOldFormat = id
        ? !id.startsWith('butler-hw-') && /butler-[a-z0-9]{8}-[a-z0-9]+$/.test(id)
        : false;

      if (!id || isOldFormat) {
        const fp = await buildHardwareFingerprint();
        if (fp) {
          const hwId = await hashFingerprint(fp);
          if (hwId) {
            id = hwId;
            await AsyncStorage.setItem(DEVICE_ID_KEY, id).catch(() => {});
          }
        }
      }

      // 4. Fallback: persisted random ID (survives restarts but not reinstalls)
      if (!id) {
        id = 'butler-' + Math.random().toString(36).slice(2, 10)
           + '-'      + Date.now().toString(36);
        await AsyncStorage.setItem(DEVICE_ID_KEY, id).catch(() => {});
      }

      this.deviceId = id;
      return id;
    } catch {
      // 5. Complete storage failure — at least stay consistent within this session
      if (!this.deviceId) {
        this.deviceId = 'butler-mem-' + Math.random().toString(36).slice(2, 14);
      }
      return this.deviceId;
    }
  }

  /**
   * Force re-derive the ID from hardware on next call.
   * Does NOT remove the AsyncStorage entry — use clearDeviceId() for a full reset.
   */
  resetCache(): void {
    this.deviceId = null;
  }

  /**
   * Clear device ID entirely — forces re-generation on next call.
   * Use only when intentionally re-pairing as a new device.
   */
  async clearDeviceId(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([DEVICE_ID_KEY, LEGACY_KEY]);
      this.deviceId = null;
    } catch {}
  }

  /**
   * Return the raw hardware fingerprint string for debugging / diagnostics.
   * Returns null if expo-device is not available.
   */
  async getHardwareFingerprint(): Promise<string | null> {
    return buildHardwareFingerprint();
  }
}

export const deviceIdentifier = new DeviceIdentifierService();
