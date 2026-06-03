/**
 * Latin orthography is inconsistent across editions (macrons or not, u/v and
 * i/j interchangeable). To match surface forms against lemmas reliably we fold
 * everything to a canonical key: lowercase, no macrons, v→u, j→i, letters only.
 */
const MACRONS: Record<string, string> = {
  ā: 'a', ă: 'a', â: 'a',
  ē: 'e', ĕ: 'e', ê: 'e',
  ī: 'i', ĭ: 'i', î: 'i',
  ō: 'o', ŏ: 'o', ô: 'o',
  ū: 'u', ŭ: 'u', û: 'u',
  ȳ: 'y', ȳ̆: 'y',
  Ā: 'a', Ē: 'e', Ī: 'i', Ō: 'o', Ū: 'u',
};

/** Canonical matching key for a single token. */
export function normalizeLatin(word: string): string {
  let out = '';
  for (const ch of word.toLowerCase()) {
    const folded = MACRONS[ch] ?? ch;
    out += folded;
  }
  out = out.replace(/[^a-zü]/g, ''); // keep letters; drop punctuation/digits
  out = out.replace(/v/g, 'u').replace(/j/g, 'i');
  return out;
}

export type LatinToken = {
  /** original surface form as it appears in the text */
  raw: string;
  /** canonical matching key (may be '' for punctuation) */
  key: string;
  /** true if the chunk is a word (has letters), false for whitespace/punct */
  isWord: boolean;
};

/**
 * Split text into a stream of word and non-word chunks, preserving the
 * originals so the reader can re-render the text with tappable words.
 */
export function tokenizeLatin(text: string): LatinToken[] {
  const tokens: LatinToken[] = [];
  // Split keeping delimiters: words vs. everything else.
  const regex = /([A-Za-zĀāĂăÂâĒēĔĕÊêĪīĬĭÎîŌōŎŏÔôŪūŬŭÛûȲȳ]+)|([^A-Za-zĀāĂăÂâĒēĔĕÊêĪīĬĭÎîŌōŎŏÔôŪūŬŭÛûȲȳ]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m[1]) {
      tokens.push({ raw: m[1], key: normalizeLatin(m[1]), isWord: true });
    } else if (m[2]) {
      tokens.push({ raw: m[2], key: '', isWord: false });
    }
  }
  return tokens;
}

/** Distinct normalized word keys in a text (for coverage). */
export function wordKeys(text: string): string[] {
  const set = new Set<string>();
  for (const t of tokenizeLatin(text)) {
    if (t.isWord && t.key) set.add(t.key);
  }
  return [...set];
}
