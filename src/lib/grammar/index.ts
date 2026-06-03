import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { grammarCards, grammarProgress, grammarTopics, reviews } from '@/db/schema';
import type { GrammarCard, GrammarTopic } from '@/db/schema';

export type TopicWithProgress = {
  topic: GrammarTopic;
  stars: number;
  unlocked: boolean;
  completed: boolean;
};

/** All topics with computed unlock state (prereqs need ≥ 1 star). */
export function getTopicsWithProgress(): TopicWithProgress[] {
  const topics = db.select().from(grammarTopics).orderBy(asc(grammarTopics.orderIndex)).all();
  const progressRows = db.select().from(grammarProgress).all();
  const starMap = new Map(progressRows.map((p) => [p.topicId, p.stars]));
  const completedMap = new Map(progressRows.map((p) => [p.topicId, p.completedAt != null]));

  return topics.map((topic) => {
    const prereqs = topic.prereqs ?? [];
    const unlocked = prereqs.length === 0 || prereqs.every((p) => (starMap.get(p) ?? 0) >= 1);
    return {
      topic,
      stars: starMap.get(topic.id) ?? 0,
      unlocked,
      completed: completedMap.get(topic.id) ?? false,
    };
  });
}

export function getTopic(id: string): { topic: GrammarTopic; cards: GrammarCard[] } | null {
  const topic = db.select().from(grammarTopics).where(eq(grammarTopics.id, id)).get();
  if (!topic) return null;
  const cards = db.select().from(grammarCards).where(eq(grammarCards.topicId, id)).all();
  return { topic, cards };
}

function starsForAccuracy(correct: number, total: number): number {
  if (total === 0) return 1; // lesson with no drills → mark as read
  const acc = correct / total;
  if (acc >= 0.9) return 3;
  if (acc >= 0.7) return 2;
  return 1;
}

/** Record a finished drill: log per-card reviews and set topic stars. */
export function completeTopic(id: string, correct: number, total: number): number {
  const stars = starsForAccuracy(correct, total);
  const existing = db.select().from(grammarProgress).where(eq(grammarProgress.topicId, id)).get();
  const keepStars = Math.max(stars, existing?.stars ?? 0);
  db.insert(grammarProgress)
    .values({ topicId: id, unlocked: true, stars: keepStars, completedAt: Date.now() })
    .onConflictDoUpdate({
      target: grammarProgress.topicId,
      set: { stars: keepStars, completedAt: Date.now(), unlocked: true },
    })
    .run();
  return keepStars;
}

/** Log a single grammar drill answer (for stats / future spaced review). */
export function logGrammarAnswer(cardId: string, correct: boolean): void {
  db.insert(reviews)
    .values({
      cardId,
      cardType: 'grammar',
      rating: correct ? 3 : 1,
      reviewedAt: Date.now(),
      elapsedMs: 0,
    })
    .run();
}
