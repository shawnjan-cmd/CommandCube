/**
 * ⚡ ANIMATED WIRE — Thin circuit trace wires for Terminator UI
 * Vertical and horizontal variants with flowing blood-red liquid dots
 * Matches art style: crimson red, dark steel, mechanical aesthetic
 */

import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Platform, Animated, ViewStyle,
} from 'react-native';

interface AnimatedWireProps {
  /** 'vertical' | 'horizontal' */
  direction?: 'vertical' | 'horizontal';
  /** Length in px */
  length?: number;
  /** Wire color */
  color?: string;
  /** Width of the wire line */
  thickness?: number;
  /** How many dots flow through */
  dotCount?: number;
  /** Speed of dots in ms */
  speed?: number;
  /** Show end caps / connector nodes */
  caps?: boolean;
  /** Optional style on the outer container */
  style?: ViewStyle;
  /** Position absolute shorthand */
  absolute?: boolean;
  /** Opacity of the whole wire */
  opacity?: number;
  /** Delay before animation starts (ms) */
  delay?: number;
}

/**
 * Single flowing dot on a wire.
 */
function WireDot({
  direction,
  length,
  color,
  size,
  speed,
  delay,
}: {
  direction: 'vertical' | 'horizontal';
  length: number;
  color: string;
  size: number;
  speed: number;
  delay: number;
}) {
  const pos = useRef(new Animated.Value(0)).current;
  const op  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(pos, {
            toValue: 1,
            duration: speed,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(op, { toValue: 1, duration: speed * 0.08, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0.85, duration: speed * 0.78, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: speed * 0.14, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(pos, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [length, speed, delay]);

  const travelDist = length - size;
  const isV = direction === 'vertical';

  const transform = isV
    ? [{ translateY: pos.interpolate({ inputRange: [0, 1], outputRange: [0, travelDist] }) }]
    : [{ translateX: pos.interpolate({ inputRange: [0, 1], outputRange: [0, travelDist] }) }];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: isV ? size : size * 2.5,
        height: isV ? size * 2.5 : size,
        borderRadius: size,
        backgroundColor: color,
        opacity: op,
        top: isV ? 0 : undefined,
        left: isV ? undefined : 0,
        transform,
        ...Platform.select({
          ios: {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 3,
          },
          android: {},
        }),
      }}
    />
  );
}

/**
 * Connector node (end cap) drawn as a small circle with a ring.
 */
function WireCap({ color, size }: { color: string; size: number }) {
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.2, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        width: size * 2.5,
        height: size * 2.5,
        borderRadius: size * 1.25,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: color + '30',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: glow,
      }}
    >
      <View
        style={{
          width: size * 0.9,
          height: size * 0.9,
          borderRadius: size * 0.45,
          backgroundColor: color,
        }}
      />
    </Animated.View>
  );
}

export default function AnimatedWire({
  direction = 'vertical',
  length = 120,
  color = '#CC1100',
  thickness = 1.5,
  dotCount = 2,
  speed = 2200,
  caps = true,
  style,
  absolute = false,
  opacity = 1,
  delay = 0,
}: AnimatedWireProps) {
  const isV  = direction === 'vertical';
  const DOT  = thickness + 1;
  const CAP  = thickness + 1;

  // Stagger dots evenly
  const dots = Array.from({ length: dotCount }, (_, i) => ({
    delay: delay + (i / dotCount) * speed,
  }));

  const containerStyle: ViewStyle = {
    flexDirection: isV ? 'column' : 'row',
    alignItems: 'center',
    [isV ? 'height' : 'width']: length,
    [isV ? 'width' : 'height']: Math.max(thickness * 3 + CAP * 2.5, 10),
    opacity,
    ...(absolute ? { position: 'absolute' } : {}),
  };

  return (
    <View style={[containerStyle, style]} pointerEvents="none">
      {/* Top / Left cap */}
      {caps && <WireCap color={color} size={CAP} />}

      {/* Wire track */}
      <View
        style={{
          flex: 1,
          [isV ? 'width' : 'height']: thickness,
          [isV ? 'height' : 'width']: undefined,
          backgroundColor: color + '35',
          borderRadius: thickness,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {dots.map((d, i) => (
          <WireDot
            key={i}
            direction={direction}
            length={length - (caps ? CAP * 5 : 0)}
            color={color}
            size={DOT}
            speed={speed}
            delay={d.delay}
          />
        ))}
      </View>

      {/* Bottom / Right cap */}
      {caps && <WireCap color={color} size={CAP} />}
    </View>
  );
}

/**
 * A pair of vertical wires flanking a panel — left and right edges.
 * Convenient shorthand for border-wire decoration.
 */
export function WirePair({
  height,
  color = '#CC1100',
  accentColor,
  leftStyle,
  rightStyle,
  gap = 0,
}: {
  height: number;
  color?: string;
  accentColor?: string;
  leftStyle?: ViewStyle;
  rightStyle?: ViewStyle;
  gap?: number;
}) {
  return (
    <>
      <AnimatedWire
        direction="vertical"
        length={height}
        color={color}
        dotCount={2}
        speed={2000}
        caps
        absolute
        style={{ left: gap, top: 0, ...leftStyle }}
      />
      <AnimatedWire
        direction="vertical"
        length={height}
        color={accentColor || color}
        dotCount={2}
        speed={2600}
        caps
        absolute
        delay={400}
        style={{ right: gap, top: 0, ...rightStyle }}
      />
    </>
  );
}

/**
 * Horizontal wire — good for section dividers.
 */
export function HorizontalWire({
  width,
  color = '#CC1100',
  style,
  speed = 2000,
  dotCount = 3,
}: {
  width: number;
  color?: string;
  style?: ViewStyle;
  speed?: number;
  dotCount?: number;
}) {
  return (
    <AnimatedWire
      direction="horizontal"
      length={width}
      color={color}
      dotCount={dotCount}
      speed={speed}
      caps={false}
      style={style}
    />
  );
}

/**
 * Corner wire accent — L-shaped wire in a corner of a card.
 */
export function WireCorner({
  size = 40,
  color = '#CC1100',
  corner = 'tl',
  style,
}: {
  size?: number;
  color?: string;
  corner?: 'tl' | 'tr' | 'bl' | 'br';
  style?: ViewStyle;
}) {
  const isTop   = corner === 'tl' || corner === 'tr';
  const isLeft  = corner === 'tl' || corner === 'bl';
  const glowOp  = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOp, { toValue: 0.85, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowOp, { toValue: 0.2, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          position: 'absolute',
          opacity: glowOp,
          [isTop ? 'top' : 'bottom']: 0,
          [isLeft ? 'left' : 'right']: 0,
          borderTopWidth: isTop ? 1.5 : 0,
          borderBottomWidth: !isTop ? 1.5 : 0,
          borderLeftWidth: isLeft ? 1.5 : 0,
          borderRightWidth: !isLeft ? 1.5 : 0,
          borderColor: color,
          borderTopLeftRadius: corner === 'tl' ? 3 : 0,
          borderTopRightRadius: corner === 'tr' ? 3 : 0,
          borderBottomLeftRadius: corner === 'bl' ? 3 : 0,
          borderBottomRightRadius: corner === 'br' ? 3 : 0,
        },
        style,
      ]}
    />
  );
}
