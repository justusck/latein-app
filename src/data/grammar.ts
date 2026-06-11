import type { SeedGrammarTopic } from './types';

/**
 * Grammar skill tree — aligned with the canonical German Latinum curriculum
 * (Formenlehre: 5 Deklinationen, Adjektive + Steigerung, Adverbien, Pronomina,
 * alle Tempora Aktiv/Passiv, Imperativ; Satzlehre: AcI/NcI, Partizipial-
 * konstruktionen, Abl. abs., Konjunktiv im Haupt- und Nebensatz, Gerundium/
 * Gerundivum, Konditionalsätze, indirekte Rede).
 *
 * Each node has a lesson (explanation) and FSRS-tracked drill cards.
 * `prereqs` define the unlock graph. Existing topic ids are kept stable so
 * user progress survives re-seeding; new topics hook in as side branches.
 *
 * Lesson text conventions (rendered by components/grammar/lesson-content):
 *  - `**fett**` key terms, `*kursiv*` Latin examples
 *  - `- latin → german` bullets become inscription example cards
 *  - a `Merke: …` line becomes the wax-tablet mnemonic
 */
export const SEED_GRAMMAR: SeedGrammarTopic[] = [
  // ════════════════════════ FOUNDATIONS ════════════════════════
  {
    id: 'pronunciation',
    title: 'Aussprache & Alphabet',
    summary: 'Klassische vs. kirchliche Aussprache, Vokallänge, Betonung.',
    stage: 'foundations',
    prereqs: [],
    explanation:
      'Das lateinische Alphabet hat 23 Buchstaben (kein J, U=V, kein W).\n\n' +
      '**Klassisch (restituiert):** c immer wie „k" (Cicero = Kikero), v wie englisches „w" (vīta), ' +
      'ae = „ai", oe = „oi".\n\n' +
      '**Kirchlich:** c vor e/i wie „tsch" (Cicero = Tschitschero), ae = „e".\n\n' +
      'Vokale sind **kurz** oder **lang** (Makron: ā ē ī ō ū). Die Länge kann Bedeutungen unterscheiden:\n' +
      '- *liber — līber* → „frei" oder „Buch": allein die Vokallänge entscheidet.\n\n' +
      '**Betonung:** auf der zweitletzten Silbe, wenn sie lang ist — sonst auf der drittletzten.\n\n' +
      'Merke: C wie K, V wie W — Caesar sprich „Kaisar". Die Vokallänge trägt Bedeutung.',
    cards: [
      { id: 'pron-1', kind: 'mc', prompt: 'Wie spricht man klassisch „Cicero"?', answer: 'Kikero', options: ['Kikero', 'Tschitschero', 'Sisero'], explanation: 'Klassisch ist c immer ein hartes k.' },
      { id: 'pron-2', kind: 'mc', prompt: 'Klassische Aussprache von „v" in „vīta"?', answer: 'w', options: ['w', 'f', 'v wie deutsch'], explanation: 'v wird klassisch wie engl. w gesprochen.' },
      { id: 'pron-3', kind: 'mc', prompt: 'Welche Silbe wird in „amīcus" betont?', answer: 'die zweitletzte (-mī-)', options: ['die erste (a-)', 'die zweitletzte (-mī-)', 'die letzte (-cus)'], explanation: 'Die zweitletzte Silbe ist lang (ī), also wird sie betont.' },
      { id: 'pron-4', kind: 'mc', prompt: 'Wie klingt „ae" in der klassischen Aussprache?', answer: 'ai', options: ['e', 'ai', 'ä'], explanation: 'Klassisch: ae = „ai" (Caesar = Kaisar). Kirchlich wird es zu „e".' },
    ],
  },
  {
    id: 'nouns-a-nom-acc',
    title: 'a-Deklination · Nominativ & Akkusativ',
    summary: 'Subjekt und Objekt, Wortstellung, das Kasussystem.',
    stage: 'foundations',
    prereqs: ['pronunciation'],
    explanation:
      'Latein zeigt die Funktion eines Wortes durch **Endungen** (Kasus), nicht durch die Wortstellung.\n\n' +
      '**a-Deklination** (meist feminin) — Singular: Nominativ **-a**, Akkusativ **-am**; ' +
      'Plural: Nominativ **-ae**, Akkusativ **-ās**.\n' +
      '- *Puella aquam amat.* → „Das Mädchen liebt das Wasser." (puella = Subjekt, aquam = Objekt)\n' +
      '- *Puellae viās spectant.* → „Die Mädchen betrachten die Straßen." (Plural)\n\n' +
      'Die Wortstellung ist frei — das Verb steht meist am Ende.\n\n' +
      'Merke: Wer? → -a. Wen? → -am. Die Endung trägt den Satz, nicht die Stellung.',
    cards: [
      { id: 'aacc-1', kind: 'mc', prompt: 'Welche Form ist der Akkusativ Singular von „puella"?', answer: 'puellam', options: ['puella', 'puellam', 'puellae'], explanation: '-am ist die Akkusativ-Endung im Singular.' },
      { id: 'aacc-2', kind: 'fill', prompt: 'Setze ein: „Puella ___ amat." (das Wasser, Akk.)', answer: 'aquam', explanation: 'Objekt → Akkusativ Singular: aquam.' },
      { id: 'aacc-3', kind: 'mc', prompt: 'Was ist in „Aquam puella amat" das Subjekt?', answer: 'puella', options: ['aquam', 'puella', 'amat'], explanation: 'Subjekt steht im Nominativ (puella), trotz freier Wortstellung.' },
      { id: 'aacc-4', kind: 'order', prompt: 'Bilde den Satz: „Das Mädchen liebt das Wasser." (typische Stellung: Verb am Ende)', answer: 'puella aquam amat', options: ['amat', 'puella', 'aquam'], explanation: 'Subjekt (Nom.) – Objekt (Akk.) – Verb. Die Wortstellung ist frei, aber das Verb steht oft am Schluss.' },
      { id: 'aacc-5', kind: 'fill', prompt: 'Genitiv Singular von „puella"?', answer: 'puellae', explanation: 'a-Deklination Gen. Sg.: -ae.' },
    ],
  },

  // ════════════════════════ MORPHOLOGY ════════════════════════
  {
    id: 'present-a-conj',
    title: 'Präsens · a/e-Konjugation & esse',
    summary: 'Personalendungen, Konjugieren im Präsens, das Verb „sein".',
    stage: 'morphology',
    prereqs: ['nouns-a-nom-acc'],
    explanation:
      'Verben zeigen die Person durch **Personalendungen**: **-ō, -s, -t, -mus, -tis, -nt**.\n\n' +
      'a-Konjugation (*amāre*): amō, amās, amat, amāmus, amātis, amant. ' +
      'Die e-Konjugation (*vidēre*) funktioniert genauso mit -ē-: videō, vidēs, videt …\n' +
      '- *Amīcam exspectāmus.* → „Wir erwarten die Freundin." (-mus = wir)\n\n' +
      '**esse** (sein) ist unregelmäßig: sum, es, est, sumus, estis, sunt.\n' +
      '- *In viā sumus.* → „Wir sind auf der Straße."\n\n' +
      'Merke: -ō, -s, -t, -mus, -tis, -nt — die sechs Gesichter jedes Verbs.',
    cards: [
      { id: 'pres-1', kind: 'mc', prompt: '„ihr liebt" heißt …', answer: 'amātis', options: ['amant', 'amātis', 'amāmus'], explanation: '2. Person Plural: -tis → amātis.' },
      { id: 'pres-2', kind: 'fill', prompt: 'Konjugiere „labōrāre" in der 3. Person Sg.', answer: 'laborat', explanation: '3. Sg.: -t → labōrat.' },
      { id: 'pres-3', kind: 'mc', prompt: '„wir sind" heißt …', answer: 'sumus', options: ['estis', 'sunt', 'sumus'], explanation: '1. Person Plural von esse: sumus.' },
      { id: 'pres-4', kind: 'fill', prompt: 'Konjugiere „amāre" in der 1. Person Plural.', answer: 'amamus', explanation: '1. Pl.: -mus → amāmus.' },
      { id: 'pres-5', kind: 'order', prompt: 'Bilde den Satz: „Das Mädchen und der Freund arbeiten."', answer: 'puella et amīcus labōrant', options: ['labōrant', 'puella', 'amīcus', 'et'], explanation: 'Mehrere Subjekte → Verb im Plural (labōrant).' },
    ],
  },
  {
    id: 'imperative-vocative',
    title: 'Imperativ & Vokativ',
    summary: 'Befehlen und Anreden — Rom kommandiert.',
    stage: 'morphology',
    prereqs: ['present-a-conj'],
    explanation:
      'Der **Imperativ** befiehlt. Singular = bloßer Präsensstamm, Plural mit **-te**:\n' +
      '- *Tacē! Tacēte!* → „Schweig! Schweigt!"\n' +
      '- *Venī mēcum!* → „Komm mit mir!"\n\n' +
      'Vier Kurzformen verlieren das -e: **dīc, dūc, fac, fer** (sag, führe, mach, trag).\n\n' +
      'Der **Vokativ** ist der Anredefall. Er gleicht fast immer dem Nominativ — nur die o-Deklination ' +
      'auf -us bildet **-e** (*Mārce!*), Namen auf -ius bilden **-ī** (*Gāī!*).\n' +
      '- *Et tū, Brūte?* → „Auch du, Brutus?" (Caesars letzte Worte)\n\n' +
      'Merke: Befehl: Stamm (+te). Anrede: wie der Nominativ — außer -us → -e: Mārce!',
    cards: [
      { id: 'imp-1', kind: 'mc', prompt: 'Imperativ Plural von „audīre"?', answer: 'audīte', options: ['audī', 'audīte', 'audiunt'], explanation: 'Plural: Präsensstamm + -te → audīte.' },
      { id: 'imp-2', kind: 'mc', prompt: '„Sag!" (an eine Person) heißt …', answer: 'dīc', options: ['dīce', 'dīc', 'dīcite'], explanation: 'dīc, dūc, fac, fer — die vier Kurzformen ohne -e.' },
      { id: 'imp-3', kind: 'fill', prompt: 'Vokativ von „Mārcus"?', answer: 'Marce', explanation: 'o-Deklination auf -us → Vokativ auf -e: Mārce!' },
      { id: 'imp-4', kind: 'order', prompt: 'Befiehl: „Komm mit mir!"', answer: 'venī mēcum', options: ['venīte', 'venī', 'mēcum'], explanation: 'Eine Person → Singular venī. (venīte wäre der Plural.)' },
    ],
  },
  {
    id: 'nouns-o-decl',
    title: 'o-Deklination (m/n)',
    summary: 'Maskulina auf -us/-er und Neutra auf -um.',
    stage: 'morphology',
    prereqs: ['present-a-conj'],
    explanation:
      'o-Deklination, maskulin (*amīcus*): Sg. -us, -ī, -ō, -um, -ō; Pl. -ī, -ōrum, -īs, -ōs, -īs. ' +
      'Auch Wörter auf **-er** (puer, ager) gehören hierher.\n\n' +
      '**Neutrum** (*bellum*): Nominativ = Akkusativ — Singular **-um**, Plural **-a**.\n' +
      '- *Amīcī bella nōn amant.* → „Die Freunde lieben Kriege nicht."\n' +
      '- *Puer dōnum portat.* → „Der Junge trägt ein Geschenk."\n\n' +
      'Merke: Neutrum: Nominativ = Akkusativ — und der Plural endet immer auf -a.',
    cards: [
      { id: 'odecl-1', kind: 'mc', prompt: 'Akkusativ Plural von „amīcus"?', answer: 'amīcōs', options: ['amīcī', 'amīcōs', 'amīcōrum'], explanation: 'Akk. Pl. maskulin: -ōs.' },
      { id: 'odecl-2', kind: 'mc', prompt: 'Wie lautet Nom. Pl. von „bellum"?', answer: 'bella', options: ['bellī', 'bella', 'bellōs'], explanation: 'Neutrum Plural endet auf -a.' },
      { id: 'odecl-3', kind: 'fill', prompt: 'Genitiv Plural von „amīcus"?', answer: 'amicorum', explanation: 'Gen. Pl.: -ōrum → amīcōrum.' },
      { id: 'odecl-4', kind: 'mc', prompt: '„puer" (der Junge) gehört zur …', answer: 'o-Deklination', options: ['a-Deklination', 'o-Deklination', '3. Deklination'], explanation: 'Wörter auf -er (puer, ager) deklinieren nach der o-Deklination: puerī, puerō …' },
    ],
  },
  {
    id: 'adjectives-ao',
    title: 'Adjektive (a/o) & KNG-Kongruenz',
    summary: 'Adjektive richten sich in Kasus, Numerus und Genus.',
    stage: 'morphology',
    prereqs: ['nouns-o-decl'],
    explanation:
      'Adjektive der a/o-Deklination (*bonus, bona, bonum*) richten sich nach ihrem Bezugswort in ' +
      '**K**asus, **N**umerus und **G**enus — der **KNG-Kongruenz**.\n' +
      '- *amīcus bonus* → „der gute Freund" (maskulin)\n' +
      '- *puella bona* → „das gute Mädchen" (feminin)\n' +
      '- *bellum bonum* → „der gute Krieg" (neutrum)\n\n' +
      'Gleiche Merkmale heißt nicht gleiche Endung: *poēta bonus* — poēta ist maskulin, ' +
      'dekliniert aber nach der a-Deklination.\n\n' +
      'Merke: KNG — Kasus, Numerus, Genus. Gleiche Merkmale, nicht gleiche Endung: poēta bonus!',
    cards: [
      { id: 'adj-1', kind: 'mc', prompt: 'Welche Form passt: „puella ___" (gut)?', answer: 'bona', options: ['bonus', 'bona', 'bonum'], explanation: 'puella ist f. → bona.' },
      { id: 'adj-2', kind: 'mc', prompt: 'Welche Form passt: „bellum ___" (groß)?', answer: 'magnum', options: ['magnus', 'magna', 'magnum'], explanation: 'bellum ist n. → magnum.' },
      { id: 'adj-3', kind: 'mc', prompt: 'Welche Form passt: „poētae ___" (Dativ Sg., gut)?', answer: 'bonō', options: ['bonae', 'bonō', 'bonīs'], explanation: 'poēta ist maskulin → Dativ Sg. m.: bonō. Die Endungen dürfen sich unterscheiden!' },
    ],
  },
  {
    id: 'cases-gen-dat-abl',
    title: 'Genitiv, Dativ & Ablativ + Präpositionen',
    summary: 'Die restlichen Kasus und ihre häufigsten Funktionen.',
    stage: 'morphology',
    prereqs: ['adjectives-ao'],
    explanation:
      'Der **Genitiv** (wessen?) zeigt Zugehörigkeit:\n' +
      '- *fīlia agricolae* → „die Tochter des Bauern"\n\n' +
      'Der **Dativ** (wem?) nennt den Empfänger:\n' +
      '- *Amīcō librum dō.* → „Ich gebe dem Freund ein Buch."\n\n' +
      'Der **Ablativ** (womit? wodurch? wo? wann?) ist der Adverbialkasus — oft mit Präposition: ' +
      '**cum** (mit), **ex/ē** (aus), **ab/ā** (von), **dē** (über), **sine** (ohne) + Ablativ. ' +
      'Bei **in** entscheidet die Frage:\n' +
      '- *In oppidō sumus.* → „Wir sind in der Stadt." (wo? → Ablativ)\n' +
      '- *In oppidum properāmus.* → „Wir eilen in die Stadt." (wohin? → Akkusativ)\n\n' +
      'Merke: in + Ablativ = wo. in + Akkusativ = wohin. cum, ex, ab, dē, sine → immer Ablativ.',
    cards: [
      { id: 'case-1', kind: 'mc', prompt: 'Welcher Kasus folgt auf „cum"?', answer: 'Ablativ', options: ['Akkusativ', 'Ablativ', 'Genitiv'], explanation: 'cum (mit) regiert den Ablativ.' },
      { id: 'case-2', kind: 'mc', prompt: '„in oppidum" (mit Akk.) bedeutet …', answer: 'in die Stadt (wohin)', options: ['in der Stadt (wo)', 'in die Stadt (wohin)', 'aus der Stadt'], explanation: 'in + Akk. = Richtung (wohin?).' },
      { id: 'case-3', kind: 'order', prompt: 'Bilde den Satz: „Wir sind in der Stadt." (Ort → in + Ablativ)', answer: 'in oppidō sumus', options: ['sumus', 'in', 'oppidō'], explanation: 'in + Ablativ = Ort (wo?). Verb am Ende.' },
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
      'Das **Imperfekt** erzählt Vergangenes im Verlauf — Tempuszeichen **-bā-**: amābam, amābās, amābat …\n' +
      '- *Diū pugnābant.* → „Sie kämpften lange." (andauernd)\n\n' +
      'Das **Futur I** (a/e-Konjugation): **-bō, -bis, -bit, -bimus, -bitis, -bunt**: amābō, amābis …\n' +
      '- *Crās labōrābō.* → „Morgen werde ich arbeiten."\n\n' +
      'esse: **eram, erās, erat …** (Imperfekt) — **erō, eris, erit …** (Futur).\n\n' +
      'Merke: -bā- erzählt von gestern, -b(i)- blickt nach morgen.',
    cards: [
      { id: 'impf-1', kind: 'fill', prompt: '„er liebte" (Imperfekt) von amāre?', answer: 'amabat', explanation: 'Imperfekt-Zeichen -bā- + -t: amābat.' },
      { id: 'impf-2', kind: 'mc', prompt: '„wir werden sehen" heißt …', answer: 'vidēbimus', options: ['vidēbāmus', 'vidēbimus', 'vidēmus'], explanation: 'Futur I: -bi- + -mus → vidēbimus.' },
      { id: 'impf-3', kind: 'fill', prompt: '„er war" (Imperfekt von esse)?', answer: 'erat', explanation: 'eram, erās, erat …' },
      { id: 'impf-4', kind: 'mc', prompt: '„sie werden loben" heißt …', answer: 'laudābunt', options: ['laudābant', 'laudābunt', 'laudant'], explanation: 'Futur 3. Pl.: -bunt. (laudābant wäre Imperfekt.)' },
    ],
  },
  {
    id: 'nouns-3decl',
    title: '3. Deklination',
    summary: 'Die wichtigste, vielfältigste Deklination.',
    stage: 'morphology',
    prereqs: ['imperfect-future'],
    explanation:
      'Die größte Deklination, erkennbar am **Genitiv -is**. Den Stamm liefert der Genitiv: ' +
      'rēx, rēg**is** → Stamm rēg-.\n\n' +
      'Endungen Sg.: —, -is, -ī, -em, -e; Pl.: -ēs, -um/-ium, -ibus, -ēs, -ibus. ' +
      'Neutra: Nominativ = Akkusativ, Plural **-a/-ia** (corpus → corpora).\n' +
      '- *Rēgem videō.* → „Ich sehe den König."\n' +
      '- *Mīlitēs urbem dēfendunt.* → „Die Soldaten verteidigen die Stadt."\n\n' +
      'Merke: Der Genitiv auf -is verrät den wahren Stamm: rēx → rēgis → rēg-.',
    cards: [
      { id: 'd3-1', kind: 'mc', prompt: 'Akkusativ Singular von „rēx"?', answer: 'rēgem', options: ['rēgis', 'rēgem', 'rēgēs'], explanation: 'Akk. Sg.: Stamm + -em → rēgem.' },
      { id: 'd3-2', kind: 'fill', prompt: 'Ablativ Singular von „rēx"?', answer: 'rege', explanation: 'Abl. Sg.: Stamm + -e → rēge.' },
      { id: 'd3-3', kind: 'mc', prompt: 'Nominativ Plural von „corpus" (n.)?', answer: 'corpora', options: ['corporēs', 'corpora', 'corporī'], explanation: 'Neutra der 3. Dekl.: Plural auf -a → corpora.' },
      { id: 'd3-4', kind: 'mc', prompt: 'Dativ Plural von „mīles, mīlitis"?', answer: 'mīlitibus', options: ['mīlitīs', 'mīlitibus', 'mīlitum'], explanation: 'Dat./Abl. Pl.: -ibus.' },
    ],
  },
  {
    id: 'verbs-3-4-conj',
    title: 'Konsonantische, i- & gemischte Konjugation',
    summary: '3., i- und gemischte Konjugation im Präsens.',
    stage: 'morphology',
    prereqs: ['nouns-3decl'],
    explanation:
      'Konsonantische Konjugation (*dūcere*): dūcō, dūcis, dūcit, dūcimus, dūcitis, **dūcunt**.\n' +
      'i-Konjugation (*audīre*): audiō, audīs, audit, audīmus, audītis, **audiunt**.\n' +
      'Gemischte Konjugation (*capere*): capiō, capis, capit … **capiunt**.\n' +
      '- *Mīlitēs ducem audiunt.* → „Die Soldaten hören den Anführer."\n\n' +
      'Der Bindevokal ist hier kurz (-i-/-u-), nicht lang wie bei amā-/vidē-.\n\n' +
      'Merke: dūcunt, nicht dūcent — kurze Bindevokale i und u tragen diese Konjugationen.',
    cards: [
      { id: 'c34-1', kind: 'mc', prompt: '3. Person Plural von „dūcere"?', answer: 'dūcunt', options: ['dūcent', 'dūcunt', 'dūciunt'], explanation: 'kons. Konjug.: -unt → dūcunt.' },
      { id: 'c34-2', kind: 'mc', prompt: '1. Person Singular von „capere"?', answer: 'capiō', options: ['capō', 'capiō', 'capeō'], explanation: 'Gemischte Konjugation: capiō, capis, capit.' },
      { id: 'c34-3', kind: 'fill', prompt: '3. Person Plural von „audīre"?', answer: 'audiunt', explanation: 'i-Konjugation: audiunt.' },
    ],
  },
  {
    id: 'perfect-system',
    title: 'Perfektsystem',
    summary: 'Perfekt, Plusquamperfekt, Futur II – vollendete Handlungen.',
    stage: 'morphology',
    prereqs: ['verbs-3-4-conj'],
    explanation:
      'Das **Perfekt** erzählt abgeschlossene Handlungen — mit eigenen Endungen am Perfektstamm ' +
      '(3. Stammform): **-ī, -istī, -it, -imus, -istis, -ērunt**.\n' +
      '- *Vēnī, vīdī, vīcī.* → „Ich kam, sah und siegte." (Caesar)\n' +
      '- *Amīcī Rōmam vēnērunt.* → „Die Freunde sind nach Rom gekommen."\n\n' +
      '**Plusquamperfekt** = Perfektstamm + -eram (Vorvergangenheit): vēneram = „ich war gekommen".\n' +
      '**Futur II** = Perfektstamm + -erō: vēnerō = „ich werde gekommen sein".\n\n' +
      'Merke: -ī, -istī, -it, -imus, -istis, -ērunt — nur das Perfekt hat eigene Endungen.',
    cards: [
      { id: 'perf-1', kind: 'mc', prompt: '„sie haben geliebt" (Perfekt)?', answer: 'amāvērunt', options: ['amābant', 'amāvērunt', 'amant'], explanation: 'Perfekt 3. Pl.: -ērunt → amāvērunt.' },
      { id: 'perf-2', kind: 'fill', prompt: '„ich habe gesehen" (Perfektstamm vīd-)?', answer: 'vidi', explanation: 'Perfekt 1. Sg.: -ī → vīdī.' },
      { id: 'perf-3', kind: 'mc', prompt: '„sie hatten gerufen" (Plusquamperfekt von vocāre)?', answer: 'vocāverant', options: ['vocāvērunt', 'vocāverant', 'vocābant'], explanation: 'Plusquamperfekt: Perfektstamm + -erant.' },
    ],
  },
  {
    id: 'adverbs-comparison',
    title: 'Adverbien & Steigerung',
    summary: 'Wie? — und der Vergleich: Komparativ und Superlativ.',
    stage: 'morphology',
    prereqs: ['nouns-3decl'],
    explanation:
      '**Adverbien** beschreiben das Verb (wie?). Bildung: a/o-Adjektive mit **-ē** (longus → longē), ' +
      '3. Deklination mit **-iter** (fortis → fortiter).\n' +
      '- *Fortiter pugnat.* → „Er kämpft tapfer."\n\n' +
      'Der **Komparativ**: Stamm + **-ior** (m./f.) / **-ius** (n.) — dekliniert nach der 3. Deklination. ' +
      'Der Vergleich steht mit **quam**:\n' +
      '- *Mārcus fortior quam Quīntus est.* → „Marcus ist tapferer als Quintus."\n\n' +
      'Der **Superlativ**: Stamm + **-issimus, -a, -um** (fortissimus); Adjektive auf -er: **-errimus** (pulcherrimus).\n\n' +
      'Unregelmäßig: bonus → melior → optimus; malus → peior → pessimus; magnus → maior → maximus; parvus → minor → minimus.\n\n' +
      'Merke: -ior steigert, -issimus krönt: bonus, melior, optimus — gut, besser, am besten.',
    cards: [
      { id: 'comp-1', kind: 'mc', prompt: 'Komparativ von „longus"?', answer: 'longior', options: ['longissimus', 'longior', 'longē'], explanation: 'Stamm + -ior → longior. (longē ist das Adverb.)' },
      { id: 'comp-2', kind: 'mc', prompt: 'Superlativ von „pulcher"?', answer: 'pulcherrimus', options: ['pulchissimus', 'pulcherrimus', 'pulchrior'], explanation: 'Adjektive auf -er: -errimus → pulcherrimus.' },
      { id: 'comp-3', kind: 'mc', prompt: '„besser" heißt …', answer: 'melior', options: ['magis', 'melior', 'optimus'], explanation: 'bonus → melior → optimus.' },
      { id: 'comp-4', kind: 'fill', prompt: 'Adverb zu „fortis" (tapfer)?', answer: 'fortiter', explanation: '3. Deklination: -iter → fortiter.' },
      { id: 'comp-5', kind: 'order', prompt: 'Bilde: „Marcus ist tapferer als Quintus."', answer: 'Mārcus fortior quam Quīntus est', options: ['quam', 'Mārcus', 'est', 'fortior', 'Quīntus'], explanation: 'Komparativ + quam (als) + Vergleichsglied.' },
    ],
  },
  {
    id: 'nouns-4-5-decl',
    title: '4. & 5. Deklination, 3. Dekl. Adjektive',
    summary: 'u-Deklination, e-Deklination und die i-Stämme.',
    stage: 'morphology',
    prereqs: ['perfect-system'],
    explanation:
      '4. Deklination (*manus, manūs* — feminin!): Sg. -us, -ūs, -uī, -um, -ū; Pl. -ūs, -uum, -ibus, -ūs, -ibus.\n\n' +
      '5. Deklination (*rēs, reī* f.): Genitiv **-eī** — klein, aber überall:\n' +
      '- *rēs pūblica* → „der Staat" (wörtlich: die öffentliche Sache)\n\n' +
      'Adjektive der **3. Deklination** (*fortis, forte*; *ācer, ācris, ācre*) folgen der i-Deklination: ' +
      'Ablativ Sg. **-ī**, Genitiv Pl. **-ium**, Neutrum Pl. **-ia**.\n' +
      '- *omnia vincit amor* → „Liebe besiegt alles" (Vergil)\n\n' +
      'Merke: manus bleibt feminin trotz -us. rēs, reī — die e-Deklination regiert die rēs pūblica.',
    cards: [
      { id: 'd45-1', kind: 'mc', prompt: 'Genitiv Singular von „manus"?', answer: 'manūs', options: ['manī', 'manūs', 'manuis'], explanation: '4. Deklination: Gen. Sg. -ūs.' },
      { id: 'd45-2', kind: 'mc', prompt: 'Welches Genus hat „manus" (die Hand)?', answer: 'feminin', options: ['maskulin', 'feminin', 'neutrum'], explanation: 'manus ist trotz -us feminin — wie viele Wörter der u-Deklination.' },
      { id: 'd45-3', kind: 'fill', prompt: 'Genitiv Singular von „rēs"?', answer: 'rei', explanation: '5. Deklination: reī.' },
      { id: 'd45-4', kind: 'mc', prompt: 'Neutrum Plural von „omnis"?', answer: 'omnia', options: ['omnēs', 'omnia', 'omnium'], explanation: 'i-Stämme: Neutrum Plural -ia → omnia.' },
    ],
  },
  {
    id: 'pronouns',
    title: 'Pronomina',
    summary: 'Personal-, Demonstrativ- und Relativpronomen.',
    stage: 'morphology',
    prereqs: ['nouns-4-5-decl'],
    explanation:
      'Personalpronomina: **ego, tū, nōs, vōs** — das Reflexivum **sē** zeigt zurück aufs Subjekt.\n\n' +
      'Demonstrativa: **is, ea, id** (er/sie/es; dieser), **hic, haec, hoc** (dieser hier), ' +
      '**ille, illa, illud** (jener dort).\n' +
      '- *Eum videō.* → „Ich sehe ihn."\n\n' +
      'Das **Relativpronomen quī, quae, quod** leitet Relativsätze ein: Genus und Numerus richten ' +
      'sich nach dem Bezugswort, der Kasus nach der Funktion im Relativsatz.\n' +
      '- *Puella, quam videō, cantat.* → „Das Mädchen, das ich sehe, singt." (quam = Objekt im Relativsatz)\n\n' +
      'Merke: Relativpronomen: Genus & Numerus vom Bezugswort — Kasus vom eigenen Satz.',
    cards: [
      { id: 'pro-1', kind: 'mc', prompt: '„hic, haec, hoc" bedeutet …', answer: 'dieser (hier)', options: ['jener (dort)', 'dieser (hier)', 'irgendeiner'], explanation: 'hic zeigt auf Nahes, ille auf Fernes.' },
      { id: 'pro-2', kind: 'mc', prompt: 'Welche Form passt: „Puella, ___ videō, cantat."?', answer: 'quam', options: ['quae', 'quam', 'cui'], explanation: 'Objekt im Relativsatz → Akkusativ feminin: quam.' },
      { id: 'pro-3', kind: 'fill', prompt: 'Akkusativ Singular von „is" (maskulin)?', answer: 'eum', explanation: 'is → eum (Akk. Sg. m.).' },
      { id: 'pro-4', kind: 'mc', prompt: '„sich" (reflexiv) heißt …', answer: 'sē', options: ['eum', 'sē', 'suus'], explanation: 'sē zeigt auf das Subjekt des Satzes zurück.' },
    ],
  },

  // ════════════════════════ SYNTAX ════════════════════════
  {
    id: 'passive',
    title: 'Passiv',
    summary: 'Passivendungen in allen Zeiten des Präsensstamms.',
    stage: 'syntax',
    prereqs: ['pronouns'],
    explanation:
      'Das Passiv hat eigene Personalendungen am Präsensstamm: **-or, -ris, -tur, -mur, -minī, -ntur**.\n' +
      '- *Amor.* → „Ich werde geliebt."\n' +
      '- *Urbs ā mīlitibus dēfenditur.* → „Die Stadt wird von den Soldaten verteidigt."\n\n' +
      'Der Urheber steht mit **ā/ab + Ablativ**, Mittel und Werkzeug im bloßen Ablativ.\n\n' +
      'Imperfekt: amābar, amābāris … Futur: amābor, amāberis …\n\n' +
      'Im **Perfekt** ist das Passiv zusammengesetzt — PPP + esse:\n' +
      '- *Laudāta est.* → „Sie ist gelobt worden."\n\n' +
      'Merke: -r ist das Siegel des Passivs: amor, amāris, amātur. Der Täter steht mit ā/ab im Ablativ.',
    cards: [
      { id: 'pass-1', kind: 'mc', prompt: '„er wird gerufen" heißt …', answer: 'vocātur', options: ['vocat', 'vocātur', 'vocābātur'], explanation: 'Präsens Passiv 3. Sg.: -tur → vocātur.' },
      { id: 'pass-2', kind: 'mc', prompt: 'Wie steht der Urheber beim Passiv?', answer: 'ā/ab + Ablativ', options: ['cum + Ablativ', 'ā/ab + Ablativ', 'Genitiv'], explanation: 'ā mīlitibus = von den Soldaten.' },
      { id: 'pass-3', kind: 'fill', prompt: '„wir werden gehört" (Präsens Passiv von audīre)?', answer: 'audimur', explanation: '1. Pl. Passiv: -mur → audīmur.' },
      { id: 'pass-4', kind: 'mc', prompt: '„Sie ist gelobt worden" heißt …', answer: 'laudāta est', options: ['laudāta est', 'laudātur', 'laudābātur'], explanation: 'Perfekt Passiv = PPP + esse: laudāta est.' },
    ],
  },
  {
    id: 'participles',
    title: 'Partizipien & Participium coniunctum',
    summary: 'PPP, PPA, PFA und ihr satzwertiger Gebrauch.',
    stage: 'syntax',
    prereqs: ['passive'],
    explanation:
      'Drei Partizipien:\n' +
      '**PPP** (Perfekt Passiv): laudātus = „gelobt (worden)" — **vorzeitig**.\n' +
      '**PPA** (Präsens Aktiv): laudāns, laudantis = „lobend" — **gleichzeitig**.\n' +
      '**PFA** (Futur Aktiv): laudātūrus = „im Begriff zu loben" — **nachzeitig**.\n\n' +
      'Als **Participium coniunctum (PC)** schmiegt sich das Partizip per KNG an ein Bezugswort ' +
      'und ersetzt einen ganzen Nebensatz:\n' +
      '- *Puella vocāta venit.* → „Nachdem das Mädchen gerufen worden war, kam es."\n' +
      '- *Rīdēns respondit.* → „Lachend antwortete er."\n\n' +
      'Übersetze mit Nebensatz (als, weil, obwohl), Relativsatz oder Präpositionalausdruck.\n\n' +
      'Merke: PPP = vorher (gelobt), PPA = währenddessen (lobend), PFA = nachher (im Begriff zu loben).',
    cards: [
      { id: 'part-1', kind: 'mc', prompt: 'Welches Partizip ist vorzeitig?', answer: 'PPP', options: ['PPA', 'PPP', 'PFA'], explanation: 'Das PPP beschreibt, was vor dem Hauptverb geschah.' },
      { id: 'part-2', kind: 'mc', prompt: '„laudāns" bedeutet …', answer: 'lobend', options: ['gelobt', 'lobend', 'im Begriff zu loben'], explanation: 'PPA = gleichzeitig: lobend.' },
      { id: 'part-3', kind: 'mc', prompt: 'Beste Übersetzung von „Puella vocāta venit"?', answer: 'Nachdem das Mädchen gerufen worden war, kam es.', options: ['Das Mädchen ruft und kommt.', 'Nachdem das Mädchen gerufen worden war, kam es.', 'Das Mädchen wird gerufen werden.'], explanation: 'PPP vocāta = vorzeitig und passiv.' },
      { id: 'part-4', kind: 'fill', prompt: 'PPA von „amāre" (Nominativ Sg.)?', answer: 'amans', explanation: 'Präsensstamm + -ns → amāns.' },
    ],
  },
  {
    id: 'aci',
    title: 'AcI & NcI',
    summary: 'Accusativus / Nominativus cum Infinitivo — indirekte Aussagen.',
    stage: 'syntax',
    prereqs: ['participles'],
    explanation:
      'Nach Verben des Sagens, Meinens und Wahrnehmens (**Kopfverben**) steht der **AcI**: ' +
      'Subjekt im **Akkusativ** + **Infinitiv** — im Deutschen ein „dass"-Satz.\n' +
      '- *Dīcō puellam aquam amāre.* → „Ich sage, dass das Mädchen das Wasser liebt."\n' +
      '- *Audīmus Rōmānōs vēnisse.* → „Wir hören, dass die Römer gekommen sind."\n\n' +
      'Das **Zeitverhältnis** trägt der Infinitiv: Präsens = gleichzeitig, Perfekt (vēnisse) = vorzeitig, ' +
      'Futur (ventūrum esse) = nachzeitig.\n\n' +
      'Der **NcI** ist das passive Gegenstück, vor allem bei *dīcitur* und *vidētur*:\n' +
      '- *Homērus caecus fuisse dīcitur.* → „Homer soll blind gewesen sein."\n\n' +
      'Merke: Kopfverb + Akkusativ + Infinitiv = „dass"-Satz. dīcitur + NcI = „er soll …".',
    cards: [
      { id: 'aci-1', kind: 'mc', prompt: 'Was löst einen AcI aus?', answer: 'ein Kopfverb (sagen, meinen, sehen)', options: ['eine Präposition', 'ein Kopfverb (sagen, meinen, sehen)', 'ut + Konjunktiv'], explanation: 'Verben des Sagens, Meinens, Wahrnehmens.' },
      { id: 'aci-2', kind: 'mc', prompt: 'Übersetze: „Sciō tē venīre."', answer: 'Ich weiß, dass du kommst.', options: ['Ich weiß, dass du kommst.', 'Ich weiß, dass du gekommen bist.', 'Ich weiß, dass du kommen wirst.'], explanation: 'Infinitiv Präsens = gleichzeitig.' },
      { id: 'aci-3', kind: 'mc', prompt: 'Der Infinitiv Perfekt im AcI bedeutet …', answer: 'Vorzeitigkeit', options: ['Gleichzeitigkeit', 'Vorzeitigkeit', 'Nachzeitigkeit'], explanation: 'vēnisse = „gekommen zu sein" → vorzeitig.' },
      { id: 'aci-4', kind: 'order', prompt: 'Bilde den AcI: „Ich sage, dass das Mädchen singt."', answer: 'dīcō puellam cantāre', options: ['cantāre', 'dīcō', 'cantat', 'puellam'], explanation: 'Subjekt im Akkusativ (puellam) + Infinitiv (cantāre). cantat bleibt übrig!' },
    ],
  },
  {
    id: 'subjunctive',
    title: 'Konjunktiv im Nebensatz',
    summary: 'Konjunktivbildung; ut-, nē- und cum-Sätze.',
    stage: 'syntax',
    prereqs: ['aci'],
    explanation:
      'Der **Konjunktiv** ist der Modus der Vorstellung. Bildung im Präsens: a-Konjugation mit **-ē-** ' +
      '(amet), alle anderen mit **-ā-** (videat, dūcat, audiat). Imperfekt: Infinitiv + Endung (amāret, esset).\n\n' +
      'Im Nebensatz bleibt er meist unübersetzt — entscheidend ist die Konjunktion:\n' +
      '**ut** + Konj. = „damit" (final) / „sodass" (konsekutiv), **nē** = „damit nicht", ' +
      '**cum** + Konj. = „als / weil / obwohl".\n' +
      '- *Discimus, ut sapientēs sīmus.* → „Wir lernen, damit wir weise sind."\n' +
      '- *Cum Rōmam vēnisset, forum vīsitāvit.* → „Als er nach Rom gekommen war, besuchte er das Forum."\n\n' +
      'Merke: ut + Konjunktiv: damit/sodass. cum + Konjunktiv: als, weil, obwohl.',
    cards: [
      { id: 'konj-1', kind: 'mc', prompt: 'Konjunktiv Präsens, 3. Sg. von „amāre"?', answer: 'amet', options: ['amat', 'amet', 'amābit'], explanation: 'a-Konjugation bildet den Konj. Präsens mit -ē-: amet.' },
      { id: 'konj-2', kind: 'mc', prompt: '„ut" + Konjunktiv bedeutet final …', answer: 'damit', options: ['weil', 'damit', 'obwohl'], explanation: 'Finalsatz: ut = damit; verneint nē = damit nicht.' },
      { id: 'konj-3', kind: 'mc', prompt: 'Konjunktiv Präsens von „dūcere" (3. Sg.)?', answer: 'dūcat', options: ['dūcet', 'dūcat', 'dūcit'], explanation: 'Nicht-a-Konjugationen bilden mit -ā-: dūcat. (dūcet wäre Futur!)' },
      { id: 'konj-4', kind: 'fill', prompt: 'Konjunktiv Imperfekt, 3. Sg. von „esse"?', answer: 'esset', explanation: 'Infinitiv esse + -t → esset.' },
    ],
  },
  {
    id: 'subjunctive-main',
    title: 'Konjunktiv im Hauptsatz',
    summary: 'Wünschen, Auffordern, Zweifeln — Hortativ bis Potentialis.',
    stage: 'syntax',
    prereqs: ['subjunctive'],
    explanation:
      'Im Hauptsatz spricht der Konjunktiv mit eigener Kraft:\n\n' +
      '**Hortativ** — Aufforderung an uns selbst:\n' +
      '- *Gaudeāmus igitur!* → „Freuen wir uns also!"\n' +
      '**Iussiv** — Befehl an Dritte: *Audiat!* = „Er soll hören!"\n' +
      '**Optativ** — Wunsch, oft mit utinam:\n' +
      '- *Utinam venīret!* → „Wenn er doch käme!"\n' +
      '**Prohibitiv** — Verbot: *Nē timuerīs!* = „Fürchte dich nicht!"\n' +
      '**Deliberativ** — Zweifelsfrage: *Quid faciam?* = „Was soll ich tun?"\n' +
      '**Potentialis** — Möglichkeit: *Dīcat aliquis* = „Es könnte jemand sagen".\n\n' +
      'Merke: Gaudeāmus! — Hortativ. Utinam! — Optativ. Quid faciam? — Deliberativ.',
    cards: [
      { id: 'kmain-1', kind: 'mc', prompt: '„Gaudeāmus!" ist ein …', answer: 'Hortativ (Freuen wir uns!)', options: ['Optativ', 'Hortativ (Freuen wir uns!)', 'Iussiv'], explanation: '1. Person Plural = Aufforderung an die eigene Gruppe.' },
      { id: 'kmain-2', kind: 'mc', prompt: '„Utinam venīret!" drückt aus …', answer: 'einen Wunsch', options: ['einen Befehl', 'einen Wunsch', 'eine Möglichkeit'], explanation: 'utinam + Konjunktiv = Optativ (Wunsch).' },
      { id: 'kmain-3', kind: 'mc', prompt: '„Quid faciam?" heißt …', answer: 'Was soll ich tun?', options: ['Was mache ich?', 'Was soll ich tun?', 'Was habe ich getan?'], explanation: 'Deliberativ: zweifelnde Frage an sich selbst.' },
    ],
  },

  // ════════════════════════ ADVANCED ════════════════════════
  {
    id: 'deponents-irregular',
    title: 'Deponentien & unregelmäßige Verben',
    summary: 'Passivform – Aktivbedeutung; velle, ferre, īre, fierī.',
    stage: 'advanced',
    prereqs: ['subjunctive'],
    explanation:
      '**Deponentien** tragen Passivformen, bedeuten aber Aktives:\n' +
      '- *Rōmānī hostēs sequuntur.* → „Die Römer verfolgen die Feinde."\n' +
      'Wichtig: cōnārī (versuchen), loquī (sprechen), patī (erleiden), morī (sterben), hortārī (ermahnen).\n\n' +
      '**Semideponentien** mischen: aktives Präsens, passives Perfekt — audeō, ausus sum (wagen).\n\n' +
      '**Unregelmäßige Verben**: velle (volō, vīs, vult — wollen), nōlle (nicht wollen), mālle (lieber wollen), ' +
      'ferre (ferō, fers, fert — tragen), īre (eō, īs, it — gehen), fierī (werden, geschehen).\n' +
      '- *Nōlī timēre!* → „Fürchte dich nicht!" (nōlī + Infinitiv = höfliches Verbot)\n\n' +
      'Merke: Deponens = Passivkleid, Aktivherz: hortor — ich ermahne. Verbot: nōlī + Infinitiv.',
    cards: [
      { id: 'dep-1', kind: 'mc', prompt: '„loquitur" bedeutet …', answer: 'er spricht', options: ['er wird gesprochen', 'er spricht', 'er sprach'], explanation: 'loquī ist Deponens: Passivform, aktive Bedeutung.' },
      { id: 'dep-2', kind: 'mc', prompt: '„sie wollen" heißt …', answer: 'volunt', options: ['velint', 'volunt', 'vult'], explanation: 'velle: volō, vīs, vult, volumus, vultis, volunt.' },
      { id: 'dep-3', kind: 'fill', prompt: '3. Person Singular von „ferre"?', answer: 'fert', explanation: 'ferō, fers, fert — ohne Bindevokal.' },
      { id: 'dep-4', kind: 'mc', prompt: '„Nōlī timēre!" bedeutet …', answer: 'Fürchte dich nicht!', options: ['Er fürchtet sich nicht.', 'Fürchte dich nicht!', 'Ich will mich nicht fürchten.'], explanation: 'nōlī + Infinitiv = Verbot an die 2. Person.' },
    ],
  },
  {
    id: 'ablative-absolute',
    title: 'Ablativus absolutus',
    summary: 'Die satzwertige Konstruktion im Ablativ.',
    stage: 'advanced',
    prereqs: ['deponents-irregular'],
    explanation:
      'Ein Substantiv + Partizip im **Ablativ**, grammatisch vom Satz „losgelöst" (absolūtus) — ' +
      'ersetzt einen ganzen Adverbialsatz:\n' +
      '- *Urbe captā Rōmānī gaudēbant.* → „Nachdem die Stadt erobert worden war, freuten sich die Römer."\n' +
      '- *Caesare dūcente mīlitēs pugnant.* → „Während Caesar führt, kämpfen die Soldaten."\n\n' +
      'PPP = vorzeitig, PPA = gleichzeitig. Übersetze je nach Kontext mit: nachdem, während, weil, obwohl.\n\n' +
      'Auch **ohne Partizip** (nominaler Abl. abs.):\n' +
      '- *Cicerōne cōnsule* → „als Cicero Konsul war"\n\n' +
      'Merke: Nomen + Partizip im Ablativ, vom Satz losgelöst: urbe captā — nachdem die Stadt erobert war.',
    cards: [
      { id: 'abl-1', kind: 'mc', prompt: '„urbe captā" übersetzt man …', answer: 'nachdem die Stadt erobert worden war', options: ['die eroberte Stadt', 'nachdem die Stadt erobert worden war', 'um die Stadt zu erobern'], explanation: 'Abl. abs. mit PPP → vorzeitiger Nebensatz.' },
      { id: 'abl-2', kind: 'mc', prompt: 'Der Abl. abs. mit PPA ist …', answer: 'gleichzeitig', options: ['vorzeitig', 'gleichzeitig', 'nachzeitig'], explanation: 'PPA = gleichzeitig: Caesare dūcente = während Caesar führt.' },
      { id: 'abl-3', kind: 'mc', prompt: '„Cicerōne cōnsule" heißt …', answer: 'als Cicero Konsul war', options: ['als Cicero Konsul war', 'weil Cicero den Konsul sah', 'Cicero und der Konsul'], explanation: 'Nominaler Abl. abs. — ohne Partizip.' },
    ],
  },
  {
    id: 'gerund-gerundive',
    title: 'Gerundium & Gerundivum',
    summary: 'Verbalsubstantiv, Verbaladjektiv und das „Müssen".',
    stage: 'advanced',
    prereqs: ['ablative-absolute'],
    explanation:
      'Das **Gerundium** ist der substantivierte Infinitiv (nur Singular): laudandī, laudandō, (ad) laudandum.\n' +
      '- *ars vīvendī* → „die Kunst zu leben"\n' +
      '- *ad discendum* → „zum Lernen"\n\n' +
      'Das **Gerundivum** (laudandus, -a, -um) ist ein Verbaladjektiv. Mit **esse** drückt es ' +
      '**Notwendigkeit** aus:\n' +
      '- *Cēterum cēnseō Carthāginem esse dēlendam.* → „Im Übrigen meine ich, dass Karthago zerstört werden muss." (Cato)\n' +
      '- *Liber legendus est.* → „Das Buch muss gelesen werden."\n\n' +
      'Wer handeln muss, steht im **Dativ** (dativus auctoris): *Liber mihi legendus est.* = „Ich muss das Buch lesen."\n\n' +
      'Merke: -nd- als Substantiv = Gerundium (ars vīvendī). -ndus + esse = müssen: Carthāgō dēlenda est.',
    cards: [
      { id: 'ger-1', kind: 'mc', prompt: '„Carthāgō dēlenda est" bedeutet …', answer: 'Karthago muss zerstört werden.', options: ['Karthago wird zerstört.', 'Karthago muss zerstört werden.', 'Karthago wurde zerstört.'], explanation: 'Gerundiv + esse = Notwendigkeit.' },
      { id: 'ger-2', kind: 'mc', prompt: '„ars vīvendī" heißt …', answer: 'die Kunst zu leben', options: ['die lebendige Kunst', 'die Kunst zu leben', 'die Kunst wird leben'], explanation: 'Gerundium im Genitiv: vīvendī = des Lebens / zu leben.' },
      { id: 'ger-3', kind: 'mc', prompt: 'Wer handeln muss, steht beim Gerundiv im …', answer: 'Dativ', options: ['Ablativ', 'Dativ', 'Genitiv'], explanation: 'Dativus auctoris: mihi legendus est = ich muss lesen.' },
    ],
  },
  {
    id: 'conditionals',
    title: 'Konditionalsätze (sī)',
    summary: 'Realis, Potentialis, Irrealis — was wäre, wenn.',
    stage: 'advanced',
    prereqs: ['subjunctive-main'],
    explanation:
      'Drei Stufen des Wenn:\n\n' +
      '**Realis** (Indikativ) — der Fall ist real möglich:\n' +
      '- *Sī hoc dīcis, errās.* → „Wenn du das sagst, irrst du."\n' +
      '**Potentialis** (Konjunktiv Präsens) — denkbar:\n' +
      '- *Sī hoc dīcās, errēs.* → „Solltest du das sagen, dürftest du wohl irren."\n' +
      '**Irrealis der Gegenwart** (Konjunktiv Imperfekt) — nicht der Fall:\n' +
      '- *Sī hoc dīcerēs, errārēs.* → „Wenn du das sagtest, würdest du irren."\n' +
      '**Irrealis der Vergangenheit** (Konjunktiv Plusquamperfekt):\n' +
      '- *Sī hoc dīxissēs, errāvissēs.* → „Hättest du das gesagt, hättest du geirrt."\n\n' +
      'Verneint wird mit **nisi** (wenn nicht).\n\n' +
      'Merke: Indikativ = real. Konjunktiv Imperfekt = Irrealis jetzt. Plusquamperfekt = Irrealis damals.',
    cards: [
      { id: 'cond-1', kind: 'mc', prompt: 'Konjunktiv Imperfekt im sī-Satz drückt aus …', answer: 'Irrealis der Gegenwart', options: ['Realis', 'Irrealis der Gegenwart', 'Irrealis der Vergangenheit'], explanation: 'dīcerēs (Konj. Impf.) → jetzt nicht der Fall.' },
      { id: 'cond-2', kind: 'mc', prompt: '„Sī vēnissēs, vīdissēs." heißt …', answer: 'Wärst du gekommen, hättest du es gesehen.', options: ['Wenn du kommst, siehst du es.', 'Wärst du gekommen, hättest du es gesehen.', 'Solltest du kommen, würdest du es sehen.'], explanation: 'Konj. Plusquamperfekt = Irrealis der Vergangenheit.' },
      { id: 'cond-3', kind: 'mc', prompt: '„wenn nicht" heißt …', answer: 'nisi', options: ['nē', 'nisi', 'num'], explanation: 'nisi leitet den verneinten Konditionalsatz ein.' },
    ],
  },
  {
    id: 'oratio-obliqua',
    title: 'Indirekte Fragen & Rede',
    summary: 'Fragewort + Konjunktiv; die ōrātiō oblīqua.',
    stage: 'advanced',
    prereqs: ['conditionals'],
    explanation:
      '**Indirekte Fragesätze** stehen mit Fragewort + **Konjunktiv**:\n' +
      '- *Nesciō, quid faciās.* → „Ich weiß nicht, was du tust."\n' +
      '- *Quaerō, num vēnerit.* → „Ich frage, ob er gekommen ist." (num = ob)\n\n' +
      'Die **ōrātiō oblīqua** gibt fremde Rede wieder: Hauptsätze werden zu AcI, ' +
      'Nebensätze stehen im Konjunktiv.\n\n' +
      'Auch **konjunktivische Relativsätze** tragen Nebensinn — final, kausal oder konsekutiv:\n' +
      '- *Lēgātī missī sunt, quī pācem peterent.* → „Gesandte wurden geschickt, um Frieden zu erbitten."\n\n' +
      'Merke: Indirekte Frage → immer Konjunktiv. num = ob. quī + Konjunktiv = um zu (final).',
    cards: [
      { id: 'oo-1', kind: 'mc', prompt: 'Indirekte Fragesätze stehen im …', answer: 'Konjunktiv', options: ['Indikativ', 'Konjunktiv', 'Infinitiv'], explanation: 'Fragewort + Konjunktiv: Nesciō, quid faciās.' },
      { id: 'oo-2', kind: 'mc', prompt: '„Nesciō, quid faciās" heißt …', answer: 'Ich weiß nicht, was du tust.', options: ['Ich weiß nicht, was ich tue.', 'Ich weiß nicht, was du tust.', 'Ich frage, ob du es getan hast.'], explanation: 'faciās = 2. Person Konjunktiv Präsens.' },
      { id: 'oo-3', kind: 'mc', prompt: '„num" leitet in der indirekten Frage ein:', answer: '„ob"', options: ['„dass"', '„ob"', '„weil"'], explanation: 'Quaerō, num vēnerit = Ich frage, ob er gekommen ist.' },
    ],
  },
];
