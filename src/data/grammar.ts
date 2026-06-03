import type { SeedGrammarTopic } from './types';

/**
 * Grammar skill tree — the classical "grammar-first" beginner sequence.
 * Each node has a lesson (explanation) and FSRS-tracked drill cards.
 * `prereqs` define the unlock graph. Early nodes ship with full drills;
 * later nodes provide lessons and grow over time.
 */
export const SEED_GRAMMAR: SeedGrammarTopic[] = [
  {
    id: 'pronunciation',
    title: 'Aussprache & Alphabet',
    summary: 'Klassische vs. kirchliche Aussprache, Vokallänge, Betonung.',
    stage: 'foundations',
    prereqs: [],
    explanation:
      'Das lateinische Alphabet hat 23 Buchstaben (kein J, U=V, kein W).\n\n' +
      '**Klassisch (restituiert):** c immer wie „k" (Cicero = Kikero), v wie „w" (vīta = wīta), ' +
      'ae = „ai", oe = „oi".\n\n' +
      '**Kirchlich:** c vor e/i wie „tsch" (Cicero = Tschitschero), v wie „w"→„w", ae = „e".\n\n' +
      'Vokale sind **kurz** oder **lang** (Makron: ā ē ī ō ū). Die Länge unterscheidet Bedeutungen ' +
      '(liber = frei, līber = Buch). **Betonung:** zweitletzte Silbe, wenn sie lang ist, sonst drittletzte.',
    cards: [
      { id: 'pron-1', kind: 'mc', prompt: 'Wie spricht man klassisch „Cicero"?', answer: 'Kikero', options: ['Kikero', 'Tschitschero', 'Sisero'], explanation: 'Klassisch ist c immer ein hartes k.' },
      { id: 'pron-2', kind: 'mc', prompt: 'Klassische Aussprache von „v" in „vīta"?', answer: 'w', options: ['w', 'f', 'v wie deutsch'], explanation: 'v wird klassisch wie engl. w gesprochen.' },
      { id: 'pron-3', kind: 'mc', prompt: 'Welche Silbe wird in „amīcus" betont?', answer: 'die zweitletzte (-mī-)', options: ['die zweitletzte (-mī-)', 'die erste (a-)', 'die letzte (-cus)'], explanation: 'Die zweitletzte Silbe ist lang (ī), also wird sie betont.' },
    ],
  },
  {
    id: 'nouns-a-nom-acc',
    title: 'a-Deklination · Nominativ & Akkusativ',
    summary: 'Subjekt und Objekt, Wortstellung, das Kasussystem.',
    stage: 'foundations',
    prereqs: ['pronunciation'],
    explanation:
      'Latein zeigt die Funktion eines Wortes durch **Endungen** (Kasus), nicht durch die Stellung.\n\n' +
      '**a-Deklination** (meist feminin), Singular: Nom. **-a**, Akk. **-am**. Plural: Nom. **-ae**, Akk. **-ās**.\n\n' +
      '- *Puella* aquam amat. → „Das Mädchen liebt das Wasser." (puella = Subjekt/Nom., aquam = Objekt/Akk.)\n' +
      '- *Puellam* aqua … → das Mädchen wäre Objekt.\n\n' +
      'Die Wortstellung ist frei; das Verb steht oft am Ende.',
    cards: [
      { id: 'aacc-1', kind: 'mc', prompt: 'Welche Form ist der Akkusativ Singular von „puella"?', answer: 'puellam', options: ['puella', 'puellam', 'puellae'], explanation: '-am ist die Akkusativ-Endung im Singular.' },
      { id: 'aacc-2', kind: 'fill', prompt: 'Setze ein: „Puella ___ amat." (das Wasser, Akk.)', answer: 'aquam', explanation: 'Objekt → Akkusativ Singular: aquam.' },
      { id: 'aacc-3', kind: 'mc', prompt: 'Was ist in „Aquam puella amat" das Subjekt?', answer: 'puella', options: ['aquam', 'puella', 'amat'], explanation: 'Subjekt steht im Nominativ (puella), trotz freier Wortstellung.' },
      { id: 'aacc-4', kind: 'order', prompt: 'Bilde den Satz: „Das Mädchen liebt das Wasser." (typische Stellung: Verb am Ende)', answer: 'puella aquam amat', options: ['puella', 'aquam', 'amat'], explanation: 'Subjekt (Nom.) – Objekt (Akk.) – Verb. Die Wortstellung ist frei, aber das Verb steht oft am Schluss.' },
      { id: 'aacc-5', kind: 'fill', prompt: 'Genitiv Singular von „puella"?', answer: 'puellae', explanation: 'a-Deklination Gen. Sg.: -ae.' },
    ],
  },
  {
    id: 'present-a-conj',
    title: 'Präsens · a-Konjugation & esse',
    summary: 'Personalendungen, Konjugieren im Präsens, das Verb „sein".',
    stage: 'morphology',
    prereqs: ['nouns-a-nom-acc'],
    explanation:
      'Verben enden je nach Person: **-ō, -s, -t, -mus, -tis, -nt**.\n\n' +
      'a-Konjugation (amāre): amō, amās, amat, amāmus, amātis, amant.\n\n' +
      '**esse** (sein) ist unregelmäßig: sum, es, est, sumus, estis, sunt.',
    cards: [
      { id: 'pres-1', kind: 'mc', prompt: '„ihr liebt" heißt …', answer: 'amātis', options: ['amant', 'amātis', 'amāmus'], explanation: '2. Person Plural: -tis → amātis.' },
      { id: 'pres-2', kind: 'fill', prompt: 'Konjugiere „labōrāre" in der 3. Person Sg.', answer: 'laborat', explanation: '3. Sg.: -t → labōrat.' },
      { id: 'pres-3', kind: 'mc', prompt: '„wir sind" heißt …', answer: 'sumus', options: ['estis', 'sunt', 'sumus'], explanation: '1. Person Plural von esse: sumus.' },
      { id: 'pres-4', kind: 'fill', prompt: 'Konjugiere „amāre" in der 1. Person Plural.', answer: 'amamus', explanation: '1. Pl.: -mus → amāmus.' },
      { id: 'pres-5', kind: 'order', prompt: 'Bilde den Satz: „Das Mädchen und der Freund arbeiten."', answer: 'puella et amīcus labōrant', options: ['puella', 'et', 'amīcus', 'labōrant'], explanation: 'Mehrere Subjekte → Verb im Plural (labōrant).' },
    ],
  },
  {
    id: 'nouns-o-decl',
    title: 'o-Deklination (m/n)',
    summary: 'Maskulina auf -us/-er und Neutra auf -um.',
    stage: 'morphology',
    prereqs: ['present-a-conj'],
    explanation:
      'o-Deklination, maskulin (amīcus): Sg. -us, -ī, -ō, -um, -ō; Pl. -ī, -ōrum, -īs, -ōs, -īs.\n\n' +
      'Neutrum (bellum): Nom.=Akk. **-um** (Sg.), **-a** (Pl.). Neutra haben Nom. und Akk. immer gleich.',
    cards: [
      { id: 'odecl-1', kind: 'mc', prompt: 'Akkusativ Plural von „amīcus"?', answer: 'amīcōs', options: ['amīcī', 'amīcōs', 'amīcōrum'], explanation: 'Akk. Pl. maskulin: -ōs.' },
      { id: 'odecl-2', kind: 'mc', prompt: 'Wie lautet Nom. Pl. von „bellum"?', answer: 'bella', options: ['bellī', 'bella', 'bellōs'], explanation: 'Neutrum Plural endet auf -a.' },
    ],
  },
  {
    id: 'adjectives-ao',
    title: 'Adjektive (a/o) & KNG-Kongruenz',
    summary: 'Adjektive richten sich in Kasus, Numerus und Genus.',
    stage: 'morphology',
    prereqs: ['nouns-o-decl'],
    explanation:
      'Adjektive der a/o-Deklination (bonus, bona, bonum) stimmen mit ihrem Bezugswort in ' +
      '**K**asus, **N**umerus und **G**enus überein.\n\n' +
      '- amīcus bonus (m.), puella bona (f.), bellum bonum (n.)\n' +
      'Sie müssen nicht dieselbe Endung haben, nur dieselben Merkmale: poēta (m, a-Dekl.) bonus.',
    cards: [
      { id: 'adj-1', kind: 'mc', prompt: 'Welche Form passt: „puella ___" (gut)?', answer: 'bona', options: ['bonus', 'bona', 'bonum'], explanation: 'puella ist f. → bona.' },
      { id: 'adj-2', kind: 'mc', prompt: 'Welche Form passt: „bellum ___" (groß)?', answer: 'magnum', options: ['magnus', 'magna', 'magnum'], explanation: 'bellum ist n. → magnum.' },
    ],
  },
  {
    id: 'cases-gen-dat-abl',
    title: 'Genitiv, Dativ & Ablativ + Präpositionen',
    summary: 'Die restlichen Kasus und ihre häufigsten Funktionen.',
    stage: 'morphology',
    prereqs: ['adjectives-ao'],
    explanation:
      '**Genitiv** (wessen?): aqua **terrae** = das Wasser des Landes.\n' +
      '**Dativ** (wem?): puellae = dem Mädchen.\n' +
      '**Ablativ** (womit/wovon/wo?): oft mit Präposition – **in** + Abl. (wo?), **cum** + Abl. (mit), ' +
      '**ex/ē** + Abl. (aus), aber **in/ad** + Akk. (wohin).',
    cards: [
      { id: 'case-1', kind: 'mc', prompt: 'Welcher Kasus folgt auf „cum"?', answer: 'Ablativ', options: ['Akkusativ', 'Ablativ', 'Genitiv'], explanation: 'cum (mit) regiert den Ablativ.' },
      { id: 'case-2', kind: 'mc', prompt: '„in oppidum" (mit Akk.) bedeutet …', answer: 'in die Stadt (wohin)', options: ['in der Stadt (wo)', 'in die Stadt (wohin)', 'aus der Stadt'], explanation: 'in + Akk. = Richtung (wohin?).' },
      { id: 'case-3', kind: 'order', prompt: 'Bilde den Satz: „Wir sind in der Stadt." (Ort → in + Ablativ)', answer: 'in oppidō sumus', options: ['in', 'oppidō', 'sumus'], explanation: 'in + Ablativ = Ort (wo?). Verb am Ende.' },
      { id: 'case-4', kind: 'mc', prompt: 'Welcher Kasus antwortet auf „wem?"', answer: 'Dativ', options: ['Genitiv', 'Dativ', 'Akkusativ'], explanation: 'Dativ = wem? (Empfänger).' },
    ],
  },
  {
    id: 'imperfect-future',
    title: 'Imperfekt & Futur I',
    summary: 'Vergangenheit (Verlauf) und Zukunft bilden.',
    stage: 'morphology',
    prereqs: ['cases-gen-dat-abl'],
    explanation:
      '**Imperfekt** (a/e-Konj.): Tempuszeichen **-bā-**: amābam, amābās, amābat …\n' +
      '**Futur I** (a/e-Konj.): -bō, -bis, -bit, -bimus, -bitis, -bunt: amābō, amābis …',
    cards: [
      { id: 'impf-1', kind: 'fill', prompt: '„er liebte" (Imperfekt) von amāre?', answer: 'amabat', explanation: 'Imperfekt-Zeichen -bā- + -t: amābat.' },
    ],
  },
  {
    id: 'nouns-3decl',
    title: '3. Deklination',
    summary: 'Die wichtigste, vielfältigste Deklination.',
    stage: 'morphology',
    prereqs: ['imperfect-future'],
    explanation:
      'Erkennbar am Genitiv **-is**. Stamm aus dem Genitiv ableiten: rēx, rēg**is** → Stamm rēg-.\n' +
      'Endungen Sg.: -, -is, -ī, -em, -e; Pl.: -ēs, -um/-ium, -ibus, -ēs, -ibus. Neutra im Pl. -a/-ia.',
    cards: [
      { id: 'd3-1', kind: 'mc', prompt: 'Akkusativ Singular von „rēx"?', answer: 'rēgem', options: ['rēgis', 'rēgem', 'rēgēs'], explanation: 'Akk. Sg.: Stamm + -em → rēgem.' },
    ],
  },
  {
    id: 'verbs-3-4-conj',
    title: 'Konsonantische, i- & gemischte Konjugation',
    summary: '3., i- und gemischte Konjugation im Präsens.',
    stage: 'morphology',
    prereqs: ['nouns-3decl'],
    explanation:
      'kons. Konjug. (dūcere): dūcō, dūcis, dūcit, dūcimus, dūcitis, dūcunt.\n' +
      'i-Konjug. (audīre): audiō, audīs, audit, audīmus, audītis, audiunt.\n' +
      'Achtung: der Bindevokal ist hier -i-/-u-, nicht -ā-/-ē-.',
    cards: [
      { id: 'c34-1', kind: 'mc', prompt: '3. Person Plural von „dūcere"?', answer: 'dūcunt', options: ['dūcent', 'dūcunt', 'dūciunt'], explanation: 'kons. Konjug.: -unt → dūcunt.' },
    ],
  },
  {
    id: 'perfect-system',
    title: 'Perfektsystem',
    summary: 'Perfekt, Plusquamperfekt, Futur II – vollendete Handlungen.',
    stage: 'morphology',
    prereqs: ['verbs-3-4-conj'],
    explanation:
      'Vom Perfektstamm (3. Stammform, z. B. amāv-): Perfekt-Endungen **-ī, -istī, -it, -imus, -istis, -ērunt**.\n' +
      'Plusquamperfekt: Perfektstamm + -eram …; Futur II: Perfektstamm + -erō …',
    cards: [
      { id: 'perf-1', kind: 'mc', prompt: '„sie haben geliebt" (Perfekt)?', answer: 'amāvērunt', options: ['amābant', 'amāvērunt', 'amant'], explanation: 'Perfekt 3. Pl.: -ērunt → amāvērunt.' },
    ],
  },
  {
    id: 'nouns-4-5-decl',
    title: '4. & 5. Deklination, 3. Dekl. Adjektive',
    summary: 'u-Deklination, e-Deklination und dreiendige Adjektive.',
    stage: 'morphology',
    prereqs: ['perfect-system'],
    explanation:
      '4. Dekl. (manus, -ūs, f.): Gen. -ūs. 5. Dekl. (rēs, reī, f.): Gen. -eī.\n' +
      'Adjektive der 3. Dekl. (fortis, forte) folgen weitgehend der i-Deklination.',
    cards: [],
  },
  {
    id: 'pronouns',
    title: 'Pronomina',
    summary: 'Personal-, Demonstrativ- und Relativpronomen.',
    stage: 'morphology',
    prereqs: ['nouns-4-5-decl'],
    explanation:
      'Personalpron.: ego, tū, nōs, vōs. Demonstrativ: is/ea/id, hic/haec/hoc, ille/illa/illud.\n' +
      'Relativpron.: quī, quae, quod – richtet sich in Genus & Numerus nach dem Bezugswort, im Kasus nach seiner Funktion im Relativsatz.',
    cards: [],
  },
  {
    id: 'passive',
    title: 'Passiv',
    summary: 'Passivendungen in allen Zeiten des Präsensstamms.',
    stage: 'syntax',
    prereqs: ['pronouns'],
    explanation:
      'Passiv-Personalendungen: **-or, -ris, -tur, -mur, -minī, -ntur**.\n' +
      'amor = ich werde geliebt; amātur = er/sie/es wird geliebt.',
    cards: [],
  },
  {
    id: 'participles',
    title: 'Partizipien & Participium coniunctum',
    summary: 'PPP, PPA, PFA und ihr satzwertiger Gebrauch.',
    stage: 'syntax',
    prereqs: ['passive'],
    explanation:
      'PPP (gelobt: laudātus), PPA (lobend: laudāns), PFA (im Begriff zu loben: laudātūrus).\n' +
      'Als Participium coniunctum kongruieren sie mit einem Bezugswort und ersetzen oft einen Nebensatz.',
    cards: [],
  },
  {
    id: 'aci',
    title: 'Infinitive & AcI',
    summary: 'Der Accusativus cum Infinitivo (indirekte Rede).',
    stage: 'syntax',
    prereqs: ['participles'],
    explanation:
      'Nach Verben des Sagens/Meinens/Wahrnehmens steht der **AcI**: Subjekt im Akkusativ + Infinitiv.\n' +
      'Dīcō puellam aquam amāre. = „Ich sage, dass das Mädchen das Wasser liebt."',
    cards: [],
  },
  {
    id: 'subjunctive',
    title: 'Konjunktiv & Nebensätze',
    summary: 'Konjunktivbildung und Final-, Konsekutiv-, cum-Sätze.',
    stage: 'syntax',
    prereqs: ['aci'],
    explanation:
      'Konjunktiv Präsens-Zeichen u. a. -ē-/-ā-. Verwendung in Finalsätzen (ut + Konj. = damit), ' +
      'Konsekutivsätzen (ut = sodass) und cum-Sätzen (cum + Konj. = als/weil).',
    cards: [],
  },
  {
    id: 'deponents-irregular',
    title: 'Deponentien & unregelmäßige Verben',
    summary: 'Passivform – Aktivbedeutung; velle, ferre, īre.',
    stage: 'advanced',
    prereqs: ['subjunctive'],
    explanation:
      'Deponentien haben Passivformen, aber aktive Bedeutung: hortor = ich ermahne.\n' +
      'Unregelmäßig: velle (wollen), nōlle, ferre (tragen), īre (gehen), fierī (werden).',
    cards: [],
  },
  {
    id: 'ablative-absolute',
    title: 'Ablativus absolutus & Gerundivum',
    summary: 'Satzwertige Konstruktionen mit Ablativ; Gerundium/Gerundivum.',
    stage: 'advanced',
    prereqs: ['deponents-irregular'],
    explanation:
      'Abl. abs.: ein Substantiv + Partizip im Ablativ, grammatisch losgelöst: ' +
      '„urbe captā" = „nachdem die Stadt erobert worden war".\n' +
      'Gerundium (Verbalsubstantiv) und Gerundivum (Verbaladjektiv, oft Notwendigkeit: laudandus = der zu lobende).',
    cards: [],
  },
];
