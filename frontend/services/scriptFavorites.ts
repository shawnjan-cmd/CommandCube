/**
 * ⭐ SCRIPT FAVORITES SERVICE (LOCAL)
 * AsyncStorage-based favorites — no Supabase auth required.
 * Supports ordering, execution metadata, and both built-in + AI scripts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nexus_favorites_v2';
const ORDER_KEY = '@nexus_favorites_order_v2';

export interface FavoriteScript {
  id: string;           // script id
  type: 'builtin' | 'butler'; // source
  title: string;
  description: string;
  category: string;
  scriptCode: string;
  addedAt: number;      // timestamp
  lastRunAt?: number;   // timestamp of last execution
  runCount: number;     // total times run from favorites
}

export interface FavoritesStore {
  [id: string]: FavoriteScript;
}

let _cache: FavoritesStore | null = null;
let _orderCache: string[] | null = null;

async function getStore(): Promise<FavoritesStore> {
  if (_cache) return _cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    _cache = raw ? JSON.parse(raw) : {};
  } catch {
    _cache = {};
  }
  return _cache!;
}

async function getOrder(store: FavoritesStore): Promise<string[]> {
  if (_orderCache) {
    // Filter order to only include IDs that still exist in store
    const valid = _orderCache.filter(id => id in store);
    // Add any new IDs not yet in order (sorted by addedAt desc)
    const missing = Object.keys(store).filter(id => !valid.includes(id))
      .sort((a, b) => (store[b].addedAt || 0) - (store[a].addedAt || 0));
    return [...missing, ...valid];
  }
  try {
    const raw = await AsyncStorage.getItem(ORDER_KEY);
    const stored: string[] = raw ? JSON.parse(raw) : [];
    const storeIds = Object.keys(store);
    // Merge: stored order first (filtered), then any new ones
    const valid = stored.filter(id => storeIds.includes(id));
    const missing = storeIds.filter(id => !valid.includes(id))
      .sort((a, b) => (store[b].addedAt || 0) - (store[a].addedAt || 0));
    _orderCache = [...missing, ...valid];
    return _orderCache;
  } catch {
    _orderCache = Object.keys(store);
    return _orderCache;
  }
}

async function persist(store: FavoritesStore): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
}

async function persistOrder(order: string[]): Promise<void> {
  _orderCache = order;
  await AsyncStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

/** Load all favorites in order */
export async function loadFavorites(): Promise<FavoriteScript[]> {
  const store = await getStore();
  const order = await getOrder(store);
  return order.map(id => store[id]).filter(Boolean);
}

/** Check if a script is favorited */
export async function isFavorited(id: string): Promise<boolean> {
  const store = await getStore();
  return id in store;
}

/** Add a script to favorites */
export async function addFavorite(script: Omit<FavoriteScript, 'addedAt' | 'runCount'>): Promise<void> {
  const store = await getStore();
  if (script.id in store) return; // already favorited
  store[script.id] = { ...script, addedAt: Date.now(), runCount: 0 };
  _cache = store;
  await persist(store);
  // Prepend to order
  const order = await getOrder(store);
  const newOrder = [script.id, ...order.filter(id => id !== script.id)];
  await persistOrder(newOrder);
}

/** Remove a script from favorites */
export async function removeFavorite(id: string): Promise<void> {
  const store = await getStore();
  if (!(id in store)) return;
  delete store[id];
  _cache = store;
  await persist(store);
  // Remove from order
  if (_orderCache) {
    const newOrder = _orderCache.filter(oid => oid !== id);
    await persistOrder(newOrder);
  }
}

/** Toggle favorite state — returns new state */
export async function toggleFavorite(
  script: Omit<FavoriteScript, 'addedAt' | 'runCount'>
): Promise<boolean> {
  const store = await getStore();
  if (script.id in store) {
    await removeFavorite(script.id);
    return false;
  } else {
    await addFavorite(script);
    return true;
  }
}

/** Record a run from favorites */
export async function recordFavoriteRun(id: string): Promise<void> {
  const store = await getStore();
  if (!(id in store)) return;
  store[id].lastRunAt = Date.now();
  store[id].runCount = (store[id].runCount || 0) + 1;
  _cache = store;
  await persist(store);
}

/** Reorder favorites by providing a new ordered array of ids */
export async function reorderFavorites(newOrder: string[]): Promise<void> {
  await persistOrder(newOrder);
}

/** Invalidate cache */
export function invalidateFavCache(): void {
  _cache = null;
  _orderCache = null;
}
