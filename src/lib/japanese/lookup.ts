/**
 * Japanese word lookup for the grammar reference tab ("Nachschlagen").
 *
 * `searchLemmas` searches the active course DB (shared with Latin — same query shape,
 * just different data). `lookupWord` finds a lemma via surface-form mapping, then
 * returns a reference paradigm when the POS is a conjugable type.
 */
import { db } from '@/db/client';
import { lemmas, wordForms } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

import type { Paradigm } from '@/data/paradigms';
import { conjugateJapanese } from './inflect';
import { normalizeJapanese } from './normalize';

// ── Shared helpers ────────────────────────────────────────────────────────────

const PERSONS = ['Informell', 'Höflich (ます)'];

function conjTable(id: string, title: string, subtitle: string, topicId: string, stems: Record<string, string[]>): Paradigm {
  const labels = Object.keys(stems);
  const cols = PERSONS;
  return {
    id, title, subtitle, kind: 'verb', topicId, cols,
    rows: labels.map((l) => ({ label: l, cells: stems[l] })),
  };
}

const FORM_LABELS: Record<string, string> = {
  dict: 'Wörterbuch',
  masu: 'ます-Form',
  nai: 'Verneinung',
  ta: 'Vergangenheit',
  te: 'て-Form',
  pot: 'Potential',
  cond: 'Konditional',
  imp: 'Imperativ',
  vol: 'Volitional (よう)',
};

function mapConj(lemma: string, reading: string | null, pos: string): Record<string, string[]> | null {
  const forms = conjugateJapanese(lemma, pos);
  const readForms = reading ? conjugateJapanese(reading, pos) : [];
  // Map form suffixes to labels
  const out: Record<string, string[]> = {};
  // dict, masu, nai, ta, te, (pot), (cond), (vol)
  const suffixes: [string, string][] = [
    ['dict', ''], ['masu', 'ます'], ['nai', 'ない'], ['ta', 'た'], ['te', 'て'],
  ];
  if (pos.startsWith('v5') || pos === 'v1') {
    suffixes.push(['pot', 'る'], ['cond', 'ば'], ['vol', 'よう']);
  }
  for (const [label, suffix] of suffixes) {
    const match = forms.find((f) => f.endsWith(suffix));
    const matchP = readForms.find((f) => f.endsWith(suffix));
    if (match) out[label] = [match, matchP ?? ''];
  }
  return Object.keys(out).length >= 3 ? out : null;
}

function adjConjTable(lemma: string, reading: string | null, pos: string): Paradigm | null {
  const forms = conjugateJapanese(lemma, pos);
  if (forms.length < 2) return null;
  const readForms = reading ? conjugateJapanese(reading, pos) : [];
  const find = (suffix: string) => {
    const f = forms.find((x) => x.endsWith(suffix));
    const p = readForms.find((x) => x.endsWith(suffix));
    return [f ?? '', p ?? ''];
  };
  return {
    id: `lookup-${lemma}`,
    title: `${lemma}${reading ? ` (${reading})` : ''}`,
    subtitle: `${pos}`,
    kind: 'noun',
    topicId: 'adjectives-i',
    cols: ['Informell', 'Höflich (です)'],
    rows: [
      { label: 'Grundform', cells: find('い') },
      { label: 'Verneinung', cells: find('くない') },
      { label: 'Vergangenheit', cells: find('かった') },
      { label: 'Konditional', cells: find('ければ') },
      { label: 'Adverbial', cells: [find('く')[0], '—'] },
    ],
  };
}

export type LookupResultJa = {
  paradigm: Paradigm;
  lemma: { id: number; lemma: string; reading: string | null; pos: string; glossDe: string };
} | null;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Full-text search across lemmas (kanji + reading). Same pattern as the Latin
 * `searchLemmas` — generic DB query, works across courses because the active DB
 * connection already points at the correct file.
 */
export function searchLemmasJa(q: string): { id: number; lemma: string; reading: string | null; glossDe: string }[] {
  const norm = q.trim();
  if (!norm || norm.length < 1) return [];
  const like = `%${norm}%`;
  return db
    .select({ id: lemmas.id, lemma: lemmas.lemma, reading: lemmas.reading, glossDe: lemmas.glossDe })
    .from(lemmas)
    .where(sql`(${lemmas.lemma} LIKE ${like} OR ${lemmas.reading} LIKE ${like})`)
    .limit(12)
    .all();
}

/**
 * Look up a Japanese word (any surface form: kanji, kana, conjugated) and return
 * a reference paradigm when the lemma is a verb or adjective.
 */
export function lookupWordJa(raw: string): LookupResultJa {
  const q = normalizeJapanese(raw.trim());
  if (!q) return null;

  // 1. Find lemma via surface-form mapping.
  const wf = db.select().from(wordForms).where(eq(wordForms.form, q)).get();
  if (!wf) return null;

  const lemma = db.select().from(lemmas).where(eq(lemmas.id, wf.lemmaId)).get();
  if (!lemma) return null;

  // 2. Generate paradigm for conjugable types.
  let paradigm: Paradigm | null = null;

  if (lemma.pos.startsWith('v') || lemma.pos === 'vs-i') {
    const stems = mapConj(lemma.lemma, lemma.reading, lemma.pos);
    if (stems) {
      paradigm = conjTable(
        `lookup-${lemma.id}`,
        `${lemma.lemma}${lemma.reading ? ` (${lemma.reading})` : ''}`,
        lemma.pos,
        'verbs-masu',
        stems,
      );
    }
  } else if (lemma.pos.startsWith('adj')) {
    paradigm = adjConjTable(lemma.lemma, lemma.reading, lemma.pos);
  }

  // 3. If no conjugation paradigm, still return lemma info (caller can show
  //    gloss only).
  return {
    paradigm: paradigm ?? {
      id: `lookup-${lemma.id}`,
      title: lemma.lemma,
      subtitle: lemma.pos,
      kind: 'noun',
      topicId: 'hiragana',
      cols: [],
      rows: [
        { label: 'Lesung', cells: [lemma.reading ?? '—'] },
        { label: 'POS', cells: [lemma.pos] },
        { label: 'Bedeutung', cells: [lemma.glossDe] },
      ],
    },
    lemma: { id: lemma.id, lemma: lemma.lemma, reading: lemma.reading, pos: lemma.pos, glossDe: lemma.glossDe },
  };
}
