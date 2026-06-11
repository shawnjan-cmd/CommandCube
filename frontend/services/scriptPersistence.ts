/**
 * ⚡ NEXUS SCRIPT PERSISTENCE v2.0
 * Bullet-proof save/load for Butler scripts with:
 *  • Atomic writes (write-then-swap pattern)
 *  • Backup slot (always keeps previous good save)
 *  • Corruption detection + auto-recovery from backup
 *  • Size guard (warns before hitting AsyncStorage limits)
 *  • Large library support: paginated index + per-script files in FileSystem
 *  • Migration from legacy @butler_generated_scripts_v1
 *
 * ARCHITECTURE (for large libraries 100+ scripts):
 *  AsyncStorage @bs_index_v2  → lightweight index (id, title, category, createdAt, sizeChars)
 *  FileSystem   bs_{id}.json  → full script content (code + metadata)
 *  AsyncStorage @bs_backup_v2 → backup of last known good index (corruption recovery)
 *
 * WHY FILESYSTEM FOR SCRIPTS?
 *  AsyncStorage has a 6MB soft limit on Android. A library of 200 scripts at
 *  ~2KB each = 400KB — fine for AsyncStorage. But at 500 scripts with long codes,
 *  you're at 1MB+. FileSystem (documentDirectory) has GBs of space.
 *  This hybrid approach keeps AsyncStorage lean and scripts permanently safe.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { ButlerScript } from './butlerScripts';

const INDEX_KEY   = '@bs_index_v2';
const BACKUP_KEY  = '@bs_backup_v2';
const LEGACY_KEY  = '@butler_generated_scripts_v1';
const SCRIPT_DIR  = () => FileSystem.documentDirectory + 'nexus_scripts/';

const WARN_SIZE_CHARS  = 500_000;   // 500KB = warn user (increased for large scripts)
const BLOCK_SIZE_CHARS = 2_000_000; // 2MB = refuse save (increased significantly)

export interface ScriptIndexEntry {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  sizeChars: number;
  hasImage?: boolean;
  imageUri?: string | null;
  pinned?: boolean;
  runCount?: number;
  lastRunAt?: string | null;
  tags?: string[];
}

export interface PersistenceStats {
  totalScripts: number;
  totalSizeChars: number;
  totalSizeKb: number;
  storageHealth: 'ok' | 'warn' | 'critical';
  largestScript: { id: string; title: string; sizeKb: number } | null;
  orphanFiles: number;
}

// ─── Directory init ────────────────────────────────────────────────
async function ensureDir(): Promise<void> {
  const dir = SCRIPT_DIR();
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch {}
}

// ─── Atomic write helpers ──────────────────────────────────────────
async function atomicWriteFile(path: string, content: string): Promise<void> {
  const tmp = path + '.tmp';
  await FileSystem.writeAsStringAsync(tmp, content, { encoding: FileSystem.EncodingType.UTF8 });
  // Move tmp → final (on most FSes this is atomic)
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {}
  await FileSystem.moveAsync({ from: tmp, to: path });
}

async function safeReadFile(path: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
  } catch {
    return null;
  }
}

// ─── Script file path ─────────────────────────────────────────────
function scriptPath(id: string): string {
  return SCRIPT_DIR() + `bs_${id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
}

// ─── Index operations ──────────────────────────────────────────────
async function loadIndex(): Promise<ScriptIndexEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('corrupt');
    return parsed;
  } catch {
    // Try backup
    try {
      const backup = await AsyncStorage.getItem(BACKUP_KEY);
      if (backup) {
        const parsed = JSON.parse(backup);
        if (Array.isArray(parsed)) {
          await AsyncStorage.setItem(INDEX_KEY, backup); // restore from backup
          return parsed;
        }
      }
    } catch {}
    return [];
  }
}

async function saveIndex(index: ScriptIndexEntry[]): Promise<void> {
  const json = JSON.stringify(index);
  // Save backup of current before overwriting
  const current = await AsyncStorage.getItem(INDEX_KEY).catch(() => null);
  if (current) {
    await AsyncStorage.setItem(BACKUP_KEY, current).catch(() => {});
  }
  await AsyncStorage.setItem(INDEX_KEY, json);
}

// ─── PUBLIC API ────────────────────────────────────────────────────

/** Save a single script — handles both create and update */
export async function persistScript(script: ButlerScript & { pinned?: boolean; imageUri?: string | null }): Promise<void> {
  await ensureDir();

  // Size guard
  const size = script.script.length + JSON.stringify(script).length;
  if (size > BLOCK_SIZE_CHARS) {
    throw new Error(`Script too large (${Math.round(size / 1000)}KB). Max ~${Math.round(BLOCK_SIZE_CHARS / 1000)}KB. Split into smaller scripts.`);
  }

  // Write script file
  const fullData = {
    ...script,
    _savedAt: new Date().toISOString(),
    _version: 2,
  };
  await atomicWriteFile(scriptPath(script.id), JSON.stringify(fullData, null, 2));

  // Update index
  const index = await loadIndex();
  const existing = index.findIndex(e => e.id === script.id);
  const entry: ScriptIndexEntry = {
    id:         script.id,
    title:      script.title,
    category:   script.category,
    createdAt:  script.createdAt,
    sizeChars:  script.script.length,
    pinned:     script.pinned,
    imageUri:   script.imageUri ?? null,
    tags:       script.tags,
    runCount:   0,
  };

  if (existing >= 0) {
    index[existing] = { ...index[existing], ...entry };
  } else {
    index.unshift(entry); // newest first
  }

  await saveIndex(index);

  // Warn if approaching limit
  const totalChars = index.reduce((s, e) => s + e.sizeChars, 0);
  if (totalChars > WARN_SIZE_CHARS) {
    console.warn(`[ScriptPersistence] Library size ${Math.round(totalChars / 1000)}KB — consider archiving old scripts`);
  }
}

