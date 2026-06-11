/**
 * ⭐ FAVORITES SERVICE
 * Local-only mode — Supabase removed. Favorites stored in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserScript } from './userScripts';

export interface Favorite {
  id: string;
  user_id: string;
  script_id: string | null;
  template_script_ref: string | null;
  created_at: string;
}

export interface FavoriteWithDetails {
  id: string;
  type: 'user' | 'template';
  created_at: string;
  userScript?: UserScript;
  templateScript?: any;
}

const STORAGE_KEY = '@butler_favorites_v1';

async function _loadAll(): Promise<Favorite[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function _saveAll(favs: Favorite[]): Promise<void> {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favs)); } catch {}
}

export async function addUserScriptFavorite(scriptId: string): Promise<{ error: string | null }> {
  try {
    const favs = await _loadAll();
    if (favs.some(f => f.script_id === scriptId)) return { error: null };
    await _saveAll([...favs, {
      id: `fav_${Date.now()}`,
      user_id: 'local',
      script_id: scriptId,
      template_script_ref: null,
      created_at: new Date().toISOString(),
    }]);
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Failed to add favorite' };
  }
}

export async function addTemplateScriptFavorite(missionId: string, scriptId: string): Promise<{ error: string | null }> {
  try {
    const ref = `${missionId}:${scriptId}`;
    const favs = await _loadAll();
    if (favs.some(f => f.template_script_ref === ref)) return { error: null };
    await _saveAll([...favs, {
      id: `fav_${Date.now()}`,
      user_id: 'local',
      script_id: null,
      template_script_ref: ref,
      created_at: new Date().toISOString(),
    }]);
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Failed to add favorite' };
  }
}

export async function removeUserScriptFavorite(scriptId: string): Promise<{ error: string | null }> {
  try {
    const favs = await _loadAll();
    await _saveAll(favs.filter(f => f.script_id !== scriptId));
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Failed to remove favorite' };
  }
}

export async function removeTemplateScriptFavorite(missionId: string, scriptId: string): Promise<{ error: string | null }> {
  try {
    const ref = `${missionId}:${scriptId}`;
    const favs = await _loadAll();
    await _saveAll(favs.filter(f => f.template_script_ref !== ref));
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Failed to remove favorite' };
  }
}

export async function isUserScriptFavorited(scriptId: string): Promise<boolean> {
  const favs = await _loadAll();
  return favs.some(f => f.script_id === scriptId);
}

export async function isTemplateScriptFavorited(missionId: string, scriptId: string): Promise<boolean> {
  const ref = `${missionId}:${scriptId}`;
  const favs = await _loadAll();
  return favs.some(f => f.template_script_ref === ref);
}

export async function getFavorites(): Promise<{ data: FavoriteWithDetails[] | null; error: string | null }> {
  try {
    const favs = await _loadAll();
    const result: FavoriteWithDetails[] = favs.map(f => ({
      id: f.id,
      type: f.script_id ? 'user' : 'template',
      created_at: f.created_at,
    }));
    return { data: result, error: null };
  } catch (e: any) {
    return { data: [], error: null };
  }
}

export async function toggleUserScriptFavorite(scriptId: string, isFavorited: boolean): Promise<{ error: string | null }> {
  return isFavorited ? removeUserScriptFavorite(scriptId) : addUserScriptFavorite(scriptId);
}

export async function toggleTemplateScriptFavorite(missionId: string, scriptId: string, isFavorited: boolean): Promise<{ error: string | null }> {
  return isFavorited
    ? removeTemplateScriptFavorite(missionId, scriptId)
    : addTemplateScriptFavorite(missionId, scriptId);
}
