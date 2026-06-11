/**
 * ⚡ SERVER FEATURE GATE — Prompt 1
 * Reads `features` array + `schema` from /api/status and exposes
 * a type-safe gate so every UI element enables/disables based on
 * what the connected server actually supports — no APK update needed.
 *
 * Usage:
 *   import { features } from './serverFeatures';
 *   if (features.has('execute-stream')) { useStreamingExec(); }
 *   if (features.has('clipboard'))      { showClipboardButton(); }
 *   if (features.has('power'))          { showPowerControls(); }
 */

export type ServerFeature =
  | 'execute-stream'   // /api/execute/stream SSE
  | 'clipboard'        // /api/clipboard read/write
  | 'keyboard'         // /api/keyboard/type
  | 'power'            // /api/power sleep/shutdown/restart
  | 'sessions'         // /api/sessions paired device history
  | 'notifications'    // /api/notify/register Expo push
  | 'scripts-upload'   // /api/scripts/upload
  | 'auth-rotate'      // /api/auth/rotate weekly rotation
  | 'pair-qr'          // /api/pair/qr rotate+return PNG
  | 'sync'             // /api/sync foreground bundle
  | 'butler-abort'     // /api/butler/abort
  | (string & {});     // allow future feature strings

class FeatureGate {
  private _features = new Set<string>();
  private _schema   = 1;
  private _version  = '';

  /** Called after every successful /api/status response. */
  setFromStatus(j: Record<string, any>) {
    if (!j) return;
    // schema:2 means server supports typed feature flags
    this._schema  = j.schema  ?? 1;
    this._version = j.serverVersion ?? j.version ?? '';

    // Explicit feature list (schema:2+)
    if (Array.isArray(j.features)) {
      this._features = new Set(j.features as string[]);
    } else {
      // Infer from schema + version for older servers
      this._features.clear();
      if (this._schema >= 2) {
        // Server updated — assume core v8 features present
        this._features.add('sync');
        this._features.add('butler-abort');
        this._features.add('execute-stream');
        this._features.add('clipboard');
        this._features.add('sessions');
        this._features.add('auth-rotate');
        this._features.add('scripts-upload');
      }
    }
  }

  /** Check if a specific feature is available on the connected server. */
  has(feature: ServerFeature): boolean {
    return this._features.has(feature);
  }

  /** Returns the server schema version (1 = legacy, 2 = typed errors + features). */
  getSchema(): number { return this._schema; }

  /** Returns the connected server version string. */
  getVersion(): string { return this._version; }

  /** Returns true if server supports the new typed error envelope { error, code, extra }. */
  hasTypedErrors(): boolean { return this._schema >= 2; }

  /** Reset to defaults (on disconnect). */
  reset() {
    this._features.clear();
    this._schema  = 1;
    this._version = '';
  }

  /** Debug dump */
  dump(): Record<string, any> {
    return {
      schema:   this._schema,
      version:  this._version,
      features: [...this._features],
    };
  }
}

export const features = new FeatureGate();
