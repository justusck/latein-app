import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { levelForXp, rankForLevel } from '@/lib/gamification';
import { useApp } from '@/store/app';

import { ProgressBar } from './ui/progress';

/** Compact gamification bar shown at the top of every tab. */
export function StatsHeader() {
  const theme = useTheme();
  const xp = useApp((s) => s.xp);
  const coins = useApp((s) => s.coins);
  const streak = useApp((s) => s.streakCount);

  const lvl = levelForXp(xp);
  const rank = rankForLevel(lvl.level);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.rankBox}>
          <View style={[styles.rankIcon, { backgroundColor: theme.purple }]}>
            <Ionicons name={rank.icon as never} size={18} color="#fff" />
          </View>
          <View>
            <Text style={[styles.level, { color: theme.text }]}>Lvl {lvl.level}</Text>
            <Text style={[styles.rankName, { color: theme.textSecondary }]}>{rank.latin}</Text>
          </View>
        </View>

        <View style={styles.pills}>
          <Pill icon="flame" value={streak} color={theme.primary} bg={theme.muted} text={theme.text} />
          <Pill icon="ellipse" value={coins} color={theme.accent} bg={theme.muted} text={theme.text} />
        </View>
      </View>

      <View style={styles.xpRow}>
        <ProgressBar progress={lvl.progress} color={theme.accent} />
        <Text style={[styles.xpText, { color: theme.textSecondary }]}>
          {lvl.xpIntoLevel}/{lvl.xpForNext} XP
        </Text>
      </View>
    </View>
  );
}

function Pill({
  icon,
  value,
  color,
  bg,
  text,
}: {
  icon: string;
  value: number;
  color: string;
  bg: string;
  text: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Ionicons name={icon as never} size={15} color={color} />
      <Text style={[styles.pillText, { color: text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two, marginBottom: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rankBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rankIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  level: { fontSize: 16, fontWeight: '800' },
  rankName: { fontSize: 12, fontWeight: '600' },
  pills: { flexDirection: 'row', gap: Spacing.two },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  pillText: { fontSize: 14, fontWeight: '800' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  xpText: { fontSize: 11, fontWeight: '600', minWidth: 70, textAlign: 'right' },
});
