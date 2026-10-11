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
