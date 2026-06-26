/**
 * Japanese course config. Mirrors the Latin one but with Japanese theme, fonts,
 * AI prompts, TTS voice and text processing. Content is seeded into its own DB
 * (nihongo.db) so it never mixes with Latin.
 */
import { NotoSansJP_400Regular, NotoSansJP_500Medium, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { NotoSerifJP_400Regular, NotoSerifJP_700Bold } from '@expo-google-fonts/noto-serif-jp';

import { ColorsJa, FontsJa } from '@/constants/theme-ja';
import { SEED_GRAMMAR_JA } from '@/data/grammar-ja';
import { SEED_SAYINGS_JA } from '@/data/sayings-ja';
import { SEED_TEXTS_JA } from '@/data/texts-ja';
import { SEED_VOCAB_JA } from '@/data/vocab-ja';
import { buildFormsJapanese } from '@/lib/japanese/inflect';
import { normalizeJapanese, tokenizeJapanese, wordKeysJapanese } from '@/lib/japanese/normalize';

import type { CourseConfig } from './types';

const BASE_INSTRUCTIONS = [
  'Du bist ein KI-Assistent in einer Japanisch-Lern-App namens „日本語".',
  'Dein Name ist „先生" (Sensei).',
  '',
  'WICHTIGSTE REGELN (absolut bindend):',
  '1. Gib NIEMALS deinen Gedankengang, Überlegungen oder „thinking"-Prozess aus.',
  '   Schreibe NUR die direkte Antwort — keinen inneren Monolog, kein „Lass mich',
  '   überlegen…", kein „Als KI…", keine Meta-Kommentare.',
  '2. Formatiere deine Antworten mit Markdown: **fett**, *kursiv*, `Code`,',
  '   Aufzählungen mit - oder 1., Absätze mit Leerzeilen.',
  '3. Schreibe deine japanischen Sätze KURZ und EINFACH. Nutze möglichst nur',
  '   Wortschatz und Grammatik, die der/die Lernende bereits beherrscht',
  '   (siehe Kontext unten). Schreibe natürlich (Kanji + Kana wie üblich).',
].join('\n');

export const JAPANESE_COURSE: CourseConfig = {
  id: 'ja',
  dbFile: 'nihongo.db',
  displayName: '日本語',
  tutorName: '先生',
  tabLabels: { vocab: '単語', grammar: '文法', ai: '先生', library: '読む' },

  colors: ColorsJa,
  fontModules: { NotoSerifJP_400Regular, NotoSerifJP_700Bold, NotoSansJP_400Regular, NotoSansJP_500Medium, NotoSansJP_700Bold },
  fonts: FontsJa,

  // Japanese-themed cut-outs (samurai statues, portrait temple), background
  // removed. All portrait (~0.667); the temple is portrait too (unlike Latin's
  // landscape gateway), so it renders as a centered, half-width centerpiece.
  decorations: {
    statueA: require('../../assets/decorations-ja/statue-a.webp'),
    statueB: require('../../assets/decorations-ja/statue-b.webp'),
    temple: require('../../assets/decorations-ja/temple.webp'),
    pillar: require('../../assets/decorations-ja/statue-a.webp'),
    statueRatio: 1067 / 1600, // ~0.667 portrait
    templeRatio: 1067 / 1600, // ~0.667 portrait
    pillarRatio: 1067 / 1600, // ~0.667 portrait
    templeWidthFactor: 0.5, // portrait temple → centered, half-width
  },

  ai: {
    supportsThinking: true,
    baseInstructions: BASE_INSTRUCTIONS,
    modeInstructions: {
      chat:
        'Führe ein natürliches, hilfreiches Gespräch auf Japanisch. Stelle leichte Rückfragen.\n' +
        '⚠️ DEINE GESAMTE ANTWORT MUSS AUF JAPANISCH SEIN — jedes einzelne Wort.\n' +
        'KEIN Deutsch, KEINE Übersetzungen in Klammern, KEINE Erklärungen.',
      roleplay:
        'Verkörpere den unten beschriebenen Charakter. Bleibe vollständig und konsequent in deiner Rolle.\n' +
        '⚠️ DEINE GESAMTE ANTWORT MUSS AUF JAPANISCH SEIN — jedes einzelne Wort.\n' +
        'KEIN Deutsch, KEINE Regieanweisungen, KEINE Übersetzungen.',
      correction:
        'Der/die Lernende schreibt japanische Sätze. Korrigiere Fehler, lobe Gelungenes.\n' +
        'Erkläre die Korrekturen kurz auf Deutsch. Formatiere so:\n' +
        '**Fehler:** …\n**Korrektur:** …\n**Erklärung:** …',
    },
    openers: {
      chat: 'こんにちは！元気ですか？',
      roleplay: 'いらっしゃいませ！ここは店です。何を買いたいですか？',
      correction: '日本語で文を書いてください。直します。',
    },
    knowledgeLabels: (knownWords, masteredGrammar) => {
      const vocabLine = knownWords.length
        ? knownWords.join(', ')
        : '(noch keine Vokabeln gefestigt — nutze nur allereinfachste Wörter wie これ, です)';
      const grammarLine = masteredGrammar.length
        ? masteredGrammar.join('; ')
        : '(noch keine Grammatik gefestigt — nur einfachste Sätze: A は B です)';
      return (
        `BEHERRSCHTER WORTSCHATZ (${knownWords.length} Wörter): ${vocabLine}\n\n` +
        `BEHERRSCHTE GRAMMATIK: ${grammarLine}`
      );
    },
    speakablePart: (text) =>
      text
        .split('\n')
        .filter((line) => !/^\s*(DE|de)\s*:/.test(line))
        .join(' ')
        .replace(/\([^)]*\)/g, '')
        .replace(/[*_~`#]/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
  },

  tts: {
    // ElevenLabs premade multilingual voice — placeholder; set a native
    // Japanese voice id in settings for best quality. multilingual_v2 speaks JP.
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    model: 'eleven_multilingual_v2',
    preprocess: (text) => text.normalize('NFKC').trim(),
  },

  text: {
    normalize: normalizeJapanese,
    tokenize: tokenizeJapanese,
    wordKeys: wordKeysJapanese,
    buildForms: buildFormsJapanese,
  },

  seed: { vocab: SEED_VOCAB_JA, grammar: SEED_GRAMMAR_JA, sayings: SEED_SAYINGS_JA, texts: SEED_TEXTS_JA },

  hasPronunciationModes: false,
};
