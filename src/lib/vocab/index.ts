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

export type GroupProgress = {
  group: number;
  total: number;
  introduced: number;
  known: number;
};

/** Per frequency-group counts for the overview list. */
export function getGroupProgress(): GroupProgress[] {
  const rows = db
    .select({
      group: lemmas.freqGroup,
      total: count(lemmas.id),
      introduced: sql<number>`sum(case when ${vocabCards.lemmaId} is not null then 1 else 0 end)`,
      known: sql<number>`sum(case when ${vocabCards.stability} >= ${KNOWN_STABILITY_DAYS} then 1 else 0 end)`,
    })
    .from(lemmas)
    .leftJoin(vocabCards, eq(lemmas.id, vocabCards.lemmaId))
    .groupBy(lemmas.freqGroup)
    .orderBy(asc(lemmas.freqGroup))
    .all();
  return rows.map((r) => ({
    group: r.group ?? 0,
    total: Number(r.total),
    introduced: Number(r.introduced ?? 0),
    known: Number(r.known ?? 0),
  }));
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

/** Due cards (review + just-introduced new), learning states first. */
export function getDueCards(limit = 40): StudyCard[] {
  const now = Date.now();
  return db
    .select()
    .from(vocabCards)
    .innerJoin(lemmas, eq(vocabCards.lemmaId, lemmas.id))
    .where(lte(vocabCards.due, now))
    .orderBy(asc(vocabCards.state), asc(vocabCards.due))
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

export { AppRating };
export type { AppRatingValue };
