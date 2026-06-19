import { eq, inArray, lt, sql } from 'drizzle-orm';

import { getActiveCourse } from '@/courses';
import { bumpDictRev } from '@/lib/reading/html-cache';
import { IMPORT_ID_BASE } from '@/lib/vocab/import';

import { db, setForeignKeys } from './client';
import {
  bookLemmas,
  books,
  grammarCards,
  grammarProgress,
  grammarTopics,
  kv,
  lemmas,
  sayings,
  wordForms,
} from './schema';

/** Bump to re-seed bundled content (progress is preserved). */
const SEED_VERSION = 8;

const DEFAULT_KV: Record<string, string> = {
  xp: '0',
  coins: '0',
  streakCount: '0',
  streakLastDay: '',
  dailyGoalNew: '10', // new vocab cards introduced per day
  dailyGoalXp: '60',
  retention: '0.9', // FSRS desired retention
  pronunciation: 'classical', // classical | ecclesiastical
  onboarded: '0',
};

function currentSeedVersion(): number {
  try {
    const row = db.select().from(kv).where(sql`${kv.key} = 'seedVersion'`).get();
    return row ? Number(row.value) : 0;
  } catch {
    return 0;
  }
}

/** Build the canonical form → lemmaId map from the active course's seed vocab. */
function buildFormMap(): Map<string, number> {
  const map = new Map<string, number>();
  const { seed, text } = getActiveCourse();
  for (const v of seed.vocab) {
    for (const f of text.buildForms(v)) {
      if (f && !map.has(f)) map.set(f, v.id);
    }
  }
  return map;
}

function seedContent(formMap: Map<string, number>): void {
  const { seed } = getActiveCourse();
  // Clear ONLY bundled content (user imports & uploads are preserved). FK
  // enforcement is disabled so we can replace parent rows that progress
  // tables reference.
  setForeignKeys(false);
  const builtinBookIds = db
    .select({ id: books.id })
    .from(books)
    .where(eq(books.builtin, true))
    .all()
    .map((r) => r.id);
  if (builtinBookIds.length) {
    db.delete(bookLemmas).where(inArray(bookLemmas.bookId, builtinBookIds)).run();
  }
  db.delete(books).where(eq(books.builtin, true)).run();
  db.delete(grammarCards).run();
  db.delete(grammarTopics).run();
  db.delete(wordForms).where(lt(wordForms.lemmaId, IMPORT_ID_BASE)).run();
  db.delete(lemmas).where(lt(lemmas.id, IMPORT_ID_BASE)).run();

  // Lemmas (chunked — the full dataset exceeds SQLite's variable limit)
  const lemmaRows = seed.vocab.map((v) => ({
    id: v.id,
    lemma: v.lemma,
    pos: v.pos,
    principalParts: v.principalParts ?? null,
    info: v.info ?? null,
    reading: v.reading ?? null,
    glossDe: v.glossDe,
    glossEn: v.glossEn ?? null,
    freqRank: v.freqRank,
  }));
  for (let i = 0; i < lemmaRows.length; i += 200) {
    db.insert(lemmas).values(lemmaRows.slice(i, i + 200)).run();
  }

  // Word forms
  const formRows: { form: string; lemmaId: number }[] = [];
  for (const [form, lemmaId] of formMap) formRows.push({ form, lemmaId });
  // chunk to stay well under SQLite's variable limit
  for (let i = 0; i < formRows.length; i += 200) {
    db.insert(wordForms).values(formRows.slice(i, i + 200)).onConflictDoNothing().run();
  }

  // Grammar topics + cards + initial progress
  db.insert(grammarTopics)
    .values(
      seed.grammar.map((t, i) => ({
        id: t.id,
        title: t.title,
        summary: t.summary,
        explanation: t.explanation,
        orderIndex: i,
        stage: t.stage,
        prereqs: t.prereqs,
      })),
    )
    .run();

  const cardRows = seed.grammar.flatMap((t) =>
    t.cards.map((c) => ({
      id: c.id,
      topicId: t.id,
      kind: c.kind,
      prompt: c.prompt,
      answer: c.answer,
      options: c.options ?? null,
      explanation: c.explanation ?? null,
      due: 0,
    })),
  );
  if (cardRows.length) db.insert(grammarCards).values(cardRows).run();

  // Unlock topics whose prerequisites are empty; keep existing progress rows.
  db.insert(grammarProgress)
    .values(
      seed.grammar.map((t) => ({
        topicId: t.id,
        unlocked: t.prereqs.length === 0,
        stars: 0,
      })),
    )
    .onConflictDoNothing()
    .run();

  // Sayings (Latin proverbs / Japanese ことわざ — `latin` holds the target text)
  db.delete(sayings).run();
  if (seed.sayings.length) {
    db.insert(sayings)
      .values(seed.sayings.map((s) => ({ id: s.id, latin: s.latin, german: s.german, source: s.source || null })))
      .run();
  }




  setForeignKeys(true);
}

function seedDefaults(): void {
  for (const [key, value] of Object.entries(DEFAULT_KV)) {
    db.insert(kv).values({ key, value }).onConflictDoNothing().run();
  }
}

/** Seed bundled content + defaults. Idempotent; re-runs only on version bump. */
export function seedDatabase(): void {
  seedDefaults();
  if (currentSeedVersion() >= SEED_VERSION) return;
  const formMap = buildFormMap();
  seedContent(formMap);
  bumpDictRev(); // word_forms were rebuilt → cached reader documents are stale
  db.insert(kv)
    .values({ key: 'seedVersion', value: String(SEED_VERSION) })
    .onConflictDoUpdate({ target: kv.key, set: { value: String(SEED_VERSION) } })
    .run();
}
