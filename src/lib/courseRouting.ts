/**
 * Course-aware routing helpers.
 *
 * A student account can be linked to multiple `students` rows (one per batch).
 * Each batch has a `course_type` of 'SAT' or 'IELTS'. After login we route
 * them to the right section based on their enrollments and remembered choice.
 */

export type CourseType = 'SAT' | 'IELTS';

export const PREFERRED_COURSE_KEY = 'preferred_course';

export interface LinkedStudentLike {
  course_type?: string | null;
}

export interface EnrolledCourses {
  hasSAT: boolean;
  hasIELTS: boolean;
  isSATOnly: boolean;
  isIELTSOnly: boolean;
  isBoth: boolean;
}

export function getEnrolledCourses(linked: LinkedStudentLike[] | null | undefined): EnrolledCourses {
  const types = new Set((linked ?? []).map((s) => s.course_type).filter(Boolean) as string[]);
  const hasSAT = types.has('SAT');
  const hasIELTS = types.has('IELTS');
  return {
    hasSAT,
    hasIELTS,
    isSATOnly: hasSAT && !hasIELTS,
    isIELTSOnly: hasIELTS && !hasSAT,
    isBoth: hasSAT && hasIELTS,
  };
}

export function getPreferredCourse(): CourseType | null {
  try {
    const v = localStorage.getItem(PREFERRED_COURSE_KEY);
    return v === 'SAT' || v === 'IELTS' ? v : null;
  } catch {
    return null;
  }
}

export function setPreferredCourse(course: CourseType): void {
  try {
    localStorage.setItem(PREFERRED_COURSE_KEY, course);
  } catch {
    /* ignore */
  }
}

export function clearPreferredCourse(): void {
  try {
    localStorage.removeItem(PREFERRED_COURSE_KEY);
  } catch {
    /* ignore */
  }
}

export const SAT_HOME = '/practice/home';
export const IELTS_HOME = '/ielts/dashboard';
export const CHOOSE_COURSE = '/choose-course';

export function routeForCourse(course: CourseType): string {
  return course === 'SAT' ? SAT_HOME : IELTS_HOME;
}

/**
 * Pick the post-login destination for a student based on their enrollments
 * and any remembered course choice.
 */
export function getPostLoginRoute(linked: LinkedStudentLike[] | null | undefined): string {
  const { isSATOnly, isIELTSOnly, isBoth, hasSAT } = getEnrolledCourses(linked);
  if (isIELTSOnly) return IELTS_HOME;
  if (isSATOnly) return SAT_HOME;
  if (isBoth) {
    const preferred = getPreferredCourse();
    if (preferred) return routeForCourse(preferred);
    return CHOOSE_COURSE;
  }
  // No course mapping resolved yet — fall back to SAT for legacy behavior.
  return hasSAT ? SAT_HOME : SAT_HOME;
}
