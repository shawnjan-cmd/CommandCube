/**
 * ⚡ NEXUS PARTICLE FX — Per-page unique particle animations
 * Each page has different color, style, and movement pattern
 * Performance optimized: pauses when page is not active
 * Uses useNativeDriver:false for cross-platform safety
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, Dimensions, StyleSheet, Platform } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

export type ParticleStyle =
  | 'drift'      // HOME — gentle teal hexagons drifting up
  | 'circuit'    // SCRIPTS — blue data packets racing horizontally
  | 'neural'     // BUTLER — purple neural pulses radiating from center
  | 'dna'        // KNOWLEDGE — amber helix orbiting particles
  | 'radar'      // TOOLS — cyan radar blips expanding outward
  | 'orbit'      // COSMETICS — pink sparkles spiraling
  | 'matrix'     // SETTINGS — green drops falling
  | 'terminal';  // TERMINAL — green scanline particles

export interface ParticleConfig {
  style: ParticleStyle;
  color: string;
  count?: number;
  opacity?: number;
}

const PAGE_CONFIGS: Record<string, ParticleConfig> = {
  home:      { style: 'drift',    color: '#FF2A1F', count: 3,  opacity: 0.14 },
  scripts:   { style: 'circuit',  color: '#FF6A1F', count: 2,  opacity: 0.11 },
  butler:    { style: 'neural',   color: '#BB44FF', count: 3,  opacity: 0.11 },
  knowledge: { style: 'dna',      color: '#FF6A1F', count: 2,  opacity: 0.12 },
  fileshare: { style: 'radar',    color: '#FF2A1F', count: 2,  opacity: 0.10 },
  support:   { style: 'orbit',    color: '#FF6A1F', count: 3,  opacity: 0.13 },
  settings:  { style: 'matrix',   color: '#FF2A1F', count: 2,  opacity: 0.09 },
  terminal:  { style: 'terminal', color: '#00FF88', count: 2,  opacity: 0.11 },
  index:     { style: 'drift',    color: '#FF2A1F', count: 2,  opacity: 0.11 },
};

export function getParticleConfig(pageId: string): ParticleConfig {
  return PAGE_CONFIGS[pageId] || PAGE_CONFIGS.home;
}

// ─── Single Particle ───────────────────────────────────────────────
interface ParticleProps {
  style: ParticleStyle;
  color: string;
  index: number;
  opacity: number;
  active: boolean;
}

function Particle({ style, color, index, opacity, active }: ParticleProps) {
  const posX   = useRef(new Animated.Value(0)).current;
  const posY   = useRef(new Animated.Value(0)).current;
  const scaleA = useRef(new Animated.Value(0)).current;
  const rotA   = useRef(new Animated.Value(0)).current;
  const fadeA  = useRef(new Animated.Value(0)).current;
  const anim   = useRef<Animated.CompositeAnimation | null>(null);

  const seed = useMemo(() => ({
    startX: (Math.random() * SW * 0.9) + SW * 0.05,
    startY: Math.random() * SH * 0.7,
    endX:   (Math.random() * SW * 0.9) + SW * 0.05,
    endY:   -(Math.random() * 120 + 40),
    delay:  index * 600 + Math.random() * 300,
    dur:    4500 + Math.random() * 2000,
    size:   Math.random() * 3 + 3,
  }), [index]);

  useEffect(() => {
    if (!active) {
      anim.current?.stop();
      fadeA.setValue(0);
      return;
    }

    // Simplified: only posY + fade — removed rotation and scale loops for perf
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(seed.delay),
      Animated.parallel([
        Animated.timing(posY,  { toValue: 1, duration: seed.dur, useNativeDriver: false }),
        Animated.sequence([
          Animated.timing(fadeA, { toValue: opacity, duration: 500, useNativeDriver: false }),
          Animated.delay(seed.dur - 1000),
          Animated.timing(fadeA, { toValue: 0,       duration: 500, useNativeDriver: false }),
        ]),
      ]),
      Animated.timing(posY, { toValue: 0, duration: 0, useNativeDriver: false }),
    ]));
    anim.current = loop;
    posY.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [active]);

  const top  = posY.interpolate({ inputRange: [0, 1], outputRange: [seed.startY, seed.endY] });
  const s = seed.size;

  const renderShape = () => {
    switch (style) {
      case 'drift':     // hexagon-ish
        return <View style={{ width: s * 1.6, height: s * 1.4, borderWidth: 1.5, borderColor: color, borderRadius: 3, transform: [{ rotate: '30deg' }] }} />;
      case 'circuit':   // small square packet
        return <View style={{ width: s, height: s * 0.7, backgroundColor: color, borderRadius: 1 }} />;
      case 'neural':    // circle node
        return <View style={{ width: s * 1.2, height: s * 1.2, borderRadius: s, backgroundColor: color, borderWidth: 1, borderColor: color + 'AA' }} />;
      case 'dna':       // diamond
        return <View style={{ width: s * 1.2, height: s * 1.2, backgroundColor: color, borderRadius: 2, transform: [{ rotate: '45deg' }] }} />;
      case 'radar':     // ring blip
        return <View style={{ width: s * 1.8, height: s * 1.8, borderRadius: s, borderWidth: 1.5, borderColor: color, backgroundColor: 'transparent' }} />;
      case 'orbit':     // star sparkle (cross)
        return (
          <View style={{ alignItems: 'center', justifyContent: 'center', width: s * 2, height: s * 2 }}>
            <View style={{ position: 'absolute', width: s * 2, height: 1.5, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ position: 'absolute', width: 1.5, height: s * 2, backgroundColor: color, borderRadius: 1 }} />
          </View>
        );
      case 'matrix':    // vertical drop
      case 'terminal':
        return <View style={{ width: 1.5, height: s * 3, backgroundColor: color, borderRadius: 1, opacity: 0.8 }} />;
      default:
        return <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: color }} />;
    }
  };

  return (
    <Animated.View style={{
      position: 'absolute',
      left: seed.startX,
      top,
      opacity: fadeA,
    }} pointerEvents="none">
      {renderShape()}
    </Animated.View>
  );
}

// ─── Main Component ─────────────────────────────────────────────
interface Props {
  pageId: string;
  active?: boolean;
}

export default function NexusParticleFX({ pageId, active = true }: Props) {
  const config = getParticleConfig(pageId);
  const count = config.count ?? 6;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <Particle
          key={i}
          style={config.style}
          color={config.color}
          index={i}
          opacity={config.opacity ?? 0.15}
          active={active}
        />
      ))}
    </View>
  );
}
