/**
 * Deterministic Latin inflection engine.
 *
 * Generates full paradigm tables (declension / conjugation) from lemma
 * metadata stored in the database — no AI required for known words.
 * The `info` field encodes the inflection class; `principalParts` supply
 * the stems needed to apply the correct pattern.
 *
 * Supported classes (parsed from `info`):
 *   Nouns:  a-Deklination | o-Deklination | kons. Deklination | i-Deklination
 *           gemischte Deklination | e-Deklination | u-Deklination
 *   Verbs:  a-Konjugation | e-Konjugation | kons. Konjugation | i-Konjugation
 *           unregelmäßig (returns null — needs AI fallback)
 *   Adj:    a/o-Deklination | 3. Deklination (two-endings / one-ending)
 *
 * Returns the same Paradigm shape used by the existing ParadigmTable +
 * Formentrainer components, so the reference tab reuses them directly.
 */

import { db } from '@/db/client';
import { lemmas, wordForms } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { Paradigm } from '@/data/paradigms';

// ── Public API ────────────────────────────────────────────────────────────

export type LookupResult = {
  /** The generated paradigm, ready for ParadigmTable rendering. */
  paradigm: Paradigm;
  /** The canonical lemma entry from the database. */
  lemma: { id: number; lemma: string; pos: string; principalParts: string | null; info: string | null; glossDe: string };
} | null;

/**
 * Look up a Latin word (any surface form, with or without macrons) and
 * return its full inflection paradigm.  Returns null when the word is not
 * in the database or its inflection class is unsupported (irregular).
 *
 * Handles both macron-bearing input (rēx) and macron-free input (rex)
 * by searching the canonical `wordForms` table which stores macron-free
 * normalised forms.
 */
export function lookupWord(raw: string): LookupResult {
  const q = raw.trim().toLowerCase();
  if (!q) return null;

  // 1. Find lemma via surface-form mapping.
  const wf = db.select().from(wordForms).where(eq(wordForms.form, q)).get();
  if (!wf) return null;

  const lemma = db.select().from(lemmas).where(eq(lemmas.id, wf.lemmaId)).get();
  if (!lemma) return null;

  // 2. Generate paradigm from lemma metadata.
  const paradigm = generateParadigm(lemma);
  if (!paradigm) return null;

  return { paradigm, lemma: lemma as NonNullable<LookupResult>['lemma'] };
}

/**
 * Search lemmas whose lemma or principalParts contain the query string.
 * Useful for autocomplete / typeahead in the lookup bar.
 */
export function searchLemmas(q: string): { id: number; lemma: string; glossDe: string }[] {
  const norm = q.trim().toLowerCase();
  if (!norm || norm.length < 2) return [];
  const like = `%${norm}%`;
  return db
    .select({ id: lemmas.id, lemma: lemmas.lemma, glossDe: lemmas.glossDe })
    .from(lemmas)
    .where(
      sql`(${lemmas.lemma} LIKE ${like} OR ${lemmas.principalParts} LIKE ${like})`,
    )
    .limit(12)
    .all();
}

// ── Paradigm generation ───────────────────────────────────────────────────

const CASES = ['Nominativ', 'Genitiv', 'Dativ', 'Akkusativ', 'Ablativ'];
const PERSONS = ['1. Person', '2. Person', '3. Person'];
const SG_PL = ['Singular', 'Plural'];

function nounParadigm(
  id: string,
  title: string,
  subtitle: string,
  topicId: string,
  forms: [string, string][],
): Paradigm {
  return { id, title, subtitle, kind: 'noun', topicId, cols: SG_PL, rows: CASES.map((l, i) => ({ label: l, cells: forms[i] })) };
}

function verbParadigm(
  id: string,
  title: string,
  subtitle: string,
  topicId: string,
  forms: [string, string][],
): Paradigm {
  return { id, title, subtitle, kind: 'verb', topicId, cols: SG_PL, rows: PERSONS.map((l, i) => ({ label: l, cells: forms[i] })) };
}

function generateParadigm(lemma: { id: number; lemma: string; pos: string; principalParts: string | null; info: string | null; glossDe: string }): Paradigm | null {
  const info = (lemma.info ?? '').trim();
  const pp = (lemma.principalParts ?? '').trim();
  const id = `lookup-${lemma.id}`;

  if (lemma.pos === 'noun') {
    return generateNounParadigm(id, lemma.lemma, pp, info, lemma.glossDe);
  }
  if (lemma.pos === 'verb') {
    return generateVerbParadigm(id, lemma.lemma, pp, info, lemma.glossDe);
  }
  if (lemma.pos === 'adj') {
    return generateAdjParadigm(id, lemma.lemma, pp, info, lemma.glossDe);
  }
  return null;
}

// ── Noun declensions ──────────────────────────────────────────────────────

