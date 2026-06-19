declare module 'tiny-segmenter' {
  /** Super-compact pure-JS Japanese tokenizer (Taku Kudo, BSD). */
  class TinySegmenter {
    /** Split Japanese text into word segments (concatenation === input). */
    segment(input: string): string[];
  }
  export = TinySegmenter;
}
