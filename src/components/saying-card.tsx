import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDailySaying, type Saying } from '@/lib/sayings';

export function SayingCard() {
  const theme = useTheme();
  const [saying, setSaying] = useState<Saying | null>(null);

  const refresh = useCallback(() => {
    setSaying(getDailySaying());
  }, []);

  useFocusEffect(useCallback(() => refresh(), [refresh]));

  if (!saying) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        Sprichwort des Tages
      </Text>
      <Text style={[styles.latin, { color: theme.primary }]}>
        {saying.latin}
      </Text>
      <Text style={[styles.german, { color: theme.textSecondary }]}>
        {saying.german}
      </Text>
      {saying.source ? (
        <Text style={[styles.source, { color: theme.textSecondary }]}>
          {saying.source}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    marginBottom: Spacing.four,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  latin: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  german: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  source: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.6,
    marginTop: 2,
  },
});
