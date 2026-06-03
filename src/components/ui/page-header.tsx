import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PageHeaderProps = {
  title: string;
  /**
   * Custom right-side content.
   * Defaults to a settings icon that navigates to /settings.
   * When provided, the caller is responsible for including all needed icons.
   */
  right?: ReactNode;
};

/** Standard tab-screen header: serif title left, action(s) right, hairline rule below. */
export function PageHeader({ title, right }: PageHeaderProps) {
  const theme = useTheme();

  return (
    <>
      <View style={styles.row}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {right ?? (
          <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
            <Ionicons name="settings-outline" size={20} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
      <View style={[styles.rule, { backgroundColor: theme.border }]} />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    letterSpacing: 0.5,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
});
