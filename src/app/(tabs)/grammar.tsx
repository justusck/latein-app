import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

  const topicStageMap = useMemo(
    () => new Map(topics.map((t) => [t.topic.id, t.topic.stage])),
    [topics],
  );

  const paradigmsByStage = useMemo(() => {
    const map = new Map<string, typeof PARADIGMS>();
    for (const p of PARADIGMS) {
      const stage = topicStageMap.get(p.topicId) ?? 'morphology';
      if (!map.has(stage)) map.set(stage, []);
      map.get(stage)!.push(p);
    }
    return map;
  }, [topicStageMap]);

  return (
    <Screen scroll padded={false}>
      <PageHeader title="Grammatik" />
      <View style={styles.content}>
        {STAGE_ORDER.map((stage) => {
          const stageTopics = topics.filter((t) => t.topic.stage === stage);
          const stageParadigms = paradigmsByStage.get(stage) ?? [];
          if (stageTopics.length === 0 && stageParadigms.length === 0) return null;

          const firstUnlocked = stageTopics.find((t) => t.unlocked && !t.completed);

          return (
            <View key={stage} style={styles.stage}>
              <Text style={[styles.stageLabel, { color: theme.primary }]}>
                {STAGE_LABELS[stage] ?? stage}
              </Text>

              {stageTopics.map((t) => (
                <Row
                  key={t.topic.id}
                  title={t.topic.title}
                  subtitle={t.topic.summary ?? undefined}
                  unlocked={t.unlocked}
                  completed={t.completed}
                  highlight={t === firstUnlocked}
                  leading={
                    <View
                      style={[
                        styles.leading,
                        {
                          backgroundColor: t.unlocked ? theme.primary : theme.muted,
                        },
                      ]}>
                      {t.unlocked ? (
                        <Text style={styles.leadingText}>{t.topic.orderIndex + 1}</Text>
                      ) : (
                        <Ionicons name="lock-closed" size={11} color={theme.textSecondary} />
                      )}
                    </View>
                  }
                  onPress={t.unlocked ? () => router.push(`/grammar/${t.topic.id}`) : undefined}
                  theme={theme}
                />
              ))}

              {stageParadigms.map((p) => (
                <Row
                  key={`trainer-${p.id}`}
                  title={p.title}
                  subtitle={p.subtitle}
                  unlocked
                  leading={
                    <View style={[styles.leading, { backgroundColor: theme.purple }]}>
                      <Ionicons
                        name={p.kind === 'noun' ? 'layers-outline' : 'flash-outline'}
                        size={14}
                        color="#fff"
                      />
                    </View>
                  }
                  onPress={() => router.push(`/trainer/${p.id}`)}
                  theme={theme}
                />
              ))}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function Row({
  title,
  subtitle,
  unlocked,
  completed,
  highlight,
  leading,
  onPress,
  theme,
}: {
  title: string;
  subtitle?: string;
  unlocked?: boolean;
  completed?: boolean;
  highlight?: boolean;
  leading: React.ReactNode;
  onPress?: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        highlight && { backgroundColor: theme.primary + '0A' },
        pressed && onPress && { opacity: 0.6 },
      ]}>
      {leading}

      <View style={styles.rowBody}>
        <Text
          style={[styles.rowTitle, { color: unlocked === false ? theme.textSecondary : theme.text }]}
          numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: theme.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {completed ? (
        <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
      ) : unlocked === false ? null : onPress ? (
        <Ionicons name="chevron-forward" size={14} color={theme.border} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },

  stage: { marginBottom: Spacing.five },
  stageLabel: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    letterSpacing: 0.3,
    marginBottom: Spacing.two,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    marginHorizontal: -Spacing.three,
    borderRadius: Radius.md,
  },
  leading: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  leadingText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 1 },
});
