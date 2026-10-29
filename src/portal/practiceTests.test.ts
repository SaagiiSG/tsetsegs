import { describe, it, expect } from 'vitest';
import { testCardLine, testCardAction, type PracticeTest } from './practiceTests';
const t: PracticeTest = { id: 'a', name: 'T', test_month: 3, test_year: 2025, modules: 2, questions: 44, minutes: 70, last_score: null, open_attempt: null };
describe('practice tests', () => {
  it('card line', () => {
    expect(testCardLine(t)).toBe('2 modules · 44 questions · 70 minutes');
    expect(testCardLine({ ...t, modules: 1 })).toContain('1 module ·');
  });
  it('card says Resume', () => {
    expect(testCardAction({ ...t, open_attempt: 'x' })).toBe('Resume');
    expect(testCardAction(t)).toBe('Start');
  });
});
