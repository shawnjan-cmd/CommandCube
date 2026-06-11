/**
 * ⚡ NEXUS TOAST SERVICE
 * Lightweight cross-screen notification bus.
 * Mount <ToastHost /> once in app/_layout.tsx — then call toast.success() anywhere.
 * Replaces all Alert.alert() calls for non-critical messages.
 *
 * Usage:
 *   import { toast } from '@/services/toast';
 *   toast.success('Script saved to PC');
 *   toast.error('Connection failed');
 *   toast.warning('Server may be slow');
 *   toast.info('Downloading model...');
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id:      string;
  text:    string;
  type:    ToastType;
  duration?: number; // ms, default 3000
}

type ToastListener = (msg: ToastMessage) => void;

let _listener: ToastListener | null = null;
let _seq = 0;

function show(text: string, type: ToastType, duration = 3000): void {
  if (!_listener) {
    // Fallback: log to console if no host mounted yet
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[Toast] ${prefix} ${text}`);
    return;
  }
  _listener({ id: `toast-${++_seq}`, text, type, duration });
}

export const toast = {
  /** Register the ToastHost listener. Call once in app/_layout.tsx. */
  register(fn: ToastListener): () => void {
    _listener = fn;
    return () => { if (_listener === fn) _listener = null; };
  },

  success(text: string, duration?: number): void { show(text, 'success', duration); },
  error(text: string, duration?: number): void   { show(text, 'error',   duration ?? 4000); },
  warning(text: string, duration?: number): void { show(text, 'warning', duration); },
  info(text: string, duration?: number): void    { show(text, 'info',    duration); },

  /** Generic show — useful when type is dynamic. */
  show(text: string, type: ToastType = 'info', duration?: number): void {
    show(text, type, duration);
  },
};
