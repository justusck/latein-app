/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useApp } from '@/store/app';

export function useTheme() {
  const systemScheme = useColorScheme();
  const themeMode = useApp((s) => s.themeMode);
  const scheme = themeMode === 'system' ? (systemScheme ?? 'light') : themeMode;
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
