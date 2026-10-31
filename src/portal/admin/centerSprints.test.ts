import { describe, expect, it } from 'vitest';
import { addDays, seasonSlots, tierBoards } from './centerSprints';

const sprint = (n: number, starts_on: string, ends_on: string, status: string) =>
  ({ id: `s${n}`, name: `Season 2 · Sprint ${n}`, starts_on, ends_on, status, season_number: 2, sprint_number: n, auto_next: true });

describe('addDays', () => {
  it('moves across months', () => expect(addDays('2026-10-30', 3)).toBe('2026-11-02'));
});

describe('seasonSlots', () => {
  it('shows done, now and the planned sprints after the running one', () => {
    const slots = seasonSlots([sprint(1, '2026-10-21', '2026-10-27', 'finished'), sprint(2, '2026-10-28', '2026-11-03', 'active')]);
    expect(slots.map(s => [s.n, s.state, s.starts_on, s.ends_on])).toEqual([
      [1, 'done', '2026-10-21', '2026-10-27'],
      [2, 'now', '2026-10-28', '2026-11-03'],
      [3, 'planned', '2026-11-04', '2026-11-10'],
    ]);
  });

  it('plans nothing after a stopped cycle', () => {
    const slots = seasonSlots([{ ...sprint(1, '2026-10-21', '2026-10-27', 'active'), auto_next: false }]);
    expect(slots.map(s => s.state)).toEqual(['now', 'off', 'off']);
  });
});

describe('tierBoards', () => {
  const row = (student_id: string, tier: string, points: number) => ({ student_id, name: student_id, class_name: null, tier, points, answered: points / 10, standing: 0 });

  it('lists the highest tier first, ranked inside the tier, with who moves up or down', () => {
    const board = [row('a', 'gold', 300), row('b', 'bronze', 200), row('c', 'gold', 100), row('d', 'bronze', 0)];
    expect(tierBoards(board).map(t => [t.tier, t.rows.map(r => `${r.student_id}${r.place}${r.move}`)])).toEqual([
      ['gold', ['a1up', 'c2up']],
      ['bronze', ['b1up', 'd2down']],
    ]);
  });

  it('only the top 10 of gold move up', () => {
    const gold = Array.from({ length: 12 }, (_, i) => row(`g${i}`, 'gold', 500 - i));
    expect(tierBoards(gold)[0].rows.map(r => r.move)).toEqual([...Array(10).fill('up'), 'down', 'down']);
  });

  it('ruby #1 stays and everyone else in ruby moves down; unranked students without points stay', () => {
    const t = tierBoards([row('r1', 'ruby', 50), row('r2', 'ruby', 40), row('u', 'unranked', 0)]);
    expect(t[0].rows.map(r => r.move)).toEqual(['stay', 'down']);
    expect(t[1].rows.map(r => r.move)).toEqual(['stay']);
  });
});
