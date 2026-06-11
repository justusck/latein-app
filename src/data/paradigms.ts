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
  noun('decl-u', '4. Deklination (u)', 'manus, manūs (f.)', 'nouns-4-5-decl', [
    ['manus', 'manūs'],
    ['manūs', 'manuum'],
    ['manuī', 'manibus'],
    ['manum', 'manūs'],
    ['manū', 'manibus'],
  ]),
  noun('decl-e', '5. Deklination (e)', 'rēs, reī (f.)', 'nouns-4-5-decl', [
    ['rēs', 'rēs'],
    ['reī', 'rērum'],
    ['reī', 'rēbus'],
    ['rem', 'rēs'],
    ['rē', 'rēbus'],
  ]),
  noun('decl-comp', 'Komparativ', 'fortior, fortiōris (m./f.)', 'adverbs-comparison', [
    ['fortior', 'fortiōrēs'],
    ['fortiōris', 'fortiōrum'],
    ['fortiōrī', 'fortiōribus'],
    ['fortiōrem', 'fortiōrēs'],
    ['fortiōre', 'fortiōribus'],
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
  verb('verb-impf', 'Imperfekt · a-Konjugation', 'amāre (lieben)', 'imperfect-future', [
    ['amābam', 'amābāmus'],
    ['amābās', 'amābātis'],
    ['amābat', 'amābant'],
  ]),
  verb('verb-fut', 'Futur I · a-Konjugation', 'amāre (lieben)', 'imperfect-future', [
    ['amābō', 'amābimus'],
    ['amābis', 'amābitis'],
    ['amābit', 'amābunt'],
  ]),
  verb('verb-perf', 'Perfekt · a-Konjugation', 'amāre (lieben)', 'perfect-system', [
    ['amāvī', 'amāvimus'],
    ['amāvistī', 'amāvistis'],
    ['amāvit', 'amāvērunt'],
  ]),
  verb('verb-pass', 'Präsens Passiv · a-Konjugation', 'amārī (geliebt werden)', 'passive', [
    ['amor', 'amāmur'],
    ['amāris', 'amāminī'],
    ['amātur', 'amantur'],
  ]),
];

export function paradigmsForTopic(topicId: string): Paradigm[] {
  return PARADIGMS.filter((p) => p.topicId === topicId);
}

export function getParadigm(id: string): Paradigm | undefined {
  return PARADIGMS.find((p) => p.id === id);
}
