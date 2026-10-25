import { describe, it, expect } from 'vitest';
import { centerLevel, centerBadges, toProfileView, type RawProfile } from './centerProfile';
const raw: RawProfile = { name: 'Ana Lee', class_name: 'SAT A', joined: '2026-09-01T00:00:00Z', tier: 'gold', points: 250, practice_answered: 40, practice_correct: 30, math_correct: 20, english_correct: 10, speed_runs: 3, best_speed: 9, present: 10, solved_ids: ['q1', 'q2'], last_active: '2026-10-24T10:00:00Z',
  activity: [{ date: '2026-10-23', points: 20, answers: 3 }, { date: '2026-10-24', points: 15, answers: 2 }],
  history: [{ sprint: 'Sprint 1', tier: 'silver', next_tier: 'gold', position: 4, points: 120 }, { sprint: 'Sprint 2', tier: 'gold', next_tier: 'silver', position: 30, points: 10 }] };
const today = new Date('2026-10-25T12:00:00');
describe('centerLevel', () => it('matches the leaderboard level', () => {
  expect(centerLevel(0)).toEqual({ level: 1, progress: 0, toNext: 100 });
  expect(centerLevel(250)).toEqual({ level: 2, progress: 75, toNext: 50 });
  expect(centerLevel(300)).toEqual({ level: 3, progress: 0, toNext: 400 });
}));
describe('toProfileView', () => {
  it('fills a full year and maps rank history', () => {
    const v = toProfileView(raw, today);
    expect(v.activity).toHaveLength(365); expect(v.activity[0].date).toBe('2025-10-26');
    expect(v.activity.at(-1)).toEqual({ date: '2026-10-25', points: 0, sessionsCount: 0 });
    expect(v.activity.at(-2)).toEqual({ date: '2026-10-24', points: 15, sessionsCount: 2 });
    expect(v.activeDays).toEqual(['2026-10-23', '2026-10-24']);
    expect(v.rankHistory).toEqual([
      { sprint: 'Sprint 1', sprintNumber: 1, seasonNumber: 1, rank: 'gold', finalPoints: 120, position: 4 },
      { sprint: 'Sprint 2', sprintNumber: 2, seasonNumber: 1, rank: 'gold', finalPoints: 10, position: 30 }]);
    expect(v.tier).toBe('gold'); expect(v.level).toEqual({ level: 2, progress: 75, toNext: 50 });
  });
  it('zero-data profile', () => {
    const v = toProfileView({ ...raw, points: 0, activity: [], history: [], solved_ids: [], tier: 'unranked' }, today);
    expect(v.activity.every(d => d.points === 0)).toBe(true); expect(v.rankHistory).toEqual([]); expect(v.activeDays).toEqual([]);
    expect(v.level).toEqual({ level: 1, progress: 0, toNext: 100 });
  });
});
describe('centerBadges', () => it('uses the Badges page rules', () => {
  const b = centerBadges({ answered: 120, correct: 100, present: 10, solved: new Set(['a', 'b']), setIds: { '68': ['a', 'b'], SATMathTraining800: ['a', 'c'], CB: [] } });
  expect(b.filter(x => x.got).map(x => x.name)).toEqual(['First steps', 'Centurion', 'Sharpshooter', 'Regular', '68 master']);
  expect(b.find(x => x.name === '150 master')!.prog).toEqual([1, 2]);
  expect(b.find(x => x.name === 'CB master')).toMatchObject({ got: false, prog: [0, 1] });
}));
