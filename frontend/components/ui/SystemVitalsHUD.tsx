/**
 * SystemVitalsHUD — Big Visual Design #1
 * Animated radar + metric bars panel for the home page
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const C = {
  teal:   '#00F5FF',
  cyan:   '#FF2A1F',
  blue:   '#3377FF',
  green:  '#00FF88',
  amber:  '#FFC400',
  purple: '#FFC400',
  textDim:'#232730',
};

interface Props {
  isConnected: boolean;
  quickStats: { cpu: string; ram: string; disk: string };
  pingMs: number | null;
  ollamaOnline: boolean | null;
}

export default function SystemVitalsHUD({ isConnected, quickStats, pingMs, ollamaOnline }: Props) {
  const connCol  = isConnected ? C.green : C.teal;
  const scanRot  = useRef(new Animated.Value(0)).current;
  const ringPulse= useRef(new Animated.Value(0.3)).current;
  const glowPulse= useRef(new Animated.Value(0.5)).current;
  const barAnim1 = useRef(new Animated.Value(0)).current;
  const barAnim2 = useRef(new Animated.Value(0)).current;
  const barAnim3 = useRef(new Animated.Value(0)).current;
  const tickPulse= useRef(new Animated.Value(0.4)).current;

  const cpu  = parseInt(quickStats.cpu  || '0', 10) || 0;
  const ram  = parseInt(quickStats.ram  || '0', 10) || 0;
  const disk = parseInt(quickStats.disk || '0', 10) || 0;

  useEffect(() => {
    Animated.loop(Animated.timing(scanRot, { toValue: 1, duration: 4800, useNativeDriver: false })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ringPulse, { toValue: 0.85, duration: 1600, useNativeDriver: false }),
      Animated.timing(ringPulse, { toValue: 0.12, duration: 1600, useNativeDriver: false }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 1,   duration: 900, useNativeDriver: false }),
      Animated.timing(glowPulse, { toValue: 0.3, duration: 900, useNativeDriver: false }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(tickPulse, { toValue: 1,   duration: 600, useNativeDriver: false }),
      Animated.timing(tickPulse, { toValue: 0.3, duration: 600, useNativeDriver: false }),
    ])).start();
  }, []);

  useEffect(() => {
    Animated.timing(barAnim1, { toValue: isConnected ? cpu  / 100 : 0.05, duration: 1200, useNativeDriver: false }).start();
    Animated.timing(barAnim2, { toValue: isConnected ? ram  / 100 : 0.05, duration: 1400, useNativeDriver: false }).start();
    Animated.timing(barAnim3, { toValue: isConnected ? disk / 100 : 0.05, duration: 1600, useNativeDriver: false }).start();
  }, [isConnected, cpu, ram, disk]);

  const radarDeg = scanRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const metrics = [
    { label: 'CPU',  val: isConnected ? quickStats.cpu  : '--', bar: barAnim1, col: C.teal,  icon: 'memory'     as const },
    { label: 'RAM',  val: isConnected ? quickStats.ram  : '--', bar: barAnim2, col: C.cyan,  icon: 'storage'    as const },
    { label: 'DISK', val: isConnected ? quickStats.disk : '--', bar: barAnim3, col: C.blue,  icon: 'save'       as const },
    { label: 'PING', val: pingMs ? `${pingMs}ms` : '--',         bar: new Animated.Value(pingMs ? Math.min(1, pingMs / 200) : 0.05), col: C.green, icon: 'wifi' as const },
  ];

  const statusItems = [
    { label: 'SERVER', active: isConnected,   col: connCol },
    { label: 'OLLAMA', active: !!ollamaOnline, col: ollamaOnline ? C.green : '#232730' },
    { label: 'SCRIPT', active: isConnected,   col: isConnected ? C.amber : '#232730' },
    { label: 'AI',     active: !!ollamaOnline, col: ollamaOnline ? C.purple : '#232730' },
  ];

  // Radar blip positions
  const blips = [
    { r: 18, angle: 40,  sz: 5, col: connCol, pulse: true },
    { r: 32, angle: 130, sz: 4, col: C.amber,  pulse: false },
    { r: 24, angle: 220, sz: 4, col: C.cyan,   pulse: false },
    { r: 36, angle: 310, sz: 3, col: C.green,  pulse: true },
  ];

  return (
    <View style={s.wrap}>
      {/* Faint circuit trace background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[10,30,55,80,105,130].map((t,i)=>(
          <View key={i} style={{ position:'absolute', left:0, right:0, top:t, height:1, backgroundColor:connCol+'0A' }} />
        ))}
        {[40,100,170,240,310].map((l,i)=>(
          <View key={`v${i}`} style={{ position:'absolute', left:l, top:0, bottom:0, width:1, backgroundColor:connCol+'07' }} />
        ))}
      </View>

      {/* HUD corner brackets */}
      {([
        { top:0,  left:0,  borderTopWidth:2,    borderLeftWidth:2    },
        { top:0,  right:0, borderTopWidth:2,    borderRightWidth:2   },
        { bottom:0, left:0,  borderBottomWidth:2, borderLeftWidth:2  },
        { bottom:0, right:0, borderBottomWidth:2, borderRightWidth:2 },
      ] as any[]).map((c,i)=>(
        <Animated.View key={i} pointerEvents="none" style={[
          { position:'absolute', width:12, height:12, borderColor:connCol+'CC', opacity:glowPulse },
          c.top    !== undefined ? { top:    c.top    } : { bottom: c.bottom },
          c.left   !== undefined ? { left:   c.left   } : { right:  c.right  },
          { borderTopWidth:   c.borderTopWidth   || 0 },
          { borderLeftWidth:  c.borderLeftWidth  || 0 },
          { borderBottomWidth:c.borderBottomWidth|| 0 },
          { borderRightWidth: c.borderRightWidth || 0 },
        ]} />
      ))}

      {/* Header */}
      <View style={s.header}>
        <Animated.View style={{ width:6, height:6, borderRadius:3, backgroundColor:connCol, opacity:glowPulse }} />
        <Text style={[s.headerTxt, { color:connCol }]}>◈ SYSTEM VITALS MONITOR</Text>
        <View style={{ flex:1, height:1, backgroundColor:connCol+'30' }} />
        <Text style={{ fontSize:6.5, color:connCol+'88', fontFamily:MONO }}>
          {isConnected ? 'LIVE' : 'STANDBY'}
        </Text>
      </View>

      {/* Body: Radar | Metrics | Ticks */}
      <View style={s.body}>

        {/* ── RADAR ── */}
        <View style={s.radarWrap}>
          {[88,68,48,28].map((sz,i)=>(
            <Animated.View key={i} style={[
              s.radarRing,
              { width:sz, height:sz, borderRadius:sz/2,
                borderColor:connCol+(i===0?'25':i===1?'18':i===2?'12':'09'),
                opacity:ringPulse },
            ]} />
          ))}
          {/* Crosshairs */}
          <View pointerEvents="none" style={[s.crossH, { backgroundColor:connCol+'20' }]} />
          <View pointerEvents="none" style={[s.crossV, { backgroundColor:connCol+'20' }]} />
          {/* Rotating sweep */}
          <Animated.View style={[s.scanBeam, {
            transform:[{rotate:radarDeg}],
            borderTopColor:connCol+'55',
            borderRightColor:connCol+'00',
            borderBottomColor:connCol+'00',
            borderLeftColor:connCol+'00',
          }]} />
          {/* Blips */}
          {blips.map(({ r, angle, sz, col, pulse },i)=>{
            const rad = (angle * Math.PI) / 180;
            const bx = 44 + r * Math.cos(rad) - sz/2;
            const by = 44 + r * Math.sin(rad) - sz/2;
            return (
              <Animated.View key={i} style={[
                { position:'absolute', left:bx, top:by, width:sz, height:sz, borderRadius:sz/2, backgroundColor:col },
                pulse ? { opacity:glowPulse } : { opacity:0.75 },
                Platform.OS==='ios' ? { shadowColor:col, shadowOffset:{width:0,height:0}, shadowOpacity:0.9, shadowRadius:5 } : {},
              ]} />
            );
          })}
          {/* Center hub */}
          <View style={[s.centerHub, { borderColor:connCol }]}>
            <Animated.View style={{ width:8, height:8, borderRadius:4, backgroundColor:connCol, opacity:glowPulse }} />
          </View>
          {/* Radar label */}
          <Text style={[s.radarLabel, { color:connCol+'99' }]}>RADAR</Text>
        </View>

        {/* ── METRICS ── */}
        <View style={s.metricsCol}>
          {metrics.map(({ label, val, bar, col, icon })=>(
            <View key={label} style={s.metricRow}>
              <View style={[s.metricIcon, { borderColor:col+'50', backgroundColor:col+'12' }]}>
                <MaterialIcons name={icon} size={10} color={col} />
              </View>
              <View style={{ flex:1, gap:2 }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                  <Text style={{ fontSize:7, fontWeight:'900', color:col+'AA', fontFamily:MONO, letterSpacing:0.5 }}>{label}</Text>
                  <Text style={{ fontSize:9,  fontWeight:'900', color:col, fontFamily:MONO }}>{val}</Text>
                </View>
                <View style={s.barTrack}>
                  <Animated.View style={[s.barFill, { backgroundColor:col, width: bar.interpolate({inputRange:[0,1],outputRange:['0%','100%']}) }]} />
                  {[0.25,0.5,0.75].map((f,i)=>(
                    <View key={i} pointerEvents="none" style={{ position:'absolute', left:`${f*100}%`, top:0, bottom:0, width:1, backgroundColor:'rgba(0,0,0,0.5)' }} />
                  ))}
                </View>
              </View>
            </View>
          ))}

          {/* Status row */}
          <View style={s.statusRow}>
            {statusItems.map(({ label, active, col })=>(
              <View key={label} style={s.statusItem}>
                <Animated.View style={[s.statusDot, { backgroundColor:col },
                  active ? { opacity:glowPulse } : { opacity:0.25 }]} />
                <Text style={{ fontSize:5.5, color:col, fontFamily:MONO, letterSpacing:0.4 }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── TICK STRIP ── */}
        <View style={s.tickStrip}>
          {Array.from({length:10}).map((_,i)=>(
            <Animated.View key={i} style={[
              s.tick,
              { backgroundColor:connCol, width: i%3===0 ? 10 : 5 },
              { opacity: i%3===0 ? glowPulse : tickPulse },
            ]} />
          ))}
        </View>
      </View>

      {/* Data bus footer */}
      <View style={s.dataBus}>
        <View style={{ flex:1, height:1, backgroundColor:connCol+'25' }} />
        {Array.from({length:12}).map((_,i)=>(
          <Animated.View key={i} style={{
            width:i%3===0?8:4, height:4, borderRadius:1,
            backgroundColor:i%4===0?connCol:i%4===1?C.amber:i%4===2?C.cyan:C.purple,
            opacity:i%2===0?glowPulse:tickPulse,
          }} />
        ))}
        <View style={{ flex:1, height:1, backgroundColor:connCol+'25' }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderWidth: 1.5, borderRadius: 10,
    backgroundColor: 'rgba(5,5,6,0.97)',
    borderColor: '#FF2A1F50', overflow: 'hidden', position: 'relative',
    ...Platform.select({
      ios: { shadowColor:'#FF2A1F', shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:14 },
      android: { elevation: 7 },
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingTop: 9, paddingBottom: 7,
    borderBottomWidth: 1, borderBottomColor: '#FF2A1F18',
  },
  headerTxt: { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingTop: 14 },
  radarWrap: {
    width: 90, height: 90, position: 'relative',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  radarRing: { position: 'absolute', borderWidth: 1 },
  crossH:    { position: 'absolute', left: 0, right: 0, height: 1, top: 44 },
  crossV:    { position: 'absolute', top: 0, bottom: 0, width: 1, left: 44 },
  scanBeam: {
    position: 'absolute', width: 0, height: 0, borderWidth: 44,
    borderStyle: 'solid', top: 0, left: 0,
  },
  centerHub: {
    position: 'absolute', width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(5,5,6,0.97)',
  },
  radarLabel: {
    position: 'absolute', bottom: -13, fontSize: 6,
    fontWeight: '900', fontFamily: MONO, letterSpacing: 1,
  },
  metricsCol: { flex: 1, gap: 6 },
  metricRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metricIcon: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  barTrack: {
    height: 5, backgroundColor: '#FF2A1F12',
    borderRadius: 2, overflow: 'hidden', position: 'relative',
  },
  barFill:   { height: '100%', borderRadius: 2 },
  statusRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' },
  statusItem:{ flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  tickStrip: { width: 14, gap: 3, alignItems: 'flex-end', paddingVertical: 4, flexShrink: 0 },
  tick:      { height: 2.5, borderRadius: 1 },
  dataBus: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: '#FF2A1F15',
  },
});
