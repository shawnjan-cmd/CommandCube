import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCosmetic, PACK_THEMES, AppTheme } from '@/contexts/CosmeticContext';
import { haptics } from '@/services/haptics';


const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const TIER_LABEL: Record<string, string> = {
  free: 'FREE',
  supporter: 'SUPPORTER',
  pro: 'PRO',
  elite: 'ELITE',
};

const TIER_COLOR: Record<string, string> = {
  free: '#00FF88',
  supporter: '#FF6A1F',
  pro: '#FF6A1F',
  elite: '#FFD166',
};

function SkinCard({
  theme,
  active,
  unlocked,
  onApply,
}: {
  theme: AppTheme;
  active: boolean;
  unlocked: boolean;
  onApply: () => void;
}) {
  const tier = theme.tier ?? 'free';
  return (
    <TouchableOpacity
      testID={`skin-card-${theme.id}`}
      activeOpacity={0.85}
      onPress={() => { haptics.medium(); onApply(); }}
      style={[
        styles.card,
        { backgroundColor: theme.panel, borderColor: active ? theme.primary : theme.borderColor },
        active && { shadowColor: theme.glowColor, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
      ]}
    >
      {/* Preview swatch */}
      <View style={styles.swatchRow}>
        <View style={[styles.swatchBlock, { backgroundColor: theme.bg, borderColor: theme.borderColor }]}>
          <View style={[styles.swatchOrb, { backgroundColor: theme.primary, shadowColor: theme.glowColor }]} />
          <View style={[styles.swatchOrb, { backgroundColor: theme.secondary }]} />
          <View style={[styles.swatchOrb, { backgroundColor: theme.tertiary }]} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={[styles.cardName, { color: theme.textHi }]} numberOfLines={1}>{theme.name}</Text>
            <View style={[styles.tierPill, { borderColor: TIER_COLOR[tier], backgroundColor: TIER_COLOR[tier] + '18' }]}>
              <Text style={[styles.tierPillTxt, { color: TIER_COLOR[tier] }]}>{TIER_LABEL[tier]}</Text>
            </View>
            {active ? (
              <View style={[styles.activePill, { borderColor: theme.primary, backgroundColor: theme.primary + '22' }]}>
                <MaterialCommunityIcons name="check-circle" size={11} color={theme.primary} />
                <Text style={[styles.activePillTxt, { color: theme.primary }]}>ACTIVE</Text>
              </View>
            ) : null}
          </View>
          {!!theme.tagline && (
            <Text style={[styles.cardTagline, { color: theme.textMid ?? theme.textDim }]} numberOfLines={2}>
              {theme.tagline}
            </Text>
          )}
        </View>
      </View>

      {/* Action */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
        <View
          style={[
            styles.applyBtn,
            {
              borderColor: active ? theme.primary : theme.borderBrt,
              backgroundColor: active ? theme.primary : 'transparent',
            },
          ]}
        >
          <MaterialCommunityIcons
            name={active ? 'check-bold' : unlocked ? 'palette-outline' : 'lock-outline'}
            size={13}
            color={active ? theme.bg : theme.primary}
          />
          <Text style={[styles.applyBtnTxt, { color: active ? theme.bg : theme.primary }]}>
            {active ? 'IN USE' : unlocked ? 'APPLY' : 'LOCKED'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SkinsScreen() {
  const insets = useSafeAreaInsets();
  const cos = useCosmetic();
  const T = cos.effectiveTheme;

  const allPacks = Object.values(PACK_THEMES);
  const grouped: Record<string, AppTheme[]> = {};
  allPacks.forEach(p => {
    const cat = p.category || 'OTHER';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    if (a === 'SYSTEM') return -1;
    if (b === 'SYSTEM') return 1;
    return a.localeCompare(b);
  });

  const handleApply = (packId: string) => {
    if (!cos.isUnlocked(packId)) {
      haptics.heavy();
      return;
    }
    cos.setActivePack(packId).catch(() => {});
  };

  return (
    <View testID="skins-screen" style={[styles.root, { backgroundColor: T.bg, paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: T.borderColor }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.headerIcon, { borderColor: T.primary, backgroundColor: T.primary + '14' }]}>
            <MaterialCommunityIcons name="palette" size={20} color={T.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: T.textHi }]}>SKINS</Text>
            <Text style={[styles.headerSub, { color: T.textMid ?? T.textDim }]}>
              {cos.unlockedIds.size}/{allPacks.length} unlocked · current: {T.name}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {sortedCategories.map(cat => (
          <View key={cat} style={{ marginBottom: 18 }}>
            <View style={[styles.sectionHeader, { borderColor: T.borderColor + '60' }]}>
              <View style={[styles.sectionDot, { backgroundColor: T.primary }]} />
              <Text style={[styles.sectionTitle, { color: T.textAccent }]}>{cat}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: T.borderColor + '40', marginLeft: 8 }} />
              <Text style={[styles.sectionCount, { color: T.textDim }]}>{grouped[cat].length}</Text>
            </View>
            {grouped[cat].map(pack => (
              <SkinCard
                key={pack.id}
                theme={pack}
                active={cos.activePackId === pack.id}
                unlocked={cos.isUnlocked(pack.id)}
                onApply={() => handleApply(pack.id)}
              />
            ))}
          </View>
        ))}

        <View style={[styles.footerCard, { borderColor: T.borderColor, backgroundColor: T.panel }]}>
          <MaterialCommunityIcons name="information-outline" size={16} color={T.textDim} />
          <Text style={[styles.footerTxt, { color: T.textMid ?? T.textDim }]}>
            Skins are cosmetic only. Your data, scripts, and connections are never affected. Changes apply instantly across the entire app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerIcon: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 3, fontFamily: MONO },
  headerSub:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
    paddingVertical: 6,
  },
  sectionDot:   { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2, fontFamily: MONO },
  sectionCount: { fontSize: 11, fontWeight: '700', fontFamily: MONO },

  card: {
    borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 10,
  },
  swatchRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatchBlock: {
    width: 64, height: 64, borderRadius: 10, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly',
    paddingHorizontal: 4,
  },
  swatchOrb: {
    width: 14, height: 14, borderRadius: 7,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
  },
  cardName:    { fontSize: 14, fontWeight: '900', letterSpacing: 1.2, fontFamily: MONO, flexShrink: 1 },
  cardTagline: { fontSize: 11, fontWeight: '500', lineHeight: 16 },

  tierPill: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1,
  },
  tierPillTxt: { fontSize: 8, fontWeight: '900', letterSpacing: 1, fontFamily: MONO },
  activePill:  {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1,
  },
  activePillTxt: { fontSize: 8, fontWeight: '900', letterSpacing: 1, fontFamily: MONO },

  applyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5,
  },
  applyBtnTxt: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4, fontFamily: MONO },

  footerCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
    marginTop: 6,
  },
  footerTxt: { flex: 1, fontSize: 11, lineHeight: 16 },
});


// Expo Router per-route ErrorBoundary — isolates crashes to this tab
export { ErrorBoundary } from '@/components/ui/TabErrorBoundary';
