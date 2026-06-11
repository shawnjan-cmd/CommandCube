/**
 * useAppActive — returns true when the app is in the foreground.
 * Used to pause expensive animations / intervals when the user
 * backgrounds the app or switches to another screen.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { Animated } from 'react-native';

export function useAppActive(): boolean {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      setIsActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return isActive;
}

/**
 * useReconnectOnResume — DISABLED: autoConnectEngine handles all reconnect logic.
 * Kept as a no-op stub so existing call sites don't break.
 * DO NOT restore the old implementation — it would create a competing reconnect
 * loop that races with autoConnectEngine and causes random disconnects.
 */
export function useReconnectOnResume(
  _isConnected: boolean,
  _onReconnected: (success: boolean, ip: string, port: string) => void
): void {
  // NO-OP: autoConnectEngine in _layout.tsx is the single source of truth.
  // It already handles app-state changes and calls _doReconnect() on resume.
  // Having a second system call connectManual() here would race with the
  // engine's ping monitor and cause the "randomly disconnects" bug.
}

/**
 * Pause a list of Animated.CompositeAnimation loops when inactive,
 * resume them (by re-calling the starter function) when active again.
 *
 * Usage:
 *   const loopRef = useRef<Animated.CompositeAnimation | null>(null);
 *   loopRef.current = Animated.loop(...);
 *   loopRef.current.start();
 *   useAnimPause([loopRef], isActive);
 */
export function useAnimPause(
  refs: React.MutableRefObject<Animated.CompositeAnimation | null>[],
  isActive: boolean
) {
  const wasActive = useRef(true);

  useEffect(() => {
    if (wasActive.current === isActive) return;
    wasActive.current = isActive;

    if (!isActive) {
      refs.forEach(r => r.current?.stop());
    } else {
      refs.forEach(r => r.current?.start());
    }
  }, [isActive]);
}
