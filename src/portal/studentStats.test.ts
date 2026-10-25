import { describe, it, expect } from 'vitest';
import { attemptPoints, runPoints, todayPoints, ringStatus, activeSprintId, rankFromBoard } from './studentStats';
const at = (s: string) => new Date(s).toISOString();
const now = new Date('2026-10-25T15:00:00');
describe('todayPoints', () => {
  it('adds what the server paid since local midnight, speed runs at 10 per correct', () => {
    const attempts = [
      { created_at: at('2026-10-25T09:00:00'), is_correct: true, points: 10 },
      { created_at: at('2026-10-25T09:05:00'), is_correct: true, points: 5 },
      { created_at: at('2026-10-25T09:06:00'), is_correct: false, points: 0 },
      { created_at: at('2026-10-25T09:07:00'), is_correct: true, points: null },
      { created_at: at('2026-10-24T23:59:00'), is_correct: true, points: 10 },
    ];
    const runs = [{ created_at: at('2026-10-25T10:00:00'), correct: 3 }, { created_at: at('2026-10-24T10:00:00'), correct: 4 }];
    expect(todayPoints(attempts, runs, now)).toBe(55);
  });
  it('zero data', () => expect(todayPoints([], [], now)).toBe(0));
});
describe('points flown', () => {
  it('flies exactly what the chip adds', () => {
    const t = at('2026-10-25T14:00:00');
    const row = { created_at: t, is_correct: true, points: 5 }, legacy = { created_at: t, is_correct: true, points: null }, run = { created_at: t, correct: 3 };
    expect(attemptPoints(row)).toBe(5); expect(attemptPoints(legacy)).toBe(10); expect(attemptPoints({ is_correct: false, points: 0 })).toBe(0);
    expect(runPoints(run)).toBe(30);
    expect(todayPoints([row, legacy], [run], now) - todayPoints([legacy], [], now)).toBe(attemptPoints(row) + runPoints(run));
  });
});
describe('ringStatus', () => {
  it('counts closed rings, percent and what is left', () => {
    expect(ringStatus({ speed: 1, hard: 2, medium: 10 }, { speed: 2, hard: 5, medium: 10 })).toEqual({ closed: 1, pct: 76, questionsLeft: 3, speedLeft: 1, done: false });
    expect(ringStatus({ speed: 3, hard: 6, medium: 12 }, { speed: 2, hard: 5, medium: 10 })).toEqual({ closed: 3, pct: 100, questionsLeft: 0, speedLeft: 0, done: true });
  });
  it('zero data', () => expect(ringStatus({ speed: 0, hard: 0, medium: 0 }, { speed: 2, hard: 5, medium: 10 })).toEqual({ closed: 0, pct: 0, questionsLeft: 15, speedLeft: 2, done: false }));
});
describe('rank chip', () => {
  it('uses the active sprint, else all-time, and waits for the list', () => {
    expect(activeSprintId([{ id: 's1', status: 'finished' }, { id: 's2', status: 'active' }])).toBe('s2');
    expect(activeSprintId([{ id: 's1', status: 'finished' }, { id: 's3', status: 'paused' }])).toBeNull();
    expect(activeSprintId(undefined)).toBeUndefined();
  });
  it('reads my place and league from the board', () => {
    const rows = [{ student_id: 'a', standing: 1, tier: 'gold' }, { student_id: 'b', standing: 2, tier: 'nonsense' }];
    expect(rankFromBoard(rows, 'a')).toEqual({ place: 1, tier: 'gold' });
    expect(rankFromBoard(rows, 'b')).toEqual({ place: 2, tier: 'unranked' });
    expect(rankFromBoard(rows, 'zzz')).toBeNull();
    expect(rankFromBoard(undefined, 'a')).toBeNull();
  });
});
