import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toRoman } from '@/lib/roman';
import { speakLatin } from '@/lib/speech';
import { useApp } from '@/store/app';
import type { GrammarTopic } from '@/db/schema';

/**
 * Roman-styled lesson rendering for grammar topics.
 *
 * The explanation text is lightly structured markdown-ish prose:
 *  - paragraphs separated by blank lines
 *  - `**bold**` key terms, `*italic*` Latin examples
 *  - `- ` bullets; bullets containing ` → ` become inscription example cards
 *  - a final `Merke: …` line becomes the wax-tablet mnemonic
 */

// ── Stage metadata ──────────────────────────────────────────────────────────

const STAGE_META: Record<string, { latin: string; german: string }> = {
  foundations: { latin: 'FVNDAMENTA', german: 'Grundlagen' },
  morphology: { latin: 'MORPHOLOGIA', german: 'Formenlehre' },
  syntax: { latin: 'SYNTAXIS', german: 'Satzlehre' },
  advanced: { latin: 'ARS SVPERIOR', german: 'Fortgeschritten' },
};

// ── Hero ────────────────────────────────────────────────────────────────────

export function LessonHero({ topic }: { topic: GrammarTopic }) {
  const theme = useTheme();
  const stage = STAGE_META[topic.stage] ?? STAGE_META.foundations;
  return (
    <View style={heroStyles.wrap}>
      <Text style={[heroStyles.epigraph, { color: theme.accent }]}>
        LECTIO {toRoman(topic.orderIndex + 1)} · {stage.latin}
      </Text>
      <Text style={[heroStyles.title, { color: theme.text }]}>{topic.title}</Text>
      <Text style={[heroStyles.summary, { color: theme.textSecondary }]}>{topic.summary}</Text>
      <OrnamentRule color={theme.accent} />
    </View>
  );
}

const heroStyles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: Spacing.two },
  epigraph: {
    fontFamily: Fonts.serifBody,
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: Spacing.one + 2,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 31,
  },
  summary: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.one,
    lineHeight: 19,
    paddingHorizontal: Spacing.two,
  },
});

// ── Ornament divider ────────────────────────────────────────────────────────

export function OrnamentRule({ color }: { color: string }) {
  return (
    <View style={ornStyles.row}>
      <View style={[ornStyles.line, { backgroundColor: color }]} />
      <View style={[ornStyles.diamond, { backgroundColor: color }]} />
      <View style={[ornStyles.line, { backgroundColor: color }]} />
    </View>
  );
}

const ornStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: Spacing.three,
    alignSelf: 'center',
  },
  line: { width: 48, height: StyleSheet.hairlineWidth, opacity: 0.7 },
  diamond: { width: 5, height: 5, transform: [{ rotate: '45deg' }], opacity: 0.8 },
});

// ── Inline markdown (bold key terms, italic Latin) ──────────────────────────

function stripMd(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

export function InlineMd({
  text,
  baseStyle,
  boldColor,
}: {
  text: string;
  baseStyle: object;
  boldColor: string;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <Text style={baseStyle}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={{ fontWeight: '800', color: boldColor }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return (
            <Text key={i} style={{ fontStyle: 'italic', fontFamily: Fonts.serifBody }}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

// ── Example inscription card (bullet with `→`) ──────────────────────────────

function ExampleCard({ latin, german }: { latin: string; german: string }) {
  const theme = useTheme();
  const pronunciation = useApp((s) => s.pronunciation);
  const speak = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    speakLatin(stripMd(latin), pronunciation);
  };
  return (
    <View style={[exStyles.card, { backgroundColor: theme.muted, borderColor: theme.border }]}>
      <View style={exStyles.latinRow}>
        <InlineMd
          text={latin}
          baseStyle={[exStyles.latin, { color: theme.text }]}
          boldColor={theme.primary}
        />
        <Pressable onPress={speak} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.5 }}>
          <Ionicons name="volume-medium-outline" size={16} color={theme.primary} />
        </Pressable>
      </View>
      <View style={[exStyles.rule, { backgroundColor: theme.border }]} />
      <Text style={[exStyles.german, { color: theme.textSecondary }]}>{german}</Text>
    </View>
  );
}

const exStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    marginVertical: 3,
  },
  latinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  latin: {
    fontFamily: Fonts.serifBody,
    fontSize: 16,
    lineHeight: 23,
    flex: 1,
  },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 6, opacity: 0.8 },
  german: { fontSize: 13, lineHeight: 19 },
});

