/**
 * Advanced Tab Bar Context
 * Manages tab state, badges, gestures, and contextual actions
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPACT_MODE_KEY   = '@butler_tab_compact_mode';
const OMEGA_SEEN_KEY     = '@omega_log_seen_v1';   // persists dismissed state
const OMEGA_PENDING_KEY  = '@omega_log_pending_v1'; // set when new analysis arrives

export type TabName = 'index' | 'library' | 'butler' | 'scripts' | 'settings' | 'advanced' | 'terminal';

export interface TabBadge {
  count?: number;
  status?: 'info' | 'warning' | 'error' | 'success';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  pulse?: boolean;
}

export interface ContextualAction {
  id: string;
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

// ── Global OMEGA log notification state ─────────────────────────
export interface OmegaLogResult {
  score?:    number;
  health?:   string;
  insights?: string[];
  applied?:  string[];
  analyzedBy?: string;
}

interface TabBarContextType {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  badges: Record<TabName, TabBadge | null>;
  setBadge: (tab: TabName, badge: TabBadge | null) => void;
  contextualActions: ContextualAction[];
  setContextualActions: (actions: ContextualAction[]) => void;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting' | 'error') => void;
  isCompactMode: boolean;
  setCompactMode: (compact: boolean) => void;
  tabLoadingStates: Record<TabName, boolean>;
  setTabLoading: (tab: TabName, loading: boolean) => void;
  performHaptic: (pattern: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void;
  // ── OMEGA badge ────────────────────────────────────────────────
  omegaLogAvailable: boolean;
  omegaLogResult:    OmegaLogResult | null;
  signalOmegaLog:    (result: OmegaLogResult) => Promise<void>;
  clearOmegaLog:     () => Promise<void>;
  // ── Tab navigation (registered by TabLayout so it runs inside the Tabs navigator) ──
  registerNavigate: (fn: (tab: string) => void) => void;
  navigateToTab:    (tab: string) => void;
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

export function TabBarProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabName>('index');
  const [badges, setBadges] = useState<Record<TabName, TabBadge | null>>({
    index: null,
    library: null,
    butler: null,
    scripts: null,
    settings: null,
    advanced: null,
    terminal: null,
  });
  const [contextualActions, setContextualActions] = useState<ContextualAction[]>([]);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('disconnected');
  const [isCompactMode, setCompactModeState] = useState(false);
  const [omegaLogAvailable, setOmegaLogAvailable] = useState(false);
  const [omegaLogResult, setOmegaLogResult]       = useState<OmegaLogResult | null>(null);
  // Navigation callback registered by TabLayout (runs inside Tabs navigator scope)
  const navigateRef = React.useRef<((tab: string) => void) | null>(null);
  const registerNavigate = useCallback((fn: (tab: string) => void) => {
    navigateRef.current = fn;
  }, []);
  const navigateToTab = useCallback((tab: string) => {
    if (navigateRef.current) navigateRef.current(tab);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(COMPACT_MODE_KEY).then(val => {
      if (val === 'true') setCompactModeState(true);
    });
    // Restore pending OMEGA badge if app was killed before user opened Settings
    AsyncStorage.getItem(OMEGA_PENDING_KEY).then(raw => {
      if (raw) {
        try { setOmegaLogResult(JSON.parse(raw)); setOmegaLogAvailable(true); } catch {}
      }
    });
  }, []);

  const signalOmegaLog = useCallback(async (result: OmegaLogResult) => {
    setOmegaLogResult(result);
    setOmegaLogAvailable(true);
    // Also update SET tab badge so the icon pulses magenta
    setBadges(prev => ({
      ...prev,
      settings: { status: 'info', priority: 'high', pulse: true },
    }));
    try { await AsyncStorage.setItem(OMEGA_PENDING_KEY, JSON.stringify(result)); } catch {}
  }, []);

  const clearOmegaLog = useCallback(async () => {
    setOmegaLogAvailable(false);
    setOmegaLogResult(null);
    setBadges(prev => ({ ...prev, settings: null }));
    try {
      await AsyncStorage.removeItem(OMEGA_PENDING_KEY);
      await AsyncStorage.setItem(OMEGA_SEEN_KEY, Date.now().toString());
    } catch {}
  }, []);

  const setCompactMode = useCallback((compact: boolean) => {
    setCompactModeState(compact);
    AsyncStorage.setItem(COMPACT_MODE_KEY, String(compact));
  }, []);
  const [tabLoadingStates, setTabLoadingStates] = useState<Record<TabName, boolean>>({
    index: false,
    library: false,
    butler: false,
    scripts: false,
    settings: false,
    advanced: false,
    terminal: false,
  });

  const setBadge = useCallback((tab: TabName, badge: TabBadge | null) => {
    setBadges(prev => ({ ...prev, [tab]: badge }));
  }, []);

  const setTabLoading = useCallback((tab: TabName, loading: boolean) => {
    setTabLoadingStates(prev => ({ ...prev, [tab]: loading }));
  }, []);

  const performHaptic = useCallback((pattern: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    switch (pattern) {
      case 'light':
        Vibration.vibrate(10);
        break;
      case 'medium':
        Vibration.vibrate(20);
        break;
      case 'heavy':
        Vibration.vibrate(40);
        break;
      case 'success':
        Vibration.vibrate([0, 10, 50, 10]);
        break;
      case 'warning':
        Vibration.vibrate([0, 15, 100, 15, 100, 15]);
        break;
      case 'error':
        Vibration.vibrate([0, 20, 100, 20, 100, 20, 100, 20]);
        break;
    }
  }, []);

  return (
    <TabBarContext.Provider
      value={{
        activeTab,
        setActiveTab,
        badges,
        setBadge,
        contextualActions,
        setContextualActions,
        isSearchOpen,
        setSearchOpen,
        connectionStatus,
        setConnectionStatus,
        isCompactMode,
        setCompactMode,
        tabLoadingStates,
        setTabLoading,
        performHaptic,
        omegaLogAvailable,
        omegaLogResult,
        signalOmegaLog,
        clearOmegaLog,
        registerNavigate,
        navigateToTab,
      }}
    >
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBar() {
  const context = useContext(TabBarContext);
  if (!context) {
    throw new Error('useTabBar must be used within TabBarProvider');
  }
  return context;
}
