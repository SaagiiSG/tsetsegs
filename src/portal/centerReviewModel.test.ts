import { describe, expect, it } from 'vitest';
import { centerReviewModel } from './centerReviewModel';
import type { QMeta } from './questionMeta';

const meta: Record<string, QMeta> = {
  a: { id: 'a', subject: 'Math', domain: 'Algebra', category_id: null, skill: null },
  b: { id: 'b', subject: 'English', domain: 'Craft and Structure', category_id: null, skill: null },
};
const now = Date.parse('2026-10-18T12:00:00Z');
describe('customer review data', () => {
  it('removes a mistake after the latest stored attempt is correct', () => {
    const result = centerReviewModel([
      { question_id: 'a', is_correct: false, created_at: '2026-10-17T12:00:00Z' },
      { question_id: 'a', is_correct: true, created_at: '2026-10-18T12:00:00Z' },
    ], meta, 'math', now);
    expect(result.pending).toHaveLength(0);
  });
  it('keeps subjects separate in mistakes and history', () => {
    const result = centerReviewModel([{ question_id: 'b', is_correct: false, created_at: '2026-10-18T12:00:00Z' }], meta, 'math', now);
    expect(result.pending).toHaveLength(0);
    expect(result.history).toHaveLength(0);
  });
  it('computes mastery from only the last two weeks', () => {
    const result = centerReviewModel([
      { question_id: 'a', is_correct: true, created_at: '2026-10-18T12:00:00Z' },
      { question_id: 'a', is_correct: false, created_at: '2026-09-01T12:00:00Z' },
    ], meta, 'math', now);
    expect(result.mastery.find(a => a.domain === 'Algebra')?.score).toBe(100);
  });
});