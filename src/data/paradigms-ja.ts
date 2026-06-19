/**
 * Japanese reference paradigms — same `Paradigm` shape as the Latin tables so
 * `ParadigmTable` renders them unchanged. These power the "Nachschlagen" page
 * in the Japanese course. `kind` values: 'kana' | 'verb' | 'adj' | 'particle'
 * (the `Paradigm` type expects 'noun'|'verb', but the grammar screen casts
 * via `refSections` — these values are fine at runtime).
 */
import type { Paradigm } from './paradigms';

// ── Kana syllabaries ──────────────────────────────────────────────────────────

function kanaRow(consonant: string, syllables: string[]): { label: string; cells: string[] } {
  return { label: consonant, cells: syllables };
}

export const PARADIGMS_JA: Paradigm[] = [
  // ══ Hiragana (gojūon) ════════════════════════════════════════════════════════
  { id: 'hiragana-basic', kind: 'kana', title: 'ひらがな — Grundtafel (五十音)', subtitle: 'Hiragana: Grundsilben', topicId: 'hiragana',
    cols: ['a', 'i', 'u', 'e', 'o'],
    rows: [
      kanaRow('∅', ['あ', 'い', 'う', 'え', 'お']), kanaRow('k', ['か', 'き', 'く', 'け', 'こ']),
      kanaRow('s', ['さ', 'し', 'す', 'せ', 'そ']), kanaRow('t', ['た', 'ち', 'つ', 'て', 'と']),
      kanaRow('n', ['な', 'に', 'ぬ', 'ね', 'の']), kanaRow('h', ['は', 'ひ', 'ふ', 'へ', 'ほ']),
      kanaRow('m', ['ま', 'み', 'む', 'め', 'も']), kanaRow('y', ['や', '', 'ゆ', '', 'よ']),
      kanaRow('r', ['ら', 'り', 'る', 'れ', 'ろ']), kanaRow('w', ['わ', '', '', '', 'を']),
      kanaRow('n\'', ['ん', '', '', '', '']),
    ] },
  // Hiragana — dakuon / handakuon
  { id: 'hiragana-dakuon', kind: 'kana', title: 'ひらがな — Trübung (濁音・半濁音)', subtitle: 'dakuon & handakuon', topicId: 'hiragana',
    cols: ['a', 'i', 'u', 'e', 'o'],
    rows: [
      kanaRow('g', ['が', 'ぎ', 'ぐ', 'げ', 'ご']), kanaRow('z', ['ざ', 'じ', 'ず', 'ぜ', 'ぞ']),
      kanaRow('d', ['だ', 'ぢ', 'づ', 'で', 'ど']), kanaRow('b', ['ば', 'び', 'ぶ', 'べ', 'ぼ']),
      kanaRow('p', ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ']),
    ] },

  // ══ Katakana (gojūon) ════════════════════════════════════════════════════════
  { id: 'katakana-basic', kind: 'kana', title: 'カタカナ — Grundtafel (五十音)', subtitle: 'Katakana: Grundsilben', topicId: 'katakana',
    cols: ['a', 'i', 'u', 'e', 'o'],
    rows: [
      kanaRow('∅', ['ア', 'イ', 'ウ', 'エ', 'オ']), kanaRow('k', ['カ', 'キ', 'ク', 'ケ', 'コ']),
      kanaRow('s', ['サ', 'シ', 'ス', 'セ', 'ソ']), kanaRow('t', ['タ', 'チ', 'ツ', 'テ', 'ト']),
      kanaRow('n', ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ']), kanaRow('h', ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ']),
      kanaRow('m', ['マ', 'ミ', 'ム', 'メ', 'モ']), kanaRow('y', ['ヤ', '', 'ユ', '', 'ヨ']),
      kanaRow('r', ['ラ', 'リ', 'ル', 'レ', 'ロ']), kanaRow('w', ['ワ', '', '', '', 'ヲ']),
      kanaRow('n\'', ['ン', '', '', '', '']),
    ] },
  // Katakana — dakuon
  { id: 'katakana-dakuon', kind: 'kana', title: 'カタカナ — Trübung (濁音・半濁音)', subtitle: 'dakuon', topicId: 'katakana',
    cols: ['a', 'i', 'u', 'e', 'o'],
    rows: [
      kanaRow('g', ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ']), kanaRow('z', ['ザ', 'ジ', 'ズ', 'ゼ', 'ゾ']),
      kanaRow('d', ['ダ', 'ヂ', 'ヅ', 'デ', 'ド']), kanaRow('b', ['バ', 'ビ', 'ブ', 'ベ', 'ボ']),
      kanaRow('p', ['パ', 'ピ', 'プ', 'ペ', 'ポ']),
    ] },

  // ══ Verb conjugation — Godan (group I) ════════════════════════════════════════
  { id: 'verb-godan', kind: 'verb', title: 'Godan-Verb (五段) · 飲む', subtitle: 'nomu — trinken (group I)', topicId: 'verbs-masu',
    cols: ['Informell', 'Höflich (ます)'],
    rows: [
      { label: 'Wörterbuch', cells: ['飲む', '飲みます'] },
      { label: 'Verneinung', cells: ['飲まない', '飲みません'] },
      { label: 'Vergangenheit', cells: ['飲んだ', '飲みました'] },
      { label: 'Vernein. Verg.', cells: ['飲まなかった', '飲みませんでした'] },
      { label: 'て-Form', cells: ['飲んで', '飲みまして'] },
      { label: 'Potential', cells: ['飲める', '飲めます'] },
      { label: 'Konditional', cells: ['飲めば', '飲みますれば'] },
      { label: 'Imperativ', cells: ['飲め', '飲みなさい'] },
    ] },

  // ══ Verb conjugation — Ichidan (group II) ═════════════════════════════════════
  { id: 'verb-ichidan', kind: 'verb', title: 'Ichidan-Verb (一段) · 食べる', subtitle: 'taberu — essen (group II)', topicId: 'verbs-masu',
    cols: ['Informell', 'Höflich (ます)'],
    rows: [
      { label: 'Wörterbuch', cells: ['食べる', '食べます'] },
      { label: 'Verneinung', cells: ['食べない', '食べません'] },
      { label: 'Vergangenheit', cells: ['食べた', '食べました'] },
      { label: 'Vernein. Verg.', cells: ['食べなかった', '食べませんでした'] },
      { label: 'て-Form', cells: ['食べて', '食べまして'] },
      { label: 'Potential', cells: ['食べられる', '食べられます'] },
      { label: 'Konditional', cells: ['食べれば', '食べますれば'] },
      { label: 'Imperativ', cells: ['食べろ', '食べなさい'] },
    ] },

  // ══ Verb conjugation — irregular ══════════════════════════════════════════════
  { id: 'verb-irregular', kind: 'verb', title: 'する · 来る (unregelmäßig)', subtitle: 'suru — tun / kuru — kommen', topicId: 'verbs-masu',
    cols: ['する (informell)', 'します (höflich)', '来る (informell)', '来ます (höflich)'],
    rows: [
      { label: 'Wörterbuch', cells: ['する', 'します', '来る', '来ます'] },
      { label: 'Verneinung', cells: ['しない', 'しません', '来ない', '来ません'] },
      { label: 'Vergangenheit', cells: ['した', 'しました', '来た', '来ました'] },
      { label: 'Vernein. Verg.', cells: ['しなかった', 'しませんでした', '来なかった', '来ませんでした'] },
      { label: 'て-Form', cells: ['して', 'しまして', '来て', '来まして'] },
      { label: 'Konditional', cells: ['すれば', 'しますれば', '来れば', '来ますれば'] },
    ] },

  // ══ i-Adjective conjugation ═══════════════════════════════════════════════════
  { id: 'adj-i', kind: 'adj', title: 'い-Adjektiv · 大きい', subtitle: 'ōkii — groß (i-Adjektiv)', topicId: 'adjectives-i',
    cols: ['Informell', 'Höflich (です)'],
    rows: [
      { label: 'Grundform', cells: ['大きい', '大きいです'] },
      { label: 'Verneinung', cells: ['大きくない', '大きくないです / 大きくありません'] },
      { label: 'Vergangenheit', cells: ['大きかった', '大きかったです'] },
      { label: 'Vernein. Verg.', cells: ['大きくなかった', '大きくなかったです'] },
      { label: 'Adverbial', cells: ['大きく', '—'] },
      { label: 'Konditional', cells: ['大きければ', '—'] },
    ] },

  // ══ na-Adjective conjugation ══════════════════════════════════════════════════
  { id: 'adj-na', kind: 'adj', title: 'な-Adjektiv · 静か', subtitle: 'shizuka — ruhig (na-Adjektiv)', topicId: 'adjectives-i',
    cols: ['Informell', 'Höflich (です)'],
    rows: [
      { label: 'Grundform', cells: ['静かだ', '静かです'] },
      { label: 'Verneinung', cells: ['静かではない', '静かではありません / 静かじゃないです'] },
      { label: 'Vergangenheit', cells: ['静かだった', '静かでした'] },
      { label: 'Vernein. Verg.', cells: ['静かではなかった', '静かではありませんでした'] },
      { label: 'Adverbial', cells: ['静かに', '—'] },
    ] },

  // ══ Core particles ════════════════════════════════════════════════════════════
  { id: 'particles', kind: 'particle', title: 'Partikel — Übersicht', subtitle: 'Die wichtigsten japanischen Partikel', topicId: 'particle-wa',
    cols: ['Partikel', 'Funktion', 'Beispiel'],
    rows: [
      { label: 'は (wa)', cells: ['Thema', '私は学生です。'] },
      { label: 'が (ga)', cells: ['Subjekt / Fokus', '犬がいます。'] },
      { label: 'を (o)', cells: ['Direktes Objekt', '本を読みます。'] },
      { label: 'に (ni)', cells: ['Ziel / Ort / Zeit', '学校に行きます。'] },
      { label: 'へ (e)', cells: ['Richtung', '日本へ行きます。'] },
      { label: 'で (de)', cells: ['Ort der Handlung / Mittel', 'バスで行きます。'] },
      { label: 'の (no)', cells: ['Besitz / Zugehörigkeit', '私の本です。'] },
      { label: 'と (to)', cells: ['„und" / „mit"', '友達と話します。'] },
      { label: 'から (kara)', cells: ['„von" / „seit"', '家から学校まで。'] },
      { label: 'まで (made)', cells: ['„bis"', '３時まで。'] },
      { label: 'より (yori)', cells: ['Vergleich („als")', 'これより大きい。'] },
      { label: 'も (mo)', cells: ['„auch"', '私も学生です。'] },
      { label: 'ね (ne)', cells: ['Bestätigung („ne?")', 'いい天気ですね。'] },
      { label: 'よ (yo)', cells: ['Nachdruck', '大丈夫ですよ。'] },
      { label: 'か (ka)', cells: ['Frage', '学生ですか？'] },
    ] },

  // ══ Counters ══════════════════════════════════════════════════════════════════
  { id: 'counters', kind: 'particle', title: 'Zählwörter — Übersicht', subtitle: 'Wichtige japanische Zählwortsuffixe', topicId: 'hiragana',
    cols: ['Zählwort', 'Wofür', '1', '2', '3'],
    rows: [
      { label: '人 (nin)', cells: ['Personen', '一人 (hitori)', '二人 (futari)', '三人 (sannin)'] },
      { label: '個 (ko)', cells: ['kleine Dinge', '一個 (ikko)', '二個 (niko)', '三個 (sanko)'] },
      { label: '本 (hon)', cells: ['lange Dinge', '一本 (ippon)', '二本 (nihon)', '三本 (sanbon)'] },
      { label: '枚 (mai)', cells: ['flache Dinge', '一枚 (ichimai)', '二枚 (nimai)', '三枚 (sanmai)'] },
      { label: '冊 (satsu)', cells: ['Bücher/Hefte', '一冊 (issatsu)', '二冊 (nisatsu)', '三冊 (sansatsu)'] },
      { label: '匹 (hiki)', cells: ['kleine Tiere', '一匹 (ippiki)', '二匹 (nihiki)', '三匹 (sanbiki)'] },
      { label: '回 (kai)', cells: ['Male / -mal', '一回 (ikkai)', '二回 (nikai)', '三回 (sankai)'] },
    ] },
];
