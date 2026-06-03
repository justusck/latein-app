import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StatsHeader } from '@/components/stats-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getGroupProgress, getVocabStats, type GroupProgress, type VocabStats } from '@/lib/vocab';
import { importVocab, parseDeck } from '@/lib/vocab/import';
import { useApp } from '@/store/app';

export default function VocabScreen() {
  const theme = useTheme();
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
      Alert.alert('Import abgeschlossen', `${added} neue Vokabeln hinzugefügt${skipped ? `, ${skipped} übersprungen (Duplikate)` : ''}.`);
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

  // With thousands of words there are many portions; only show the active
  // frontier plus a short preview, and summarise the rest.
  const frontier = groups.findIndex((g) => g.introduced < g.total);
  const cut = frontier === -1 ? groups.length : Math.min(groups.length, frontier + 3);
  const visibleGroups = groups.slice(0, cut);
  const hiddenGroups = groups.length - visibleGroups.length;

  return (
    <Screen scroll>
      <View style={styles.titleRow}>
        <ThemedText type="title">Vokabeln</ThemedText>
        <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
          <Ionicons name="settings-outline" size={24} color={theme.textSecondary} />
        </Pressable>
      </View>

      <StatsHeader />

      <Card accent style={{ gap: Spacing.three }}>
        <View style={styles.dueRow}>
          <Metric label="Fällig" value={due} color={theme.primary} />
          <Metric label="Neu heute" value={newRemaining} color={theme.purple} />
          <Metric label="Gefestigt" value={stats?.knownCount ?? 0} color={theme.success} />
        </View>

        <View>
          <View style={styles.goalLabelRow}>
            <Text style={[styles.goalLabel, { color: theme.textSecondary }]}>Tagesziel (neue Wörter)</Text>
            <Text style={[styles.goalLabel, { color: theme.textSecondary }]}>
              {goalDone}/{dailyGoalNew}
            </Text>
          </View>
          <ProgressBar progress={dailyGoalNew ? goalDone / dailyGoalNew : 1} color={theme.purple} />
        </View>

        <Button
          title={canStudy ? 'Lernen starten' : 'Heute alles erledigt 🎉'}
          onPress={() => router.push('/vocab-session')}
          disabled={!canStudy}
        />
      </Card>

      <View style={{ marginTop: Spacing.two }}>
        <Button
          title={importing ? 'Importiere…' : 'Vokabeln importieren (Anki/CSV)'}
          variant="ghost"
          loading={importing}
          onPress={importDeck}
        />
      </View>

      <ThemedText type="subtitle" style={{ marginTop: Spacing.four }}>Frequenzgruppen</ThemedText>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        Wörter werden nach Häufigkeit in Portionen freigeschaltet — die wissenschaftlich beste
        Reihenfolge.
      </Text>

      <View style={{ gap: Spacing.two }}>
        {visibleGroups.map((g) => (
          <Card key={g.group}>
            <View style={styles.groupHeader}>
              <View
                style={[
                  styles.groupBadge,
                  { backgroundColor: g.known === g.total ? theme.success : theme.muted },
                ]}>
                <Text
                  style={[
                    styles.groupBadgeText,
                    { color: g.known === g.total ? '#fff' : theme.text },
                  ]}>
                  {g.group === 0 ? '★' : g.group}
                </Text>
              </View>
              <Text style={[styles.groupTitle, { color: theme.text }]}>
                {g.group === 0 ? 'Eigene Vokabeln' : `Portion ${g.group}`}
              </Text>
              <Text style={[styles.groupCount, { color: theme.textSecondary }]}>
                {g.known}/{g.total} gefestigt
              </Text>
            </View>
            <View style={{ marginTop: Spacing.two }}>
              <ProgressBar progress={g.total ? g.known / g.total : 0} color={theme.success} height={8} />
            </View>
          </Card>
        ))}
        {hiddenGroups > 0 && (
          <Card>
            <Text style={[styles.groupCount, { color: theme.textSecondary, textAlign: 'center' }]}>
              + {hiddenGroups} weitere Portionen ({stats?.totalLemmas ?? 0} Wörter insgesamt) — schalte
              sie durchs Lernen frei.
            </Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two },
  sub: { fontSize: 13, marginTop: 2, marginBottom: Spacing.two },
  dueRow: { flexDirection: 'row', justifyContent: 'space-around' },
  metric: { alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 28, fontWeight: '900' },
  metricLabel: { fontSize: 12, fontWeight: '600' },
  goalLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalLabel: { fontSize: 12, fontWeight: '600' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  groupBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupBadgeText: { fontWeight: '800', fontSize: 14 },
  groupTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  groupCount: { fontSize: 12, fontWeight: '600' },
});
