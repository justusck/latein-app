import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '@/components/ui/page-header';
import { ProgressBar } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { toRoman } from '@/constants/strings';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';
import { getGroupProgress, getVocabStats, type GroupProgress, type VocabStats } from '@/lib/vocab';
import { importVocab, parseDeck } from '@/lib/vocab/import';
import { useApp } from '@/store/app';

export default function VocabScreen() {
  const theme = useTheme();
  const t = useStrings();
  const dailyGoalNew = useApp((s) => s.dailyGoalNew);
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

  const due = stats?.dueCount ?? 0;
  const newRemaining = stats?.newRemainingToday ?? 0;
  const canStudy = due > 0 || newRemaining > 0;
  const totalToday = due + newRemaining;

  return (
    <Screen scroll padded={false}>
      <PageHeader
        title={t.vocabTitle}
        right={
          <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
            <Pressable onPress={() => router.push('/profile')} hitSlop={12}>
              <Ionicons name="person-circle-outline" size={22} color={theme.textSecondary} />
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
              <Ionicons name="settings-outline" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
        }
      />

      <View style={styles.content}>
        {/* Today summary + actions */}
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

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Groups */}
        <View style={styles.groupList}>
          {groups.map((g) => (
            <GroupRow key={g.group} g={g} theme={theme} t={t} />
          ))}
        </View>

        {/* Import — subtle, out of the way */}
        <Pressable
          onPress={importDeck}
          disabled={importing}
          style={({ pressed }) => [styles.importLink, pressed && { opacity: 0.5 }]}>
          <Ionicons name="add-circle-outline" size={15} color={theme.textSecondary} />
          <Text style={[styles.importLinkText, { color: theme.textSecondary }]}>
            {importing ? t.importing : t.importVocab}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

// ── GroupRow ───────────────────────────────────────────────────────────────

function StatusChip({ label, count, color }: { label: string; count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <View style={[styles.chip, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
      <Text style={[styles.chipCount, { color }]}>{count}</Text>
    </View>
  );
}

function GroupRow({
  g,
  theme,
  t,
}: {
  g: GroupProgress;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useStrings>;
}) {
  const allIntroduced = g.total > 0 && g.introduced === g.total;
  const active = g.introduced > 0;
  const numeral = g.group === 0 ? '★' : toRoman(g.group);
  const pct = g.total > 0 ? g.introduced / g.total : 0;

  const badgeBg = allIntroduced ? theme.accent : active ? theme.primary : theme.muted;
  const badgeFg = allIntroduced || active ? '#FFFFFF' : theme.textSecondary;
  const newCount = g.total - g.introduced;
  const learningCount = g.introduced - g.known;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.groupCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={() => router.push(`/vocab-group/${g.group}`)}>
      <View style={[styles.groupBadge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.groupBadgeText, { color: badgeFg }]}>{numeral}</Text>
      </View>

      <View style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <Text
            style={[styles.groupTitle, { color: active ? theme.text : theme.textSecondary }]}
            numberOfLines={1}>
            {g.group === 0 ? t.customVocab : t.portion(g.group)}
          </Text>
          <Text style={[styles.groupCount, { color: theme.textSecondary }]}>
            {g.introduced}/{g.total}
          </Text>
        </View>

        <ProgressBar progress={pct} height={6} color={badgeBg} />

        <View style={styles.chipRow}>
          <StatusChip label={t.statusNew} count={newCount} color={theme.textSecondary} />
          <StatusChip label={t.statusIntroduced} count={learningCount} color={theme.primary} />
          <StatusChip label={t.statusKnown} count={g.known} color={theme.accent} />
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={theme.border} style={{ marginLeft: Spacing.one }} />
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.half,
    paddingBottom: Spacing.six,
  },

  // ── Today ──────────────────────────────────────────────────────────────
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

  // ── Group cards ────────────────────────────────────────────────────────
  groupList: { gap: Spacing.two, marginBottom: Spacing.four },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  groupBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  groupBadgeText: {
    fontFamily: Fonts.serifBody,
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  groupContent: { flex: 1, gap: 6 },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  groupTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  groupCount: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // ── Status chips ───────────────────────────────────────────────────────
  chipRow: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 10, fontWeight: '700' },
  chipCount: { fontSize: 10, fontWeight: '800' },

  // ── Import ─────────────────────────────────────────────────────────────
  importLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.one,
  },
  importLinkText: { fontSize: 12, fontWeight: '500' },
});
