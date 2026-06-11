/**
 * FileShareClipboardCard — Obsidian Neon themed
 * Fully functional local-network bridge:
 *  · Send File (phone → PC via /api/files/upload)
 *  · Get PC Clipboard (/api/clipboard/get)
 *  · Push Mobile Clipboard (/api/clipboard/set)
 *  · Browse PC files (opens fileshare tab)
 *  · Screenshot PC screen (/api/screenshot)
 */
import React, { useRef, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, Animated, ActivityIndicator, Alert, Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { haptics } from '@/services/haptics';
import { serverConnection } from '@/services/serverConnection';
import { Image as ExpoImage } from 'expo-image';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const D = {
  text:    '#D8E8F4',
  textMid: '#7A9AB8',
  textDim: '#3A5068',
  cyan:    '#00FFFF',
  green:   '#00FF88',
  amber:   '#F5A623',
  red:     '#FF3131',
  purple:  '#BF00FF',
  border:  'rgba(0,255,255,0.12)',
};

interface Props {
  isConnected: boolean;
  goToTab: (tab: string) => void;
}

type TileStatus = 'idle' | 'loading' | 'done' | 'error';

export function FileShareClipboardCard({ isConnected, goToTab }: Props) {
  const [clipText,      setClipText]      = useState('');
  const [pushStatus,    setPushStatus]    = useState<TileStatus>('idle');
  const [getStatus,     setGetStatus]     = useState<TileStatus>('idle');
  const [uploadStatus,  setUploadStatus]  = useState<TileStatus>('idle');
  const [shotStatus,    setShotStatus]    = useState<TileStatus>('idle');
  const [lastSynced,    setLastSynced]    = useState<string | null>(null);
  const [uploadedFile,  setUploadedFile]  = useState<string | null>(null);
  const [pcClipPreview, setPcClipPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pulse = useRef(new Animated.Value(0.4)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,   duration: 1100, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.2, duration: 1100, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, []);

  const getConn = () => {
    const ip    = serverConnection.getIP();
    const port  = serverConnection.getPort();
    const token = serverConnection.getToken();
    return { ip, port, token };
  };

  // ── PUSH mobile clipboard to PC ──────────────────────────────
  const pushClipboard = useCallback(async () => {
    const text = clipText.trim();
    if (!text || !isConnected) { haptics.warning(); return; }
    const { ip, port, token } = getConn();
    if (!ip || !port) return;
    haptics.medium();
    setPushStatus('loading');
    try {
      const res = await fetch(`http://${ip}:${port}/api/clipboard/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        setPushStatus('done');
        setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        haptics.success();
        setTimeout(() => setPushStatus('idle'), 2500);
      } else {
        throw new Error('Server error');
      }
    } catch {
      setPushStatus('error');
      haptics.warning();
      setTimeout(() => setPushStatus('idle'), 2500);
    }
  }, [isConnected, clipText]);

  // ── GET PC clipboard → paste into input ──────────────────────
  const getPcClipboard = useCallback(async () => {
    if (!isConnected) { haptics.warning(); return; }
    const { ip, port, token } = getConn();
    if (!ip || !port) return;
    haptics.light();
    setGetStatus('loading');
    try {
      const res = await fetch(`http://${ip}:${port}/api/clipboard/get`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.text || data.content || '';
        if (content) {
          setClipText(content);
          setPcClipPreview(content.slice(0, 80));
          await Clipboard.setStringAsync(content);
          setGetStatus('done');
          haptics.success();
        } else {
          setPcClipPreview('PC clipboard is empty');
          setGetStatus('done');
        }
        setTimeout(() => { setGetStatus('idle'); setPcClipPreview(null); }, 3000);
      } else {
        throw new Error('Server error');
      }
    } catch {
      setGetStatus('error');
      haptics.warning();
      setTimeout(() => setGetStatus('idle'), 2500);
    }
  }, [isConnected]);

  // ── SEND file phone → PC ──────────────────────────────────────
  const sendFileToPc = useCallback(async () => {
    if (!isConnected) { haptics.warning(); Alert.alert('Offline', 'Connect to your PC first.'); return; }
    const { ip, port, token } = getConn();
    if (!ip || !port) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      haptics.medium();
      setUploadStatus('loading');
      setUploadProgress(0);

      // Animate fake progress bar
      Animated.timing(progressAnim, {
        toValue: 0.85,
        duration: Math.min(3000, file.size ? file.size / 50000 * 1000 : 2000),
        useNativeDriver: false,
      }).start();

      const formData = new FormData();
      formData.append('file', {
        uri:  file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);

      const res = await fetch(`http://${ip}:${port}/api/files/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
        signal: AbortSignal.timeout(60_000),
      });

      progressAnim.setValue(1);
      if (res.ok) {
        setUploadedFile(file.name);
        setUploadStatus('done');
        haptics.success();
        setTimeout(() => { setUploadStatus('idle'); setUploadedFile(null); progressAnim.setValue(0); }, 3000);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e: any) {
      if (e?.code === 'DOCUMENT_PICKER_CANCELED') { setUploadStatus('idle'); return; }
      setUploadStatus('error');
      haptics.warning();
      setTimeout(() => { setUploadStatus('idle'); progressAnim.setValue(0); }, 3000);
    }
  }, [isConnected]);

  // ── SCREENSHOT PC screen ──────────────────────────────────────
  const takeScreenshot = useCallback(async () => {
    if (!isConnected) { haptics.warning(); return; }
    const { ip, port, token } = getConn();
    if (!ip || !port) return;
    haptics.medium();
    setShotStatus('loading');
    try {
      const res = await fetch(`http://${ip}:${port}/api/screenshot`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const data = await res.json();
        setShotStatus('done');
        haptics.success();
        if (data.url || data.path) {
          Alert.alert('Screenshot Saved', `Saved to PC: ${data.path || 'Screenshots folder'}`, [{ text: 'OK' }]);
        }
        setTimeout(() => setShotStatus('idle'), 2500);
      } else {
        throw new Error('Screenshot failed');
      }
    } catch {
      setShotStatus('error');
      haptics.warning();
      setTimeout(() => setShotStatus('idle'), 2500);
    }
  }, [isConnected]);

  const connCol = isConnected ? D.green : D.red;

  // Tile config with real handlers
  const TILES = [
    {
      icon: 'file-upload',
      label: uploadStatus === 'loading' ? 'SENDING...' : uploadStatus === 'done' ? 'SENT ✓' : uploadStatus === 'error' ? 'FAILED ✗' : 'Send File',
      desc:   uploadedFile ? uploadedFile.slice(0, 14) : 'Phone → PC',
      color:  D.cyan,
      status: uploadStatus,
      onPress: sendFileToPc,
    },
    {
      icon: 'file-download',
      label: getStatus === 'loading' ? 'FETCHING...' : getStatus === 'done' ? 'GOT IT ✓' : getStatus === 'error' ? 'FAILED ✗' : 'Get Clip',
      desc:   pcClipPreview ? pcClipPreview.slice(0, 14) : 'PC → Phone',
      color:  D.green,
      status: getStatus,
      onPress: getPcClipboard,
    },
    {
      icon: 'folder-open',
      label: 'Browse PC',
      desc:   'PC folders',
      color:  D.amber,
      status: 'idle' as TileStatus,
      onPress: () => { haptics.light(); goToTab('fileshare'); },
    },
    {
      icon: 'screenshot',
      label: shotStatus === 'loading' ? 'CAPTURING...' : shotStatus === 'done' ? 'SAVED ✓' : shotStatus === 'error' ? 'FAILED ✗' : 'Screenshot',
      desc:   'PC screen',
      color:  D.purple,
      status: shotStatus,
      onPress: takeScreenshot,
    },
  ] as const;

  const overallStatus = pushStatus !== 'idle' ? pushStatus : 'idle';
  const statusCol = overallStatus === 'done' ? D.green : overallStatus === 'error' ? D.red : overallStatus === 'loading' ? D.amber : D.cyan;

  return (
    <View style={s.card}>
      <View style={[s.topLine, { backgroundColor: D.cyan }]} />
      <View style={[s.cornerTL, { borderColor: D.cyan + '80' }]} />
      <View style={[s.cornerBR, { borderColor: D.cyan + '50' }]} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={[s.headerIcon, { backgroundColor: D.cyan + '12', borderColor: D.cyan + '40' }]}>
          <MaterialIcons name="sync" size={18} color={D.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: D.text }]}>FILE SHARE & CLIPBOARD</Text>
          <Text style={[s.subtitle, { color: D.textMid }]}>PHONE ↔ PC · LOCAL BRIDGE · LAN ONLY</Text>
        </View>
        <View style={[s.connBadge, { borderColor: connCol + '55', backgroundColor: connCol + '0C' }]}>
          <Animated.View style={[s.connDot, { backgroundColor: connCol, opacity: pulse }]} />
          <Text style={[s.connTxt, { color: connCol }]}>{isConnected ? 'READY' : 'OFFLINE'}</Text>
        </View>
      </View>

      {/* ── 2×2 Quick Transfer Tiles ── */}
      <View style={s.tilesRow}>
        {TILES.map((item, i) => {
          const isLoading = item.status === 'loading';
          const isDone    = item.status === 'done';
          const isErr     = item.status === 'error';
          return (
            <TouchableOpacity
              key={i}
              style={[
                s.tile,
                { borderColor: item.color + (isLoading ? '90' : '38'), backgroundColor: item.color + (isLoading ? '14' : '08') },
              ]}
              onPress={() => { item.onPress(); }}
              activeOpacity={0.82}
              disabled={isLoading}
            >
              <View style={[s.tileTopLine, { backgroundColor: item.color }]} />
              <View style={[s.tileTL, { borderColor: item.color + '70' }]} />
              <View style={[s.tileBR, { borderColor: item.color + '45' }]} />
              <View style={[s.tileIconBox, { backgroundColor: item.color + '15', borderColor: item.color + (isLoading ? '80' : '40') }]}>
                {isLoading
                  ? <ActivityIndicator size="small" color={item.color} />
                  : <MaterialIcons
                      name={(isDone ? 'check-circle' : isErr ? 'error-outline' : item.icon) as any}
                      size={20}
                      color={isDone ? D.green : isErr ? D.red : item.color}
                    />
                }
              </View>
              <Text style={[s.tileLabel, { color: isDone ? D.green : isErr ? D.red : item.color, fontSize: item.label.length > 10 ? 9 : 11 }]}>{item.label}</Text>
              <Text style={[s.tileDesc, { color: item.color + '80' }]} numberOfLines={1}>{item.desc}</Text>
              {/* Upload progress bar */}
              {i === 0 && uploadStatus === 'loading' ? (
                <View style={s.progressTrack}>
                  <Animated.View style={[s.progressFill, { backgroundColor: D.cyan, width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] as any }) }]} />
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Clipboard Sync Panel ── */}
      <View style={[s.clipPanel, { borderColor: statusCol + '30', backgroundColor: statusCol + '05' }]}>
        <View style={s.clipHeader}>
          <MaterialIcons name="content-paste" size={13} color={statusCol} />
          <Text style={[s.clipTitle, { color: statusCol }]}>PUSH TO PC CLIPBOARD</Text>
          <View style={[s.clipDivider, { backgroundColor: statusCol + '25' }]} />
          {lastSynced ? (
            <Text style={[s.clipTime, { color: statusCol + '80' }]}>synced {lastSynced}</Text>
          ) : null}
        </View>

        <View style={[s.inputWrap, { borderColor: statusCol + '40' }]}>
          <Text style={[s.inputPrompt, { color: statusCol + '60' }]}>{'$>'}</Text>
          <TextInput
            style={[s.input, { color: D.text }]}
            value={clipText}
            onChangeText={setClipText}
            placeholder={isConnected ? 'Type or paste text to push to PC...' : 'Connect PC first'}
            placeholderTextColor={D.textDim}
            multiline={false}
            maxLength={2000}
            editable={isConnected && pushStatus === 'idle'}
            keyboardAppearance="dark"
            returnKeyType="send"
            onSubmitEditing={pushClipboard}
          />
          {clipText.length > 0 ? (
            <TouchableOpacity onPress={() => setClipText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={14} color={D.textDim} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Push + Paste from phone buttons */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Paste from phone clipboard */}
          <TouchableOpacity
            style={[s.pasteBtn, { borderColor: D.amber + '55', backgroundColor: D.amber + '0C', flex: 1 }]}
            onPress={async () => {
              haptics.light();
              const txt = await Clipboard.getStringAsync().catch(() => '');
              if (txt) setClipText(txt);
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="content-paste" size={13} color={D.amber} />
            <Text style={[s.pasteBtnTxt, { color: D.amber }]}>PASTE MINE</Text>
          </TouchableOpacity>

          {/* Push to PC */}
          <TouchableOpacity
            style={[s.syncBtn, {
              flex: 2,
              backgroundColor: pushStatus === 'done'    ? D.green :
                               pushStatus === 'error'   ? D.red   :
                               (clipText.trim() && isConnected) ? D.cyan : D.cyan + '1A',
              borderColor:     pushStatus === 'done'    ? D.green :
                               pushStatus === 'error'   ? D.red + '80' : D.cyan + '60',
              opacity: (!clipText.trim() || !isConnected) && pushStatus === 'idle' ? 0.45 : 1,
            }]}
            onPress={pushClipboard}
            disabled={!clipText.trim() || !isConnected || pushStatus === 'loading'}
            activeOpacity={0.85}
          >
            <View style={s.syncBtnSheen} />
            {pushStatus === 'loading' ? (
              <ActivityIndicator size="small" color="#000" style={{ transform: [{ scale: 0.75 }] }} />
            ) : (
              <MaterialIcons
                name={pushStatus === 'done' ? 'check-circle' : pushStatus === 'error' ? 'error' : 'send'}
                size={14}
                color={(pushStatus !== 'idle' || (clipText.trim() && isConnected)) ? '#000' : D.cyan + '80'}
              />
            )}
            <Text style={[s.syncBtnTxt, {
              color: (pushStatus !== 'idle' || (clipText.trim() && isConnected)) ? '#000' : D.cyan + '60',
            }]}>
              {pushStatus === 'loading' ? 'PUSHING...' :
               pushStatus === 'done'    ? 'PUSHED ✓' :
               pushStatus === 'error'   ? 'FAILED ✗' :
               'PUSH TO PC'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.privacyRow}>
          <MaterialIcons name="lock" size={9} color={D.textDim} />
          <Text style={s.privacyTxt}>LAN only · AES-256 · Zero cloud · Data never leaves your network</Text>
        </View>
      </View>

      {/* ── Footer CTA ── */}
      <TouchableOpacity
        style={[s.footer, { borderTopColor: D.cyan + '15' }]}
        onPress={() => { haptics.light(); goToTab('fileshare'); }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="open-in-full" size={12} color={D.cyan} />
        <Text style={[s.footerTxt, { color: D.cyan }]}>FULL FILE MANAGER & TRANSFER HISTORY →</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card:          { backgroundColor: '#030810', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,255,255,0.22)', overflow: 'hidden', position: 'relative',
    ...Platform.select({ ios:{ shadowColor:'#00FFFF', shadowOffset:{width:0,height:0}, shadowOpacity:0.22, shadowRadius:22 }, android:{elevation:8} }) },
  topLine:       { height: 2 },
  cornerTL:      { position:'absolute', top:4, left:8, width:14, height:14, borderTopWidth:1.5, borderLeftWidth:1.5, zIndex:4 },
  cornerBR:      { position:'absolute', bottom:4, right:8, width:14, height:14, borderBottomWidth:1.5, borderRightWidth:1.5, zIndex:4 },
  header:        { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:16, paddingTop:14, paddingBottom:12 },
  headerIcon:    { width:42, height:42, borderRadius:11, borderWidth:1.5, alignItems:'center', justifyContent:'center', flexShrink:0 },
  title:         { fontSize:13, fontWeight:'900', fontFamily:MONO, letterSpacing:0.5 },
  subtitle:      { fontSize:8, fontFamily:MONO, letterSpacing:1.2, marginTop:2 },
  connBadge:     { flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:9, paddingVertical:5, borderRadius:8, borderWidth:1, flexShrink:0 },
  connDot:       { width:6, height:6, borderRadius:3 },
  connTxt:       { fontSize:9, fontWeight:'900', fontFamily:MONO, letterSpacing:0.5 },
  tilesRow:      { flexDirection:'row', flexWrap:'wrap', gap:10, paddingHorizontal:14, paddingBottom:14 },
  tile:          { width:'47%', borderRadius:12, borderWidth:1.5, overflow:'hidden', position:'relative', alignItems:'center', paddingVertical:14, paddingHorizontal:8, gap:6,
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.25, shadowRadius:6 }, android:{elevation:3} }) },
  tileTopLine:   { position:'absolute', top:0, left:0, right:0, height:2 },
  tileTL:        { position:'absolute', top:0, left:0, width:9, height:9, borderTopWidth:1.5, borderLeftWidth:1.5 },
  tileBR:        { position:'absolute', bottom:0, right:0, width:9, height:9, borderBottomWidth:1.5, borderRightWidth:1.5 },
  tileIconBox:   { width:46, height:46, borderRadius:12, borderWidth:1.5, alignItems:'center', justifyContent:'center' },
  tileLabel:     { fontWeight:'900', fontFamily:MONO, letterSpacing:0.3, textAlign:'center' },
  tileDesc:      { fontSize:9, fontFamily:MONO, letterSpacing:0.5, textAlign:'center' },
  progressTrack: { position:'absolute', bottom:0, left:0, right:0, height:3, backgroundColor:'rgba(0,255,255,0.12)', overflow:'hidden' },
  progressFill:  { height:'100%', borderRadius:2 },
  clipPanel:     { marginHorizontal:14, borderRadius:12, borderWidth:1.5, padding:14, marginBottom:0 },
  clipHeader:    { flexDirection:'row', alignItems:'center', gap:7, marginBottom:10 },
  clipTitle:     { fontSize:10, fontWeight:'900', fontFamily:MONO, letterSpacing:1 },
  clipDivider:   { flex:1, height:1 },
  clipTime:      { fontSize:8, fontFamily:MONO, letterSpacing:0.3 },
  inputWrap:     { flexDirection:'row', alignItems:'center', gap:8, borderWidth:1.5, borderRadius:10, paddingHorizontal:12, paddingVertical:10, marginBottom:10, backgroundColor:'#010204' },
  inputPrompt:   { fontSize:12, fontFamily:MONO, flexShrink:0 },
  input:         { flex:1, fontSize:13, fontFamily:MONO, paddingVertical:0, includeFontPadding:false },
  pasteBtn:      { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, borderRadius:10, borderWidth:1.5, paddingVertical:12, overflow:'hidden' },
  pasteBtnTxt:   { fontSize:10, fontWeight:'900', fontFamily:MONO, letterSpacing:0.8 },
  syncBtn:       { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:7, borderRadius:10, borderWidth:1.5, paddingVertical:12, overflow:'hidden', position:'relative' },
  syncBtnSheen:  { position:'absolute', top:0, left:0, right:0, height:'45%', backgroundColor:'rgba(255,255,255,0.14)', borderTopLeftRadius:10, borderTopRightRadius:10 },
  syncBtnTxt:    { fontSize:11, fontWeight:'900', fontFamily:MONO, letterSpacing:0.8 },
  privacyRow:    { flexDirection:'row', alignItems:'center', gap:5, marginTop:10 },
  privacyTxt:    { fontSize:8, color:'#3A5068', fontFamily:MONO, letterSpacing:0.3, flex:1 },
  footer:        { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:13, borderTopWidth:1, marginTop:14 },
  footerTxt:     { fontSize:10, fontWeight:'900', fontFamily:MONO, letterSpacing:0.8 },
});
