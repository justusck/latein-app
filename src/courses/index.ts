import { activeCourseId } from './active';
import { JAPANESE_COURSE } from './japanese';
import { LATIN_COURSE } from './latin';
import type { CourseConfig, CourseId } from './types';

export const COURSES: Record<CourseId, CourseConfig> = {
  la: LATIN_COURSE,
  ja: JAPANESE_COURSE,
};

/** Ordered list for switchers / pickers. */
export const COURSE_LIST: CourseConfig[] = [LATIN_COURSE, JAPANESE_COURSE];

export function getCourse(id: CourseId): CourseConfig {
  return COURSES[id];
}

/** Config for the course backing the currently-open database (module-load). */
export function getActiveCourse(): CourseConfig {
  return COURSES[activeCourseId()];
}

export type { CourseConfig, CourseId, Token } from './types';
export { activeCourseId };
