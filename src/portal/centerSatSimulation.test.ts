import { describe, expect, it } from 'vitest';
import { centerSatSimulation } from './centerSatSimulation';
import { calculateSimulation } from '@/lib/satSimulation';
import type { QMeta } from './questionMeta';

const attempts = Array.from({ length: 440 }, (_, i) => ({ question_id: String(i), is_correct: i % 4 !== 0, time_spent_seconds: 95, created_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() }));
const meta: Record<string, QMeta> = Object.fromEntries(attempts.map(a => [a.question_id, { id: a.question_id, subject: 'math', skill: null, category_id: null, difficulty_level: 'hard', domain: 'Algebra' }]));

describe('center dashboard SAT simulation', () => {
  it('stays hidden until 440 distinct Math questions', () => {
    expect(centerSatSimulation(attempts.slice(0, 439), meta)).toBeNull();
    expect(centerSatSimulation([...attempts.slice(0, 439), attempts[0]], meta)).toBeNull();
  });
  it('uses the main algorithm on the newest 44 distinct attempts', () => {
    const expected = calculateSimulation([...attempts].reverse().slice(0, 44).map(a => ({ ...a, difficulty_level: 'hard' })));
    expect(centerSatSimulation(attempts, meta)).toEqual(expected);
  });
  it('excludes English and unknown-bank questions', () => {
    expect(centerSatSimulation(attempts, { ...meta, '0': { ...meta['0'], subject: 'english' } })).toBeNull();
    expect(centerSatSimulation(attempts, {})).toBeNull();
  });
});