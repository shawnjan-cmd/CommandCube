/**
 * 📝 USER SCRIPTS SERVICE
 * Local-only mode — Supabase removed. Scripts stored in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export interface UserScript {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: string;
  script_content: string;
  language: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  execution_count: number;
}

export interface CreateScriptData {
  name: string;
  description: string;
  category: string;
  script_content: string;
  language?: string;
  imageUri?: string;
}

export interface UpdateScriptData {
  name?: string;
  description?: string;
  category?: string;
  script_content?: string;
  language?: string;
  imageUri?: string;
}

const STORAGE_KEY = '@butler_user_scripts_v1';

async function _loadAll(): Promise<UserScript[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function _saveAll(scripts: UserScript[]): Promise<void> {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scripts)); } catch {}
}

// No-op — image upload requires Supabase Storage
export async function uploadScriptImage(_userId: string, _scriptId: string, _imageUri: string): Promise<string | null> {
  return null;
}

export async function createUserScript(data: CreateScriptData): Promise<{ data: UserScript | null; error: string | null }> {
  try {
    const scripts = await _loadAll();
    const script: UserScript = {
      id: `local_${Date.now()}`,
      user_id: 'local',
      name: data.name,
      description: data.description,
      category: data.category,
      script_content: data.script_content,
      language: data.language || 'python',
      image_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      execution_count: 0,
    };
    await _saveAll([script, ...scripts]);
    return { data: script, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Failed to create script' };
  }
}

export async function getUserScripts(): Promise<{ data: UserScript[] | null; error: string | null }> {
  const scripts = await _loadAll();
  return { data: scripts, error: null };
}

export async function getScriptById(scriptId: string): Promise<{ data: UserScript | null; error: string | null }> {
  const scripts = await _loadAll();
  const found = scripts.find(s => s.id === scriptId) || null;
  return { data: found, error: null };
}

export async function getScriptsByCategory(category: string): Promise<{ data: UserScript[] | null; error: string | null }> {
  const scripts = await _loadAll();
  return { data: scripts.filter(s => s.category === category), error: null };
}

export async function updateUserScript(scriptId: string, updates: UpdateScriptData): Promise<{ data: UserScript | null; error: string | null }> {
  try {
    const scripts = await _loadAll();
    const idx = scripts.findIndex(s => s.id === scriptId);
    if (idx === -1) return { data: null, error: 'Script not found' };
    const updated: UserScript = {
      ...scripts[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    scripts[idx] = updated;
    await _saveAll(scripts);
    return { data: updated, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Failed to update script' };
  }
}

export async function deleteUserScript(scriptId: string): Promise<{ error: string | null }> {
  try {
    const scripts = await _loadAll();
    await _saveAll(scripts.filter(s => s.id !== scriptId));
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Failed to delete script' };
  }
}

export async function incrementExecutionCount(scriptId: string): Promise<void> {
  try {
    const scripts = await _loadAll();
    const idx = scripts.findIndex(s => s.id === scriptId);
    if (idx !== -1) {
      scripts[idx].execution_count = (scripts[idx].execution_count || 0) + 1;
      await _saveAll(scripts);
    }
  } catch {}
}

export const SCRIPT_CATEGORIES = [
  'System', 'Network', 'Security', 'Gaming', 'Media',
  'Files', 'Power', 'Browser', 'Developer', 'Other',
];
