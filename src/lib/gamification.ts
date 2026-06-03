import { AppRating, type AppRatingValue } from '@/lib/fsrs';

/** Pure XP / level / rank maths. No I/O. */

export type LevelInfo = {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number; // 0..1
};

/** Cumulative XP curve: each level costs ~25% more than the last. */
export function levelForXp(totalXp: number): LevelInfo {
  let level = 1;
  let need = 100;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = Math.round(need * 1.25);
  }
  return { level, xpIntoLevel: remaining, xpForNext: need, progress: remaining / need };
}

export type Rank = { name: string; latin: string; icon: string };

const RANKS: { minLevel: number; rank: Rank }[] = [
  { minLevel: 1, rank: { name: 'Rekrut', latin: 'Tīrō', icon: 'leaf' } },
  { minLevel: 3, rank: { name: 'Schüler', latin: 'Discipulus', icon: 'school' } },
  { minLevel: 6, rank: { name: 'Soldat', latin: 'Mīles', icon: 'shield-half' } },
  { minLevel: 10, rank: { name: 'Zenturio', latin: 'Centuriō', icon: 'ribbon' } },
  { minLevel: 15, rank: { name: 'Legat', latin: 'Lēgātus', icon: 'flag' } },
  { minLevel: 22, rank: { name: 'Konsul', latin: 'Cōnsul', icon: 'star' } },
  { minLevel: 30, rank: { name: 'Imperator', latin: 'Imperātor', icon: 'trophy' } },
];

export function rankForLevel(level: number): Rank {
  let current = RANKS[0].rank;
  for (const r of RANKS) if (level >= r.minLevel) current = r.rank;
  return current;
}

/** XP reward for a vocabulary review by rating. */
export function xpForReview(rating: AppRatingValue): number {
  switch (rating) {
    case AppRating.Again:
      return 2;
    case AppRating.Hard:
      return 6;
    case AppRating.Good:
      return 10;
    case AppRating.Easy:
      return 8; // slightly less than Good to discourage over-easy spam
    default:
      return 5;
  }
}

export const XP_GRAMMAR_CORRECT = 12;
export const XP_GRAMMAR_WRONG = 3;
export const XP_LESSON_COMPLETE = 25;
export const XP_AI_TURN = 8;
export const XP_READ_TEXT = 30;

/** Local YYYY-MM-DD day key for streak tracking. */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isYesterday(prev: string, today = dayKey()): boolean {
  if (!prev) return false;
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  return dayKey(d) === prev;
}
