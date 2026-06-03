import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ParadigmTable } from '@/components/paradigm-table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { paradigmsForTopic } from '@/data/paradigms';
import { useTheme } from '@/hooks/use-theme';
import type { GrammarCard, GrammarTopic } from '@/db/schema';
import { completeTopic, getTopic, logGrammarAnswer } from '@/lib/grammar';
import { XP_GRAMMAR_CORRECT, XP_GRAMMAR_WRONG, XP_LESSON_COMPLETE } from '@/lib/gamification';
import { normalizeLatin } from '@/lib/latin/normalize';
import { useApp } from '@/store/app';

type Phase = 'lesson' | 'drill' | 'done';

export default function GrammarLesson() {
  const theme = useTheme();
  const navigation = useNavigation();
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
  const [correctCount, setCorrectCount] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);

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

  const finishLesson = () => {
    const stars = completeTopic(topic.id, correctCount, cards.length);
    setEarnedStars(stars);
    awardXp(XP_LESSON_COMPLETE + correctCount * XP_GRAMMAR_CORRECT);
    registerActivity();
    setPhase('done');
  };

  // ── Lesson view ──
  if (phase === 'lesson') {
    return (
      <Screen scroll>
        <RichText text={topic.explanation} theme={theme} />
        {paradigmsForTopic(topic.id).length > 0 && (
          <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
            {paradigmsForTopic(topic.id).map((p) => (
              <ParadigmTable key={p.id} paradigm={p} />
            ))}
          </View>
        )}
        <View style={{ height: Spacing.four }} />
        {cards.length > 0 ? (
          <Button title={`Übung starten (${cards.length})`} onPress={() => setPhase('drill')} />
        ) : (
          <Button title="Als gelernt markieren" onPress={finishLesson} />
        )}
      </Screen>
    );
  }

  // ── Done view ──
  if (phase === 'done') {
    return (
      <Screen>
        <View style={styles.center}>
          <View style={styles.bigStars}>
            {[1, 2, 3].map((s) => (
              <Ionicons
                key={s}
                name={s <= earnedStars ? 'star' : 'star-outline'}
                size={44}
                color={s <= earnedStars ? theme.accent : theme.textSecondary}
              />
            ))}
          </View>
          <Text style={[styles.bigTitle, { color: theme.text }]}>Lektion abgeschlossen!</Text>
          <Text style={[styles.doneSub, { color: theme.textSecondary }]}>
            {correctCount}/{cards.length} richtig
          </Text>
          <Button title="Weiter" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  // ── Drill view ──
  const card = cards[idx];
  const isLast = idx >= cards.length - 1;

  const checkInput = () => {
    const ok = normalizeLatin(input) === normalizeLatin(card.answer);
    settle(ok);
  };

  const pick = (opt: string) => {
    if (graded) return;
    setPicked(opt);
    settle(opt === card.answer);
  };

  const settle = (ok: boolean) => {
    setGraded(true);
    if (ok) setCorrectCount((v) => v + 1);
    awardXp(ok ? XP_GRAMMAR_CORRECT : XP_GRAMMAR_WRONG);
    logGrammarAnswer(card.id, ok);
  };

  const next = () => {
    if (isLast) {
      finishLesson();
      return;
    }
    setIdx((v) => v + 1);
    setPicked(null);
    setInput('');
    setOrder([]);
    setGraded(false);
  };

  const inputCorrect = graded && normalizeLatin(input) === normalizeLatin(card.answer);

  const normSeq = (words: string[]) => words.map(normalizeLatin).join(' ');
  const orderTarget = normSeq(card.answer.split(/\s+/));
  const orderCurrent = normSeq(order.map((i) => card.options?.[i] ?? ''));
  const orderCorrect = graded && orderCurrent === orderTarget;
  const checkOrder = () => settle(orderCurrent === orderTarget);

  return (
    <Screen scroll>
      <View style={styles.progressTop}>
        <ProgressBar progress={idx / cards.length} color={theme.primary} />
        <Text style={[styles.counter, { color: theme.textSecondary }]}>
          {idx + 1}/{cards.length}
        </Text>
      </View>

      <Card accent style={{ marginTop: Spacing.three }}>
        <Text style={[styles.prompt, { color: theme.text }]}>{card.prompt}</Text>
      </Card>

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
              {card.options.map((w, i) =>
                order.includes(i) ? null : (
                  <Pressable
                    key={i}
                    disabled={graded}
                    onPress={() => setOrder((o) => [...o, i])}
                    style={[styles.chip, { backgroundColor: theme.muted, borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth }]}>
                    <Text style={[styles.chipText, { color: theme.text }]}>{w}</Text>
                  </Pressable>
                ),
              )}
            </View>
            {!graded && <Button title="Prüfen" onPress={checkOrder} disabled={order.length === 0} />}
            {graded && !orderCorrect && (
              <Text style={[styles.solution, { color: theme.success }]}>Lösung: {card.answer}</Text>
            )}
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
                style={[styles.option, { backgroundColor: bg, borderColor: theme.border }]}>
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
            {graded && !inputCorrect && (
              <Text style={[styles.solution, { color: theme.success }]}>Lösung: {card.answer}</Text>
            )}
          </>
        )}
      </View>

      {graded && (
        <View style={{ marginTop: Spacing.three, gap: Spacing.two }}>
          {card.explanation ? (
            <Card>
              <Text style={[styles.explain, { color: theme.textSecondary }]}>{card.explanation}</Text>
            </Card>
          ) : null}
          <Button title={isLast ? 'Abschließen' : 'Weiter'} onPress={next} />
        </View>
      )}
    </Screen>
  );
}

/** Minimal renderer: paragraphs on blank lines, **bold** inline. */
function RichText({ text, theme }: { text: string; theme: ReturnType<typeof useTheme> }) {
  const paragraphs = text.split('\n\n');
  return (
    <View style={{ gap: Spacing.two }}>
      {paragraphs.map((p, i) => (
        <Text key={i} style={[styles.body, { color: theme.text }]}>
          {p.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <Text key={j} style={styles.bold}>
                {part.slice(2, -2)}
              </Text>
            ) : (
              <Text key={j}>{part}</Text>
            ),
          )}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 },
  bold: { fontWeight: '800' },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  counter: { fontSize: 12, fontWeight: '700', minWidth: 44, textAlign: 'right' },
  prompt: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
  option: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
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
  chipText: { fontSize: 16, fontWeight: '700' },
  solution: { fontSize: 15, fontWeight: '700' },
  explain: { fontSize: 14, lineHeight: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  bigStars: { flexDirection: 'row', gap: Spacing.two },
  bigTitle: { fontSize: 24, fontWeight: '900' },
  doneSub: { fontSize: 15 },
});
