import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TabScreen } from '@/components/ui/tab-screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getBooksWithCoverage, type BookCoverage } from '@/lib/knowledge';
import { deleteBook, importBook } from '@/lib/reading';
import { parseEpub } from '@/lib/reading/epub';

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
        type: ['application/epub+zip', 'text/plain', 'text/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const rawName = (asset.name ?? 'Upload').replace(/\.[^.]+$/, '');
      const isEpub = asset.name?.toLowerCase().endsWith('.epub')
        || asset.mimeType === 'application/epub+zip';

      if (isEpub) {
        // Parse the EPUB directly from the cached file — no second copy.
        // DocumentPicker already copied it to cache (copyToCacheDirectory: true).
        const b64 = await readAsStringAsync(asset.uri, { encoding: 'base64' });
        const bytes = base64ToUint8Array(b64);
        const epub = parseEpub(bytes);

        // Filename as primary title, EPUB metadata as enhancement
        const title = rawName || epub.title || 'Ohne Titel';
        const chapterTitles = epub.chapters.map((c) => c.title);
        importBook(title, epub.body, epub.author || 'Unbekannt', {
          filePath: asset.uri,
          chapterTitles,
        });
      } else {
        const content = await readAsStringAsync(asset.uri);
        importBook(rawName, content);
      }
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
    <Pressable onPress={() => router.push('/profile')} hitSlop={12}>
      <MaterialCommunityIcons name="shield-account-outline" size={24} color={theme.textSecondary} />
    </Pressable>
  );

  return (
    <TabScreen title="Bibliotheca" headerRight={headerRight}>

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
          onPress={upload}
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
            Lade eine .txt- oder .epub-Datei hoch, um lateinische Texte zu lesen.
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

// ── Helpers ────────────────────────────────────────────────────────────────

/** Decode a base64 string into a Uint8Array (works in RN without atob). */
function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
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
