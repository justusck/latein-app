import { asc, count, eq, isNull, lte, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { lemmas, reviews, vocabCards } from '@/db/schema';
import type { Lemma } from '@/db/schema';
import {
  AppRating,
  type AppRatingValue,
  type FsrsFields,
  KNOWN_STABILITY_DAYS,
  newCardFields,
  review,
} from '@/lib/fsrs';

export type StudyCard = {
  lemma: Lemma;
  fsrs: FsrsFields;
  isNew: boolean;
};

/**
 * Slim list shape for the vocab tab. Deliberately NOT the full `Lemma` row:
 * the list renders ~5300 entries, so we only marshal the columns it shows
 * and precompute a lowercase search haystack once per load (instead of
 * lowercasing three fields per row on every keystroke).
 */
export type LemmaWithFullStatus = {
  id: number;
  lemma: string;
  pos: string;
  principalParts: string | null;
  glossDe: string;
  freqRank: number | null;
  status: 'new' | 'introduced' | 'known';
  due: number | null; // epoch ms, null when no vocabCard exists yet
  lastReview: number | null;
  searchKey: string;
};

/** All lemmas joined with FSRS card state, ordered by frequency rank. */
export function getAllLemmasWithStatus(): LemmaWithFullStatus[] {
  const rows = db
    .select({
      id: lemmas.id,
      lemma: lemmas.lemma,
      pos: lemmas.pos,
      principalParts: lemmas.principalParts,
      glossDe: lemmas.glossDe,
      freqRank: lemmas.freqRank,
      stability: vocabCards.stability,
      due: vocabCards.due,
      lastReview: vocabCards.lastReview,
    })
    .from(lemmas)
    .leftJoin(vocabCards, eq(lemmas.id, vocabCards.lemmaId))
    .orderBy(asc(lemmas.freqRank))
    .all();
  return rows.map((r) => ({
    id: r.id,
    lemma: r.lemma,
    pos: r.pos,
    principalParts: r.principalParts,
    glossDe: r.glossDe,
    freqRank: r.freqRank,
    status:
      r.stability == null
        ? ('new' as const)
        : r.stability >= KNOWN_STABILITY_DAYS
          ? ('known' as const)
          : ('introduced' as const),
    due: r.due ?? null,
    lastReview: r.lastReview ?? null,
    searchKey: `${r.lemma}\n${r.glossDe}\n${r.principalParts ?? ''}`.toLowerCase(),
  }));
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type VocabStats = {
  dueCount: number;
  totalIntroduced: number;
  totalLemmas: number;
  knownCount: number;
  newIntroducedToday: number;
  newRemainingToday: number;
  availableNew: number;
};

export function getVocabStats(dailyGoalNew: number): VocabStats {
  const now = Date.now();
  const dueCount = db
    .select({ c: count() })
    .from(vocabCards)
    .where(lte(vocabCards.due, now))
    .get()!.c;
  const totalIntroduced = db.select({ c: count() }).from(vocabCards).get()!.c;
  const totalLemmas = db.select({ c: count() }).from(lemmas).get()!.c;
  const knownCount = db
    .select({ c: count() })
    .from(vocabCards)
    .where(sql`${vocabCards.stability} >= ${KNOWN_STABILITY_DAYS}`)
    .get()!.c;
  const newIntroducedToday = db
    .select({ c: count() })
    .from(vocabCards)
    .where(sql`${vocabCards.introducedAt} >= ${startOfToday()}`)
    .get()!.c;

  const availableNew = totalLemmas - totalIntroduced;
  const newRemainingToday = Math.max(0, Math.min(dailyGoalNew - newIntroducedToday, availableNew));

  return {
    dueCount,
    totalIntroduced,
    totalLemmas,
    knownCount,
    newIntroducedToday,
    newRemainingToday,
    availableNew,
  };
}

/** Create card rows for the next `n` unseen lemmas (frequency order). */
export function introduceNewCards(n: number): number {
  if (n <= 0) return 0;
  const fresh = db
    .select()
    .from(lemmas)
    .leftJoin(vocabCards, eq(lemmas.id, vocabCards.lemmaId))
    .where(isNull(vocabCards.lemmaId))
    .orderBy(asc(lemmas.freqRank))
    .limit(n)
    .all()
    .map((r) => r.lemmas);

  const now = Date.now();
  for (const l of fresh) {
    const f = newCardFields(now);
    db.insert(vocabCards)
      .values({
        lemmaId: l.id,
        due: f.due,
        stability: f.stability,
        difficulty: f.difficulty,
        elapsedDays: f.elapsedDays,
        scheduledDays: f.scheduledDays,
        reps: f.reps,
        lapses: f.lapses,
        state: f.state,
        lastReview: f.lastReview,
        introducedAt: now,
      })
      .onConflictDoNothing()
      .run();
  }
  return fresh.length;
}

/** Random German glosses for multiple-choice distractors. */
export function getDistractorGlosses(excludeLemmaId: number, n: number): string[] {
  return db
    .select({ g: lemmas.glossDe })
    .from(lemmas)
    .where(sql`${lemmas.id} <> ${excludeLemmaId}`)
    .orderBy(sql`random()`)
    .limit(n)
    .all()
    .map((r) => r.g);
}

function shuffleInPlace<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Due cards for a session. The POOL is picked deterministically (most overdue
 * first, so nothing starves), but the PRESENTATION order is shuffled every
 * session, with new cards spread evenly between reviews instead of clumping.
 */
export function getDueCards(limit = 40): StudyCard[] {
  const now = Date.now();
  const pool = db
    .select()
    .from(vocabCards)
    .innerJoin(lemmas, eq(vocabCards.lemmaId, lemmas.id))
    .where(lte(vocabCards.due, now))
    .orderBy(asc(vocabCards.due))
    .limit(limit)
    .all()
    .map((r) => ({
      lemma: r.lemmas,
      isNew: r.vocab_cards.reps === 0,
      fsrs: {
        due: r.vocab_cards.due,
        stability: r.vocab_cards.stability,
        difficulty: r.vocab_cards.difficulty,
        elapsedDays: r.vocab_cards.elapsedDays,
        scheduledDays: r.vocab_cards.scheduledDays,
        reps: r.vocab_cards.reps,
        lapses: r.vocab_cards.lapses,
        state: r.vocab_cards.state,
        lastReview: r.vocab_cards.lastReview,
      },
    }));

  const fresh = shuffleInPlace(pool.filter((c) => c.isNew));
  const reviewsDue = shuffleInPlace(pool.filter((c) => !c.isNew));
  if (fresh.length === 0) return reviewsDue;
  if (reviewsDue.length === 0) return fresh;

  // Interleave: distribute new cards at even intervals among the reviews.
  const out = [...reviewsDue];
  const gap = (reviewsDue.length + 1) / (fresh.length + 1);
  fresh.forEach((card, i) => {
    const pos = Math.min(out.length, Math.round(gap * (i + 1)) + i);
    out.splice(pos, 0, card);
  });
  return out;
}

/** Random already-introduced cards for free practice (ignores due date). */
export function getFreeReviewCards(limit = 40): StudyCard[] {
  return db
    .select()
    .from(vocabCards)
    .innerJoin(lemmas, eq(vocabCards.lemmaId, lemmas.id))
    .where(sql`${vocabCards.reps} > 0`)
    .orderBy(sql`random()`)
    .limit(limit)
    .all()
    .map((r) => ({
      lemma: r.lemmas,
      isNew: false,
      fsrs: {
        due: r.vocab_cards.due,
        stability: r.vocab_cards.stability,
        difficulty: r.vocab_cards.difficulty,
        elapsedDays: r.vocab_cards.elapsedDays,
        scheduledDays: r.vocab_cards.scheduledDays,
        reps: r.vocab_cards.reps,
        lapses: r.vocab_cards.lapses,
        state: r.vocab_cards.state,
        lastReview: r.vocab_cards.lastReview,
      },
    }));
}

/** Apply a rating: reschedule, persist, log the review. */
export function answerCard(lemmaId: number, fsrs: FsrsFields, rating: AppRatingValue, retention: number): FsrsFields {
  const next = review(fsrs, rating, retention);
  db.update(vocabCards)
    .set({
      due: next.due,
      stability: next.stability,
      difficulty: next.difficulty,
      elapsedDays: next.elapsedDays,
      scheduledDays: next.scheduledDays,
      reps: next.reps,
      lapses: next.lapses,
      state: next.state,
      lastReview: next.lastReview,
    })
    .where(eq(vocabCards.lemmaId, lemmaId))
    .run();
  db.insert(reviews)
    .values({
      cardId: String(lemmaId),
      cardType: 'vocab',
      rating,
      reviewedAt: Date.now(),
      elapsedMs: 0,
    })
    .run();
  return next;
}

export type DayCount = { day: string; count: number };

export type ProfileStats = {
  totalReviews: number;
  todayReviews: number;
  accuracy: number; // 0..1
  studyDays: number;
  dayCounts: DayCount[]; // last 90 days, each with review count
};

export function getProfileStats(): ProfileStats {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const totalReviews = db.select({ c: count() }).from(reviews).get()!.c;
  const todayReviews = db
    .select({ c: count() })
    .from(reviews)
    .where(sql`${reviews.reviewedAt} >= ${todayStart.getTime()}`)
    .get()!.c;
  const goodCount = db
    .select({ c: count() })
    .from(reviews)
    .where(sql`${reviews.rating} >= 3`)
    .get()!.c;
  const accuracy = totalReviews > 0 ? goodCount / totalReviews : 0;

  // Distinct study days (all time)
  const studyDaysRows = db
    .select({ d: sql<string>`date(${reviews.reviewedAt} / 1000, 'unixepoch')` })
    .from(reviews)
    .groupBy(sql`date(${reviews.reviewedAt} / 1000, 'unixepoch')`)
    .all();
  const studyDays = studyDaysRows.length;

  // Last 90 days with per-day review counts
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const recentCountRows = db
    .select({
      d: sql<string>`date(${reviews.reviewedAt} / 1000, 'unixepoch')`,
      c: count(),
    })
    .from(reviews)
    .where(sql`${reviews.reviewedAt} >= ${ninetyDaysAgo.getTime()}`)
    .groupBy(sql`date(${reviews.reviewedAt} / 1000, 'unixepoch')`)
    .all();
  const countByDay = new Map<string, number>();
  for (const r of recentCountRows) countByDay.set(r.d, r.c);

  const dayCounts: DayCount[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dayCounts.push({ day: key, count: countByDay.get(key) ?? 0 });
  }
  return { totalReviews, todayReviews, accuracy, studyDays, dayCounts };
}

export { AppRating };
export type { AppRatingValue };
