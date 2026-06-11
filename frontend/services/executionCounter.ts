/**
 * Execution Counter — persists per-script run counts in AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'boter_exec_counts_v1';

type CountMap = Record<string, number>;

async function load(): Promise<CountMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function increment(scriptId: string): Promise<number> {
  try {
    const map = await load();
    const next = (map[scriptId] ?? 0) + 1;
    map[scriptId] = next;
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
    return next;
  } catch {
    return 0;
  }
}

async function get(scriptId: string): Promise<number> {
  const map = await load();
  return map[scriptId] ?? 0;
}

async function reset(scriptId: string): Promise<void> {
  try {
    const map = await load();
    delete map[scriptId];
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

export const executionCounter = { load, increment, get, reset };
