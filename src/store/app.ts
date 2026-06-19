import { reloadAppAsync } from 'expo';
import { DevSettings } from 'react-native';
import { create } from 'zustand';

import { type UiLang } from '@/constants/strings';
import { activeCourseId } from '@/courses/active';
import type { CourseId } from '@/courses/types';
import { dayKey, isYesterday, levelForXp } from '@/lib/gamification';
import { kvGet, kvGetNum, kvSet } from '@/lib/kv';
import { metaGet, metaSet } from '@/lib/meta';

export type Pronunciation = 'classical' | 'ecclesiastical';
export type ThemeMode = 'dark' | 'light' | 'system';
export type { UiLang };
export type { CourseId };

const COINS_PER_LEVEL = 5;

/**
 * Force a full JS reload so module-load-resolved state (DB file, theme, fonts,
 * decorations, the active-course cache) is rebuilt for the newly-selected
 * course. `reloadAppAsync` needs expo-updates (production) or a dev client;
 * `DevSettings.reload()` covers the dev/Expo-Go case. We try both so the switch
 * is reliable across environments.
 */
function reloadApp(): void {
  // In dev (Expo Go / dev client) DevSettings.reload() is the reliable path;
  // reloadAppAsync can resolve without actually reloading when expo-updates
  // isn't present. In production, reloadAppAsync (with expo-updates) is correct.
  if (__DEV__ && typeof DevSettings?.reload === 'function') {
    DevSettings.reload();
    return;
  }
  reloadAppAsync().catch(() => {
    try {
      DevSettings.reload();
    } catch {
      /* last resort: nothing more we can do programmatically */
    }
  });
}

type AppState = {
  hydrated: boolean;
  /** Active learning course. Global (shared across courses) — see meta.ts. */
  course: CourseId;
  xp: number;
  coins: number;
  streakCount: number;
  streakLastDay: string;
  dailyGoalNew: number;
  dailyGoalXp: number;
  retention: number;
  pronunciation: Pronunciation;
  uiLang: UiLang;
  themeMode: ThemeMode;
  /**
   * Monotonic counter, bumped whenever vocab data changes outside the vocab
   * tab (session finished, import, delete, word added from reader). The tab
   * reloads its heavy lemma list only when this changes — not on every focus.
   */
  vocabRev: number;

  hydrate: () => void;
  bumpVocabRev: () => void;
  awardXp: (n: number) => { leveledUp: boolean; newLevel: number };
  addCoins: (n: number) => void;
  /** Mark today active; updates the streak. Returns the new streak length. */
  registerActivity: () => number;
  setRetention: (r: number) => void;
  setPronunciation: (p: Pronunciation) => void;
  setDailyGoalNew: (n: number) => void;
  setUiLang: (l: UiLang) => void;
  setThemeMode: (m: ThemeMode) => void;
  /** Switch course: persist the choice and reload so the right DB/theme/fonts load. */
  setCourse: (c: CourseId) => void;
};

export const useApp = create<AppState>((set, get) => ({
  hydrated: false,
  course: activeCourseId(),
  xp: 0,
  coins: 0,
  streakCount: 0,
  streakLastDay: '',
  dailyGoalNew: 10,
  dailyGoalXp: 60,
  retention: 0.9,
  pronunciation: 'classical',
  uiLang: 'de',
  themeMode: 'system' as ThemeMode,
  vocabRev: 0,

  bumpVocabRev: () => set((s) => ({ vocabRev: s.vocabRev + 1 })),

  hydrate: () => {
    set({
      course: activeCourseId(),
      // Per-course state — lives in the active course's database.
      xp: kvGetNum('xp', 0),
      coins: kvGetNum('coins', 0),
      streakCount: kvGetNum('streakCount', 0),
      streakLastDay: kvGet('streakLastDay') ?? '',
      dailyGoalNew: kvGetNum('dailyGoalNew', 10),
      dailyGoalXp: kvGetNum('dailyGoalXp', 60),
      retention: kvGetNum('retention', 0.9),
      pronunciation: (kvGet('pronunciation') as Pronunciation) ?? 'classical',
      // Global prefs — meta.db (shared across courses). Fall back to the course
      // db for existing installs, then to defaults.
      uiLang: (metaGet('uiLang') as UiLang) ?? (kvGet('uiLang') as UiLang) ?? 'de',
      themeMode: (metaGet('themeMode') as ThemeMode) ?? (kvGet('themeMode') as ThemeMode) ?? 'system',
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
    metaSet('uiLang', l);
    set({ uiLang: l });
  },

  setThemeMode: (m) => {
    metaSet('themeMode', m);
    set({ themeMode: m });
  },

  setCourse: (c) => {
    if (c === get().course) return;
    // Persist the choice (synchronous, durable). The whole app must reload so
    // the right DB file, theme, fonts, decorations and seed resolve fresh at
    // module load — DON'T optimistically flip `course` here, or a failed reload
    // would leave the UI labelled for the new course while the DB still serves
    // the old one (the classic "only headings change" bug).
    metaSet('course', c);
    reloadApp();
  },
}));
