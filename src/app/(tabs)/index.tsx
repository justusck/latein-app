import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  InteractionManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { SearchBar } from '@/components/ui/search-bar';
import { CourseSwitcher } from '@/components/ui/course-switcher';
import { TabScreen } from '@/components/ui/tab-screen';
import { useCourse } from '@/hooks/use-course';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { getAllLemmasWithStatus, getVocabStats, type LemmaWithFullStatus, type VocabStats } from '@/lib/vocab';
import {
  deleteLemma,
  deletePackage,
  findDuplicates,
  importVocab,
  listPackages,
  parseDeck,
  type DuplicateGroup,
} from '@/lib/vocab/import';
import type { AnkiPackage } from '@/db/schema';
import { useApp } from '@/store/app';

// ── Filter & Sort types ────────────────────────────────────────────────────

type FilterKey = 'all' | 'new' | 'introduced' | 'known' | 'duplicates';
type SortKey = 'freq' | 'recent';

interface FilterDef {
  key: FilterKey;
  status: LemmaWithFullStatus['status'] | null;
  labelKey: 'filterAll' | 'statusNew' | 'statusIntroduced' | 'statusKnown' | 'filterDuplicates';
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function VocabScreen() {
  const theme = useTheme();
  const course = useCourse();
  const t = useStrings();
  const reducedMotion = useReducedMotion();
  const dailyGoalNew = useApp((s) => s.dailyGoalNew);
  const vocabRev = useApp((s) => s.vocabRev);
  const bumpVocabRev = useApp((s) => s.bumpVocabRev);
  const [allLemmas, setAllLemmas] = useState<LemmaWithFullStatus[]>([]);
  const [listReady, setListReady] = useState(false);
  const [stats, setStats] = useState<VocabStats | null>(null);
  const [importing, setImporting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [sortBy, setSortBy] = useState<SortKey>('freq');
  const [searchQuery, setSearchQuery] = useState('');
  const [packages, setPackages] = useState<AnkiPackage[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);

  // Track the currently open swipeable row so only one is open at a time.
  const openSwipeableRef = useRef<Swipeable | null>(null);

  // The ~5300-row list is expensive to marshal out of SQLite, so it is only
  // (re)loaded when vocabRev changes — not on every tab focus — and only
  // after the tab transition has finished painting.
  const loadedRev = useRef<number | null>(null);

  const refreshStats = useCallback(() => {
    setStats(getVocabStats(dailyGoalNew)); // a handful of COUNTs — cheap
  }, [dailyGoalNew]);

  const loadHeavy = useCallback(
    (rev: number) => {
      setAllLemmas(getAllLemmasWithStatus());
      setPackages(listPackages());
      setDuplicates(findDuplicates());
      setListReady(true);
      loadedRev.current = rev;
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      refreshStats();
      if (loadedRev.current === vocabRev) return;
      const task = InteractionManager.runAfterInteractions(() => loadHeavy(vocabRev));
      return () => task.cancel();
    }, [refreshStats, loadHeavy, vocabRev]),
  );

  // ── Derived data ────────────────────────────────────────────────────────

  const duplicateLemmaIds = useMemo(() => {
    const ids = new Set<number>();
    for (const d of duplicates) {
      for (const l of d.lemmas) ids.add(l.id);
    }
    return ids;
  }, [duplicates]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: 0, new: 0, introduced: 0, known: 0, duplicates: 0 };
    for (const l of allLemmas) {
      c.all++;
      c[l.status]++;
      if (duplicateLemmaIds.has(l.id)) c.duplicates++;
    }
    return c;
  }, [allLemmas, duplicateLemmaIds]);

  // ── Dynamic filter definitions ───────────────────────────────────────────

  const filters: FilterDef[] = useMemo(() => {
    const base: FilterDef[] = [
      { key: 'all', status: null, labelKey: 'filterAll' },
      { key: 'new', status: 'new', labelKey: 'statusNew' },
      { key: 'introduced', status: 'introduced', labelKey: 'statusIntroduced' },
      { key: 'known', status: 'known', labelKey: 'statusKnown' },
    ];
    if (duplicates.length > 0) {
      base.push({ key: 'duplicates', status: null, labelKey: 'filterDuplicates' });
    }
    return base;
  }, [duplicates.length]);

  // ── Filter → search → sort pipeline ────────────────────────────────────

  const displayed = useMemo(() => {
    let list = [...allLemmas];

    // Duplicate filter: show only words that appear in a duplicate group
    if (activeFilter === 'duplicates') {
      list = list.filter((l) => duplicateLemmaIds.has(l.id));
    } else {
      const filter = filters.find((f) => f.key === activeFilter);
      if (filter?.status) {
        list = list.filter((l) => l.status === filter.status);
      }
    }

    // Search against the precomputed lowercase haystack (one includes() per row)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((l) => l.searchKey.includes(q));
    }

    // Sort
    if (sortBy === 'recent') {
      list.sort((a, b) => (b.lastReview ?? 0) - (a.lastReview ?? 0));
    } else {
      list.sort((a, b) => (a.freqRank ?? 99999) - (b.freqRank ?? 99999));
    }

    return list;
  }, [allLemmas, activeFilter, searchQuery, sortBy, duplicateLemmaIds, filters]);

  // ── Import ──────────────────────────────────────────────────────────────

  const importDeck = async () => {
    try {
      setImporting(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/tab-separated-values'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const rawName = (res.assets[0].name ?? 'Import').replace(/\.[^.]+$/, '');
      const content = await readAsStringAsync(res.assets[0].uri);
      const rows = parseDeck(content);
      if (rows.length === 0) {
        Alert.alert('Keine Vokabeln gefunden', 'Erwartet wird pro Zeile: Latein <Tab> Deutsch.');
        return;
      }
      const { added, skipped } = importVocab(rows, rawName);
      refreshStats();
      bumpVocabRev();
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

  // ── Delete handlers ────────────────────────────────────────────────────

  const confirmDeletePackage = (pkg: AnkiPackage) => {
    Alert.alert(t.deletePackage, t.deletePackageConfirm(pkg.name, pkg.wordCount), [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: t.deletePackage,
        style: 'destructive',
        onPress: () => { deletePackage(pkg.id); refreshStats(); bumpVocabRev(); },
      },
    ]);
  };

  const confirmDeleteLemma = useCallback(
    (lemma: LemmaWithFullStatus) => {
      Alert.alert(t.deleteVocab, t.deleteVocabConfirm(lemma.lemma), [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: t.deleteVocab,
          style: 'destructive',
          onPress: () => { deleteLemma(lemma.id); refreshStats(); bumpVocabRev(); },
        },
      ]);
    },
    [t, refreshStats, bumpVocabRev],
  );

  // ── Today summary values ───────────────────────────────────────────────

  const due = stats?.dueCount ?? 0;
  const newRemaining = stats?.newRemainingToday ?? 0;
  const canStudy = due > 0 || newRemaining > 0;
  const totalToday = due + newRemaining;

  // ── Row rendering (stable callback so memoized rows skip re-renders) ───

  const renderItem = useCallback(
    ({ item }: { item: LemmaWithFullStatus }) => (
      <WordRow
        lemma={item}
        theme={theme}
        t={t}
        reducedMotion={reducedMotion}
        isDuplicate={duplicateLemmaIds.has(item.id)}
        onDelete={confirmDeleteLemma}
        openSwipeableRef={openSwipeableRef}
      />
    ),
    [theme, t, reducedMotion, duplicateLemmaIds, confirmDeleteLemma],
  );

  // ── Main render ────────────────────────────────────────────────────────

  return (
    <TabScreen title={course.tabLabels.vocab} titleExtra={<CourseSwitcher />} scroll={false}>
      <FlatList
        data={displayed}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={14}
        maxToRenderPerBatch={20}
        updateCellsBatchingPeriod={40}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* ── Manuscript Card ────────────────────────────────── */}
            <View style={[styles.manuscript, { backgroundColor: theme.card, borderColor: theme.primary }]}>
              {/* Gold ornament */}
              <View style={[styles.manuscriptOrnament, { backgroundColor: theme.accent }]} />

              {/* Count + label */}
              <Text style={[styles.manuscriptCount, { color: theme.text }]}>
                {totalToday}
              </Text>
              <Text style={[styles.manuscriptLabel, { color: theme.textSecondary }]}>
                {t.cardsToday(totalToday)}
              </Text>

              {/* Status chips */}
              {(due > 0 || newRemaining > 0) && (
                <View style={styles.manuscriptChips}>
                  {due > 0 && (
                    <View style={[styles.chip, { backgroundColor: theme.muted }]}>
                      <View style={[styles.chipDot, { backgroundColor: theme.primary }]} />
                      <Text style={[styles.chipText, { color: theme.primary }]}>
                        {due} fällig
                      </Text>
                    </View>
                  )}
                  {newRemaining > 0 && (
                    <View style={[styles.chip, { backgroundColor: theme.muted }]}>
                      <View style={[styles.chipDot, { backgroundColor: theme.accent }]} />
                      <Text style={[styles.chipText, { color: theme.accent }]}>
                        {newRemaining} neu
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Actions — both paths equally deliberate */}
              <View style={styles.manuscriptActions}>
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
                    }
                    router.push('/vocab-session');
                  }}
                  disabled={!canStudy}
                  style={({ pressed }) => [
                    styles.studyCta,
                    { backgroundColor: theme.primary },
                    !canStudy && { opacity: 0.35 },
                    pressed && canStudy && { opacity: 0.88 },
                  ]}>
                  <Ionicons name="book-outline" size={18} color="#fff" />
                  <Text style={styles.studyCtaText}>
                    {canStudy ? t.startStudying : t.allDone}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    }
                    router.push('/vocab-session?mode=free');
                  }}
                  style={({ pressed }) => [
                    styles.freeStudyCta,
                    { borderColor: theme.accent },
                    pressed && { backgroundColor: theme.accent + '10' },
                  ]}>
                  <Ionicons name="flash-outline" size={17} color={theme.accent} />
                  <Text style={[styles.freeStudyCtaText, { color: theme.accent }]}>
                    {t.freePractice}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ── Packages section ───────────────────────────────── */}
            <View style={[styles.packageSection, { borderColor: theme.border }]}>
              <View style={styles.packageHeader}>
                <Ionicons name="folder-open-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.packageHeaderText, { color: theme.textSecondary }]}>
                  {t.packagesTitle}
                </Text>
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    }
                    importDeck();
                  }}
                  disabled={importing}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.uploadBtn,
                    { borderColor: theme.primary },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <Ionicons name={importing ? 'hourglass-outline' : 'add-outline'} size={13} color={theme.primary} />
                  <Text style={[styles.uploadBtnText, { color: theme.primary }]}>
                    {importing ? t.importing : t.uploadPackage}
                  </Text>
                </Pressable>
              </View>

              {packages.length === 0 ? (
                <Text style={[styles.noPackagesText, { color: theme.textSecondary }]}>
                  {t.noPackages}
                </Text>
              ) : (
                <View style={[styles.packageList, { borderColor: theme.border }]}>
                  {packages.map((pkg, i) => (
                    <View
                      key={pkg.id}
                      style={[
                        styles.packageRow,
                        i < packages.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.border,
                        },
                      ]}>
                      <Ionicons name="document-text-outline" size={15} color={theme.textSecondary} style={{ flexShrink: 0, marginTop: 1 }} />
                      <View style={styles.packageInfo}>
                        <Text style={[styles.packageName, { color: theme.text }]} numberOfLines={1}>
                          {pkg.name}
                        </Text>
                        <Text style={[styles.packageMeta, { color: theme.textSecondary }]}>
                          {t.packageWords(pkg.wordCount)} · {fmtDate(pkg.importedAt)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          }
                          confirmDeletePackage(pkg);
                        }}
                        hitSlop={8}
                        style={({ pressed }) => [pressed && { opacity: 0.5 }]}>
                        <Ionicons name="trash-outline" size={15} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
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
              {filters.map((f) => {
                const isActive = activeFilter === f.key;
                const label = t[f.labelKey];
                const count = counts[f.key];
                const isDuplicates = f.key === 'duplicates';
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }
                      setActiveFilter(f.key);
                    }}
                    style={({ pressed }) => [
                      styles.filterPill,
                      {
                        backgroundColor: isActive
                          ? (isDuplicates ? theme.danger : theme.primary)
                          : theme.muted,
                        borderColor: isActive
                          ? (isDuplicates ? theme.danger : theme.primary)
                          : theme.border,
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
                  : activeFilter === 'duplicates'
                    ? `${counts.duplicates} ${t.filterDuplicates}`
                    : activeFilter === 'all'
                      ? `${counts.all} ${counts.all === 1 ? 'Vokabel' : 'Vokabeln'}`
                      : `${counts[activeFilter]} ${t[filters.find((f) => f.key === activeFilter)!.labelKey]}`}
              </Text>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }
                  setSortBy((s) => (s === 'freq' ? 'recent' : 'freq'));
                }}
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
        renderItem={renderItem}
        ListEmptyComponent={
          !listReady ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={theme.primary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Wörterliste wird geladen…
              </Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons
                name={activeFilter === 'duplicates' ? 'checkmark-circle-outline' : 'search-outline'}
                size={36}
                color={theme.border}
              />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {activeFilter === 'duplicates' ? t.noDuplicates : t.noVocabFound}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          /* Bottom spacer so last rows aren't hidden behind tab bar */
          <View style={styles.bottomSpacer} />
        }
      />
    </TabScreen>
  );
}

