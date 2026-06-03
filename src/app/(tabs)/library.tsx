import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { Fonts, Radius, Spacing } from '@/constants/theme';
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
        onPress: () => { deleteBook(id); refresh(); },
      },
    ]);
  };

  const unlocked = items.filter((i) => i.unlocked).length;
  const total = items.length;

  const headerRight = (
    <View style={styles.headerActions}>
      <Pressable
        onPress={upload}
        disabled={busy}
        hitSlop={8}
        style={({ pressed }) => [styles.iconBtn, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
        <Ionicons name={busy ? 'hourglass-outline' : 'add'} size={18} color={theme.primary} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/settings')}
        hitSlop={8}
        style={({ pressed }) => [styles.iconBtn, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
        <Ionicons name="settings-outline" size={18} color={theme.textSecondary} />
      </Pressable>
    </View>
  );

  return (
    <Screen scroll padded={false}>
      <PageHeader title="Bibliotheca" right={headerRight} />
      <View style={styles.content}>

      {/* ── Coverage summary ── */}
      {total > 0 && (
        <Text style={[styles.summary, { color: theme.textSecondary }]}>
          {unlocked}/{total} {unlocked === 1 ? 'Text' : 'Texte'} freigeschaltet
          {' · '}Wortschatz ≥ 90 % nötig
        </Text>
      )}

      {/* ── Book list ── */}
      {total === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={36} color={theme.border} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Keine Texte</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Tippe das + oben, um einen eigenen Text hochzuladen.
          </Text>
        </View>
      ) : (
        <View style={[styles.bookList, { borderColor: theme.border }]}>
          {items.map((it, i) => (
            <BookRow
              key={it.book.id}
              item={it}
              theme={theme}
              last={i === items.length - 1}
              onDelete={confirmDelete}
            />
          ))}
        </View>
      )}

      {total > 0 && (
        <View style={{ marginTop: Spacing.three }}>
          <Button
            title={busy ? 'Lade…' : 'Text hochladen (.txt)'}
            variant="ghost"
            loading={busy}
            onPress={upload}
          />
        </View>
      )}
      </View>
    </Screen>
  );
}

// ── BookRow ────────────────────────────────────────────────────────────────

function BookRow({
  item,
  theme,
  last,
  onDelete,
}: {
  item: BookCoverage;
  theme: ReturnType<typeof useTheme>;
  last: boolean;
  onDelete: (id: string, title: string) => void;
}) {
  const { book, ratio, unlocked } = item;
  const pct = Math.round(ratio * 100);
  const fillColor = unlocked ? theme.success : theme.primary;

  return (
    <Pressable
      onPress={() => router.push(`/reader/${book.id}`)}
      style={({ pressed }) => [
        styles.bookRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && { opacity: 0.75 },
      ]}>

      {/* Lock / unlock icon */}
      <Ionicons
        name={unlocked ? 'lock-open-outline' : 'lock-closed-outline'}
        size={16}
        color={unlocked ? theme.success : theme.textSecondary}
        style={{ flexShrink: 0, marginTop: 2 }}
      />

      {/* Text info */}
      <View style={{ flex: 1 }}>
        <Text style={[styles.bookTitle, { color: theme.text }]} numberOfLines={1}>
          {book.title}
        </Text>
        {book.author ? (
          <Text style={[styles.bookAuthor, { color: theme.textSecondary }]} numberOfLines={1}>
            {book.author}
          </Text>
        ) : null}

        {/* Coverage band */}
        <View style={styles.coverageRow}>
          <View style={[styles.coverageTrack, { backgroundColor: theme.muted }]}>
            <View style={[styles.coverageFill, { width: `${pct}%`, backgroundColor: fillColor }]} />
          </View>
          <Text style={[styles.coveragePct, { color: unlocked ? theme.success : theme.textSecondary }]}>
            {pct}%
          </Text>
        </View>
      </View>

      {/* Level badge + delete */}
      <View style={styles.bookRight}>
        <View style={[styles.levelBadge, { backgroundColor: theme.muted }]}>
          <Text style={[styles.levelText, { color: theme.text }]}>{book.level}</Text>
        </View>
        {!book.builtin && (
          <Pressable onPress={() => onDelete(book.id, book.title)} hitSlop={8} style={{ marginLeft: 8 }}>
            <Ionicons name="trash-outline" size={16} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  headerActions: { flexDirection: 'row', gap: Spacing.two },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summary: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.three },

  // Book list container
  bookList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: 13,
    paddingHorizontal: Spacing.three,
  },

  // Book info
  bookTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  bookAuthor: { fontSize: 12, marginBottom: 5 },
  coverageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  coverageTrack: { flex: 1, height: 2, borderRadius: 1, overflow: 'hidden' },
  coverageFill: { height: 2, borderRadius: 1 },
  coveragePct: { fontSize: 11, fontWeight: '700', minWidth: 28, textAlign: 'right' },

  // Right side
  bookRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  levelText: { fontSize: 11, fontWeight: '800' },

  // Empty state
  emptyState: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
