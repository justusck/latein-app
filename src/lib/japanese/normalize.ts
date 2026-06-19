/**
 * Japanese text processing. Unlike Latin, Japanese has no spaces between words,
 * so segmentation needs a tokenizer (TinySegmenter — compact, pure-JS, no
 * dictionary). Segmentation only (no lemmatisation): conjugated forms are
 * matched by seeding common inflections into `word_forms` (see inflect.ts).
 */

// Hermes (React Native's JS engine) dropped the deprecated RegExp.prototype
// .compile() that TinySegmenter relies on (it does `new RegExp()` then
// `re.compile(pattern)`). We can't mutate a RegExp's internal pattern, so we
// build a fresh RegExp and delegate the matching operations TinySegmenter uses
// (str.match → Symbol.match, plus test/exec for safety) to it.
if (!(RegExp.prototype as any).compile) {
  (RegExp.prototype as any).compile = function (this: any, pattern: string, flags?: string) {
    const fresh = new RegExp(pattern, flags ?? '');
    this.test = (s: string) => fresh.test(s);
    this.exec = (s: string) => fresh.exec(s);
    this[Symbol.match] = (s: string) => (fresh as any)[Symbol.match](s);
    this[Symbol.replace] = (s: string, r: unknown) => (fresh as any)[Symbol.replace](s, r);
    this[Symbol.search] = (s: string) => (fresh as any)[Symbol.search](s);
    this[Symbol.split] = (s: string, l?: number) => (fresh as any)[Symbol.split](s, l);
    return this;
  };
}

import TinySegmenter from 'tiny-segmenter';

import type { Token } from '@/courses/types';

const segmenter = new TinySegmenter();

/** Any character that makes a chunk "a word" (kana, kanji, latin, digits). */
const WORDCHAR = /[぀-ゟ゠-ヿ㐀-鿿々〆ヵヶㇰ-ㇿA-Za-z0-9０-９]/;
const PUNCT = /[\s　。、，．！？「」『』（）()【】《》・…：；〜ー—–\-"'`*_~#]/g;

/**
 * Canonical matching key: NFKC-normalise (folds full-width latin/digits),
 * lowercase latin, strip whitespace and punctuation. Script is preserved
 * (katakana is NOT folded to hiragana — that would over-merge loanwords).
 */
export function normalizeJapanese(word: string): string {
  return word.normalize('NFKC').toLowerCase().replace(PUNCT, '');
}

/**
 * Segment text into word/non-word chunks, preserving originals so the reader
 * can re-render tappable words. Concatenation of `raw` === input.
 */
export function tokenizeJapanese(text: string): Token[] {
  const tokens: Token[] = [];
  for (const raw of segmenter.segment(text)) {
    if (!raw) continue;
    const key = WORDCHAR.test(raw) ? normalizeJapanese(raw) : '';
    tokens.push({ raw, key, isWord: key !== '' });
  }
  return tokens;
}

/** Distinct normalized word keys in a text (for coverage). */
export function wordKeysJapanese(text: string): string[] {
  const set = new Set<string>();
  for (const t of tokenizeJapanese(text)) {
    if (t.isWord && t.key) set.add(t.key);
  }
  return [...set];
}
