/**
 * ⚙️ Φ-NEXUS BRIDGE Settings — Persisted preferences for the bridge protocol
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const NEXUS_SETTINGS_KEY = '@nexus_bridge_settings_v1';

export interface NexusBridgeSettings {
  relayEnabled:    boolean;  // ΣNET PC relay enrichment on/off
  growthEnabled:   boolean;  // ΩLOOP auto-growth on/off
  localOnlyMode:   boolean;  // Force local-only (no relay even if connected)
  cacheTTLMinutes: number;   // 1–30 minutes
  maxRelayResults: number;   // 1–8
  autoOrganize:    boolean;  // Auto-run NEXUS bot after each harvest
  enginePort:      number;   // Port of nexus_knowledge_engine.py (default 8767)
}

const DEFAULTS: NexusBridgeSettings = {
  relayEnabled:    true,
  growthEnabled:   true,
  localOnlyMode:   false,
  cacheTTLMinutes: 5,
  maxRelayResults: 4,
  autoOrganize:    true,
  enginePort:      8767,
};

class NexusBridgeSettingsService {
  private _cache: NexusBridgeSettings = { ...DEFAULTS };
  private _loaded = false;

  async load(): Promise<NexusBridgeSettings> {
    try {
      const raw = await AsyncStorage.getItem(NEXUS_SETTINGS_KEY);
      if (raw) {
        this._cache = { ...DEFAULTS, ...JSON.parse(raw) };
      }
    } catch {}
    this._loaded = true;
    return { ...this._cache };
  }

  async save(partial: Partial<NexusBridgeSettings>): Promise<NexusBridgeSettings> {
    this._cache = { ...this._cache, ...partial };
    try {
      await AsyncStorage.setItem(NEXUS_SETTINGS_KEY, JSON.stringify(this._cache));
    } catch {}
    return { ...this._cache };
  }

  get(): NexusBridgeSettings {
    return { ...this._cache };
  }

  async reset(): Promise<NexusBridgeSettings> {
    this._cache = { ...DEFAULTS };
    try {
      await AsyncStorage.removeItem(NEXUS_SETTINGS_KEY);
    } catch {}
    return { ...this._cache };
  }
}

export const nexusBridgeSettings = new NexusBridgeSettingsService();
