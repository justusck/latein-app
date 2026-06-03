import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import type { Paradigm } from '@/data/paradigms';
import { useTheme } from '@/hooks/use-theme';

/** Read-only reference rendering of a paradigm grid. */
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

      <View style={[styles.row, { borderBottomColor: theme.border }]}>
        <View style={styles.labelCell} />
        {paradigm.cols.map((c) => (
          <Text key={c} style={[styles.headCell, { color: theme.textSecondary }]}>
            {c}
          </Text>
        ))}
      </View>

      {paradigm.rows.map((r) => (
        <View key={r.label} style={[styles.row, { borderBottomColor: theme.border }]}>
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
  wrap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, padding: Spacing.two },
  titleRow: { marginBottom: Spacing.two },
  title: { fontSize: 15, fontWeight: '800' },
  subtitle: { fontSize: 12, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 7 },
  labelCell: { flex: 1.2 },
  labelText: { fontSize: 12, fontWeight: '600' },
  headCell: { flex: 1, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  cell: { flex: 1, fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
