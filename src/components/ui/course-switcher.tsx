import { Pressable, StyleSheet, Text } from 'react-native';

import { COURSE_LIST } from '@/courses';
import { useCourse } from '@/hooks/use-course';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/app';

/**
 * Tappable course badge shown in the top-right of every tab header.
 * Tapping it switches to the other course via `setCourse`, which reloads
 * the app so the right DB, theme, fonts and seed load cleanly.
 */
export function CourseSwitcher() {
  const theme = useTheme();
  const course = useCourse();
  const setCourse = useApp((s) => s.setCourse);
  const other = COURSE_LIST.find((c) => c.id !== course.id) ?? COURSE_LIST[0];

  return (
    <Pressable
      onPress={() => setCourse(other.id)}
      style={[styles.badge, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '40' }]}
    >
      <Text style={[styles.label, { color: theme.primary }]}>{course.displayName}</Text>
      <Text style={[styles.arrow, { color: theme.primary }]}>↻</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: { fontWeight: '700', fontSize: 13 },
  arrow: { fontSize: 13, fontWeight: '700', marginLeft: 2 },
});
