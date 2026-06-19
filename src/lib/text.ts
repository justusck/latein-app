/**
 * Text-processing seam. Routes normalisation / tokenisation / coverage through
 * the ACTIVE course's implementation (Latin macron-folding vs. Japanese
 * segmentation). This is the one place where per-course DB isolation isn't
 * enough — the code itself must pick the right language ops.
 *
 * Resolved per call from the active course (fixed for the session; switching
 * reloads the app), so these are safe drop-in replacements for the old direct
 * `@/lib/latin/normalize` imports.
 */
import { getActiveCourse } from '@/courses';
import type { Token } from '@/courses/types';

export function normalize(word: string): string {
  return getActiveCourse().text.normalize(word);
}

export function tokenize(text: string): Token[] {
  return getActiveCourse().text.tokenize(text);
}

export function wordKeys(text: string): string[] {
  return getActiveCourse().text.wordKeys(text);
}
