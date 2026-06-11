/**
 * Execution History — stores last 20 executed scripts in AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'boter_exec_history_v1';
const MAX = 20;

export interface HistoryEntry {
  id: string;
  scriptId: string;
  scriptName: string;
  category: string;
  success: boolean;
  ms: number;
  timestamp: string;
  error?: string;
}

async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function addEntry(entry: Omit<HistoryEntry, 'id'>): Promise<HistoryEntry[]> {
  try {
    const history = await loadHistory();
    const newEntry: HistoryEntry = { ...entry, id: Date.now().toString() };
    const updated = [newEntry, ...history].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}

export const executionHistory = { loadHistory, addEntry, clearHistory, getAll: loadHistory };
