import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Lemma } from '@/db/schema';

type WordGlossPanelProps = {
  /** The original word form as it appeared in the text. */
  raw: string;
  /** The looked-up lemma, or null if not in dictionary. */
  lemma: Lemma | null;
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onSpeak: (word: string) => void;
  /** Optional "add to vocab" action. Shown only when provided. */
  onAddToVocab?: () => void;
  /** Whether the word has already been added to vocab. */
  added?: boolean;
  /** Additional style for the outermost container (e.g. for absolute positioning). */
  containerStyle?: ViewStyle;
};

/**
 * Bottom panel that appears when a Latin word is tapped.
 * Shows the lemma, principal parts (if any), German gloss,
 * and actions: speak, add to vocab (optional), close.
 *
 * Used by the reader and the AI Magister chat.
 */
export function WordGlossPanel({
  raw,
  lemma,
  theme,
  onClose,
  onSpeak,
  onAddToVocab,
  added = false,
  containerStyle,
}: WordGlossPanelProps) {
  return (
    <Card style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }, containerStyle]}>
      {/* Header: word + speak + close */}
      <View style={styles.header}>
        <Pressable onPress={() => onSpeak(raw)} style={styles.wordRow}>
          <Text style={[styles.word, { color: theme.text }]}>
            {lemma?.lemma ?? raw}
          </Text>
          <Ionicons name="volume-medium" size={20} color={theme.primary} />
        </Pressable>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={24} color={theme.textSecondary} />
        </Pressable>
      </View>

      {lemma ? (
        <>
          {lemma.principalParts ? (
            <Text style={[styles.parts, { color: theme.textSecondary }]}>
              {lemma.principalParts}
            </Text>
          ) : null}
          <Text style={[styles.gloss, { color: theme.primary }]}>{lemma.glossDe}</Text>
          {onAddToVocab ? (
            <Pressable
              onPress={onAddToVocab}
              disabled={added}
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: added ? theme.success : theme.muted,
                  opacity: pressed && !added ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.addBtnText, { color: added ? '#fff' : theme.text }]}>
                {added ? 'Hinzugefügt ✓' : 'Zu Vokabeln hinzufügen'}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Text style={[styles.gloss, { color: theme.textSecondary }]}>
          Nicht im Wörterbuch gefunden.
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  word: {
    fontSize: 26,
    fontWeight: '900',
  },
  parts: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  gloss: {
    fontSize: 18,
    fontWeight: '700',
  },
  addBtn: {
    borderRadius: Radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
