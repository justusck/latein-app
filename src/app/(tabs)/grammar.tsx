import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SearchBar } from '@/components/ui/search-bar';
import { ParadigmTable } from '@/components/paradigm-table';
import { TabScreen } from '@/components/ui/tab-screen';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { PARADIGMS } from '@/data/paradigms';
import { useTheme } from '@/hooks/use-theme';
import { getTopicsWithProgress, type TopicWithProgress } from '@/lib/grammar';
import { lookupWord, searchLemmas, type LookupResult } from '@/lib/latin/inflect';

// ── Stage metadata ────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  foundations: 'Grundlagen',
  morphology: 'Formenlehre',
  syntax: 'Syntax',
  advanced: 'Fortgeschritten',
};
const STAGE_ORDER = ['foundations', 'morphology', 'syntax', 'advanced'];

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
            onPress={() => onChange(i)}
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
  return (
    <Pressable
      onPress={onPress}
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
    setExpandedParadigms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const headerRight = (
    <Pressable onPress={() => router.push('/profile')} hitSlop={12}>
      <MaterialCommunityIcons name="shield-account-outline" size={24} color={theme.textSecondary} />
    </Pressable>
  );

  return (
    <TabScreen title="Grammatik" headerRight={headerRight}>
      <SegmentedControl
        options={['Lernpfad', 'Nachschlagen']}
        active={tab}
        onChange={setTab}
        theme={theme}
      />

      <View style={{ height: Spacing.four }} />

      {tab === 0 ? (
        /* ──────────── LERNPFAD ──────────── */
        STAGE_ORDER.map((stage) => {
          const stageTopics = topics.filter((t) => t.topic.stage === stage);
          const stageParadigms = paradigmsByStage.get(stage) ?? [];
          if (stageTopics.length === 0 && stageParadigms.length === 0) return null;

          const firstUnlocked = stageTopics.find((t) => t.unlocked && !t.completed);

          return (
            <View key={stage} style={styles.stage}>
              <View style={styles.stageHeader}>
                <Text style={[styles.stageLabel, { color: theme.primary }]}>
                  {STAGE_LABELS[stage] ?? stage}
                </Text>
                <View style={[styles.stageMeta, { backgroundColor: theme.muted }]}>
                  <Text style={[styles.stageMetaText, { color: theme.textSecondary }]}>
                    {stageTopics.filter((t) => t.completed).length}/{stageTopics.length}
                  </Text>
                </View>
              </View>

              {stageTopics.map((t) => (
                <Row
                  key={t.topic.id}
                  title={t.topic.title}
                  subtitle={t.topic.summary ?? undefined}
                  unlocked={t.unlocked}
                  completed={t.completed}
                  highlight={t === firstUnlocked}
                  leading={
                    <View
                      style={[
                        styles.leading,
                        {
                          backgroundColor: t.unlocked ? theme.primary : theme.muted,
                        },
                      ]}>
                      {t.unlocked ? (
                        <Text style={styles.leadingText}>{t.topic.orderIndex + 1}</Text>
                      ) : (
                        <Ionicons name="lock-closed" size={11} color={theme.textSecondary} />
                      )}
                    </View>
                  }
                  onPress={t.unlocked ? () => router.push(`/grammar/${t.topic.id}`) : undefined}
                  theme={theme}
                />
              ))}

              {stageParadigms.length > 0 && (
                <>
                  <Text style={[styles.trainerEyebrow, { color: theme.textSecondary }]}>
                    Formentrainer
                  </Text>
                  {stageParadigms.map((p) => (
                    <Row
                      key={`trainer-${p.id}`}
                      title={p.title}
                      subtitle={p.subtitle}
                      unlocked
                      leading={
                        <View style={[styles.leading, { backgroundColor: theme.purple }]}>
                          <Ionicons
                            name={p.kind === 'noun' ? 'layers-outline' : 'flash-outline'}
                            size={14}
                            color="#fff"
                          />
                        </View>
                      }
                      onPress={() => router.push(`/trainer/${p.id}`)}
                      theme={theme}
                    />
                  ))}
                </>
              )}
            </View>
          );
        })
      ) : (
        /* ──────────── NACHSCHLAGEN ──────────── */
        <>
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
        </>
      )}
    </TabScreen>
  );
}

// ── Row (shared by Lernpfad) ──────────────────────────────────────────────

function Row({
  title,
  subtitle,
  unlocked,
  completed,
  highlight,
  leading,
  onPress,
  theme,
}: {
  title: string;
  subtitle?: string;
  unlocked?: boolean;
  completed?: boolean;
  highlight?: boolean;
  leading: React.ReactNode;
  onPress?: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        highlight && { backgroundColor: theme.primary + '0A' },
        pressed && onPress && { opacity: 0.6 },
      ]}>
      {leading}

      <View style={styles.rowBody}>
        <Text
          style={[styles.rowTitle, { color: unlocked === false ? theme.textSecondary : theme.text }]}
          numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: theme.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {completed ? (
        <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
      ) : unlocked === false ? null : onPress ? (
        <Ionicons name="chevron-forward" size={14} color={theme.border} />
      ) : null}
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Stage sections
  stage: { marginBottom: Spacing.five },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  stageLabel: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    letterSpacing: 0.3,
  },
  stageMeta: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  stageMetaText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Rows (topics & trainers)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    marginHorizontal: -Spacing.three,
    borderRadius: Radius.md,
  },
  leading: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  leadingText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 1 },

  // Trainer eyebrow
  trainerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
    paddingLeft: Spacing.three,
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
