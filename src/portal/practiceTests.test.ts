import { describe, it, expect } from 'vitest';
import { testCardLine, testCardAction, historyLine, type PracticeTest } from './practiceTests';
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
describe('history line', () => {
  it('never prints a null score', () => {
    expect(historyLine({ status: 'completed', current_module: 1, math_score: null })).toBe('Completed');
    expect(historyLine({ status: 'completed', current_module: 1, math_score: 640 })).toBe('Math 640');
    expect(historyLine({ status: 'in_progress', current_module: 1, math_score: null })).toBe('In progress · Module 2');
  });
});
