/**
 * LIVE WIDGET STUDIO v4
 * Write React Native code → RUN & PREVIEW → choose placement → PIN permanently
 *
 * Sandbox APIs (all available in widget code):
 *   React, View, Text, TouchableOpacity, Pressable, TextInput, Switch, ScrollView,
 *   FlatList, Image, ActivityIndicator, Animated, Platform, Dimensions, StyleSheet,
 *   MaterialIcons, MaterialCommunityIcons, Alert, Math, JSON, Date, Array, Object,
 *   String, Number, Boolean, parseInt, parseFloat, setTimeout, clearTimeout,
 *   setInterval, clearInterval, console, SW (screen width), SH (screen height)
 *
 * Placement options:
 *   • Floating overlay  — draggable panel sitting above the page
 *   • Inline top        — embedded at TOP of the page's ScrollView content
 *   • Inline bottom     — embedded at BOTTOM of the page's ScrollView content
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Platform, Animated, PanResponder, Dimensions, Modal, ActivityIndicator, Alert,
  Pressable, Switch, FlatList, Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { haptics } from '@/services/haptics';
import { widgetStorage, WidgetPlacement } from '@/services/widgetStorage';

// Logger
let _log: (type: string, comp: string, msg: string, meta?: any) => void = () => {};
try {
  const { autoErrorLogger } = require('@/services/autoErrorLogger');
  _log = (type: string, comp: string, msg: string, meta?: any) => {
    try { autoErrorLogger.log(type, comp, msg, meta); } catch {}
  };
} catch {}

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const { width: SW, height: SH } = Dimensions.get('window');

const C = {
  bg:        '#02070D',
  surface:   '#02070D',
  surfaceHi: '#071120',
  border:    'rgba(255,255,255,0.07)',
  text:      '#D0DDE8',
  textDim:   '#3A5060',
  textMid:   '#6A8090',
  purple:    '#BB33FF',
  teal:      '#00CCDD',
  green:     '#00FF88',
  amber:     '#FF9900',
  red:       '#FF3344',
};

// ─── All sandbox argument names ───────────────────────────────
const SANDBOX_ARG_NAMES = [
  'React','View','Text','TouchableOpacity','Pressable','TextInput','Switch',
  'ScrollView','FlatList','Image','ActivityIndicator',
  'MaterialIcons','MaterialCommunityIcons','Animated',
  'Platform','Dimensions','StyleSheet',
  'SW','SH','Alert',
  'Math','JSON','Date','Array','Object','String','Number','Boolean',
  'parseInt','parseFloat',
  'setTimeout','clearTimeout','setInterval','clearInterval','console',
];

function buildSandboxValues() {
  return [
    React, View, Text, TouchableOpacity, Pressable, TextInput, Switch,
    ScrollView, FlatList, Image, ActivityIndicator,
    MaterialIcons, MaterialCommunityIcons, Animated,
    Platform, Dimensions, StyleSheet,
    SW, SH, Alert,
    Math, JSON, Date, Array, Object, String, Number, Boolean,
    parseInt, parseFloat,
    setTimeout, clearTimeout, setInterval, clearInterval, console,
  ];
}

// ─── Starter templates ────────────────────────────────────────
const TEMPLATES: { name: string; desc: string; code: string }[] = [
  {
    name: 'Status Badge',
    desc: 'Glowing status pill',
    code: `var color = '#00FF88';
var label = 'ONLINE';
return React.createElement(View, {
  style: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: color + '80', backgroundColor: color + '18',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  }
},
  React.createElement(View, { style: { width: 8, height: 8, borderRadius: 4, backgroundColor: color } }),
  React.createElement(Text, { style: { color: color, fontSize: 13, fontWeight: '900', fontFamily: 'monospace', letterSpacing: 1 } }, label)
);`,
  },
  {
    name: 'Stat Card',
    desc: 'Big number with label',
    code: `var value = '92%';
var label = 'CPU LOAD';
var color = '#00CCDD';
return React.createElement(View, {
  style: {
    backgroundColor: '#02070D', borderRadius: 12, borderWidth: 1.5,
    borderColor: color + '55', borderLeftWidth: 4, borderLeftColor: color,
    padding: 16, minWidth: 120, alignItems: 'center',
  }
},
  React.createElement(Text, { style: { fontSize: 36, fontWeight: '900', color: color, fontFamily: 'monospace' } }, value),
  React.createElement(Text, { style: { fontSize: 9, fontWeight: '700', color: '#4a607a', fontFamily: 'monospace', letterSpacing: 2, marginTop: 4 } }, label)
);`,
  },
  {
    name: 'Progress Bar',
    desc: 'Progress widget',
    code: `var pct = 72;
var color = '#BB33FF';
var label = 'MEMORY';
return React.createElement(View, {
  style: { backgroundColor: '#02070D', borderRadius: 10, borderWidth: 1, borderColor: '#1a2235', padding: 14, gap: 8 }
},
  React.createElement(View, { style: { flexDirection: 'row', justifyContent: 'space-between' } },
    React.createElement(Text, { style: { fontSize: 10, fontWeight: '700', color: color, fontFamily: 'monospace', letterSpacing: 1 } }, label),
    React.createElement(Text, { style: { fontSize: 12, fontWeight: '900', color: '#fff', fontFamily: 'monospace' } }, pct + '%')
  ),
  React.createElement(View, { style: { height: 8, backgroundColor: '#1a2235', borderRadius: 4, overflow: 'hidden' } },
    React.createElement(View, { style: { height: '100%', width: pct + '%', backgroundColor: color, borderRadius: 4 } })
  )
);`,
  },
  {
    name: 'Info Panel',
    desc: 'Multi-row info card',
    code: `var rows = [
  { label: 'HOST',    value: 'NEXUS-PC' },
  { label: 'STATUS',  value: 'CONNECTED' },
  { label: 'LATENCY', value: '12ms' },
  { label: 'VERSION', value: 'v7.1.0' },
];
var color = '#00CCDD';
return React.createElement(View, {
  style: { backgroundColor: '#02070D', borderRadius: 12, borderWidth: 1, borderColor: '#1a2235', borderLeftWidth: 3, borderLeftColor: color, overflow: 'hidden' }
},
  ...rows.map(function(row, i) {
    return React.createElement(View, {
      key: String(i),
      style: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9,
        borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: '#1a2235' }
    },
      React.createElement(Text, { style: { width: 70, fontSize: 9, color: '#4a607a', fontFamily: 'monospace', letterSpacing: 1 } }, row.label),
      React.createElement(Text, { style: { flex: 1, fontSize: 12, fontWeight: '700', color: '#c8d8f0', fontFamily: 'monospace' } }, row.value)
    );
  })
);`,
  },
  {
    name: 'Quick Button',
    desc: 'Tappable action button',
    code: `var label = 'RUN SCRIPT';
var color = '#00FF88';
return React.createElement(TouchableOpacity, {
  onPress: function() { Alert.alert('Tapped!', 'Button pressed'); },
  activeOpacity: 0.8,
  style: { backgroundColor: color, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }
},
  React.createElement(MaterialIcons, { name: 'play-arrow', size: 20, color: '#000' }),
  React.createElement(Text, { style: { fontSize: 13, fontWeight: '900', color: '#000', fontFamily: 'monospace', letterSpacing: 0.8 } }, label)
);`,
  },
  {
    name: 'Alert Banner',
    desc: 'Warning / error notice',
    code: `var type = 'warn';
var message = 'CPU usage is above 80%!';
var cfg = {
  error: { color: '#FF3344', bg: '#FF334418', icon: 'error' },
  warn:  { color: '#FF9900', bg: '#FF990018', icon: 'warning' },
  info:  { color: '#00CCDD', bg: '#00CCDD18', icon: 'info' },
}[type] || { color: '#00CCDD', bg: '#00CCDD18', icon: 'info' };
return React.createElement(View, {
  style: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: cfg.bg,
    borderWidth: 1, borderColor: cfg.color + '60', borderRadius: 10, padding: 12 }
},
  React.createElement(MaterialIcons, { name: cfg.icon, size: 18, color: cfg.color }),
  React.createElement(Text, { style: { flex: 1, fontSize: 12, color: cfg.color, fontFamily: 'monospace', lineHeight: 17 } }, message)
);`,
  },
  {
    name: 'FlatList Demo',
    desc: 'Scrollable list widget',
    code: `var items = [
  { id: '1', name: 'CPU Monitor',    col: '#00CCDD' },
  { id: '2', name: 'Disk Cleaner',   col: '#00FF88' },
  { id: '3', name: 'Net Scanner',    col: '#FF9900' },
  { id: '4', name: 'Script Builder', col: '#BB33FF' },
];
return React.createElement(View, { style: { backgroundColor: '#02070D', borderRadius: 12, borderWidth: 1, borderColor: '#1a2235', overflow: 'hidden', maxHeight: 200 } },
  React.createElement(FlatList, {
    data: items,
    keyExtractor: function(item) { return item.id; },
    scrollEnabled: true,
    renderItem: function(ref) {
      var item = ref.item;
      return React.createElement(View, {
        style: { flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 14, paddingVertical: 11,
          borderBottomWidth: 1, borderBottomColor: '#1a2235' }
      },
        React.createElement(View, { style: { width: 8, height: 8, borderRadius: 4, backgroundColor: item.col } }),
        React.createElement(Text, { style: { flex: 1, fontSize: 12, fontWeight: '700', color: '#c8d8f0', fontFamily: 'monospace' } }, item.name),
        React.createElement(MaterialIcons, { name: 'chevron-right', size: 16, color: item.col })
      );
    }
  })
);`,
  },
  {
    name: 'Metric Grid',
    desc: '2x2 stats grid',
    code: `var metrics = [
  { label: 'CPU',    value: '36%',  color: '#00CCDD' },
  { label: 'RAM',    value: '71%',  color: '#FF9900' },
  { label: 'DISK',   value: '44%',  color: '#00FF88' },
  { label: 'NET',    value: '12ms', color: '#BB33FF' },
];
return React.createElement(View, {
  style: { backgroundColor: '#02070D', borderRadius: 12, borderWidth: 1, borderColor: '#1a2235',
    padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
},
  ...metrics.map(function(m) {
    return React.createElement(View, {
      key: m.label,
      style: { width: (SW - 80) / 2, backgroundColor: '#02070D', borderRadius: 8,
        borderWidth: 1, borderColor: m.color + '35', borderLeftWidth: 3, borderLeftColor: m.color,
        padding: 10, gap: 2 }
    },
      React.createElement(Text, { style: { fontSize: 20, fontWeight: '900', color: m.color, fontFamily: 'monospace' } }, m.value),
      React.createElement(Text, { style: { fontSize: 8, color: '#4a607a', fontFamily: 'monospace', letterSpacing: 1 } }, m.label)
    );
  })
);`,
  },
  {
    name: 'NEXUS Bar Chart',
    desc: 'Animated glowing bars',
    code: `var bars = [
  { label: 'CPU',  val: 63, color: '#00CCDD' },
  { label: 'RAM',  val: 78, color: '#FF9900' },
  { label: 'DISK', val: 44, color: '#00FF88' },
  { label: 'GPU',  val: 31, color: '#BB33FF' },
  { label: 'NET',  val: 55, color: '#4488FF' },
];
return React.createElement(View, {
  style: { backgroundColor: '#02070D', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#00CCDD22', padding: 14, gap: 10,
    borderLeftWidth: 3, borderLeftColor: '#00CCDD' }
},
  React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 } },
    React.createElement(View, { style: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00CCDD' } }),
    React.createElement(Text, { style: { fontSize: 10, fontWeight: '900', color: '#00CCDDCC',
      fontFamily: 'monospace', letterSpacing: 1.5 } }, 'SYSTEM ACTIVITY')
  ),
  ...bars.map(function(b) {
    return React.createElement(View, { key: b.label, style: { gap: 4 } },
      React.createElement(View, { style: { flexDirection: 'row', justifyContent: 'space-between' } },
        React.createElement(Text, { style: { fontSize: 9, color: b.color, fontFamily: 'monospace', fontWeight: '700' } }, b.label),
        React.createElement(Text, { style: { fontSize: 9, color: b.color, fontFamily: 'monospace', fontWeight: '900' } }, b.val + '%')
      ),
      React.createElement(View, { style: { height: 6, backgroundColor: '#0d1117', borderRadius: 3, overflow: 'hidden' } },
        React.createElement(View, { style: { height: '100%', width: b.val + '%', backgroundColor: b.color, borderRadius: 3 } })
      )
    );
  })
);`,
  },
  {
    name: 'NEXUS Ring Gauge',
    desc: '3D ring meters CPU/RAM/AI',
    code: `var rings = [
  { pct: 63, color: '#00CCDD', label: 'CPU', size: 68 },
  { pct: 78, color: '#FF9900', label: 'RAM', size: 68 },
  { pct: 40, color: '#00FF88', label: 'AI',  size: 68 },
];
return React.createElement(View, {
  style: { backgroundColor: '#02070D', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#00CCDD18', padding: 14, borderLeftWidth: 3, borderLeftColor: '#00CCDD' }
},
  React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 } },
    React.createElement(View, { style: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF88' } }),
    React.createElement(Text, { style: { fontSize: 9, fontWeight: '900', color: '#00FF88',
      fontFamily: 'monospace', letterSpacing: 1.5 } }, 'PERFORMANCE MONITOR')
  ),
  React.createElement(View, { style: { flexDirection: 'row', justifyContent: 'space-around' } },
    ...rings.map(function(r) {
      var c = r.pct >= 80 ? '#FF4444' : r.pct >= 60 ? '#FF9900' : r.color;
      var S = r.size; var RW = Math.round(S * 0.09);
      var showR = r.pct > 25; var showB = r.pct > 50; var showL = r.pct > 75;
      return React.createElement(View, { key: r.label, style: { alignItems: 'center', gap: 6 } },
        React.createElement(View, { style: { width: S, height: S, alignItems: 'center', justifyContent: 'center' } },
          React.createElement(View, { style: { position: 'absolute', width: S, height: S,
            borderRadius: S/2, borderWidth: RW, borderColor: c + '18' } }),
          React.createElement(View, { style: { position: 'absolute', width: S, height: S,
            borderRadius: S/2, borderWidth: RW, borderColor: 'transparent',
            borderTopColor: c,
            borderRightColor: showR ? c : 'transparent',
            borderBottomColor: showB ? c : 'transparent',
            borderLeftColor: showL ? c : 'transparent',
            transform: [{ rotate: '-90deg' }] } }),
          React.createElement(Text, { style: { fontSize: Math.round(S * 0.2), fontWeight: '900',
            color: c, fontFamily: 'monospace' } }, r.pct + '%')
        ),
        React.createElement(Text, { style: { fontSize: 8, color: '#4a607a', fontFamily: 'monospace', letterSpacing: 1.2 } }, r.label)
      );
    })
  )
);`,
  },
  {
    name: 'NEXUS Pill Stats',
    desc: 'Glowing pill containers row',
    code: `var pills = [
  { label: 'ONLINE',    color: '#00FF88', dot: true  },
  { label: 'v7.1.0',   color: '#00CCDD', dot: false },
  { label: 'LAN',      color: '#4488FF', dot: false },
  { label: 'AI READY', color: '#BB33FF', dot: true  },
  { label: '12ms',     color: '#FF9900', dot: false },
];
return React.createElement(View, {
  style: { backgroundColor: '#02070D', borderRadius: 12, borderWidth: 1,
    borderColor: '#00CCDD15', padding: 12, gap: 8 }
},
  React.createElement(Text, { style: { fontSize: 9, fontWeight: '900', color: '#4a607a',
    fontFamily: 'monospace', letterSpacing: 1.5, marginBottom: 4 } }, 'SYSTEM STATUS'),
  React.createElement(View, { style: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 } },
    ...pills.map(function(p) {
      return React.createElement(View, {
        key: p.label,
        style: { flexDirection: 'row', alignItems: 'center', gap: 5,
          paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20,
          borderWidth: 1.5, borderColor: p.color + '70', backgroundColor: p.color + '14' }
      },
        p.dot ? React.createElement(View, { style: { width: 6, height: 6, borderRadius: 3,
          backgroundColor: p.color } }) : null,
        React.createElement(Text, { style: { fontSize: 10, fontWeight: '900', color: p.color,
          fontFamily: 'monospace', letterSpacing: 0.5 } }, p.label)
      );
    })
  )
);`,
  },
  {
    name: 'NEXUS Action Btns',
    desc: '3D themed button grid',
    code: `var btns = [
  { label: 'RUN SCRIPT', icon: 'play-arrow', color: '#00FF88', action: 'Script launched!' },
  { label: 'PC STATUS',  icon: 'computer',   color: '#00CCDD', action: 'Checking PC...' },
  { label: 'KILL PROC',  icon: 'stop',       color: '#FF3344', action: 'Process stopped!' },
  { label: 'AI CHAT',   icon: 'smart-toy',  color: '#BB33FF', action: 'Opening AI...' },
];
return React.createElement(View, {
  style: { backgroundColor: '#02070D', borderRadius: 14, borderWidth: 1, borderColor: '#1a2235', overflow: 'hidden' }
},
  React.createElement(View, { style: { height: 2, backgroundColor: '#00CCDD40' } }),
  React.createElement(View, { style: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 } },
    ...btns.map(function(b) {
      return React.createElement(TouchableOpacity, {
        key: b.label, onPress: function() { Alert.alert(b.label, b.action); }, activeOpacity: 0.75,
        style: { width: (SW - 80) / 2, flexDirection: 'row', alignItems: 'center',
          gap: 7, backgroundColor: b.color + '14', borderWidth: 1.5, borderColor: b.color + '55',
          borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12 }
      },
        React.createElement(MaterialIcons, { name: b.icon, size: 15, color: b.color }),
        React.createElement(Text, { style: { flex: 1, fontSize: 9, fontWeight: '900', color: b.color,
          fontFamily: 'monospace', letterSpacing: 0.5 }, numberOfLines: 1 }, b.label)
      );
    })
  )
);`,
  },
  {
    name: 'NEXUS Line Chart',
    desc: 'Midpoint-based line chart',
    code: `var pts = [18, 32, 28, 45, 52, 41, 67, 58, 74, 63, 82, 71];
var color = '#00CCDD';
var BG = '#02070D';
var CHART_H = 72;
var W = SW - 88;
var maxPt = Math.max.apply(null, pts);
function getX(i) { return (i / (pts.length - 1)) * W; }
function getY(v) { return CHART_H - (v / maxPt) * (CHART_H - 8) - 4; }
return React.createElement(View, {
  style: { backgroundColor: BG, borderRadius: 14, borderWidth: 1.5,
    borderColor: color + '25', padding: 14, borderLeftWidth: 3, borderLeftColor: color }
},
  React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } },
    React.createElement(Text, { style: { fontSize: 10, fontWeight: '900', color: color,
      fontFamily: 'monospace', letterSpacing: 1 } }, 'KB GROWTH'),
    React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 4 } },
      React.createElement(View, { style: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF88' } }),
      React.createElement(Text, { style: { fontSize: 8, color: '#00FF88', fontFamily: 'monospace', fontWeight: '900' } }, 'LIVE')
    )
  ),
  React.createElement(View, { style: { height: CHART_H, position: 'relative', overflow: 'hidden' } },
    React.createElement(View, { style: { position: 'absolute', left: 0, right: 0,
      top: CHART_H * 0.5, height: 1, backgroundColor: color + '10' } }),
    ...pts.slice(1).map(function(pt, i) {
      var x1 = getX(i); var y1 = getY(pts[i]);
      var x2 = getX(i+1); var y2 = getY(pt);
      var dx = x2 - x1; var dy = y2 - y1;
      var len = Math.max(1, Math.sqrt(dx*dx + dy*dy));
      var angle = Math.atan2(dy, dx) * 180 / Math.PI;
      var mx = (x1 + x2) / 2; var my = (y1 + y2) / 2;
      return React.createElement(View, {
        key: String(i),
        style: { position: 'absolute', left: mx - len/2, top: my - 1.5, width: len, height: 3,
          borderRadius: 2, backgroundColor: color,
          transform: [{ rotate: angle + 'deg' }] }
      });
    }),
    ...pts.map(function(pt, i) {
      return React.createElement(View, { key: 'dot' + i,
        style: { position: 'absolute', left: getX(i) - 4, top: getY(pt) - 4,
          width: 8, height: 8, borderRadius: 4, backgroundColor: color, borderWidth: 2, borderColor: BG } });
    })
  )
);`,
  },
  {
    name: 'NEXUS Donut Chart',
    desc: '3D donut/ring pie chart',
    code: `var segs = [
  { label: 'Python',  val: 34, color: '#00CCDD' },
  { label: 'System',  val: 22, color: '#00FF88' },
  { label: 'Network', val: 18, color: '#BB33FF' },
  { label: 'Files',   val: 14, color: '#FF9900' },
  { label: 'AI',      val: 12, color: '#FF4488' },
];
var total = segs.reduce(function(a,s){return a+s.val;},0);
var SIZE = 90; var RW = 14; var BG = '#02070D';
return React.createElement(View, {
  style: { backgroundColor: BG, borderRadius: 14, borderWidth: 1,
    borderColor: '#1a2235', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }
},
  React.createElement(View, { style: { width: SIZE, height: SIZE, position: 'relative',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
    ...segs.map(function(seg, i) {
      var prevPct = segs.slice(0,i).reduce(function(a,s){return a+s.val/total;},0);
      return React.createElement(View, { key: seg.label,
        style: { position: 'absolute', width: SIZE, height: SIZE,
          borderRadius: SIZE/2, borderWidth: RW, borderColor: seg.color,
          opacity: 0.9, transform: [{ rotate: (prevPct * 360) + 'deg' }] } });
    }),
    React.createElement(View, { style: { width: SIZE-RW*2-4, height: SIZE-RW*2-4,
      borderRadius:(SIZE-RW*2)/2, backgroundColor: BG,
      alignItems: 'center', justifyContent: 'center', zIndex: 5 } },
      React.createElement(Text, { style: { fontSize: 18, fontWeight: '900', color: '#00CCDD', fontFamily: 'monospace' } }, total),
      React.createElement(Text, { style: { fontSize: 7, color: '#4a607a', fontFamily: 'monospace', letterSpacing: 0.5 } }, 'TOTAL')
    )
  ),
  React.createElement(View, { style: { flex: 1, gap: 6 } },
    ...segs.map(function(seg) {
      return React.createElement(View, { key: seg.label, style: { flexDirection:'row', alignItems:'center', gap:7 } },
        React.createElement(View, { style: { width:8, height:8, borderRadius:4, backgroundColor:seg.color, flexShrink:0 } }),
        React.createElement(Text, { style: { flex:1, fontSize:9, color:'#94a3b8', fontFamily:'monospace' } }, seg.label),
        React.createElement(Text, { style: { fontSize:9, fontWeight:'900', color:seg.color, fontFamily:'monospace' } }, seg.val)
      );
    })
  )
);`,
  },
  {
    name: 'NEXUS Terminal',
    desc: 'Animated terminal log',
    code: `var logs = [
  { time: '08:14', msg: 'System boot complete', col: '#00FF88' },
  { time: '08:15', msg: 'Butler AI connected',  col: '#00CCDD' },
  { time: '08:16', msg: 'CPU usage: 43%',       col: '#FF9900' },
  { time: '08:17', msg: 'Script executed OK',   col: '#00FF88' },
  { time: '08:18', msg: 'KB updated +12 items', col: '#BB33FF' },
];
return React.createElement(View, {
  style: { backgroundColor: '#000003', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#00FF8825', overflow: 'hidden' }
},
  React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#02070D',
    borderBottomWidth: 1, borderBottomColor: '#00FF8820' } },
    React.createElement(View, { style: { flexDirection: 'row', gap: 5 } },
      ['#FF5F57','#FEBC2E','#28C840'].map(function(c,i) {
        return React.createElement(View, { key: String(i), style: { width:8, height:8, borderRadius:4, backgroundColor:c } });
      })
    ),
    React.createElement(Text, { style: { flex:1, textAlign:'center', fontSize:9, color:'#4a607a', fontFamily:'monospace' } }, 'NEXUS TERMINAL')
  ),
  React.createElement(View, { style: { padding: 10, gap: 5 } },
    ...logs.map(function(l, i) {
      return React.createElement(View, { key: String(i), style: { flexDirection:'row', gap:8 } },
        React.createElement(Text, { style: { fontSize:9, color:l.col+'70', fontFamily:'monospace', width:38 } }, l.time),
        React.createElement(View, { style: { width:4, height:4, borderRadius:2, backgroundColor:l.col, marginTop:3, flexShrink:0 } }),
        React.createElement(Text, { style: { flex:1, fontSize:10, color:'#94a3b8', fontFamily:'monospace' }, numberOfLines:1 }, l.msg)
      );
    }),
    React.createElement(View, { style: { flexDirection:'row', alignItems:'center', gap:5, marginTop:2 } },
      React.createElement(Text, { style: { fontSize:10, color:'#00FF88', fontFamily:'monospace' } }, 'nexus@pc:~$'),
      React.createElement(View, { style: { width:7, height:13, backgroundColor:'#00FF88' } })
    )
  )
);`,
  },
  {
    name: 'NEXUS 3D Card',
    desc: '3D depth effect stat card',
    code: `var title = 'NEXUS CORE';
var value = '99.97%';
var sublabel = 'UPTIME - ALL SYSTEMS';
var color = '#00CCDD';
var BG = '#02070D';
return React.createElement(View, { style: { position:'relative', paddingBottom:6, paddingRight:6 } },
  React.createElement(View, { style: { position:'absolute', top:6, left:6, right:0, bottom:0,
    backgroundColor: color + '18', borderRadius:14, borderWidth:1, borderColor:color+'20' } }),
  React.createElement(View, {
    style: { backgroundColor:BG, borderRadius:14, borderWidth:1.5, borderColor:color+'60',
      padding:18, position:'relative', overflow:'hidden' }
  },
    React.createElement(View, { style:{position:'absolute',top:0,left:0,right:0,height:2,backgroundColor:color} }),
    React.createElement(View, { style:{position:'absolute',top:0,left:0,width:10,height:10,borderTopWidth:2,borderLeftWidth:2,borderColor:color+'90'} }),
    React.createElement(View, { style:{position:'absolute',top:0,right:0,width:10,height:10,borderTopWidth:2,borderRightWidth:2,borderColor:color+'90'} }),
    React.createElement(View, { style:{position:'absolute',bottom:0,left:0,width:10,height:10,borderBottomWidth:2,borderLeftWidth:2,borderColor:color+'55'} }),
    React.createElement(View, { style:{position:'absolute',bottom:0,right:0,width:10,height:10,borderBottomWidth:2,borderRightWidth:2,borderColor:color+'55'} }),
    React.createElement(Text, { style:{fontSize:9,color:color+'80',fontFamily:'monospace',fontWeight:'700',letterSpacing:2,marginBottom:8} }, title),
    React.createElement(Text, { style:{fontSize:40,fontWeight:'900',color:color,fontFamily:'monospace',lineHeight:44} }, value),
    React.createElement(Text, { style:{fontSize:8,color:'#4a607a',fontFamily:'monospace',letterSpacing:1.5,marginTop:6} }, sublabel)
  )
);`,
  },
  {
    name: 'NEXUS Heatmap',
    desc: 'Activity heatmap grid',
    code: `var seed = 42;
function rnd(n) { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return Math.abs(seed) % n; }
var cells = [];
for (var i = 0; i < 56; i++) { cells.push(rnd(5)); }
var cols = ['#0d1117','#00FF8840','#00FF8870','#00FF88AA','#00FF88'];
return React.createElement(View, {
  style: { backgroundColor:'#02070D', borderRadius:12, borderWidth:1,
    borderColor:'#00FF8820', padding:12 }
},
  React.createElement(View, { style:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:10} },
    React.createElement(MaterialIcons, { name:'grid-on', size:12, color:'#00FF88' }),
    React.createElement(Text, { style:{fontSize:9,fontWeight:'900',color:'#00FF88',fontFamily:'monospace',letterSpacing:1} }, 'ACTIVITY HEATMAP'),
    React.createElement(View, { style:{flex:1} }),
    React.createElement(Text, { style:{fontSize:8,color:'#4a607a',fontFamily:'monospace'} }, '8 WKS')
  ),
  React.createElement(View, { style:{flexDirection:'row',flexWrap:'wrap',gap:3} },
    ...cells.map(function(level, i) {
      return React.createElement(View, { key:String(i),
        style:{width:10,height:10,borderRadius:2,backgroundColor:cols[level]} });
    })
  ),
  React.createElement(View, { style:{flexDirection:'row',alignItems:'center',gap:4,marginTop:8} },
    React.createElement(Text, { style:{fontSize:8,color:'#4a607a',fontFamily:'monospace'} }, 'less'),
    ...cols.map(function(c,i) {
      return React.createElement(View, {key:String(i), style:{width:8,height:8,borderRadius:2,backgroundColor:c}});
    }),
    React.createElement(Text, { style:{fontSize:8,color:'#4a607a',fontFamily:'monospace'} }, 'more')
  )
);`,
  },
];

// ─── Page options ─────────────────────────────────────────────
const PIN_PAGE_OPTIONS = [
  { id: 'home',      label: 'HOME',    icon: 'home',         color: '#00CCDD' },
  { id: 'scripts',   label: 'SCRIPTS', icon: 'code',         color: '#4488FF' },
  { id: 'builder',   label: 'BUILD',   icon: 'account-tree', color: '#BB33FF' },
  { id: 'butler',    label: 'AI',      icon: 'smart-toy',    color: '#BB33FF' },
  { id: 'logs',      label: 'PC',      icon: 'bar-chart',    color: '#00FF88' },
  { id: 'knowledge', label: 'KB',      icon: 'psychology',   color: '#FF8C00' },
  { id: 'fileshare', label: 'TOOLS',   icon: 'build',        color: '#FFD700' },
  { id: 'settings',  label: 'CONFIG',  icon: 'settings',     color: '#CC7755' },
];

const PLACEMENT_OPTIONS: { id: WidgetPlacement; label: string; desc: string; icon: string }[] = [
  { id: 'inline-top',    label: 'TOP OF PAGE',    desc: 'Embedded at top of page content — part of the layout', icon: 'vertical-align-top' },
  { id: 'inline-middle', label: 'MIDDLE OF PAGE', desc: 'Embedded in the middle of page content — between sections', icon: 'vertical-align-center' },
  { id: 'inline-bottom', label: 'BOTTOM OF PAGE', desc: 'Embedded at bottom of page content — part of the layout', icon: 'vertical-align-bottom' },
  { id: 'floating',      label: 'FLOATING',       desc: 'Draggable panel hovering above the page', icon: 'open-with' },
];

// ─── PIN TO PAGE MODAL ────────────────────────────────────────
function PinToPageModal({ visible, code, currentX, currentY, onClose, onPinned }: {
  visible: boolean; code: string; currentX: number; currentY: number;
  onClose: () => void; onPinned: () => void;
}) {
  const [label,     setLabel]     = useState('My Widget');
  const [pageId,    setPageId]    = useState('home');
  const [placement, setPlacement] = useState<WidgetPlacement>('inline-top');
  const [saving,    setSaving]    = useState(false);

  React.useEffect(() => {
    if (visible) { setLabel('My Widget'); setPageId('home'); setPlacement('inline-top'); setSaving(false); }
  }, [visible]);

  const handlePin = async () => {
    setSaving(true);
    haptics.heavy();
    try {
      const w = await widgetStorage.pin({
        pageId,
        label:  label.trim() || 'My Widget',
        code,
        placement,
        x: Math.max(10, currentX),
        y: Math.max(80, currentY),
      });
      _log('info', 'LiveWidgetStudio', `Widget pinned: "${w.label}" → ${pageId} (${placement})`, { id: w.id });
      (global as any).__widgetLayerRefresh?.();
      haptics.success();
      const pageName = PIN_PAGE_OPTIONS.find(p => p.id === pageId)?.label ?? pageId.toUpperCase();
      const placementName = PLACEMENT_OPTIONS.find(p => p.id === placement)?.label ?? placement;
      Alert.alert(
        'Widget Added!',
        `"${label || 'My Widget'}" is now at the ${placementName} of the ${pageName} page.\n\nGo to that tab to see it in the page layout.`,
        [{ text: 'OK' }]
      );
      onPinned();
      onClose();
    } catch (e: any) {
      _log('error', 'LiveWidgetStudio', `Pin failed: ${e?.message}`);
      Alert.alert('Error', e?.message || 'Could not save widget');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={ptp.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={ptp.sheet}>
          <View style={[ptp.topBar, { backgroundColor: C.green }]} />
          <View style={ptp.handleBar} />
          <Text style={ptp.title}>ADD TO <Text style={{ color: C.green }}>PAGE</Text></Text>
          <Text style={ptp.sub}>{'Choose how and where the widget appears\nInline = part of page · Floating = draggable overlay'}</Text>

          <View style={ptp.labelRow}>
            <TextInput style={ptp.labelInput} value={label} onChangeText={setLabel}
              placeholder="Widget label..." placeholderTextColor={C.textDim} autoCapitalize="words" />
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 14 }} showsVerticalScrollIndicator={false}>
            <Text style={ptp.sectionLabel}>PLACEMENT</Text>
            <View style={{ paddingHorizontal: 16, gap: 8, marginBottom: 14 }}>
              {PLACEMENT_OPTIONS.map(opt => {
                const isSel = placement === opt.id;
                const col = opt.id === 'floating' ? C.purple : C.green;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[ptp.placementCard, { borderColor: isSel ? col : C.border },
                      isSel && { backgroundColor: col + '12' }]}
                    onPress={() => { haptics.selection(); setPlacement(opt.id); }}
                    activeOpacity={0.8}
                  >
                    <View style={[ptp.placementIcon, { borderColor: isSel ? col + '60' : C.border, backgroundColor: col + '0A' }]}>
                      <MaterialIcons name={opt.icon as any} size={18} color={isSel ? col : C.textDim} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[ptp.placementLabel, { color: isSel ? col : C.textDim }]}>{opt.label}</Text>
                      <Text style={ptp.placementDesc}>{opt.desc}</Text>
                    </View>
                    {isSel ? <MaterialIcons name="check-circle" size={18} color={col} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={ptp.sectionLabel}>TARGET PAGE</Text>
            <View style={ptp.grid}>
              {PIN_PAGE_OPTIONS.map(page => {
                const isSel = pageId === page.id;
                return (
                  <TouchableOpacity
                    key={page.id}
                    style={[ptp.pageCard, { borderColor: isSel ? page.color : C.border },
                      isSel && { backgroundColor: page.color + '18' }]}
                    onPress={() => { haptics.selection(); setPageId(page.id); }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name={page.icon as any} size={18} color={isSel ? page.color : C.textDim} />
                    <Text style={[ptp.pageLabel, { color: isSel ? page.color : C.textDim }]}>{page.label}</Text>
                    {isSel ? <View style={[ptp.check, { backgroundColor: page.color }]} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[ptp.pinBtn, saving && { opacity: 0.6 }]}
            onPress={handlePin} disabled={saving} activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator size="small" color="#000" />
              : <MaterialIcons name="push-pin" size={18} color="#000" />}
            <Text style={ptp.pinBtnTxt}>
              {saving ? 'ADDING...' : `ADD TO ${PIN_PAGE_OPTIONS.find(p => p.id === pageId)?.label ?? 'PAGE'} · ${PLACEMENT_OPTIONS.find(p => p.id === placement)?.label ?? ''}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const ptp = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#02070D', borderTopLeftRadius: 20, borderTopRightRadius: 20,
                  overflow: 'hidden', maxHeight: '90%',
                  ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:-8}, shadowOpacity:0.6, shadowRadius:20 }, android:{ elevation:24 } }) },
  topBar:       { height: 3 },
  handleBar:    { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 12 },
  title:        { fontSize: 18, fontWeight: '900', color: '#FFFFFF', fontFamily: MONO, textAlign: 'center', letterSpacing: 1 },
  sub:          { fontSize: 10, color: '#3A5060', fontFamily: MONO, textAlign: 'center', marginTop: 4, marginBottom: 14, paddingHorizontal: 20, lineHeight: 16 },
  labelRow:     { paddingHorizontal: 16, marginBottom: 14 },
  labelInput:   { backgroundColor: '#02070D', borderWidth: 1.5, borderColor: '#00FF8855', borderRadius: 9,
                  paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#D0DDE8', fontFamily: MONO },
  sectionLabel: { fontSize: 8, fontWeight: '900', color: '#3A5060', fontFamily: MONO, letterSpacing: 2,
                  paddingHorizontal: 16, marginBottom: 8 },
  placementCard:{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 10,
                  paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#02070D' },
  placementIcon:{ width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  placementLabel:{ fontSize: 12, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  placementDesc:{ fontSize: 9, color: '#3A5060', fontFamily: MONO, marginTop: 2, lineHeight: 13 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  pageCard:     { width: '46%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
                  borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 11,
                  backgroundColor: '#02070D', position: 'relative' },
  pageLabel:    { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  check:        { position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3 },
  pinBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                  backgroundColor: '#00FF88', borderRadius: 12, marginHorizontal: 16, marginBottom: 24, paddingVertical: 15,
                  ...Platform.select({ ios:{ shadowColor:'#00FF88', shadowOffset:{width:0,height:4}, shadowOpacity:0.5, shadowRadius:10 }, android:{ elevation:6 } }) },
  pinBtnTxt:    { fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 0.5 },
});

// ─── DRAGGABLE FLOATING PREVIEW WIDGET ────────────────────────
function DraggableWidget({ children, onClose, onEdit, onPin }: {
  children: React.ReactNode;
  onClose: () => void;
  onEdit: () => void;
  onPin: (x: number, y: number) => void;
}) {
  const posX  = useRef(new Animated.Value(SW / 2 - 100)).current;
  const posY  = useRef(new Animated.Value(SH / 2 - 80)).current;
  const lastX = useRef(SW / 2 - 100);
  const lastY = useRef(SH / 2 - 80);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        posX.stopAnimation(v => { lastX.current = v; });
        posY.stopAnimation(v => { lastY.current = v; });
      },
      onPanResponderMove: (_, g) => {
        posX.setValue(Math.max(0, Math.min(lastX.current + g.dx, SW - 120)));
        posY.setValue(Math.max(60, Math.min(lastY.current + g.dy, SH - 120)));
      },
      onPanResponderRelease: (_, g) => {
        lastX.current = Math.max(0, Math.min(lastX.current + g.dx, SW - 120));
        lastY.current = Math.max(60, Math.min(lastY.current + g.dy, SH - 120));
      },
    })
  ).current;

  return (
    <Animated.View style={[
      dw.container,
      { left: posX, top: posY },
      Platform.OS === 'ios'
        ? { shadowColor: C.purple, shadowOffset:{width:0,height:4}, shadowOpacity:0.5, shadowRadius:16 }
        : { elevation: 20 },
    ]}>
      <View {...panResponder.panHandlers} style={dw.handleBar}>
        <View style={dw.handleDots}>
          {[0,1,2,3,4,5].map(i => <View key={i} style={[dw.dot, { backgroundColor: C.purple + '80' }]} />)}
        </View>
        <Text style={dw.handleLabel}>PREVIEW — DRAG ME</Text>

        <TouchableOpacity onPress={() => { haptics.heavy(); posX.stopAnimation(v=>{ lastX.current=v; }); posY.stopAnimation(v=>{ lastY.current=v; }); onPin(lastX.current, lastY.current); }}
          hitSlop={{ top:6,bottom:6,left:6,right:6 }}
          style={[dw.iconBtn, { backgroundColor: '#00FF8820', borderWidth:1.5, borderColor:'#00FF8880' }]}>
          <MaterialIcons name="push-pin" size={13} color="#00FF88" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { haptics.light(); onEdit(); }}
          hitSlop={{ top:6,bottom:6,left:6,right:6 }} style={dw.iconBtn}>
          <MaterialIcons name="edit" size={13} color={C.teal} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { haptics.medium(); onClose(); }}
          hitSlop={{ top:6,bottom:6,left:6,right:6 }} style={dw.iconBtn}>
          <MaterialIcons name="close" size={13} color={C.red} />
        </TouchableOpacity>
      </View>
      <View style={dw.pinHint}>
        <MaterialIcons name="push-pin" size={9} color="#00FF8870" />
        <Text style={dw.pinHintTxt}>Tap pin icon to add to any page · Inline or floating</Text>
      </View>
      <View style={dw.content}>{children}</View>
    </Animated.View>
  );
}

const dw = StyleSheet.create({
  container:  { position:'absolute', zIndex:9999, backgroundColor:'#02070D', borderRadius:14, borderWidth:1.5, borderColor:'#BB33FF55', overflow:'hidden', minWidth:140 },
  handleBar:  { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:10, paddingVertical:7, backgroundColor:'#02070D', borderBottomWidth:1, borderBottomColor:'#BB33FF30' },
  handleDots: { flexDirection:'row', flexWrap:'wrap', width:18, gap:2 },
  dot:        { width:3, height:3, borderRadius:1.5 },
  handleLabel:{ flex:1, fontSize:8, fontWeight:'900', color:'#BB33FF80', fontFamily:MONO, letterSpacing:1.2 },
  iconBtn:    { width:26, height:26, borderRadius:6, backgroundColor:'#071120', alignItems:'center', justifyContent:'center' },
  pinHint:    { flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:10, paddingVertical:5, backgroundColor:'#00FF8806', borderBottomWidth:1, borderBottomColor:'#00FF8818' },
  pinHintTxt: { fontSize:8, color:'#00FF8870', fontFamily:MONO },
  content:    { padding:12 },
});

// ─── CODE EDITOR MODAL ────────────────────────────────────────
function CodeEditorModal({ visible, initialCode, onClose, onRun }: {
  visible: boolean; initialCode: string; onClose: () => void; onRun: (code: string) => void;
}) {
  const [code, setCode]               = useState(initialCode);
  const [showTemplates, setShowTemplates] = useState(false);
  const [error, setError]             = useState('');

  React.useEffect(() => {
    if (visible) { setCode(initialCode); setError(''); setShowTemplates(false); }
  }, [visible, initialCode]);

  const handleRun = () => {
    haptics.heavy(); setError('');
    try {
      // Validate with the full expanded sandbox arg list
      new Function(...SANDBOX_ARG_NAMES, code);
      _log('info', 'LiveWidgetStudio', 'Widget code validated and running');
      onRun(code);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Syntax error');
      _log('error', 'LiveWidgetStudio', `Code validation failed: ${e?.message}`);
      haptics.warning();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={cem.root}>
        <View style={cem.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
            <MaterialIcons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex:1, gap:2 }}>
            <Text style={cem.title}>WIDGET <Text style={{ color:C.purple }}>STUDIO</Text></Text>
            <Text style={cem.subtitle}>Write code · RUN to preview · PIN to add to any page</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowTemplates(v => !v)}
            style={[cem.templateBtn, showTemplates && { backgroundColor:C.purple+'25', borderColor:C.purple+'70' }]}>
            <MaterialIcons name="auto-awesome" size={14} color={C.purple} />
            <Text style={{ fontSize:9, fontWeight:'900', color:C.purple, fontFamily:MONO }}>TEMPLATES</Text>
          </TouchableOpacity>
        </View>

        {showTemplates ? (
          <View style={cem.templateStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, paddingHorizontal:14 }}>
              {TEMPLATES.map((t, i) => (
                <TouchableOpacity key={i} style={cem.templateChip}
                  onPress={() => { haptics.light(); setCode(t.code); setShowTemplates(false); setError(''); }} activeOpacity={0.8}>
                  <Text style={cem.templateChipName}>{t.name}</Text>
                  <Text style={cem.templateChipDesc}>{t.desc}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={cem.guideBanner}>
          <MaterialIcons name="info-outline" size={12} color={C.teal+'80'} />
          <Text style={cem.guideText}>
            {'Available: View, Text, TouchableOpacity, Pressable, TextInput, Switch, ScrollView, FlatList, Image, ActivityIndicator, Animated, MaterialIcons, MaterialCommunityIcons, Platform, Dimensions, StyleSheet, Alert, Math, JSON, Date, SW, SH'}
          </Text>
        </View>

        {error ? (
          <View style={cem.errorBar}>
            <MaterialIcons name="error-outline" size={13} color={C.red} />
            <Text style={cem.errorText} numberOfLines={3}>{error}</Text>
          </View>
        ) : null}

        <ScrollView style={{ flex:1 }} keyboardShouldPersistTaps="handled">
          <TextInput
            style={cem.codeInput}
            value={code}
            onChangeText={v => { setCode(v); setError(''); }}
            multiline autoCapitalize="none" autoCorrect={false} spellCheck={false}
            placeholder={'// Use React.createElement() — no JSX needed\n// All RN components + icons available!\nreturn React.createElement(View, {\n  style: { padding: 16, backgroundColor: "#0a0b0f",\n           borderRadius: 10, borderWidth: 1, borderColor: "#00FF8855" }\n},\n  React.createElement(Text, {\n    style: { color: "#00FF88", fontFamily: "monospace", fontSize: 14 }\n  }, "Hello Butler AI!")\n);'}
            placeholderTextColor={C.textDim}
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </ScrollView>

        <View style={cem.bottomBar}>
          <TouchableOpacity
            onPress={() => Alert.alert('Clear Code', 'Erase current code?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => { setCode(''); setError(''); } },
            ])}
            style={cem.clearBtn} activeOpacity={0.8}>
            <MaterialIcons name="delete-outline" size={16} color={C.textMid} />
            <Text style={{ fontSize:10, fontWeight:'700', color:C.textMid, fontFamily:MONO }}>CLEAR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRun}
            style={[cem.runBtn, !code.trim() && { opacity:0.45 }]}
            disabled={!code.trim()} activeOpacity={0.85}>
            <MaterialIcons name="play-arrow" size={18} color="#000" />
            <Text style={cem.runBtnTxt}>RUN &amp; PREVIEW</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const cem = StyleSheet.create({
  root:             { flex:1, backgroundColor:C.bg },
  header:           { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:16,
                      paddingTop: Platform.OS === 'android' ? 40 : 60, paddingBottom:14,
                      borderBottomWidth:1, borderBottomColor:C.border, backgroundColor:C.surface },
  title:            { fontSize:18, fontWeight:'900', color:'#FFFFFF', fontFamily:MONO, letterSpacing:0.5 },
  subtitle:         { fontSize:9, color:C.textDim, fontFamily:MONO },
  templateBtn:      { flexDirection:'row', alignItems:'center', gap:5, borderWidth:1.5, borderRadius:8,
                      paddingHorizontal:10, paddingVertical:6, borderColor:C.purple+'50', backgroundColor:C.purple+'0C' },
  templateStrip:    { paddingVertical:10, borderBottomWidth:1, borderBottomColor:C.border, backgroundColor:C.surfaceHi },
  templateChip:     { borderWidth:1, borderRadius:9, paddingHorizontal:12, paddingVertical:8,
                      borderColor:C.purple+'50', backgroundColor:C.purple+'0C', minWidth:100 },
  templateChipName: { fontSize:11, fontWeight:'700', color:C.purple, fontFamily:MONO },
  templateChipDesc: { fontSize:9, color:C.textMid, fontFamily:MONO, marginTop:2 },
  guideBanner:      { flexDirection:'row', alignItems:'flex-start', gap:7, paddingHorizontal:14, paddingVertical:9,
                      backgroundColor:C.teal+'08', borderBottomWidth:1, borderBottomColor:C.teal+'20' },
  guideText:        { flex:1, fontSize:9, color:C.teal+'AA', fontFamily:MONO, lineHeight:14 },
  errorBar:         { flexDirection:'row', alignItems:'flex-start', gap:8, paddingHorizontal:14, paddingVertical:9,
                      backgroundColor:C.red+'12', borderBottomWidth:1, borderBottomColor:C.red+'40' },
  errorText:        { flex:1, fontSize:10, color:C.red, fontFamily:MONO, lineHeight:15 },
  codeInput:        { flex:1, padding:14, fontSize:13, color:'#A8D8B8', fontFamily:MONO, lineHeight:21,
                      minHeight:400, backgroundColor:'#000003' },
  bottomBar:        { flexDirection:'row', gap:10, paddingHorizontal:14, paddingVertical:14,
                      borderTopWidth:1, borderTopColor:C.border, backgroundColor:C.surface,
                      paddingBottom: Platform.OS === 'ios' ? 28 : 14 },
  clearBtn:         { flexDirection:'row', alignItems:'center', gap:6, borderWidth:1, borderRadius:10,
                      paddingHorizontal:14, paddingVertical:12, borderColor:C.border },
  runBtn:           { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
                      backgroundColor:C.purple, borderRadius:10, paddingVertical:12,
                      ...Platform.select({ ios:{ shadowColor:C.purple, shadowOffset:{width:0,height:4}, shadowOpacity:0.5, shadowRadius:10 }, android:{ elevation:6 } }) },
  runBtnTxt:        { fontSize:14, fontWeight:'900', color:'#000', fontFamily:MONO, letterSpacing:0.5 },
});

// ─── MAIN EXPORT ─────────────────────────────────────────────
export function LiveWidgetStudio() {
  const [editorVisible,  setEditorVisible]  = useState(false);
  const [activeCode,     setActiveCode]      = useState('');
  const [renderedWidget, setRenderedWidget] = useState<React.ReactNode | null>(null);
  const [widgetVisible,  setWidgetVisible]  = useState(false);
  const [renderError,    setRenderError]    = useState('');
  const [showPinModal,   setShowPinModal]   = useState(false);
  const [pinPos,         setPinPos]         = useState({ x: SW/2-100, y: SH/2-80 });
  const [pinnedCount,    setPinnedCount]    = useState(0);

  // ── Auto-healer: scan all pinned widgets for JS errors and patch broken ones ──
  const runAutoHeal = useCallback(async () => {
    try {
      const all = await widgetStorage.getAll();
      let healed = 0;
      for (const w of all) {
        try { new Function(...SANDBOX_ARG_NAMES, w.code); }
        catch (e: any) {
          const safeLabel = w.label.replace(/[`'"]/g, '');
          const fallback = `return React.createElement(View,{
  style:{backgroundColor:'#02070D',borderRadius:10,borderWidth:1.5,
    borderColor:'#FF334455',padding:14,gap:6}
},
  React.createElement(MaterialIcons,{name:'warning',size:18,color:'#FF9900'}),
  React.createElement(Text,{style:{fontSize:11,fontWeight:'900',color:'#FF9900',fontFamily:'monospace'}},
    '${safeLabel} - Code Error'),
  React.createElement(Text,{style:{fontSize:9,color:'#4a607a',fontFamily:'monospace',lineHeight:14}},
    'Tap EDIT in Widget Studio to fix.')
);`;
          await widgetStorage.updateCode(w.id, fallback, w.label + ' ⚠');
          healed++;
          _log('warn', 'AutoHeal', `Healed broken widget: ${w.label}`, { id: w.id, err: e?.message });
        }
      }
      (global as any).__widgetLayerRefresh?.();
      return healed;
    } catch { return 0; }
  }, []);

  React.useEffect(() => {
    const load = async () => {
      try { const all = await widgetStorage.getAll(); setPinnedCount(all.length); } catch {}
    };
    load();
    (global as any).__widgetStudioRefreshCount = load;

    // Global: allow WidgetLayer edit buttons to open this studio pre-filled
    (global as any).__widgetStudioEditWidget = (widget: { id: string; code: string; label: string }) => {
      setActiveCode(widget.code);
      setEditorVisible(true);
      // After editor opens, patch evaluateAndRender to save to existing widget on RUN
      (global as any).__widgetStudioSaveTargetId = widget.id;
    };

    return () => {
      delete (global as any).__widgetStudioRefreshCount;
      delete (global as any).__widgetStudioEditWidget;
      delete (global as any).__widgetStudioSaveTargetId;
    };
  }, []);

  const evaluateAndRender = useCallback((code: string) => {
    try {
      setRenderError('');
      // Full expanded sandbox — passes all available APIs into the user's code
      const factory = new Function(...SANDBOX_ARG_NAMES, code);
      const element = factory(...buildSandboxValues());
      setActiveCode(code);
      setRenderedWidget(element);
      setWidgetVisible(true);
      _log('info', 'LiveWidgetStudio', 'Widget rendered successfully');

      // If opened via edit button in WidgetLayer, auto-save back to the pinned widget
      const targetId = (global as any).__widgetStudioSaveTargetId;
      if (targetId) {
        widgetStorage.updateCode(targetId, code).then(() => {
          _log('info', 'LiveWidgetStudio', `Auto-saved edit to widget ${targetId}`);
          (global as any).__widgetLayerRefresh?.();
          (global as any).__widgetStudioRefreshCount?.();
          delete (global as any).__widgetStudioSaveTargetId;
        }).catch(() => {});
      }

      haptics.success();
    } catch (e: any) {
      setRenderError(e?.message || 'Render failed');
      _log('error', 'LiveWidgetStudio', `Render failed: ${e?.message}`);
      haptics.warning();
    }
  }, []);

  return (
    <>
      {/* ── Launcher card ── */}
      <View style={lws.card}>
        <View style={[lws.topAccent, { backgroundColor: C.purple }]} />
        <View style={lws.cardHeader}>
          <View style={[lws.iconBox, { borderColor:C.purple+'60', backgroundColor:C.purple+'14' }]}>
            <MaterialCommunityIcons name="widgets" size={22} color={C.purple} />
          </View>
          <View style={{ flex:1, gap:2 }}>
            <Text style={[lws.cardTitle, { color:C.purple }]}>WIDGET <Text style={{ color:C.purple }}>STUDIO</Text></Text>
            <Text style={lws.cardSub}>Code a widget → choose inline or floating → pin to any page permanently</Text>
          </View>
          {widgetVisible ? (
            <TouchableOpacity onPress={() => setWidgetVisible(false)}
              style={[lws.toggleBtn, { borderColor:C.red+'60', backgroundColor:C.red+'12' }]}
              hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <MaterialIcons name="visibility-off" size={13} color={C.red} />
              <Text style={{ fontSize:8, fontWeight:'900', color:C.red, fontFamily:MONO }}>HIDE</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {pinnedCount > 0 ? (
          <View>
            <TouchableOpacity style={lws.pinnedBar} onPress={async () => {
              const all = await widgetStorage.getAll();
              const summary = all.map((w: any) => `• "${w.label}" → ${w.pageId.toUpperCase()} (${w.placement})`).join('\n');
              Alert.alert(
                `${pinnedCount} Widget${pinnedCount !== 1 ? 's' : ''} Pinned`,
                summary + '\n\nInline widgets appear inside the page.',
                [{ text: 'OK' }]
              );
            }} activeOpacity={0.8}>
              <MaterialIcons name="push-pin" size={11} color={C.green} />
              <Text style={lws.pinnedBarTxt}>{pinnedCount} widget{pinnedCount !== 1 ? 's' : ''} pinned · tap to view list</Text>
              <MaterialIcons name="chevron-right" size={13} color={C.green+'80'} />
            </TouchableOpacity>
            <View style={lws.mgmtRow}>
              <TouchableOpacity
                style={[lws.mgmtBtn, { borderColor: C.amber+'60', backgroundColor: C.amber+'0C' }]}
                onPress={async () => {
                  haptics.medium();
                  const healed = await runAutoHeal();
                  Alert.alert('Auto-Heal', healed > 0
                    ? `Fixed ${healed} broken widget${healed !== 1 ? 's' : ''}. Reload the page to see them.`
                    : 'All widgets are healthy!');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="auto-fix-high" size={12} color={C.amber} />
                <Text style={[lws.mgmtTxt, { color: C.amber }]}>AUTO-HEAL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[lws.mgmtBtn, { borderColor: C.red+'60', backgroundColor: C.red+'0C' }]}
                onPress={() => {
                  haptics.heavy();
                  Alert.alert(
                    'Delete ALL Widgets',
                    `Permanently remove all ${pinnedCount} widget${pinnedCount !== 1 ? 's' : ''} from every page?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'DELETE ALL', style: 'destructive', onPress: async () => {
                        await widgetStorage.clearAll();
                        setPinnedCount(0);
                        haptics.success();
                        (global as any).__widgetLayerRefresh?.();
                      }},
                    ]
                  );
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="delete-forever" size={12} color={C.red} />
                <Text style={[lws.mgmtTxt, { color: C.red }]}>DELETE ALL</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {renderError ? (
          <View style={lws.errorRow}>
            <MaterialIcons name="error-outline" size={12} color={C.red} />
            <Text style={lws.errorTxt} numberOfLines={2}>{renderError}</Text>
          </View>
        ) : null}

        {/* Template quick launch */}
        <View style={{ paddingHorizontal:14, paddingBottom:4 }}>
          <Text style={lws.quickLabel}>QUICK START</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:7 }}>
            {TEMPLATES.map((t, i) => (
              <TouchableOpacity key={i} style={lws.templatePill}
                onPress={() => { setActiveCode(t.code); setEditorVisible(true); }} activeOpacity={0.8}>
                <Text style={lws.templatePillTxt}>{t.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[lws.templatePill, { borderColor:C.purple+'70', backgroundColor:C.purple+'18' }]}
              onPress={() => { setEditorVisible(true); }} activeOpacity={0.8}>
              <MaterialIcons name="code" size={11} color={C.purple} />
              <Text style={[lws.templatePillTxt, { color:C.purple }]}>CUSTOM</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal:14, paddingBottom:14, paddingTop:6, gap:8 }}>
          <TouchableOpacity style={lws.mainBtn} onPress={() => setEditorVisible(true)} activeOpacity={0.85}>
            <MaterialIcons name="add-box" size={17} color="#000" />
            <Text style={lws.mainBtnTxt}>{widgetVisible ? 'EDIT WIDGET CODE' : 'CREATE WIDGET'}</Text>
            {widgetVisible ? <View style={lws.activeDot} /> : null}
          </TouchableOpacity>

          {widgetVisible ? (
            <View style={{ flexDirection:'row', gap:8 }}>
              <TouchableOpacity
                style={[lws.secondaryBtn, { flex:1 }]}
                onPress={() => setWidgetVisible(true)} activeOpacity={0.8}>
                <MaterialIcons name="visibility" size={14} color={C.purple} />
                <Text style={[lws.secondaryBtnTxt, { color:C.purple }]}>SHOW</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[lws.secondaryBtn, { flex:2, borderColor:C.green+'60', backgroundColor:C.green+'0A' }]}
                onPress={() => { setPinPos({ x:SW/2-100, y:SH/2-80 }); setShowPinModal(true); }}
                activeOpacity={0.8}>
                <MaterialIcons name="push-pin" size={14} color={C.green} />
                <Text style={[lws.secondaryBtnTxt, { color:C.green }]}>ADD TO PAGE</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      {/* Code editor */}
      <CodeEditorModal visible={editorVisible} initialCode={activeCode}
        onClose={() => setEditorVisible(false)} onRun={evaluateAndRender} />

      {/* Pin modal */}
      <PinToPageModal
        visible={showPinModal}
        code={activeCode}
        currentX={pinPos.x}
        currentY={pinPos.y}
        onClose={() => setShowPinModal(false)}
        onPinned={() => {
          setPinnedCount(v => v + 1);
          setWidgetVisible(false);
          (global as any).__widgetStudioRefreshCount?.();
        }}
      />

      {/* Floating preview widget */}
      {widgetVisible && renderedWidget ? (
        <DraggableWidget
          onClose={() => setWidgetVisible(false)}
          onEdit={() => setEditorVisible(true)}
          onPin={(x, y) => { setPinPos({ x, y }); setShowPinModal(true); }}
        >
          {renderedWidget}
        </DraggableWidget>
      ) : null}
    </>
  );
}

const lws = StyleSheet.create({
  card:           { backgroundColor:'#02070D', borderRadius:14, borderWidth:1.5, borderColor:'#BB33FF40',
                    overflow:'hidden', marginBottom:14,
                    ...Platform.select({ ios:{ shadowColor:'#BB33FF', shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:12 }, android:{ elevation:8 } }) },
  topAccent:      { height:3 },
  cardHeader:     { flexDirection:'row', alignItems:'center', gap:12, padding:14, paddingBottom:10 },
  iconBox:        { width:44, height:44, borderRadius:11, borderWidth:1.5, alignItems:'center', justifyContent:'center', flexShrink:0 },
  cardTitle:      { fontSize:13, fontWeight:'900', fontFamily:MONO, letterSpacing:1 },
  cardSub:        { fontSize:9, color:'#4a607a', fontFamily:MONO, lineHeight:13 },
  toggleBtn:      { flexDirection:'row', alignItems:'center', gap:4, borderWidth:1.5, borderRadius:8, paddingHorizontal:8, paddingVertical:6 },
  pinnedBar:      { flexDirection:'row', alignItems:'center', gap:7, paddingHorizontal:14, paddingVertical:8,
                    backgroundColor:'#00FF8808', borderBottomWidth:1, borderBottomColor:'#00FF8820', borderTopWidth:1, borderTopColor:'#00FF8818' },
  pinnedBarTxt:   { flex:1, fontSize:9, fontWeight:'700', color:'#00FF88BB', fontFamily:MONO, letterSpacing:0.3 },
  errorRow:       { flexDirection:'row', alignItems:'flex-start', gap:7, marginHorizontal:14, marginBottom:8,
                    borderWidth:1, borderRadius:8, padding:9, borderColor:'#FF334440', backgroundColor:'#FF334412' },
  errorTxt:       { flex:1, fontSize:9, color:'#FF3344', fontFamily:MONO, lineHeight:14 },
  quickLabel:     { fontSize:8, fontWeight:'700', color:'#3A5060', fontFamily:MONO, letterSpacing:1.5, marginBottom:7 },
  templatePill:   { borderWidth:1, borderRadius:20, paddingHorizontal:11, paddingVertical:6,
                    borderColor:'#BB33FF35', backgroundColor:'#BB33FF0A', flexDirection:'row', alignItems:'center', gap:5 },
  templatePillTxt:{ fontSize:10, fontWeight:'700', color:'#BB33FFCC', fontFamily:MONO },
  mainBtn:        { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
                    backgroundColor:'#BB33FF', borderRadius:10, paddingVertical:13,
                    ...Platform.select({ ios:{ shadowColor:'#BB33FF', shadowOffset:{width:0,height:4}, shadowOpacity:0.5, shadowRadius:10 }, android:{ elevation:6 } }) },
  mainBtnTxt:     { fontSize:13, fontWeight:'900', color:'#000', fontFamily:MONO, letterSpacing:0.5 },
  activeDot:      { width:7, height:7, borderRadius:4, backgroundColor:'#00FF88' },
  secondaryBtn:   { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:7,
                    borderWidth:1.5, borderRadius:10, paddingVertical:10,
                    borderColor:'#BB33FF50', backgroundColor:'#BB33FF0A' },
  secondaryBtnTxt:{ fontSize:11, fontWeight:'700', fontFamily:MONO, letterSpacing:0.5 },
  mgmtRow:        { flexDirection:'row', gap:8, paddingHorizontal:14, paddingBottom:8, paddingTop:4,
                    borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.05)' },
  mgmtBtn:        { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5,
                    borderWidth:1.5, borderRadius:8, paddingVertical:8 },
  mgmtTxt:        { fontSize:9, fontWeight:'900', fontFamily:MONO, letterSpacing:0.5 },
});
