// ─── Background Components ────────────────────────────────────────
export { default as HomeBackground } from './backgrounds/HomeBackground';
export { default as LibraryBackground } from './backgrounds/LibraryBackground';
export { default as HistoryBackground } from './backgrounds/HistoryBackground';
export { default as ScriptsBackground } from './backgrounds/ScriptsBackground';
export { default as SettingsBackground } from './backgrounds/SettingsBackground';
export { default as MatrixRain } from './backgrounds/MatrixRain';
export { AmberCircuitBg } from './backgrounds/AmberCircuitBg';
export { default as Scanlines } from './backgrounds/Scanlines';
export * from './backgrounds/RobotElements';

// ─── UI Components ────────────────────────────────────────────────

export { default as NexusTips, default as TerminatorTips } from './ui/NexusTips';
export { HOME_TIPS, SCRIPTS_TIPS, TERMINAL_TIPS, BUTLER_TIPS, KNOWLEDGE_TIPS, SETTINGS_TIPS_DATA } from './ui/NexusTips';
export { default as ConnectionStatus } from './ui/ConnectionStatus';
export { default as QuickTips } from './ui/QuickTips';
export { default as ScriptBadge } from './ui/ScriptBadge';
export { TabBarNotificationBadge } from './ui/TabBarNotificationBadge';
export { CommandBar } from './ui/CommandBar';
export { ConnectionHealthIndicator } from './ui/ConnectionHealthIndicator';
export { SimpleServerConnection } from './ui/SimpleServerConnection';
export { ServerSetupGuide } from './ui/ServerSetupGuide';
export { MiniSkull, TypewriterLine, TechGrid, GlitchPressButton, ChromeHeader, BootLogBox, AutoHealthButton, FX } from './ui/NexusFX';

// ─── Cyber Design System ──────────────────────────────────────────
export * from './cyber';

// ─── Global App Header ──────────────────────────────────────────
export { default as AppHeader } from './ui/AppHeader';
export type { AppHeaderProps, HeaderMenuItem } from './ui/AppHeader';

// ─── Animated Wire (thin circuit trace wires for all pages) ────────
export { default as AnimatedWire } from './ui/AnimatedWire';
export { WirePair, HorizontalWire, WireCorner } from './ui/AnimatedWire';

// ─── Red Wire Components ────────────────────────────────────────────
export {
  WireHexGrid, CircuitBoard, TargetReticle, NeuralWeb, RoboSpine,
  RadarDish, DNAHelix, MechTurbine, HoloSphere, EKGMonitor,
  CogAssembly, HydraulicPiston, MatrixRainRed, IrisScanner, RibCageWire,
  SignalBars, QuantumCore, TermProgressRing, WireSkullMini, SynapticBurst,
  RedWireShowcase,
} from './ui/RedWire';

