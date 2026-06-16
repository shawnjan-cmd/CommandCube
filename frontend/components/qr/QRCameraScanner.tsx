/**
 * QRCameraScanner — Lazy-loaded QR camera scanner.
 *
 * WHY THIS FILE EXISTS
 * ────────────────────
 * `expo-camera` is a native module that, when imported at MODULE-LOAD
 * time on Android with New Architecture + Hermes, crashes the cold-start
 * because the native bridge isn't ready yet. The whole app fails to
 * render → black screen.
 *
 * By putting `expo-camera` imports in THIS file (and ONLY this file),
 * and importing it dynamically via `React.lazy(() => import(...))`,
 * the native module is NEVER touched until the user actually opens the
 * QR scanner modal. By then, the bridge is fully alive.
 *
 * DO NOT RE-IMPORT expo-camera AT THE TOP OF nexushome.tsx. EVER.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

interface RationaleProps { visible: boolean; onAllow: () => void; onDeny: () => void; }
export function CameraPermissionRationale({ visible, onAllow, onDeny }: RationaleProps) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={r.wrap}>
        <View style={r.dialog}>
          <Text style={[r.title, { fontFamily: MONO }]}>CAMERA REQUIRED</Text>
          <Text style={[r.body, { fontFamily: MONO }]}>
            Butler AI needs camera access to scan the QR code displayed on
            your PC server. Used only for pairing — never for monitoring.
          </Text>
          <TouchableOpacity onPress={onAllow} style={r.allow}>
            <Text style={[r.allowTxt, { fontFamily: MONO }]}>ALLOW CAMERA</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDeny} style={r.deny}>
            <Text style={[r.denyTxt, { fontFamily: MONO }]}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

interface ScannerProps {
  /** Called when a barcode/QR is scanned. */
  onScanned: (data: string) => void;
  /** Color for the corner HUD brackets. */
  hudColor?: string;
  /** Optional children rendered ON TOP of the camera view (e.g. masks). */
  children?: React.ReactNode;
}

/**
 * The actual camera surface. Renders ONLY when the parent has confirmed
 * camera permission is granted. Falls back to a permission prompt
 * otherwise. Uses the lazy-loaded `expo-camera` module.
 */
export default function QRCameraScanner({ onScanned, hudColor = '#00d8ff', children }: ScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [showRationale, setShowRationale] = React.useState(false);

  if (!permission) {
    // Hook is still warming up — render nothing (one paint).
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (!permission.granted) {
    return (
      <>
        <CameraPermissionRationale
          visible={showRationale}
          onAllow={async () => { setShowRationale(false); await requestPermission(); }}
          onDeny={() => setShowRationale(false)}
        />
        <View style={s.permWrap}>
          <MaterialIcons name="camera-alt" size={48} color="#8C95A6" />
          <Text style={[s.permTxt, { fontFamily: MONO }]}>
            Camera permission needed to scan QR code
          </Text>
          <TouchableOpacity
            onPress={() => setShowRationale(true)}
            style={[s.permBtn, { backgroundColor: hudColor }]}>
            <Text style={[s.permBtnTxt, { fontFamily: MONO }]}>ENABLE CAMERA</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Permission granted — render the camera.
  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={({ data }: any) => onScanned(data)}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}>
        {children}
      </CameraView>
    </View>
  );
}

const r = StyleSheet.create({
  wrap:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog:  { backgroundColor: '#0B1622', borderRadius: 18, borderWidth: 1.5, borderColor: '#00d8ff40', padding: 22, width: '100%', maxWidth: 360 },
  title:   { fontSize: 16, fontWeight: '900', color: '#D6DFEA', marginBottom: 10 },
  body:    { fontSize: 12, color: '#8C95A6', lineHeight: 18, marginBottom: 18 },
  allow:   { backgroundColor: '#00d8ff', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  allowTxt:{ fontSize: 13, fontWeight: '900', color: '#000' },
  deny:    { borderWidth: 1, borderColor: '#8C95A640', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  denyTxt: { fontSize: 12, color: '#8C95A6' },
});

const s = StyleSheet.create({
  permWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  permTxt:    { fontSize: 14, color: '#C8D2E0', textAlign: 'center', lineHeight: 20 },
  permBtn:    { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnTxt: { fontSize: 13, fontWeight: '900', color: '#000' },
});
