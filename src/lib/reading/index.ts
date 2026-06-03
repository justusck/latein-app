import { eq, gte } from 'drizzle-orm';

import { db } from '@/db/client';
import { bookLemmas, books, lemmas, vocabCards, wordForms } from '@/db/schema';
import type { Book, Lemma } from '@/db/schema';
import { KNOWN_STABILITY_DAYS, newCardFields } from '@/lib/fsrs';
import { tokenizeLatin } from '@/lib/latin/normalize';

/** In-memory form → lemmaId map (the seeded table is small). */
function loadFormMap(): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of db.select().from(wordForms).all()) {
    if (!map.has(r.form)) map.set(r.form, r.lemmaId);
  }
  return map;
}

export function getBook(id: string): Book | null {
  return db.select().from(books).where(eq(books.id, id)).get() ?? null;
}

/** Look up the lemma behind a (already-normalised) surface form. */
export function glossForKey(key: string): Lemma | null {
  if (!key) return null;
  const row = db
    .select()
    .from(wordForms)
    .innerJoin(lemmas, eq(wordForms.lemmaId, lemmas.id))
    .where(eq(wordForms.form, key))
    .get();
  return row ? row.lemmas : null;
}

/**
 * Import an uploaded text: tokenise, map forms → lemmas via the bundled
 * Form→Lemma table, precompute coverage counts, and store the book.
 */
export function importBook(title: string, body: string, author = 'Eigener Upload'): string {
  const formMap = loadFormMap();
  const tokens = tokenizeLatin(body).filter((t) => t.isWord && t.key);
  const counts = new Map<number, number>();
  for (const t of tokens) {
    const lemmaId = formMap.get(t.key);
    if (lemmaId != null) counts.set(lemmaId, (counts.get(lemmaId) ?? 0) + 1);
  }

  // Difficulty heuristic: lower known-ratio + longer text ⇒ harder.
  const matchedTokens = [...counts.values()].reduce((a, b) => a + b, 0);
  const knownRatio = tokens.length ? matchedTokens / tokens.length : 0;
  const levelScore = Math.round((1 - knownRatio) * 8 + Math.min(2, tokens.length / 400) + 1);

  const id = `user-${Date.now()}`;
  db.insert(books)
    .values({
      id,
      title: title.trim() || 'Ohne Titel',
      author,
      source: 'Upload',
      license: 'privat',
      level: 'eigen',
      levelScore,
      totalTokens: tokens.length,
      uniqueLemmas: counts.size,
      body,
      builtin: false,
      addedAt: Date.now(),
    })
    .run();

  const rows = [...counts.entries()].map(([lemmaId, count]) => ({ bookId: id, lemmaId, count }));
  for (let i = 0; i < rows.length; i += 200) {
    db.insert(bookLemmas).values(rows.slice(i, i + 200)).onConflictDoNothing().run();
  }
  return id;
}

/** Normalised forms whose lemma is already mastered (for green highlighting). */
export function getKnownFormKeys(): Set<string> {
  const rows = db
    .select({ form: wordForms.form })
    .from(wordForms)
    .innerJoin(vocabCards, eq(wordForms.lemmaId, vocabCards.lemmaId))
    .where(gte(vocabCards.stability, KNOWN_STABILITY_DAYS))
    .all();
  return new Set(rows.map((r) => r.form));
}

/** All forms present in the bundled dictionary (tap-to-learn candidates). */
export function getDictFormKeys(): Set<string> {
  return new Set(db.select({ form: wordForms.form }).from(wordForms).all().map((r) => r.form));
}

/** Add a specific lemma to the vocabulary deck (if not already present). */
export function addLemmaToVocab(lemmaId: number): boolean {
  const exists = db.select().from(vocabCards).where(eq(vocabCards.lemmaId, lemmaId)).get();
  if (exists) return false;
  const f = newCardFields();
  db.insert(vocabCards)
    .values({
      lemmaId,
      due: f.due,
      stability: f.stability,
      difficulty: f.difficulty,
      elapsedDays: f.elapsedDays,
      scheduledDays: f.scheduledDays,
      reps: f.reps,
      lapses: f.lapses,
      state: f.state,
      lastReview: f.lastReview,
      introducedAt: Date.now(),
    })
    .run();
  return true;
}

export function deleteBook(id: string): void {
  db.delete(bookLemmas).where(eq(bookLemmas.bookId, id)).run();
  db.delete(books).where(eq(books.id, id)).run();
}
