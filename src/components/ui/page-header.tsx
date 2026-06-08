import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/app';

type PageHeaderProps = {
  title: string;
  /**
   * Custom right-side content.
   * Defaults to a profile icon that navigates to /profile.
   * When provided, the caller is responsible for including all needed icons.
   */
  right?: ReactNode;
};

/** Standard tab-screen header: serif title left, streak + action(s) right, hairline rule below. */
export function PageHeader({ title, right }: PageHeaderProps) {
  const theme = useTheme();
  const streakCount = useApp((s) => s.streakCount);

  const handleProfilePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    router.push('/profile');
  };

  return (
    <>
      <View style={styles.row}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {right ?? (
          <View style={styles.rightGroup}>
            {/* Streak badge — always visible, restrained */}
            <View style={[styles.streakBadge, { backgroundColor: theme.muted }]}>
              <Ionicons name="flame" size={13} color={theme.accent} />
              <Text style={[styles.streakCount, { color: theme.textSecondary }]}>
                {streakCount}
              </Text>
            </View>
            <Pressable onPress={handleProfilePress} hitSlop={12}>
              <MaterialCommunityIcons name="shield-account-outline" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>
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
    flexShrink: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 0,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  streakCount: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
});
