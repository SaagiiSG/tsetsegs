import { buildSimHistory, dedupeDistinctNewestFirst } from '@/lib/satSimulation';
import type { QMeta } from './questionMeta';

type Attempt = { question_id: string; is_correct: boolean; time_spent_seconds: number | null; created_at: string };

/** Same automatic Math simulation and unlock threshold as the main dashboard. */
function distinctMathAttempts(attempts: Attempt[], meta: Record<string, QMeta>) {
  const mathAttempts = attempts.filter(a => {
    const q = meta[a.question_id];
    return q && (q.subject ?? 'math').toLowerCase() === 'math';
  }).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return dedupeDistinctNewestFirst(mathAttempts.map(a => ({
    ...a,
    attempted_at: a.created_at,
    difficulty_level: meta[a.question_id]?.difficulty_level,
  })));
}

export const CENTER_SAT_UNLOCK_AT = 440;

export function centerSatProgress(attempts: Attempt[], meta: Record<string, QMeta>) {
  return distinctMathAttempts(attempts, meta).length;
}

export function centerSatSimulation(attempts: Attempt[], meta: Record<string, QMeta>) {
  const distinct = distinctMathAttempts(attempts, meta);
  if (distinct.length < CENTER_SAT_UNLOCK_AT) return null;
  return buildSimHistory(distinct, 3)[0] ?? null;
}