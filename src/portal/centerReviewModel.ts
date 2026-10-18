import type { QMeta } from './questionMeta';

export type ReviewAttempt = { question_id: string; is_correct: boolean; created_at: string };
export const REVIEW_AREAS = {
  math: ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry'],
  english: ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'],
};
export function centerReviewModel(attempts: ReviewAttempt[], meta: Record<string, QMeta>, subject: 'math' | 'english', now = Date.now()) {
  const filtered = attempts.filter(a => meta[a.question_id]?.subject?.toLowerCase() === subject)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const latest = new Map<string, ReviewAttempt>();
  filtered.forEach(a => { if (!latest.has(a.question_id)) latest.set(a.question_id, a); });
  const pending = [...latest.values()].filter(a => !a.is_correct);
  const byArea: Record<string, number> = {};
  pending.forEach(a => { const d = meta[a.question_id].domain; byArea[d] = (byArea[d] ?? 0) + 1; });
  const recent = filtered.filter(a => Date.parse(a.created_at) >= now - 14 * 864e5);
  const domains = [...new Set([...REVIEW_AREAS[subject], ...recent.map(a => meta[a.question_id].domain)])];
  const mastery = domains.map(domain => {
    const rows = recent.filter(a => meta[a.question_id].domain === domain);
    const area = domain.replace('Problem-Solving and Data Analysis', 'Data / Problem').replace('Geometry and Trigonometry', 'Geo / Trig')
      .replace('Information and Ideas', 'Ideas').replace('Craft and Structure', 'Craft').replace('Expression of Ideas', 'Expression').replace('Standard English Conventions', 'Conventions');
    return { area, domain, score: rows.length ? Math.round(100 * rows.filter(a => a.is_correct).length / rows.length) : 0, total: rows.length };
  });
  return { pending, byArea, mastery, history: filtered.slice(0, 20) };
}