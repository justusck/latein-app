export type UiLang = 'de' | 'la';

export function toRoman(n: number): string {
  if (n < 1 || n > 39) return String(n);
  const vals = [10, 9, 5, 4, 1];
  const syms = ['X', 'IX', 'V', 'IV', 'I'];
  let r = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { r += syms[i]; n -= vals[i]; }
  }
  return r;
}

export type UiStrings = {
  vocabTitle: string;
  profileTitle: string;
  cardsToday: (n: number) => string;
  allDone: string;
  startStudying: string;
  dailyGoal: string;
  frequencyGroups: string;
  consolidated: string;
  customVocab: string;
  portion: (n: number) => string;
  importVocab: string;
  importing: string;
  groupDetailTitle: (n: number) => string;
  freePractice: string;
  statusNew: string;
  statusIntroduced: string;
  statusKnown: string;
  settingsLangLabel: string;
  filterAll: string;
  searchVocab: string;
  sortFreq: string;
  sortRecent: string;
  noVocabFound: string;
  dueToday: string;
};

export const DE: UiStrings = {
  vocabTitle: 'Vokabeln',
  profileTitle: 'Profil',
  cardsToday: (n) => n === 1 ? '1 Karte heute' : `${n} Karten heute`,
  allDone: 'Alles für heute erledigt',
  startStudying: 'Lernen starten',
  dailyGoal: 'Tagesziel',
  frequencyGroups: 'Frequenzgruppen',
  consolidated: 'gefestigt',
  customVocab: 'Eigene Vokabeln',
  portion: (n) => `Portion ${n}`,
  importVocab: 'Vokabeln importieren (Anki TSV)',
  importing: 'Importiere…',
  freePractice: 'Frei üben',
  groupDetailTitle: (n) => `Portion ${n}`,
  statusNew: 'Neu',
  statusIntroduced: 'Lernend',
  statusKnown: 'Gefestigt',
  settingsLangLabel: 'App-Sprache',
  filterAll: 'Alle',
  searchVocab: 'Vokabel suchen…',
  sortFreq: 'Frequenz',
  sortRecent: 'Zuletzt',
  noVocabFound: 'Keine Vokabeln gefunden',
  dueToday: 'heute fällig',
};

export const LA: UiStrings = {
  vocabTitle: 'Vocabula',
  profileTitle: 'Profil',
  cardsToday: (n) => n === 1 ? '1 charta hodie' : `${n} chartae hodie`,
  allDone: 'Omnia hodie perfecta',
  startStudying: 'Discere',
  dailyGoal: 'Meta diei',
  frequencyGroups: 'Ordines',
  consolidated: 'firmata',
  customVocab: 'Vocabula propria',
  portion: (n) => `Pars ${toRoman(n)}`,
  importVocab: 'Vocabula importare (Anki TSV)',
  importing: 'Importantur…',
  freePractice: 'Libere exercere',
  groupDetailTitle: (n) => `Pars ${toRoman(n)}`,
  statusNew: 'Nova',
  statusIntroduced: 'Discuntur',
  statusKnown: 'Firmata',
  settingsLangLabel: 'Lingua',
  filterAll: 'Omnia',
  searchVocab: 'Vocabulum quaerere…',
  sortFreq: 'Ordo',
  sortRecent: 'Recens',
  noVocabFound: 'Nulla vocabula inventa',
  dueToday: 'hodie reddenda',
};

export const STRINGS: Record<UiLang, UiStrings> = { de: DE, la: LA };
