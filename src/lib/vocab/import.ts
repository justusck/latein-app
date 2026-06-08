import { eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { ankiPackages, bookLemmas, lemmas, reviews, vocabCards, wordForms } from '@/db/schema';
import type { AnkiPackage } from '@/db/schema';
import { normalizeLatin } from '@/lib/latin/normalize';

/**
 * Imported vocabulary uses ids ≥ IMPORT_ID_BASE so the seeder can wipe & rebuild
 * bundled content without touching the user's own words.
 */
export const IMPORT_ID_BASE = 2_000_000;

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
 * Parse an Anki tab-separated text export. First column = Latin (front),
 * second = German (back). Extra columns, `#`-comments, and HTML are ignored.
 */
export function parseDeck(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/);
  const delim = '\t';
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

export type ImportResult = { added: number; skipped: number; packageId: number; packageName: string };

/** Insert parsed rows as new dictionary entries, tracked under a named package. */
export function importVocab(rows: ParsedRow[], packageName: string): ImportResult {
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

  // Create the package record first
  const pkg = db
    .insert(ankiPackages)
    .values({ name: packageName, importedAt: Date.now(), wordCount: 0 })
    .returning()
    .get()!;

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
      packageId: pkg.id,
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

  // Update word count on the package
  db.update(ankiPackages)
    .set({ wordCount: added })
    .where(eq(ankiPackages.id, pkg.id))
    .run();

  return { added, skipped, packageId: pkg.id, packageName };
}

// ── Package management ─────────────────────────────────────────────────────

/** All imported packages, newest first. */
export function listPackages(): AnkiPackage[] {
  return db.select().from(ankiPackages).orderBy(sql`${ankiPackages.importedAt} DESC`).all();
}

/** Delete a package and all its lemmas, word forms, vocab cards, and reviews. */
export function deletePackage(packageId: number): void {
  const pkgLemmas = db
    .select({ id: lemmas.id })
    .from(lemmas)
    .where(eq(lemmas.packageId, packageId))
    .all();

  if (pkgLemmas.length === 0) {
    db.delete(ankiPackages).where(eq(ankiPackages.id, packageId)).run();
    return;
  }

  const lemmaIds = pkgLemmas.map((l) => l.id);
  const cardIds = lemmaIds.map(String);

  // Cascade: reviews → vocabCards → bookLemmas → wordForms → lemmas → package
  db.delete(reviews)
    .where(
      sql`${reviews.cardType} = 'vocab' AND ${reviews.cardId} IN ${cardIds}`,
    )
    .run();
  db.delete(vocabCards).where(inArray(vocabCards.lemmaId, lemmaIds)).run();
  db.delete(bookLemmas).where(inArray(bookLemmas.lemmaId, lemmaIds)).run();
  db.delete(wordForms).where(inArray(wordForms.lemmaId, lemmaIds)).run();
  db.delete(lemmas).where(eq(lemmas.packageId, packageId)).run();
  db.delete(ankiPackages).where(eq(ankiPackages.id, packageId)).run();
}

// ── Single lemma deletion ──────────────────────────────────────────────────

/** Delete a single lemma + all associated data (forms, card, reviews, book links). Works on any lemma. */
export function deleteLemma(lemmaId: number): boolean {
  const lemma = db.select().from(lemmas).where(eq(lemmas.id, lemmaId)).get();
  if (!lemma) return false;

  db.delete(reviews)
    .where(sql`${reviews.cardType} = 'vocab' AND ${reviews.cardId} = ${String(lemmaId)}`)
    .run();
  db.delete(vocabCards).where(eq(vocabCards.lemmaId, lemmaId)).run();
  db.delete(bookLemmas).where(eq(bookLemmas.lemmaId, lemmaId)).run();
  db.delete(wordForms).where(eq(wordForms.lemmaId, lemmaId)).run();
  db.delete(lemmas).where(eq(lemmas.id, lemmaId)).run();

  // Decrement the package word count if this belonged to one
  if (lemma.packageId) {
    db.update(ankiPackages)
      .set({ wordCount: sql`max(0, ${ankiPackages.wordCount} - 1)` })
      .where(eq(ankiPackages.id, lemma.packageId))
      .run();
  }

  return true;
}

// ── Duplicate detection ────────────────────────────────────────────────────

export type DuplicateGroup = {
  form: string;
  lemmas: { id: number; lemma: string; glossDe: string; isSeed: boolean }[];
};

/** Find lemmas whose normalised forms collide (same surface form maps to multiple lemma ids). */
export function findDuplicates(): DuplicateGroup[] {
  const rows = db
    .select({
      form: wordForms.form,
      lemmaId: wordForms.lemmaId,
      lemma: lemmas.lemma,
      glossDe: lemmas.glossDe,
    })
    .from(wordForms)
    .innerJoin(lemmas, eq(wordForms.lemmaId, lemmas.id))
    .all();

  // Group by normalised form
  const byForm = new Map<string, { id: number; lemma: string; glossDe: string }[]>();
  for (const r of rows) {
    const key = normalizeLatin(r.form);
    if (!key) continue;
    if (!byForm.has(key)) byForm.set(key, []);
    const group = byForm.get(key)!;
    if (!group.some((g) => g.id === r.lemmaId)) {
      group.push({ id: r.lemmaId, lemma: r.lemma, glossDe: r.glossDe });
    }
  }

  // Keep only groups with >1 lemma
  const duplicates: DuplicateGroup[] = [];
  for (const [form, lemmasList] of byForm) {
    if (lemmasList.length > 1) {
      duplicates.push({
        form,
        lemmas: lemmasList.map((l) => ({
          ...l,
          isSeed: l.id < IMPORT_ID_BASE,
        })),
      });
    }
  }

  return duplicates;
}
