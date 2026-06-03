/**
 * Hand-checked inflection paradigms (with macrons) that power both the
 * read-only reference tables in lessons and the interactive Formentrainer.
 * Uniform grid shape: rows × cols, each cell a correct form.
 */
export type Paradigm = {
  id: string;
  title: string;
  subtitle?: string;
  kind: 'noun' | 'verb';
  topicId: string; // links to a grammar skill-tree node
  cols: string[];
  rows: { label: string; cells: string[] }[];
};

const CASES = ['Nominativ', 'Genitiv', 'Dativ', 'Akkusativ', 'Ablativ'];
const PERSONS = ['1. Person', '2. Person', '3. Person'];
const SG_PL = ['Singular', 'Plural'];

function noun(
  id: string,
  title: string,
  subtitle: string,
  topicId: string,
  forms: [string, string][], // [sg, pl] per case in CASES order
): Paradigm {
  return {
    id,
    title,
    subtitle,
    kind: 'noun',
    topicId,
    cols: SG_PL,
    rows: CASES.map((label, i) => ({ label, cells: forms[i] })),
  };
}

function verb(
  id: string,
  title: string,
  subtitle: string,
  topicId: string,
  forms: [string, string][], // [sg, pl] per person in PERSONS order
): Paradigm {
  return {
    id,
    title,
    subtitle,
    kind: 'verb',
    topicId,
    cols: SG_PL,
    rows: PERSONS.map((label, i) => ({ label, cells: forms[i] })),
  };
}

export const PARADIGMS: Paradigm[] = [
  noun('decl-a', 'a-Deklination', 'puella, puellae (f.)', 'nouns-a-nom-acc', [
    ['puella', 'puellae'],
    ['puellae', 'puellārum'],
    ['puellae', 'puellīs'],
    ['puellam', 'puellās'],
    ['puellā', 'puellīs'],
  ]),
  noun('decl-o-m', 'o-Deklination (m.)', 'amīcus, amīcī (m.)', 'nouns-o-decl', [
    ['amīcus', 'amīcī'],
    ['amīcī', 'amīcōrum'],
    ['amīcō', 'amīcīs'],
    ['amīcum', 'amīcōs'],
    ['amīcō', 'amīcīs'],
  ]),
  noun('decl-o-n', 'o-Deklination (n.)', 'bellum, bellī (n.)', 'nouns-o-decl', [
    ['bellum', 'bella'],
    ['bellī', 'bellōrum'],
    ['bellō', 'bellīs'],
    ['bellum', 'bella'],
    ['bellō', 'bellīs'],
  ]),
  noun('decl-3', '3. Deklination', 'rēx, rēgis (m.)', 'nouns-3decl', [
    ['rēx', 'rēgēs'],
    ['rēgis', 'rēgum'],
    ['rēgī', 'rēgibus'],
    ['rēgem', 'rēgēs'],
    ['rēge', 'rēgibus'],
  ]),
  verb('verb-a', 'Präsens · a-Konjugation', 'amāre (lieben)', 'present-a-conj', [
    ['amō', 'amāmus'],
    ['amās', 'amātis'],
    ['amat', 'amant'],
  ]),
  verb('verb-e', 'Präsens · e-Konjugation', 'vidēre (sehen)', 'present-a-conj', [
    ['videō', 'vidēmus'],
    ['vidēs', 'vidētis'],
    ['videt', 'vident'],
  ]),
  verb('verb-cons', 'Präsens · kons. Konjugation', 'dūcere (führen)', 'verbs-3-4-conj', [
    ['dūcō', 'dūcimus'],
    ['dūcis', 'dūcitis'],
    ['dūcit', 'dūcunt'],
  ]),
  verb('verb-i', 'Präsens · i-Konjugation', 'audīre (hören)', 'verbs-3-4-conj', [
    ['audiō', 'audīmus'],
    ['audīs', 'audītis'],
    ['audit', 'audiunt'],
  ]),
  verb('verb-esse', 'Präsens · esse (sein)', 'sum, esse', 'present-a-conj', [
    ['sum', 'sumus'],
    ['es', 'estis'],
    ['est', 'sunt'],
  ]),
];

export function paradigmsForTopic(topicId: string): Paradigm[] {
  return PARADIGMS.filter((p) => p.topicId === topicId);
}

export function getParadigm(id: string): Paradigm | undefined {
  return PARADIGMS.find((p) => p.id === id);
}
