/** Shapes for the bundled seed content (authored by hand for the MVP, later
 *  produced by the /scripts pipeline from DCC + Whitaker's Words). */

export type SeedLemma = {
  id: number;
  lemma: string; // with macrons, display form
  pos: string; // noun | verb | adj | adv | prep | conj | pron | num | interj | other
  principalParts?: string;
  info?: string; // declension / conjugation / gender hint
  glossDe: string;
  glossEn?: string;
  freqRank: number;
  freqGroup: number; // learning portion, ascending difficulty
  semanticGroup?: string;
  /** surface forms (any case) used for tap-to-gloss & coverage; macrons/casing
   *  are normalised at load time. The lemma itself is added automatically. */
  forms?: string[];
};

export type SeedGrammarCard = {
  id: string;
  kind: 'mc' | 'fill' | 'form' | 'order';
  prompt: string;
  /** mc/fill/form: the answer string. order: the correct sentence (words space-separated). */
  answer: string;
  /** mc: choices. order: the word bank (will be shuffled). */
  options?: string[];
  explanation?: string;
};

export type SeedGrammarTopic = {
  id: string; // slug
  title: string;
  summary: string;
  explanation: string;
  stage: 'foundations' | 'morphology' | 'syntax' | 'advanced';
  prereqs: string[];
  cards: SeedGrammarCard[];
};

export type SeedBook = {
  id: string;
  title: string;
  author?: string;
  source?: string;
  license?: string;
  level: string;
  levelScore: number;
  body: string;
};
