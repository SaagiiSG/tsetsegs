import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { ringsToClaim } from './useCenterRingPrizes';
import { speedRunsToday } from './CenterDailyGoals';
import type { PrizeKey } from '@/lib/ringPrizes';
const none = new Set<PrizeKey>();
const goals = { speed: 2, hard: 5, medium: 10 };
describe('ringsToClaim', () => {
  it('claims every closed, unpaid ring', () => expect(ringsToClaim(goals, goals, none, none)).toEqual(['speed', 'hard', 'medium']));
  it('claims the bonus once all three are paid', () => expect(ringsToClaim(goals, goals, new Set<PrizeKey>(['speed', 'hard', 'medium']), none)).toEqual(['all']));
  it('asks for each ring once', () => expect(ringsToClaim(goals, goals, none, new Set<PrizeKey>(['speed']))).toEqual(['hard', 'medium']));
  it('skips a ring that is still open', () => expect(ringsToClaim({ ...goals, speed: 1 }, goals, none, none)).toEqual(['hard', 'medium']));
  it('never claims a ring with no goal, nor the bonus', () => {
    const g = { speed: 0, hard: 5, medium: 10 };
    expect(ringsToClaim(g, g, none, none)).toEqual(['hard', 'medium']);
    expect(ringsToClaim(g, g, new Set<PrizeKey>(['hard', 'medium']), none)).toEqual([]);
  });
});
describe('speedRunsToday', () => {
  it('ignores runs with nothing correct and runs before the start', () => {
    const start = new Date('2026-11-10T00:00:00');
    const runs = [
      { created_at: '2026-11-10T09:00:00', correct: 3 }, { created_at: '2026-11-10T10:00:00', correct: 0 }, { created_at: '2026-11-09T22:00:00', correct: 4 },
    ];
    expect(speedRunsToday(runs, start)).toBe(1);
  });
});
