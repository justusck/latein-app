import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import type { Paradigm } from '@/data/paradigms';
import { useTheme } from '@/hooks/use-theme';

/**
 * Read-only reference rendering of a paradigm grid, styled like a Roman
 * inscription: serif Latin forms, small-caps headers, gold rule under the
 * title, gently tinted alternating rows.
 */
export function ParadigmTable({ paradigm }: { paradigm: Paradigm }) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]}>{paradigm.title}</Text>
        {paradigm.subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{paradigm.subtitle}</Text>
        ) : null}
      </View>
      <View style={[styles.goldRule, { backgroundColor: theme.accent }]} />

      <View style={styles.row}>
        <View style={styles.labelCell} />
        {paradigm.cols.map((c) => (
          <Text key={c} style={[styles.headCell, { color: theme.textSecondary }]}>
            {c.toUpperCase()}
          </Text>
        ))}
      </View>

      {paradigm.rows.map((r, ri) => (
        <View
          key={r.label}
          style={[
            styles.row,
            styles.dataRow,
            { borderTopColor: theme.border },
            ri % 2 === 1 && { backgroundColor: theme.muted + '55' },
          ]}>
          <Text style={[styles.labelCell, styles.labelText, { color: theme.textSecondary }]}>
            {r.label}
          </Text>
          {r.cells.map((cell, i) => (
            <Text key={i} style={[styles.cell, { color: theme.text }]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    overflow: 'hidden',
  },
  titleRow: { marginBottom: Spacing.one, alignItems: 'center' },
  title: { fontSize: 16, fontFamily: Fonts.serif, fontWeight: '700' },
  subtitle: { fontSize: 12, fontStyle: 'italic', fontFamily: Fonts.serifBody, marginTop: 1 },
  goldRule: {
    height: 1.5,
    width: 56,
    alignSelf: 'center',
    borderRadius: 1,
    opacity: 0.55,
    marginBottom: Spacing.two,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderRadius: 6 },
  dataRow: { borderTopWidth: StyleSheet.hairlineWidth },
  labelCell: { flex: 1.2, paddingLeft: 4 },
  labelText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  cell: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.serifBody,
    textAlign: 'center',
  },
});
