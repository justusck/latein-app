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
import { TabScreen } from '@/components/ui/tab-screen';
import { Radius, Spacing } from '@/constants/theme';
import { ViaSacraPath } from '@/components/ui/via-sacra-path';
import { PARADIGMS } from '@/data/paradigms';
import { useTheme } from '@/hooks/use-theme';
import { getTopicsWithProgress, type TopicWithProgress } from '@/lib/grammar';
import { lookupWord, searchLemmas, type LookupResult } from '@/lib/latin/inflect';

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

// ── Main screen ───────────────────────────────────────────────────────────

export default function GrammarScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [topics, setTopics] = useState<TopicWithProgress[]>([]);

  // ── Search state ────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: number; lemma: string; glossDe: string }[]>([]);
  const [lookupResult, setLookupResult] = useState<LookupResult>(null);
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
    <TabScreen title="Grammatik" scroll={false} noBottomPadding>
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
                placeholder="Wort eingeben (z.B. puella, amō, rēx) …"
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

              <Text style={[styles.sectionTitle, { color: theme.text }]}>Deklinationen</Text>
              <View style={styles.cardGrid}>
                {PARADIGMS.filter((p) => p.kind === 'noun').map((p) => {
                  const expanded = expandedParadigms.has(p.id);
                  return (
                    <View key={p.id} style={styles.cardGridItem}>
                      <Pressable
                        onPress={() => toggleParadigm(p.id)}
                        style={({ pressed }) => [
                          styles.refCard,
                          {
                            backgroundColor: theme.card,
                            borderColor: expanded ? theme.primary : theme.border,
                          },
                          pressed && { opacity: 0.7 },
                        ]}>
                        <View style={styles.refCardTop}>
                          <Ionicons
                            name="layers-outline"
                            size={16}
                            color={expanded ? theme.primary : theme.textSecondary}
                          />
                          <Text
                            style={[
                              styles.refCardTitle,
                              { color: expanded ? theme.primary : theme.text },
                            ]}
                            numberOfLines={2}>
                            {p.title}
                          </Text>
                        </View>
                        <Text style={[styles.refCardSub, { color: theme.textSecondary }]} numberOfLines={1}>
                          {p.subtitle}
                        </Text>
                        <View style={styles.refCardActions}>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation?.();
                              if (Platform.OS !== 'web') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                              }
                              router.push(`/trainer/${p.id}`);
                            }}
                            hitSlop={10}
                            style={[styles.refCardBtn, { backgroundColor: theme.primary }]}>
                            <Text style={styles.refCardBtnText}>Üben</Text>
                          </Pressable>
                        </View>
                      </Pressable>

                      {expanded && (
                        <View style={{ marginTop: Spacing.two }}>
                          <ParadigmTable paradigm={p} />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.text }]}>Konjugationen</Text>
              <View style={styles.cardGrid}>
                {PARADIGMS.filter((p) => p.kind === 'verb').map((p) => {
                  const expanded = expandedParadigms.has(p.id);
                  return (
                    <View key={p.id} style={styles.cardGridItem}>
                      <Pressable
                        onPress={() => toggleParadigm(p.id)}
                        style={({ pressed }) => [
                          styles.refCard,
                          {
                            backgroundColor: theme.card,
                            borderColor: expanded ? theme.primary : theme.border,
                          },
                          pressed && { opacity: 0.7 },
                        ]}>
                        <View style={styles.refCardTop}>
                          <Ionicons
                            name="flash-outline"
                            size={16}
                            color={expanded ? theme.primary : theme.textSecondary}
                          />
                          <Text
                            style={[
                              styles.refCardTitle,
                              { color: expanded ? theme.primary : theme.text },
                            ]}
                            numberOfLines={2}>
                            {p.title}
                          </Text>
                        </View>
                        <Text style={[styles.refCardSub, { color: theme.textSecondary }]} numberOfLines={1}>
                          {p.subtitle}
                        </Text>
                        <View style={styles.refCardActions}>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation?.();
                              if (Platform.OS !== 'web') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                              }
                              router.push(`/trainer/${p.id}`);
                            }}
                            hitSlop={10}
                            style={[styles.refCardBtn, { backgroundColor: theme.primary }]}>
                            <Text style={styles.refCardBtnText}>Üben</Text>
                          </Pressable>
                        </View>
                      </Pressable>

                      {expanded && (
                        <View style={{ marginTop: Spacing.two }}>
                          <ParadigmTable paradigm={p} />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

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

  // Section title (Deklinationen, Konjugationen)
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: Spacing.two,
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
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  refCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  refCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  refCardSub: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  refCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.one,
  },
  refCardBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  refCardBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
