import { COURSES } from '@/courses';
import type { CourseConfig } from '@/courses/types';
import { useApp } from '@/store/app';

/** The active course's config, reactive to the store's `course` selection. */
export function useCourse(): CourseConfig {
  const id = useApp((s) => s.course);
  return COURSES[id];
}
