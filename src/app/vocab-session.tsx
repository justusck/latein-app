import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppRating, type AppRatingValue, intervalPreview } from '@/lib/fsrs';
import { xpForReview } from '@/lib/gamification';
import { speakLatin } from '@/lib/speech';
import {
  answerCard,
  getDistractorGlosses,
  getDueCards,
  getVocabStats,
  introduceNewCards,
  type StudyCard,
} from '@/lib/vocab';
import { useApp } from '@/store/app';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function VocabSession() {
  const theme = useTheme();
  const { retention, pronunciation, dailyGoalNew, awardXp, registerActivity } = useApp();

  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [correct, setCorrect] = useState(0);
  const activityMarked = useRef(false);

  useEffect(() => {
    const stats = getVocabStats(dailyGoalNew);
    introduceNewCards(stats.newRemainingToday);
    setQueue(getDueCards(40));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = queue[idx];
  const total = queue.length;
  const finished = total > 0 && idx >= total;

  // Multiple-choice options for new cards (reps === 0).
  const options = useMemo(() => {
    if (!current || !current.isNew) return [];
    const distractors = getDistractorGlosses(current.lemma.id, 3);
    return shuffle([current.lemma.glossDe, ...distractors]);
  }, [current]);

  if (total === 0) {
    return (
      <Screen>
        <View style={styles.centerFill}>
          <Text style={[styles.big, { color: theme.text }]}>Nichts fällig 🎉</Text>
          <Button title="Zurück" onPress={() => router.back()} fullWidth={false} />
        </View>
      </Screen>
    );
  }

  if (finished) {
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    return (
      <Screen>
        <View style={styles.centerFill}>
          <Ionicons name="trophy" size={64} color={theme.accent} />
          <Text style={[styles.big, { color: theme.text }]}>Session geschafft!</Text>
          <Card style={{ width: '100%', gap: Spacing.three }}>
            <SummaryRow label="Karten" value={`${total}`} theme={theme} />
            <SummaryRow label="Trefferquote" value={`${accuracy}%`} theme={theme} />
            <SummaryRow label="XP erhalten" value={`+${sessionXp}`} theme={theme} accent />
          </Card>
          <Button title="Fertig" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const grade = (rating: AppRatingValue, wasCorrect: boolean) => {
    if (!activityMarked.current) {
      registerActivity();
      activityMarked.current = true;
    }
    answerCard(current.lemma.id, current.fsrs, rating, retention);
    const xp = xpForReview(rating);
    awardXp(xp);
    setSessionXp((v) => v + xp);
    if (wasCorrect) setCorrect((v) => v + 1);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        wasCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    }
    setRevealed(false);
    setPicked(null);
    setIdx((v) => v + 1);
  };

  const pickMc = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const isCorrect = opt === current.lemma.glossDe;
    setTimeout(() => grade(isCorrect ? AppRating.Good : AppRating.Again, isCorrect), 850);
  };

  const previews = !current.isNew ? intervalPreview(current.fsrs, retention) : null;

  return (
    <Screen>
      <View style={styles.progressTop}>
        <ProgressBar progress={idx / total} color={theme.primary} />
        <Text style={[styles.counter, { color: theme.textSecondary }]}>
          {idx + 1}/{total}
        </Text>
      </View>

      <View style={styles.cardArea}>
        <Card accent style={styles.flashcard}>
          {current.isNew && (
            <View style={[styles.tag, { backgroundColor: theme.purple }]}>
              <Text style={styles.tagText}>NEU</Text>
            </View>
          )}
          <Pressable onPress={() => speakLatin(current.lemma.lemma, pronunciation)} style={styles.speakRow}>
            <Text style={[styles.lemma, { color: theme.text }]}>{current.lemma.lemma}</Text>
            <Ionicons name="volume-medium" size={22} color={theme.primary} />
          </Pressable>
          {current.lemma.principalParts ? (
            <Text style={[styles.parts, { color: theme.textSecondary }]}>
              {current.lemma.principalParts}
            </Text>
          ) : null}
          {current.lemma.info ? (
            <Text style={[styles.info, { color: theme.textSecondary }]}>{current.lemma.info}</Text>
          ) : null}

          {(revealed || picked) && (
            <View style={[styles.answerBox, { borderTopColor: theme.border }]}>
              <Text style={[styles.gloss, { color: theme.primary }]}>{current.lemma.glossDe}</Text>
            </View>
          )}
        </Card>
      </View>

      {/* New card → multiple choice */}
      {current.isNew ? (
        <View style={{ gap: Spacing.two }}>
          {options.map((opt) => {
            const isCorrect = opt === current.lemma.glossDe;
            const show = picked != null;
            const bg = !show
              ? theme.card
              : isCorrect
                ? theme.success
                : opt === picked
                  ? theme.danger
                  : theme.card;
            const fg = show && (isCorrect || opt === picked) ? '#fff' : theme.text;
            return (
              <Pressable
                key={opt}
                onPress={() => pickMc(opt)}
                style={[styles.option, { backgroundColor: bg, borderColor: theme.border }]}>
                <Text style={[styles.optionText, { color: fg }]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : !revealed ? (
        <Button title="Antwort zeigen" onPress={() => setRevealed(true)} />
      ) : (
        <View style={styles.ratingRow}>
          <RatingButton label="Nochmal" sub={previews?.[AppRating.Again]} color={theme.danger} onPress={() => grade(AppRating.Again, false)} />
          <RatingButton label="Schwer" sub={previews?.[AppRating.Hard]} color={theme.accent} onPress={() => grade(AppRating.Hard, true)} />
          <RatingButton label="Gut" sub={previews?.[AppRating.Good]} color={theme.success} onPress={() => grade(AppRating.Good, true)} />
          <RatingButton label="Leicht" sub={previews?.[AppRating.Easy]} color={theme.purple} onPress={() => grade(AppRating.Easy, true)} />
        </View>
      )}
    </Screen>
  );
}

function RatingButton({
  label,
  sub,
  color,
  onPress,
}: {
  label: string;
  sub?: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.rating, { backgroundColor: color }]}>
      <Text style={styles.ratingLabel}>{label}</Text>
      {sub ? <Text style={styles.ratingSub}>{sub}</Text> : null}
    </Pressable>
  );
}

function SummaryRow({
  label,
  value,
  theme,
  accent,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
  accent?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: accent ? theme.accent : theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  big: { fontSize: 26, fontWeight: '900' },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  counter: { fontSize: 12, fontWeight: '700', minWidth: 44, textAlign: 'right' },
  cardArea: { flex: 1, justifyContent: 'center' },
  flashcard: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.five },
  tag: { position: 'absolute', top: Spacing.two, right: Spacing.two, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  tagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  speakRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  lemma: { fontSize: 38, fontWeight: '900' },
  parts: { fontSize: 15, fontStyle: 'italic' },
  info: { fontSize: 13 },
  answerBox: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, alignSelf: 'stretch', alignItems: 'center' },
  gloss: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  option: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  optionText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  ratingRow: { flexDirection: 'row', gap: Spacing.one },
  rating: { flex: 1, paddingVertical: Spacing.two, borderRadius: Radius.md, alignItems: 'center' },
  ratingLabel: { color: '#fff', fontWeight: '800', fontSize: 13 },
  ratingSub: { color: '#fff', opacity: 0.85, fontSize: 10, fontWeight: '600', marginTop: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 15 },
  summaryValue: { fontSize: 17, fontWeight: '800' },
});
