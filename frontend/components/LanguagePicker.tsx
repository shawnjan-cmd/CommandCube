/**
 * Butler AI — LanguagePicker
 * Elegant, on-brand selector that opens a full-screen modal.
 * Drop-in: just <LanguagePicker /> — no props required.
 *
 * Matches the cyberpunk Butler aesthetic:
 *  - mono font, cyan accents, hairline borders, corner brackets
 *  - keyboard-safe scrollable list
 *  - shows current language as a compact pill
 *  - selecting saves to AsyncStorage instantly via useLanguage()
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  StyleSheet, Platform, Pressable, Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage, LangCode } from '@/contexts/LanguageContext';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const C = {
  cyan:    '#FF2A1F',
  green:   '#00FF88',
  text:    '#E6E9EF',
  textMid: '#8C95A6',
  textDim: '#6A7384',
  bg:      '#050505',
  card:    '#1A1D24',
  border:  'rgba(255,42,31,0.18)',
};

interface Props {
  /** Style variant. 'pill' (default) is for inline use, 'compact' is icon-only. */
  variant?: 'pill' | 'compact';
}

export function LanguagePicker({ variant = 'pill' }: Props) {
  const { lang, setLang, langs, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = langs.find(l => l.code === lang) || langs[0];

  const choose = useCallback(async (code: LangCode) => {
    await setLang(code);
    setOpen(false);
  }, [setLang]);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${t('picker.current')}: ${current.native}`}
        style={[
          styles.pill,
          variant === 'compact' && styles.pillCompact,
        ]}
      >
        <Text style={styles.flag}>{current.flag}</Text>
        {variant === 'pill' && (
          <>
            <View style={{ gap: 1 }}>
              <Text style={styles.pillLabel}>{t('picker.current')}</Text>
              <Text style={styles.pillNative}>{current.native}</Text>
            </View>
            <MaterialIcons name="keyboard-arrow-down" size={18} color={C.cyan} />
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{t('picker.title')}</Text>
                <Text style={styles.sheetSubtitle}>{t('picker.subtitle')}</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn} hitSlop={10}>
                <MaterialIcons name="close" size={20} color={C.cyan} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Notice */}
            <View style={styles.notice}>
              <MaterialIcons name="info-outline" size={14} color={C.cyan} />
              <Text style={styles.noticeText}>{t('picker.notice')}</Text>
            </View>

            {/* Language list */}
            <ScrollView
              style={{ maxHeight: Math.round(Dimensions.get('window').height * 0.6) }}
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {langs.map((L) => {
                const active = L.code === lang;
                return (
                  <TouchableOpacity
                    key={L.code}
                    onPress={() => choose(L.code)}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${L.native} (${L.english})`}
                    style={[styles.row, active && styles.rowActive]}
                  >
                    <Text style={styles.rowFlag}>{L.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowNative, active && { color: C.cyan }]}>
                        {L.native}
                      </Text>
                      <Text style={styles.rowEnglish}>
                        {L.english}{L.rtl ? '  ·  RTL' : ''}
                      </Text>
                    </View>
                    {active ? (
                      <MaterialIcons name="check-circle" size={20} color={C.green} />
                    ) : (
                      <View style={styles.rowDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Done */}
            <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.85} style={styles.doneBtn}>
              <Text style={styles.doneTxt}>{t('picker.done')}</Text>
            </TouchableOpacity>

            {/* Corner brackets — on-brand polish */}
            {[
              { top: 6, left: 6, borderTopWidth: 2, borderLeftWidth: 2 },
              { top: 6, right: 6, borderTopWidth: 2, borderRightWidth: 2 },
              { bottom: 6, left: 6, borderBottomWidth: 2, borderLeftWidth: 2 },
              { bottom: 6, right: 6, borderBottomWidth: 2, borderRightWidth: 2 },
            ].map((cs, i) => (
              <View
                key={i}
                pointerEvents="none"
                style={{ position: 'absolute', width: 16, height: 16, borderColor: C.cyan + '60', ...(cs as any) }}
              />
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cyan + '40',
    backgroundColor: C.cyan + '08',
    alignSelf: 'flex-start',
  },
  pillCompact: { paddingHorizontal: 10, gap: 0 },
  flag:        { fontSize: 22 },
  pillLabel:   { fontSize: 8,  color: C.textDim, fontFamily: MONO, letterSpacing: 1.4, fontWeight: '900' },
  pillNative:  { fontSize: 12, color: C.text,    fontFamily: MONO, fontWeight: '900' },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    minHeight: 520,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sheetTitle:  { fontSize: 18, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 1 },
  sheetSubtitle: { fontSize: 12, color: C.textMid, marginTop: 4, lineHeight: 17 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.cyan + '40', backgroundColor: C.cyan + '08',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.cyan + '25', marginTop: 14, marginBottom: 12 },
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.cyan + '08',
    borderWidth: 1, borderColor: C.cyan + '25',
    borderRadius: 10, padding: 10, marginBottom: 10,
  },
  noticeText: { flex: 1, fontSize: 11, color: C.textMid, lineHeight: 16 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1, borderColor: 'transparent',
    marginBottom: 6,
  },
  rowActive: {
    borderColor: C.cyan + '55',
    backgroundColor: C.cyan + '10',
  },
  rowFlag:    { fontSize: 26 },
  rowNative:  { fontSize: 15, fontWeight: '900', color: C.text, fontFamily: MONO },
  rowEnglish: { fontSize: 11, color: C.textDim, fontFamily: MONO, marginTop: 2 },
  rowDot:     {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 1.5, borderColor: C.textDim,
  },

  doneBtn: {
    marginTop: 12, paddingVertical: 14,
    borderRadius: 12, alignItems: 'center',
    backgroundColor: C.cyan,
  },
  doneTxt: { fontSize: 14, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 1.5 },
});

export default LanguagePicker;
