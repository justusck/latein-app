import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { getParadigm } from '@/data/paradigms';
import { useTheme } from '@/hooks/use-theme';
import { normalizeLatin } from '@/lib/latin/normalize';
import { speakLatin } from '@/lib/speech';
import { useApp } from '@/store/app';

const XP_PER_CELL = 4;
const XP_ALL_CORRECT_BONUS = 12;

export default function TrainerScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pronunciation, awardXp, registerActivity } = useApp();

  const paradigm = useMemo(() => (id ? getParadigm(id) : undefined), [id]);

  // inputs[row][col]
  const [inputs, setInputs] = useState<string[][]>(() =>
    paradigm ? paradigm.rows.map((r) => r.cells.map(() => '')) : [],
  );
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useLayoutEffect(() => {
    if (paradigm) navigation.setOptions({ title: paradigm.title });
  }, [navigation, paradigm]);

  if (!paradigm) {
    return (
      <Screen>
        <Text style={{ color: theme.text }}>Tabelle nicht gefunden.</Text>
      </Screen>
    );
  }

  const isCellCorrect = (r: number, c: number) =>
    normalizeLatin(inputs[r]?.[c] ?? '') === normalizeLatin(paradigm.rows[r].cells[c]);

  const totalCells = paradigm.rows.reduce((n, r) => n + r.cells.length, 0);
  const correctCells = paradigm.rows.reduce(
    (n, r, ri) => n + r.cells.reduce((m, _c, ci) => m + (isCellCorrect(ri, ci) ? 1 : 0), 0),
    0,
  );

  const setCell = (r: number, c: number, v: string) =>
    setInputs((prev) => prev.map((row, ri) => (ri === r ? row.map((x, ci) => (ci === c ? v : x)) : row)));

  const check = () => {
    setChecked(true);
    registerActivity();
    awardXp(correctCells * XP_PER_CELL + (correctCells === totalCells ? XP_ALL_CORRECT_BONUS : 0));
  };

  const reset = () => {
    setInputs(paradigm.rows.map((r) => r.cells.map(() => '')));
    setChecked(false);
    setRevealed(false);
  };

  const showAnswers = checked || revealed;

  return (
    <Screen scroll>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{paradigm.subtitle}</Text>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        Fülle die Formen aus (Makra/Längen musst du nicht eingeben). Tippe 🔊, um eine Form zu hören.
      </Text>

      <Card style={{ marginTop: Spacing.two, gap: 0 }}>
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <View style={styles.label} />
          {paradigm.cols.map((c) => (
            <Text key={c} style={[styles.head, { color: theme.textSecondary }]}>
              {c}
            </Text>
          ))}
        </View>

        {paradigm.rows.map((r, ri) => (
          <View key={r.label} style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={[styles.label, styles.labelText, { color: theme.textSecondary }]}>{r.label}</Text>
            {r.cells.map((correct, ci) => {
              const ok = isCellCorrect(ri, ci);
              const borderColor = showAnswers ? (ok ? theme.success : theme.danger) : theme.border;
              return (
                <View key={ci} style={styles.cellWrap}>
                  <TextInput
                    value={showAnswers && !ok ? correct : inputs[ri]?.[ci]}
                    onChangeText={(v) => setCell(ri, ci, v)}
                    editable={!showAnswers}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="—"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: showAnswers && !ok ? theme.danger : theme.text, borderColor }]}
                  />
                  {showAnswers && (
                    <Pressable onPress={() => speakLatin(correct, pronunciation)} hitSlop={6} style={styles.speak}>
                      <Ionicons name="volume-medium" size={14} color={theme.primary} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </Card>

      {checked && (
        <Text style={[styles.result, { color: correctCells === totalCells ? theme.success : theme.text }]}>
          {correctCells}/{totalCells} richtig
          {correctCells === totalCells ? ' — perfekt! 🎉' : ''}
        </Text>
      )}

      <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
        {!checked ? (
          <>
            <Button title="Prüfen" onPress={check} />
            {!revealed && (
              <Button title="Aufdecken" variant="ghost" onPress={() => setRevealed(true)} />
            )}
          </>
        ) : (
          <>
            <Button title="Nochmal üben" onPress={reset} />
            <Button title="Fertig" variant="ghost" onPress={() => router.back()} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 16, fontWeight: '700', fontStyle: 'italic', marginTop: Spacing.two },
  hint: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  label: { flex: 1.1 },
  labelText: { fontSize: 12, fontWeight: '600' },
  head: { flex: 1, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  cellWrap: { flex: 1, paddingHorizontal: 3, position: 'relative' },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  speak: { position: 'absolute', right: 6, top: 10 },
  result: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: Spacing.three },
});
