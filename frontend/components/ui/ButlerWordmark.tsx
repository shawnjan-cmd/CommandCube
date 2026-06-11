/**
 * ButlerWordmark — Renders the user-supplied BUTLER AI logo SVG (3 chip glyphs
 * + wordmark) at any size, crisp/vector HD. Background rect was stripped from
 * the source XML so it blends seamlessly into pure-black surfaces.
 */
import React from 'react';
import { SvgXml } from 'react-native-svg';
import { BUTLER_LOGO_XML } from './butlerLogoXml';

const ASPECT = 1096 / 1696; // source viewBox h/w

export function ButlerWordmark({ width }: { width: number }) {
  return (
    <SvgXml
      xml={BUTLER_LOGO_XML}
      width={width}
      height={Math.round(width * ASPECT)}
    />
  );
}
