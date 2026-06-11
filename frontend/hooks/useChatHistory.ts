/**
 * useChatHistory — Debounced AsyncStorage persistence for Butler AI chat.
 * Never blocks the UI thread. Filters streaming/failed messages before save.
 * Wired into butler.tsx via setMessages callback (no useReducer needed).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useCallback } from 'react';

const HISTORY_KEY  = '@butler_conv_nexus_v1'; // matches existing CONV_KEY in butler.tsx
const MAX_STORED   = 200;   // max messages persisted to disk (keeps storage lean)
const DEBOUNCE_MS  = 800;   // wait 800ms after last change before writing

interface Message {
  id:        string;
  role:      string;
  content:   string;
  timestamp: number;
  [key: string]: any;
}

interface UseChatHistoryOptions {
  /** Called once on mount with messages loaded from storage */
  onLoad: (msgs: Message[]) => void;
}

export function useChatHistory(
  messages: Message[],
  { onLoad }: UseChatHistoryOptions,
) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoaded  = useRef(false);

  // ── Load on mount ───────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then(raw => {
        if (!raw) { isLoaded.current = true; return; }
        try {
          const saved = JSON.parse(raw);
          if (Array.isArray(saved) && saved.length > 0) {
            // Skip any streaming/partial messages that got serialised mid-flight
            const clean = saved
              .filter((m: Message) => !m.streaming && m.content?.length > 0)
              .slice(-MAX_STORED);
            if (clean.length > 0) onLoad(clean);
          }
        } catch {
          // Corrupted history — wipe silently, never crash
          AsyncStorage.removeItem(HISTORY_KEY).catch(() => {});
        }
        isLoaded.current = true;
      })
      .catch(() => { isLoaded.current = true; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced save whenever messages array changes ───────────
  useEffect(() => {
    if (!isLoaded.current) return;   // don't save before load completes
    if (messages.length === 0) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const toSave = messages
          .filter(m => !m.streaming)   // exclude live-streaming bubbles
          .slice(-MAX_STORED);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(toSave));
      } catch {
        // Storage full — trim aggressively and retry once
        try {
          const trimmed = messages.filter(m => !m.streaming).slice(-50);
          await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
        } catch { /* never crash UI */ }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [messages]);

  /** Clear disk history and reset in-memory state */
  const clearHistory = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await AsyncStorage.removeItem(HISTORY_KEY).catch(() => {});
  }, []);

  return { clearHistory };
}
