import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SearchBar } from '@/components/ui/search-bar';
import { ParadigmTable } from '@/components/paradigm-table';
import { SwipeableTabs } from '@/components/ui/swipeable-tabs';
import { CourseSwitcher } from '@/components/ui/course-switcher';
import { TabScreen } from '@/components/ui/tab-screen';
import { useCourse } from '@/hooks/use-course';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { ViaSacraPath } from '@/components/ui/via-sacra-path';
import { PARADIGMS as PARADIGMS_LA, type Paradigm } from '@/data/paradigms';
import { PARADIGMS_JA } from '@/data/paradigms-ja';
import { useTheme } from '@/hooks/use-theme';
import { getTopicsWithProgress, type TopicWithProgress } from '@/lib/grammar';
import { lookupWord as lookupWordLa, searchLemmas as searchLemmasLa } from '@/lib/latin/inflect';
import { lookupWordJa, searchLemmasJa } from '@/lib/japanese/lookup';

// ── Segmented control ─────────────────────────────────────────────────────

function SegmentedControl({
  options,
  active,
  onChange,
  theme,
}: {
  options: string[];
  active: number;
  onChange: (i: number) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[segStyles.wrap, { backgroundColor: theme.muted }]}>
      {options.map((label, i) => {
        const on = i === active;
        return (
          <Pressable
            key={label}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }
              onChange(i);
            }}
            style={[
              segStyles.segment,
              on && { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            <Text
              style={[
                segStyles.label,
                { color: on ? theme.text : theme.textSecondary },
              ]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
});

// ── Autocomplete suggestion row ───────────────────────────────────────────

function SuggestionRow({
  lemma,
  glossDe,
  onPress,
  theme,
}: {
  lemma: string;
  glossDe: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        suggStyles.row,
        { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
      ]}>
      <Text style={[suggStyles.lemma, { color: theme.text }]}>{lemma}</Text>
      <Text style={[suggStyles.gloss, { color: theme.textSecondary }]} numberOfLines={1}>
        {glossDe}
      </Text>
      <Ionicons name="arrow-forward" size={14} color={theme.border} />
    </Pressable>
  );
}

const suggStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 11,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.sm,
  },
  lemma: {
    fontSize: 15,
    fontWeight: '700',
    fontStyle: 'italic',
    minWidth: 80,
  },
  gloss: {
    fontSize: 14,
    flex: 1,
  },
});

// ── Reference card (Nachschlagen) ─────────────────────────────────────────

function SectionHeading({ title, theme }: { title: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={headStyles.row}>
      <View style={[headStyles.line, { backgroundColor: theme.accent }]} />
      <Text style={[headStyles.title, { color: theme.text }]}>{title}</Text>
      <View style={[headStyles.line, { backgroundColor: theme.accent }]} />
    </View>
  );
}

const headStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two + 2,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth, opacity: 0.6 },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

