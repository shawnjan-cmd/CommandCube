/**
 * ServiceGuard — Butler AI v7.x
 *
 * Wraps any service singleton in a transparent Proxy so that:
 *  • Every property access on an undefined/null service returns a no-op fn instead of throwing
 *  • Every method call returns undefined (or a resolved Promise) silently
 *  • All errors are logged to console.warn, never re-thrown
 *
 * Usage:
 *   import { safeService } from '@/utils/serviceGuard';
 *   import { nexusWS }       from '@/services/nexusWebSocket';
 *   const ws = safeService(nexusWS, 'nexusWS');
 *   ws.on(cb);   // ← never throws even if nexusWS is undefined
 */

const NOOP = () => {};
const NOOP_PROMISE = () => Promise.resolve(undefined);
const NOOP_UNSUB   = () => () => {};

/**
 * Returns a Proxy around `service` that swallows all errors.
 * If `service` is undefined/null the Proxy acts as a dead stub.
 */
export function safeService<T extends object>(service: T | undefined | null, tag = 'service'): T {
  if (service && typeof service === 'object') {
    // Service exists — wrap each method call in try/catch
    return new Proxy(service, {
      get(target: any, prop: string | symbol) {
        const val = target[prop];
        if (typeof val === 'function') {
          return (...args: any[]) => {
            try {
              return val.apply(target, args);
            } catch (e) {
              console.warn(`[serviceGuard:${tag}] ${String(prop)}() threw:`, e);
              return undefined;
            }
          };
        }
        return val;
      },
    }) as T;
  }

  // Service is undefined/null — return a stub that always no-ops
  console.warn(`[serviceGuard] ${tag} is ${service === null ? 'null' : 'undefined'} — using stub`);
  return new Proxy({} as T, {
    get(_: any, prop: string | symbol) {
      const name = String(prop);
      // Common event-subscription patterns return an unsubscribe function
      if (['on', 'onEvent', 'onStateChange', 'subscribe', 'addListener'].includes(name)) {
        return NOOP_UNSUB;
      }
      // Common async patterns
      if (['start', 'stop', 'load', 'save', 'init', 'connect', 'disconnect',
           'runFullScan', 'silentGrowth', 'runGrowthCycle'].includes(name)) {
        return NOOP_PROMISE;
      }
      // Default: sync no-op returning undefined
      return NOOP;
    },
  });
}

/**
 * Installs a global unhandledRejection + error catcher so Promise rejections
 * from service calls that aren't caught don't bubble to the error boundary.
 * Call once at app startup.
 */
export function installGlobalSafetyNet(tag = 'SafetyNet') {
  // React Native's global error handler
  const originalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
  (global as any).ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
    const msg = error?.message ?? String(error);
    // Swallow known service-init crashes — let the error boundary handle UI
    const knownSafe = [
      "reading 'on'",
      "reading 'onEvent'",
      "reading 'onStateChange'",
      "reading 'getCurrentConnection'",
      "reading 'isConnected'",
      "reading 'getIP'",
      "reading 'getPort'",
      "reading 'start'",
      "reading 'load'",
    ];
    if (!isFatal && knownSafe.some(s => msg.includes(s))) {
      console.warn(`[${tag}] swallowed non-fatal service error: ${msg}`);
      return;
    }
    if (originalHandler) originalHandler(error, isFatal);
  });
}
