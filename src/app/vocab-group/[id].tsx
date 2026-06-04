import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/ui/animated-progress';
import { Screen } from '@/components/ui/screen';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { getGroupProgress, getLemmasByGroup, type LemmaWithStatus } from '@/lib/vocab';

export default function VocabGroupScreen() {
  const theme = useTheme();
  const t = useStrings();
  const nav = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const [lemmas, setLemmas] = useState<LemmaWithStatus[]>([]);

  const group = useMemo(() => {
    const groups = getGroupProgress();
    return groups.find((g) => g.group === groupId);
  }, [groupId]);

  useEffect(() => {
    setLemmas(getLemmasByGroup(groupId));
  }, [groupId]);

  const title =
    groupId === 0
      ? t.customVocab
      : t.groupDetailTitle(groupId);

  useLayoutEffect(() => {
    nav.setOptions({ title });
  }, [nav, title]);

  const total = group?.total ?? lemmas.length;
  const introduced = group?.introduced ?? lemmas.filter((l) => l.status !== 'new').length;
  const known = group?.known ?? lemmas.filter((l) => l.status === 'known').length;
  const pct = total > 0 ? introduced / total : 0;

  const statusIcon = (s: LemmaWithStatus['status']) => {
    switch (s) {
      case 'known':
        return { name: 'checkmark-circle', color: theme.accent } as const;
      case 'introduced':
        return { name: 'time-outline', color: theme.primary } as const;
      default:
        return { name: 'ellipse-outline', color: theme.textSecondary } as const;
    }
  };

  if (!group && lemmas.length === 0) {
    return (
      <Screen scroll padded>
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {groupId === 0 ? t.customVocab : `Gruppe nicht gefunden`}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={lemmas}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.summary}>
            <Text style={[styles.summaryTitle, { color: theme.text }]}>{title}</Text>

            <View style={styles.summaryStats}>
              <Text style={[styles.summaryTotal, { color: theme.textSecondary }]}>
                {total} {total === 1 ? 'Wort' : 'Wörter'}
              </Text>
            </View>

            <AnimatedProgressBar progress={pct} height={8} color={theme.primary} />

            <View style={styles.chipRow}>
              <StatusBadge label={t.statusNew} count={total - introduced} color={theme.textSecondary} />
              <StatusBadge label={t.statusIntroduced} count={introduced - known} color={theme.primary} />
              <StatusBadge label={t.statusKnown} count={known} color={theme.accent} />
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const icon = statusIcon(item.status);
          const isLast = index === lemmas.length - 1;
          return (
            <View style={[styles.wordRow, !isLast && styles.wordRowBorder, { borderColor: theme.border }]}>
              <View style={styles.wordIcon}>
                <Ionicons name={icon.name} size={18} color={icon.color} />
              </View>
              <View style={styles.wordBody}>
                <View style={styles.wordHead}>
                  <Text style={[styles.wordLemma, { color: theme.text }]}>{item.lemma}</Text>
                  <Text style={[styles.wordStatus, { color: icon.color }]}>
                    {item.status === 'known'
                      ? t.statusKnown
                      : item.status === 'introduced'
                        ? t.statusIntroduced
                        : t.statusNew}
                  </Text>
                </View>
                {item.principalParts ? (
                  <Text style={[styles.wordParts, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.principalParts}
                  </Text>
                ) : null}
                <Text style={[styles.wordGloss, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.glossDe}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Keine Vokabeln in dieser Gruppe.
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

function StatusBadge({ label, count, color }: { label: string; count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
      <Text style={[styles.badgeCount, { color }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: Spacing.six,
  },

  // ── Summary header ─────────────────────────────────────────────────────
  summary: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  summaryTitle: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    letterSpacing: 0.3,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  summaryTotal: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Status chips ───────────────────────────────────────────────────────
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexWrap: 'wrap',
    marginTop: Spacing.half,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeLabel: { fontSize: 11, fontWeight: '700' },
  badgeCount: { fontSize: 11, fontWeight: '800' },

  // ── Word rows ──────────────────────────────────────────────────────────
  wordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  wordRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wordIcon: {
    width: 28,
    alignItems: 'center',
    paddingTop: 2,
  },
  wordBody: {
    flex: 1,
    gap: 2,
  },
  wordHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  wordLemma: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  wordStatus: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: Spacing.one,
  },
  wordParts: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  wordGloss: {
    fontSize: 13,
  },

  // ── Empty ──────────────────────────────────────────────────────────────
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
