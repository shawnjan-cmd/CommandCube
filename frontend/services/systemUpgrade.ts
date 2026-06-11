/**
 * Butler AI — System Upgrade Persistence Layer
 * Saves AI-driven UI/logic overrides to AsyncStorage so they survive app updates.
 * On every boot the app calls applyBootOverrides() to reapply saved state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STABLE_KEY   = 'BUTLER_STABLE_STATE';
const PREVIOUS_KEY = 'BUTLER_PREVIOUS_STATE';
const UPGRADE_LOG  = 'BUTLER_AUTO_UPGRADES';

export interface UpgradeSchema {
  version:   number;
  ts:        number;
  theme?:    Record<string, string>;
  settings?: Record<string, string | boolean | number>;
  custom?:   Record<string, unknown>;
  notes?:    string;
}

export interface UpgradeLogEntry {
  ts:      number;
  version: number;
  notes?:  string;
  ok:      boolean;
}

// ── Save a new upgrade and create a rollback point ─────────────────────────
export async function performSystemUpgrade(schema: UpgradeSchema): Promise<void> {
  try {
    const backup = await AsyncStorage.getItem(STABLE_KEY).catch(() => null);
    if (backup) await AsyncStorage.setItem(PREVIOUS_KEY, backup);

    const next = { ...schema, ts: Date.now(), version: schema.version ?? Date.now() };
    await AsyncStorage.setItem(STABLE_KEY, JSON.stringify(next));

    // Append to audit log (keep last 20 entries)
    const logRaw  = await AsyncStorage.getItem(UPGRADE_LOG).catch(() => null);
    const log: UpgradeLogEntry[] = logRaw ? JSON.parse(logRaw) : [];
    log.unshift({ ts: Date.now(), version: next.version, notes: schema.notes, ok: true });
    await AsyncStorage.setItem(UPGRADE_LOG, JSON.stringify(log.slice(0, 20)));
  } catch (e) {
    console.warn('[SystemUpgrade] performSystemUpgrade error:', e);
  }
}

// ── Roll back to previous stable state ────────────────────────────────────
export async function rollbackUpgrade(): Promise<boolean> {
  try {
    const prev = await AsyncStorage.getItem(PREVIOUS_KEY).catch(() => null);
    if (!prev) return false;
    await AsyncStorage.setItem(STABLE_KEY, prev);
    await AsyncStorage.removeItem(PREVIOUS_KEY);
    return true;
  } catch { return false; }
}

// ── Apply saved overrides on boot — called once from app/_layout.tsx ──────
export async function applyBootOverrides(): Promise<UpgradeSchema | null> {
  try {
    const raw = await AsyncStorage.getItem(STABLE_KEY).catch(() => null);
    if (!raw) return null;
    const schema: UpgradeSchema = JSON.parse(raw);

    // Apply settings overrides to AsyncStorage keys
    if (schema.settings) {
      const pairs = Object.entries(schema.settings).map(([k, v]) => [k, String(v)] as [string, string]);
      if (pairs.length > 0) await AsyncStorage.multiSet(pairs);
    }

    // Apply theme overrides — CosmeticContext picks these up on next render
    if (schema.theme) {
      await AsyncStorage.setItem('@butler_imported_palette', JSON.stringify(schema.theme));
    }

    return schema;
  } catch (e) {
    console.warn('[SystemUpgrade] applyBootOverrides error:', e);
    return null;
  }
}

// ── Get upgrade log ────────────────────────────────────────────────────────
export async function getUpgradeLog(): Promise<UpgradeLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(UPGRADE_LOG).catch(() => null);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Get current stable schema ──────────────────────────────────────────────
export async function getCurrentSchema(): Promise<UpgradeSchema | null> {
  try {
    const raw = await AsyncStorage.getItem(STABLE_KEY).catch(() => null);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Clear all upgrade data ─────────────────────────────────────────────────
export async function clearUpgrades(): Promise<void> {
  await AsyncStorage.multiRemove([STABLE_KEY, PREVIOUS_KEY, UPGRADE_LOG]).catch(() => {});
}
