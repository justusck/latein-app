import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { LaurelWreath } from '@/components/effects/laurel-wreath';
import { ParticleField } from '@/components/effects/particle-field';
import { LessonBody, LessonHero, OrnamentRule } from '@/components/grammar/lesson-content';
import { ParadigmTable } from '@/components/paradigm-table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnimatedProgressBar } from '@/components/ui/animated-progress';
import { Screen } from '@/components/ui/screen';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { paradigmsForTopic } from '@/data/paradigms';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { completeTopic, getTopic, logGrammarAnswer } from '@/lib/grammar';
import { XP_GRAMMAR_CORRECT, XP_GRAMMAR_WRONG, XP_LESSON_COMPLETE } from '@/lib/gamification';
import { normalize } from '@/lib/text';
import { toRoman } from '@/lib/roman';
import { useApp } from '@/store/app';

type Phase = 'lesson' | 'drill' | 'done';

const KIND_LABELS: Record<string, string> = {
  mc: 'Auswahl',
  fill: 'Eingabe',
  form: 'Form',
  order: 'Satzbau',
};

export default function GrammarLesson() {
  const theme = useTheme();
  const navigation = useNavigation();
  const reducedMotion = useReducedMotion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { awardXp, registerActivity } = useApp();

  const data = useMemo(() => (id ? getTopic(id) : null), [id]);
  const topic = data?.topic ?? null;
  const cards = data?.cards ?? [];

  const [phase, setPhase] = useState<Phase>('lesson');
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [order, setOrder] = useState<number[]>([]); // selected option indices (Satzbau)
  const [graded, setGraded] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);

  // Drill card entrance animation
  const cardAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (phase !== 'drill' || reducedMotion) return;
    cardAnim.setValue(0);
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase, reducedMotion]);

  // Word bank for Satzbau cards, shuffled so the bank order never spoils the answer.
  const currentCard = cards[idx];
  const bankOrder = useMemo(() => {
    if (!currentCard?.options) return [];
    const idxs = currentCard.options.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    return idxs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard?.id]);

  useLayoutEffect(() => {
    if (topic) navigation.setOptions({ title: topic.title });
  }, [navigation, topic]);

  if (!topic) {
    return (
      <Screen>
        <Text style={{ color: theme.text }}>Lektion nicht gefunden.</Text>
      </Screen>
    );
  }

  const finishLesson = (finalCorrect: number) => {
    const stars = completeTopic(topic.id, finalCorrect, cards.length);
    setEarnedStars(stars);
    // Per-answer XP was already granted in settle(); the completion bonus
    // comes on top exactly once.
    awardXp(XP_LESSON_COMPLETE);
    setSessionXp((v) => v + XP_LESSON_COMPLETE);
    registerActivity();
    setPhase('done');
  };

  // ── Lesson view ──
  if (phase === 'lesson') {
    const paradigms = paradigmsForTopic(topic.id);
    return (
      <Screen scroll>
        <LessonHero topic={topic} />
        <LessonBody explanation={topic.explanation} />
        {paradigms.length > 0 && (
          <View style={{ gap: Spacing.two, marginTop: Spacing.four }}>
            <Text style={[styles.tableHeading, { color: theme.textSecondary }]}>TABVLAE</Text>
            {paradigms.map((p) => (
              <ParadigmTable key={p.id} paradigm={p} />
            ))}
          </View>
        )}
        <View style={{ height: Spacing.four }} />
        {cards.length > 0 ? (
          <Button title={`Übung beginnen · ${toRoman(cards.length)} Aufgaben`} onPress={() => setPhase('drill')} />
        ) : (
          <Button title="Als gelernt markieren" onPress={() => finishLesson(0)} />
        )}
        <View style={{ height: Spacing.three }} />
      </Screen>
    );
  }

  // ── Done view ──
  if (phase === 'done') {
    return (
      <DoneCeremony
        stars={earnedStars}
        correct={correctCount}
        total={cards.length}
        xp={sessionXp}
        reducedMotion={reducedMotion}
        theme={theme}
        onContinue={() => router.back()}
      />
    );
  }

  // ── Drill view ──
  const card = cards[idx];
  const isLast = idx >= cards.length - 1;

  const settle = (ok: boolean) => {
    setGraded(true);
    setLastCorrect(ok);
    setResults((r) => [...r, ok]);
    if (ok) setCorrectCount((v) => v + 1);
    const xp = ok ? XP_GRAMMAR_CORRECT : XP_GRAMMAR_WRONG;
    awardXp(xp);
    setSessionXp((v) => v + xp);
    logGrammarAnswer(card.id, ok);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    }
  };

  const checkInput = () => {
    settle(normalize(input) === normalize(card.answer));
  };

  const pick = (opt: string) => {
    if (graded) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setPicked(opt);
    settle(opt === card.answer);
  };

  const next = () => {
    if (isLast) {
      finishLesson(correctCount);
      return;
    }
    setIdx((v) => v + 1);
    setPicked(null);
    setInput('');
    setOrder([]);
    setGraded(false);
  };

  const inputCorrect = graded && normalize(input) === normalize(card.answer);

  const normSeq = (words: string[]) => words.map(normalize).join(' ');
  const orderTarget = normSeq(card.answer.split(/\s+/));
  const orderCurrent = normSeq(order.map((i) => card.options?.[i] ?? ''));
  const orderCorrect = graded && orderCurrent === orderTarget;
  const checkOrder = () => settle(orderCurrent === orderTarget);

  const cardEnterStyle = reducedMotion
    ? undefined
    : {
        opacity: cardAnim,
        transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      };

  return (
    <Screen scroll>
      <View style={styles.progressTop}>
        <AnimatedProgressBar progress={idx / cards.length} color={theme.primary} />
        <Text style={[styles.counter, { color: theme.textSecondary }]}>
          {idx + 1}/{cards.length}
        </Text>
      </View>

      {/* Per-question result dots */}
      <View style={styles.dotsRow}>
        {cards.map((_, i) => {
          const answered = i < results.length;
          const bg = answered
            ? results[i]
              ? theme.accent
              : theme.danger
            : i === idx
              ? theme.primary
              : theme.muted;
          return <View key={i} style={[styles.dot, { backgroundColor: bg }, i === idx && !answered && styles.dotCurrent]} />;
        })}
      </View>

      <Animated.View style={cardEnterStyle}>
        <Card accent style={{ marginTop: Spacing.two }}>
          <View style={styles.kindRow}>
            <View style={[styles.kindChip, { backgroundColor: theme.muted }]}>
              <Text style={[styles.kindChipText, { color: theme.textSecondary }]}>
                {KIND_LABELS[card.kind] ?? card.kind}
              </Text>
            </View>
            <Text style={[styles.kindNumber, { color: theme.border }]}>{toRoman(idx + 1)}</Text>
          </View>
          <Text style={[styles.prompt, { color: theme.text }]}>{card.prompt}</Text>
        </Card>
      </Animated.View>

      <View style={{ marginTop: Spacing.three, gap: Spacing.two }}>
        {card.kind === 'order' && card.options ? (
          <>
            <View style={[styles.buildArea, { borderColor: orderCorrect ? theme.success : theme.border }]}>
              {order.length === 0 ? (
                <Text style={{ color: theme.textSecondary }}>Tippe die Wörter der Reihe nach an …</Text>
              ) : (
                order.map((oi, pos) => (
                  <Pressable
                    key={pos}
                    disabled={graded}
                    onPress={() => setOrder((o) => o.filter((_, p) => p !== pos))}
                    style={[styles.chip, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.chipText, { color: '#fff' }]}>{card.options![oi]}</Text>
                  </Pressable>
                ))
              )}
            </View>
            <View style={styles.bank}>
              {bankOrder.map((i) =>
                order.includes(i) ? null : (
                  <Pressable
                    key={i}
                    disabled={graded}
                    onPress={() => setOrder((o) => [...o, i])}
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: theme.muted, borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth },
                      pressed && styles.chipPressed,
                    ]}>
                    <Text style={[styles.chipText, { color: theme.text }]}>{card.options![i]}</Text>
                  </Pressable>
                ),
              )}
            </View>
            {!graded && <Button title="Prüfen" onPress={checkOrder} disabled={order.length === 0} />}
          </>
        ) : card.kind === 'mc' && card.options ? (
          card.options.map((opt) => {
            const isAnswer = opt === card.answer;
            const bg = !graded
              ? theme.card
              : isAnswer
                ? theme.success
                : opt === picked
                  ? theme.danger
                  : theme.card;
            const fg = graded && (isAnswer || opt === picked) ? '#fff' : theme.text;
            return (
              <Pressable
                key={opt}
                onPress={() => pick(opt)}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: bg, borderColor: theme.border },
                  pressed && !graded && styles.optionPressed,
                ]}>
                <Text style={[styles.optionText, { color: fg }]}>{opt}</Text>
              </Pressable>
            );
          })
        ) : (
          <>
            <TextInput
              value={input}
              onChangeText={setInput}
              editable={!graded}
              placeholder="Antwort eingeben…"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: graded ? (inputCorrect ? theme.success : theme.danger) : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            />
            {!graded && <Button title="Prüfen" onPress={checkInput} disabled={!input.trim()} />}
          </>
        )}
      </View>

      {graded && (
        <FeedbackBlock
          correct={lastCorrect}
          answer={card.answer}
          showAnswer={!lastCorrect && card.kind !== 'mc'}
          explanation={card.explanation}
          theme={theme}
          reducedMotion={reducedMotion}
          buttonTitle={isLast ? 'Abschließen' : 'Weiter'}
          onNext={next}
        />
      )}
      <View style={{ height: Spacing.four }} />
    </Screen>
  );
}

