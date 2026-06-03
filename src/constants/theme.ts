/**
 * Design system for the Latina app.
 * Classical, warm palette (parchment, terracotta, imperial purple, gold).
 * Keeps the keys consumed by themed-text / themed-view and extends them.
 */

import { Platform } from 'react-native';

const palette = {
  terracotta: '#B23A2E',
  terracottaDark: '#8E2C22',
  gold: '#C9A227',
  goldSoft: '#E4C766',
  purple: '#5B2A86',
  purpleSoft: '#8E6FB0',
  green: '#3F8F5B',
  greenSoft: '#5FB07C',
  red: '#C0392B',
  parchment: '#F7F1E1',
  parchmentDeep: '#EFE6CE',
  ink: '#2B2218',
  inkSoft: '#6B6052',
  nightBg: '#15120D',
  nightElev: '#211C15',
  nightElev2: '#2C261C',
  nightText: '#F3EAD7',
  nightTextSoft: '#B6AB94',
} as const;

export const Colors = {
  light: {
    text: palette.ink,
    textSecondary: palette.inkSoft,
    background: palette.parchment,
    backgroundElement: '#FFFFFF',
    backgroundSelected: palette.parchmentDeep,
    card: '#FFFFFF',
    border: '#E2D7BD',
    primary: palette.terracotta,
    primaryText: '#FFFFFF',
    accent: palette.gold,
    purple: palette.purple,
    success: palette.green,
    danger: palette.red,
    muted: palette.parchmentDeep,
  },
  dark: {
    text: palette.nightText,
    textSecondary: palette.nightTextSoft,
    background: palette.nightBg,
    backgroundElement: palette.nightElev,
    backgroundSelected: palette.nightElev2,
    card: palette.nightElev,
    border: '#3A3225',
    primary: '#D2553F',
    primaryText: '#FFFFFF',
    accent: palette.goldSoft,
    purple: palette.purpleSoft,
    success: palette.greenSoft,
    danger: '#E05B4C',
    muted: palette.nightElev2,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemeColors = (typeof Colors)['light'];

export { palette };

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'Georgia',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'system-ui, sans-serif',
    serif: 'Georgia, serif',
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
