/**
 * ⚡ useAppSync — Prompt 3
 * Foreground sync hook: fires POST /api/sync once when app comes to foreground.
 * Replaces up to 10 individual parallel fetches that fire on tab mount.
 *
 * Mount ONCE in app/_layout.tsx:
 *   useAppSync();
 *
 * The server returns a bundle:
 *   { metrics, audit, pairStatus, serverVersion, features }
 */

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverConnection } from '../services/serverConnection';
import { features } from '../services/serverFeatures';

// ── Absorb sync payload into serverMetrics without importing circularly ──
// We use a lazy import so this hook can be mounted very early.
async function absorbSync(syncData: Record<string, any>) {
  try {
    const { serverMetrics } = await import('../services/serverMetrics');
    if (syncData.metrics && typeof (serverMetrics as any).absorbSync === 'function') {
      (serverMetrics as any).absorbSync(syncData.metrics);
    }
  } catch {}

  // Update feature gate from sync payload
  if (syncData.features || syncData.schema || syncData.serverVersion) {
    features.setFromStatus(syncData);
  }

  // Persist last-known metrics for offline display
  if (syncData.metrics) {
    try {
      await AsyncStorage.setItem('@butler_last_metrics_v1', JSON.stringify({
        data:      syncData.metrics,
        timestamp: Date.now(),
      }));
    } catch {}
  }
}

/** Single-instance cursor: server returns entries since this ID. */
let _cursor = 0;
let _syncing = false;

export async function triggerSync(): Promise<void> {
  if (_syncing) return;
  const ip    = serverConnection.getIP();
  const port  = serverConnection.getPort();
  const token = serverConnection.getToken();
  if (!ip || !port || !token) return;

  _syncing = true;
  try {
    const ctrl = new AbortController();
    const tid   = setTimeout(() => ctrl.abort(), 8_000);

    const res = await fetch(`http://${ip}:${port}/api/sync?since=${_cursor}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body:   JSON.stringify({}),
      signal: ctrl.signal,
    });

    clearTimeout(tid);
    if (!res.ok) return;

    const j = await res.json();

    // Advance audit cursor
    if (Array.isArray(j.audit) && j.audit.length > 0) {
      _cursor = j.audit[0]?.id ?? _cursor;
    }

    await absorbSync(j);

    // Handle transparent token rotation from X-New-Token header
    const newToken = res.headers.get('X-New-Token');
    if (newToken) {
      try {
        await serverConnection.absorbHealedToken(res);
      } catch {}
    }
  } catch {
    // Silent — sync failures must never crash or show UI
  } finally {
    _syncing = false;
  }
}

/**
 * useAppSync — mount in app/_layout.tsx.
 * Fires a single /api/sync on app foreground — replaces 10 parallel fetches.
 */
export function useAppSync(): void {
  const initialDone = useRef(false);

  useEffect(() => {
    // Fire once 3 seconds after mount (connection may still be establishing)
    const t = setTimeout(() => {
      if (!initialDone.current && serverConnection.isConnected()) {
        initialDone.current = true;
        triggerSync().catch(() => {});
      }
    }, 3_000);

    // Fire on every foreground event
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && serverConnection.isConnected()) {
        triggerSync().catch(() => {});
      }
    });

    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, []);
}
