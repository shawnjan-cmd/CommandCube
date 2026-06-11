/**
 * NeonChatFrame — Vector recreation of the user's sci-fi speech-bubble frame:
 * angular neon-cyan border with a raised top plateau, chamfered corners,
 * circuit traces, hazard dashes, a down-left speech tail and a chrome robot
 * head badge on the left. Pure SVG so it scales to any bar size and blends
 * into a black background with zero edges.
 */
import React from 'react';
import Svg, { Path, Circle, Rect, Line, G } from 'react-native-svg';

const CYAN   = '#3EC8FF';
const CYAN_HI = '#7FE3FF';
const STEEL  = '#5E7186';
const FILL   = '#081426';

function bubblePath(w: number, h: number, tailH: number, badgeR: number) {
  const t = 3;
  const l = 3;
  const r = w - 3;
  const b = h - tailH;
  const c = 9; // chamfer
  const startX = l + badgeR * 1.55; // top edge begins right of the badge
  const p1 = w * 0.34, p2 = w * 0.42, p3 = w * 0.66, p4 = w * 0.73;
  const tailRoot = l + badgeR + 22;
  return [
    `M ${startX} ${t + 6}`,
    `L ${p1} ${t + 6}`,
    `L ${p2} ${t}`,
    `L ${p3} ${t}`,
    `L ${p4} ${t + 6}`,
    `L ${r - c} ${t + 6}`,
    `L ${r} ${t + 6 + c}`,
    `L ${r} ${b - c}`,
    `L ${r - c} ${b}`,
    `L ${tailRoot + 18} ${b}`,
    `L ${tailRoot + 2} ${h - 1}`,
    `L ${tailRoot - 2} ${b}`,
    `L ${l + c} ${b}`,
    `L ${l} ${b - c}`,
    `L ${l} ${badgeR * 1.6}`,
  ].join(' ');
}

function RobotBadge({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <G>
      {/* glow + ring */}
      <Circle cx={cx} cy={cy} r={r + 2.5} fill="none" stroke={CYAN} strokeWidth={5} opacity={0.22} />
      <Circle cx={cx} cy={cy} r={r} fill="#0A1628" stroke={STEEL} strokeWidth={3} />
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={CYAN} strokeWidth={1.6} />
      {/* antenna */}
      <Line x1={cx} y1={cy - r * 0.52} x2={cx} y2={cy - r * 0.86} stroke={STEEL} strokeWidth={2} />
      <Circle cx={cx} cy={cy - r * 0.92} r={r * 0.13} fill={CYAN_HI} opacity={0.95} />
      <Circle cx={cx} cy={cy - r * 0.92} r={r * 0.24} fill={CYAN} opacity={0.25} />
      {/* ears */}
      <Rect x={cx - r * 0.74} y={cy - r * 0.16} width={r * 0.16} height={r * 0.4} rx={r * 0.07} fill="#C2CEDB" />
      <Rect x={cx + r * 0.58} y={cy - r * 0.16} width={r * 0.16} height={r * 0.4} rx={r * 0.07} fill="#C2CEDB" />
      {/* helmet */}
      <Rect x={cx - r * 0.6} y={cy - r * 0.52} width={r * 1.2} height={r * 1.04} rx={r * 0.38} fill="#DFE7EF" stroke="#9DAFC1" strokeWidth={1.4} />
      {/* face screen */}
      <Rect x={cx - r * 0.44} y={cy - r * 0.3} width={r * 0.88} height={r * 0.66} rx={r * 0.24} fill="#071120" />
      {/* eyes */}
      <Circle cx={cx - r * 0.18} cy={cy - r * 0.02} r={r * 0.1} fill={CYAN_HI} />
      <Circle cx={cx + r * 0.18} cy={cy - r * 0.02} r={r * 0.1} fill={CYAN_HI} />
      <Circle cx={cx - r * 0.18} cy={cy - r * 0.02} r={r * 0.19} fill={CYAN} opacity={0.22} />
      <Circle cx={cx + r * 0.18} cy={cy - r * 0.02} r={r * 0.19} fill={CYAN} opacity={0.22} />
      {/* smile */}
      <Path
        d={`M ${cx - r * 0.12} ${cy + r * 0.18} Q ${cx} ${cy + r * 0.28} ${cx + r * 0.12} ${cy + r * 0.18}`}
        stroke={CYAN_HI} strokeWidth={1.6} fill="none" strokeLinecap="round"
      />
    </G>
  );
}

export function NeonChatFrame({
  width, height, tailHeight = 11, badgeRadius = 19,
}: {
  width: number; height: number; tailHeight?: number; badgeRadius?: number;
}) {
  if (width <= 0 || height <= 0) return null;
  const d = bubblePath(width, height, tailHeight, badgeRadius);
  const bodyB = height - tailHeight;
  const badgeCx = 3 + badgeRadius + 2;
  const badgeCy = Math.min(badgeRadius + 5, bodyB / 2 + 2);
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {/* fill */}
      <Path d={`${d} Z`} fill={FILL} fillOpacity={0.97} />
      {/* outer glow */}
      <Path d={d} fill="none" stroke={CYAN} strokeWidth={6.5} opacity={0.16} strokeLinejoin="round" />
      {/* gunmetal outer line */}
      <Path d={d} fill="none" stroke={STEEL} strokeWidth={3.6} opacity={0.85} strokeLinejoin="round" />
      {/* neon core line */}
      <Path d={d} fill="none" stroke={CYAN} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d={d} fill="none" stroke={CYAN_HI} strokeWidth={0.6} opacity={0.8} strokeLinejoin="round" />

      {/* top plateau energy bar */}
      <Line x1={width * 0.45} y1={5.4} x2={width * 0.63} y2={5.4} stroke={CYAN_HI} strokeWidth={2.4} opacity={0.9} strokeLinecap="round" />

      {/* hazard dashes (top-left, like the artwork) */}
      {[0, 1, 2, 3, 4].map(i => (
        <Line
          key={`hz${i}`}
          x1={badgeRadius * 2 + 14 + i * 9} y1={13.5}
          x2={badgeRadius * 2 + 19 + i * 9} y2={8.5}
          stroke={CYAN} strokeWidth={2.2} opacity={0.75}
        />
      ))}
      {/* dot column (top-right) */}
      {[0, 1, 2, 3].map(i => (
        <Circle key={`dt${i}`} cx={width * 0.78 + i * 8} cy={11} r={1.6} fill={CYAN} opacity={0.8} />
      ))}
      {/* circuit trace bottom-right */}
      <Path
        d={`M ${width - 64} ${bodyB - 6} L ${width - 40} ${bodyB - 6} L ${width - 34} ${bodyB - 12}`}
        stroke={CYAN} strokeWidth={1} fill="none" opacity={0.45}
      />
      <Circle cx={width - 34} cy={bodyB - 12} r={1.8} fill={CYAN} opacity={0.6} />
      {/* circuit trace left (under badge) */}
      <Path
        d={`M ${badgeCx + badgeRadius - 4} ${badgeCy + badgeRadius - 2} L ${badgeCx + badgeRadius + 10} ${bodyB - 8}`}
        stroke={CYAN} strokeWidth={0.9} fill="none" opacity={0.35}
      />

      <RobotBadge cx={badgeCx} cy={badgeCy} r={badgeRadius} />
    </Svg>
  );
}
