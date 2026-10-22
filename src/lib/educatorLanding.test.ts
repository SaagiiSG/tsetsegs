import { describe, it, expect } from 'vitest';
import { appendSource, explanationsLine, problemsSolvedLabel, sourceFromSearch, videoCountLabel } from './educatorLanding';
describe('educator landing wording', () => {
  it('counts explanations', () => { expect(explanationsLine(918, 'eng')).toBe('918 questions with step-by-step explanations'); expect(explanationsLine(1044, 'eng')).toBe('1,044 questions with step-by-step explanations'); expect(explanationsLine(918, 'mon')).toContain('918'); });
  it('falls back without a number', () => { for (const n of [null, 0]) expect(explanationsLine(n, 'eng')).toBe('Step-by-step explanations written by our teachers'); });
  it('shows video counts from 20 up', () => { expect(videoCountLabel(127, 'eng')).toBe('127 video lessons from the same teachers'); expect(videoCountLabel(20, 'eng')).toBe('20 video lessons from the same teachers'); expect(videoCountLabel(19, 'eng')).toBeNull(); expect(videoCountLabel(null, 'eng')).toBeNull(); });
  it('rounds problems solved down', () => { expect(problemsSolvedLabel(817495)).toBe('817,000+'); expect(problemsSolvedLabel(999)).toBe('999'); expect(problemsSolvedLabel(null)).toBeNull(); });
});
describe('lead source', () => {
  it('reads a clean ref', () => { expect(sourceFromSearch('?ref=websummit')).toBe('websummit'); expect(sourceFromSearch('?ref=WebSummit')).toBe('websummit'); expect(sourceFromSearch('?lang=eng&ref=utah-referral')).toBe('utah-referral'); });
  it('ignores junk', () => { expect(sourceFromSearch('?ref=<script>')).toBeNull(); expect(sourceFromSearch('?ref=' + 'a'.repeat(41))).toBeNull(); expect(sourceFromSearch('?lang=eng')).toBeNull(); expect(sourceFromSearch('?ref=')).toBeNull(); });
  it('appends the source', () => { expect(appendSource('Hello', 'websummit')).toBe('Hello\n\nSource: websummit'); expect(appendSource('', 'websummit')).toBe('Source: websummit'); expect(appendSource('Hello', null)).toBe('Hello'); });
  it('stays within 2000 characters', () => { const m = appendSource('x'.repeat(2000), 'websummit'); expect(m.length).toBe(2000); expect(m.endsWith('Source: websummit')).toBe(true); });
});
