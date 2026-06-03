import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Lemma } from '@/db/schema';
import { XP_READ_TEXT } from '@/lib/gamification';
import { kvGet, kvSet } from '@/lib/kv';
import { tokenizeLatin } from '@/lib/latin/normalize';
import {
  addLemmaToVocab,
  getBook,
  getDictFormKeys,
  getKnownFormKeys,
  glossForKey,
} from '@/lib/reading';
import { speakLatin } from '@/lib/speech';
import { useApp } from '@/store/app';

export default function Reader() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pronunciation, awardXp, registerActivity } = useApp();

  const book = useMemo(() => (id ? getBook(id) : null), [id]);
  const tokens = useMemo(() => (book ? tokenizeLatin(book.body) : []), [book]);
  const [knownKeys] = useState(() => getKnownFormKeys());
  const [dictKeys] = useState(() => getDictFormKeys());

  const [selected, setSelected] = useState<{ raw: string; lemma: Lemma | null } | null>(null);
  const [added, setAdded] = useState(false);
  const [read, setRead] = useState(() => (id ? kvGet(`read:${id}`) === '1' : false));

  useLayoutEffect(() => {
    if (book) navigation.setOptions({ title: book.title });
  }, [navigation, book]);

  const onWord = useCallback(
    (raw: string, key: string) => {
      const lemma = glossForKey(key);
      setSelected({ raw, lemma });
      setAdded(false);
      speakLatin(raw, pronunciation);
    },
    [pronunciation],
  );

  if (!book) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text, padding: Spacing.three }}>Text nicht gefunden.</Text>
      </View>
    );
  }

  const markRead = () => {
    if (read) return;
    awardXp(XP_READ_TEXT);
    registerActivity();
    kvSet(`read:${id}`, '1');
    setRead(true);
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.paragraph}>
          {tokens.map((t, i) => {
            if (!t.isWord) return <Text key={i} style={{ color: theme.text }}>{t.raw}</Text>;
            const isKnown = knownKeys.has(t.key);
            const inDict = dictKeys.has(t.key);
            const color = isKnown ? theme.text : inDict ? theme.primary : theme.textSecondary;
            return (
              <Text
                key={i}
                onPress={() => onWord(t.raw, t.key)}
                style={{
                  color,
                  fontWeight: isKnown ? '500' : '700',
                  textDecorationLine: inDict && !isKnown ? 'underline' : 'none',
                }}>
                {t.raw}
              </Text>
            );
          })}
        </Text>

        <View style={styles.legend}>
          <Legend color={theme.text} label="gelernt" theme={theme} />
          <Legend color={theme.primary} label="antippen zum Lernen" theme={theme} />
          <Legend color={theme.textSecondary} label="nicht im Wörterbuch" theme={theme} />
        </View>

        <Button title={read ? 'Gelesen ✓' : 'Als gelesen markieren'} onPress={markRead} disabled={read} />
      </ScrollView>

      {selected && (
        <Card style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.panelHeader}>
            <Pressable onPress={() => speakLatin(selected.raw, pronunciation)} style={styles.panelWordRow}>
              <Text style={[styles.panelWord, { color: theme.text }]}>
                {selected.lemma?.lemma ?? selected.raw}
              </Text>
              <Ionicons name="volume-medium" size={20} color={theme.primary} />
            </Pressable>
            <Pressable onPress={() => setSelected(null)} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>
          {selected.lemma ? (
            <>
              {selected.lemma.principalParts ? (
                <Text style={[styles.panelParts, { color: theme.textSecondary }]}>
                  {selected.lemma.principalParts}
                </Text>
              ) : null}
              <Text style={[styles.panelGloss, { color: theme.primary }]}>
                {selected.lemma.glossDe}
              </Text>
              <Button
                title={added ? 'Hinzugefügt ✓' : 'Zu Vokabeln hinzufügen'}
                variant="secondary"
                disabled={added}
                onPress={() => {
                  if (selected.lemma) {
                    addLemmaToVocab(selected.lemma.id);
                    setAdded(true);
                  }
                }}
              />
            </>
          ) : (
            <Text style={[styles.panelGloss, { color: theme.textSecondary }]}>
              Nicht im Wörterbuch gefunden.
            </Text>
          )}
        </Card>
      )}
    </View>
  );
}

function Legend({ color, label, theme }: { color: string; label: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: Spacing.six * 2, gap: Spacing.four },
  paragraph: { fontSize: 22, lineHeight: 38 },
  legend: { gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { fontSize: 13 },
  panel: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelWordRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  panelWord: { fontSize: 26, fontWeight: '900' },
  panelParts: { fontSize: 14, fontStyle: 'italic' },
  panelGloss: { fontSize: 18, fontWeight: '700' },
});
