import type { SeedLemma } from './types';

import { GENERATED_VOCAB_JA } from './vocab-ja.generated';

/**
 * Japanese vocabulary seed. Hand-curated high-frequency core (ids 1–999) +
 * the generated JMdict/JLPT set (ids ≥ 1000, see scripts/build-seed-ja.mjs).
 *
 * `lemma` = surface form (kanji where usual), `reading` = kana (furigana),
 * `glossDe` = German. `pos` uses JMdict-style tags so inflect.ts can conjugate:
 *   v1 (ichidan), v5* (godan), vk (来る), vs-i (する), adj-i, adj-na, n, pn,
 *   prt (particle), aux, int, adv …
 */
const SEED_VOCAB_JA_CORE: SeedLemma[] = [
  { id: 1, lemma: 'こんにちは', reading: 'こんにちは', pos: 'int', glossDe: 'Hallo, guten Tag', glossEn: 'hello', freqRank: 1 },
  { id: 2, lemma: 'ありがとう', reading: 'ありがとう', pos: 'int', glossDe: 'danke', glossEn: 'thank you', freqRank: 2 },
  { id: 3, lemma: 'はい', reading: 'はい', pos: 'int', glossDe: 'ja', glossEn: 'yes', freqRank: 3 },
  { id: 4, lemma: 'いいえ', reading: 'いいえ', pos: 'int', glossDe: 'nein', glossEn: 'no', freqRank: 4 },
  { id: 5, lemma: '私', reading: 'わたし', pos: 'pn', glossDe: 'ich', glossEn: 'I', freqRank: 5, forms: ['わたし'] },
  { id: 6, lemma: 'あなた', reading: 'あなた', pos: 'pn', glossDe: 'du, Sie', glossEn: 'you', freqRank: 6 },
  { id: 7, lemma: 'これ', reading: 'これ', pos: 'pn', glossDe: 'dies (hier)', glossEn: 'this', freqRank: 7 },
  { id: 8, lemma: 'それ', reading: 'それ', pos: 'pn', glossDe: 'das (da)', glossEn: 'that', freqRank: 8 },
  { id: 9, lemma: '何', reading: 'なに', pos: 'pn', glossDe: 'was', glossEn: 'what', freqRank: 9, forms: ['なに', 'なん'] },
  { id: 10, lemma: '人', reading: 'ひと', pos: 'n', glossDe: 'Mensch, Person', glossEn: 'person', freqRank: 10, forms: ['ひと'] },
  { id: 11, lemma: '日本', reading: 'にほん', pos: 'n', glossDe: 'Japan', glossEn: 'Japan', freqRank: 11, forms: ['にほん', 'にっぽん'] },
  { id: 12, lemma: '日本語', reading: 'にほんご', pos: 'n', glossDe: 'die japanische Sprache', glossEn: 'Japanese language', freqRank: 12 },
  { id: 13, lemma: '学生', reading: 'がくせい', pos: 'n', glossDe: 'Student, Schüler', glossEn: 'student', freqRank: 13 },
  { id: 14, lemma: '先生', reading: 'せんせい', pos: 'n', glossDe: 'Lehrer(in)', glossEn: 'teacher', freqRank: 14 },
  { id: 15, lemma: '水', reading: 'みず', pos: 'n', glossDe: 'Wasser', glossEn: 'water', freqRank: 15 },
  { id: 16, lemma: '本', reading: 'ほん', pos: 'n', glossDe: 'Buch', glossEn: 'book', freqRank: 16 },
  { id: 17, lemma: '家', reading: 'いえ', pos: 'n', glossDe: 'Haus, Zuhause', glossEn: 'house, home', freqRank: 17, forms: ['いえ', 'うち'] },
  { id: 18, lemma: '友達', reading: 'ともだち', pos: 'n', glossDe: 'Freund(in)', glossEn: 'friend', freqRank: 18 },
  { id: 19, lemma: '今日', reading: 'きょう', pos: 'n', glossDe: 'heute', glossEn: 'today', freqRank: 19, forms: ['きょう'] },
  { id: 20, lemma: '明日', reading: 'あした', pos: 'n', glossDe: 'morgen', glossEn: 'tomorrow', freqRank: 20, forms: ['あした', 'あす'] },
  { id: 21, lemma: '食べ物', reading: 'たべもの', pos: 'n', glossDe: 'Essen, Speise', glossEn: 'food', freqRank: 21 },
  { id: 22, lemma: '大学', reading: 'だいがく', pos: 'n', glossDe: 'Universität', glossEn: 'university', freqRank: 22 },
  { id: 23, lemma: '食べる', reading: 'たべる', pos: 'v1', glossDe: 'essen', glossEn: 'to eat', freqRank: 23 },
  { id: 24, lemma: '見る', reading: 'みる', pos: 'v1', glossDe: 'sehen, schauen', glossEn: 'to see', freqRank: 24 },
  { id: 25, lemma: '飲む', reading: 'のむ', pos: 'v5m', glossDe: 'trinken', glossEn: 'to drink', freqRank: 25 },
  { id: 26, lemma: '読む', reading: 'よむ', pos: 'v5m', glossDe: 'lesen', glossEn: 'to read', freqRank: 26 },
  { id: 27, lemma: '話す', reading: 'はなす', pos: 'v5s', glossDe: 'sprechen', glossEn: 'to speak', freqRank: 27 },
  { id: 28, lemma: '書く', reading: 'かく', pos: 'v5k', glossDe: 'schreiben', glossEn: 'to write', freqRank: 28 },
  { id: 29, lemma: '来る', reading: 'くる', pos: 'vk', glossDe: 'kommen', glossEn: 'to come', freqRank: 29, forms: ['くる'] },
  { id: 30, lemma: 'する', reading: 'する', pos: 'vs-i', glossDe: 'tun, machen', glossEn: 'to do', freqRank: 30 },
  { id: 31, lemma: '大きい', reading: 'おおきい', pos: 'adj-i', glossDe: 'groß', glossEn: 'big', freqRank: 31 },
  { id: 32, lemma: '小さい', reading: 'ちいさい', pos: 'adj-i', glossDe: 'klein', glossEn: 'small', freqRank: 32 },
  { id: 33, lemma: '高い', reading: 'たかい', pos: 'adj-i', glossDe: 'hoch, teuer', glossEn: 'high, expensive', freqRank: 33 },
  { id: 34, lemma: '新しい', reading: 'あたらしい', pos: 'adj-i', glossDe: 'neu', glossEn: 'new', freqRank: 34 },
  { id: 35, lemma: 'は', reading: 'は', pos: 'prt', glossDe: 'Themenpartikel (wa)', glossEn: 'topic particle', freqRank: 36 },
  { id: 36, lemma: 'を', reading: 'を', pos: 'prt', glossDe: 'Objektpartikel (o)', glossEn: 'object particle', freqRank: 37 },
  { id: 37, lemma: 'の', reading: 'の', pos: 'prt', glossDe: 'Genitiv-/Possessivpartikel', glossEn: 'possessive particle', freqRank: 38 },
  { id: 38, lemma: 'です', reading: 'です', pos: 'aux', glossDe: 'ist/sind (höflich)', glossEn: 'to be (polite)', freqRank: 39, forms: ['です', 'でした'] },
];

export const SEED_VOCAB_JA: SeedLemma[] = [...SEED_VOCAB_JA_CORE, ...GENERATED_VOCAB_JA];
