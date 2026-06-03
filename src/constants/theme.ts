/**
 * Design system: Latīna — Tyrian Purple identity.
 * Primary: #66023C (Tyrian purple, Roman imperial).
 * Serif headlines: Libre Caslon Text.
 * Keeps all token keys consumed by themed-text / themed-view.
 */

import { Platform } from 'react-native';

const palette = {
  // ── Tyrian Purple — Roman imperial primary ──────────────────────────────
  tyrian: '#66023C',         // primary action, hero bg (light)
  tyrianDeep: '#4A0129',     // pressed state
  tyrianNight: '#A8336B',    // dark mode primary (lighter for contrast)

  // ── Violet — rank / achievement (secondary) ─────────────────────────────
  violet: '#5B2A86',
  violetSoft: '#8E6FB0',

  // ── Gold — imperial coin / XP ───────────────────────────────────────────
  gold: '#C9A227',
  goldSoft: '#E4C766',

  // ── Scholar Green ───────────────────────────────────────────────────────
  green: '#2E7A4F',
  greenSoft: '#4E9B6E',

  // ── Danger ─────────────────────────────────────────────────────────────
  red: '#B82E2E',
  redNight: '#D44E4E',

  // ── Light neutrals — subtle purple tint (not warm parchment) ───────────
  alabaster: '#F7F4F6',      // page background, barely-there purple tint
  surface: '#FFFFFF',        // card / elevated surface
  muted: '#EDE5EC',          // muted fill, progress track
  border: '#E0D0DB',         // hairline border

  // ── Ink — purple-tinted near-black ─────────────────────────────────────
  ink: '#1A0514',
  inkSoft: '#6B3A5A',

  // ── Night ───────────────────────────────────────────────────────────────
  nightBg: '#0E0A0D',
  nightElev: '#1E1019',
  nightElev2: '#2B1825',
  nightBorder: '#3D2235',
  nightText: '#F5EEF3',
  nightTextSoft: '#B89DB0',

  // ── Hero slab — always dark, even in light mode ─────────────────────────
  stone: '#1E1019',
  stoneText: '#F5EEF3',
  stoneTextSoft: '#B89DB0',
} as const;

export const Colors = {
  light: {
    text: palette.ink,
    textSecondary: palette.inkSoft,
    background: palette.alabaster,
    backgroundElement: palette.surface,
    backgroundSelected: palette.muted,
    card: palette.surface,
    border: palette.border,
    primary: palette.tyrian,
    primaryText: '#FFFFFF',
    accent: palette.gold,
    purple: palette.violet,
    success: palette.green,
    danger: palette.red,
    muted: palette.muted,
  },
  dark: {
    text: palette.nightText,
    textSecondary: palette.nightTextSoft,
    background: palette.nightBg,
    backgroundElement: palette.nightElev,
    backgroundSelected: palette.nightElev2,
    card: palette.nightElev,
    border: palette.nightBorder,
    primary: palette.tyrianNight,
    primaryText: '#FFFFFF',
    accent: palette.goldSoft,
    purple: palette.violetSoft,
    success: palette.greenSoft,
    danger: palette.redNight,
    muted: palette.nightElev2,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemeColors = (typeof Colors)['light'];

export { palette };

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'LibreCaslonText_700Bold',
    serifBody: 'LibreCaslonText_400Regular',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'LibreCaslonText_700Bold',
    serifBody: 'LibreCaslonText_400Regular',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'system-ui, sans-serif',
    serif: 'LibreCaslonText_700Bold, Georgia, serif',
    serifBody: 'LibreCaslonText_400Regular, Georgia, serif',
    rounded: 'system-ui, sans-serif',
    mono: 'monospace',
  },
})!;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 28,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 70 }) ?? 0;
export const MaxContentWidth = 720;
