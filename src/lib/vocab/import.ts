import { sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { lemmas, wordForms } from '@/db/schema';
import { normalizeLatin } from '@/lib/latin/normalize';

/**
 * Imported vocabulary uses ids ≥ IMPORT_ID_BASE so the seeder can wipe & rebuild
 * bundled content without touching the user's own words.
 */
export const IMPORT_ID_BASE = 2_000_000;

/** Imported words live in a dedicated portion shown as "Eigene Vokabeln". */
export const IMPORT_GROUP = 0;

export type ParsedRow = { lemma: string; gloss: string };

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse an Anki text export (TSV) or a CSV/semicolon file. First column =
 * Latin (front), second = German (back). Extra columns and `#`-comments and
 * HTML are ignored.
 */
export function parseDeck(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/);
  const sample = lines.find((l) => l.trim() && !l.startsWith('#')) ?? '';
  let delim = '\t';
  if (!sample.includes('\t')) {
    if (sample.includes(';')) delim = ';';
    else if (sample.includes(',')) delim = ',';
  }
  const rows: ParsedRow[] = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const cols = line.split(delim).map(stripHtml);
    const lemma = cols[0];
    const gloss = cols[1];
    if (lemma && gloss) rows.push({ lemma, gloss });
  }
  return rows;
}

export type ImportResult = { added: number; skipped: number };

/** Insert parsed rows as new dictionary entries (dedup by normalised form). */
export function importVocab(rows: ParsedRow[]): ImportResult {
  const existing = new Set(db.select({ form: wordForms.form }).from(wordForms).all().map((r) => r.form));
  let maxId =
    db.select({ m: sql<number>`coalesce(max(id), 0)` }).from(lemmas).get()?.m ?? 0;
  if (maxId < IMPORT_ID_BASE) maxId = IMPORT_ID_BASE - 1;
  let maxRank =
    db
      .select({ m: sql<number>`coalesce(max(freq_rank), 50)` })
      .from(lemmas)
      .where(sql`${lemmas.freqRank} < 1000`)
      .get()?.m ?? 50;

  const lemmaBatch: (typeof lemmas.$inferInsert)[] = [];
  const formBatch: { form: string; lemmaId: number }[] = [];
  let added = 0;
  let skipped = 0;

  for (const r of rows) {
    const key = normalizeLatin(r.lemma);
    if (!key || existing.has(key)) {
      skipped += 1;
      continue;
    }
    existing.add(key);
    maxId += 1;
    maxRank += 1;
    lemmaBatch.push({
      id: maxId,
      lemma: r.lemma,
      pos: 'other',
      glossDe: r.gloss,
      freqRank: maxRank,
      freqGroup: IMPORT_GROUP,
    });
    formBatch.push({ form: key, lemmaId: maxId });
    added += 1;
  }

  for (let i = 0; i < lemmaBatch.length; i += 200) {
    db.insert(lemmas).values(lemmaBatch.slice(i, i + 200)).run();
  }
  for (let i = 0; i < formBatch.length; i += 200) {
    db.insert(wordForms).values(formBatch.slice(i, i + 200)).onConflictDoNothing().run();
  }
  return { added, skipped };
}
