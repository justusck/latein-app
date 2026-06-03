import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StatsHeader } from '@/components/stats-header';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
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
    <Screen scroll>
      <ThemedText type="title" style={{ marginBottom: Spacing.two }}>Grammatik</ThemedText>
      <StatsHeader />
      <Text style={[styles.intro, { color: theme.textSecondary }]}>
        Systematischer Aufbau: Jeder Baustein schaltet den nächsten frei. Schließe eine Lektion mit
        mindestens einem Stern ab, um weiterzukommen.
      </Text>

      {STAGE_ORDER.map((stage) => {
        const stageTopics = topics.filter((t) => t.topic.stage === stage);
        if (stageTopics.length === 0) return null;
        return (
          <View key={stage} style={{ marginTop: Spacing.three }}>
            <Text style={[styles.stage, { color: theme.purple }]}>{STAGE_LABELS[stage] ?? stage}</Text>
            <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
              {stageTopics.map((t) => (
                <TopicRow key={t.topic.id} item={t} theme={theme} />
              ))}
            </View>
          </View>
        );
      })}

      <Text style={[styles.stage, { color: theme.purple, marginTop: Spacing.four }]}>Formentrainer</Text>
      <Text style={[styles.intro, { color: theme.textSecondary, marginTop: 2 }]}>
        Übe Deklinations- und Konjugationstabellen aktiv — fülle die Formen selbst aus.
      </Text>
      <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
        {PARADIGMS.map((p) => (
          <Card key={p.id} onPress={() => router.push(`/trainer/${p.id}`)}>
            <View style={styles.trainerRow}>
              <View style={[styles.trainerIcon, { backgroundColor: theme.muted }]}>
                <Ionicons name={p.kind === 'noun' ? 'cube-outline' : 'flash-outline'} size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.topicTitle, { color: theme.text }]}>{p.title}</Text>
                <Text style={[styles.topicSummary, { color: theme.textSecondary }]}>{p.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function TopicRow({ item, theme }: { item: TopicWithProgress; theme: ReturnType<typeof useTheme> }) {
  const { topic, stars, unlocked } = item;
  return (
    <Card
      disabled={!unlocked}
      onPress={unlocked ? () => router.push(`/grammar/${topic.id}`) : undefined}>
      <View style={styles.topicHeader}>
        <View style={[styles.numBadge, { backgroundColor: unlocked ? theme.primary : theme.muted }]}>
          {unlocked ? (
            <Text style={styles.numText}>{topic.orderIndex + 1}</Text>
          ) : (
            <Ionicons name="lock-closed" size={14} color={theme.textSecondary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.topicTitle, { color: theme.text }]}>{topic.title}</Text>
          <Text style={[styles.topicSummary, { color: theme.textSecondary }]} numberOfLines={2}>
            {topic.summary}
          </Text>
        </View>
      </View>
      <View style={styles.stars}>
        {[1, 2, 3].map((s) => (
          <Ionicons
            key={s}
            name={s <= stars ? 'star' : 'star-outline'}
            size={16}
            color={s <= stars ? theme.accent : theme.textSecondary}
          />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, lineHeight: 18 },
  stage: { fontSize: 13, fontWeight: '800' },
  topicHeader: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  numBadge: { width: 30, height: 30, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  topicTitle: { fontSize: 16, fontWeight: '700' },
  topicSummary: { fontSize: 13, marginTop: 2 },
  stars: { flexDirection: 'row', gap: 4, marginTop: Spacing.two, marginLeft: 38 },
  trainerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  trainerIcon: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
