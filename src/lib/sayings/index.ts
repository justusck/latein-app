import { eq } from 'drizzle-orm';
import { documentDirectory, writeAsStringAsync } from 'expo-file-system/legacy';

import { db } from '@/db/client';
import { sayings, wordForms } from '@/db/schema';
import { kvGet, kvSet } from '@/lib/kv';
import { getKnownLemmaIds } from '@/lib/knowledge';
import { wordKeys } from '@/lib/latin/normalize';

export type Saying = {
  id: number;
  latin: string;
  german: string;
  source: string | null;
};

const FALLBACK: Saying = {
  id: 0,
  latin: 'Carpe diem!',
  german: 'Nutze den Tag!',
  source: 'Horaz, Carmina I,11,8',
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Simple deterministic hash from a string → number in [0, 1). */
function hash01(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}

/** Score all sayings by how many of their words the learner knows. */
function scoreSayings(knownLemmas: Set<number>): { saying: Saying; coverage: number }[] {
  const all = db.select().from(sayings).all();
  return all.map((s) => {
    const keys = wordKeys(s.latin);
    if (keys.length === 0) return { saying: s, coverage: 0 };
    let known = 0;
    for (const key of keys) {
      const wf = db.select({ lemmaId: wordForms.lemmaId }).from(wordForms).where(eq(wordForms.form, key)).get();
      if (wf?.lemmaId != null && knownLemmas.has(wf.lemmaId)) known++;
    }
    return { saying: s, coverage: known / keys.length };
  });
}

/** Write the daily saying to a file the Android widget can read. */
function writeWidgetFile(s: Saying): void {
  try {
    const path = `${documentDirectory}daily_saying.json`;
    writeAsStringAsync(path, JSON.stringify({ latin: s.latin, german: s.german, source: s.source ?? '' }));
  } catch {
    // Widget will show default — non-critical
  }
}

/** Return the saying of the day, preferring known vocabulary. */
export function getDailySaying(): Saying {
  const day = todayKey();

  // Return cached saying if it's still today
  const cachedId = kvGet('dailySayingId');
  const cachedDay = kvGet('dailySayingDate');
  if (cachedDay === day && cachedId != null) {
    const s = db.select().from(sayings).where(eq(sayings.id, Number(cachedId))).get();
    if (s) return s;
  }

  // Score and select
  const known = getKnownLemmaIds();
  const scored = scoreSayings(known);

  if (scored.length === 0) return FALLBACK;

  // Weighted random: weight = 1 + coverage * 9 (range 1..10)
  const weights = scored.map((sc) => 1 + sc.coverage * 9);
  const total = weights.reduce((a, b) => a + b, 0);

  const seed = hash01(day);
  let target = seed * total;
  let picked = scored[0];

  for (let i = 0; i < scored.length; i++) {
    target -= weights[i];
    if (target <= 0) {
      picked = scored[i];
      break;
    }
  }

  if (!picked) return FALLBACK;

  // Cache for the day
  kvSet('dailySayingId', String(picked.saying.id));
  kvSet('dailySayingDate', day);

  // Write for widget
  writeWidgetFile(picked.saying);

  return picked.saying;
}