function generateNounParadigm(
  id: string,
  lemma: string,
  pp: string,
  info: string,
  gloss: string,
): Paradigm | null {
  const parts = pp.split(',').map((s) => s.trim());
  const nomSg = parts[0] ?? lemma;
  const genSg = parts[1] ?? '';

  if (info.includes('a-Deklination')) {
    const stem = stripSuffix(genSg, 'ae');
    return nounParadigm(id, 'a-Deklination', `${nomSg}, ${genSg} (${gloss})`, 'nouns-a-nom-acc', [
      [nomSg, stem + 'ae'],
      [genSg, stem + 'ārum'],
      [stem + 'ae', stem + 'īs'],
      [stem + 'am', stem + 'ās'],
      [stem + 'ā', stem + 'īs'],
    ]);
  }

  if (info.includes('o-Deklination')) {
    const stem = stripSuffix(genSg, 'ī');
    if (info.startsWith('n.')) {
      const nomPl = stem + 'a';
      return nounParadigm(id, 'o-Deklination (n.)', `${nomSg}, ${genSg} (${gloss})`, 'nouns-o-decl', [
        [nomSg, nomPl],
        [genSg, stem + 'ōrum'],
        [stem + 'ō', stem + 'īs'],
        [nomSg, nomPl],
        [stem + 'ō', stem + 'īs'],
      ]);
    }
    // masc (default for o-decl)
    return nounParadigm(id, 'o-Deklination (m.)', `${nomSg}, ${genSg} (${gloss})`, 'nouns-o-decl', [
      [nomSg, stem + 'ī'],
      [genSg, stem + 'ōrum'],
      [stem + 'ō', stem + 'īs'],
      [stem + 'um', stem + 'ōs'],
      [stem + 'ō', stem + 'īs'],
    ]);
  }

  if (info.includes('kons. Deklination') || info.includes('3. Deklination')) {
    const stem = stripSuffix(genSg, 'is');
    const nomPl = stem + 'ēs';
    const genPl = stem + 'um';
    return nounParadigm(id, '3. Deklination (kons.)', `${nomSg}, ${genSg} (${gloss})`, 'nouns-3decl', [
      [nomSg, nomPl],
      [genSg, genPl],
      [stem + 'ī', stem + 'ibus'],
      [stem + 'em', nomPl],
      [stem + 'e', stem + 'ibus'],
    ]);
  }

  if (info.includes('i-Deklination')) {
    const stem = stripSuffix(genSg, 'is');
    const nomPl = stem + 'ēs';
    return nounParadigm(id, '3. Deklination (i-Stamm)', `${nomSg}, ${genSg} (${gloss})`, 'nouns-3decl', [
      [nomSg, nomPl],
      [genSg, stem + 'ium'],
      [stem + 'ī', stem + 'ibus'],
      [stem + 'em', nomPl],
      [stem + 'e', stem + 'ibus'],
    ]);
  }

  if (info.includes('gemischte Deklination')) {
    const stem = stripSuffix(genSg, 'is');
    const nomPl = stem + 'ēs';
    return nounParadigm(id, '3. Deklination (gemischt)', `${nomSg}, ${genSg} (${gloss})`, 'nouns-3decl', [
      [nomSg, nomPl],
      [genSg, stem + 'ium'],
      [stem + 'ī', stem + 'ibus'],
      [stem + 'em', nomPl],
      [stem + 'e', stem + 'ibus'],
    ]);
  }

  if (info.includes('e-Deklination')) {
    const stem = stripSuffix(genSg, 'ēī').length < genSg.length ? stripSuffix(genSg, 'ēī') : stripSuffix(genSg, 'eī');
    return nounParadigm(id, 'e-Deklination', `${nomSg}, ${genSg} (${gloss})`, 'nouns-e-decl', [
      [nomSg, stem + 'ēs'],
      [genSg, stem + 'ērum'],
      [stem + 'ēī', stem + 'ēbus'],
      [stem + 'em', stem + 'ēs'],
      [stem + 'ē', stem + 'ēbus'],
    ]);
  }

  if (info.includes('u-Deklination')) {
    const stem = stripSuffix(genSg, 'ūs');
    return nounParadigm(id, 'u-Deklination', `${nomSg}, ${genSg} (${gloss})`, 'nouns-u-decl', [
      [nomSg, stem + 'ūs'],
      [genSg, stem + 'uum'],
      [stem + 'uī', stem + 'ibus'],
      [stem + 'um', stem + 'ūs'],
      [stem + 'ū', stem + 'ibus'],
    ]);
  }

  return null; // unsupported / irregular
}

// ── Verb conjugations (present indicative active) ─────────────────────────

