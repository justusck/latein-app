/** Convert a positive integer to Roman numerals (1..3999). */
const ROMAN_PAIRS: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return String(n);
  let v = Math.floor(n);
  let out = '';
  for (const [value, numeral] of ROMAN_PAIRS) {
    while (v >= value) {
      out += numeral;
      v -= value;
    }
  }
  return out;
}
