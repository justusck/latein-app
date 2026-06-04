import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SearchBar } from '@/components/ui/search-bar';
import { TabScreen } from '@/components/ui/tab-screen';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';
import { getAllLemmasWithStatus, getVocabStats, type LemmaWithFullStatus, type VocabStats } from '@/lib/vocab';
import { importVocab, parseDeck } from '@/lib/vocab/import';
import { useApp } from '@/store/app';

// ── Filter & Sort types ────────────────────────────────────────────────────

type FilterKey = 'all' | 'new' | 'introduced' | 'known';
type SortKey = 'freq' | 'recent';

interface FilterDef {
  key: FilterKey;
  status: LemmaWithFullStatus['status'] | null; // null = all
  labelKey: 'filterAll' | 'statusNew' | 'statusIntroduced' | 'statusKnown';
}

const FILTERS: FilterDef[] = [
  { key: 'all', status: null, labelKey: 'filterAll' },
  { key: 'new', status: 'new', labelKey: 'statusNew' },
  { key: 'introduced', status: 'introduced', labelKey: 'statusIntroduced' },
  { key: 'known', status: 'known', labelKey: 'statusKnown' },
];

// ── Screen ──────────────────────────────────────────────────────────────────

export default function VocabScreen() {
  const theme = useTheme();
  const t = useStrings();
  const dailyGoalNew = useApp((s) => s.dailyGoalNew);
  const [allLemmas, setAllLemmas] = useState<LemmaWithFullStatus[]>([]);
  const [stats, setStats] = useState<VocabStats | null>(null);
  const [importing, setImporting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [sortBy, setSortBy] = useState<SortKey>('freq');
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = useCallback(() => {
    setStats(getVocabStats(dailyGoalNew));
    setAllLemmas(getAllLemmasWithStatus());
  }, [dailyGoalNew]);

  useFocusEffect(useCallback(() => refresh(), [refresh]));

  // ── Counts per filter ──────────────────────────────────────────────────

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: 0, new: 0, introduced: 0, known: 0 };
    for (const l of allLemmas) {
      c.all++;
      c[l.status]++;
    }
    return c;
  }, [allLemmas]);

  // ── Filter → search → sort pipeline ────────────────────────────────────

  const displayed = useMemo(() => {
    let list = [...allLemmas];

    // Filter by status
    const filter = FILTERS.find((f) => f.key === activeFilter);
    if (filter?.status) {
      list = list.filter((l) => l.status === filter.status);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.lemma.toLowerCase().includes(q) ||
          l.glossDe.toLowerCase().includes(q) ||
          (l.principalParts ?? '').toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortBy === 'recent') {
      list.sort((a, b) => (b.lastReview ?? 0) - (a.lastReview ?? 0));
    } else {
      list.sort((a, b) => (a.freqRank ?? 99999) - (b.freqRank ?? 99999));
    }

    return list;
  }, [allLemmas, activeFilter, searchQuery, sortBy]);

  // ── Import (unchanged logic) ───────────────────────────────────────────

  const importDeck = async () => {
    try {
      setImporting(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/tab-separated-values'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const content = await readAsStringAsync(res.assets[0].uri);
      const rows = parseDeck(content);
      if (rows.length === 0) {
        Alert.alert('Keine Vokabeln gefunden', 'Erwartet wird pro Zeile: Latein <Tab> Deutsch.');
        return;
      }
      const { added, skipped } = importVocab(rows);
      refresh();
      Alert.alert(
        'Import abgeschlossen',
        `${added} neue Vokabeln hinzugefügt${skipped ? `, ${skipped} übersprungen` : ''}.`,
      );
    } catch (e) {
      Alert.alert('Import fehlgeschlagen', e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  };

  // ── Today summary values ───────────────────────────────────────────────

  const due = stats?.dueCount ?? 0;
  const newRemaining = stats?.newRemainingToday ?? 0;
  const canStudy = due > 0 || newRemaining > 0;
  const totalToday = due + newRemaining;

  const headerRight = (
    <Pressable onPress={() => router.push('/profile')} hitSlop={12}>
      <MaterialCommunityIcons name="shield-account-outline" size={24} color={theme.textSecondary} />
    </Pressable>
  );

  // ── Main render ────────────────────────────────────────────────────────

  return (
    <TabScreen title={t.vocabTitle} headerRight={headerRight} scroll={false}>
      <FlatList
        data={displayed}
        keyExtractor={(l) => String(l.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* ── Today summary + actions ────────────────────────────────── */}
            <View style={styles.todayRow}>
              <View style={styles.todayInfo}>
                <Text style={[styles.todayCount, { color: theme.text }]}>{totalToday}</Text>
                <Text style={[styles.todayLabel, { color: theme.textSecondary }]}>
                  {t.cardsToday(totalToday)}
                </Text>
                <View style={styles.todayDetail}>
                  {due > 0 && (
                    <Text style={[styles.todayDetailText, { color: theme.primary }]}>
                      {due} fällig
                    </Text>
                  )}
                  {due > 0 && newRemaining > 0 && (
                    <Text style={[styles.todayDetailSep, { color: theme.border }]}> · </Text>
                  )}
                  {newRemaining > 0 && (
                    <Text style={[styles.todayDetailText, { color: theme.textSecondary }]}>
                      {newRemaining} neu
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.todayActions}>
                <Pressable
                  onPress={() => router.push('/vocab-session')}
                  disabled={!canStudy}
                  style={({ pressed }) => [
                    styles.cta,
                    { backgroundColor: theme.primary },
                    !canStudy && { opacity: 0.35 },
                    pressed && canStudy && { opacity: 0.85 },
                  ]}>
                  <Text style={styles.ctaText}>
                    {canStudy ? t.startStudying : t.allDone}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/vocab-session?mode=free')}
                  style={({ pressed }) => [
                    styles.freeBtn,
                    { borderColor: theme.border },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <Ionicons name="flash-outline" size={13} color={theme.textSecondary} />
                  <Text style={[styles.freeBtnText, { color: theme.textSecondary }]}>
                    {t.freePractice}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ── Divider ────────────────────────────────────────────────── */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* ── Search bar ─────────────────────────────────────────────── */}
            <View style={styles.searchGap}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t.searchVocab}
              />
            </View>

            {/* ── Filter pills (horizontal scroll, no wrap) ───────────────── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
              style={{ marginBottom: Spacing.three }}>
              {FILTERS.map((f) => {
                const isActive = activeFilter === f.key;
                const label = t[f.labelKey];
                const count = counts[f.key];
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setActiveFilter(f.key)}
                    style={({ pressed }) => [
                      styles.filterPill,
                      {
                        backgroundColor: isActive ? theme.primary : theme.muted,
                        borderColor: isActive ? theme.primary : theme.border,
                      },
                      pressed && { opacity: isActive ? 0.85 : 0.65 },
                    ]}>
                    <Text
                      style={[
                        styles.filterPillLabel,
                        { color: isActive ? '#FFFFFF' : theme.textSecondary },
                      ]}>
                      {label}
                    </Text>
                    <Text
                      style={[
                        styles.filterPillCount,
                        { color: isActive ? 'rgba(255,255,255,0.75)' : theme.textSecondary },
                      ]}>
                      {count}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* ── Section head with sort ──────────────────────────────────── */}
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                {searchQuery.trim()
                  ? `${displayed.length} ${displayed.length === 1 ? 'Treffer' : 'Treffer'}`
                  : activeFilter === 'all'
                    ? `${counts.all} ${counts.all === 1 ? 'Vokabel' : 'Vokabeln'}`
                    : `${counts[activeFilter]} ${t[FILTERS.find((f) => f.key === activeFilter)!.labelKey]}`}
              </Text>
              <Pressable
                onPress={() => setSortBy((s) => (s === 'freq' ? 'recent' : 'freq'))}
                hitSlop={8}
                style={({ pressed }) => [styles.sortBtn, pressed && { opacity: 0.5 }]}>
                <Text style={[styles.sortLabel, { color: theme.textSecondary }]}>
                  {sortBy === 'freq' ? t.sortFreq : t.sortRecent}
                </Text>
                <Ionicons
                  name="swap-vertical-outline"
                  size={12}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <WordRow lemma={item} theme={theme} t={t} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={36} color={theme.border} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery.trim() ? t.noVocabFound : t.noVocabFound}
            </Text>
          </View>
        }
        ListFooterComponent={
          <>
            {/* ── Import link ────────────────────────────────────────────── */}
            <Pressable
              onPress={importDeck}
              disabled={importing}
              style={({ pressed }) => [styles.importLink, pressed && { opacity: 0.5 }]}>
              <Ionicons name="add-circle-outline" size={15} color={theme.textSecondary} />
              <Text style={[styles.importLinkText, { color: theme.textSecondary }]}>
                {importing ? t.importing : t.importVocab}
              </Text>
            </Pressable>
            {/* Bottom spacer so last rows aren't hidden behind tab bar */}
            <View style={styles.bottomSpacer} />
          </>
        }
      />
    </TabScreen>
  );
}

// ── WordRow ─────────────────────────────────────────────────────────────────

function WordRow({
  lemma,
  theme,
  t,
}: {
  lemma: LemmaWithFullStatus;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useStrings>;
}) {
  const now = Date.now();
  const isDue = lemma.due !== null && lemma.due <= now;

  const icon = (() => {
    switch (lemma.status) {
      case 'known':
        return { name: 'checkmark-circle' as const, color: theme.success };
      case 'introduced':
        return { name: 'time-outline' as const, color: isDue ? theme.primary : theme.textSecondary };
      default:
        return { name: 'ellipse-outline' as const, color: theme.textSecondary };
    }
  })();

  return (
    <View style={[styles.wordRow, { borderColor: theme.border }]}>
      {/* Status icon + due dot */}
      <View style={styles.wordIconWrap}>
        <Ionicons name={icon.name} size={18} color={icon.color} />
        {isDue && (
          <View
            style={[styles.dueDot, { backgroundColor: theme.primary }]}
            accessibilityLabel={t.dueToday}
          />
        )}
      </View>

      {/* Text content */}
      <View style={styles.wordBody}>
        <View style={styles.wordHead}>
          <Text style={[styles.wordLemma, { color: theme.text }]} numberOfLines={1}>
            {lemma.lemma}
          </Text>
          {lemma.pos && (
            <Text style={[styles.wordPos, { color: theme.textSecondary }]}>
              {lemma.pos}
            </Text>
          )}
        </View>
        {lemma.principalParts ? (
          <Text style={[styles.wordParts, { color: theme.textSecondary }]} numberOfLines={1}>
            {lemma.principalParts}
          </Text>
        ) : null}
        <Text style={[styles.wordGloss, { color: theme.textSecondary }]} numberOfLines={1}>
          {lemma.glossDe}
        </Text>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: Spacing.three,
  },

  // ── Today summary (preserved) ──────────────────────────────────────────
  todayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.four,
  },
  todayInfo: { flex: 1 },
  todayCount: {
    fontFamily: Fonts.serifBody,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '400',
  },
  todayLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  todayDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  todayDetailText: { fontSize: 12, fontWeight: '600' },
  todayDetailSep: { fontSize: 12, marginHorizontal: 4 },

  todayActions: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  cta: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    minWidth: 140,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontFamily: Fonts.serif,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  freeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  freeBtnText: { fontSize: 11, fontWeight: '600' },

  // ── Divider ────────────────────────────────────────────────────────────
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.four },

  // ── Search ─────────────────────────────────────────────────────────────
  searchGap: {
    marginBottom: Spacing.two + 2,
  },

  // ── Filters ────────────────────────────────────────────────────────────
  filterScroll: {
    gap: Spacing.one,
    paddingRight: Spacing.three, // breathing room at end of scroll
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterPillLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterPillCount: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // ── Section head + sort ────────────────────────────────────────────────
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.half,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Word rows ──────────────────────────────────────────────────────────
  wordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wordIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  dueDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  wordBody: {
    flex: 1,
    gap: 1,
  },
  wordHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one + 2,
  },
  wordLemma: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  wordPos: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  wordParts: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  wordGloss: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Empty ──────────────────────────────────────────────────────────────
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Import ─────────────────────────────────────────────────────────────
  importLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.one,
    marginTop: Spacing.four,
  },
  importLinkText: { fontSize: 12, fontWeight: '500' },

  // ── Misc ───────────────────────────────────────────────────────────────
  bottomSpacer: { height: Spacing.six },
});
