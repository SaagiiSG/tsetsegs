/**
 * Question bank routing by cohort.
 *
 * Mongolian students (`mn`) practice from the original `questions` bank.
 * International students (`intl`) and center portals practice from
 * `intl_questions` (intDB), which receives external sync updates.
 */
export type QuestionTable = 'questions' | 'intl_questions';

export const questionTableFor = (cohort?: string | null): QuestionTable =>
  cohort === 'intl' ? 'intl_questions' : 'questions';

/**
 * Embed for an answer row's question (`student_attempts`, `speed_session_items`, review queue, progress).
 * Intl answers point at intl_questions; the alias keeps the `questions` key and `questions.x` filters.
 */
export const questionEmbedFor = (cohort?: string | null) =>
  cohort === 'intl' ? 'questions:intl_questions' : 'questions';