function RefCard({
  paradigm,
  icon,
  expanded,
  onToggle,
  theme,
}: {
  paradigm: Paradigm;
  icon: keyof typeof Ionicons.glyphMap;
  expanded: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.cardGridItem}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.refCard,
          {
            backgroundColor: theme.card,
            borderColor: expanded ? theme.primary : theme.border,
          },
          pressed && { opacity: 0.75 },
        ]}>
        <View style={[styles.refMedallion, { backgroundColor: theme.muted }]}>
          <Ionicons name={icon} size={16} color={expanded ? theme.primary : theme.textSecondary} />
        </View>
        <View style={styles.refBody}>
          <Text
            style={[styles.refCardTitle, { color: expanded ? theme.primary : theme.text }]}
            numberOfLines={2}>
            {paradigm.title}
          </Text>
          <Text style={[styles.refCardSub, { color: theme.textSecondary }]} numberOfLines={1}>
            {paradigm.subtitle}
          </Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            }
            router.push(`/trainer/${paradigm.id}`);
          }}
          hitSlop={10}
          style={({ pressed }) => [
            styles.refCardBtn,
            { backgroundColor: theme.primary },
            pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
          ]}>
          <Text style={styles.refCardBtnText}>Üben</Text>
        </Pressable>
      </Pressable>

      {expanded && (
        <View style={{ marginTop: Spacing.two }}>
          <ParadigmTable paradigm={paradigm} />
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

export default function GrammarScreen() {
  const theme = useTheme();
  const course = useCourse();
  const isJa = course.id === 'ja';
  const PARADIGMS = isJa ? PARADIGMS_JA : PARADIGMS_LA;
  const lookupWord = isJa ? lookupWordJa : lookupWordLa;
  const searchLemmas = isJa
    ? (q: string) => searchLemmasJa(q).map((r) => ({ id: r.id, lemma: r.lemma, glossDe: r.glossDe }))
    : searchLemmasLa;
  const refSections: { title: string; kind: string }[] = isJa
    ? [{ title: 'Schriftsystem', kind: 'kana' }, { title: 'Verben', kind: 'verb' }, { title: 'Adjektive', kind: 'adj' }, { title: 'Partikel & Zählwörter', kind: 'particle' }]
    : [{ title: 'Deklinationen', kind: 'noun' }, { title: 'Konjugationen', kind: 'verb' }];
  const searchPlaceholder = isJa ? 'Wort eingeben (z.B. 食べる, 本, です) …' : 'Wort eingeben (z.B. puella, amō, rēx) …';
  const [tab, setTab] = useState(0);
  const [topics, setTopics] = useState<TopicWithProgress[]>([]);

  // ── Search state ────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: number; lemma: string; glossDe: string }[]>([]);
  const [lookupResult, setLookupResult] = useState<{ paradigm: Paradigm; lemma: Record<string, unknown> } | null>(null);
  const [lookupError, setLookupError] = useState(false);
  const [expandedParadigms, setExpandedParadigms] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      setTopics(getTopicsWithProgress());
    }, []),
  );

  const topicStageMap = useMemo(
    () => new Map(topics.map((t) => [t.topic.id, t.topic.stage])),
    [topics],
  );

  const paradigmsByStage = useMemo(() => {
    const map = new Map<string, typeof PARADIGMS>();
    for (const p of PARADIGMS) {
      const stage = topicStageMap.get(p.topicId) ?? 'morphology';
      if (!map.has(stage)) map.set(stage, []);
      map.get(stage)!.push(p);
    }
    return map;
  }, [topicStageMap]);

  // ── Search handlers ─────────────────────────────────────────────

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    setLookupResult(null);
    setLookupError(false);
    if (text.trim().length >= 2) {
      setSuggestions(searchLemmas(text));
    } else {
      setSuggestions([]);
    }
  };

  const handleSearchClear = () => {
    setSearchText('');
    setSuggestions([]);
    setLookupResult(null);
    setLookupError(false);
  };

  const handleSelectSuggestion = (lemma: string) => {
    Keyboard.dismiss();
    setSearchText(lemma);
    setSuggestions([]);
    const result = lookupWord(lemma);
    if (result) {
      setLookupResult(result);
      setLookupError(false);
    } else {
      setLookupResult(null);
      setLookupError(true);
    }
  };

  const handleSearchSubmit = () => {
    const q = searchText.trim();
    if (!q || q.length < 2) return;
    Keyboard.dismiss();
    setSuggestions([]);
    const result = lookupWord(q);
    if (result) {
      setLookupResult(result);
      setLookupError(false);
    } else {
      setLookupResult(null);
      setLookupError(true);
    }
  };

  const toggleParadigm = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setExpandedParadigms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <TabScreen title={course.tabLabels.grammar} titleExtra={<CourseSwitcher />} scroll={false} noBottomPadding>
      {/* ── Fixed header: segmented control ──────────────────── */}
      <SegmentedControl
        options={['Lernpfad', 'Nachschlagen']}
        active={tab}
        onChange={setTab}
        theme={theme}
      />

      <View style={{ height: Spacing.four }} />

      {/* ── Swipeable pages (full-width, extends past padding) ── */}
      <View style={styles.swipeArea}>
        <SwipeableTabs activeTab={tab} onTabChange={setTab}>
          {/* Page 0 — Lernpfad / Via Sacra */}
          <View style={styles.page}>
            <ViaSacraPath topics={topics} paradigmsByStage={paradigmsByStage} />
          </View>

          {/* Page 1 — Nachschlagen */}
          <View style={styles.page}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.nachschlagenScroll}>
              {/* ── Word lookup ──────────────────────────────────────── */}
              <SearchBar
                value={searchText}
                onChangeText={handleSearchChange}
                onSubmit={handleSearchSubmit}
                onClear={handleSearchClear}
                placeholder={searchPlaceholder}
              />

              {/* Autocomplete suggestions */}
              {suggestions.length > 0 && !lookupResult && (
                <View style={[styles.suggPanel, { borderColor: theme.border }]}>
                  {suggestions.map((s) => (
                    <SuggestionRow
                      key={s.id}
                      lemma={s.lemma}
                      glossDe={s.glossDe}
                      onPress={() => handleSelectSuggestion(s.lemma)}
                      theme={theme}
                    />
                  ))}
                </View>
              )}

              {/* Lookup result: rendered paradigm */}
              {lookupResult && (
                <View style={{ marginTop: Spacing.three, marginBottom: Spacing.two }}>
                  <ParadigmTable paradigm={lookupResult.paradigm} />
                </View>
              )}

              {/* Lookup not found */}
              {lookupError && (
                <View style={[styles.notFound, { borderColor: theme.border }]}>
                  <Text style={[styles.notFoundText, { color: theme.textSecondary }]}>
                    „{searchText}” ist nicht in der Datenbank. Versuche ein anderes Wort oder nutze die
                    Tabellen unten.
                  </Text>
                </View>
              )}

              {/* ── Reference paradigms ──────────────────────────────── */}
              <View style={{ height: Spacing.five }} />

              {refSections.map((sec) => {
                const items = PARADIGMS.filter((p) => (p.kind as string) === sec.kind);
                return (
                  <View key={sec.kind}>
                    <SectionHeading title={sec.title} theme={theme} />
                    <View style={styles.cardGrid}>
                      {items.map((p) => (
                        <RefCard
                          key={p.id}
                          paradigm={p}
                          icon={(sec.kind === 'noun' || sec.kind === 'kana' || sec.kind === 'adj' || sec.kind === 'particle') ? 'layers-outline' : 'flash-outline'}
                          expanded={expandedParadigms.has(p.id)}
                          onToggle={() => toggleParadigm(p.id)}
                          theme={theme}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}

              <View style={{ height: Spacing.four }} />
            </ScrollView>
          </View>
        </SwipeableTabs>
      </View>
    </TabScreen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Swipeable tab layout — extends past TabScreen padding to be full-width
  swipeArea: {
    flex: 1,
    marginHorizontal: -Spacing.three,
  },
  page: {
    flex: 1,
    paddingHorizontal: Spacing.three,
  },

  // Nachschlagen: scrollable content inside the swipe page
  nachschlagenScroll: {
    paddingBottom: Spacing.six,
  },

  // Nachschlagen: search suggestions
  suggPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    marginTop: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },

  // Not found message
  notFound: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notFoundText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Reference paradigm cards
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  cardGridItem: {
    width: '100%',
  },
  refCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
  },
  refMedallion: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  refBody: {
    flex: 1,
    gap: 1,
  },
  refCardTitle: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    fontWeight: '700',
  },
  refCardSub: {
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: Fonts.serifBody,
  },
  refCardBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    flexShrink: 0,
  },
  refCardBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