// ── Wax tablet (tabula cerata) for the mnemonic ─────────────────────────────

const WAX = {
  frame: '#6B4A2E', // wooden frame
  frameHi: '#8A6240',
  wax: '#2E2018', // dark beeswax
  text: '#F0E3C8', // stylus-carved cream
  label: '#C9A227',
};

export function WaxTablet({ text }: { text: string }) {
  return (
    <View style={waxStyles.frame}>
      <View style={waxStyles.frameInner}>
        <View style={waxStyles.wax}>
          <View style={waxStyles.labelRow}>
            <Ionicons name="create-outline" size={12} color={WAX.label} />
            <Text style={waxStyles.label}>MEMENTŌ</Text>
          </View>
          <InlineMd text={text} baseStyle={waxStyles.text} boldColor={WAX.label} />
        </View>
      </View>
    </View>
  );
}

const waxStyles = StyleSheet.create({
  frame: {
    backgroundColor: WAX.frame,
    borderRadius: Radius.md,
    padding: 7,
    marginTop: Spacing.three,
    borderWidth: 1,
    borderColor: WAX.frameHi,
  },
  frameInner: {
    borderRadius: Radius.md - 4,
    overflow: 'hidden',
  },
  wax: {
    backgroundColor: WAX.wax,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.three,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  label: {
    fontFamily: Fonts.serifBody,
    fontSize: 10,
    letterSpacing: 2.5,
    color: WAX.label,
  },
  text: {
    color: WAX.text,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: Fonts.serifBody,
  },
});

// ── Lesson body parser + renderer ───────────────────────────────────────────

type Block =
  | { kind: 'p'; text: string; lead: boolean }
  | { kind: 'bullet'; text: string }
  | { kind: 'example'; latin: string; german: string }
  | { kind: 'memento'; text: string };

function parseExplanation(explanation: string): Block[] {
  const blocks: Block[] = [];
  let firstParagraph = true;
  for (const rawBlock of explanation.split('\n\n')) {
    for (const line of rawBlock.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('Merke:')) {
        blocks.push({ kind: 'memento', text: trimmed.slice('Merke:'.length).trim() });
      } else if (trimmed.startsWith('- ')) {
        const content = trimmed.slice(2);
        const arrow = content.indexOf(' → ');
        if (arrow > 0) {
          blocks.push({
            kind: 'example',
            latin: content.slice(0, arrow).trim(),
            german: content.slice(arrow + 3).trim(),
          });
        } else {
          blocks.push({ kind: 'bullet', text: content });
        }
      } else {
        blocks.push({ kind: 'p', text: trimmed, lead: firstParagraph });
        firstParagraph = false;
      }
    }
  }
  return blocks;
}

export function LessonBody({ explanation }: { explanation: string }) {
  const theme = useTheme();
  const blocks = parseExplanation(explanation);

  return (
    <View style={bodyStyles.wrap}>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'memento':
            return <WaxTablet key={i} text={b.text} />;
          case 'example':
            return <ExampleCard key={i} latin={b.latin} german={b.german} />;
          case 'bullet':
            return (
              <View key={i} style={bodyStyles.bulletRow}>
                <Text style={[bodyStyles.bulletMark, { color: theme.accent }]}>❧</Text>
                <InlineMd
                  text={b.text}
                  baseStyle={[bodyStyles.bulletText, { color: theme.text }]}
                  boldColor={theme.primary}
                />
              </View>
            );
          case 'p':
            if (b.lead) {
              const first = b.text.charAt(0);
              const rest = b.text.slice(1);
              return (
                <Text key={i} style={[bodyStyles.p, { color: theme.text }]}>
                  <Text style={[bodyStyles.dropCap, { color: theme.primary }]}>{first}</Text>
                  <InlineMd text={rest} baseStyle={{}} boldColor={theme.primary} />
                </Text>
              );
            }
            return (
              <InlineMd
                key={i}
                text={b.text}
                baseStyle={[bodyStyles.p, { color: theme.text }]}
                boldColor={theme.primary}
              />
            );
        }
      })}
    </View>
  );
}

const bodyStyles = StyleSheet.create({
  wrap: { gap: Spacing.two + 2 },
  p: { fontSize: 16, lineHeight: 25 },
  dropCap: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    lineHeight: 32,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingLeft: 2,
  },
  bulletMark: { fontSize: 14, lineHeight: 24 },
  bulletText: { fontSize: 15.5, lineHeight: 24, flex: 1 },
});
