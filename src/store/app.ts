import { create } from 'zustand';

import { type UiLang } from '@/constants/strings';
import { dayKey, isYesterday, levelForXp } from '@/lib/gamification';
import { kvGet, kvGetNum, kvSet } from '@/lib/kv';

export type Pronunciation = 'classical' | 'ecclesiastical';
export type { UiLang };

const COINS_PER_LEVEL = 5;

type AppState = {
  hydrated: boolean;
  xp: number;
  coins: number;
  streakCount: number;
  streakLastDay: string;
  dailyGoalNew: number;
  dailyGoalXp: number;
  retention: number;
  pronunciation: Pronunciation;
  uiLang: UiLang;

  hydrate: () => void;
  awardXp: (n: number) => { leveledUp: boolean; newLevel: number };
  addCoins: (n: number) => void;
  /** Mark today active; updates the streak. Returns the new streak length. */
  registerActivity: () => number;
  setRetention: (r: number) => void;
  setPronunciation: (p: Pronunciation) => void;
  setDailyGoalNew: (n: number) => void;
  setUiLang: (l: UiLang) => void;
};

export const useApp = create<AppState>((set, get) => ({
  hydrated: false,
  xp: 0,
  coins: 0,
  streakCount: 0,
  streakLastDay: '',
  dailyGoalNew: 10,
  dailyGoalXp: 60,
  retention: 0.9,
  pronunciation: 'classical',
  uiLang: 'de',

  hydrate: () => {
    set({
      xp: kvGetNum('xp', 0),
      coins: kvGetNum('coins', 0),
      streakCount: kvGetNum('streakCount', 0),
      streakLastDay: kvGet('streakLastDay') ?? '',
      dailyGoalNew: kvGetNum('dailyGoalNew', 10),
      dailyGoalXp: kvGetNum('dailyGoalXp', 60),
      retention: kvGetNum('retention', 0.9),
      pronunciation: (kvGet('pronunciation') as Pronunciation) ?? 'classical',
      uiLang: (kvGet('uiLang') as UiLang) ?? 'de',
      hydrated: true,
    });
  },

  awardXp: (n) => {
    const oldLevel = levelForXp(get().xp).level;
    const xp = get().xp + n;
    kvSet('xp', String(xp));
    const newLevel = levelForXp(xp).level;
    set({ xp });
    const leveledUp = newLevel > oldLevel;
    if (leveledUp) get().addCoins(COINS_PER_LEVEL * (newLevel - oldLevel));
    return { leveledUp, newLevel };
  },

  addCoins: (n) => {
    const coins = get().coins + n;
    kvSet('coins', String(coins));
    set({ coins });
  },

  registerActivity: () => {
    const today = dayKey();
    const last = get().streakLastDay;
    if (last === today) return get().streakCount;
    const count = isYesterday(last, today) ? get().streakCount + 1 : 1;
    kvSet('streakCount', String(count));
    kvSet('streakLastDay', today);
    set({ streakCount: count, streakLastDay: today });
    return count;
  },

  setRetention: (r) => {
    const retention = Math.min(0.97, Math.max(0.8, r));
    kvSet('retention', String(retention));
    set({ retention });
  },

  setPronunciation: (p) => {
    kvSet('pronunciation', p);
    set({ pronunciation: p });
  },

  setDailyGoalNew: (n) => {
    const dailyGoalNew = Math.min(40, Math.max(0, Math.round(n)));
    kvSet('dailyGoalNew', String(dailyGoalNew));
    set({ dailyGoalNew });
  },

  setUiLang: (l) => {
    kvSet('uiLang', l);
    set({ uiLang: l });
  },
}));
