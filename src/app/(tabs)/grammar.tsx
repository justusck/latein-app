import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { PARADIGMS } from '@/data/paradigms';
import { useTheme } from '@/hooks/use-theme';
import { getTopicsWithProgress, type TopicWithProgress } from '@/lib/grammar';

const STAGE_LABELS: Record<string, string> = {
  foundations: 'Grundlagen',
  morphology: 'Formenlehre',
  syntax: 'Syntax',
  advanced: 'Fortgeschritten',
};
const STAGE_ORDER = ['foundations', 'morphology', 'syntax', 'advanced'];

export default function GrammarScreen() {
  const theme = useTheme();
  const [topics, setTopics] = useState<TopicWithProgress[]>([]);

  useFocusEffect(
    useCallback(() => {
      setTopics(getTopicsWithProgress());
    }, []),
  );

  return (
    <Screen scroll padded={false}>
      <PageHeader title="Grammatik" />
      <View style={styles.content}>

      {/* ── Skill tree by stage ── */}
      {STAGE_ORDER.map((stage) => {
        const stageTopics = topics.filter((t) => t.topic.stage === stage);
        if (stageTopics.length === 0) return null;
        return (
          <View key={stage} style={styles.stageSection}>
            <View style={styles.stageHead}>
              <Text style={[styles.stageLabel, { color: theme.primary }]}>
                {STAGE_LABELS[stage] ?? stage}
              </Text>
              <View style={[styles.stageLine, { backgroundColor: theme.border }]} />
            </View>
            <View style={[styles.topicList, { borderColor: theme.border }]}>
              {stageTopics.map((t, i) => (
                <TopicRow
                  key={t.topic.id}
                  item={t}
                  theme={theme}
                  last={i === stageTopics.length - 1}
                />
              ))}
            </View>
          </View>
        );
      })}

      {/* ── Formentrainer ── */}
      <View style={styles.stageSection}>
        <View style={styles.stageHead}>
          <Text style={[styles.stageLabel, { color: theme.primary }]}>Formentrainer</Text>
          <View style={[styles.stageLine, { backgroundColor: theme.border }]} />
        </View>
        <Text style={[styles.stageCaption, { color: theme.textSecondary }]}>
          Fülle Deklinations- und Konjugationstabellen selbst aus.
        </Text>
        <View style={[styles.topicList, { borderColor: theme.border }]}>
          {PARADIGMS.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/trainer/${p.id}`)}
              style={({ pressed }) => [
                styles.row,
                i < PARADIGMS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                pressed && { opacity: 0.7 },
              ]}>
              <View style={[styles.rowIcon, { backgroundColor: theme.muted }]}>
                <Ionicons
                  name={p.kind === 'noun' ? 'layers-outline' : 'flash-outline'}
                  size={15}
                  color={theme.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{p.title}</Text>
                <Text style={[styles.rowSub, { color: theme.textSecondary }]} numberOfLines={1}>
                  {p.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={theme.border} />
            </Pressable>
          ))}
        </View>
      </View>

      </View>
    </Screen>
  );
}

// ── TopicRow ───────────────────────────────────────────────────────────────

function TopicRow({
  item,
  theme,
  last,
}: {
  item: TopicWithProgress;
  theme: ReturnType<typeof useTheme>;
  last: boolean;
}) {
  const { topic, stars, unlocked } = item;

  return (
    <Pressable
      onPress={unlocked ? () => router.push(`/grammar/${topic.id}`) : undefined}
      disabled={!unlocked}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && unlocked && { opacity: 0.7 },
      ]}>
      {/* Number or lock badge */}
      <View style={[
        styles.numBadge,
        { backgroundColor: unlocked ? theme.primary : theme.muted },
      ]}>
        {unlocked ? (
          <Text style={styles.numText}>{topic.orderIndex + 1}</Text>
        ) : (
          <Ionicons name="lock-closed" size={11} color={theme.textSecondary} />
        )}
      </View>

      {/* Title + summary */}
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.rowTitle, { color: unlocked ? theme.text : theme.textSecondary }]}>
          {topic.title}
        </Text>
        {topic.summary ? (
          <Text
            style={[styles.rowSub, { color: theme.textSecondary }]}
            numberOfLines={1}>
            {topic.summary}
          </Text>
        ) : null}
      </View>

      {/* Stars */}
      <View style={styles.stars}>
        {[1, 2, 3].map((s) => (
          <Ionicons
            key={s}
            name={s <= stars ? 'star' : 'star-outline'}
            size={13}
            color={s <= stars ? theme.accent : theme.border}
          />
        ))}
      </View>

      {unlocked && (
        <Ionicons name="chevron-forward" size={14} color={theme.border} style={{ marginLeft: 4 }} />
      )}
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },

  // Stage sections
  stageSection: { marginBottom: Spacing.four },
  stageHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  stageLabel: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  stageLine: { flex: 1, height: StyleSheet.hairlineWidth },
  stageCaption: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.two },

  // Row container (bordered group)
  topicList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },

  // Individual row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 13,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'transparent',
  },

  // Num badge
  numBadge: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  // Row text
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 1 },

  // Stars
  stars: { flexDirection: 'row', gap: 3 },

  // Formentrainer row icon
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
