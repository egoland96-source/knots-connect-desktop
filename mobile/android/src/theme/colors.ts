/**
 * Knots Connect — Marka renkleri
 * Koyu temalı, turkuaz vurgulu palet
 */

export const colors = {
  // Arka plan katmanları
  background: '#080E14',
  surface: '#0D151D',
  surfaceAlt: '#111C26',
  surfaceRaised: '#162231',
  border: '#1E2C38',
  borderLight: '#2A3B4D',

  // Metin
  text: '#F4F8FB',
  muted: '#7F91A3',
  mutedDark: '#5A6B7D',
  textInverse: '#080E14',

  // Marka renkleri
  cyan: '#35D5E8',
  cyanDim: '#1A9FAD',
  green: '#75F0A4',
  greenDim: '#3DAA62',
  blue: '#248BFF',
  purple: '#6757FF',
  purpleDim: '#4A3ACC',

  // Durum renkleri
  success: '#75F0A4',
  warning: '#F5C451',
  danger: '#FF5C5C',

  // Özel
  gradientStart: '#6757FF',
  gradientEnd: '#248BFF',
  routeLine: '#75F0A4',
  routeLineDim: '#3DAA62',
} as const;

export type ColorScheme = typeof colors;
