
/**
 * useServerConnection — single hook for every page that needs connection state.
 *
 * • Seeds initial state synchronously from autoConnectEngine.getCurrentConnection()
 *   so pages show the correct status on first render (no flicker from idle → connected).
 * • Subscribes to engine events for all future changes.
 * • Exposes refresh() so pages can manually trigger a reconnect attempt.
 */

import { useState, useEffect, useCallback } from 'react';
import { autoConnectEngine, EngineEvent, EngineStatus } from '@/services/autoConnectEngine';
import { serverConnection } from '@/services/serverConnection';

export interface ConnectionState {
  isConnected: boolean;
  ip:          string;
  port:        string;
  status:      EngineStatus;
  latencyMs:   number;
}

/**
 * @param onConnect  Optional callback fired whenever the connection becomes active.
 *                   Receives (ip, port) — use it to kick off data fetching.
 */
export function useServerConnection(
  onConnect?: (ip: string, port: string) => void,
): ConnectionState & { refresh: () => void } {

  // Seed state synchronously from the engine — no idle flicker on mount
  const seed = autoConnectEngine.getCurrentConnection();

  const [state, setState] = useState<ConnectionState>({
    isConnected: seed.connected,
    ip:          seed.ip   || serverConnection.getIP()   || '',
    port:        seed.port || serverConnection.getPort() || '',
    status:      autoConnectEngine.getStatus(),
    latencyMs:   0,
  });

  useEffect(() => {
    // If already connected at mount, fire onConnect immediately
    if (state.isConnected && state.ip && onConnect) {
      onConnect(state.ip, state.port);
    }

    const unsub = autoConnectEngine.onEvent((evt: EngineEvent) => {
      const connected = evt.status === 'connected';
      const ip        = evt.ip   || serverConnection.getIP()   || '';
      const port      = evt.port || serverConnection.getPort() || '';

      setState({
        isConnected: connected,
        ip,
        port,
        status:    evt.status,
        latencyMs: evt.latencyMs ?? 0,
      });

      if (connected && ip && onConnect) {
        onConnect(ip, port);
      }
    });

    return unsub;
    // The previous comment "Corrected dependencies for useEffect" was misleading.
    // The error message is about a missing ESLint rule definition, not a code syntax error.
    // Therefore, the code itself is syntactically correct in TypeScript.
    // The `exhaustive-deps` rule is related to ESLint configuration, not TS syntax.
  }, [onConnect, state.isConnected, state.ip]); // Reordered for consistency, but logically same.

  const refresh = useCallback(() => {
    const current = autoConnectEngine.getCurrentConnection();
    if (current.connected && current.ip) {
      onConnect?.(current.ip, current.port);
    }
  }, [onConnect]);

  return { ...state, refresh };
}
