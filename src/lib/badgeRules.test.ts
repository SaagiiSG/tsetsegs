import { describe, expect, it } from 'vitest';
import {
  ubDay, longestDayRun, bestCorrectRun, hasAccurateWindow,
  countAccurateSessions, longestPerfectRun, hasQualifyingSession, percentOf,
} from './badgeRules';

const at = (i: number) => new Date(Date.UTC(2026, 9, 1, 0, 0, i)).toISOString();
const attempts = (pattern: string, secs = 10) =>
  [...pattern].map((c, i) => ({ is_correct: c === '1', time_spent_seconds: secs, attempted_at: at(i) }));
const session = (total: number, correct: number, duration = 300, created_at = at(0)) =>
  ({ total_questions: total, correct_count: correct, duration_seconds: duration, created_at });

describe('badge rules (same as the server)', () => {
  it('dates days in Mongolia time', () => {
    expect(ubDay('2026-02-18T20:00:00Z')).toBe('2026-02-19');
    expect(ubDay('2026-02-18T10:00:00Z')).toBe('2026-02-18');
  });

  it('finds the longest run of consecutive days', () => {
    expect(longestDayRun([])).toBe(0);
    expect(longestDayRun(['2026-02-19', '2026-02-18', '2026-02-18', '2026-02-21'])).toBe(2);
    expect(longestDayRun(['2026-02-27', '2026-02-28', '2026-03-01'])).toBe(3);
  });

  it('counts the longest correct run that fits the time limit', () => {
    expect(bestCorrectRun(attempts('1110111110'), 1000)).toBe(5);
    expect(bestCorrectRun(attempts('11111'), 30)).toBe(3);
    expect(bestCorrectRun([], 480)).toBe(0);
  });

  it('checks any window of answers for accuracy and time (Time Lord)', () => {
    expect(hasAccurateWindow(attempts('1111101111'), 10, 100, 90)).toBe(true);
    expect(hasAccurateWindow(attempts('1111001111'), 10, 100, 90)).toBe(false);
    expect(hasAccurateWindow(attempts('1111111111', 11), 10, 100, 90)).toBe(false);
    expect(hasAccurateWindow(attempts('111'), 10, 100, 90)).toBe(false);
  });

  it('only counts speed sessions with 5+ questions for Peak of Speed', () => {
    const sessions = [session(1, 1), session(2, 2), session(5, 5), session(20, 19), session(20, 18)];
    expect(countAccurateSessions(sessions, 5, 95)).toBe(2);
  });

  it('finds the longest run of perfect speed sessions in order', () => {
    const s = [session(3, 3, 300, at(1)), session(4, 3, 300, at(2)), session(2, 2, 300, at(3)), session(5, 5, 300, at(4)), session(0, 0, 300, at(5))];
    expect(longestPerfectRun(s)).toBe(2);
  });

  it('matches Lightning Strike on session length, size and accuracy', () => {
    const rule = { minQuestions: 10, maxSeconds: 300, minAccuracy: 80 };
    expect(hasQualifyingSession([session(10, 8, 300)], rule)).toBe(true);
    expect(hasQualifyingSession([session(10, 8, 600)], rule)).toBe(false);
    expect(hasQualifyingSession([session(9, 9, 300), session(10, 7, 300)], rule)).toBe(false);
  });

  it('never rounds a bar up to 100% before the target', () => {
    expect(percentOf(299, 300)).toBe(99);
    expect(percentOf(300, 300)).toBe(100);
    expect(percentOf(15, 10)).toBe(100);
    expect(percentOf(0, 0)).toBe(0);
  });
});
