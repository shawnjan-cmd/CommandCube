/**
 * ⚡ TYPED SERVER ERROR MAPPER — Prompt 2
 * Server (schema:2+) returns { error: string, code: string, extra: {} }
 * on all error responses. This replaces all substring-based error checks.
 *
 * Usage:
 *   const err = mapServerError(json);
 *   switch (err.code) {
 *     case 'MISSING_PIP':    return autoInstall(err.extra.package);
 *     case 'AUTH_REQUIRED':  return promptRePair();
 *     case 'RATE_LIMITED':   return delay((err.extra.retryAfter ?? 10) * 1000).then(retry);
 *     case 'OLLAMA_OFFLINE': return showOllamaInstallPrompt();
 *   }
 */

export interface ServerError {
  code:    string;
  message: string;
  extra:   Record<string, any>;
  raw:     any;
}

/** All known server error codes (schema:2). */
export type ServerErrorCode =
  | 'NETWORK'          // No response from server
  | 'UNKNOWN'          // Unmapped server error
  | 'AUTH_REQUIRED'    // 401/403 — needs re-pair
  | 'RATE_LIMITED'     // 429 — too many requests
  | 'MISSING_PIP'      // Python module not installed
  | 'OLLAMA_OFFLINE'   // Ollama not running on PC
  | 'MODEL_NOT_FOUND'  // Ollama model not installed
  | 'TIMEOUT'          // Server/network timeout
  | 'SCRIPT_ERROR'     // Script execution failed
  | 'NOT_FOUND'        // 404 endpoint
  | 'SERVER_ERROR'     // 5xx internal error
  | 'DISK_FULL'        // Disk space exhausted
  | 'LOCKED'           // Server locked to another device
  | (string & {});

/**
 * Map a server JSON response body to a typed error object.
 * Falls back gracefully for legacy schema:1 servers using substring matching.
 */
export function mapServerError(json: any, httpStatus?: number): ServerError {
  if (!json) {
    return {
      code: 'NETWORK',
      message: 'No response from server',
      extra: {},
      raw: null,
    };
  }

  // Schema:2 typed error envelope
  if (json.code) {
    return {
      code:    json.code,
      message: json.error  ?? json.message ?? 'Server error',
      extra:   json.extra  ?? {},
      raw:     json,
    };
  }

  // Legacy schema:1 — infer code from message and HTTP status
  const msg = (json.error ?? json.message ?? '').toString().toLowerCase();

  // HTTP status codes
  if (httpStatus === 401 || httpStatus === 403 || msg.includes('unauthorized') || msg.includes('auth')) {
    return { code: 'AUTH_REQUIRED', message: json.error ?? 'Authentication required', extra: {}, raw: json };
  }
  if (httpStatus === 429 || msg.includes('rate limit') || msg.includes('too many')) {
    return { code: 'RATE_LIMITED', message: json.error ?? 'Too many requests', extra: { retryAfter: 10 }, raw: json };
  }
  if (httpStatus === 404) {
    return { code: 'NOT_FOUND', message: json.error ?? 'Endpoint not found', extra: {}, raw: json };
  }
  if (httpStatus && httpStatus >= 500) {
    return { code: 'SERVER_ERROR', message: json.error ?? 'Internal server error', extra: {}, raw: json };
  }

  // Message-based inference for legacy servers
  if (msg.includes('no module named') || msg.includes('modulenotfounderror') || msg.includes('pip install')) {
    const pkgMatch = msg.match(/no module named '?(\w+)'?/);
    return { code: 'MISSING_PIP', message: json.error ?? msg, extra: { package: pkgMatch?.[1] ?? '' }, raw: json };
  }
  if (msg.includes('ollama') && (msg.includes('not running') || msg.includes('offline') || msg.includes('unreachable'))) {
    return { code: 'OLLAMA_OFFLINE', message: json.error ?? 'Ollama is not running', extra: {}, raw: json };
  }
  if (msg.includes('model') && msg.includes('not installed')) {
    return { code: 'MODEL_NOT_FOUND', message: json.error ?? 'Model not installed', extra: {}, raw: json };
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return { code: 'TIMEOUT', message: json.error ?? 'Request timed out', extra: {}, raw: json };
  }
  if (msg.includes('locked') || msg.includes('different device')) {
    return { code: 'LOCKED', message: json.error ?? 'Server locked to another device', extra: {}, raw: json };
  }
  if (msg.includes('disk') && (msg.includes('full') || msg.includes('space'))) {
    return { code: 'DISK_FULL', message: json.error ?? 'Disk is full', extra: {}, raw: json };
  }

  return {
    code:    'UNKNOWN',
    message: json.error ?? json.message ?? 'Unknown server error',
    extra:   {},
    raw:     json,
  };
}

/**
 * Map a JS error (network/abort) to a typed ServerError.
 */
export function mapNetworkError(err: any): ServerError {
  if (!err) return { code: 'NETWORK', message: 'Network error', extra: {}, raw: err };

  const name = err?.name ?? '';
  const msg  = (err?.message ?? '').toLowerCase();

  if (name === 'AbortError' || msg.includes('abort')) {
    return { code: 'TIMEOUT', message: 'Request was cancelled', extra: {}, raw: err };
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused') || msg.includes('failed to fetch')) {
    return { code: 'NETWORK', message: 'Cannot reach server — check PC is on same Wi-Fi', extra: {}, raw: err };
  }
  return { code: 'NETWORK', message: err?.message ?? 'Network error', extra: {}, raw: err };
}
