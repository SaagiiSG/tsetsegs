import { buildSimHistory, dedupeDistinctNewestFirst } from '@/lib/satSimulation';
import type { QMeta } from './questionMeta';

type Attempt = { question_id: string; is_correct: boolean; time_spent_seconds: number | null; created_at: string };

/** Same automatic Math simulation and unlock threshold as the main dashboard. */
export function centerSatSimulation(attempts: Attempt[], meta: Record<string, QMeta>) {
  const mathAttempts = attempts.filter(a => {
    const q = meta[a.question_id];
    return q && (q.subject ?? 'math').toLowerCase() === 'math';
  }).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const distinct = dedupeDistinctNewestFirst(mathAttempts.map(a => ({
    ...a,
    attempted_at: a.created_at,
    difficulty_level: meta[a.question_id]?.difficulty_level,
  })));
  if (distinct.length < 440) return null;
  return buildSimHistory(distinct, 3)[0] ?? null;
}