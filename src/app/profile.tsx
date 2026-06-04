import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { GoldShimmer } from '@/components/effects/gold-shimmer';
import { AnimatedProgressBar } from '@/components/ui/animated-progress';
import { FadeInView } from '@/components/ui/fade-in';
import { Screen } from '@/components/ui/screen';
import { SayingCard } from '@/components/saying-card';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { levelForXp, rankForLevel } from '@/lib/gamification';
import { getTopicsWithProgress } from '@/lib/grammar';
import { getGroupProgress, getProfileStats, type DayCount, type ProfileStats } from '@/lib/vocab';
import { useApp } from '@/store/app';

// ── Heatmap ───────────────────────────────────────────────────────────────

const GAP = 3;
const MONTH_W = 24;
const DAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

function intensityColor(count: number, primary: string, muted: string): string {
  if (count === 0) return muted;
  if (count <= 2) return primary + '25';
  if (count <= 5) return primary + '50';
  if (count <= 10) return primary + '80';
  return primary;
}

function buildWeeks(dayCounts: DayCount[]): (DayCount | null)[][] {
  const firstDate = new Date();
  firstDate.setDate(firstDate.getDate() - 89);
  const firstDow = (firstDate.getDay() + 6) % 7;

  const padded: (DayCount | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...dayCounts,
  ];

  const weeks: (DayCount | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  return weeks;
}

function monthLabel(week: (DayCount | null)[]): string | null {
  const first = week.find((d) => d !== null);
  if (!first) return null;
  const m = parseInt(first.day.slice(5, 7), 10) - 1;
  return MONTHS[m] ?? null;
}

function HeatmapGrid({
  dayCounts,
  todayKey,
  primary,
  muted,
  textSecondary,
}: {
  dayCounts: DayCount[];
  todayKey: string;
  primary: string;
  muted: string;
  textSecondary: string;
}) {
  const [cellSize, setCellSize] = useState(12);
  const weeks = useMemo(() => buildWeeks(dayCounts), [dayCounts]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width - MONTH_W - 6 * GAP;
    setCellSize(Math.max(10, Math.floor(w / 7)));
  }, []);

  return (
    <View style={styles.heatmapWrap} onLayout={onLayout}>
      {/* Column headers */}
      <View style={styles.heatmapRow}>
        <View style={{ width: MONTH_W }} />
        {DAY_HEADERS.map((dh) => (
          <View key={dh} style={{ width: cellSize, alignItems: 'center' }}>
            <Text style={[styles.dayHeaderText, { color: textSecondary }]}>
              {dh}
            </Text>
          </View>
        ))}
      </View>

      {/* Week rows */}
      {weeks.map((week, wi) => {
        const ml = monthLabel(week);
        return (
          <View key={wi} style={styles.heatmapRow}>
            <View style={{ width: MONTH_W, justifyContent: 'center' }}>
              {ml ? (
                <Text style={[styles.monthLabelText, { color: textSecondary }]}>
                  {ml}
                </Text>
              ) : null}
            </View>
            {week.map((dc, di) => {
              if (!dc) {
                return (
                  <View
                    key={di}
                    style={{ width: cellSize, height: cellSize }}
                  />
                );
              }
              const isToday = dc.day === todayKey;
              const bg = intensityColor(dc.count, primary, muted);
              return (
                <View
                  key={di}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 3,
                    backgroundColor: bg,
                    borderWidth: isToday ? 1.5 : 0,
                    borderColor: primary,
                  }}
                />
              );
            })}
          </View>
        );
      })}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={[styles.legendLabel, { color: textSecondary }]}>
          Weniger
        </Text>
        {[0, 1, 3, 6, 11].map((n) => (
          <View
            key={n}
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: intensityColor(n, primary, muted),
            }}
          />
        ))}
        <Text style={[styles.legendLabel, { color: textSecondary }]}>
          Mehr
        </Text>
      </View>
    </View>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { xp, coins, streakCount } = useApp();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [grammarCompleted, setGrammarCompleted] = useState(0);
  const [grammarTotal, setGrammarTotal] = useState(0);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
          <Ionicons name="settings-outline" size={22} color={theme.textSecondary} />
        </Pressable>
      ),
    });
  }, [navigation, theme.textSecondary]);

  const refresh = useCallback(() => {
    setStats(getProfileStats());
    const topics = getTopicsWithProgress();
    setGrammarCompleted(topics.filter((t) => t.completed).length);
    setGrammarTotal(topics.length);
  }, []);

  useFocusEffect(useCallback(() => refresh(), [refresh]));

  const lvl = levelForXp(xp);
  const rank = rankForLevel(lvl.level);
  const groups = useMemo(() => getGroupProgress(), []);
  const totalIntroduced = groups.reduce((s, g) => s + g.introduced, 0);
  const totalKnown = groups.reduce((s, g) => s + g.known, 0);
  const totalLemmas = groups.reduce((s, g) => s + g.total, 0);

  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [shimmerTrigger, setShimmerTrigger] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShimmerTrigger(1), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <Screen scroll padded={false}>
      <View style={styles.scroll}>
        {/* ── Rank card ──────────────────────────────────────────────── */}
        <FadeInView duration={300}>
          <GoldShimmer trigger={shimmerTrigger}>
            <View style={[styles.rankCard, { backgroundColor: theme.primary }]}>
            <View style={styles.rankIconWrap}>
              <Ionicons
                name={rank.icon as never}
                size={32}
                color="rgba(255,255,255,0.9)"
              />
            </View>
            <Text style={styles.rankTitle}>{rank.latin}</Text>
            <Text style={styles.rankSub}>Level {lvl.level}</Text>
            <View style={styles.xpBarWrap}>
              <AnimatedProgressBar
                progress={lvl.progress}
                height={4}
                color="#fff"
                trackColor="rgba(255,255,255,0.2)"
              />
              <Text style={styles.xpLabel}>
                {lvl.xpIntoLevel} / {lvl.xpForNext} XP
              </Text>
            </View>
          </View>
          </GoldShimmer>
        </FadeInView>

        {/* ── Saying of the day ─────────────────────────────────────── */}
        <FadeInView delay={100} duration={300}>
          <SayingCard />
        </FadeInView>

        {/* ── Token row ──────────────────────────────────────────────── */}
        <View style={styles.tokenRow}>
          <View
            style={[
              styles.token,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            <Ionicons name="flame" size={20} color={theme.primary} />
            <Text style={[styles.tokenVal, { color: theme.text }]}>
              {streakCount}
            </Text>
            <Text style={[styles.tokenLabel, { color: theme.textSecondary }]}>
              Streak
            </Text>
          </View>
          <View
            style={[
              styles.token,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            <Ionicons name="medal-outline" size={20} color={theme.accent} />
            <Text style={[styles.tokenVal, { color: theme.text }]}>
              {coins}
            </Text>
            <Text style={[styles.tokenLabel, { color: theme.textSecondary }]}>
              Münzen
            </Text>
          </View>
          <View
            style={[
              styles.token,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={theme.purple}
            />
            <Text style={[styles.tokenVal, { color: theme.text }]}>
              {stats?.studyDays ?? 0}
            </Text>
            <Text style={[styles.tokenLabel, { color: theme.textSecondary }]}>
              Tage aktiv
            </Text>
          </View>
        </View>

        {/* ── Vocab section ──────────────────────────────────────────── */}
        <Section title="Vokabeln" theme={theme}>
          <StatRow
            label="Gefestigt"
            value={`${totalKnown} / ${totalLemmas}`}
            pct={totalLemmas > 0 ? totalKnown / totalLemmas : 0}
            color={theme.accent}
            theme={theme}
          />
          <StatRow
            label="Im Lernprozess"
            value={String(totalIntroduced - totalKnown)}
            theme={theme}
            noBar
          />
          <StatRow
            label="Reviews heute"
            value={String(stats?.todayReviews ?? 0)}
            theme={theme}
            noBar
          />
          <StatRow
            label="Reviews gesamt"
            value={String(stats?.totalReviews ?? 0)}
            theme={theme}
            noBar
          />
          {stats ? (
            <StatRow
              label="Trefferquote"
              value={`${Math.round(stats.accuracy * 100)}%`}
              pct={stats.accuracy}
              color={theme.success}
              theme={theme}
            />
          ) : null}
        </Section>

        {/* ── Grammar section ────────────────────────────────────────── */}
        <Section title="Grammatik" theme={theme}>
          <StatRow
            label="Abgeschlossen"
            value={`${grammarCompleted} / ${grammarTotal}`}
            pct={grammarTotal > 0 ? grammarCompleted / grammarTotal : 0}
            color={theme.purple}
            theme={theme}
          />
        </Section>

        {/* ── Activity heatmap ───────────────────────────────────────── */}
        {stats ? (
          <Section title="Aktivität" theme={theme}>
            <HeatmapGrid
              dayCounts={stats.dayCounts}
              todayKey={todayKey}
              primary={theme.primary}
              muted={theme.muted}
              textSecondary={theme.textSecondary}
            />
          </Section>
        ) : null}
      </View>
    </Screen>
  );
}

// ── Section ───────────────────────────────────────────────────────────────

function Section({
  title,
  theme,
  children,
}: {
  title: string;
  theme: ReturnType<typeof useTheme>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {title}
      </Text>
      <View
        style={[
          styles.sectionBody,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}>
        {children}
      </View>
    </View>
  );
}

// ── StatRow ───────────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  pct,
  color,
  theme,
  noBar,
}: {
  label: string;
  value: string;
  pct?: number;
  color?: string;
  theme: ReturnType<typeof useTheme>;
  noBar?: boolean;
}) {
  return (
    <View style={[styles.statRow, { borderColor: theme.border }]}>
      <View style={styles.statInfo}>
        <Text style={[styles.statLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      </View>
      {!noBar && pct !== undefined && color ? (
        <AnimatedProgressBar progress={pct} height={4} color={color} />
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
  },

  // ── Rank card ──────────────────────────────────────────────────────
  rankCard: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  rankIconWrap: { marginBottom: Spacing.one },
  rankTitle: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: '#fff',
    letterSpacing: 0.5,
  },
  rankSub: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    marginBottom: Spacing.three,
  },
  xpBarWrap: { width: '100%', alignItems: 'center' },
  xpLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },

  // ── Token row ──────────────────────────────────────────────────────
  tokenRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.five,
  },
  token: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
  },
  tokenVal: {
    fontFamily: Fonts.serifBody,
    fontSize: 22,
    fontWeight: '800',
  },
  tokenLabel: { fontSize: 10, fontWeight: '700' },

  // ── Sections ───────────────────────────────────────────────────────
  section: { marginBottom: Spacing.four },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: Spacing.two,
  },
  sectionBody: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  // ── Stat rows ──────────────────────────────────────────────────────
  statRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  statInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  statLabel: { fontSize: 14, fontWeight: '600' },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // ── Heatmap ────────────────────────────────────────────────────────
  heatmapWrap: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: GAP,
  },
  heatmapRow: {
    flexDirection: 'row',
    gap: GAP,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  monthLabelText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Legend ─────────────────────────────────────────────────────────
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: Spacing.one,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
