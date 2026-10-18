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

import { buildWeightedSim } from './satSimulation';
const batch = (ok: boolean, n = 44) => Array.from({ length: n }, (_, i) => ({ question_id: `${ok}${i}${Math.random()}`, is_correct: ok, time_spent_seconds: 95, difficulty_level: 'hard' }));

describe('recency-weighted simulation', () => {
  it('weights the newest batch more than older ones', () => {
    const improving = [...batch(true), ...batch(false)];  // newest first: recent all right
    const declining = [...batch(false), ...batch(true)];
    expect(buildWeightedSim(improving, { offset: 0 })!.score).toBeGreaterThan(buildWeightedSim(declining, { offset: 0 })!.score);
  });
  it('applies decay 0.8: two equal-confidence batches of 800 and 400 give (800 + 0.8×400)/1.8', () => {
    const r = buildWeightedSim([...batch(true), ...batch(false)], { offset: 0, decay: 0.8 })!;
    const [a, b] = r.batches.map(x => x.simScore);
    expect(r.score).toBe(Math.round((a + 0.8 * b) / 1.8));
  });
  it('works with fewer than 10 batches and adds the calibration offset', () => {
    const r = buildWeightedSim(batch(false), { offset: 50 })!;
    expect(r.batches).toHaveLength(1);
    expect(r.calibrated).toBe(r.score + 50);
  });
});
