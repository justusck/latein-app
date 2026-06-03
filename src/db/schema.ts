import { sql } from 'drizzle-orm';
import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

/**
 * Latina local database schema (offline-first, single user).
 * Content tables (lemmas, grammar, books) are seeded from bundled JSON.
 * Progress tables (cards, reviews, kv, achievements, ai*) are written at runtime.
 */

// --- Vocabulary content -----------------------------------------------------

export const lemmas = sqliteTable('lemmas', {
  id: integer('id').primaryKey(),
  lemma: text('lemma').notNull(),
  pos: text('pos').notNull(), // noun | verb | adj | adv | prep | conj | pron | ...
  principalParts: text('principal_parts'), // e.g. "amō, amāre, amāvī, amātum"
  info: text('info'), // declension/conjugation/gender notes
  glossDe: text('gloss_de').notNull(),
  glossEn: text('gloss_en'),
  freqRank: integer('freq_rank'),
  freqGroup: integer('freq_group'), // 1..N portions, ascending difficulty
  semanticGroup: text('semantic_group'),
});

// Surface form -> lemma, for tap-to-gloss and book coverage matching.
export const wordForms = sqliteTable(
  'word_forms',
  {
    form: text('form').notNull(),
    lemmaId: integer('lemma_id')
      .notNull()
      .references(() => lemmas.id),
  },
  (t) => [primaryKey({ columns: [t.form, t.lemmaId] })],
);

// FSRS scheduling state per vocabulary lemma.
export const vocabCards = sqliteTable('vocab_cards', {
  lemmaId: integer('lemma_id')
    .primaryKey()
    .references(() => lemmas.id),
  // FSRS card fields
  due: integer('due').notNull(), // epoch ms
  stability: real('stability').notNull().default(0),
  difficulty: real('difficulty').notNull().default(0),
  elapsedDays: real('elapsed_days').notNull().default(0),
  scheduledDays: real('scheduled_days').notNull().default(0),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  state: integer('state').notNull().default(0), // 0 New 1 Learning 2 Review 3 Relearning
  lastReview: integer('last_review'),
  introducedAt: integer('introduced_at').notNull(),
});

// --- Grammar content --------------------------------------------------------

export const grammarTopics = sqliteTable('grammar_topics', {
  id: text('id').primaryKey(), // slug
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  explanation: text('explanation').notNull(), // markdown-ish lesson body
  orderIndex: integer('order_index').notNull(),
  stage: text('stage').notNull(), // foundations | morphology | syntax | advanced
  prereqs: text('prereqs', { mode: 'json' }).$type<string[]>().notNull(),
});

export const grammarCards = sqliteTable('grammar_cards', {
  id: text('id').primaryKey(),
  topicId: text('topic_id')
    .notNull()
    .references(() => grammarTopics.id),
  kind: text('kind').notNull(), // mc | fill | form | match
  prompt: text('prompt').notNull(),
  answer: text('answer').notNull(),
  options: text('options', { mode: 'json' }).$type<string[]>(),
  explanation: text('explanation'),
  // FSRS state (same shape as vocab)
  due: integer('due').notNull().default(0),
  stability: real('stability').notNull().default(0),
  difficulty: real('difficulty').notNull().default(0),
  elapsedDays: real('elapsed_days').notNull().default(0),
  scheduledDays: real('scheduled_days').notNull().default(0),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  state: integer('state').notNull().default(0),
  lastReview: integer('last_review'),
});

export const grammarProgress = sqliteTable('grammar_progress', {
  topicId: text('topic_id')
    .primaryKey()
    .references(() => grammarTopics.id),
  unlocked: integer('unlocked', { mode: 'boolean' }).notNull().default(false),
  stars: integer('stars').notNull().default(0), // 0..3 mastery
  completedAt: integer('completed_at'),
});

// --- Reading library --------------------------------------------------------

export const books = sqliteTable('books', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author'),
  source: text('source'),
  license: text('license'),
  level: text('level').notNull(), // A0..C2-ish label
  levelScore: real('level_score').notNull(), // numeric difficulty for sorting
  totalTokens: integer('total_tokens').notNull().default(0),
  uniqueLemmas: integer('unique_lemmas').notNull().default(0),
  body: text('body').notNull(), // plain text
  builtin: integer('builtin', { mode: 'boolean' }).notNull().default(true),
  addedAt: integer('added_at').notNull(),
});

export const bookLemmas = sqliteTable(
  'book_lemmas',
  {
    bookId: text('book_id')
      .notNull()
      .references(() => books.id),
    lemmaId: integer('lemma_id')
      .notNull()
      .references(() => lemmas.id),
    count: integer('count').notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.lemmaId] })],
);

// --- Reviews log (for FSRS optimizer & stats) -------------------------------

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cardId: text('card_id').notNull(), // lemmaId (as text) or grammar card id
  cardType: text('card_type').notNull(), // vocab | grammar
  rating: integer('rating').notNull(), // 1 Again 2 Hard 3 Good 4 Easy
  reviewedAt: integer('reviewed_at').notNull(),
  elapsedMs: integer('elapsed_ms').notNull().default(0),
});

// --- Generic key/value for settings + gamification counters -----------------

export const kv = sqliteTable('kv', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  unlockedAt: integer('unlocked_at'),
});

// --- AI conversations -------------------------------------------------------

export const aiConversations = sqliteTable('ai_conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mode: text('mode').notNull(), // chat | roleplay | correction | speak
  title: text('title').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
});

export const aiMessages = sqliteTable('ai_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id')
    .notNull()
    .references(() => aiConversations.id),
  role: text('role').notNull(), // user | assistant
  content: text('content').notNull(),
  createdAt: integer('created_at').notNull(),
});

export type Lemma = typeof lemmas.$inferSelect;
export type VocabCard = typeof vocabCards.$inferSelect;
export type GrammarTopic = typeof grammarTopics.$inferSelect;
export type GrammarCard = typeof grammarCards.$inferSelect;
export type Book = typeof books.$inferSelect;
