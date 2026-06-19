import type { SeedSaying } from './sayings';

/**
 * Japanese proverbs (ことわざ). Reuses the SeedSaying shape: `latin` holds the
 * target-language saying (Japanese), `german` the translation/meaning.
 */
export const SEED_SAYINGS_JA: SeedSaying[] = [
  { id: 1, latin: '七転び八起き', german: 'Siebenmal fallen, achtmal aufstehen — gib niemals auf. (nanakorobi yaoki)', source: 'ことわざ' },
  { id: 2, latin: '猿も木から落ちる', german: 'Auch Affen fallen von Bäumen — auch Meistern unterlaufen Fehler. (saru mo ki kara ochiru)', source: 'ことわざ' },
  { id: 3, latin: '石の上にも三年', german: 'Drei Jahre auf einem Stein — Ausdauer wird belohnt. (ishi no ue ni mo sannen)', source: 'ことわざ' },
  { id: 4, latin: '継続は力なり', german: 'Beständigkeit ist Stärke. (keizoku wa chikara nari)', source: 'ことわざ' },
  { id: 5, latin: '急がば回れ', german: 'Hast du es eilig, nimm den Umweg — Eile mit Weile. (isogaba maware)', source: 'ことわざ' },
  { id: 6, latin: '一期一会', german: 'Eine Begegnung, eine Gelegenheit — jeder Moment ist einmalig. (ichigo ichie)', source: '四字熟語' },
  { id: 7, latin: '千里の道も一歩から', german: 'Auch eine Reise von tausend Meilen beginnt mit einem Schritt. (senri no michi mo ippo kara)', source: 'ことわざ' },
  { id: 8, latin: '花より団子', german: 'Lieber Knödel als Blüten — Nutzen geht über Schönheit. (hana yori dango)', source: 'ことわざ' },
  { id: 9, latin: '出る杭は打たれる', german: 'Der herausragende Pfahl wird eingeschlagen. (deru kui wa utareru)', source: 'ことわざ' },
  { id: 10, latin: '知らぬが仏', german: 'Nichts zu wissen ist Buddha — Unwissenheit ist ein Segen. (shiranu ga hotoke)', source: 'ことわざ' },
  { id: 11, latin: '猫に小判', german: 'Goldmünzen für die Katze — Perlen vor die Säue. (neko ni koban)', source: 'ことわざ' },
  { id: 12, latin: '案ずるより産むが易し', german: 'Gebären ist leichter als die Sorge davor — die Angst ist oft größer als die Sache. (anzuru yori umu ga yasashi)', source: 'ことわざ' },
];
