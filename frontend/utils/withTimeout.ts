/**
 * withTimeout — Promise hardening helper.
 *
 * Wraps any promise so that it can NEVER hang the call site forever. If the
 * promise hasn't settled within `ms` milliseconds, we log a warning and
 * resolve with `undefined`. The original promise's eventual settlement is
 * intentionally ignored (no race-attribute leak).
 *
 * USE CASES (root reason this exists):
 *   • Bootstrap chain in `app/_layout.tsx` — a single hung dynamic import
 *     or slow native module would otherwise leave the user on a black
 *     screen forever. With withTimeout(import('@/services/x'), 3000)
 *     the boot continues even if the module is broken.
 *   • Any startup-critical async call.
 *
 * This is a pure utility with zero side effects and no imports. It is safe
 * to call from anywhere, including module-load time.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'withTimeout',
): Promise<T | undefined> {
  return new Promise<T | undefined>((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      // eslint-disable-next-line no-console
      console.warn(`[withTimeout] ${label} did not settle within ${ms}ms — continuing anyway`);
      resolve(undefined);
    }, ms);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // eslint-disable-next-line no-console
        console.warn(`[withTimeout] ${label} rejected:`, err?.message ?? err);
        resolve(undefined);
      });
  });
}
