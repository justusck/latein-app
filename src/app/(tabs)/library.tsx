import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StatsHeader } from '@/components/stats-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getBooksWithCoverage, type BookCoverage } from '@/lib/knowledge';
import { deleteBook, importBook } from '@/lib/reading';

export default function LibraryScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<BookCoverage[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => setItems(getBooksWithCoverage()), []);
  useFocusEffect(useCallback(() => refresh(), [refresh]));

  const upload = async () => {
    try {
      setBusy(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const content = await readAsStringAsync(asset.uri);
      const title = (asset.name ?? 'Upload').replace(/\.[^.]+$/, '');
      importBook(title, content);
      refresh();
    } catch (e) {
      Alert.alert('Upload fehlgeschlagen', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (id: string, title: string) => {
    Alert.alert('Text löschen?', `„${title}" wird entfernt.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          deleteBook(id);
          refresh();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <ThemedText type="title" style={{ marginBottom: Spacing.two }}>Lesen</ThemedText>
      <StatsHeader />
      <Text style={[styles.intro, { color: theme.textSecondary }]}>
        Texte werden freigeschaltet, sobald du ≥ 90 % ihres Wortschatzes beherrschst. Lade eigene
        Texte hoch — sie werden automatisch mit deinem Wissen abgeglichen.
      </Text>

      <Button title={busy ? 'Lade…' : 'Eigenen Text hochladen (.txt)'} onPress={upload} loading={busy} />

      <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
        {items.map((it) => (
          <BookRow key={it.book.id} item={it} theme={theme} onDelete={confirmDelete} />
        ))}
      </View>
    </Screen>
  );
}

function BookRow({
  item,
  theme,
  onDelete,
}: {
  item: BookCoverage;
  theme: ReturnType<typeof useTheme>;
  onDelete: (id: string, title: string) => void;
}) {
  const { book, ratio, unlocked } = item;
  const pct = Math.round(ratio * 100);
  return (
    <Card onPress={() => router.push(`/reader/${book.id}`)}>
      <View style={styles.bookHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bookTitle, { color: theme.text }]}>{book.title}</Text>
          {book.author ? (
            <Text style={[styles.bookAuthor, { color: theme.textSecondary }]}>{book.author}</Text>
          ) : null}
        </View>
        <View style={[styles.levelBadge, { backgroundColor: theme.muted }]}>
          <Text style={[styles.levelText, { color: theme.text }]}>{book.level}</Text>
        </View>
        {!book.builtin && (
          <Pressable onPress={() => onDelete(book.id, book.title)} hitSlop={8} style={{ marginLeft: 8 }}>
            <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>

      <View style={styles.coverageRow}>
        <Ionicons
          name={unlocked ? 'lock-open' : 'lock-closed'}
          size={14}
          color={unlocked ? theme.success : theme.textSecondary}
        />
        <Text style={[styles.coverageText, { color: unlocked ? theme.success : theme.textSecondary }]}>
          {pct}% lesbar{unlocked ? ' · freigeschaltet' : ''}
        </Text>
      </View>
      <ProgressBar progress={ratio} color={unlocked ? theme.success : theme.primary} height={8} />
    </Card>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.three },
  bookHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  bookTitle: { fontSize: 17, fontWeight: '800' },
  bookAuthor: { fontSize: 13, marginTop: 1 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.sm },
  levelText: { fontSize: 12, fontWeight: '800' },
  coverageRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  coverageText: { fontSize: 12, fontWeight: '700' },
});
