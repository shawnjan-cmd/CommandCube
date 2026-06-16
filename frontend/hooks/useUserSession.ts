/**
 * Butler AI — useUserSession Hook · CLEAN REWRITE v1
 * ──────────────────────────────────────────────────────────────────
 *
 * Reactive bridge between the `userSession` service (storage-backed,
 * imperative) and React components (declarative).
 *
 * Use cases:
 *   • Show <WelcomeBackOverlay isReturning={...} /> on the home tab
 *   • Conditionally render "First-time tip" UI only for new users
 *   • Re-run an effect when the kind transitions new → returning
 *     (i.e. immediately after the user finishes the tutorial)
 *
 * Properties:
 *   • Hydrates on first mount (idempotent — `hydrateUserSession`
 *     short-circuits subsequent calls via its module-scope cache).
 *   • Never throws. Defaults to `'unknown'` while hydrating, then
 *     to `'returning'` on any storage failure (safer default).
 *   • Safe to mount in many components simultaneously — they all
 *     share the same cached promise inside `userSession.ts`.
 */

import { useEffect, useState, useRef } from 'react';
import {
  hydrateUserSession,
  getUserSessionKindSync,
  type UserSessionKind,
} from '@/services/userSession';

export interface UseUserSessionState {
  /** 'new' | 'returning' | 'unknown' (during initial hydration). */
  kind:        UserSessionKind;
  /** True once we've successfully read from storage at least once. */
  hydrated:    boolean;
  /** Convenience flag — true ONLY when kind === 'returning'. */
  isReturning: boolean;
  /** Convenience flag — true ONLY when kind === 'new'. */
  isNewUser:   boolean;
}

export function useUserSession(): UseUserSessionState {
  // Use the synchronous getter for the initial state so components
  // that mount AFTER `_layout.tsx` has already kicked off hydration
  // render the correct kind on the first frame (no flash).
  const [kind, setKind] = useState<UserSessionKind>(() => getUserSessionKindSync());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    hydrateUserSession()
      .then(k => { if (mounted.current) setKind(k); })
      .catch(() => { if (mounted.current) setKind('returning'); }); // safer default
    return () => { mounted.current = false; };
  }, []);

  return {
    kind,
    hydrated:    kind !== 'unknown',
    isReturning: kind === 'returning',
    isNewUser:   kind === 'new',
  };
}
