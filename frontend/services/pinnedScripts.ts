/**
 * ⚡ NEXUS PIN SERVICE
 * Persists pinned script IDs across sessions.
 * Works for both built-in scripts AND butler AI scripts.
 * Zero-cost: single AsyncStorage key, instant lookups via Set.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nexus_pinned_v1';

let _cache: Set<string> | null = null;

async function getSet(): Promise<Set<string>> {
  if (_cache) return _cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    _cache = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch {
    _cache = new Set<string>();
  }
  return _cache;
}

async function persist(set: Set<string>): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify([...set]));
}

/** Load all pinned IDs as a Set (fast, cached) */
export async function loadPinnedIds(): Promise<Set<string>> {
  return getSet();
}

/** Toggle pin state — returns new pinned state */
export async function togglePin(id: string): Promise<boolean> {
  const set = await getSet();
  if (set.has(id)) {
    set.delete(id);
    await persist(set);
    return false;
  } else {
    set.add(id);
    await persist(set);
    return true;
  }
}

/** Check if a script is pinned */
export async function isPinned(id: string): Promise<boolean> {
  const set = await getSet();
  return set.has(id);
}

/** Clear all pins */
export async function clearAllPins(): Promise<void> {
  _cache = new Set();
  await AsyncStorage.removeItem(KEY);
}

/** Invalidate cache (call after import or settings clear) */
export function invalidatePinCache(): void {
  _cache = null;
}
