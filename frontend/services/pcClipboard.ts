/**
 * ⚡ PC CLIPBOARD SERVICE — Prompt 6
 * Read/write the PC's clipboard from the phone.
 * Gated by features.has('clipboard') — silently returns empty if unsupported.
 *
 * Usage:
 *   import { pcClipboard } from './pcClipboard';
 *   const text = await pcClipboard.pullFromPC();
 *   await pcClipboard.pushToPC('hello from phone');
 */

import { serverConnection } from './serverConnection';
import { features } from './serverFeatures';

async function serverFetch(method: 'GET' | 'POST', path: string, body?: Record<string, any>): Promise<any> {
  const ip    = serverConnection.getIP();
  const port  = serverConnection.getPort();
  const token = serverConnection.getToken();
  if (!ip || !port) throw new Error('Not connected');

  const ctrl = new AbortController();
  const tid   = setTimeout(() => ctrl.abort(), 8_000);

  try {
    const res = await fetch(`http://${ip}:${port}${path}`, {
      method,
      headers: {
        'Content-Type':  'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(tid);
  }
}

class PCClipboardService {
  /** Pull text from the PC's clipboard to the phone. */
  async pullFromPC(): Promise<string> {
    if (!features.has('clipboard')) return '';
    try {
      const r = await serverFetch('POST', '/api/clipboard', {});
      return r?.text ?? r?.content ?? '';
    } catch { return ''; }
  }

  /** Push text from the phone to the PC's clipboard. */
  async pushToPC(text: string): Promise<boolean> {
    if (!features.has('clipboard')) return false;
    try {
      const r = await serverFetch('POST', '/api/clipboard', { text });
      return r?.ok ?? true;
    } catch { return false; }
  }

  /** Sync both directions: phone clipboard → PC, then PC → phone (phone wins). */
  async syncBidirectional(): Promise<{ ok: boolean; text: string }> {
    if (!features.has('clipboard')) return { ok: false, text: '' };
    try {
      const { getStringAsync, setStringAsync } = await import('expo-clipboard');
      const phoneText = await getStringAsync().catch(() => '');
      if (phoneText) await this.pushToPC(phoneText);
      const pcText = await this.pullFromPC();
      if (pcText && pcText !== phoneText) await setStringAsync(pcText).catch(() => {});
      return { ok: true, text: pcText || phoneText };
    } catch { return { ok: false, text: '' }; }
  }

  /** Type text on the PC keyboard via pyautogui. */
  async typeOnPC(text: string): Promise<boolean> {
    if (!features.has('keyboard')) return false;
    try {
      const r = await serverFetch('POST', '/api/keyboard/type', { text });
      return r?.ok ?? true;
    } catch { return false; }
  }

  /** Send a power action to the PC (sleep/shutdown/restart). */
  async powerAction(action: 'sleep' | 'shutdown' | 'restart'): Promise<{ ok: boolean; error?: string }> {
    if (!features.has('power')) return { ok: false, error: 'Power controls not available on this server version' };
    try {
      const r = await serverFetch('POST', '/api/power', { action, confirm: true });
      return { ok: r?.ok ?? false, error: r?.error };
    } catch (e: any) { return { ok: false, error: e?.message }; }
  }
}

export const pcClipboard = new PCClipboardService();
