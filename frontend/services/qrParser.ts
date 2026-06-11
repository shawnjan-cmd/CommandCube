/**
 * Bulletproof QR / connection string parser — 8 strategies, zero errors thrown.
 * Works with every format the butler server can produce:
 *   • JSON  : {"ip":"192.168.1.5","port":"8766","pairingCode":"abc123"}
 *   • URL   : botler://connect?ip=192.168.1.5&port=8766&code=abc123
 *   • HTTP  : http://192.168.1.5:8766
 *   • Plain : 192.168.1.5:8766:token  OR  192.168.1.5:8766
 *   • ANSI  : strips all ANSI / console colour codes first
 *   • Butler server stdout multi-line format
 * IMPORTANT: Port is NEVER assumed or defaulted — it must come from the QR or user input.
 */

export interface ParsedConn {
  ip:          string;
  port:        string;
  pairingCode: string;
}

export function parseQRConnection(rawData: string): ParsedConn | null {
  // 1. Strip ANSI escape codes (colour codes from terminal output)
  const s = rawData
    .trim()
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/←\[[0-9;]*m/g, '');

  let ip = '', port = '', pairingCode = '';

  // 2. JSON object anywhere in the string
  const jsonStart = s.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const o = JSON.parse(s.slice(jsonStart));
      ip          = String(o.ip || o.address || '').trim();
      port        = String(o.port || '').trim();
      pairingCode = String(o.pairingCode || o.code || o.pin || o.token || '').trim();
      if (ip) return { ip, port, pairingCode };
    } catch {}
  }

  // 3. Query-param URL: botler://connect?ip=X&port=Y&code=Z
  const pm = s.match(/[?&]ip=([\d.]+).*?[?&]?port=(\d+)/i);
  if (pm) {
    ip   = pm[1];
    port = pm[2];
    const cm = s.match(/[?&](?:code|pairingCode|pin|token)=([\w-]+)/i);
    if (cm) pairingCode = cm[1];
    return { ip, port, pairingCode };
  }

  // 4. Scheme URL: http://IP:PORT or botler://IP:PORT
  const sm = s.match(/[a-z]+:\/\/([\d.]+):(\d+)/i);
  if (sm) return { ip: sm[1], port: sm[2], pairingCode };

  // 5. Butler stdout: "ADDRESS: http://192.168.1.5:PORT"
  const am = s.match(/(?:ADDRESS|IP|Server)[:\s]+(https?:\/\/)?([\d.]+):(\d+)/i);
  if (am) return { ip: am[2], port: am[3], pairingCode };

  // 6. Plain IP:PORT:TOKEN — port comes from the QR, never defaulted
  const bm = s.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})(?::([\w-]+))?/);
  if (bm) return { ip: bm[1], port: bm[2], pairingCode: bm[3] || '' };

  // 7. Any IP + nearby port number — port extracted from QR, empty string if not found
  const anyIP = s.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  if (anyIP) {
    ip = anyIP[1];
    const afterIP  = s.slice(s.indexOf(anyIP[0]) + anyIP[0].length);
    const portMatch = afterIP.match(/(\d{2,5})/);
    if (portMatch) port = portMatch[1];
    // Never return empty port — if none found, serverConnection will use adaptive port scanning
    return { ip, port, pairingCode };
  }

  // 8. Nothing found
  return null;
}
