/**
 * ⚡ NEXUS SCRIPT CACHE
 * Caches server library, pinned IDs, favorites, and run-counts in AsyncStorage.
 * TTL-based invalidation — stale data served instantly while fresh fetch runs in background.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SERVER_LIB:   '@nexus_cache_server_lib_v1',
  SERVER_LIB_TS:'@nexus_cache_server_lib_ts_v1',
  PINNED:       '@nexus_cache_pinned_v1',
  FAVORITES:    '@nexus_cache_favorites_v1',
  RUN_COUNTS:   '@nexus_cache_run_counts_v1',
  BUTLER_SCRIPTS:'@nexus_cache_butler_scripts_v1',
  BUTLER_TS:    '@nexus_cache_butler_scripts_ts_v1',
};

// 5 minutes for server library, 30 seconds for butler scripts
const TTL_SERVER_LIB    = 5 * 60 * 1000;
const TTL_BUTLER_SCRIPTS = 30 * 1000;

// ─── SERVER LIBRARY CACHE ──────────────────────────────────────

export async function getCachedServerLib(): Promise<Record<string, any> | null> {
  try {
    const [raw, tsRaw] = await AsyncStorage.multiGet([KEYS.SERVER_LIB, KEYS.SERVER_LIB_TS]);
    const data = raw[1];
    const ts   = tsRaw[1];
    if (!data || !ts) return null;
    if (Date.now() - Number(ts) > TTL_SERVER_LIB) return null; // expired
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function setCachedServerLib(data: Record<string, any>): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [KEYS.SERVER_LIB,    JSON.stringify(data)],
      [KEYS.SERVER_LIB_TS, String(Date.now())],
    ]);
  } catch {}
}

export async function invalidateServerLibCache(): Promise<void> {
  try { await AsyncStorage.removeItem(KEYS.SERVER_LIB_TS); } catch {}
}

// ─── BUTLER SCRIPTS CACHE ─────────────────────────────────────

export async function getCachedButlerScripts(): Promise<any[] | null> {
  try {
    const [raw, tsRaw] = await AsyncStorage.multiGet([KEYS.BUTLER_SCRIPTS, KEYS.BUTLER_TS]);
    const data = raw[1];
    const ts   = tsRaw[1];
    if (!data || !ts) return null;
    if (Date.now() - Number(ts) > TTL_BUTLER_SCRIPTS) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function setCachedButlerScripts(scripts: any[]): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [KEYS.BUTLER_SCRIPTS, JSON.stringify(scripts)],
      [KEYS.BUTLER_TS,      String(Date.now())],
    ]);
  } catch {}
}

export function invalidateButlerScriptsCache(): void {
  AsyncStorage.removeItem(KEYS.BUTLER_TS).catch(() => {});
}

// ─── PINNED IDS CACHE ─────────────────────────────────────────

export async function getCachedPinnedIds(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PINNED);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setCachedPinnedIds(ids: string[]): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.PINNED, JSON.stringify(ids)); } catch {}
}

// ─── RUN COUNTS CACHE ─────────────────────────────────────────

export async function getCachedRunCounts(): Promise<Record<string, number> | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.RUN_COUNTS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setCachedRunCounts(counts: Record<string, number>): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.RUN_COUNTS, JSON.stringify(counts)); } catch {}
}

// ─── GENERIC CACHE HELPERS ────────────────────────────────────

/**
 * Stale-while-revalidate pattern:
 * Returns cached value immediately, then fetches fresh data in background.
 * onFresh callback is called when the fresh data arrives.
 */
export async function staleWhileRevalidate<T>(
  getCached: () => Promise<T | null>,
  fetchFresh: () => Promise<T>,
  setCache: (data: T) => Promise<void>,
  onFresh: (data: T) => void,
): Promise<T | null> {
  // 1. Serve stale immediately
  const cached = await getCached();

  // 2. Fetch fresh in background (no await)
  fetchFresh()
    .then(async (fresh) => {
      await setCache(fresh);
      onFresh(fresh);
    })
    .catch(() => {});

  return cached;
}

/**
 * Clear all NEXUS caches (call on logout or settings reset)
 */
export async function clearAllCaches(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch {}
}
