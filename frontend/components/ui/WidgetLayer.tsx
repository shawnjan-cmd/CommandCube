/**
 * WIDGET LAYER v3
 * Provides two export modes:
 *
 * 1. WidgetLayer pageId="home"
 *    → Absolutely-positioned floating widgets (sit above page content)
 *
 * 2. InlineWidgetSlot pageId="home" position="inline-top"|"inline-middle"|"inline-bottom"
 *    → Normal View in content flow — widgets render INSIDE the ScrollView
 *      so they become part of the page layout, not hovering over it.
 *
 * Fix v3: Pencil button now opens the local EditWidgetModal directly
 * (no global dependency on LiveWidgetStudio being mounted in BUILD tab).
 * EditWidgetModal now has Code + Size tabs for label/height editing.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, PanResponder,
  Animated, Platform, Modal, TextInput, ScrollView, Alert,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { widgetStorage, PinnedWidget, WidgetPlacement } from '@/services/widgetStorage';
import { haptics } from '@/services/haptics';

// Logger — safe import so app never crashes if logger is broken
let _log: (type: string, comp: string, msg: string, meta?: any) => void = () => {};
try {
  const { autoErrorLogger } = require('@/services/autoErrorLogger');
  _log = (type: string, comp: string, msg: string, meta?: any) => {
    try { autoErrorLogger.log(type, comp, msg, meta); } catch {}
  };
} catch {}

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const { width: SW } = Dimensions.get('window');

const C = {
  bg:      '#050C14',
  surface: '#0A1018',
  border:  'rgba(255,255,255,0.07)',
  text:    '#D0DDE8',
  dim:     '#3A5060',
  textMid: '#6A8090',
  purple:  '#BB33FF',
  teal:    '#00CCDD',
  green:   '#00FF88',
  amber:   '#FF9900',
  red:     '#FF3344',
};

// ── Safe widget evaluator ─────────────────────────────────────────────────────
function evaluateWidgetCode(code: string): { el: React.ReactNode | null; err: string } {
  if (!code || !code.trim()) return { el: null, err: 'Widget code is empty.' };
  try {
    const factory = new Function(
      'React', 'View', 'Text', 'TouchableOpacity', 'ActivityIndicator',
      'MaterialIcons', 'SW', code
    );
    const el = factory(React, View, Text, TouchableOpacity, ActivityIndicator, MaterialIcons, SW);
    return { el, err: '' };
  } catch (e: any) {
    return { el: null, err: e?.message || 'Render error' };
  }
}

const MIN_WIDGET_H = 60;
const MAX_WIDGET_H = 1200;

// ── Resize handle (top or bottom edge of inline widget) ─────────────────────
function ResizeHandle({
  widgetId,
  currentHeight,
  position,
  onResize,
}: {
  widgetId: string;
  currentHeight: number;
  position: 'top' | 'bottom';
  onResize: (id: string, newHeight: number) => void;
}) {
  const baseH = useRef(currentHeight);
  const dragAnim = useRef(new Animated.Value(0)).current;
  const [dragging, setDragging] = useState(false);

  useEffect(() => { if (!dragging) baseH.current = currentHeight; }, [currentHeight, dragging]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 3,
      onPanResponderGrant: () => {
        setDragging(true);
        dragAnim.setValue(0);
        haptics.light();
      },
      onPanResponderMove: (_, g) => {
        dragAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        const delta = position === 'bottom' ? g.dy : -g.dy;
        const newH = Math.max(MIN_WIDGET_H, Math.min(MAX_WIDGET_H, baseH.current + delta));
        baseH.current = newH;
        dragAnim.setValue(0);
        setDragging(false);
        onResize(widgetId, newH);
        haptics.selection();
      },
      onPanResponderTerminate: () => {
        dragAnim.setValue(0);
        setDragging(false);
      },
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        rhStyles.handle,
        position === 'top' ? rhStyles.top : rhStyles.bottom,
        dragging && rhStyles.handleActive,
      ]}
    >
      <View style={rhStyles.gripBar} />
      <View style={[rhStyles.gripBar, { width: 20 }]} />
      <View style={rhStyles.gripBar} />
      {dragging ? (
        <Animated.View style={[
          rhStyles.deltaLabel,
          position === 'bottom' ? { top: 18 } : { bottom: 18 },
        ]}>
          <Text style={rhStyles.deltaLabelTxt}>DRAG TO RESIZE</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const rhStyles = StyleSheet.create({
  handle: {
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flexDirection: 'row',
    zIndex: 20,
    backgroundColor: 'transparent',
  },
  top: { marginBottom: 0 },
  bottom: { marginTop: 0 },
  handleActive: {
    backgroundColor: C.purple + '14',
    borderRadius: 4,
  },
  gripBar: {
    width: 28,
    height: 2,
    backgroundColor: C.purple + '40',
    borderRadius: 1,
  },
  deltaLabel: {
    position: 'absolute',
    left: '50%',
    backgroundColor: '#0A1018',
    borderWidth: 1,
    borderColor: C.purple + '60',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: -50,
    zIndex: 30,
  },
  deltaLabelTxt: {
    fontSize: 7,
    fontWeight: '900',
    color: C.purple,
    fontFamily: MONO,
    letterSpacing: 0.5,
  },
});

// ── Edit widget modal — Code tab + Size/Label tab ─────────────────────────────
function EditWidgetModal({ visible, widget, onClose, onSave, onResize }: {
  visible: boolean;
  widget: PinnedWidget | null;
  onClose: () => void;
  onSave: (id: string, code: string, label: string) => void;
  onResize?: (id: string, height: number) => void;
}) {
  const [code,        setCode]        = useState('');
  const [label,       setLabel]       = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [error,       setError]       = useState('');
  const [preview,     setPreview]     = useState<React.ReactNode | null>(null);
  const [tab,         setTab]         = useState<'code' | 'size'>('code');

  // Reset state whenever widget changes — key on widget.id to avoid stale state
  useEffect(() => {
    if (visible && widget) {
      setCode(widget.code || '');
      setLabel(widget.label || '');
      setHeightInput(widget.height && widget.height > 0 ? String(widget.height) : '');
      setError('');
      setPreview(null);
      setTab('code');
    }
  }, [visible, widget?.id]);

  const handlePreview = () => {
    if (!code.trim()) { setError('No code to preview.'); return; }
    const { el, err } = evaluateWidgetCode(code);
    if (err) { setError(err); setPreview(null); }
    else { setError(''); setPreview(el); }
  };

  const handleSave = () => {
    if (!widget) return;
    if (tab === 'size') {
      // Save label + height from size tab
      const h = parseInt(heightInput, 10);
      const newH = isNaN(h) || h <= 0 ? 0 : Math.max(60, Math.min(1200, h));
      if (onResize) onResize(widget.id, newH);
      const newLabel = label.trim() || widget.label;
      if (newLabel !== widget.label) {
        onSave(widget.id, widget.code, newLabel);
      }
      haptics.success();
      onClose();
      return;
    }
    if (!code.trim()) { setError('Code cannot be empty.'); haptics.warning(); return; }
    const { err } = evaluateWidgetCode(code);
    if (err) { setError(err); haptics.warning(); return; }
    _log('info', 'EditWidgetModal', `Saved widget "${label}"`, { id: widget.id });
    haptics.success();
    onSave(widget.id, code, label.trim() || widget.label);
    onClose();
  };

  if (!visible || !widget) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={ewm.root}>
        {/* Header */}
        <View style={ewm.header}>
          <TouchableOpacity onPress={() => { haptics.light(); onClose(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={ewm.title}>EDIT <Text style={{ color: C.purple }}>WIDGET</Text></Text>
            <Text style={ewm.sub} numberOfLines={1}>{widget.label || 'Unnamed widget'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {tab === 'code' ? (
              <TouchableOpacity onPress={handlePreview} style={ewm.previewBtn} activeOpacity={0.85}>
                <MaterialIcons name="play-arrow" size={14} color={C.teal} />
                <Text style={[ewm.headerBtnTxt, { color: C.teal }]}>TEST</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={handleSave} style={ewm.saveBtn} activeOpacity={0.85}>
              <MaterialIcons name="check" size={14} color="#000" />
              <Text style={ewm.headerBtnTxt}>SAVE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs: Code | Size & Label */}
        <View style={ewm.tabRow}>
          {([['code', '{ } CODE'], ['size', '⇕ SIZE & LABEL']] as [string, string][]).map(([t, label2]) => (
            <TouchableOpacity
              key={t}
              style={[ewm.tabBtn, tab === t && { borderBottomColor: C.purple, borderBottomWidth: 2.5 }]}
              onPress={() => { haptics.selection(); setTab(t as 'code' | 'size'); }}
              activeOpacity={0.8}
            >
              <Text style={[ewm.tabBtnTxt, { color: tab === t ? C.purple : C.dim }]}>{label2}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error bar */}
        {error ? (
          <View style={ewm.errorBar}>
            <MaterialIcons name="error-outline" size={13} color={C.red} />
            <Text style={ewm.errorText} numberOfLines={3}>{error}</Text>
          </View>
        ) : null}

        {/* Tab content */}
        {tab === 'size' ? (
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ padding: 16, gap: 20 }}>
              {/* Label */}
              <View style={{ gap: 8 }}>
                <Text style={ewm.fieldLabel}>WIDGET LABEL</Text>
                <TextInput
                  style={ewm.fieldInput}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="e.g. My Stats Card"
                  placeholderTextColor={C.dim}
                  autoCapitalize="words"
                />
                <Text style={ewm.fieldHint}>Shown in the pinned widgets list.</Text>
              </View>

              {/* Height */}
              <View style={{ gap: 8 }}>
                <Text style={ewm.fieldLabel}>CUSTOM HEIGHT (px)</Text>
                <TextInput
                  style={ewm.fieldInput}
                  value={heightInput}
                  onChangeText={v => setHeightInput(v.replace(/[^0-9]/g, ''))}
                  placeholder="Leave empty for auto-height"
                  placeholderTextColor={C.dim}
                  keyboardType="numeric"
                />
                <Text style={ewm.fieldHint}>
                  {heightInput && parseInt(heightInput) > 0
                    ? `Fixed: ${Math.max(60, Math.min(1200, parseInt(heightInput)))}px  (min 60, max 1200)`
                    : 'Auto — widget sizes itself to its content.'}
                </Text>
              </View>

              {/* Quick presets */}
              <View style={{ gap: 8 }}>
                <Text style={ewm.fieldLabel}>QUICK PRESETS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {([['Auto', ''], ['Small', '100'], ['Medium', '180'], ['Large', '280'], ['XL', '400'], ['XXL', '600']] as [string, string][]).map(([lbl, h]) => (
                    <TouchableOpacity
                      key={lbl}
                      style={[ewm.presetChip, heightInput === h && { backgroundColor: C.purple + '28', borderColor: C.purple }]}
                      onPress={() => { haptics.selection(); setHeightInput(h); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[ewm.presetChipTxt, heightInput === h && { color: C.purple }]}>{lbl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tip card */}
              <View style={{ backgroundColor: C.teal + '08', borderRadius: 10, borderWidth: 1, borderColor: C.teal + '25', padding: 14, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <MaterialIcons name="info-outline" size={13} color={C.teal} />
                  <Text style={{ fontSize: 9, fontWeight: '900', color: C.teal, fontFamily: MONO, letterSpacing: 1 }}>RESIZE TIPS</Text>
                </View>
                <Text style={{ fontSize: 9, color: C.dim, fontFamily: MONO, lineHeight: 15 }}>
                  {'• Drag the grip bars at top/bottom of any widget to resize live.\n• Set a fixed height here to lock the size permanently.\n• "Auto" lets the widget grow with its content.'}
                </Text>
              </View>
            </View>
          </ScrollView>
        ) : (
          <>
            {preview ? (
              <View style={ewm.previewBox}>
                <Text style={ewm.previewLabel}>LIVE PREVIEW</Text>
                {preview}
              </View>
            ) : null}
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput
                style={ewm.codeInput}
                value={code}
                onChangeText={v => { setCode(v); setError(''); setPreview(null); }}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                placeholder={'return React.createElement(View, { style: { padding: 16 } },\n  React.createElement(Text, { style: { color: "#00FF88" } }, "Hello!")\n);'}
                placeholderTextColor={C.dim}
                textAlignVertical="top"
                scrollEnabled={false}
              />
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}

const ewm = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16,
                  paddingTop: Platform.OS === 'android' ? 40 : 60, paddingBottom: 14,
                  borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  title:        { fontSize: 18, fontWeight: '900', color: '#FFFFFF', fontFamily: MONO, letterSpacing: 0.5 },
  sub:          { fontSize: 9, color: C.dim, fontFamily: MONO },
  previewBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 9,
                  paddingHorizontal: 10, paddingVertical: 8, borderColor: C.teal + '55', backgroundColor: C.teal + '0A' },
  saveBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.purple,
                  borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8,
                  ...Platform.select({ ios:{ shadowColor:C.purple, shadowOffset:{width:0,height:4}, shadowOpacity:0.5, shadowRadius:10 }, android:{ elevation:6 } }) },
  headerBtnTxt: { fontSize: 11, fontWeight: '900', color: '#000', fontFamily: MONO },
  tabRow:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  tabBtn:       { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnTxt:    { fontSize: 11, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  fieldLabel:   { fontSize: 9, fontWeight: '900', color: C.dim, fontFamily: MONO, letterSpacing: 1.5 },
  fieldHint:    { fontSize: 9, color: C.dim + '99', fontFamily: MONO, lineHeight: 14 },
  fieldInput:   { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.purple + '55',
                  borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11,
                  fontSize: 14, color: C.text, fontFamily: MONO },
  presetChip:   { borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 8,
                  borderColor: C.border, backgroundColor: C.surface },
  presetChipTxt:{ fontSize: 11, fontWeight: '700', color: C.textMid, fontFamily: MONO },
  errorBar:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 16, paddingVertical: 9,
                  backgroundColor: C.red + '12', borderBottomWidth: 1, borderBottomColor: C.red + '40' },
  errorText:    { flex: 1, fontSize: 10, color: C.red, fontFamily: MONO, lineHeight: 15 },
  previewBox:   { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: '#030810' },
  previewLabel: { fontSize: 8, fontWeight: '900', color: C.teal + '80', fontFamily: MONO, letterSpacing: 1.5, marginBottom: 8 },
  codeInput:    { padding: 16, fontSize: 13, color: '#A8D8B8', fontFamily: MONO, lineHeight: 21,
                  minHeight: 400, backgroundColor: '#030810' },
});

// ── Inline content card — renders widget in normal flow ────────────────────────
function InlineWidgetCard({
  widget,
  onRemove,
  onEdit,
  onResize,
}: {
  widget: PinnedWidget;
  onRemove: (id: string) => void;
  onEdit: (w: PinnedWidget) => void;
  onResize: (id: string, height: number) => void;
}) {
  const [el,  setEl]  = useState<React.ReactNode | null>(null);
  const [err, setErr] = useState('');
  const [customHeight, setCustomHeight] = useState<number | undefined>(widget.height);

  useEffect(() => { setCustomHeight(widget.height); }, [widget.height]);

  useEffect(() => {
    _log('info', 'InlineWidgetCard', `Rendering widget "${widget.label}" on ${widget.pageId}`);
    const { el: rendered, err: renderErr } = evaluateWidgetCode(widget.code);
    setEl(rendered);
    setErr(renderErr);
    if (renderErr) {
      _log('error', 'InlineWidgetCard', `Widget render failed: ${renderErr}`, { widgetId: widget.id, label: widget.label });
    }
  }, [widget.code, widget.id]);

  const handleResize = (id: string, newHeight: number) => {
    setCustomHeight(newHeight > 0 ? newHeight : undefined);
    onResize(id, newHeight);
  };

  return (
    <View style={[iwc.outer, customHeight && customHeight > 0 ? { height: customHeight } : {}]}>
      {/* Top drag handle */}
      <ResizeHandle
        widgetId={widget.id}
        currentHeight={customHeight ?? 120}
        position="top"
        onResize={handleResize}
      />

      {/* Action buttons: edit (opens local modal) + delete */}
      <View style={iwc.actionRow}>
        <TouchableOpacity
          onPress={() => { haptics.light(); onEdit(widget); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[iwc.actionBtn, { borderColor: C.teal + '70', backgroundColor: C.teal + '18' }]}
        >
          <MaterialIcons name="edit" size={11} color={C.teal} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            haptics.medium();
            Alert.alert(
              'Delete Widget',
              `Permanently delete "${widget.label}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'DELETE', style: 'destructive', onPress: () => onRemove(widget.id) },
              ]
            );
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[iwc.actionBtn, { borderColor: C.red + '70', backgroundColor: C.red + '18' }]}
        >
          <MaterialIcons name="delete-outline" size={11} color={C.red} />
        </TouchableOpacity>
      </View>

      <View style={[iwc.content, customHeight && customHeight > 0 ? { flex: 1, overflow: 'hidden' } : {}]}>
        {err ? (
          <View style={iwc.errorBox}>
            <MaterialIcons name="error-outline" size={14} color={C.red} />
            <View style={{ flex: 1 }}>
              <Text style={iwc.errorTitle}>Widget Error</Text>
              <Text style={iwc.errorTxt} numberOfLines={4}>{err}</Text>
              <Text style={iwc.errorHint}>Tap ✏ to edit and fix the code.</Text>
            </View>
          </View>
        ) : el ? el : (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={C.purple} />
          </View>
        )}
      </View>

      {/* Bottom drag handle */}
      <ResizeHandle
        widgetId={widget.id}
        currentHeight={customHeight ?? 120}
        position="bottom"
        onResize={handleResize}
      />
    </View>
  );
}

const iwc = StyleSheet.create({
  outer: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    marginBottom: 4,
    position: 'relative',
  },
  content:    {},
  actionRow: {
    position: 'absolute', top: 14, right: 4,
    flexDirection: 'row', gap: 5, zIndex: 15,
  },
  actionBtn: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderRadius: 10, padding: 12,
    borderColor: '#FF334440', backgroundColor: '#FF334412', margin: 8,
  },
  errorTitle:{ fontSize: 11, fontWeight: '900', color: '#FF3344', fontFamily: MONO, marginBottom: 3 },
  errorTxt:  { fontSize: 9, color: '#FF3344', fontFamily: MONO, lineHeight: 14 },
  errorHint: { fontSize: 9, color: '#FF334480', fontFamily: MONO, marginTop: 5, fontStyle: 'italic' },
});

// ── Floating draggable widget (overlay mode) ─────────────────────────────────
function DraggablePinnedWidget({
  widget,
  onRemove,
  onEdit,
  onPositionChange,
}: {
  widget: PinnedWidget;
  onRemove: (id: string) => void;
  onEdit: (w: PinnedWidget) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
}) {
  const posX  = useRef(new Animated.Value(widget.x)).current;
  const posY  = useRef(new Animated.Value(widget.y)).current;
  const lastX = useRef(widget.x);
  const lastY = useRef(widget.y);
  const [el,  setEl]  = useState<React.ReactNode | null>(null);
  const [err, setErr] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const { el: rendered, err: renderErr } = evaluateWidgetCode(widget.code);
    setEl(rendered);
    setErr(renderErr);
    if (renderErr) _log('error', 'DraggablePinnedWidget', renderErr, { id: widget.id });
  }, [widget.code]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        posX.stopAnimation(v => { lastX.current = v; });
        posY.stopAnimation(v => { lastY.current = v; });
      },
      onPanResponderMove: (_, g) => {
        posX.setValue(Math.max(0, lastX.current + g.dx));
        posY.setValue(Math.max(0, lastY.current + g.dy));
      },
      onPanResponderRelease: (_, g) => {
        const nx = Math.max(0, lastX.current + g.dx);
        const ny = Math.max(0, lastY.current + g.dy);
        lastX.current = nx;
        lastY.current = ny;
        onPositionChange(widget.id, nx, ny);
      },
    })
  ).current;

  return (
    <Animated.View style={[
      dpw.container,
      { left: posX, top: posY },
      Platform.OS === 'ios'
        ? { shadowColor: C.purple, shadowOffset:{width:0,height:4}, shadowOpacity:0.5, shadowRadius:16 }
        : { elevation: 20 },
    ]}>
      <View {...panResponder.panHandlers} style={dpw.handle}>
        <View style={dpw.handleDots}>
          {[0,1,2,3,4,5].map(i => (
            <View key={i} style={[dpw.dot, { backgroundColor: C.purple + '90' }]} />
          ))}
        </View>
        <Text style={dpw.handleLabel} numberOfLines={1}>{widget.label || 'WIDGET'}</Text>
        <View style={dpw.handleActions}>
          <TouchableOpacity onPress={() => { haptics.light(); setCollapsed(v => !v); }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={dpw.iconBtn}>
            <MaterialIcons name={collapsed ? 'expand-more' : 'expand-less'} size={12} color={C.teal} />
          </TouchableOpacity>
          {/* Edit opens local modal via onEdit prop */}
          <TouchableOpacity onPress={() => { haptics.medium(); onEdit(widget); }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={dpw.iconBtn}>
            <MaterialIcons name="edit" size={12} color={C.teal} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            haptics.medium();
            Alert.alert('Remove Widget', `Remove "${widget.label}"?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'REMOVE', style: 'destructive', onPress: () => onRemove(widget.id) },
            ]);
          }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={dpw.iconBtn}>
            <MaterialIcons name="close" size={12} color={C.red} />
          </TouchableOpacity>
        </View>
      </View>

      {!collapsed ? (
        <View style={dpw.content}>
          {err ? (
            <View style={dpw.errorBox}>
              <MaterialIcons name="error-outline" size={14} color={C.red} />
              <Text style={dpw.errorTxt} numberOfLines={3}>{err}</Text>
            </View>
          ) : el ? el : <ActivityIndicator size="small" color={C.purple} />}
        </View>
      ) : null}

      <View style={dpw.pinnedBadge}>
        <MaterialIcons name="push-pin" size={8} color={C.green + '80'} />
        <Text style={dpw.pinnedTxt}>FLOATING</Text>
      </View>
    </Animated.View>
  );
}

const dpw = StyleSheet.create({
  container: {
    position: 'absolute', zIndex: 500,
    backgroundColor: '#050C14', borderRadius: 13,
    borderWidth: 1.5, borderColor: '#BB33FF55', overflow: 'hidden',
    minWidth: 120, maxWidth: SW - 20,
  },
  handle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: '#0A1018', borderBottomWidth: 1, borderBottomColor: '#BB33FF30',
  },
  handleDots:    { flexDirection: 'row', flexWrap: 'wrap', width: 18, gap: 2 },
  dot:           { width: 3, height: 3, borderRadius: 1.5 },
  handleLabel:   { flex: 1, fontSize: 9, fontWeight: '900', color: '#BB33FFCC', fontFamily: MONO, letterSpacing: 0.8 },
  handleActions: { flexDirection: 'row', gap: 4 },
  iconBtn:       { width: 22, height: 22, borderRadius: 6, backgroundColor: '#0F1822', alignItems: 'center', justifyContent: 'center' },
  content:       { padding: 12 },
  errorBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderWidth: 1, borderRadius: 8,
                   padding: 9, borderColor: '#FF334440', backgroundColor: '#FF334412' },
  errorTxt:      { flex: 1, fontSize: 9, color: '#FF3344', fontFamily: MONO, lineHeight: 14 },
  pinnedBadge:   { position: 'absolute', bottom: 4, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, opacity: 0.5 },
  pinnedTxt:     { fontSize: 7, fontWeight: '900', color: '#00FF88', fontFamily: MONO, letterSpacing: 0.5 },
});

// ── Shared widget state manager hook ─────────────────────────────────────────
function usePageWidgets(pageId: string, placement: WidgetPlacement | 'all') {
  const [widgets,  setWidgets]  = useState<PinnedWidget[]>([]);
  const [editing,  setEditing]  = useState<PinnedWidget | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const loadWidgets = useCallback(async () => {
    try {
      let w: PinnedWidget[];
      if (placement === 'all') {
        w = await widgetStorage.getForPage(pageId);
      } else {
        w = await widgetStorage.getForPageByPlacement(pageId, placement);
      }
      setWidgets(w);
      _log('info', 'WidgetLayer', `Loaded ${w.length} widgets for ${pageId} (${placement})`);
    } catch (e: any) {
      _log('error', 'WidgetLayer', `Failed to load widgets: ${e?.message}`, { pageId });
    }
  }, [pageId, placement]);

  useEffect(() => {
    loadWidgets();
    const key = `__widgetLayerRefresh_${pageId}_${placement}`;
    (global as any)[key] = loadWidgets;
    const prev = (global as any).__widgetLayerRefresh;
    (global as any).__widgetLayerRefresh = () => { loadWidgets(); prev?.(); };
    return () => {
      delete (global as any)[key];
      if ((global as any).__widgetLayerRefresh === loadWidgets) {
        delete (global as any).__widgetLayerRefresh;
      }
    };
  }, [loadWidgets]);

  const handleRemove = useCallback(async (id: string) => {
    try {
      await widgetStorage.remove(id);
      setWidgets(prev => prev.filter(w => w.id !== id));
      _log('info', 'WidgetLayer', `Removed widget ${id} from ${pageId}`);
      haptics.success();
    } catch (e: any) {
      _log('error', 'WidgetLayer', `Remove failed: ${e?.message}`);
    }
  }, [pageId]);

  // Opens the local EditWidgetModal — no global dependency
  const handleEdit = useCallback((widget: PinnedWidget) => {
    setEditing(widget);
    setShowEdit(true);
  }, []);

  const handleSaveEdit = useCallback(async (id: string, code: string, label: string) => {
    try {
      await widgetStorage.updateCode(id, code, label);
      setWidgets(prev => prev.map(w => w.id === id ? { ...w, code, label } : w));
      _log('info', 'WidgetLayer', `Updated widget ${id}`);
      haptics.success();
    } catch (e: any) {
      _log('error', 'WidgetLayer', `Save edit failed: ${e?.message}`);
    }
  }, []);

  const handleResize = useCallback(async (id: string, height: number) => {
    try {
      if (height <= 0) {
        await widgetStorage.updateHeight(id, 0);
        setWidgets(prev => prev.map(w => w.id === id ? { ...w, height: undefined } : w));
      } else {
        const clamped = Math.max(60, Math.min(1200, Math.round(height)));
        await widgetStorage.updateHeight(id, clamped);
        setWidgets(prev => prev.map(w => w.id === id ? { ...w, height: clamped } : w));
      }
    } catch (e: any) {
      _log('error', 'WidgetLayer', `Resize failed: ${e?.message}`);
    }
  }, []);

  const handlePositionChange = useCallback(async (id: string, x: number, y: number) => {
    try {
      await widgetStorage.updatePosition(id, x, y);
    } catch {}
  }, []);

  const closeEdit = useCallback(() => {
    setShowEdit(false);
    setEditing(null);
  }, []);

  return {
    widgets, editing, showEdit, setShowEdit, setEditing,
    handleRemove, handleEdit, handleSaveEdit,
    handlePositionChange, handleResize, loadWidgets, closeEdit,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 1: WidgetLayer — floating absolute overlays (original behavior)
// ─────────────────────────────────────────────────────────────────────────────
export function WidgetLayer({ pageId }: { pageId: string }) {
  const {
    widgets, editing, showEdit,
    handleRemove, handleEdit, handleSaveEdit, handlePositionChange, handleResize, closeEdit,
  } = usePageWidgets(pageId, 'floating');

  if (widgets.length === 0) return null;

  return (
    <>
      {widgets.map(widget => (
        <DraggablePinnedWidget
          key={widget.id}
          widget={widget}
          onRemove={handleRemove}
          onEdit={handleEdit}
          onPositionChange={handlePositionChange}
        />
      ))}
      <EditWidgetModal
        visible={showEdit}
        widget={editing}
        onClose={closeEdit}
        onSave={handleSaveEdit}
        onResize={handleResize}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 2: InlineWidgetSlot — normal content flow
// ─────────────────────────────────────────────────────────────────────────────
export function InlineWidgetSlot({ pageId, position }: {
  pageId: string;
  position: 'inline-top' | 'inline-middle' | 'inline-bottom';
}) {
  const {
    widgets, editing, showEdit,
    handleRemove, handleEdit, handleSaveEdit, handleResize, closeEdit,
  } = usePageWidgets(pageId, position);

  if (widgets.length === 0) return null;

  return (
    <>
      <View style={iws.container}>
        {widgets.map(widget => (
          <InlineWidgetCard
            key={widget.id}
            widget={widget}
            onRemove={handleRemove}
            onEdit={handleEdit}
            onResize={handleResize}
          />
        ))}
      </View>
      <EditWidgetModal
        visible={showEdit}
        widget={editing}
        onClose={closeEdit}
        onSave={handleSaveEdit}
        onResize={handleResize}
      />
    </>
  );
}

const iws = StyleSheet.create({
  container: { marginBottom: 0 },
});
