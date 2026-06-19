/**
 * Synchronous resolver for the active course id, read once from `meta.db` at
 * module load. Used by modules that must decide course-specific behaviour
 * *before* React renders — db file selection (client.ts), font/theme
 * resolution (theme.ts) and the text-processing seam (lib/text.ts).
 *
 * The id is cached for the lifetime of the JS context. Switching courses
 * reloads the whole app (see store `setCourse`), which re-reads it fresh — so
 * the cache never goes stale within a session.
 */
import { metaGet } from '@/lib/meta';

import type { CourseId } from './types';

const COURSE_IDS: readonly CourseId[] = ['la', 'ja'];

let cached: CourseId | null = null;

export function activeCourseId(): CourseId {
  if (cached == null) {
    const v = metaGet('course');
    cached = COURSE_IDS.includes(v as CourseId) ? (v as CourseId) : 'la';
  }
  return cached;
}
