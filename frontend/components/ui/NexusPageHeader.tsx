/**
 * NexusPageHeader v6.0 — NEXUS Command Center style page header
 * Per-page themed background art · 3D title effects · Butler-themed text
 * Animated subtitle · Connection status · Particle FX integration
 * SCRIPTS: Python-themed code art · BUTLER: AI neural brain art
 * COSMETIC: animated holo title · TOOLS: color-shift title
 * BUTLER word: custom stylized lettering
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Platform, TouchableOpacity, Animated,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCosmetic } from '@/contexts/CosmeticContext';
import { autoConnectEngine } from '@/services/autoConnectEngine';

const MONO: any = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

interface Props {
  titleMain: string;
  titleAccent: string;
  subtitle?: string;
  rightLabel?: string;
  rightColor?: string;
  rightIcon?: string;
  rightDot?: boolean;
  rightDotColor?: string;
  onRightPress?: () => void;
  isConnected?: boolean;
  version?: string;
}

// ─── PAGE THEME REGISTRY ──────────────────────────────────────
type PageTheme = {
  accentColor: string;
  bgTint: string;
  artType: 'circuit' | 'neural' | 'code' | 'radar' | 'dna' | 'grid' | 'terminal' | 'sigma' | 'orbit';
};

function detectTheme(titleMain: string, titleAccent: string, rightColor?: string): PageTheme {
  const full = (titleMain + titleAccent).toUpperCase();
  if (full.includes('NEXUS') || full.includes('HOME'))    return { accentColor: '#00CCDD', bgTint: '#001820', artType: 'circuit'  };
  if (full.includes('BUTLER') || full.includes('AI'))     return { accentColor: '#4488FF', bgTint: '#000C20', artType: 'neural'   };
  if (full.includes('SCRIPT') || full.includes('LIB'))    return { accentColor: '#4488FF', bgTint: '#000A1A', artType: 'code'     };
  if (full.includes('TERMINAL') || full.includes('TERM')) return { accentColor: '#44FF22', bgTint: '#001200', artType: 'terminal' };
  if (full.includes('KNOWLEDGE'))                         return { accentColor: '#FF8C00', bgTint: '#130800', artType: 'dna'      };
  if (full.includes('TOOLS') || full.includes('FILE'))    return { accentColor: '#00CCDD', bgTint: '#001820', artType: 'radar'    };
  if (full.includes('COSMETIC') || full.includes('PACK')) return { accentColor: '#FF6EB4', bgTint: '#140010', artType: 'orbit'    };
  if (full.includes('CONFIG') || full.includes('SYSTEM')) return { accentColor: '#CC7755', bgTint: '#100800', artType: 'grid'    };
  if (full.includes('SIGMA'))                             return { accentColor: '#CC33FF', bgTint: '#0A0015', artType: 'sigma'   };
  return { accentColor: rightColor || '#00CCDD', bgTint: '#001820', artType: 'circuit' };
}

// ─── BACKGROUND ART COMPONENTS ───────────────────────────────

/** Circuit traces — HOME/NEXUS — static for performance */
function CircuitArt({ color }: { color: string }) {
  return (
    <View style={art.wrap} pointerEvents="none">
      {[18, 34, 52].map((t, i) => (
        <View key={t} style={[art.hLine, { top: t, right: 0, width: [90, 140, 70][i], backgroundColor: color, opacity: 0.06 }]} />
      ))}
      {[20, 80, 150, 210].map((l, i) => (
        <View key={l} style={[art.vLine, { right: l, height: [38, 22, 44, 18][i], top: [10, 28, 8, 36][i], backgroundColor: color, opacity: 0.05 }]} />
      ))}
      {[[20, 18], [80, 34], [150, 18], [210, 52]].map(([r, t], i) => (
        <View key={i} style={[art.node, { right: r, top: t - 3, backgroundColor: color, opacity: 0.3 }]} />
      ))}
      <View style={[art.cornerTR, { borderColor: color + '30' }]} />
      <View style={[art.cornerBR, { borderColor: color + '20' }]} />
    </View>
  );
}

