import { describe, expect, it } from 'vitest';
import { dedupeDistinctNewestFirst } from './satSimulation';

describe('SAT simulation input', () => {
  it('scores a question on its first attempt, so a retry after a wrong answer does not count as right', () => {
    const newestFirst = [
      { question_id: 'q1', is_correct: true, time_spent_seconds: 40, difficulty_level: 'hard', attempted_at: '2026-10-03' },
      { question_id: 'q2', is_correct: true, time_spent_seconds: 40, difficulty_level: 'hard', attempted_at: '2026-10-02' },
      { question_id: 'q1', is_correct: false, time_spent_seconds: 90, difficulty_level: 'hard', attempted_at: '2026-10-01' },
    ];
    const out = dedupeDistinctNewestFirst(newestFirst);
    expect(out).toHaveLength(2);
    expect(out.find(a => a.question_id === 'q1')?.is_correct).toBe(false);
  });
});
