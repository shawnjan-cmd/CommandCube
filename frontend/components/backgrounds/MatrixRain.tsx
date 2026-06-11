/**
 * 🌧️ MATRIX RAIN BACKGROUND
 * Animated falling code characters - iconic cyber aesthetic
 * 
 * NOTE: Web-only component. Returns empty view on mobile.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

export default function MatrixRain() {
  const canvasRef = useRef<any>(null);

  useEffect(() => {
    // Only run on web platform
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;

    try {
      const canvas = document.createElement('canvas');
      const { innerWidth, innerHeight } = window;
      
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.opacity = '0.2';
      canvas.style.pointerEvents = 'none';

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Matrix characters
      const chars = '01<>{}BOTLER=+-'.split('');
      const columns = Math.floor(innerWidth / 11);
      const drops: number[] = Array(columns).fill(1);

      function draw() {
        if (!ctx) return;

        // Fade effect
        ctx.fillStyle = 'rgba(6, 11, 18, 0.07)';
        ctx.fillRect(0, 0, innerWidth, innerHeight);

        // Draw characters
        ctx.font = '9px "Share Tech Mono", monospace';
        
        for (let i = 0; i < drops.length; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const opacity = Math.random() * 0.07 + 0.01;
          ctx.fillStyle = `rgba(0, 229, 160, ${opacity})`;
          ctx.fillText(char, i * 11, drops[i] * 11);

          // Reset drop
          if (drops[i] * 11 > innerHeight && Math.random() > 0.985) {
            drops[i] = 0;
          }
          drops[i]++;
        }
      }

      const interval = setInterval(draw, 70);

      // Mount canvas
      const container = canvasRef.current;
      if (container) {
        container.appendChild(canvas);
      }

      return () => {
        clearInterval(interval);
        if (container && canvas.parentNode === container) {
          container.removeChild(canvas);
        }
      };
    } catch (error) {
      console.warn('[MatrixRain] Web canvas not available:', error);
    }
  }, []);

  // Return empty view - matrix effect is web-only
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
});
