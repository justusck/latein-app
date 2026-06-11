import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { TriumphOverlay, type TriumphData } from '@/components/effects/triumph-overlay';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnimatedProgressBar } from '@/components/ui/animated-progress';
import { Screen } from '@/components/ui/screen';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { AppRating, type AppRatingValue, intervalPreview } from '@/lib/fsrs';
import { levelForXp, rankForLevel, xpForReview } from '@/lib/gamification';
import { speakLatin } from '@/lib/speech';
import {
  answerCard,
  getDistractorGlosses,
  getDueCards,
  getFreeReviewCards,
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

/** How many cards later a failed card resurfaces within the session. */
const RELEARN_MIN_GAP = 3;
const RELEARN_MAX_GAP = 6;

export default function VocabSession() {
  const theme = useTheme();
  const nav = useNavigation();
  const reducedMotion = useReducedMotion();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isFree = mode === 'free';
  const { retention, pronunciation, dailyGoalNew, awardXp, registerActivity, streakCount, bumpVocabRev } =
    useApp();

  useLayoutEffect(() => {
    nav.setOptions({ title: isFree ? 'Frei üben' : 'Vokabeltraining' });
  }, [nav, isFree]);

  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [triumphVisible, setTriumphVisible] = useState(false);
  const newCardsCount = useRef(0);
  const activityMarked = useRef(false);
  // Frozen XP snapshot — the store value updates live with every awardXp,
  // so reading it during the session would double-count the session XP.
  const xpAtStart = useRef(useApp.getState().xp);

  useEffect(() => {
    if (isFree) {
      setQueue(getFreeReviewCards(40));
    } else {
      const stats = getVocabStats(dailyGoalNew);
      introduceNewCards(stats.newRemainingToday);
      const cards = getDueCards(40);
      newCardsCount.current = cards.filter((c) => c.isNew).length;
      setQueue(cards);
      bumpVocabRev(); // statuses changed (new → introduced)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = queue[idx];
  const total = queue.length;
  const finished = total > 0 && idx >= total;

  // ── Card entrance animation ────────────────────────────────────────────
  const cardAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (finished || reducedMotion) return;
    cardAnim.setValue(0);
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, finished, reducedMotion]);

  // Show triumph overlay + tell the vocab tab to reload when finishing
  useEffect(() => {
    if (finished) {
      setTriumphVisible(true);
      bumpVocabRev();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // Multiple-choice options for new cards (reps === 0).
  const options = useMemo(() => {
    if (!current || !current.isNew) return [];
    const distractors = getDistractorGlosses(current.lemma.id, 3);
    return shuffle([current.lemma.glossDe, ...distractors]);
  }, [current]);

  const grade = useCallback(
    (rating: AppRatingValue, wasCorrect: boolean) => {
      if (!current) return;
      if (!activityMarked.current) {
        registerActivity();
        activityMarked.current = true;
      }
      const next = answerCard(current.lemma.id, current.fsrs, rating, retention);
      const xp = xpForReview(rating);
      awardXp(xp);
      setSessionXp((v) => v + xp);
      if (wasCorrect) setCorrect((v) => v + 1);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          wasCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
      }
      // Failed cards resurface a few cards later in the same session —
      // the session only ends once everything sat right at least once.
      if (rating === AppRating.Again) {
        setQueue((q) => {
          const copy = [...q];
          const gap = RELEARN_MIN_GAP + Math.floor(Math.random() * (RELEARN_MAX_GAP - RELEARN_MIN_GAP + 1));
          const pos = Math.min(copy.length, idx + 1 + gap);
          copy.splice(pos, 0, { lemma: current.lemma, fsrs: next, isNew: false });
          return copy;
        });
      }
      setRevealed(false);
      setPicked(null);
      setIdx((v) => v + 1);
    },
    [current, idx, retention, awardXp, registerActivity],
  );

  const pickMc = (opt: string) => {
    if (picked) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setPicked(opt);
    const isCorrect = opt === current.lemma.glossDe;
    setTimeout(() => grade(isCorrect ? AppRating.Good : AppRating.Again, isCorrect), 850);
  };

  if (total === 0) {
    return (
      <Screen>
        <View style={styles.centerFill}>
          <Text style={[styles.big, { color: theme.text }]}>
            {isFree ? 'Keine Lernkarten vorhanden' : 'Nichts fällig 🎉'}
          </Text>
          {isFree && (
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
              Lerne zuerst ein paar Vokabeln über „Lernen starten“, dann kannst du hier frei üben.
            </Text>
          )}
          <Button title="Zurück" onPress={() => router.back()} fullWidth={false} />
        </View>
      </Screen>
    );
  }

  if (finished) {
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    const levelBefore = levelForXp(xpAtStart.current);
    const levelNow = levelForXp(xpAtStart.current + sessionXp);
    const leveledUp = levelNow.level > levelBefore.level;
    const rank = rankForLevel(levelNow.level);

    const triumphData: TriumphData = {
      xp: sessionXp,
      xpIntoLevel: levelNow.xpIntoLevel,
      xpForNext: levelNow.xpForNext,
      levelProgress: levelNow.progress,
      level: levelNow.level,
      rankLatin: rank.latin,
      streak: streakCount,
      cardsDone: total,
      cardsCorrect: correct,
      accuracy,
      newWords: newCardsCount.current,
      leveledUp,
      newRank: leveledUp ? rank.latin : undefined,
    };

    const goHome = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    };

    const playAgain = () => {
      xpAtStart.current += sessionXp; // next round measures level-ups from here
      setQueue(getFreeReviewCards(40));
      setIdx(0);
      setRevealed(false);
      setPicked(null);
      setSessionXp(0);
      setCorrect(0);
      setTriumphVisible(false);
    };

    return (
      <TriumphOverlay
        data={triumphData}
        visible={triumphVisible}
        onDismiss={goHome}
        onPlayAgain={isFree ? playAgain : undefined}
      />
    );
  }

  const previews = !current.isNew ? intervalPreview(current.fsrs, retention) : null;

  const cardEnterStyle = reducedMotion
    ? undefined
    : {
        opacity: cardAnim,
        transform: [
          {
            translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
          },
          {
            scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }),
          },
        ],
      };

  return (
    <Screen>
      <View style={styles.progressTop}>
        <AnimatedProgressBar progress={idx / total} color={theme.primary} />
        <Text style={[styles.counter, { color: theme.textSecondary }]}>
          {idx + 1}/{total}
        </Text>
      </View>

      <View style={styles.cardArea}>
        <Animated.View style={cardEnterStyle}>
          <Card accent style={styles.flashcard}>
            {current.isNew && (
              <View style={[styles.tag, { backgroundColor: theme.purple }]}>
                <Text style={styles.tagText}>NEU</Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }
                speakLatin(current.lemma.lemma, pronunciation);
              }}
              style={styles.speakRow}>
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
              <MountFade style={[styles.answerBox, { borderTopColor: theme.border }]} reducedMotion={reducedMotion}>
                <Text style={[styles.gloss, { color: theme.primary }]}>{current.lemma.glossDe}</Text>
              </MountFade>
            )}
          </Card>
        </Animated.View>
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
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: bg, borderColor: theme.border },
                  pressed && !show && styles.optionPressed,
                ]}>
                <Text style={[styles.optionText, { color: fg }]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : !revealed ? (
        <Button title="Antwort zeigen" onPress={() => setRevealed(true)} />
      ) : (
        <MountFade reducedMotion={reducedMotion}>
          <View style={styles.ratingRow}>
            <RatingButton label="Nochmal" sub={previews?.[AppRating.Again]} color={theme.danger} onPress={() => grade(AppRating.Again, false)} />
            <RatingButton label="Schwer" sub={previews?.[AppRating.Hard]} color={theme.accent} onPress={() => grade(AppRating.Hard, true)} />
            <RatingButton label="Gut" sub={previews?.[AppRating.Good]} color={theme.success} onPress={() => grade(AppRating.Good, true)} />
            <RatingButton label="Leicht" sub={previews?.[AppRating.Easy]} color={theme.purple} onPress={() => grade(AppRating.Easy, true)} />
          </View>
        </MountFade>
      )}
    </Screen>
  );
}