function generateVerbParadigm(
  id: string,
  lemma: string,
  pp: string,
  info: string,
  gloss: string,
): Paradigm | null {
  if (info.includes('unregelmäßig')) return null;

  const parts = pp.split(',').map((s) => s.trim());
  // parts: [1sg pres, infinitive, 1sg perf?, supine?]
  const pres1sg = parts[0] ?? lemma;
  const inf = parts[1] ?? '';

  if (info.includes('a-Konjugation')) {
    const stem = stripSuffix(inf, 'āre');
    return verbParadigm(id, 'Präsens · a-Konjugation', `${pres1sg}, ${inf} (${gloss})`, 'present-a-conj', [
      [pres1sg, stem + 'āmus'],
      [stem + 'ās', stem + 'ātis'],
      [stem + 'at', stem + 'ant'],
    ]);
  }

  if (info.includes('e-Konjugation')) {
    const stem = stripSuffix(inf, 'ēre');
    return verbParadigm(id, 'Präsens · e-Konjugation', `${pres1sg}, ${inf} (${gloss})`, 'present-a-conj', [
      [pres1sg, stem + 'ēmus'],
      [stem + 'ēs', stem + 'ētis'],
      [stem + 'et', stem + 'ent'],
    ]);
  }

  if (info.includes('i-Konjugation')) {
    const stem = stripSuffix(inf, 'īre');
    return verbParadigm(id, 'Präsens · i-Konjugation', `${pres1sg}, ${inf} (${gloss})`, 'verbs-3-4-conj', [
      [pres1sg, stem + 'īmus'],
      [stem + 'īs', stem + 'ītis'],
      [stem + 'it', stem + 'iunt'],
    ]);
  }

  if (info.includes('kons. Konjugation')) {
    const stem = stripSuffix(inf, 'ere');
    return verbParadigm(id, 'Präsens · kons. Konjugation', `${pres1sg}, ${inf} (${gloss})`, 'verbs-3-4-conj', [
      [pres1sg, stem + 'imus'],
      [stem + 'is', stem + 'itis'],
      [stem + 'it', stem + 'unt'],
    ]);
  }

  // Short-form i-conjugation (e.g. "kurzvokalische i-Konjugation")
  if (info.includes('kurzvokal')) {
    const stem = stripSuffix(inf, 'ere');
    return verbParadigm(id, 'Präsens · gemischte Konjugation', `${pres1sg}, ${inf} (${gloss})`, 'verbs-3-4-conj', [
      [pres1sg, stem + 'imus'],
      [stem + 'is', stem + 'itis'],
      [stem + 'it', stem + 'iunt'],
    ]);
  }

  return null;
}

// ── Adjectives (a/o declension: bonus -a -um) ─────────────────────────────

function generateAdjParadigm(
  id: string,
  lemma: string,
  pp: string,
  info: string,
  gloss: string,
): Paradigm | null {
  // bonus, -a, -um  →  bonus (m), bona (f), bonum (n)
  const parts = pp.split(',').map((s) => s.trim());
  const mascNom = parts[0] ?? lemma;

  // Extract stem: strip -us from masculine nominative
  const stem = stripSuffix(mascNom, 'us');
  if (stem === mascNom) return null; // not bonus-type

  const femNom = parts[1]?.replace(/^-/, stem) ?? stem + 'a';
  const neutNom = parts[2]?.replace(/^-/, stem) ?? stem + 'um';

  // Render as a combined table: rows are cases, cols are masc/fem/neut × sg/pl
  const COLS = ['m. Sg', 'f. Sg', 'n. Sg', 'm. Pl', 'f. Pl', 'n. Pl'];

  const SG_M = [mascNom, stem + 'ī', stem + 'ō', stem + 'um', stem + 'ō'];
  const SG_F = [femNom, stem + 'ae', stem + 'ae', stem + 'am', stem + 'ā'];
  const SG_N = [neutNom, stem + 'ī', stem + 'ō', neutNom, stem + 'ō'];
  const PL_M = [stem + 'ī', stem + 'ōrum', stem + 'īs', stem + 'ōs', stem + 'īs'];
  const PL_F = [stem + 'ae', stem + 'ārum', stem + 'īs', stem + 'ās', stem + 'īs'];
  const PL_N = [stem + 'a', stem + 'ōrum', stem + 'īs', stem + 'a', stem + 'īs'];

  return {
    id,
    title: 'a/o-Deklination (Adjektiv)',
    subtitle: `${mascNom}, ${femNom}, ${neutNom} (${gloss})`,
    kind: 'noun',
    topicId: 'adj-ao-decl',
    cols: COLS,
    rows: CASES.map((label, i) => ({
      label,
      cells: [SG_M[i], SG_F[i], SG_N[i], PL_M[i], PL_F[i], PL_N[i]],
    })),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Remove `suffix` from the end of `s`. Returns `s` unchanged if it doesn't end with the suffix. */
function stripSuffix(s: string, suffix: string): string {
  if (s.endsWith(suffix)) return s.slice(0, -suffix.length);
  return s;
}
