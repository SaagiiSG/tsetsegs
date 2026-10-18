import { describe, expect, it } from 'vitest';
import { centerSatSimulation, centerSatProgress } from './centerSatSimulation';
import { buildWeightedSim } from '@/lib/satSimulation';
import type { QMeta } from './questionMeta';

const attempts = Array.from({ length: 440 }, (_, i) => ({ question_id: String(i), is_correct: i % 4 !== 0, time_spent_seconds: 95, created_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() }));
const meta: Record<string, QMeta> = Object.fromEntries(attempts.map(a => [a.question_id, { id: a.question_id, subject: 'math', skill: null, category_id: null, difficulty_level: 'hard', domain: 'Algebra' }]));

describe('center dashboard SAT simulation', () => {
  it('reports distinct Math progress for the locked island', () => {
    expect(centerSatProgress([], meta)).toBe(0);
    expect(centerSatProgress([...attempts.slice(0, 30), attempts[0]], meta)).toBe(30);
    expect(centerSatProgress(attempts, meta)).toBe(440);
  });
  it('stays hidden until 440 distinct Math questions', () => {
    expect(centerSatSimulation(attempts.slice(0, 439), meta)).toBeNull();
    expect(centerSatSimulation([...attempts.slice(0, 439), attempts[0]], meta)).toBeNull();
  });
  it('uses the same recency-weighted, calibrated score as the main dashboard', () => {
    const distinct = [...attempts].reverse().map(a => ({ ...a, attempted_at: a.created_at, difficulty_level: 'hard' }));
    expect(centerSatSimulation(attempts, meta)?.simScore).toBe(buildWeightedSim(distinct)!.calibrated);
  });
  it('excludes English and unknown-bank questions', () => {
    expect(centerSatSimulation(attempts, { ...meta, '0': { ...meta['0'], subject: 'english' } })).toBeNull();
    expect(centerSatSimulation(attempts, {})).toBeNull();
  });
});