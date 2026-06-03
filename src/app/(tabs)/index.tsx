import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { toRoman } from '@/constants/strings';
import { Fonts, Radius, Spacing, palette } from '@/constants/theme';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';
import { levelForXp, rankForLevel } from '@/lib/gamification';
import { getGroupProgress, getVocabStats, type GroupProgress, type VocabStats } from '@/lib/vocab';
import { importVocab, parseDeck } from '@/lib/vocab/import';
import { useApp } from '@/store/app';

export default function VocabScreen() {
  const theme = useTheme();
  const t = useStrings();
  const scheme = useColorScheme() ?? 'light';
  const dailyGoalNew = useApp((s) => s.dailyGoalNew);
  const xp = useApp((s) => s.xp);
  const coins = useApp((s) => s.coins);
  const streak = useApp((s) => s.streakCount);
  const [stats, setStats] = useState<VocabStats | null>(null);
  const [groups, setGroups] = useState<GroupProgress[]>([]);
  const [importing, setImporting] = useState(false);

  const refresh = useCallback(() => {
    setStats(getVocabStats(dailyGoalNew));
    setGroups(getGroupProgress());
  }, [dailyGoalNew]);

  useFocusEffect(useCallback(() => refresh(), [refresh]));

  const importDeck = async () => {
    try {
      setImporting(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/csv', 'text/tab-separated-values', 'text/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const content = await readAsStringAsync(res.assets[0].uri);
      const rows = parseDeck(content);
      if (rows.length === 0) {
        Alert.alert('Keine Vokabeln gefunden', 'Erwartet wird pro Zeile: Latein <Tab/Komma> Deutsch.');
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

  const due = stats?.dueCount ?? 0;
  const newRemaining = stats?.newRemainingToday ?? 0;
  const goalDone = Math.max(0, dailyGoalNew - newRemaining);
  const canStudy = due > 0 || newRemaining > 0;
  const totalToday = due + newRemaining;
  const goalPct = dailyGoalNew > 0 ? Math.min(1, goalDone / dailyGoalNew) : 1;

  const frontier = groups.findIndex((g) => g.introduced < g.total);
  const cut = frontier === -1 ? groups.length : Math.min(groups.length, frontier + 4);
  const visibleGroups = groups.slice(0, cut);
  const hiddenGroups = groups.length - visibleGroups.length;

  const lvl = levelForXp(xp);
  const rank = rankForLevel(lvl.level);

  // Hero colors: light = Tyrian purple bg with white; dark = deep stone with Tyrian CTA
  const isLight = scheme === 'light';
  const heroBg = isLight ? palette.tyrian : palette.stone;
  const heroText = '#FFFFFF';
  const heroTextSoft = isLight ? 'rgba(255,255,255,0.65)' : palette.stoneTextSoft;
  const heroRuleColor = palette.gold;
  const heroCtaBg = isLight ? '#FFFFFF' : theme.primary;
  const heroCtaFg = isLight ? theme.primary : '#FFFFFF';

  return (
    <Screen scroll padded={false}>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <PageHeader title={t.vocabTitle} />

      {/* ── HERO PANEL ─────────────────────────────────────────────────── */}
      <View style={[styles.hero, { backgroundColor: heroBg }]}>

        {/* Gold rule */}
        <View style={[styles.heroRule, { backgroundColor: heroRuleColor }]} />

        {/* Today's count */}
        <Text style={[styles.heroCount, { color: heroText }]}>{totalToday}</Text>
        <Text style={[styles.heroCaption, { color: heroTextSoft }]}>
          {t.cardsToday(totalToday)}
        </Text>

        {/* CTA */}
        <Pressable
          onPress={() => router.push('/vocab-session')}
          disabled={!canStudy}
          style={({ pressed }) => [
            styles.heroCta,
            { backgroundColor: heroCtaBg, opacity: canStudy ? (pressed ? 0.88 : 1) : 0.35 },
          ]}>
          <Text style={[styles.heroCtaText, { color: heroCtaFg }]}>
            {canStudy ? t.startStudying : t.allDone}
          </Text>
        </Pressable>

      </View>

      {/* ── BELOW HERO ─────────────────────────────────────────────────── */}
      <View style={styles.padded}>

        {/* Rank + tokens */}
        <View style={styles.rankRow}>
          <View style={styles.rankLeft}>
            <View style={[styles.rankShield, { backgroundColor: theme.purple }]}>
              <Ionicons name={rank.icon as never} size={12} color="#fff" />
            </View>
            <Text style={[styles.rankName, { color: theme.purple }]}>
              {rank.latin.toUpperCase()}
            </Text>
            <Text style={[styles.rankDot, { color: theme.textSecondary }]}> · </Text>
            <Text style={[styles.rankLvl, { color: theme.textSecondary }]}>Lvl {lvl.level}</Text>
          </View>
          <View style={styles.tokens}>
            <Ionicons name="flame" size={13} color={theme.primary} />
            <Text style={[styles.tokenVal, { color: theme.text }]}>{streak}</Text>
            <View style={styles.tokenSep} />
            <Ionicons name="medal-outline" size={13} color={theme.accent} />
            <Text style={[styles.tokenVal, { color: theme.text }]}>{coins}</Text>
          </View>
        </View>

        {/* XP band */}
        <View style={[styles.band, { backgroundColor: theme.muted }]}>
          <View style={[styles.bandFill, { width: `${lvl.progress * 100}%`, backgroundColor: theme.accent }]} />
        </View>
        <Text style={[styles.xpLabel, { color: theme.textSecondary }]}>
          {lvl.xpIntoLevel} / {lvl.xpForNext} XP
        </Text>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Goal row */}
        <View style={styles.goalRow}>
          <Text style={[styles.goalLabel, { color: theme.textSecondary }]}>{t.dailyGoal}</Text>
          <View style={[styles.band, { flex: 1, backgroundColor: theme.muted }]}>
            <View style={[styles.bandFill, { width: `${goalPct * 100}%`, backgroundColor: theme.purple }]} />
          </View>
          <Text style={[styles.goalCount, { color: theme.textSecondary }]}>
            {goalDone}/{dailyGoalNew}
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Ordines section */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t.frequencyGroups.toUpperCase()}
          </Text>
          <View style={[styles.sectionLine, { backgroundColor: theme.border }]} />
        </View>

        <View style={styles.groupList}>
          {visibleGroups.map((g) => (
            <GroupRow key={g.group} g={g} theme={theme} t={t} />
          ))}
          {hiddenGroups > 0 && (
            <Text style={[styles.hiddenLabel, { color: theme.textSecondary }]}>
              {t.hiddenGroups(hiddenGroups, stats?.totalLemmas ?? 0)}
            </Text>
          )}
        </View>

        {/* Import */}
        <Button
          title={importing ? t.importing : t.importVocab}
          variant="ghost"
          loading={importing}
          onPress={importDeck}
        />

      </View>
    </Screen>
  );
}

// ── GroupRow ───────────────────────────────────────────────────────────────

function GroupRow({
  g,
  theme,
  t,
}: {
  g: GroupProgress;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useStrings>;
}) {
  const complete = g.total > 0 && g.known === g.total;
  const active = g.introduced > 0;
  const numeral = g.group === 0 ? '★' : toRoman(g.group);
  const pct = g.total > 0 ? g.known / g.total : 0;

  return (
    <View style={styles.groupRow}>
      <Text style={[styles.groupNumeral, {
        color: complete ? theme.accent : active ? theme.primary : theme.textSecondary,
      }]}>
        {numeral}
      </Text>
      <View style={styles.groupBody}>
        <View style={styles.groupMeta}>
          <Text
            style={[styles.groupName, {
              color: active ? theme.text : theme.textSecondary,
            }]}
            numberOfLines={1}>
            {g.group === 0 ? t.customVocab : t.portion(g.group)}
          </Text>
          <Text style={[styles.groupCount, { color: theme.textSecondary }]}>
            {g.known}/{g.total}
          </Text>
        </View>
        <View style={[styles.band, { backgroundColor: theme.muted }]}>
          <View style={[styles.bandFill, {
            width: `${pct * 100}%`,
            backgroundColor: complete ? theme.accent : theme.primary,
          }]} />
        </View>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  padded: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },

  // ── Hero ──────────────────────────────────────────────────────────────
  hero: {
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    alignItems: 'center',
  },
  heroRule: {
    width: 32,
    height: 1.5,
    marginBottom: Spacing.three,
  },
  heroCount: {
    fontFamily: Fonts.serifBody,
    fontSize: 80,
    lineHeight: 86,
  },
  heroCaption: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  heroCta: {
    alignSelf: 'stretch',
    paddingVertical: 16,
    borderRadius: Radius.pill,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  heroCtaText: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    letterSpacing: 0.5,
  },

  // ── Rank strip ────────────────────────────────────────────────────────
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  rankLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rankShield: {
    width: 20,
    height: 20,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankName: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  rankDot: { fontSize: 11 },
  rankLvl: { fontSize: 11, fontWeight: '600' },
  tokens: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tokenVal: { fontSize: 13, fontWeight: '800' },
  tokenSep: { width: Spacing.two },

  // ── Shared band (XP, goal, group fill) ───────────────────────────────
  band: { height: 2, borderRadius: 1, overflow: 'hidden', marginBottom: 3 },
  bandFill: { height: 2, borderRadius: 1 },

  // ── Labels ────────────────────────────────────────────────────────────
  xpLabel: { fontSize: 10, fontWeight: '600', textAlign: 'right', marginBottom: Spacing.two },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.three },

  // ── Goal row ──────────────────────────────────────────────────────────
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  goalLabel: { fontSize: 11, fontWeight: '700', minWidth: 68 },
  goalCount: { fontSize: 11, fontWeight: '700', minWidth: 32, textAlign: 'right' },

  // ── Section header ─────────────────────────────────────────────────────
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  sectionLine: { flex: 1, height: StyleSheet.hairlineWidth },

  // ── Group rows ────────────────────────────────────────────────────────
  groupList: { gap: Spacing.three, marginBottom: Spacing.four },
  groupRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  groupNumeral: {
    fontFamily: Fonts.serifBody,
    fontSize: 14,
    width: 32,
    textAlign: 'center',
    marginTop: 1,
  },
  groupBody: { flex: 1, gap: 5 },
  groupMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  groupName: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: Spacing.two },
  groupCount: { fontSize: 11, fontWeight: '600' },

  hiddenLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', paddingVertical: Spacing.one },
});
