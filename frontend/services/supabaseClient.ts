/**
 * Supabase removed — Supabase account deleted, anon key dead.
 * All calls that previously used Supabase now fall back to
 * AsyncStorage local mode automatically via isSupabaseConfigured() === false.
 * Functions kept as stubs so no import sites crash.
 */

export const supabase = null;

export const isSupabaseConfigured = (): boolean => false;

export const getSupabaseUrl = (): string => '';
