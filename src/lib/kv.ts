import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { kv } from '@/db/schema';

/** Tiny typed accessor over the `kv` table (settings + counters). */
export function kvGet(key: string): string | null {
  const row = db.select().from(kv).where(eq(kv.key, key)).get();
  return row ? row.value : null;
}

export function kvSet(key: string, value: string): void {
  db.insert(kv).values({ key, value }).onConflictDoUpdate({ target: kv.key, set: { value } }).run();
}

export function kvGetNum(key: string, fallback = 0): number {
  const v = kvGet(key);
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function kvGetAll(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of db.select().from(kv).all()) out[row.key] = row.value;
  return out;
}