/** Load a single script by ID */
export async function loadScript(id: string): Promise<ButlerScript | null> {
  await ensureDir();
  const raw = await safeReadFile(scriptPath(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ButlerScript;
  } catch {
    return null;
  }
}

/** Load ALL scripts (index + file read for each) — for large libraries, use loadScriptPage */
export async function loadAllScripts(): Promise<ButlerScript[]> {
  await ensureDir();
  const index = await loadIndex();

  // First check legacy AsyncStorage
  await migrateLegacy();

  const scripts: ButlerScript[] = [];
  for (const entry of index) {
    const script = await loadScript(entry.id);
    if (script) scripts.push(script);
  }
  return scripts;
}

/** Paginated load — page 0 = newest 20, page 1 = next 20, etc. */
export async function loadScriptPage(page: number, pageSize = 20): Promise<{
  scripts: ButlerScript[];
  total: number;
  hasMore: boolean;
}> {
  await ensureDir();
  await migrateLegacy();
  const index = await loadIndex();
  const total   = index.length;
  const slice   = index.slice(page * pageSize, (page + 1) * pageSize);
  const scripts: ButlerScript[] = [];
  for (const entry of slice) {
    const s = await loadScript(entry.id);
    if (s) scripts.push(s);
  }
  return { scripts, total, hasMore: (page + 1) * pageSize < total };
}

/** Load just the index (ultra-fast — no file reads) */
export async function loadScriptIndex(): Promise<ScriptIndexEntry[]> {
  await migrateLegacy();
  return loadIndex();
}

/** Delete a script */
export async function deleteScript(id: string): Promise<void> {
  await ensureDir();
  try {
    await FileSystem.deleteAsync(scriptPath(id), { idempotent: true });
  } catch {}
  const index = await loadIndex();
  await saveIndex(index.filter(e => e.id !== id));
}

/** Increment run count in index */
export async function incrementRunCount(id: string): Promise<void> {
  const index = await loadIndex();
  const e = index.find(e => e.id === id);
  if (e) {
    e.runCount = (e.runCount ?? 0) + 1;
    e.lastRunAt = new Date().toISOString();
    await saveIndex(index);
  }
}

/** Toggle pin status */
export async function togglePin(id: string): Promise<boolean> {
  const index = await loadIndex();
  const e = index.find(e => e.id === id);
  if (!e) return false;
  e.pinned = !e.pinned;
  await saveIndex(index);
  return e.pinned;
}

/** Search scripts by keyword (index only — fast) */
export async function searchScripts(query: string, limit = 30): Promise<ScriptIndexEntry[]> {
  const index = await loadIndex();
  const q = query.toLowerCase().trim();
  if (!q) return index.slice(0, limit);
  return index.filter(e =>
    e.title.toLowerCase().includes(q) ||
    e.category.toLowerCase().includes(q) ||
    (e.tags || []).some(t => t.toLowerCase().includes(q))
  ).slice(0, limit);
}

/** Get storage health statistics */
export async function getPersistenceStats(): Promise<PersistenceStats> {
  await ensureDir();
  const index = await loadIndex();
  const totalChars = index.reduce((s, e) => s + e.sizeChars, 0);
  const totalKb    = Math.round(totalChars / 500); // rough estimate

  let largest: ScriptIndexEntry | null = null;
  for (const e of index) {
    if (!largest || e.sizeChars > largest.sizeChars) largest = e;
  }

  // Count orphan files (files on disk not in index)
  let orphanFiles = 0;
  try {
    const dir = SCRIPT_DIR();
    const files = await FileSystem.readDirectoryAsync(dir);
    const indexIds = new Set(index.map(e => `bs_${e.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`));
    orphanFiles = files.filter(f => f.startsWith('bs_') && f.endsWith('.json') && !indexIds.has(f)).length;
  } catch {}

  return {
    totalScripts: index.length,
    totalSizeChars: totalChars,
    totalSizeKb: totalKb,
    storageHealth: totalKb > 400 ? 'critical' : totalKb > 150 ? 'warn' : 'ok',
    largestScript: largest ? { id: largest.id, title: largest.title, sizeKb: Math.round(largest.sizeChars / 500) } : null,
    orphanFiles,
  };
}

/** Repair: delete orphan files */
export async function repairOrphans(): Promise<number> {
  await ensureDir();
  const index = await loadIndex();
  const indexIds = new Set(index.map(e => `bs_${e.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`));
  let removed = 0;
  try {
    const dir = SCRIPT_DIR();
    const files = await FileSystem.readDirectoryAsync(dir);
    for (const f of files) {
      if (f.startsWith('bs_') && f.endsWith('.json') && !indexIds.has(f)) {
        await FileSystem.deleteAsync(dir + f, { idempotent: true });
        removed++;
      }
    }
  } catch {}
  return removed;
}

// ─── MIGRATION from legacy AsyncStorage ───────────────────────────
let _migrated = false;

async function migrateLegacy(): Promise<void> {
  if (_migrated) return;
  _migrated = true;
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacy) return;
    const old: ButlerScript[] = JSON.parse(legacy);
    if (!Array.isArray(old) || old.length === 0) return;

    await ensureDir();
    const existingIndex = await loadIndex();
    const existingIds = new Set(existingIndex.map(e => e.id));
    let migrated = 0;

    for (const script of old) {
      if (existingIds.has(script.id)) continue;
      try {
        await persistScript(script);
        migrated++;
      } catch {}
    }

    if (migrated > 0) {
      console.log(`[ScriptPersistence] Migrated ${migrated} scripts from legacy storage`);
      // Keep legacy key for safety — will be cleaned up later
    }
  } catch {
    // Migration failure is non-fatal — existing system still works
  }
}
