import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { activeCourseId } from '@/courses/active';

import * as schema from './schema';

/**
 * Single shared SQLite connection for the ACTIVE course. Each course has its
 * own database file (full data isolation; switching courses reloads the app —
 * see store `setCourse`). `enableChangeListener` powers drizzle's
 * `useLiveQuery`, so the UI re-renders when the underlying tables change.
 *
 * File names mirror each course config's `dbFile` (latin.ts / japanese.ts).
 */
const DB_FILE: Record<string, string> = { la: 'latina.db', ja: 'nihongo.db' };
const expoDb = openDatabaseSync(DB_FILE[activeCourseId()] ?? 'latina.db', { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });
export { schema };

/**
 * Runtime DDL. Kept in sync with `schema.ts` by hand (single-user, fixed
 * schema — no migration tooling needed at runtime). `IF NOT EXISTS` makes
 * this idempotent on every launch.
 */
const DDL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS lemmas (
  id INTEGER PRIMARY KEY,
  lemma TEXT NOT NULL,
  pos TEXT NOT NULL,
  principal_parts TEXT,
  info TEXT,
  reading TEXT,
  gloss_de TEXT NOT NULL,
  gloss_en TEXT,
  freq_rank INTEGER,
  freq_group INTEGER,
  semantic_group TEXT
);

CREATE TABLE IF NOT EXISTS anki_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  imported_at INTEGER NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS word_forms (
  form TEXT NOT NULL,
  lemma_id INTEGER NOT NULL REFERENCES lemmas(id),
  PRIMARY KEY (form, lemma_id)
);
CREATE INDEX IF NOT EXISTS idx_word_forms_form ON word_forms(form);

CREATE TABLE IF NOT EXISTS vocab_cards (
  lemma_id INTEGER PRIMARY KEY REFERENCES lemmas(id),
  due INTEGER NOT NULL,
  stability REAL NOT NULL DEFAULT 0,
  difficulty REAL NOT NULL DEFAULT 0,
  elapsed_days REAL NOT NULL DEFAULT 0,
  scheduled_days REAL NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  state INTEGER NOT NULL DEFAULT 0,
  last_review INTEGER,
  introduced_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vocab_due ON vocab_cards(due);

CREATE TABLE IF NOT EXISTS grammar_topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  explanation TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  stage TEXT NOT NULL,
  prereqs TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grammar_cards (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES grammar_topics(id),
  kind TEXT NOT NULL,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  options TEXT,
  explanation TEXT,
  due INTEGER NOT NULL DEFAULT 0,
  stability REAL NOT NULL DEFAULT 0,
  difficulty REAL NOT NULL DEFAULT 0,
  elapsed_days REAL NOT NULL DEFAULT 0,
  scheduled_days REAL NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  state INTEGER NOT NULL DEFAULT 0,
  last_review INTEGER
);

CREATE TABLE IF NOT EXISTS grammar_progress (
  topic_id TEXT PRIMARY KEY REFERENCES grammar_topics(id),
  unlocked INTEGER NOT NULL DEFAULT 0,
  stars INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  source TEXT,
  license TEXT,
  level TEXT NOT NULL,
  level_score REAL NOT NULL,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  unique_lemmas INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL DEFAULT '',
  chapters TEXT,
  file_path TEXT,
  builtin INTEGER NOT NULL DEFAULT 1,
  added_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS book_lemmas (
  book_id TEXT NOT NULL REFERENCES books(id),
  lemma_id INTEGER NOT NULL REFERENCES lemmas(id),
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (book_id, lemma_id)
);

CREATE TABLE IF NOT EXISTS sayings (
  id INTEGER PRIMARY KEY,
  latin TEXT NOT NULL,
  german TEXT NOT NULL,
  source TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id TEXT NOT NULL,
  card_type TEXT NOT NULL,
  rating INTEGER NOT NULL,
  reviewed_at INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  unlocked_at INTEGER
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mode TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  reasoning TEXT,
  created_at INTEGER NOT NULL
);
`;

let initialized = false;

/** Create all tables. Safe to call repeatedly. */
export function initDatabase(): void {
  if (initialized) return;
  expoDb.execSync(DDL);

  // Lightweight runtime migrations for existing installs.
  // ALTER TABLE … ADD COLUMN is a no-op in SQLite when the column already exists
  // (as of SQLite 3.35+), but older versions throw. Wrapping in a try keeps us safe.
  for (const sql of [
    `ALTER TABLE books ADD COLUMN chapters TEXT;`,
    `ALTER TABLE books ADD COLUMN file_path TEXT;`,
    `ALTER TABLE lemmas ADD COLUMN package_id INTEGER REFERENCES anki_packages(id);`,
    `ALTER TABLE lemmas ADD COLUMN reading TEXT;`,
    `ALTER TABLE ai_messages ADD COLUMN reasoning TEXT;`,
  ]) {
    try { expoDb.execSync(sql); } catch { /* column exists → skip */ }
  }

  initialized = true;
}

/** Toggle FK enforcement (used while re-seeding content tables). */
export function setForeignKeys(on: boolean): void {
  expoDb.execSync(`PRAGMA foreign_keys = ${on ? 'ON' : 'OFF'};`);
}
