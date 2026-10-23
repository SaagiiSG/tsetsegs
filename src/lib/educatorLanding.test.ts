import { describe, it, expect } from 'vitest';
import { appendSource, mathExplanationsLabel, problemsSolvedLabel, sourceFromSearch, videoCountLabel, withSource } from './educatorLanding';
describe('educator landing wording', () => {
  it('credits only the math explanations to the teachers, from 100 up', () => { expect(mathExplanationsLabel(144, 'eng')).toBe('144 math explanations written by our teachers'); expect(mathExplanationsLabel(144, 'mon')).toContain('144'); expect(mathExplanationsLabel(99, 'eng')).toBeNull(); expect(mathExplanationsLabel(null, 'eng')).toBeNull(); });
  it('shows video counts from 20 up', () => { expect(videoCountLabel(127, 'eng')).toBe('127 video lessons from the same teachers'); expect(videoCountLabel(20, 'eng')).toBe('20 video lessons from the same teachers'); expect(videoCountLabel(19, 'eng')).toBeNull(); expect(videoCountLabel(null, 'eng')).toBeNull(); });
  it('rounds problems solved down', () => { expect(problemsSolvedLabel(817495)).toBe('817,000+'); expect(problemsSolvedLabel(999)).toBe('999'); expect(problemsSolvedLabel(null)).toBeNull(); });
});
describe('lead source', () => {
  it('reads a clean ref', () => { expect(sourceFromSearch('?ref=websummit')).toBe('websummit'); expect(sourceFromSearch('?ref=WebSummit')).toBe('websummit'); expect(sourceFromSearch('?lang=eng&ref=utah-referral')).toBe('utah-referral'); });
  it('ignores junk', () => { expect(sourceFromSearch('?ref=<script>')).toBeNull(); expect(sourceFromSearch('?ref=' + 'a'.repeat(41))).toBeNull(); expect(sourceFromSearch('?lang=eng')).toBeNull(); expect(sourceFromSearch('?ref=')).toBeNull(); });
  it('appends the source', () => { expect(appendSource('Hello', 'websummit')).toBe('Hello\n\nSource: websummit'); expect(appendSource('', 'websummit')).toBe('Source: websummit'); expect(appendSource('Hello', null)).toBe('Hello'); });
  it('carries the source to the demo and back', () => { const demo = withSource('/demo?role=admin&preview=educator&lang=eng', 'websummit'); expect(demo).toBe('/demo?role=admin&preview=educator&lang=eng&ref=websummit'); expect(sourceFromSearch(new URL(demo, 'https://flowersos.co').search)).toBe('websummit'); expect(withSource('/educators?lang=eng', null)).toBe('/educators?lang=eng'); });
  it('stays within 2000 characters', () => { const m = appendSource('x'.repeat(2000), 'websummit'); expect(m.length).toBe(2000); expect(m.endsWith('Source: websummit')).toBe(true); });
});
