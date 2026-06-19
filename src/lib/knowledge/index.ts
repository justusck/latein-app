import { eq, gte } from 'drizzle-orm';

import { getActiveCourse } from '@/courses';
import { db } from '@/db/client';
import {
  bookLemmas,
  books,
  grammarProgress,
  grammarTopics,
  lemmas,
  vocabCards,
} from '@/db/schema';
import { KNOWN_STABILITY_DAYS } from '@/lib/fsrs';
import type { Book, GrammarTopic, Lemma } from '@/db/schema';

const MASTERED_STARS = 2;

/** Lemma ids the learner has committed to memory (stable enough). */
export function getKnownLemmaIds(): Set<number> {
  const rows = db
    .select({ id: vocabCards.lemmaId })
    .from(vocabCards)
    .where(gte(vocabCards.stability, KNOWN_STABILITY_DAYS))
    .all();
  return new Set(rows.map((r) => r.id));
}

/** Full lemma records the learner knows (for the AI allowed-vocabulary list). */
export function getKnownLemmas(): Lemma[] {
  return db
    .select()
    .from(lemmas)
    .innerJoin(vocabCards, eq(lemmas.id, vocabCards.lemmaId))
    .where(gte(vocabCards.stability, KNOWN_STABILITY_DAYS))
    .all()
    .map((r) => r.lemmas);
}

/** Grammar topics the learner has mastered (≥ 2 stars). */
export function getMasteredGrammar(): GrammarTopic[] {
  return db
    .select()
    .from(grammarTopics)
    .innerJoin(grammarProgress, eq(grammarTopics.id, grammarProgress.topicId))
    .where(gte(grammarProgress.stars, MASTERED_STARS))
    .orderBy(grammarTopics.orderIndex)
    .all()
    .map((r) => r.grammar_topics);
}

export type BookCoverage = {
  book: Book;
  knownLemmas: number;
  uniqueLemmas: number;
  ratio: number; // 0..1 share of the running text the learner can read (token coverage)
  unlocked: boolean;
};

export const UNLOCK_THRESHOLD = 0.9;

/** Coverage for every book against the current known-vocabulary set. */
export function getBooksWithCoverage(): BookCoverage[] {
  const known = getKnownLemmaIds();
  const allBooks = db.select().from(books).orderBy(books.levelScore).all();
  return allBooks.map((book) => coverageFor(book, known));
}

export function coverageFor(book: Book, known = getKnownLemmaIds()): BookCoverage {
  const rows = db
    .select({ lemmaId: bookLemmas.lemmaId, count: bookLemmas.count })
    .from(bookLemmas)
    .where(eq(bookLemmas.bookId, book.id))
    .all();
  let knownLemmas = 0;
  let knownTokens = 0;
  for (const r of rows) {
    if (known.has(r.lemmaId)) {
      knownLemmas += 1;
      knownTokens += r.count;
    }
  }
  const total = book.totalTokens || 1;
  const ratio = knownTokens / total;
  return {
    book,
    knownLemmas,
    uniqueLemmas: book.uniqueLemmas || rows.length,
    ratio,
    unlocked: ratio >= UNLOCK_THRESHOLD,
  };
}

/**
 * Compact knowledge summary injected into the AI system prompt so responses
 * stay within the learner's known vocabulary and grammar.
 */
export function buildKnowledgeContext(): {
  knownWords: string[];
  masteredGrammar: string[];
  summary: string;
} {
  const knownWords = getKnownLemmas().map((l) => `${l.lemma} (${l.glossDe})`);
  const masteredGrammarTitles = getMasteredGrammar().map((t) => t.title);

  const wordsForLabels = knownWords.length
    ? knownWords
    : [];
  const grammarForLabels = masteredGrammarTitles.length
    ? masteredGrammarTitles
    : [];

  const summary = getActiveCourse().ai.knowledgeLabels(wordsForLabels, grammarForLabels);

  return { knownWords, masteredGrammar: masteredGrammarTitles, summary };
}
