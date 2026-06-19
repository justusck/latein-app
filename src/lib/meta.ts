/**
 * Course-independent key/value store, backed by its OWN SQLite file (`meta.db`).
 *
 * The main `db` (client.ts) points at the *active course's* database, so its
 * `kv` table holds per-course state (xp, streak, pronunciation, …). A handful
 * of settings must be shared across courses — the selected course itself, the
 * theme mode, the UI language and onboarding status. Those live here.
 *
 * Opened + migrated synchronously at module load so `metaGet` is safe to call
 * from any other module's top level (e.g. theme.ts resolving the active course).
 */
import { openDatabaseSync } from 'expo-sqlite';

const meta = openDatabaseSync('meta.db');
meta.execSync(`CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);

export function metaGet(key: string): string | null {
  const row = meta.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row ? row.value : null;
}

export function metaSet(key: string, value: string): void {
  meta.runSync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export function metaGetNum(key: string, fallback = 0): number {
  const v = metaGet(key);
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
