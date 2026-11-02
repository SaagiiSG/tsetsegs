import { describe, it, expect, beforeEach } from 'vitest';
import { sortModules, nextStep, sectionLabel, remainingSeconds, timerShown, formatClock, answerPreview, toggleLetter, readLocal, writeLocal } from './bluebookTest';

const rw1 = { id: 'r1', section: 'reading_writing', module_number: 1 };
const rw2 = { id: 'r2', section: 'reading_writing', module_number: 2 };
const m1 = { id: 'm1', section: 'math', module_number: 1 };
const m2 = { id: 'm2', section: 'math', module_number: 2 };

describe('module flow', () => {
  it('orders reading & writing before math', () => expect(sortModules([m2, rw2, m1, rw1]).map(m => m.id)).toEqual(['r1', 'r2', 'm1', 'm2']));
  it('same section goes to This Module Is Over', () => expect(nextStep([m1, m2], 'm1')).toEqual({ kind: 'same-section', moduleId: 'm2' }));
  it('reading & writing into math is a break', () => expect(nextStep([rw1, rw2, m1, m2], 'r2')).toEqual({ kind: 'break', moduleId: 'm1' }));
  it('last module finishes', () => expect(nextStep([m1, m2], 'm2')).toEqual({ kind: 'finish' }));
  it('math-only tests call math section 1', () => expect(sectionLabel([m1, m2], m2)).toBe('Section 1, Module 2: Math'));
  it('full tests call math section 2', () => expect(sectionLabel([rw1, rw2, m1, m2], m1)).toBe('Section 2, Module 1: Math'));
  it('reading & writing label', () => expect(sectionLabel([rw1, rw2, m1, m2], rw1)).toBe('Section 1, Module 1: Reading and Writing'));
});

describe('timer', () => {
  const t0 = Date.parse('2026-11-01T10:00:00Z');
  it('is not running before the clock starts', () => expect(remainingSeconds(null, 35, t0)).toBeNull());
  it('counts from the saved start, so a refresh keeps time', () => expect(remainingSeconds('2026-11-01T10:00:00Z', 35, t0 + 61_500)).toBe(2038));
  it('never goes below zero', () => expect(remainingSeconds('2026-11-01T09:00:00Z', 35, t0)).toBe(0));
  it('hidden timer shows itself at 5:00', () => { expect(timerShown(true, 301)).toBe(false); expect(timerShown(true, 300)).toBe(true); });
  it('formats like Bluebook', () => { expect(formatClock(2100)).toBe('35:00'); expect(formatClock(591)).toBe('9:51'); expect(formatClock(0)).toBe('0:00'); });
});

describe('answer preview', () => {
  it('typesets fractions', () => expect(answerPreview('3/343')).toBe('$\\frac{3}{343}$'));
  it('keeps the minus outside', () => expect(answerPreview('-7/2')).toBe('$-\\frac{7}{2}$'));
  it('leaves decimals alone', () => expect(answerPreview('3.5')).toBe('3.5'));
  it('empty stays empty', () => expect(answerPreview('')).toBe(''));
});

describe('cross-out list and storage', () => {
  it('toggles a letter', () => { expect(toggleLetter([], 'A')).toEqual(['A']); expect(toggleLetter(['A', 'C'], 'A')).toEqual(['C']); });
  beforeEach(() => { const m = new Map<string, string>(); (globalThis as any).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; });
  it('round-trips', () => { writeLocal('k', ['B']); expect(readLocal('k', [])).toEqual(['B']); });
  it('falls back when storage throws', () => { (globalThis as any).localStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } }; expect(readLocal('k', ['x'])).toEqual(['x']); expect(() => writeLocal('k', 1)).not.toThrow(); });
});
