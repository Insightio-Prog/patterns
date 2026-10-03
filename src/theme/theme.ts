/**
 * Patterns — design tokens (single source of truth)
 *
 * RULES:
 * - Never use raw hex values in components — always import from here
 * - accent is used sparingly — data and action only, never decoration
 * - GeistMono for every number, count, score, badge, label
 * - Geist for every sentence, body copy, conversational text
 * - Border radius never exceeds 12px
 * - Borders are always 1px hairlines — no drop shadows for elevation
 * - To switch accent: swap accent token value here, nowhere else
 */

export const color = {
  // Surfaces (warm near-black ramp)
  bg: '#141210',
  surface: '#1C1A16',
  surface2: '#232019',
  surface3: '#2A2620',
  border: '#2C2823',
  border2: '#3A352C',

  // Text
  text1: '#ECE7DD',
  /** Softer than text1: for large titles so they don't glare on dark. */
  title: '#C9C2B6',
  text2: '#948C80',
  text3: '#635C52',

  // Accent (warm orange — one accent, used sparingly)
  accent: '#FF6B35',
  accentAlt: '#F5A623', // Terminal amber alternative (swap here to change)
  accentInk: '#1A1206',

  // Semantic
  success: '#6FA67C',
  warn: '#E2A33C',
  danger: '#C9603F',

  // Light card surface (optional variant for status card emphasis)
  cardLBg: '#ECE6D9',
  cardLSurf: '#E1DACA',
  cardLText1: '#211F1A',
  cardLText2: '#6A6356',
  cardLText3: '#938B7C',
  cardLBorder: '#D6CDBC',
} as const;

export const font = {
  ui: 'Geist-Regular',
  uiMedium: 'Geist-Medium',
  uiSemiBold: 'Geist-SemiBold',
  mono: 'GeistMono-Regular',
} as const;

export const fontSize = {
  wordmark: 19,
  headline: 17,
  body: 13.5,
  rowLabel: 14,
  secondary: 13,
  monoLabel: 11,
  monoMicro: 10,
  monoData: 12,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
} as const;

export const letterSpacing = {
  monoLabel: 1.2,
  monoMicro: 1.4,
} as const;

export const lineHeight = {
  body: 1.45,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  cardPad: 15,
  cardGap: 14,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
} as const;

export default {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  space,
  radius,
};