// ── WordRow ─────────────────────────────────────────────────────────────────

const keyExtractor = (l: LemmaWithFullStatus) => String(l.id);

const WordRow = memo(function WordRow({
  lemma,
  theme,
  t,
  reducedMotion,
  isDuplicate,
  onDelete,
  openSwipeableRef,
}: {
  lemma: LemmaWithFullStatus;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useStrings>;
  reducedMotion: boolean;
  isDuplicate: boolean;
  onDelete: (lemma: LemmaWithFullStatus) => void;
  openSwipeableRef: React.MutableRefObject<Swipeable | null>;
}) {
  const now = Date.now();
  const isDue = lemma.due !== null && lemma.due <= now;
  const swipeableRef = useRef<Swipeable | null>(null);

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

  const handleSwipeOpen = () => {
    // Close the previously open row
    if (openSwipeableRef.current && openSwipeableRef.current !== swipeableRef.current) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = swipeableRef.current;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    onDelete(lemma);
  };

  const rowContent = (
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
          {isDuplicate && (
            <View style={[styles.dupBadge, { backgroundColor: theme.danger + '18', borderColor: theme.danger }]}>
              <Ionicons name="git-compare-outline" size={10} color={theme.danger} />
            </View>
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

  return (
    <Swipeable
      ref={swipeableRef}
      enabled={!reducedMotion}
      renderRightActions={(progress) => {
        const opacity = progress.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, 0.4, 1],
        });
        const scale = progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.5, 0.8, 1],
        });
        return (
          <Animated.View style={[styles.swipeAction, { backgroundColor: theme.danger, opacity }]}>
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [styles.swipeActionInner, pressed && { opacity: 0.7 }]}>
              <Animated.View style={{ transform: [{ scale }] }}>
                <Ionicons name="trash" size={20} color="#FFFFFF" />
              </Animated.View>
            </Pressable>
          </Animated.View>
        );
      }}
      onSwipeableWillOpen={handleSwipeOpen}
      onSwipeableWillClose={() => {
        if (openSwipeableRef.current === swipeableRef.current) {
          openSwipeableRef.current = null;
        }
      }}
      overshootRight={false}
      friction={3}
      overshootFriction={8}
      rightThreshold={25}>
      {rowContent}
    </Swipeable>
  );
});

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(epochMs: number): string {
  const d = new Date(epochMs);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: Spacing.three,
  },

  // ── Manuscript Card ──────────────────────────────────────────────────
  manuscript: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  manuscriptOrnament: {
    height: 2,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    borderRadius: 1,
    opacity: 0.65,
  },
  manuscriptCount: {
    fontFamily: Fonts.serifBody,
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  manuscriptLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.half,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  manuscriptChips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  manuscriptActions: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  studyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    paddingVertical: 13,
    borderRadius: Radius.pill,
  },
  studyCtaText: {
    color: '#fff',
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  freeStudyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    paddingVertical: 11,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  freeStudyCtaText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Packages section ──────────────────────────────────────────────────
  packageSection: {
    marginBottom: Spacing.three,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: Spacing.two,
  },
  packageHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  uploadBtnText: { fontSize: 11, fontWeight: '700' },
  noPackagesText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  packageList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 11,
    paddingHorizontal: Spacing.three,
  },
  packageInfo: {
    flex: 1,
    gap: 1,
  },
  packageName: {
    fontSize: 14,
    fontWeight: '700',
  },
  packageMeta: {
    fontSize: 11,
    fontWeight: '500',
  },

  // ── Divider ────────────────────────────────────────────────────────────
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.two },

  // ── Search ─────────────────────────────────────────────────────────────
  searchGap: {
    marginBottom: Spacing.two + 2,
  },

  // ── Filters ────────────────────────────────────────────────────────────
  filterScroll: {
    gap: Spacing.one,
    paddingRight: Spacing.three,
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
    alignItems: 'center',
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
  dupBadge: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  wordParts: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  wordGloss: {
    fontSize: 13,
    fontWeight: '500',
  },
  wordDelete: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Swipe action ────────────────────────────────────────────────────────
  swipeAction: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeActionInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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

  // ── Misc ───────────────────────────────────────────────────────────────
  bottomSpacer: { height: Spacing.six },
});
