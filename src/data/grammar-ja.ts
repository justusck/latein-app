import type { SeedGrammarTopic } from './types';

/**
 * Japanese grammar skill tree — JLPT-N5/N4 foundation (kana, particles,
 * copula, polite verbs, i-adjectives). Same lesson conventions as the Latin
 * curriculum (rendered by components/grammar/lesson-content):
 *  - `**fett**` key terms, `*kursiv*` for romaji/notes
 *  - `- 日本語 → deutsch` bullets become example cards
 *  - a `Merke: …` line becomes the wax-tablet mnemonic
 *
 * Expanded to the full N5–N1 curriculum by later work; ids are stable so
 * progress survives re-seeding.
 */
export const SEED_GRAMMAR_JA: SeedGrammarTopic[] = [
  // ════════════════════════ FOUNDATIONS ════════════════════════
  {
    id: 'hiragana',
    title: 'ひらがな (Hiragana)',
    summary: 'Die phonetische Silbenschrift — Grundlage von allem.',
    stage: 'foundations',
    prereqs: [],
    explanation:
      'Japanisch kennt drei Schriften. **Hiragana** ist die geschwungene Silbenschrift für ' +
      'Grammatik, Endungen und einheimische Wörter.\n\n' +
      'Jedes Zeichen ist eine **Silbe (Mora)**, kein einzelner Laut:\n' +
      '- *あ い う え お* → a i u e o (die fünf Vokale)\n' +
      '- *か き く け こ* → ka ki ku ke ko\n' +
      '- *さ し す せ そ* → sa shi su se so\n\n' +
      'Es gibt keine Wortzwischenräume — die Schrift selbst trennt die Wörter.\n\n' +
      'Merke: Hiragana = Silben, nicht Buchstaben. あ ist „a", か ist „ka".',
    cards: [
      { id: 'hira-1', kind: 'mc', prompt: 'Welche Silbe ist „か"?', answer: 'ka', options: ['ka', 'sa', 'ta'], explanation: 'か = ka.' },
      { id: 'hira-2', kind: 'mc', prompt: 'Wie liest man „し"?', answer: 'shi', options: ['si', 'shi', 'chi'], explanation: 'さ-Reihe: さ sa, し shi, す su …' },
      { id: 'hira-3', kind: 'mc', prompt: 'Welches Zeichen steht für „u"?', answer: 'う', options: ['あ', 'う', 'お'], explanation: 'あ a, い i, う u, え e, お o.' },
      { id: 'hira-4', kind: 'fill', prompt: 'Schreibe die Lesung von „こんにちは" (Gruß) in Romaji.', answer: 'konnichiwa', explanation: 'こ-ん-に-ち-は → konnichiwa (は wird hier „wa" gelesen).' },
    ],
  },
  {
    id: 'katakana',
    title: 'カタカナ (Katakana)',
    summary: 'Die eckige Schrift für Lehnwörter und Namen.',
    stage: 'foundations',
    prereqs: ['hiragana'],
    explanation:
      '**Katakana** hat dieselben Silben wie Hiragana, aber eckige Formen. Es wird für ' +
      '**Lehnwörter**, fremde Namen und Lautmalerei benutzt.\n\n' +
      '- *コーヒー* → kōhī („Kaffee")\n' +
      '- *テレビ* → terebi („Fernseher")\n' +
      '- *アメリカ* → Amerika\n\n' +
      'Der Strich **ー** verlängert den Vokal.\n\n' +
      'Merke: Eckig = Katakana = Fremdwort. か (hira) ↔ カ (kata) — gleiche Silbe „ka".',
    cards: [
      { id: 'kata-1', kind: 'mc', prompt: 'Welche Schrift nutzt man für „Kaffee" (コーヒー)?', answer: 'Katakana', options: ['Hiragana', 'Katakana', 'Kanji'], explanation: 'Lehnwörter schreibt man in Katakana.' },
      { id: 'kata-2', kind: 'mc', prompt: 'Was bewirkt der Strich „ー"?', answer: 'verlängert den Vokal', options: ['verdoppelt den Konsonanten', 'verlängert den Vokal', 'macht eine Pause'], explanation: 'コーヒー = ko-o-hi-i.' },
      { id: 'kata-3', kind: 'mc', prompt: 'Welches Zeichen ist Katakana „ka"?', answer: 'カ', options: ['か', 'カ', '力'], explanation: 'カ ist Katakana; か ist Hiragana; 力 ist ein Kanji (chikara, „Kraft").' },
    ],
  },
  {
    id: 'particle-wa',
    title: 'は — Themenpartikel',
    summary: '„Was das Thema betrifft …" — der Rahmen jedes Satzes.',
    stage: 'foundations',
    prereqs: ['hiragana'],
    explanation:
      'Die Partikel **は** (gelesen *wa*) markiert das **Thema** des Satzes: „Was X betrifft …".\n\n' +
      'Sie steht *hinter* dem Wort, auf das sie sich bezieht — Japanisch ist eine ' +
      '**Partikel-Sprache**, die Funktion folgt dem Wort.\n' +
      '- *私は学生です。* → „Ich bin Student." (wörtl. „Was mich betrifft: Student.")\n' +
      '- *これは本です。* → „Das ist ein Buch."\n\n' +
      'Die Satzstellung ist **Subjekt–Objekt–Verb (SOV)**: das Verb steht am Ende.\n\n' +
      'Merke: は kommt NACH dem Thema und wird „wa" gesprochen. Verb ganz ans Ende.',
    cards: [
      { id: 'wa-1', kind: 'mc', prompt: 'Wie wird die Themenpartikel は ausgesprochen?', answer: 'wa', options: ['ha', 'wa', 'a'], explanation: 'Als Partikel wird は „wa" gelesen.' },
      { id: 'wa-2', kind: 'fill', prompt: 'Setze die Themenpartikel ein: 私＿学生です。', answer: 'は', explanation: '私は学生です — „Ich bin Student."' },
      { id: 'wa-3', kind: 'order', prompt: 'Bilde den Satz: „Das ist ein Buch."', answer: 'これ は 本 です', options: ['これ', 'は', '本', 'です'], explanation: 'Thema (これ) + は + Aussage (本) + です. Verb/Kopula am Ende.' },
    ],
  },
  {
    id: 'desu',
    title: 'です — die höfliche Kopula',
    summary: '„sein": A は B です.',
    stage: 'foundations',
    prereqs: ['particle-wa'],
    explanation:
      '**です** ist die höfliche Form von „sein". Es steht am **Satzende** und verbindet ' +
      'Thema und Aussage: *A は B です* → „A ist B."\n' +
      '- *彼は先生です。* → „Er ist Lehrer."\n' +
      '- *これは水です。* → „Das ist Wasser."\n\n' +
      'Vergangenheit: **でした** („war"). Verneinung: **ではありません** / *じゃないです* („ist nicht").\n\n' +
      'Merke: です macht den Satz höflich und beendet ihn. War → でした.',
    cards: [
      { id: 'desu-1', kind: 'mc', prompt: 'Was bedeutet です?', answer: 'ist/sind (höflich)', options: ['haben', 'ist/sind (höflich)', 'gehen'], explanation: 'です ist die höfliche Kopula „sein".' },
      { id: 'desu-2', kind: 'mc', prompt: 'Die Vergangenheit von です lautet …', answer: 'でした', options: ['でした', 'です', 'ません'], explanation: 'です → でした („war").' },
      { id: 'desu-3', kind: 'fill', prompt: 'Vervollständige: 彼は先生＿。 („Er ist Lehrer.")', answer: 'です', explanation: 'A は B です.' },
    ],
  },

  // ════════════════════════ MORPHOLOGY ════════════════════════
  {
    id: 'verbs-masu',
    title: 'Verben & die ます-Form',
    summary: 'Höfliche Verben: Verbgruppen und die Endung -masu.',
    stage: 'morphology',
    prereqs: ['desu'],
    explanation:
      'Japanische Verben enden im Wörterbuch auf eine **u-Silbe** (う, く, る …). Die höfliche ' +
      'Gegenwart bildet man mit **ます**.\n\n' +
      '**Ichidan-Verben** (enden auf -iru/-eru, z. B. *食べる*): る weg, **ます** dran → *食べます*.\n' +
      '**Godan-Verben** (z. B. *飲む*): letzte Silbe in die i-Reihe, dann **ます** → *飲みます*.\n' +
      '- *本を読みます。* → „Ich lese ein Buch."\n' +
      '- *水を飲みます。* → „Ich trinke Wasser."\n\n' +
      'Unregelmäßig: *する → します* („tun"), *来る → 来ます* („kommen").\n\n' +
      'Merke: Verb ans Satzende. Höflich = ます. 食べる → 食べます.',
    cards: [
      { id: 'masu-1', kind: 'mc', prompt: 'Die höfliche Form von 食べる lautet …', answer: '食べます', options: ['食べます', '食べるです', '食べました'], explanation: 'Ichidan: る → ます.' },
      { id: 'masu-2', kind: 'form', prompt: 'Bilde die ます-Form von 飲む.', answer: '飲みます', explanation: 'Godan: む → み + ます = 飲みます.' },
      { id: 'masu-3', kind: 'mc', prompt: 'Was ist die ます-Form von する?', answer: 'します', options: ['します', 'すます', 'しります'], explanation: 'する ist unregelmäßig: する → します.' },
      { id: 'masu-4', kind: 'order', prompt: 'Bilde den Satz: „Ich trinke Wasser." (höflich)', answer: '水 を 飲みます', options: ['水', 'を', '飲みます'], explanation: 'Objekt (水) + を + Verb (飲みます) am Ende.' },
    ],
  },
  {
    id: 'adjectives-i',
    title: 'い-Adjektive',
    summary: 'Adjektive, die selbst konjugieren.',
    stage: 'morphology',
    prereqs: ['desu'],
    explanation:
      '**い-Adjektive** enden auf **い** und verändern sich selbst (anders als im Deutschen):\n' +
      '- *大きい* → groß, *小さい* → klein, *新しい* → neu\n\n' +
      'Vor einem Nomen stehen sie direkt: *大きい家* → „ein großes Haus".\n\n' +
      'Verneinung: い weg, **くない** dran → *大きくない* („nicht groß"). ' +
      'Vergangenheit: **かった** → *大きかった* („war groß").\n\n' +
      'Merke: い-Adjektive konjugieren selbst: 大きい → 大きくない → 大きかった.',
    cards: [
      { id: 'adji-1', kind: 'mc', prompt: 'Wie verneint man 大きい („groß")?', answer: '大きくない', options: ['大きくない', '大きいない', '大きません'], explanation: 'い → くない: 大きくない.' },
      { id: 'adji-2', kind: 'form', prompt: 'Bilde die Vergangenheit von 高い („teuer").', answer: '高かった', explanation: 'い → かった: 高かった („war teuer").' },
      { id: 'adji-3', kind: 'order', prompt: 'Bilde: „ein großes Haus"', answer: '大きい 家', options: ['大きい', '家'], explanation: 'い-Adjektiv steht direkt vor dem Nomen: 大きい家.' },
    ],
  },

  // ════════════════════════ SYNTAX ════════════════════════
  {
    id: 'particle-wo',
    title: 'を — Objektpartikel',
    summary: 'Markiert das direkte Objekt.',
    stage: 'syntax',
    prereqs: ['verbs-masu'],
    explanation:
      'Die Partikel **を** (gelesen *o*) markiert das **direkte Objekt** — das, worauf die ' +
      'Handlung zielt. Sie steht hinter dem Objekt, das Verb folgt am Ende.\n' +
      '- *本を読みます。* → „Ich lese ein Buch." (本 = Objekt)\n' +
      '- *日本語を話します。* → „Ich spreche Japanisch."\n\n' +
      'Aufbau: **Thema は … Objekt を Verb**.\n\n' +
      'Merke: を steht hinter dem Objekt und wird „o" gesprochen. を nur als Partikel.',
    cards: [
      { id: 'wo-1', kind: 'mc', prompt: 'Welche Partikel markiert das direkte Objekt?', answer: 'を', options: ['は', 'を', 'の'], explanation: 'を kennzeichnet das Objekt.' },
      { id: 'wo-2', kind: 'fill', prompt: 'Setze die Objektpartikel ein: 日本語＿話します。', answer: 'を', explanation: '日本語を話します — „Ich spreche Japanisch."' },
      { id: 'wo-3', kind: 'order', prompt: 'Bilde: „Ich lese ein Buch." (mit Thema 私)', answer: '私 は 本 を 読みます', options: ['私', 'は', '本', 'を', '読みます'], explanation: 'Thema (私は) – Objekt (本を) – Verb (読みます).' },
    ],
  },
  {
    id: 'particle-no',
    title: 'の — Genitiv & Zugehörigkeit',
    summary: 'Verbindet zwei Nomen: „X von Y".',
    stage: 'syntax',
    prereqs: ['particle-wa'],
    explanation:
      'Die Partikel **の** verbindet zwei Nomen und drückt **Besitz/Zugehörigkeit** aus — ' +
      'das Bestimmende steht **vor** の.\n' +
      '- *私の本* → „mein Buch" (wörtl. „von mir Buch")\n' +
      '- *日本語の先生* → „Japanischlehrer(in)"\n' +
      '- *友達の家* → „das Haus des Freundes"\n\n' +
      'Reihenfolge umgekehrt zum Deutschen: **A の B = B von A**.\n\n' +
      'Merke: A の B → „B von A". 私の本 = „mein Buch".',
    cards: [
      { id: 'no-1', kind: 'mc', prompt: 'Was bedeutet 私の本?', answer: 'mein Buch', options: ['mein Buch', 'das Buch und ich', 'ich lese ein Buch'], explanation: 'A の B = „B von A" → „mein Buch".' },
      { id: 'no-2', kind: 'fill', prompt: 'Setze ein: 友達＿家 („das Haus des Freundes")', answer: 'の', explanation: '友達の家.' },
      { id: 'no-3', kind: 'order', prompt: 'Bilde: „Japanischlehrer(in)"', answer: '日本語 の 先生', options: ['日本語', 'の', '先生'], explanation: '日本語の先生 — Bestimmendes (日本語) vor の.' },
    ],
  },
];
