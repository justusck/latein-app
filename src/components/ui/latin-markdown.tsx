import { useMemo } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import Markdown, { type RenderRules, type ASTNode } from 'react-native-markdown-display';

import { useTheme } from '@/hooks/use-theme';
import { tokenize } from '@/lib/text';

type LatinMarkdownProps = {
  /** Markdown text to render with Latin word colour-coding. */
  children: string;
  /** Normalised forms whose lemma is already mastered (green/normal text). */
  knownKeys: Set<string>;
  /** All forms present in the bundled dictionary (tap-to-learn candidates). */
  dictKeys: Set<string>;
  /** Called when the user taps a Latin word. */
  onWordPress: (raw: string, key: string) => void;
  theme: ReturnType<typeof useTheme>;
};

/**
 * Renders Markdown content with Latin word colour-coding.
 *
 * Combines react-native-markdown-display with LatinText‑style
 * word colouring: known (normal), dictionary (terracotta + bold/underline),
 * unknown (secondary).
 */
export function LatinMarkdown({
  children,
  knownKeys,
  dictKeys,
  onWordPress,
  theme,
}: LatinMarkdownProps) {
  const mdStyles = useMemo(() => buildMarkdownStyles(theme), [theme]);

  const rules: RenderRules = useMemo(
    () => ({
      // Override text rendering to inject Latin word colouring
      text: (node: ASTNode) => {
        const content: string = node.content;
        if (!content) return null;

        const tokens = tokenize(content);
        return (
          <Text key={node.key}>
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
              const color = isKnown ? theme.text : inDict ? theme.primary : theme.textSecondary;

              return (
                <Text
                  key={i}
                  onPress={() => onWordPress(t.raw, t.key)}
                  style={{
                    color,
                    fontWeight: inDict && !isKnown ? '700' : '500',
                    textDecorationLine: inDict && !isKnown ? 'underline' : 'none',
                    textDecorationColor: theme.primary,
                  }}
                >
                  {t.raw}
                </Text>
              );
            })}
          </Text>
        );
      },
    }),
    [knownKeys, dictKeys, onWordPress, theme],
  );

  return (
    <Markdown
      rules={rules}
      style={mdStyles}
      mergeStyle
    >
      {children}
    </Markdown>
  );
}

function buildMarkdownStyles(theme: ReturnType<typeof useTheme>) {
  const baseText: TextStyle = {
    color: theme.text,
    fontSize: 16,
    lineHeight: 24,
  };

  return StyleSheet.create({
    body: { ...baseText },
    paragraph: { ...baseText, marginTop: 0, marginBottom: 8 },
    strong: { fontWeight: '800' as const },
    em: { fontStyle: 'italic' as const },
    s: { textDecorationLine: 'line-through' as const, color: theme.textSecondary },
    code_inline: {
      ...baseText,
      fontFamily: 'monospace',
      backgroundColor: theme.muted,
      borderRadius: 4,
      paddingHorizontal: 4,
      fontSize: 14,
    },
    fence: {
      ...baseText,
      fontFamily: 'monospace',
      backgroundColor: theme.muted,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      marginVertical: 8,
    },
    code_block: {
      ...baseText,
      fontFamily: 'monospace',
      backgroundColor: theme.muted,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      marginVertical: 8,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
      paddingLeft: 12,
      marginVertical: 8,
      opacity: 0.85,
    },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { ...baseText, flexDirection: 'row', marginVertical: 2 },
    bullet_list_icon: { ...baseText, marginRight: 6 },
    ordered_list_icon: { ...baseText, marginRight: 6 },
    hr: {
      backgroundColor: theme.border,
      height: StyleSheet.hairlineWidth,
      marginVertical: 12,
    },
    heading1: {
      ...baseText,
      fontSize: 20,
      fontWeight: '800',
      marginVertical: 8,
    },
    heading2: {
      ...baseText,
      fontSize: 18,
      fontWeight: '700',
      marginVertical: 6,
    },
    heading3: {
      ...baseText,
      fontSize: 16,
      fontWeight: '700',
      marginVertical: 4,
    },
  });
}
