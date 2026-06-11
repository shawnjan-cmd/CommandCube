/**
 * CPU History Service — samples CPU usage every 5 minutes, stores in AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY     = 'boter_cpu_history_v1';
const MAX     = 24; // 2 hours at 5min intervals

export interface CpuSample {
  timestamp: number; // epoch ms
  cpu: number;       // 0–100
}

async function load(): Promise<CpuSample[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function addSample(cpu: number): Promise<CpuSample[]> {
  try {
    const samples = await load();
    const now: CpuSample = { timestamp: Date.now(), cpu: Math.round(cpu) };
    // Remove duplicates within 60 seconds of "now"
    const filtered = samples.filter(s => now.timestamp - s.timestamp > 60_000);
    const updated  = [...filtered, now].slice(-MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

async function clear(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}

export const cpuHistory = { load, addSample, clear };
