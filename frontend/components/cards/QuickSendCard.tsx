/**
 * QuickSendCard — Home-page card that turns the phone into a remote clipboard
 * + file delivery dock for the paired PC.
 *
 * Tiles:
 *   • Send Clipboard — push the phone's clipboard contents to the PC
 *   • Send Text      — type/paste a message and push it
 *   • Send File      — pick a file from the device and stream it as base64
 *
 * All requests go through `serverConnection.fetchWithAuth`, so the existing
 * HMAC-SHA256 pairing is preserved automatically.
 *
 * If the PC isn't paired, every tile shows a friendly "Pair your PC first"
 * toast instead of silently failing.
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, Animated, Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { serverConnection } from '@/services/serverConnection';
import { haptics } from '@/services/haptics';

const MONO = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const PAL = {
  bg:         '#060D18',
  bgInner:    '#020812',
  cyan:       '#00E5FF',
  purple:     '#A366F5',
  amber:      '#FFB341',
  green:      '#2FD98B',
  red:        '#FF4466',
  textHi:     '#E8F8FF',
  textMid:    '#7FB6D9',
  textDim:    '#456A7E',
  border:     'rgba(0,229,255,0.22)',
  borderBrt:  'rgba(0,229,255,0.55)',
};

type Status = 'idle' | 'sending' | 'ok' | 'fail' | 'unpaired';

function StatusToast({ status, msg, onDismiss }: { status: Status; msg: string; onDismiss: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (status === 'idle') return;
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.delay(2200),
      Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
    ]).start(() => onDismiss());
  }, [status]);

  if (status === 'idle') return null;
  const color =
    status === 'ok'        ? PAL.green :
    status === 'sending'   ? PAL.cyan :
    status === 'unpaired'  ? PAL.amber :
                              PAL.red;
  const icon =
    status === 'ok'        ? 'check-circle-outline' as const :
    status === 'sending'   ? 'progress-upload' as const :
    status === 'unpaired'  ? 'alert-circle-outline' as const :
                              'close-circle-outline' as const;
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { borderColor: color + '88', backgroundColor: color + '15', opacity: fade }]}>
      <MaterialCommunityIcons name={icon} size={14} color={color} />
      <Text style={[styles.toastTxt, { color }]} numberOfLines={2}>{msg}</Text>
    </Animated.View>
  );
}

function ActionTile({
  testID, icon, label, color, onPress, disabled,
}: {
  testID: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const press = useRef(new Animated.Value(0)).current;
  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.85}
      disabled={disabled}
      onPressIn={() => Animated.timing(press, { toValue: 1, duration: 110, useNativeDriver: true }).start()}
      onPressOut={() => Animated.timing(press, { toValue: 0, duration: 180, useNativeDriver: true }).start()}
      onPress={onPress}
      style={styles.tileWrap}
    >
      <Animated.View
        style={[
          styles.tile,
          {
            borderColor: disabled ? PAL.border : color + 'AA',
            backgroundColor: disabled ? 'rgba(255,255,255,0.02)' : color + '14',
            opacity: disabled ? 0.55 : 1,
            transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }],
          },
        ]}
      >
        <View style={[styles.tileIconWrap, { backgroundColor: color + '20', borderColor: color + '88' }]}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.tileLabel, { color: disabled ? PAL.textDim : PAL.textHi }]} numberOfLines={1}>
          {label}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={14} color={disabled ? PAL.textDim : color + 'CC'} />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function QuickSendCard({ isConnected }: { isConnected: boolean }) {
  const [status, setStatus] = useState<Status>('idle');
  const [msg,    setMsg]    = useState('');
  const [showInput, setShowInput] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const toast = (s: Status, m: string) => { setStatus(s); setMsg(m); };

  const postToPC = async (endpoint: string, body: any) => {
    // ServerConnection exposes fetchWithAuth which wires HMAC + IP automatically.
    const ip   = (serverConnection as any)._ip   || (serverConnection as any).getIp?.()   || '';
    const port = (serverConnection as any)._port || (serverConnection as any).getPort?.() || '';
    if (!ip || !port) throw new Error('PC address not resolved');
    const url = `http://${ip}:${port}${endpoint}`;
    const res = await serverConnection.fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  };

  const onClipboard = async () => {
    haptics.medium();
    if (!isConnected) { toast('unpaired', 'Pair your PC first to send clipboard'); return; }
    try {
      toast('sending', 'Reading clipboard…');
      const txt = await Clipboard.getStringAsync();
      if (!txt) { toast('fail', 'Clipboard is empty'); return; }
      await postToPC('/api/clipboard', { text: txt, source: 'mobile' });
      toast('ok', `Sent ${txt.length} chars to PC clipboard`);
      haptics.success();
    } catch (e: any) {
      toast('fail', `Send failed — ${e?.message || 'no route'}`);
      haptics.heavy();
    }
  };

  const onText = async () => {
    haptics.light();
    if (!isConnected) { toast('unpaired', 'Pair your PC first to send text'); return; }
    setShowInput(true);
  };

  const sendTypedText = async () => {
    const t = inputVal.trim();
    if (!t) { setShowInput(false); return; }
    haptics.medium();
    try {
      toast('sending', 'Sending message…');
      await postToPC('/api/clipboard', { text: t, source: 'mobile-input' });
      toast('ok', `Sent ${t.length} chars to PC`);
      haptics.success();
      setInputVal('');
      setShowInput(false);
    } catch (e: any) {
      toast('fail', `Send failed — ${e?.message || 'no route'}`);
      haptics.heavy();
    }
  };

  const onFile = async () => {
    haptics.medium();
    if (!isConnected) { toast('unpaired', 'Pair your PC first to send a file'); return; }
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      toast('sending', `Streaming ${file.name}…`);
      const b64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      await postToPC('/api/upload', {
        filename: file.name,
        size:     file.size ?? 0,
        mimeType: file.mimeType ?? 'application/octet-stream',
        base64:   b64,
      });
      toast('ok', `Sent ${file.name}`);
      haptics.success();
    } catch (e: any) {
      toast('fail', `Send failed — ${e?.message || 'no route'}`);
      haptics.heavy();
    }
  };

  return (
    <View testID="quick-send-card" style={styles.card}>
      {/* Decorative bg */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.bgOrbA} />
        <View style={styles.bgOrbB} />
        {[15, 35, 60, 85].map((p, i) => (
          <View key={`g${i}`} style={[styles.gridLine, { top: `${p}%` as any }]} />
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { borderColor: PAL.cyan + '88', backgroundColor: PAL.cyan + '14' }]}>
          <MaterialCommunityIcons name="rocket-launch-outline" size={15} color={PAL.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.label}>QUICK SEND</Text>
            <View style={styles.dot} />
            <Text style={styles.sub}>{isConnected ? 'PC LINKED' : 'PC OFFLINE'}</Text>
          </View>
          <Text style={styles.title}>Send to your PC</Text>
        </View>
        <View style={[styles.statusPill, { borderColor: isConnected ? PAL.green + '88' : PAL.amber + '88', backgroundColor: (isConnected ? PAL.green : PAL.amber) + '15' }]}>
          <View style={[styles.pillDot, { backgroundColor: isConnected ? PAL.green : PAL.amber }]} />
          <Text style={[styles.pillTxt, { color: isConnected ? PAL.green : PAL.amber }]}>
            {isConnected ? 'READY' : 'WAITING'}
          </Text>
        </View>
      </View>

      {/* Tiles */}
      <View style={styles.tilesGrid}>
        <ActionTile testID="qsend-clipboard" icon="clipboard-arrow-up-outline"   label="Send Clipboard"   color={PAL.cyan}   onPress={onClipboard} />
        <ActionTile testID="qsend-text"      icon="keyboard-outline"             label="Send Text"        color={PAL.purple} onPress={onText} />
        <ActionTile testID="qsend-file"      icon="file-upload-outline"          label="Send File"        color={PAL.amber}  onPress={onFile} />
      </View>

      {/* Inline text input (only when Send Text tapped) */}
      {showInput && (
        <View style={styles.inputRow}>
          <TextInput
            testID="qsend-input"
            autoFocus
            value={inputVal}
            onChangeText={setInputVal}
            placeholder="Type or paste — sent on enter…"
            placeholderTextColor={PAL.textDim}
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={sendTypedText}
            multiline
            maxLength={4000}
          />
          <TouchableOpacity testID="qsend-input-send" onPress={sendTypedText} style={styles.inputSend} activeOpacity={0.8}>
            <MaterialCommunityIcons name="send" size={14} color="#001018" />
          </TouchableOpacity>
        </View>
      )}

      {/* Footer hint */}
      <View style={styles.footer}>
        <MaterialCommunityIcons name="shield-lock-outline" size={11} color={PAL.textDim} />
        <Text style={styles.footerTxt}>HMAC-SHA256 · LAN only · Never leaves your network</Text>
      </View>

      <StatusToast status={status} msg={msg} onDismiss={() => setStatus('idle')} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PAL.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAL.border,
    overflow: 'hidden',
    padding: 11,
    marginVertical: 0,
    position: 'relative',
    ...(Platform.OS === 'ios'
      ? { shadowColor: PAL.cyan, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 14 }
      : { elevation: 6 }),
  },
  bgOrbA: { position: 'absolute', top: -50, left: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: PAL.cyan,   opacity: 0.10 },
  bgOrbB: { position: 'absolute', bottom: -60, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: PAL.purple, opacity: 0.10 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,229,255,0.05)' },

  header:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  headerIcon: { width: 30, height: 30, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  label:      { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.8, color: PAL.cyan },
  sub:        { fontSize: 8, fontWeight: '800', fontFamily: MONO, letterSpacing: 1, color: PAL.textMid },
  dot:        { width: 3, height: 3, borderRadius: 1.5, backgroundColor: PAL.textMid },
  title:      { fontSize: 13, fontWeight: '900', fontFamily: MONO, color: PAL.textHi, letterSpacing: 0.8, marginTop: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2.5 },
  pillDot:    { width: 5, height: 5, borderRadius: 2.5 },
  pillTxt:    { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },

  tilesGrid:  { flexDirection: 'row', gap: 7, marginBottom: 4 },
  tileWrap:   { flex: 1 },
  tile:       { borderWidth: 1, borderRadius: 10, padding: 7, gap: 5, alignItems: 'center', justifyContent: 'center', minHeight: 58 },
  tileIconWrap: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tileLabel:  { fontSize: 8.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.4, textAlign: 'center' },

  inputRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 8, borderWidth: 1, borderColor: PAL.borderBrt, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: PAL.bgInner },
  input:      { flex: 1, color: PAL.textHi, fontSize: 13, fontFamily: MONO, paddingVertical: 6, maxHeight: 80 },
  inputSend:  { width: 28, height: 28, borderRadius: 14, backgroundColor: PAL.cyan, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },

  footer:     { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 8 },
  footerTxt:  { fontSize: 8.5, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.4, color: PAL.textDim },

  toast:      { position: 'absolute', left: 14, right: 14, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  toastTxt:   { flex: 1, fontSize: 11, fontWeight: '800', fontFamily: MONO, letterSpacing: 0.5 },
});
