import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TabScreen } from '@/components/ui/tab-screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getBooksWithCoverage, type BookCoverage } from '@/lib/knowledge';
import { deleteBook, importBook } from '@/lib/reading';
import { parseEpub } from '@/lib/reading/epub';
import { buildReaderHtml, dropCachedReaderHtml } from '@/lib/reading/html-cache';

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
        type: ['application/epub+zip'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const rawName = (asset.name ?? 'Upload').replace(/\.[^.]+$/, '');

      const bytes = await new File(asset.uri).bytes();
      const epub = parseEpub(bytes);

      // The picker URI lives in the cache and may be reaped by the OS — copy
      // the EPUB into a persistent app directory before storing its path.
      let persistentUri = asset.uri;
      try {
        const booksDir = new Directory(Paths.document, 'books');
        if (!booksDir.exists) booksDir.create({ intermediates: true, idempotent: true });
        const dest = new File(booksDir, `${Date.now()}-${rawName.replace(/[^A-Za-z0-9_-]/g, '_')}.epub`);
        new File(asset.uri).copy(dest);
        persistentUri = dest.uri;
      } catch {
        /* keep the cache URI as fallback */
      }

      // Filename as primary title, EPUB metadata as enhancement
      const title = rawName || epub.title || 'Ohne Titel';
      const chapterTitles = epub.chapters.map((c) => c.title);
      const bookId = importBook(title, epub.body, epub.author || 'Unbekannt', {
        filePath: persistentUri,
        chapterTitles,
      });
      refresh();

      // Pre-build the reader document in the background so the first open
      // starts instantly.
      buildReaderHtml(bookId, epub.chapters).catch(() => {});
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
          const filePath = items.find((i) => i.book.id === id)?.book.filePath;
          deleteBook(id);
          dropCachedReaderHtml(id);
          // Remove our persistent copy of the EPUB (not picker-cache URIs).
          if (filePath && filePath.includes('/books/')) {
            try {
              const f = new File(filePath);
              if (f.exists) f.delete();
            } catch { /* best effort */ }
          }
          refresh();
        },
      },
    ]);
  };

  const unlocked = items.filter((i) => i.unlocked).length;
  const total = items.length;

  return (
    <TabScreen title="Bibliotheca">

      {/* ── Summary + upload ── */}
      <View style={styles.summaryRow}>
        {total > 0 ? (
          <Text style={[styles.summary, { color: theme.textSecondary }]}>
            {unlocked}/{total} {unlocked === 1 ? 'Text' : 'Texte'} freigeschaltet
            {' · '}Wortschatz ≥ 90 % nötig
          </Text>
        ) : (
          <View />
        )}
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            }
            upload();
          }}
          disabled={busy}
          hitSlop={8}
          style={({ pressed }) => [
            styles.uploadBtn,
            { borderColor: theme.border },
            pressed && { opacity: 0.6 },
          ]}>
          <Ionicons name={busy ? 'hourglass-outline' : 'cloud-upload-outline'} size={14} color={theme.primary} />
          <Text style={[styles.uploadBtnText, { color: theme.primary }]}>
            {busy ? 'Lädt…' : 'Hochladen'}
          </Text>
        </Pressable>
      </View>

      {/* ── Book list ── */}
      {total === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={36} color={theme.border} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Keine Texte</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Lade eine .epub-Datei hoch, um lateinische Texte zu lesen.
          </Text>
          <Button
            title={busy ? 'Lade…' : 'Text hochladen'}
            variant="ghost"
            loading={busy}
            onPress={upload}
          />
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

    </TabScreen>
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
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        router.push(`/reader/${book.id}`);
      }}
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
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }
              onDelete(book.id, book.title);
            }}
            hitSlop={8}
            style={{ marginLeft: 8 }}>
            <Ionicons name="trash-outline" size={16} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  summary: { fontSize: 13, lineHeight: 18, flex: 1 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  uploadBtnText: { fontSize: 12, fontWeight: '700' },

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
