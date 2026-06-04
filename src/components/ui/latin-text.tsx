import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { tokenizeLatin } from '@/lib/latin/normalize';

type LatinTextProps = {
  /** The Latin text to render with tappable words. */
  text: string;
  /** Normalised forms whose lemma is already mastered (green/normal text). */
  knownKeys: Set<string>;
  /** All forms present in the bundled dictionary (tap-to-learn candidates). */
  dictKeys: Set<string>;
  /** Called when the user taps a Latin word. */
  onWordPress: (raw: string, key: string) => void;
  theme: ReturnType<typeof useTheme>;
  /** Additional style applied to the root Text element (e.g. fontSize, lineHeight, fontFamily). */
  style?: StyleProp<TextStyle>;
  /** The key of the currently tapped word — highlights it with a tinted background. */
  tappedWordKey?: string | null;
};

/**
 * Renders Latin text with tappable, colour-coded words.
 *
 * Colour coding matches the reader:
 * - Known words (mastered): normal text colour, regular weight.
 * - Dictionary words (not yet mastered): primary (terracotta) colour, bold + underline.
 * - Unknown words (not in dictionary): secondary text colour.
 *
 * Used by the reader and the AI Magister chat.
 */
export function LatinText({ text, knownKeys, dictKeys, onWordPress, theme, style, tappedWordKey }: LatinTextProps) {
  const tokens = tokenizeLatin(text);

  return (
    <Text style={style}>
      {tokens.map((t, i) => {
        if (!t.isWord) {
          return (
            <Text key={i} style={{ color: theme.text }}>
              {t.raw}
            </Text>
          );
        }

        const isKnown = knownKeys.has(t.key);
        const inDict = dictKeys.has(t.key);
        const tapped = tappedWordKey === t.key;
        const color = isKnown ? theme.text : inDict ? theme.primary : theme.textSecondary;

        return (
          <Text
            key={i}
            onPress={() => onWordPress(t.raw, t.key)}
            style={{
              color,
              fontWeight: isKnown ? '500' : '700',
              textDecorationLine: inDict && !isKnown ? 'underline' : 'none',
              textDecorationColor: theme.primary,
              backgroundColor: tapped ? theme.primary + '20' : 'transparent',
              borderRadius: tapped ? 3 : undefined,
              overflow: tapped ? 'hidden' : undefined,
            }}
          >
            {t.raw}
          </Text>
        );
      })}
    </Text>
  );
}
