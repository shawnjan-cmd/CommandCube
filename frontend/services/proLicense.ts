/**
 * Butler AI — License stub (app is free, all features unlocked)
 * No IAP library used — AsyncStorage only.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PRO_LICENSE_KEY = '@butler_pro_license_v1';
const PRO_PRODUCT_ID  = 'com.butlerai.pc.automation.pro';
const PRO_PRICE_USD   = 'Free';

export type ProFeature = 'butler_chat' | 'knowledge_base' | 'scheduling' | 'custom_scripts' | 'file_share';

export interface ProLicenseState {
  isPro:       boolean;
  purchaseId:  string | null;
  purchasedAt: number | null;
  source:      'iap' | 'restore' | 'debug' | null;
}

// App is fully free — always unlocked
const DEFAULT_STATE: ProLicenseState = {
  isPro: true,
  purchaseId: 'free_forever',
  purchasedAt: 0,
  source: 'free',
};

class ProLicenseService {
  private _state: ProLicenseState = DEFAULT_STATE;
  private _loaded = false;
  private _listeners: ((state: ProLicenseState) => void)[] = [];

  get productId()  { return PRO_PRODUCT_ID; }
  get priceLabel() { return PRO_PRICE_USD; }

  // ── Load from storage (always returns isPro: true) ─────────────
  async load(): Promise<ProLicenseState> {
    if (this._loaded) return this._state;
    try {
      // Keep storage check but always override to free
      await AsyncStorage.getItem(PRO_LICENSE_KEY);
    } catch {}
    this._loaded = true;
    this._state = DEFAULT_STATE;
    return this._state;
  }

  // ── Getters ────────────────────────────────────────────────────
  get isPro()  { return true; }
  get state()  { return this._state; }

  // ── Purchase stub (no-op — app is free) ───────────────────────
  async purchase(): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  // ── Restore stub ───────────────────────────────────────────────
  async restore(): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  // ── Grant Pro (kept for API compat) ────────────────────────────
  async _grantPro(purchaseId: string, source: ProLicenseState['source']): Promise<void> {
    this._state = { isPro: true, purchaseId, purchasedAt: Date.now(), source };
    try {
      await AsyncStorage.setItem(PRO_LICENSE_KEY, JSON.stringify(this._state));
    } catch {}
    this._notify();
  }

  // ── Revoke (kept for API compat) ───────────────────────────────
  async revoke(): Promise<void> {
    this._state = DEFAULT_STATE;
    try {
      await AsyncStorage.removeItem(PRO_LICENSE_KEY);
    } catch {}
    this._notify();
  }

  // ── Feature gating — always true (free app) ───────────────────
  canAccess(_feature: ProFeature): boolean {
    return true;
  }

  // ── Listeners ─────────────────────────────────────────────────
  onChange(cb: (state: ProLicenseState) => void): () => void {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(l => l !== cb); };
  }

  private _notify() {
    this._listeners.forEach(l => l(this._state));
  }
}

export const proLicense = new ProLicenseService();
export { PRO_PRODUCT_ID, PRO_PRICE_USD };
