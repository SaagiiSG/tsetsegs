import { describe, expect, it } from 'vitest';
import { sprintPointsByDay } from './sprintPoints';

describe('sprintPointsByDay', () => {
  const rows = [
    { created_at: '2026-10-01T03:00:00+00:00', points: 10 },
    { created_at: '2026-10-01T22:00:00+00:00', points: 5 },
    { created_at: '2026-10-03T08:00:00.123+00:00', points: 20 },
  ];

  it('adds up real points day by day, flat on days with none', () => {
    expect(sprintPointsByDay(rows, '2026-10-01', '2026-10-07', new Date('2026-10-04T12:00:00Z'))).toEqual([
      { day: 1, points: 15 }, { day: 2, points: 15 }, { day: 3, points: 35 }, { day: 4, points: 35 },
    ]);
  });

  it('stops at the last sprint day once the sprint is over', () => {
    const out = sprintPointsByDay(rows, '2026-10-01', '2026-10-03', new Date('2026-11-01T00:00:00Z'));
    expect(out).toHaveLength(3);
    expect(out[2].points).toBe(35);
  });
});
