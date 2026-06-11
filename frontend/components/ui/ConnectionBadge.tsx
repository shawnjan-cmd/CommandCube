/**
 * 🔗 CONNECTION BADGE — Small persistent status widget
 * Shows green CONNECTED or red OFFLINE badge
 * Subscribes to serverConnection singleton for real-time state
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { serverConnection } from '@/services/serverConnection';
import { haptics } from '@/services/haptics';

interface Props {
  /** If true, tapping runs a reconnect attempt */
  tappable?: boolean;
  style?: any;
}

export default function ConnectionBadge({ tappable = false, style }: Props) {
  const [connected, setConnected] = useState(serverConnection.isConnected());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Subscribe to live state changes
    const unsub = serverConnection.onStateChange(s => {
      setConnected(s.connected);
    });
    return unsub;
  }, []);

  const handlePress = async () => {
    if (!tappable || checking) return;
    haptics.light();
    setChecking(true);
    try {
      const r = await serverConnection.reconnect();
      if (r.connected) haptics.success();
      else haptics.warning();
    } finally {
      setChecking(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.badge, connected ? styles.connected : styles.offline, style]}
      onPress={handlePress}
      disabled={!tappable || checking}
      activeOpacity={tappable ? 0.7 : 1}
    >
      <View style={[styles.dot, { backgroundColor: connected ? '#00FF41' : '#FF003C' }]} />
      <Text style={[styles.label, { color: connected ? '#00FF41' : '#FF003C' }]}>
        {checking ? 'CHECKING' : connected ? 'CONNECTED' : 'OFFLINE'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 2,
  },
  connected: {
    borderColor: '#00FF41',
    backgroundColor: '#00FF4110',
  },
  offline: {
    borderColor: '#FF003C',
    backgroundColor: '#FF003C10',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
});
