'use client';

import { useEffect } from 'react';
import { useTenant } from '@/context/TenantContext';

/* Parse "#rrggbb" / "#rgb" into [r,g,b]. Returns null on bad input. */
function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/* Mix a channel toward white (amount > 0) or black (amount < 0). */
function mix([r, g, b], amount) {
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return [
    Math.round(r + (target - r) * t),
    Math.round(g + (target - g) * t),
    Math.round(b + (target - b) * t),
  ];
}

/* Build a 50–900 palette from a single base color. */
function buildPalette(base) {
  return {
    50: mix(base, 0.92),
    100: mix(base, 0.84),
    200: mix(base, 0.68),
    300: mix(base, 0.48),
    400: mix(base, 0.24),
    500: base,
    600: mix(base, -0.12),
    700: mix(base, -0.3),
    800: mix(base, -0.46),
    900: mix(base, -0.6),
  };
}

export default function ThemeInjector() {
  const { hotel } = useTenant() || {};
  const theme = hotel?.themeConfig || {};
  const primaryColor = theme.primaryColor;
  const backgroundColor = theme.backgroundColor;

  useEffect(() => {
    const root = document.documentElement;

    const base = hexToRgb(primaryColor);
    if (base) {
      const palette = buildPalette(base);
      Object.entries(palette).forEach(([shade, [r, g, b]]) => {
        root.style.setProperty(`--primary-${shade}`, `${r} ${g} ${b}`);
      });
    } else {
      // No custom primary — clear overrides so CSS defaults (gold) apply.
      [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].forEach((s) =>
        root.style.removeProperty(`--primary-${s}`)
      );
    }

    if (hexToRgb(backgroundColor)) {
      root.style.setProperty('--background', backgroundColor);
    } else {
      root.style.removeProperty('--background');
    }
  }, [primaryColor, backgroundColor]);

  return null;
}