/** Fades + slides its children in when mounted (used for reveal moments). */
function MountFade({
  children,
  style,
  reducedMotion,
}: {
  children: React.ReactNode;
  style?: any;
  reducedMotion: boolean;
}) {
  const v = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}>
      {children}
    </Animated.View>
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
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.rating,
        { backgroundColor: color },
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
      ]}>
      <Text style={styles.ratingLabel}>{label}</Text>
      {sub ? <Text style={styles.ratingSub}>{sub}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  big: { fontSize: 26, fontWeight: '900' },
  emptyHint: { fontSize: 14, textAlign: 'center', paddingHorizontal: Spacing.four, lineHeight: 20 },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  counter: { fontSize: 12, fontWeight: '700', minWidth: 44, textAlign: 'right', fontVariant: ['tabular-nums'] },
  cardArea: { flex: 1, justifyContent: 'center' },
  flashcard: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.five },
  tag: { position: 'absolute', top: Spacing.two, right: Spacing.two, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  tagText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  speakRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  lemma: { fontSize: 36, fontFamily: Fonts.serif, fontWeight: '700' },
  parts: { fontSize: 15, fontStyle: 'italic', fontFamily: Fonts.serifBody },
  info: { fontSize: 13 },
  answerBox: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, alignSelf: 'stretch', alignItems: 'center' },
  gloss: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  option: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  optionPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  optionText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  ratingRow: { flexDirection: 'row', gap: Spacing.one },
  rating: { flex: 1, paddingVertical: Spacing.two, borderRadius: Radius.md, alignItems: 'center' },
  ratingLabel: { color: '#fff', fontWeight: '800', fontSize: 13 },
  ratingSub: { color: '#fff', opacity: 0.85, fontSize: 10, fontWeight: '600', marginTop: 2 },
});
