/**
 * Best-effort Japanese conjugation. Generates the most common inflected surface
 * forms (polite ます, negative ない, past た, て-form, potential, conditional)
 * so the reader's tap-to-gloss & coverage match conjugated occurrences, and the
 * form trainer has material. Covers godan / ichidan / する / 来る / i-adjectives;
 * everything else falls back to the dictionary form + any seed-provided forms.
 *
 * Operates on a single string by mutating the trailing kana (okurigana), so it
 * works identically on a kanji surface (食べる) and its reading (たべる).
 */
import type { SeedLemma } from '@/data/types';

import { normalizeJapanese } from './normalize';

// Godan transformations keyed by the dictionary-form final kana (う-row).
const I_ROW: Record<string, string> = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' };
const A_ROW: Record<string, string> = { う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら' };
const E_ROW: Record<string, string> = { う: 'え', く: 'け', ぐ: 'げ', す: 'せ', つ: 'て', ぬ: 'ね', ぶ: 'べ', む: 'め', る: 'れ' };
const TE: Record<string, string> = { う: 'って', つ: 'って', る: 'って', く: 'いて', ぐ: 'いで', ぬ: 'んで', ぶ: 'んで', む: 'んで', す: 'して' };
const TA: Record<string, string> = { う: 'った', つ: 'った', る: 'った', く: 'いた', ぐ: 'いだ', ぬ: 'んだ', ぶ: 'んだ', む: 'んだ', す: 'した' };

function godan(word: string): string[] {
  const last = word.slice(-1);
  const stem = word.slice(0, -1);
  if (!(last in I_ROW)) return [word];
  return [
    word,
    stem + I_ROW[last] + 'ます',
    stem + A_ROW[last] + 'ない',
    stem + TA[last],
    stem + TE[last],
    stem + E_ROW[last] + 'る', // potential
    stem + E_ROW[last] + 'ば', // conditional
  ];
}

function ichidan(word: string): string[] {
  if (!word.endsWith('る')) return [word];
  const stem = word.slice(0, -1);
  return [word, stem + 'ます', stem + 'ない', stem + 'た', stem + 'て', stem + 'られる', stem + 'れば', stem + 'よう'];
}

function suru(word: string): string[] {
  if (!word.endsWith('する')) return [word];
  const base = word.slice(0, -2);
  return ['する', 'します', 'しない', 'した', 'して', 'できる', 'すれば', 'しよう'].map((s) => base + s);
}

function kuru(word: string): string[] {
  if (word.endsWith('くる')) {
    const b = word.slice(0, -2);
    return ['くる', 'きます', 'こない', 'きた', 'きて', 'くれば', 'こよう'].map((s) => b + s);
  }
  if (word.endsWith('来る')) {
    const b = word.slice(0, -2);
    return ['来る', '来ます', '来ない', '来た', '来て', '来れば', '来よう'].map((s) => b + s);
  }
  return [word];
}

function adjI(word: string): string[] {
  if (!word.endsWith('い')) return [word];
  const stem = word.slice(0, -1);
  return [word, stem + 'くない', stem + 'かった', stem + 'く', stem + 'くて', stem + 'ければ'];
}

/** Conjugated surface forms (incl. the dictionary form) for one word. */
export function conjugateJapanese(word: string, pos: string): string[] {
  if (pos === 'v1') return ichidan(word);
  if (pos === 'vs-i' || pos === 'vs' || pos === 'vsuru') return suru(word);
  if (pos === 'vk') return kuru(word);
  if (pos === 'adj-i') return adjI(word);
  if (/^v5/.test(pos)) return godan(word);
  return [word];
}

/** Normalized surface forms used to seed `word_forms` for a Japanese lemma. */
export function buildFormsJapanese(lemma: SeedLemma): string[] {
  const surfaces = new Set<string>();
  const add = (s: string) => {
    const k = normalizeJapanese(s);
    if (k) surfaces.add(k);
  };
  add(lemma.lemma);
  if (lemma.reading) add(lemma.reading);
  for (const f of lemma.forms ?? []) add(f);
  for (const c of conjugateJapanese(lemma.lemma, lemma.pos)) add(c);
  if (lemma.reading) for (const c of conjugateJapanese(lemma.reading, lemma.pos)) add(c);
  return [...surfaces];
}
