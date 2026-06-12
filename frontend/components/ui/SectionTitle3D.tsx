/**
 * SectionTitle3D — App-wide TERMINATOR TERMINAL section heading.
 *
 * Centered, large, extruded "3D" type: a dark offset duplicate renders the
 * extrusion underneath while the top layer carries a soft accent glow.
 * Steel side-rails + accent end-caps frame the title symmetrically.
 *
 * Usage:  <SectionTitle3D title="HOW IT WORKS" accent="#FF2A1F" icon="info" />
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

export default function SectionTitle3D({
  title, accent = '#FF2A1F', icon, right, size = 15, style,
}: {
  title: string;
  accent?: string;
  icon?: string;
  right?: React.ReactNode;
  size?: number;
  style?: any;
}) {
  return (
    <View style={[st.wrap, style]}>
      <View style={st.rail} />
      <View style={[st.cap, { backgroundColor: accent }]} />

      <View style={st.center}>
        {icon ? <MaterialIcons name={icon as any} size={size - 1} color={accent} style={{ marginRight: 6 }} /> : null}
        <View style={st.stack}>
          {/* extrusion layer */}
          <Text
            style={[st.txtBase, { fontSize: size, color: '#000000', top: 2.5, position: 'absolute', left: 0, right: 0 }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {/* face layer with accent glow */}
          <Text
            style={[st.txtBase, {
              fontSize: size,
              color: '#F2F4F8',
              textShadowColor: accent,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 9,
            }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {/* accent underline */}
          <View style={[st.underline, { backgroundColor: accent }]} />
        </View>
      </View>

      <View style={[st.cap, { backgroundColor: accent }]} />
      <View style={st.rail} />
      {right ? <View style={st.right}>{right}</View> : null}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 2,
    position: 'relative',
  },
  rail: { flex: 1, height: 1.5, backgroundColor: '#3C424D', borderRadius: 1 },
  cap:  { width: 5, height: 5, transform: [{ rotate: '45deg' }] },
  center: { flexDirection: 'row', alignItems: 'center', maxWidth: '78%' },
  stack: { position: 'relative', alignItems: 'center', paddingBottom: 6 },
  txtBase: {
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 2,
    textAlign: 'center',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    width: 34,
    height: 2.5,
    borderRadius: 1,
    opacity: 0.9,
  },
  right: { position: 'absolute', right: 0 },
});
