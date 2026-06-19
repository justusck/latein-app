/**
 * Design system: 日本語 course — 藍 (indigo) identity on 和紙 (washi) paper.
 * Primary: indigo (藍色). Accent: vermilion (朱). Ink: sumi (墨).
 * Serif headlines: Noto Serif JP. Same token keys as the Latin theme so every
 * `useTheme()` / `Colors` consumer works unchanged.
 *
 * Placeholder defaults — refine later.
 */
import { Platform } from 'react-native';

import type { ThemeColors } from './theme';

const palette = {
  // ── 藍 Indigo — primary ──────────────────────────────────────────────────
  ai: '#1F3F75',         // indigo, primary (light)
  aiDeep: '#152C54',     // pressed
  aiNight: '#6E97D6',    // dark-mode primary (lighter for contrast)

  // ── 紫 Murasaki — rank / secondary ───────────────────────────────────────
  murasaki: '#6A4C93',
  murasakiSoft: '#A98BD0',

  // ── 朱 Vermilion — emphasis / XP ─────────────────────────────────────────
  shu: '#C8472E',
  shuSoft: '#E2734F',

  // ── 苔 Matcha green — success ────────────────────────────────────────────
  koke: '#5E7A3A',
  kokeSoft: '#8FA862',

  // ── Danger ───────────────────────────────────────────────────────────────
  red: '#B83A2E',
  redNight: '#D8604E',

  // ── 和紙 Washi — warm paper neutrals (light) ─────────────────────────────
  washi: '#F5F1E8',      // page background, warm off-white
  surface: '#FCFAF4',    // card / elevated surface
  muted: '#ECE5D6',      // muted fill, progress track
  border: '#E0D8C8',     // hairline border

  // ── 墨 Sumi — warm near-black ink ────────────────────────────────────────
  sumi: '#20201C',
  sumiSoft: '#5C574E',

  // ── Night ──────────────────────────────────────────────────────────────
  nightBg: '#14130F',
  nightElev: '#1F1D17',
  nightElev2: '#2B2820',
  nightBorder: '#36322A',
  nightText: '#F2EDE2',
  nightTextSoft: '#B0A892',
} as const;

export const ColorsJa: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    text: palette.sumi,
    textSecondary: palette.sumiSoft,
    background: palette.washi,
    backgroundElement: palette.surface,
    backgroundSelected: palette.muted,
    card: palette.surface,
    border: palette.border,
    primary: palette.ai,
    primaryText: '#FFFFFF',
    accent: palette.shu,
    purple: palette.murasaki,
    success: palette.koke,
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
    primary: palette.aiNight,
    primaryText: '#FFFFFF',
    accent: palette.shuSoft,
    purple: palette.murasakiSoft,
    success: palette.kokeSoft,
    danger: palette.redNight,
    muted: palette.nightElev2,
  },
};

export const FontsJa = Platform.select({
  ios: {
    sans: 'NotoSansJP_400Regular',
    serif: 'NotoSerifJP_700Bold',
    serifBody: 'NotoSerifJP_400Regular',
    rounded: 'NotoSansJP_500Medium',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'NotoSansJP_400Regular',
    serif: 'NotoSerifJP_700Bold',
    serifBody: 'NotoSerifJP_400Regular',
    rounded: 'NotoSansJP_500Medium',
    mono: 'monospace',
  },
  web: {
    sans: 'NotoSansJP_400Regular, sans-serif',
    serif: 'NotoSerifJP_700Bold, serif',
    serifBody: 'NotoSerifJP_400Regular, serif',
    rounded: 'NotoSansJP_500Medium, sans-serif',
    mono: 'monospace',
  },
})!;
