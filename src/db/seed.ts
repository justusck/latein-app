import { eq, inArray, lt, sql } from 'drizzle-orm';

import { SEED_GRAMMAR } from '@/data/grammar';
import { SEED_SAYINGS } from '@/data/sayings';
import { SEED_TEXTS } from '@/data/texts';
import { SEED_VOCAB } from '@/data/vocab';
import { normalizeLatin, tokenizeLatin } from '@/lib/latin/normalize';
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
const SEED_VERSION = 6;

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

/** Build the canonical form → lemmaId map from the seed vocab. */
function buildFormMap(): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of SEED_VOCAB) {
    const forms = new Set<string>([normalizeLatin(v.lemma), ...(v.forms ?? []).map(normalizeLatin)]);
    for (const f of forms) {
      if (f && !map.has(f)) map.set(f, v.id);
    }
  }
  return map;
}

function seedContent(formMap: Map<string, number>): void {
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
  const lemmaRows = SEED_VOCAB.map((v) => ({
    id: v.id,
    lemma: v.lemma,
    pos: v.pos,
    principalParts: v.principalParts ?? null,
    info: v.info ?? null,
    glossDe: v.glossDe,
    glossEn: v.glossEn ?? null,
    freqRank: v.freqRank,
    freqGroup: v.freqGroup,
    semanticGroup: v.semanticGroup ?? null,
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
      SEED_GRAMMAR.map((t, i) => ({
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

  const cardRows = SEED_GRAMMAR.flatMap((t) =>
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
      SEED_GRAMMAR.map((t) => ({
        topicId: t.id,
        unlocked: t.prereqs.length === 0,
        stars: 0,
      })),
    )
    .onConflictDoNothing()
    .run();

  // Latin sayings
  db.delete(sayings).run();
  if (SEED_SAYINGS.length) {
    db.insert(sayings)
      .values(SEED_SAYINGS.map((s) => ({ id: s.id, latin: s.latin, german: s.german, source: s.source || null })))
      .run();
  }

  // Books + precomputed coverage
  const now = Date.now();
  for (const b of SEED_TEXTS) {
    const tokens = tokenizeLatin(b.body).filter((t) => t.isWord && t.key);
    const counts = new Map<number, number>();
    for (const t of tokens) {
      const lemmaId = formMap.get(t.key);
      if (lemmaId != null) counts.set(lemmaId, (counts.get(lemmaId) ?? 0) + 1);
    }
    db.insert(books)
      .values({
        id: b.id,
        title: b.title,
        author: b.author ?? null,
        source: b.source ?? null,
        license: b.license ?? null,
        level: b.level,
        levelScore: b.levelScore,
        totalTokens: tokens.length,
        uniqueLemmas: counts.size,
        body: b.body,
        builtin: true,
        addedAt: now,
      })
      .run();
    const rows = [...counts.entries()].map(([lemmaId, count]) => ({ bookId: b.id, lemmaId, count }));
    if (rows.length) db.insert(bookLemmas).values(rows).run();
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
  db.insert(kv)
    .values({ key: 'seedVersion', value: String(SEED_VERSION) })
    .onConflictDoUpdate({ target: kv.key, set: { value: String(SEED_VERSION) } })
    .run();
}
