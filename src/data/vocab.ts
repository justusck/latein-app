import type { SeedLemma } from './types';
import { GENERATED_VOCAB } from './vocab.generated';

/**
 * Starter vocabulary — the most frequent / most foundational Latin words,
 * grouped into 6 ascending learning portions that align with the grammar
 * skill tree. Glosses in German. The full DCC Core 1000 is generated later
 * by scripts/build-seed.mjs.
 *
 * `forms` are lowercase, macron-free surface forms used for reading coverage
 * and tap-to-gloss; the lemma itself is added automatically at load time.
 */
const SEED_VOCAB_CORE: SeedLemma[] = [
  // ── Group 1: esse + a-declension + connectors ────────────────────────────
  { id: 1, lemma: 'sum', pos: 'verb', principalParts: 'sum, esse, fuī', info: 'unregelmäßig', glossDe: 'sein', freqRank: 1, freqGroup: 1, semanticGroup: 'Grundverben', forms: ['sum', 'es', 'est', 'sumus', 'estis', 'sunt', 'esse', 'erat', 'erant', 'fuit', 'erit'] },
  { id: 2, lemma: 'et', pos: 'conj', glossDe: 'und', glossEn: 'and', freqRank: 2, freqGroup: 1, semanticGroup: 'Konnektoren', forms: ['et'] },
  { id: 3, lemma: 'nōn', pos: 'adv', glossDe: 'nicht', freqRank: 3, freqGroup: 1, semanticGroup: 'Konnektoren', forms: ['non'] },
  { id: 4, lemma: 'sed', pos: 'conj', glossDe: 'aber, sondern', freqRank: 4, freqGroup: 1, semanticGroup: 'Konnektoren', forms: ['sed'] },
  { id: 5, lemma: 'aqua', pos: 'noun', principalParts: 'aqua, aquae', info: 'f., a-Deklination', glossDe: 'Wasser', freqRank: 5, freqGroup: 1, semanticGroup: 'Natur', forms: ['aqua', 'aquae', 'aquam', 'aquas', 'aquarum', 'aquis'] },
  { id: 6, lemma: 'terra', pos: 'noun', principalParts: 'terra, terrae', info: 'f., a-Deklination', glossDe: 'Erde, Land', freqRank: 6, freqGroup: 1, semanticGroup: 'Natur', forms: ['terra', 'terrae', 'terram', 'terras', 'terrarum', 'terris'] },
  { id: 7, lemma: 'vīta', pos: 'noun', principalParts: 'vīta, vītae', info: 'f., a-Deklination', glossDe: 'Leben', freqRank: 7, freqGroup: 1, semanticGroup: 'Mensch', forms: ['vita', 'vitae', 'vitam', 'vitas'] },
  { id: 8, lemma: 'puella', pos: 'noun', principalParts: 'puella, puellae', info: 'f., a-Deklination', glossDe: 'Mädchen', freqRank: 8, freqGroup: 1, semanticGroup: 'Mensch', forms: ['puella', 'puellae', 'puellam', 'puellas', 'puellarum', 'puellis'] },

  // ── Group 2: o-declension + a-conjugation present ────────────────────────
  { id: 9, lemma: 'amō', pos: 'verb', principalParts: 'amō, amāre, amāvī, amātum', info: 'a-Konjugation', glossDe: 'lieben', freqRank: 9, freqGroup: 2, semanticGroup: 'Grundverben', forms: ['amo', 'amas', 'amat', 'amamus', 'amatis', 'amant', 'amare', 'amabat'] },
  { id: 10, lemma: 'labōrō', pos: 'verb', principalParts: 'labōrō, labōrāre', info: 'a-Konjugation', glossDe: 'arbeiten', freqRank: 10, freqGroup: 2, semanticGroup: 'Grundverben', forms: ['laboro', 'laboras', 'laborat', 'laboramus', 'laboratis', 'laborant', 'laborare'] },
  { id: 11, lemma: 'amīcus', pos: 'noun', principalParts: 'amīcus, amīcī', info: 'm., o-Deklination', glossDe: 'Freund', freqRank: 11, freqGroup: 2, semanticGroup: 'Mensch', forms: ['amicus', 'amici', 'amicum', 'amicos', 'amicorum', 'amicis', 'amice'] },
  { id: 12, lemma: 'servus', pos: 'noun', principalParts: 'servus, servī', info: 'm., o-Deklination', glossDe: 'Sklave, Diener', freqRank: 12, freqGroup: 2, semanticGroup: 'Mensch', forms: ['servus', 'servi', 'servum', 'servos', 'servorum', 'servis'] },
  { id: 13, lemma: 'dominus', pos: 'noun', principalParts: 'dominus, dominī', info: 'm., o-Deklination', glossDe: 'Herr', freqRank: 13, freqGroup: 2, semanticGroup: 'Mensch', forms: ['dominus', 'domini', 'dominum', 'dominos', 'dominorum', 'dominis'] },
  { id: 14, lemma: 'bellum', pos: 'noun', principalParts: 'bellum, bellī', info: 'n., o-Deklination', glossDe: 'Krieg', freqRank: 14, freqGroup: 2, semanticGroup: 'Gesellschaft', forms: ['bellum', 'belli', 'bella', 'bellorum', 'bellis'] },
  { id: 15, lemma: 'oppidum', pos: 'noun', principalParts: 'oppidum, oppidī', info: 'n., o-Deklination', glossDe: 'Stadt, Festung', freqRank: 15, freqGroup: 2, semanticGroup: 'Ort', forms: ['oppidum', 'oppidi', 'oppida', 'oppidorum'] },
  { id: 16, lemma: 'puer', pos: 'noun', principalParts: 'puer, puerī', info: 'm., o-Deklination', glossDe: 'Junge, Kind', freqRank: 16, freqGroup: 2, semanticGroup: 'Mensch', forms: ['puer', 'pueri', 'puerum', 'pueros', 'puerorum', 'pueris'] },

  // ── Group 3: adjectives (a/o) + e-conjugation ────────────────────────────
  { id: 17, lemma: 'magnus', pos: 'adj', principalParts: 'magnus, -a, -um', glossDe: 'groß', freqRank: 17, freqGroup: 3, semanticGroup: 'Eigenschaften', forms: ['magnus', 'magna', 'magnum', 'magni', 'magnae', 'magnam', 'magnos', 'magnis'] },
  { id: 18, lemma: 'bonus', pos: 'adj', principalParts: 'bonus, -a, -um', glossDe: 'gut', freqRank: 18, freqGroup: 3, semanticGroup: 'Eigenschaften', forms: ['bonus', 'bona', 'bonum', 'boni', 'bonae', 'bonam', 'bonos'] },
  { id: 19, lemma: 'malus', pos: 'adj', principalParts: 'malus, -a, -um', glossDe: 'schlecht, böse', freqRank: 19, freqGroup: 3, semanticGroup: 'Eigenschaften', forms: ['malus', 'mala', 'malum', 'mali', 'malae'] },
  { id: 20, lemma: 'parvus', pos: 'adj', principalParts: 'parvus, -a, -um', glossDe: 'klein', freqRank: 20, freqGroup: 3, semanticGroup: 'Eigenschaften', forms: ['parvus', 'parva', 'parvum', 'parvi', 'parvae'] },
  { id: 21, lemma: 'laetus', pos: 'adj', principalParts: 'laetus, -a, -um', glossDe: 'fröhlich, glücklich', freqRank: 21, freqGroup: 3, semanticGroup: 'Eigenschaften', forms: ['laetus', 'laeta', 'laetum', 'laeti', 'laetae'] },
  { id: 22, lemma: 'videō', pos: 'verb', principalParts: 'videō, vidēre, vīdī, vīsum', info: 'e-Konjugation', glossDe: 'sehen', freqRank: 22, freqGroup: 3, semanticGroup: 'Grundverben', forms: ['video', 'vides', 'videt', 'videmus', 'videtis', 'vident', 'videre', 'vidit'] },
  { id: 23, lemma: 'habeō', pos: 'verb', principalParts: 'habeō, habēre, habuī, habitum', info: 'e-Konjugation', glossDe: 'haben, halten', freqRank: 23, freqGroup: 3, semanticGroup: 'Grundverben', forms: ['habeo', 'habes', 'habet', 'habemus', 'habetis', 'habent', 'habere', 'habuit'] },
  { id: 24, lemma: 'patria', pos: 'noun', principalParts: 'patria, patriae', info: 'f., a-Deklination', glossDe: 'Vaterland, Heimat', freqRank: 24, freqGroup: 3, semanticGroup: 'Gesellschaft', forms: ['patria', 'patriae', 'patriam', 'patrias'] },

  // ── Group 4: pronouns + prepositions (cases) ─────────────────────────────
  { id: 25, lemma: 'in', pos: 'prep', principalParts: 'in (+Abl/Akk)', glossDe: 'in, auf', freqRank: 25, freqGroup: 4, semanticGroup: 'Präpositionen', forms: ['in'] },
  { id: 26, lemma: 'ad', pos: 'prep', principalParts: 'ad (+Akk)', glossDe: 'zu, nach, bei', freqRank: 26, freqGroup: 4, semanticGroup: 'Präpositionen', forms: ['ad'] },
  { id: 27, lemma: 'cum', pos: 'prep', principalParts: 'cum (+Abl)', glossDe: 'mit; (als, weil)', freqRank: 27, freqGroup: 4, semanticGroup: 'Präpositionen', forms: ['cum'] },
  { id: 28, lemma: 'ex', pos: 'prep', principalParts: 'ex / ē (+Abl)', glossDe: 'aus, von ... her', freqRank: 28, freqGroup: 4, semanticGroup: 'Präpositionen', forms: ['ex', 'e'] },
  { id: 29, lemma: 'ego', pos: 'pron', principalParts: 'ego, meī', glossDe: 'ich', freqRank: 29, freqGroup: 4, semanticGroup: 'Pronomina', forms: ['ego', 'me', 'mihi', 'mei', 'mecum'] },
  { id: 30, lemma: 'tū', pos: 'pron', principalParts: 'tū, tuī', glossDe: 'du', freqRank: 30, freqGroup: 4, semanticGroup: 'Pronomina', forms: ['tu', 'te', 'tibi', 'tui', 'tecum'] },
  { id: 31, lemma: 'is', pos: 'pron', principalParts: 'is, ea, id', glossDe: 'er, sie, es; dieser', freqRank: 31, freqGroup: 4, semanticGroup: 'Pronomina', forms: ['is', 'ea', 'id', 'eum', 'eam', 'eius', 'ei', 'eo', 'eos', 'eas', 'eorum'] },
  { id: 32, lemma: 'quī', pos: 'pron', principalParts: 'quī, quae, quod', glossDe: 'der, welcher', freqRank: 32, freqGroup: 4, semanticGroup: 'Pronomina', forms: ['qui', 'quae', 'quod', 'quem', 'quam', 'cuius', 'cui', 'quo', 'quos', 'quas', 'quorum'] },

  // ── Group 5: 3rd declension nouns + consonant-conjugation verbs ──────────
  { id: 33, lemma: 'rēx', pos: 'noun', principalParts: 'rēx, rēgis', info: 'm., kons. Deklination', glossDe: 'König', freqRank: 33, freqGroup: 5, semanticGroup: 'Gesellschaft', forms: ['rex', 'regis', 'regem', 'reges', 'regum', 'regibus', 'rege'] },
  { id: 34, lemma: 'homō', pos: 'noun', principalParts: 'homō, hominis', info: 'm., kons. Deklination', glossDe: 'Mensch', freqRank: 34, freqGroup: 5, semanticGroup: 'Mensch', forms: ['homo', 'hominis', 'hominem', 'homines', 'hominum', 'hominibus', 'homine'] },
  { id: 35, lemma: 'urbs', pos: 'noun', principalParts: 'urbs, urbis', info: 'f., i-Deklination', glossDe: 'Stadt', freqRank: 35, freqGroup: 5, semanticGroup: 'Ort', forms: ['urbs', 'urbis', 'urbem', 'urbes', 'urbium', 'urbibus', 'urbe'] },
  { id: 36, lemma: 'mīles', pos: 'noun', principalParts: 'mīles, mīlitis', info: 'm., kons. Deklination', glossDe: 'Soldat', freqRank: 36, freqGroup: 5, semanticGroup: 'Gesellschaft', forms: ['miles', 'militis', 'militem', 'milites', 'militum', 'militibus', 'milite'] },
  { id: 37, lemma: 'dīcō', pos: 'verb', principalParts: 'dīcō, dīcere, dīxī, dictum', info: 'kons. Konjugation', glossDe: 'sagen, sprechen', freqRank: 37, freqGroup: 5, semanticGroup: 'Grundverben', forms: ['dico', 'dicis', 'dicit', 'dicimus', 'dicitis', 'dicunt', 'dicere', 'dixit'] },
  { id: 38, lemma: 'dūcō', pos: 'verb', principalParts: 'dūcō, dūcere, dūxī, ductum', info: 'kons. Konjugation', glossDe: 'führen', freqRank: 38, freqGroup: 5, semanticGroup: 'Grundverben', forms: ['duco', 'ducis', 'ducit', 'ducimus', 'ducunt', 'ducere', 'duxit'] },
  { id: 39, lemma: 'agō', pos: 'verb', principalParts: 'agō, agere, ēgī, āctum', info: 'kons. Konjugation', glossDe: 'treiben, tun, handeln', freqRank: 39, freqGroup: 5, semanticGroup: 'Grundverben', forms: ['ago', 'agis', 'agit', 'agimus', 'agunt', 'agere', 'egit'] },
  { id: 40, lemma: 'mittō', pos: 'verb', principalParts: 'mittō, mittere, mīsī, missum', info: 'kons. Konjugation', glossDe: 'schicken, senden', freqRank: 40, freqGroup: 5, semanticGroup: 'Grundverben', forms: ['mitto', 'mittis', 'mittit', 'mittimus', 'mittunt', 'mittere', 'misit'] },

  // ── Group 6: high-frequency extras ───────────────────────────────────────
  { id: 41, lemma: 'nunc', pos: 'adv', glossDe: 'jetzt, nun', freqRank: 41, freqGroup: 6, semanticGroup: 'Adverbien', forms: ['nunc'] },
  { id: 42, lemma: 'semper', pos: 'adv', glossDe: 'immer', freqRank: 42, freqGroup: 6, semanticGroup: 'Adverbien', forms: ['semper'] },
  { id: 43, lemma: 'quoque', pos: 'adv', glossDe: 'auch', freqRank: 43, freqGroup: 6, semanticGroup: 'Adverbien', forms: ['quoque'] },
  { id: 44, lemma: 'deus', pos: 'noun', principalParts: 'deus, deī', info: 'm., o-Deklination', glossDe: 'Gott', freqRank: 44, freqGroup: 6, semanticGroup: 'Religion', forms: ['deus', 'dei', 'deum', 'deos', 'deorum', 'deis', 'di', 'dis'] },
  { id: 45, lemma: 'rēgīna', pos: 'noun', principalParts: 'rēgīna, rēgīnae', info: 'f., a-Deklination', glossDe: 'Königin', freqRank: 45, freqGroup: 6, semanticGroup: 'Gesellschaft', forms: ['regina', 'reginae', 'reginam', 'reginas'] },
  { id: 46, lemma: 'īnsula', pos: 'noun', principalParts: 'īnsula, īnsulae', info: 'f., a-Deklination', glossDe: 'Insel', freqRank: 46, freqGroup: 6, semanticGroup: 'Ort', forms: ['insula', 'insulae', 'insulam', 'insulas'] },
  { id: 47, lemma: 'hic', pos: 'pron', principalParts: 'hic, haec, hoc', glossDe: 'dieser, diese, dieses', freqRank: 47, freqGroup: 6, semanticGroup: 'Pronomina', forms: ['hic', 'haec', 'hoc', 'hunc', 'hanc', 'huius', 'huic', 'hi', 'hae', 'horum', 'harum'] },
  { id: 48, lemma: 'veniō', pos: 'verb', principalParts: 'veniō, venīre, vēnī, ventum', info: 'i-Konjugation', glossDe: 'kommen', freqRank: 48, freqGroup: 6, semanticGroup: 'Grundverben', forms: ['venio', 'venis', 'venit', 'venimus', 'venitis', 'veniunt', 'venire', 'venerunt'] },
  { id: 49, lemma: 'habitō', pos: 'verb', principalParts: 'habitō, habitāre', info: 'a-Konjugation', glossDe: 'wohnen', freqRank: 49, freqGroup: 6, semanticGroup: 'Grundverben', forms: ['habito', 'habitas', 'habitat', 'habitamus', 'habitant', 'habitare'] },
  { id: 50, lemma: 'aut', pos: 'conj', glossDe: 'oder', freqRank: 50, freqGroup: 6, semanticGroup: 'Konnektoren', forms: ['aut'] },
];

/** Curated high-frequency core (portions 1–6) + the large FreeDict dataset. */
export const SEED_VOCAB: SeedLemma[] = [...SEED_VOCAB_CORE, ...GENERATED_VOCAB];
