/**
 * NexusQuickChips.tsx — one-tap prompt suggestions
 * ──────────────────────────────────────────────────────────────────
 * Lifted from `butler-ai-upgraded.html` `.butler-quick-chips` pattern.
 *
 *   [⚡ FIX MY PC] [🧹 CLEAN TEMP] [📊 PC HEALTH] [⏰ SCHEDULE] [💾 BACKUP] …
 *
 * Tight blue accent pills, mono caps, horizontally scrollable.
 * On tap → calls `onPick(prompt)` so the parent can drop the
 * prompt into the input or auto-send.
 *
 * Sized for one-handed thumb taps (min 36×ample width).
 */
import React, { memo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const MONO: any = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const C = {
  accent:    '#3b82f6',
  accent2:   '#60a5fa',
  textDim:   '#4a5270',
  surface2:  '#141823',
};

export interface QuickChip {
  /** Material icon name. */
  icon: keyof typeof MaterialIcons.glyphMap;
  /** Short display label. */
  label: string;
  /** Full prompt sent on tap. */
  prompt: string;
  /** Optional override accent (defaults to NEXUS blue). */
  color?: string;
}

interface Props {
  chips: QuickChip[];
  onPick: (prompt: string) => void;
  /** Optional small header text above the row. */
  header?: string;
  /** Disable interaction. */
  disabled?: boolean;
}

function NexusQuickChipsInner({ chips, onPick, header, disabled }: Props) {
  const handlePick = useCallback((prompt: string) => {
    if (disabled) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch {}
    onPick(prompt);
  }, [disabled, onPick]);

  if (!chips.length) return null;
  return (
    <View style={s.wrap}>
      {header ? (
        <View style={s.headerRow}>
          <View style={s.dot} />
          <Text style={s.header}>{header.toUpperCase()}</Text>
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
      >
        {chips.map((chip, i) => {
          const accent = chip.color || C.accent2;
          return (
            <TouchableOpacity
              key={`${chip.label}-${i}`}
              onPress={() => handlePick(chip.prompt)}
              activeOpacity={0.75}
              disabled={disabled}
              style={[
                s.chip,
                {
                  borderColor: accent + '40',
                  backgroundColor: accent + '12',
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            >
              <MaterialIcons name={chip.icon} size={11} color={accent} />
              <Text style={[s.chipTxt, { color: accent }]} numberOfLines={1}>
                {chip.label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default memo(NexusQuickChipsInner);

// ── Curated default chip set for Butler AI ──
export const BUTLER_DEFAULT_CHIPS: QuickChip[] = [
  { icon: 'auto-fix-high',    label: 'Fix My PC',     prompt: 'Diagnose and fix any issues you can find on my PC.' },
  { icon: 'cleaning-services',label: 'Clean Temp',    prompt: 'Clean my temp files and free up disk space.' },
  { icon: 'monitor-heart',    label: 'PC Health',     prompt: 'Run a full PC health check and report findings.' },
  { icon: 'schedule',         label: 'Schedule',      prompt: 'Schedule a maintenance script to run every Monday at 8am.' },
  { icon: 'backup',           label: 'Backup',        prompt: 'Back up my Documents folder safely (no cloud).' },
  { icon: 'search',           label: 'Find Files',    prompt: 'Find duplicate files larger than 50 MB in my Downloads folder.' },
  { icon: 'security',         label: 'Security',      prompt: 'Show me security and privacy issues on this machine.' },
  { icon: 'memory',           label: 'Top Processes', prompt: 'List the top 5 processes by CPU and RAM right now.' },
  { icon: 'network-check',    label: 'Network',       prompt: 'Test my network speed and show open ports.' },
];

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 0,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.accent },
  header: {
    fontSize: 8.5, fontWeight: '700', fontFamily: MONO,
    letterSpacing: 2.2, color: C.textDim,
  },
  row: {
    paddingHorizontal: 12, paddingVertical: 4, gap: 6,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderRadius: 7,
  },
  chipTxt: {
    fontSize: 9, fontWeight: '800', fontFamily: MONO,
    letterSpacing: 1.2,
  },
});
