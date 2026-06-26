/**
 * Course abstraction. A `CourseConfig` bundles everything that differs between
 * the learning courses (Latin, Japanese): identity, theme, fonts, decorations,
 * AI prompts, TTS voice, text processing and seed content. Screens and the
 * query layer stay course-agnostic — they read the active course's config via
 * `getActiveCourse()` (module-load) or the `useCourse()` hook (components).
 */
import type { ThemeColors } from '@/constants/theme';
import type { SeedBook, SeedGrammarTopic, SeedLemma } from '@/data/types';
import type { SeedSaying } from '@/data/sayings';
import type { AiMode } from '@/lib/ai/types';
import type { Pronunciation } from '@/store/app';

export type CourseId = 'la' | 'ja';

/** Generic word/punctuation chunk produced by a course's tokenizer. */
export type Token = {
  /** original surface form as it appears in the text */
  raw: string;
  /** canonical matching key (may be '' for punctuation) */
  key: string;
  /** true if the chunk is a word (has letters), false for whitespace/punct */
  isWord: boolean;
};

/** Font-family names per role (mirrors the `Fonts` export in theme.ts). */
export type FontFamilies = {
  sans: string;
  serif: string;
  serifBody: string;
  rounded: string;
  mono: string;
};

export interface CourseTextOps {
  /** Canonical matching key for a single token (folding/normalisation). */
  normalize(word: string): string;
  /** Split text into a stream of word/non-word chunks for the reader. */
  tokenize(text: string): Token[];
  /** Distinct normalized word keys in a text (coverage). */
  wordKeys(text: string): string[];
  /**
   * Surface forms (normalized) generated for a seed lemma, used to populate
   * `word_forms` so tap-to-gloss & coverage match inflected forms.
   */
  buildForms(lemma: SeedLemma): string[];
}

export interface CourseAiConfig {
  baseInstructions: string;
  modeInstructions: Record<AiMode, string>;
  openers: Record<AiMode, string>;
  /** Build the "known vocabulary / mastered grammar" context block. */
  knowledgeLabels(knownWords: string[], masteredGrammar: string[]): string;
  /** Extract the target-language part of a reply for TTS (drop helper lines). */
  speakablePart(text: string): string;
  /** Whether the model supports chain-of-thought reasoning.
   *  When true, thinking tags are parsed into a collapsible bubble.
   *  When false/absent, the engine disables thinking and the UI hides the bubble. */
  supportsThinking?: boolean;
}

export interface CourseTtsConfig {
  voiceId: string;
  model: string;
  /** Map written text to a phonetic hint for the TTS engine. */
  preprocess(text: string, pronunciation: Pronunciation): string;
}

export interface CourseConfig {
  id: CourseId;
  /** SQLite file backing this course (separate file = full data isolation). */
  dbFile: string;
  /** Brand shown on the splash + course switcher, e.g. 'Latīna' | '日本語'. */
  displayName: string;
  /** AI tutor name, e.g. 'Magister' | '先生'. */
  tutorName: string;
  /** Bottom-tab labels for this course. */
  tabLabels: { vocab: string; grammar: string; ai: string; library: string };

  colors: { light: ThemeColors; dark: ThemeColors };
  /** Passed to expo-font useFonts(); the active course's fonts load at start. */
  fontModules: Record<string, number>;
  fonts: FontFamilies;

  /** Grammar-path decoration assets (require()'d image sources) + layout metrics. */
  decorations: {
    statueA: number;
    statueB: number;
    temple: number;
    pillar: number;
    /** intrinsic aspect ratios (width / height) used for layout box sizing */
    statueRatio: number;
    templeRatio: number;
    pillarRatio: number;
    /** fraction of the canvas width the temple gateway spans (1 = full width) */
    templeWidthFactor: number;
  };

  ai: CourseAiConfig;
  tts: CourseTtsConfig;
  text: CourseTextOps;

  seed: {
    vocab: SeedLemma[];
    grammar: SeedGrammarTopic[];
    sayings: SeedSaying[];
    texts: SeedBook[];
  };

  /** Whether the classical/ecclesiastical pronunciation toggle applies. */
  hasPronunciationModes: boolean;
}
