/**
 * Latin course config. Bundles the values that previously lived inline across
 * the app (theme, decorations, AI prompts, TTS, text ops, seed). The consuming
 * modules now read these from the active course — no behaviour change for Latin.
 */
import { LibreCaslonText_400Regular, LibreCaslonText_700Bold } from '@expo-google-fonts/libre-caslon-text';

import { ColorsLa, FontsLa } from '@/constants/theme';
import { SEED_GRAMMAR } from '@/data/grammar';
import { SEED_SAYINGS } from '@/data/sayings';
import { SEED_TEXTS } from '@/data/texts';
import { SEED_VOCAB } from '@/data/vocab';
import { normalizeLatin, tokenizeLatin, wordKeys } from '@/lib/latin/normalize';
import { latinPreprocess } from '@/lib/latin/phonetic';

import type { CourseConfig } from './types';

const BASE_INSTRUCTIONS = [
  'Du bist ein KI-Assistent in einer Latein-Lern-App namens „Latīna".',
  'Dein Name ist „Magister".',
  '',
  'WICHTIGSTE REGELN (absolut bindend):',
  '1. Gib NIEMALS deinen Gedankengang, Überlegungen oder „thinking"-Prozess aus.',
  '   Schreibe NUR die direkte Antwort — keinen inneren Monolog, kein „Lass mich',
  '   überlegen…", kein „Als KI…", keine Meta-Kommentare.',
  '2. Formatiere deine Antworten mit Markdown: **fett**, *kursiv*, `Code`,',
  '   Aufzählungen mit - oder 1., Absätze mit Leerzeilen.',
  '3. Schreibe deine lateinischen Sätze KURZ und EINFACH. Nutze möglichst nur',
  '   Wortschatz und Grammatik, die der/die Lernende bereits beherrscht',
  '   (siehe Kontext unten).',
].join('\n');

export const LATIN_COURSE: CourseConfig = {
  id: 'la',
  dbFile: 'latina.db',
  displayName: 'Latīna',
  tutorName: 'Magister',
  tabLabels: { vocab: 'Vokabeln', grammar: 'Grammatik', ai: 'Magister', library: 'Lesen' },

  colors: ColorsLa,
  fontModules: { LibreCaslonText_400Regular, LibreCaslonText_700Bold },
  fonts: FontsLa,

  decorations: {
    statueA: require('../../assets/decorations/statue-a.webp'),
    statueB: require('../../assets/decorations/statue-b.webp'),
    temple: require('../../assets/decorations/temple.webp'),
    pillar: require('../../assets/decorations/pillar.webp'),
    statueRatio: 1024 / 1536, // ~0.67 portrait
    templeRatio: 1536 / 1024, // ~1.5 landscape gateway
    pillarRatio: 1024 / 1536, // ~0.67 portrait
    templeWidthFactor: 1, // full-width gateway arch
  },

  ai: {
    baseInstructions: BASE_INSTRUCTIONS,
    modeInstructions: {
      chat:
        'Führe ein natürliches, hilfreiches Gespräch auf Latein. Stelle leichte Rückfragen.\n' +
        '⚠️ DEINE GESAMTE ANTWORT MUSS AUF LATEIN SEIN — jedes einzelne Wort.\n' +
        'KEIN Deutsch, KEINE Übersetzungen in Klammern, KEINE Erklärungen.',
      roleplay:
        'Verkörpere den unten beschriebenen Charakter. Bleibe vollständig und konsequent in deiner Rolle.\n' +
        '⚠️ DEINE GESAMTE ANTWORT MUSS AUF LATEIN SEIN — jedes einzelne Wort.\n' +
        'KEIN Deutsch, KEINE Regieanweisungen, KEINE Übersetzungen.',
      correction:
        'Der/die Lernende schreibt lateinische Sätze. Korrigiere Fehler, lobe Gelungenes.\n' +
        'Erkläre die Korrekturen kurz auf Deutsch. Formatiere so:\n' +
        '**Fehler:** …\n**Korrektur:** …\n**Erklärung:** …',
    },
    openers: {
      chat: 'Salvē! Quōmodo tē habēs?',
      roleplay: 'Salvē! In forō sumus. Ego mercātor sum. Quid emere vīs?',
      correction: 'Scrībe mihi sententiam Latīnam — eam corrigam.',
    },
    knowledgeLabels: (knownWords, masteredGrammar) => {
      const vocabLine = knownWords.length
        ? knownWords.join(', ')
        : '(noch keine Vokabeln gefestigt — nutze nur allereinfachste Wörter)';
      const grammarLine = masteredGrammar.length
        ? masteredGrammar.join('; ')
        : '(noch keine Grammatik gefestigt — nur Präsens & einfache Hauptsätze)';
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
    // ElevenLabs "Adam" — deep, clear, works well for Latin
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    model: 'eleven_multilingual_v2',
    preprocess: latinPreprocess,
  },

  text: {
    normalize: normalizeLatin,
    tokenize: tokenizeLatin,
    wordKeys,
    buildForms: (lemma) => {
      const set = new Set<string>();
      const add = (s: string) => {
        const k = normalizeLatin(s);
        if (k) set.add(k);
      };
      add(lemma.lemma);
      for (const f of lemma.forms ?? []) add(f);
      return [...set];
    },
  },

  seed: { vocab: SEED_VOCAB, grammar: SEED_GRAMMAR, sayings: SEED_SAYINGS, texts: SEED_TEXTS },

  hasPronunciationModes: true,
};
