import {
  createEmptyCard,
  FSRS,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs';

/**
 * Thin wrapper around ts-fsrs. We persist only the core scheduling fields in
 * SQLite and reconstruct a full ts-fsrs Card on demand (so we stay compatible
 * across ts-fsrs minor versions that add internal card fields).
 */

export type FsrsFields = {
  due: number; // epoch ms
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number; // 0 New | 1 Learning | 2 Review | 3 Relearning
  lastReview: number | null;
};

export const AppRating = { Again: 1, Hard: 2, Good: 3, Easy: 4 } as const;
export type AppRatingValue = (typeof AppRating)[keyof typeof AppRating];

function scheduler(retention: number): FSRS {
  return new FSRS(generatorParameters({ request_retention: retention, enable_fuzz: true }));
}

function rowToCard(f: FsrsFields): Card {
  const c = createEmptyCard(new Date());
  c.due = new Date(f.due);
  c.stability = f.stability;
  c.difficulty = f.difficulty;
  c.elapsed_days = f.elapsedDays;
  c.scheduled_days = f.scheduledDays;
  c.reps = f.reps;
  c.lapses = f.lapses;
  c.state = f.state as State;
  c.last_review = f.lastReview ? new Date(f.lastReview) : undefined;
  return c;
}

function cardToRow(c: Card): FsrsFields {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as number,
    lastReview: c.last_review ? new Date(c.last_review).getTime() : null,
  };
}

/** Fresh card, due immediately. */
export function newCardFields(now = Date.now()): FsrsFields {
  return cardToRow(createEmptyCard(new Date(now)));
}

/** Apply a review rating and return the updated scheduling fields. */
export function review(
  fields: FsrsFields,
  rating: AppRatingValue,
  retention: number,
  now = new Date(),
): FsrsFields {
  const result = scheduler(retention).next(rowToCard(fields), now, rating as unknown as Grade);
  return cardToRow(result.card);
}

/** Human-readable next interval for each rating, for the answer buttons. */
export function intervalPreview(
  fields: FsrsFields,
  retention: number,
  now = new Date(),
): Record<AppRatingValue, string> {
  const log = scheduler(retention).repeat(rowToCard(fields), now);
  const fmt = (due: Date): string => {
    const mins = Math.round((due.getTime() - now.getTime()) / 60000);
    if (mins < 60) return `${Math.max(1, mins)} min`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} d`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months} Mon`;
    return `${(days / 365).toFixed(1)} J`;
  };
  return {
    [AppRating.Again]: fmt(log[Rating.Again].card.due),
    [AppRating.Hard]: fmt(log[Rating.Hard].card.due),
    [AppRating.Good]: fmt(log[Rating.Good].card.due),
    [AppRating.Easy]: fmt(log[Rating.Easy].card.due),
  } as Record<AppRatingValue, string>;
}

/** A lemma counts as "known" once its memory is stable enough. */
export const KNOWN_STABILITY_DAYS = 14;