// ── Feedback after grading ──────────────────────────────────────────────────

function FeedbackBlock({
  correct,
  answer,
  showAnswer,
  explanation,
  theme,
  reducedMotion,
  buttonTitle,
  onNext,
}: {
  correct: boolean;
  answer: string;
  showAnswer: boolean;
  explanation: string | null;
  theme: ReturnType<typeof useTheme>;
  reducedMotion: boolean;
  buttonTitle: string;
  onNext: () => void;
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

  const color = correct ? theme.success : theme.danger;
  return (
    <Animated.View
      style={{
        marginTop: Spacing.three,
        gap: Spacing.two,
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}>
      <View style={[fbStyles.banner, { borderLeftColor: color, backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name={correct ? 'checkmark-circle' : 'close-circle'} size={20} color={color} />
        <View style={{ flex: 1 }}>
          <Text style={[fbStyles.verdict, { color }]}>{correct ? 'Rēctē!' : 'Falsum.'}</Text>
          {showAnswer && (
            <Text style={[fbStyles.solution, { color: theme.text }]}>
              Lösung: <Text style={{ fontFamily: Fonts.serifBody, fontStyle: 'italic' }}>{answer}</Text>
            </Text>
          )}
          {explanation ? (
            <Text style={[fbStyles.explain, { color: theme.textSecondary }]}>{explanation}</Text>
          ) : null}
        </View>
      </View>
      <Button title={buttonTitle} onPress={onNext} />
    </Animated.View>
  );
}

const fbStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    padding: Spacing.three,
  },
  verdict: { fontSize: 16, fontWeight: '800', fontFamily: Fonts.serif },
  solution: { fontSize: 14, marginTop: 3 },
  explain: { fontSize: 13, lineHeight: 19, marginTop: 4 },
});

// ── Done ceremony ───────────────────────────────────────────────────────────

function DoneCeremony({
  stars,
  correct,
  total,
  xp,
  reducedMotion,
  theme,
  onContinue,
}: {
  stars: number;
  correct: number;
  total: number;
  xp: number;
  reducedMotion: boolean;
  theme: ReturnType<typeof useTheme>;
  onContinue: () => void;
}) {
  const [burst, setBurst] = useState(0);
  const starAnims = useRef([1, 2, 3].map(() => new Animated.Value(reducedMotion ? 1 : 0))).current;

  useEffect(() => {
    if (reducedMotion) {
      setBurst(1);
      return;
    }
    Animated.stagger(
      160,
      starAnims.map((a) =>
        Animated.spring(a, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      ),
    ).start(() => setBurst((b) => b + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <View style={doneStyles.center}>
        <View style={doneStyles.wreathWrap}>
          <LaurelWreath size={190} color={theme.accent} />
          <View style={doneStyles.starsInWreath}>
            {[1, 2, 3].map((s, i) => (
              <Animated.View
                key={s}
                style={{
                  transform: [
                    { scale: starAnims[i] },
                    { translateY: i === 1 ? -8 : 4 },
                  ],
                }}>
                <Ionicons
                  name={s <= stars ? 'star' : 'star-outline'}
                  size={i === 1 ? 34 : 28}
                  color={s <= stars ? theme.accent : theme.border}
                />
              </Animated.View>
            ))}
          </View>
          <ParticleField trigger={burst} count={16} color={theme.accent} />
        </View>

        <Text style={[doneStyles.epigraph, { color: theme.accent }]}>LECTIO PERFECTA</Text>
        <Text style={[doneStyles.title, { color: theme.text }]}>Lektion abgeschlossen!</Text>
        <Text style={[doneStyles.sub, { color: theme.textSecondary }]}>
          {total > 0 ? `${correct} von ${total} richtig · ` : ''}+{xp} XP
        </Text>

        <OrnamentRule color={theme.accent} />

        <Button title="Weiter" onPress={onContinue} />
      </View>
    </Screen>
  );
}

const doneStyles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three },
  wreathWrap: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  starsInWreath: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  epigraph: {
    fontFamily: Fonts.serifBody,
    fontSize: 12,
    letterSpacing: 4,
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: '900', fontFamily: Fonts.serif },
  sub: { fontSize: 15, marginTop: 6 },
});

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  counter: { fontSize: 12, fontWeight: '700', minWidth: 44, textAlign: 'right', fontVariant: ['tabular-nums'] },

  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.two,
    alignItems: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  dotCurrent: { transform: [{ rotate: '45deg' }, { scale: 1.25 }] },

  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  kindChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  kindChipText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  kindNumber: { fontFamily: Fonts.serif, fontSize: 18 },

  prompt: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
  option: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  optionPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  optionText: { fontSize: 16, fontWeight: '600' },
  input: { borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.three, fontSize: 18, fontWeight: '600' },
  buildArea: {
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    alignItems: 'center',
  },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  chip: { paddingVertical: 8, paddingHorizontal: Spacing.three, borderRadius: Radius.md },
  chipPressed: { transform: [{ scale: 0.96 }], opacity: 0.85 },
  chipText: { fontSize: 16, fontWeight: '700' },

  tableHeading: {
    fontFamily: Fonts.serifBody,
    fontSize: 11,
    letterSpacing: 3,
    textAlign: 'center',
  },
});
