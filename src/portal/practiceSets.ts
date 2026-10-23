/** Math set tabs on the center portal's practice page. */
export const PRACTICE_SETS = [
  { key: '68', label: '68' },
  { key: 'SATMathTraining800', label: '150' },
  { key: 'CB', label: 'CB' },
] as const;
export type PracticeSetKey = (typeof PRACTICE_SETS)[number]['key'];

// CB is every math question outside the 68 and 150 sets, so it includes the new 120
// (ANP120Aug3) - the same rule as the admin question list's CB tab.
const NOT_CB = ['68', 'SATMathTraining800'];

export const inPracticeSet = (key: string, questionSet: string | null) =>
  key === 'CB' ? !NOT_CB.includes(questionSet ?? '') : questionSet === key;

/** Ids of the math questions in a tab. The tabs, the home cards and the badges all count with this. */
export const practiceSetIds = (key: string, rows: { id: string; subject: string | null; question_set: string | null }[]) =>
  rows.filter(r => (r.subject ?? 'math').toLowerCase() === 'math' && inPracticeSet(key, r.question_set)).map(r => r.id);

/** The same CB rule as a PostgREST .or() filter. */
export const CB_FILTER = `question_set.is.null,question_set.not.in.(${NOT_CB.join(',')})`;

/** The tab a ?set= value opens. Old links to the new 120 land on CB, which holds it. */
export const practiceSetFromParam = (value: string | null): PracticeSetKey =>
  value === 'ANP120Aug3' ? 'CB' : (PRACTICE_SETS.find(s => s.key === value)?.key ?? '68');