/** AI neural network — static for performance */
function NeuralArt({ color }: { color: string }) {
  const nodes = [[10,20],[50,12],[90,28],[130,16],[60,44],[110,48]];
  const edges = [[0,1],[1,2],[2,3],[0,4],[1,4],[4,5],[3,5]];
  const aiLabels = ['BUTLER','OLLAMA','KB','NEXUS'];
  return (
    <View style={art.wrap} pointerEvents="none">
      {edges.map(([a, b], i) => {
        const [ax, ay] = nodes[a]; const [bx, by] = nodes[b];
        const len = Math.sqrt((bx-ax)**2+(by-ay)**2);
        const angle = Math.atan2(by-ay, bx-ax)*180/Math.PI;
        return (
          <View key={i} style={{ position:'absolute', right: 260 - Math.min(ax,bx) - len/2 - 10, top: Math.min(ay,by) + 8,
            width: len, height: 1.5, backgroundColor: color, opacity: 0.10, transform:[{rotate:`${angle}deg`}] }} />
        );
      })}
      {nodes.map(([x, y], i) => (
        <View key={i} style={[art.neuronNode, { right: 260 - x, top: y, borderColor: color + '80', opacity: 0.5 }]}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
        </View>
      ))}
      {aiLabels.map((lbl, i) => (
        <View key={lbl} style={{ position:'absolute', right: 48 + i * 38, top: 52, opacity: 0.45 }}>
          <View style={{ borderWidth:1, borderColor:color+'35', borderRadius:3, paddingHorizontal:4, paddingVertical:1, backgroundColor:color+'10' }}>
            <Text style={{ fontSize:5.5, color:color+'90', fontFamily:MONO, fontWeight:'900', letterSpacing:0.4 }}>{lbl}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Python-themed code editor — static for performance */
function CodeArt({ color }: { color: string }) {
  const pythonLines = [
    { col: '#CC88FF', w: 90,  indent: 0 },
    { col: color,     w: 115, indent: 0 },
    { col: '#44AAFF', w: 148, indent: 14 },
    { col: '#44FF88', w: 130, indent: 14 },
    { col: '#888888', w: 80,  indent: 0 },
  ];
  const pyKeywords = ['def', 'import', 'for', 'if', 'print'];
  return (
    <View style={art.wrap} pointerEvents="none">
      <View style={{ position:'absolute', right:8, top:5, width:210, height:62, borderRadius:5, borderWidth:1.5, borderColor:color+'28', backgroundColor:color+'05', overflow:'hidden' }}>
        <View style={{ height:11, backgroundColor:color+'12', borderBottomWidth:1, borderBottomColor:color+'18',
          flexDirection:'row', alignItems:'center', paddingHorizontal:4, gap:2.5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map((c,i)=>(
            <View key={i} style={{width:5,height:5,borderRadius:2.5,backgroundColor:c,opacity:0.7}} />
          ))}
          <Text style={{fontSize:5.5,color:color+'55',fontFamily:MONO,marginLeft:6,letterSpacing:0.3}}>SCRIPT LIB · NEXUS v4.0</Text>
        </View>
        {pythonLines.map((line, i) => (
          <View key={i} style={{ flexDirection:'row', paddingHorizontal:4, paddingTop:2, alignItems:'center' }}>
            <Text style={{ fontSize:6, color:'#FFFFFF18', fontFamily:MONO, width:14, textAlign:'right', marginRight:5 }}>{i+1}</Text>
            <View style={{ width: line.indent }} />
            <View style={{ width: line.w, height:6, backgroundColor:line.col, opacity:0.18, borderRadius:1 }} />
          </View>
        ))}
      </View>
      <View style={{ position:'absolute', right:226, top:8, gap:3.5 }}>
        {pyKeywords.map(kw => (
          <View key={kw} style={{ borderWidth:1, borderColor:color+'28', borderRadius:3, paddingHorizontal:4, paddingVertical:1, backgroundColor:color+'08' }}>
            <Text style={{ fontSize:5.5, color:color+'88', fontFamily:MONO, fontWeight:'900' }}>{kw}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Terminal art — static for performance */
function TerminalArt({ color }: { color: string }) {
  const cmds = ['> butler status', '> scan --network', '> exec script.py'];
  return (
    <View style={art.wrap} pointerEvents="none">
      <View style={{ position:'absolute', right:8, top:4, width:200, height:56, borderWidth:1, borderColor:color+'20', borderRadius:4, overflow:'hidden', backgroundColor:color+'04' }}>
        <View style={{ height:10, backgroundColor:color+'08', borderBottomWidth:1, borderBottomColor:color+'15',
          flexDirection:'row', alignItems:'center', paddingHorizontal:4, gap:2 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map((c,i)=><View key={i} style={{width:4,height:4,borderRadius:2,backgroundColor:c,opacity:0.5}} />)}
          <Text style={{fontSize:5,color:color+'60',fontFamily:MONO,marginLeft:4}}>nexus@terminal:~$</Text>
        </View>
        {cmds.map((cmd, i) => (
          <View key={i} style={{ flexDirection:'row', paddingHorizontal:5, paddingTop:2 }}>
            <Text style={{ fontSize:5.5, color: color + (i===2?'80':'40'), fontFamily:MONO }}>{cmd}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** DNA helix — static for performance */
function DNAArt({ color }: { color: string }) {
  const W = 40;
  const helixPoints = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 11) * Math.PI * 3;
    return { y: i * 5, x1: Math.sin(angle) * W / 2 + W / 2, x2: Math.sin(angle + Math.PI) * W / 2 + W / 2, bridge: i % 3 === 0 };
  });
  return (
    <View style={art.wrap} pointerEvents="none">
      {helixPoints.map((pt, i) => (
        <React.Fragment key={i}>
          <View style={{ position:'absolute', right: 60 + pt.x1, top: 8 + pt.y, width:5, height:5, borderRadius:3, backgroundColor:color, opacity:0.35 }} />
          <View style={{ position:'absolute', right: 60 + pt.x2, top: 8 + pt.y, width:4, height:4, borderRadius:2, backgroundColor:'#FF8C00', opacity:0.30 }} />
          {pt.bridge ? (
            <View style={{ position:'absolute', right: 60 + Math.min(pt.x1,pt.x2) + 3, top: 8 + pt.y + 1, width: Math.abs(pt.x1-pt.x2) - 4, height:1.5, backgroundColor:color+'30' }} />
          ) : null}
        </React.Fragment>
      ))}
      <View style={{ position:'absolute', right:12, top:10, opacity:0.10 }}>
        <MaterialCommunityIcons name="brain" size={36} color={color} />
      </View>
    </View>
  );
}

/** Radar — static for performance */
function RadarArt({ color }: { color: string }) {
  return (
    <View style={art.wrap} pointerEvents="none">
      {[36, 26, 16].map((r, i) => (
        <View key={i} style={{ position:'absolute', right: 56-r, top: 40-r, width:r*2, height:r*2,
          borderRadius:r, borderWidth:1, borderColor:color, opacity:0.08+i*0.03 }} />
      ))}
      <View style={{ position:'absolute', right:20, top:38, width:74, height:1, backgroundColor:color, opacity:0.06 }} />
      <View style={{ position:'absolute', right:56, top:4, width:1, height:72, backgroundColor:color, opacity:0.06 }} />
      <View style={{ position:'absolute', right:10, top:8, opacity:0.08 }}>
        <MaterialIcons name="build" size={28} color={color} />
      </View>
      <View style={{ position:'absolute', right: 120, top: 12, opacity: 0.12, flexDirection:'row', gap:6 }}>
        <MaterialIcons name="settings" size={14} color={color} />
        <MaterialIcons name="code"     size={14} color={color} />
        <MaterialIcons name="folder"   size={14} color={color} />
      </View>
    </View>
  );
}

/** Orbit art — static for performance */
function OrbitArt({ color }: { color: string }) {
  const orbitColors = ['#FF6EB4','#FF88FF','#88FFFF','#FFFF88'];
  return (
    <View style={art.wrap} pointerEvents="none">
      <View style={{ position:'absolute', right:56, top:24, width:14, height:14, borderRadius:7, backgroundColor:'#FF6EB4', opacity:0.5 }} />
      <View style={{ position:'absolute', right:24, top:4, width:48, height:48, borderRadius:24, borderWidth:1.5, borderColor:color+'40' }}>
        <View style={{ position:'absolute', top:-4, left:'50%', width:8, height:8, borderRadius:4, backgroundColor:orbitColors[1], marginLeft:-4 }} />
      </View>
      {[{r:140,t:8},{r:180,t:20},{r:160,t:40}].map((pos,i) => (
        <View key={i} style={{ position:'absolute', right:pos.r, top:pos.t, width:5, height:5, borderRadius:1,
          backgroundColor:orbitColors[i%orbitColors.length], opacity:0.4, transform:[{rotate:'45deg'}] }} />
      ))}
      <View style={{ position:'absolute', right:150, top:10, opacity:0.08 }}>
        <MaterialIcons name="palette" size={26} color={color} />
      </View>
    </View>
  );
}

/** Hex grid — static for performance */
function GridArt({ color }: { color: string }) {
  const hexes = [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2]];
  const HEX_W = 24; const HEX_H = 20;
  return (
    <View style={art.wrap} pointerEvents="none">
      {hexes.map(([col, row], i) => {
        const x = col * HEX_W + (row % 2 === 1 ? HEX_W / 2 : 0);
        const y = row * HEX_H * 0.75;
        const isActive = [1, 4, 6].includes(i);
        return (
          <View key={i} style={[art.hexCell, { right: 30 + x, top: 4 + y,
            borderColor: isActive ? color : color + '25',
            backgroundColor: isActive ? color + '15' : 'transparent',
            opacity: isActive ? 0.5 : 0.15 }]} />
        );
      })}
      <View style={{ position:'absolute', right:8, top:8, opacity:0.08 }}>
        <MaterialIcons name="settings" size={30} color={color} />
      </View>
    </View>
  );
}

/** SIGMA-NET — static for performance */
function SigmaArt({ color }: { color: string }) {
  const nodes = [{x:10,y:20,label:'MOB'},{x:80,y:10,label:'SIGMA'},{x:150,y:20,label:'PC'},{x:220,y:8,label:'WEB'}];
  return (
    <View style={art.wrap} pointerEvents="none">
      {nodes.map(({ x, y, label }, i) => (
        <React.Fragment key={i}>
          <View style={{ position:'absolute', right: 20 + x, top: y, width:8, height:8,
            borderRadius:4, backgroundColor:color, borderWidth:1, borderColor:color+'80', opacity:0.5 }} />
          <Text style={{ position:'absolute', right: 16 + x, top: y + 10, fontSize:5, color:color+'60', fontFamily:MONO }}>{label}</Text>
        </React.Fragment>
      ))}
      {nodes.slice(0,-1).map((n,i) => {
        const next = nodes[i+1];
        const len = Math.sqrt((next.x-n.x)**2+(next.y-n.y)**2);
        const angle = Math.atan2(next.y-n.y, next.x-n.x)*180/Math.PI;
        return (
          <View key={`e${i}`} style={{ position:'absolute', right: 24 + n.x, top: n.y + 3,
            width:len, height:1, backgroundColor:color, opacity:0.15, transform:[{rotate:`${angle}deg`}] }} />
        );
      })}
    </View>
  );
}

const art = StyleSheet.create({
  wrap:      { position:'absolute', top:0, right:0, bottom:0, left:0, overflow:'hidden' },
  hLine:     { position:'absolute', height:1.5, borderRadius:1 },
  vLine:     { position:'absolute', width:1.5, borderRadius:1 },
  node:      { position:'absolute', width:5, height:5, borderRadius:3 },
  packet:    { position:'absolute', width:6, height:6, borderRadius:3 },
  neuronNode:{ position:'absolute', width:12, height:12, borderRadius:6, borderWidth:1.5, alignItems:'center', justifyContent:'center' },
  cornerTR:  { position:'absolute', top:0, right:0, width:14, height:14, borderTopWidth:1.5, borderRightWidth:1.5 },
  cornerBR:  { position:'absolute', bottom:0, right:0, width:14, height:14, borderBottomWidth:1.5, borderRightWidth:1.5 },
  hexCell:   { position:'absolute', width:20, height:16, borderRadius:3, borderWidth:1 },
});

// ─── HOLO TITLE ACCENT — cosmetics page ──────────────────────
function HoloTitleAccent({ text }: { text: string }) {
  return <Text style={[s.titleAccent, { color: '#FF6EB4' }]}>{text}</Text>;
}

// ─── TOOL TITLE ACCENT — tools hub page ─────────────────────
function ToolTitleAccent({ text, color }: { text: string; color: string }) {
  return <Text style={[s.titleAccent, { color }]}>{text}</Text>;
}

// ─── BUTLER THEMED ACCENT — special B·U·T·L·E·R lettering ───
function ButlerAccent({ text, color }: { text: string; color: string }) {
  return <Text style={[s.titleAccent, { color }]}>{text}</Text>;
}

// ─── SIGNAL STRENGTH BARS ──────────────────────────────────────
// Reads latency from autoConnectEngine every 30s — no animations, static bars.
function SignalBars({ isConnected }: { isConnected: boolean }) {
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {                                             
    const readLatency = () => {
      const conn = autoConnectEngine.getCurrentConnection();
      if (!conn.connected) { setLatencyMs(null); return; }
      // Pull last known latency from engine event (stored on the engine's lastNotify)
      // We derive it by doing a silent quickPing if connected
      import('@/services/serverConnection').then(({ serverConnection }) => {
        const ip   = serverConnection.getIP();
        const port = serverConnection.getPort();
        if (!ip || !port) { setLatencyMs(null); return; }
        serverConnection.quickPing(ip, port)
          .then(ms => setLatencyMs(ms))
          .catch(() => setLatencyMs(null));
      });
    };
    if (isConnected) readLatency();
    else setLatencyMs(null);
    const t = setInterval(() => {
      if (isConnected) readLatency();
      else setLatencyMs(null);
    }, 30_000);
    return () => clearInterval(t);
  }, [isConnected]);

  // Color thresholds: green <50ms, amber 50-200ms, red >200ms or null
  const barColor = !isConnected || latencyMs === null
    ? '#444444'
    : latencyMs < 50
    ? '#44FF88'
    : latencyMs < 200
    ? '#FF8C00'
    : '#FF4444';

  // Number of filled bars: 3 = great, 2 = ok, 1 = poor, 0 = offline
  const filledBars = !isConnected || latencyMs === null
    ? 0
    : latencyMs < 50
    ? 3
    : latencyMs < 200
    ? 2
    : 1;

  const BAR_HEIGHTS = [5, 8, 11]; // ascending heights for 3 bars

  return (
    <View style={sgb.wrap}>
      {BAR_HEIGHTS.map((h, i) => (
        <View
          key={i}
          style={[
            sgb.bar,
            { height: h, backgroundColor: i < filledBars ? barColor : '#333333' },
          ]}
        />
      ))}
    </View>
  );
}
const sgb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginLeft: 4 },
  bar:  { width: 4, borderRadius: 1 },
});

// ─── ANIMATED SUBTITLE ────────────────────────────────────────
function AnimatedSubtitle({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginTop:3 }}>
      <View style={{ width:5, height:5, borderRadius:3, backgroundColor:color, opacity:0.6 }} />
      <Text style={[sub.txt, { color: color + 'AA' }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}
const sub = StyleSheet.create({
  txt: { fontSize: 10, fontFamily: MONO, letterSpacing: 0.5, flex: 1 },
});

// ─── 3D TITLE ROW — depth shadow effect ─────────────────────
function TitleWith3D({ main, accent, color, artType, version }: {
  main: string; accent: string; color: string;
  artType: PageTheme['artType']; version?: string;
}) {

  const renderAccent = () => {
    if (artType === 'orbit')  return <HoloTitleAccent text={accent} />;
    if (artType === 'radar')  return <ToolTitleAccent text={accent} color={color} />;
    if (artType === 'neural') return <ButlerAccent text={accent} color={color} />;
    return (
      <Text style={[s.titleAccent, { color,
        ...Platform.select({ ios: { textShadowColor: color, textShadowOffset:{width:0,height:0}, textShadowRadius:12 }, android:{} }),
      }]}>{accent}</Text>
    );
  };

  return (
    <View style={s.titleRow}>
      <Text style={s.titleMain}>{main}</Text>
      {renderAccent()}
      {version ? <Text style={s.version}>{version}</Text> : null}
    </View>
  );
}

// ─── MAIN HEADER ──────────────────────────────────────────────
export default function NexusPageHeader({
  titleMain, titleAccent, subtitle, rightLabel,
  rightColor = '#00CCDD', rightIcon, rightDot, rightDotColor,
  onRightPress, isConnected, version,
}: Props) {
  const insets    = useSafeAreaInsets();
  const { T, isPrimeActive } = useCosmetic();
  const connColor = isConnected ? '#44FF88' : '#FF4444';
  const theme     = detectTheme(titleMain, titleAccent, rightColor);
  // When a paid pack is active, override the accent color with the pack's primary —
  // this makes the entire app's headers, art, dividers, and glow lines change color.
  const ac        = isPrimeActive ? T.primary : theme.accentColor;
  const bgTint    = isPrimeActive ? T.bg : theme.bgTint;

  const entryY    = useRef(new Animated.Value(-8)).current;
  const entryOp   = useRef(new Animated.Value(0)).current;
  const pulse     = useRef(new Animated.Value(0.5)).current;
  const connPulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(entryY, { toValue: 0, tension: 200, friction: 14, useNativeDriver: false }),
      Animated.timing(entryOp, { toValue: 1, duration: 250, useNativeDriver: false }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,   duration: 1400, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.3, duration: 1400, useNativeDriver: false }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(connPulse, { toValue: 1,   duration: 900, useNativeDriver: false }),
      Animated.timing(connPulse, { toValue: 0.2, duration: 900, useNativeDriver: false }),
    ])).start();
  }, []);

  const borderGlow = pulse.interpolate({ inputRange:[0.3,1], outputRange:[ac+'20', ac+'60'] });

  const renderArt = () => {
    switch (theme.artType) {
      case 'neural':   return <NeuralArt   color={ac} />;
      case 'code':     return <CodeArt     color={ac} />;
      case 'terminal': return <TerminalArt color={ac} />;
      case 'dna':      return <DNAArt      color={ac} />;
      case 'radar':    return <RadarArt    color={ac} />;
      case 'orbit':    return <OrbitArt    color={ac} />;
      case 'grid':     return <GridArt     color={ac} />;
      case 'sigma':    return <SigmaArt    color={ac} />;
      default:         return <CircuitArt  color={ac} />;
    }
  };

  return (
    <Animated.View style={[s.wrap, { paddingTop: insets.top, backgroundColor: bgTint, opacity: entryOp, transform: [{ translateY: entryY }] }]}>
      {renderArt()}

      <Animated.View style={[s.leftBar, { backgroundColor: ac }]} />
      <Animated.View style={[s.bottomBorder, { borderBottomColor: borderGlow }]} pointerEvents="none" />
      <Animated.View style={[s.hudTL, { borderColor: ac + '50', opacity: pulse }]} pointerEvents="none" />
      <Animated.View style={[s.hudBR, { borderColor: ac + '30', opacity: pulse }]} pointerEvents="none" />

      <View style={s.inner}>
        <View style={{ flex: 1 }}>
          <TitleWith3D
            main={titleMain}
            accent={titleAccent}
            color={ac}
            artType={theme.artType}
            version={version}
          />

          {subtitle ? <AnimatedSubtitle text={subtitle} color={ac} /> : null}

          {isConnected !== undefined ? (
            <View style={s.connRow}>
              <Animated.View style={[s.connDot, { backgroundColor: connColor, opacity: connPulse }]} />
              <Text style={[s.connTxt, { color: connColor }]}>
                {isConnected ? 'SERVER CONNECTED' : 'NO SERVER'}
              </Text>
              <SignalBars isConnected={!!isConnected} />
            </View>
          ) : null}
        </View>

        {rightLabel ? (
          <TouchableOpacity
            onPress={onRightPress}
            activeOpacity={onRightPress ? 0.75 : 1}
            style={[s.rightBadge, { backgroundColor: ac + '18', borderColor: ac + '70' }]}
          >
            {rightDot ? <View style={[s.rightDot, { backgroundColor: rightDotColor || ac }]} /> : null}
            {rightIcon ? <MaterialIcons name={rightIcon as any} size={12} color={ac} /> : null}
            <Text style={[s.rightLabel, { color: ac }]}>{rightLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Animated.View style={[s.bottomStrip, { backgroundColor: ac, opacity: pulse.interpolate({inputRange:[0.3,1],outputRange:[0.15,0.4]}) }]} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'relative', overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:8 }, android: { elevation: 6 } }),
  },
  leftBar:      { position:'absolute', left:0, top:0, bottom:0, width:3, zIndex:10 },
  bottomBorder: { position:'absolute', bottom:0, left:0, right:0, borderBottomWidth:1.5, zIndex:10 },
  hudTL: { position:'absolute', top:4,  left:6,  width:12, height:12, borderTopWidth:1.5,    borderLeftWidth:1.5,  zIndex:5 },
  hudBR: { position:'absolute', bottom:6, right:6, width:10, height:10, borderBottomWidth:1.5, borderRightWidth:1.5, zIndex:5 },
  inner: { flexDirection:'row', alignItems:'center', paddingLeft:18, paddingRight:14, paddingTop:14, paddingBottom:10, gap:12, zIndex:2 },
  titleRow:   { flexDirection:'row', alignItems:'flex-end', flexWrap:'wrap' },
  titleMain:  { fontSize:27, fontWeight:'900', color:'#FFFFFF', fontFamily:MONO, letterSpacing:0.5, lineHeight:33,
    ...Platform.select({ ios: { textShadowColor:'rgba(0,0,0,0.6)', textShadowOffset:{width:0,height:2}, textShadowRadius:6 }, android:{} }) },
  titleAccent:{ fontSize:27, fontWeight:'900', fontFamily:MONO, letterSpacing:0.5, lineHeight:33 },
  version:    { fontSize:11, color:'#4A6070', fontFamily:MONO, alignSelf:'flex-end', marginLeft:4, marginBottom:3 },
  connRow:    { flexDirection:'row', alignItems:'center', gap:5, marginTop:4 },
  connDot:    { width:6, height:6, borderRadius:3 },
  connTxt:    { fontSize:9, fontFamily:MONO, fontWeight:'700', letterSpacing:0.8 },
  rightBadge: { flexDirection:'row', alignItems:'center', gap:5, borderWidth:1.5, borderRadius:100, paddingHorizontal:12, paddingVertical:8, flexShrink:0 },
  rightDot:   { width:6, height:6, borderRadius:3 },
  rightLabel: { fontSize:11, fontWeight:'900', fontFamily:MONO, letterSpacing:0.5 },
  bottomStrip:{ height:2, width:'100%', zIndex:2 },
});
