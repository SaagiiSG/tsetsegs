import { describe, it, expect } from 'vitest';
import { ringPrize, ringPrizes, prizeLeft, prizeEarned, dayStartIso, tzOffsetMin } from './ringPrizes';

describe('ring prizes', () => {
  it('pays goal × rate with default goals', () =>
    expect(ringPrizes({ speed: 2, hard: 5, medium: 10 })).toEqual({ speed: 20, hard: 25, medium: 20, all: 25 }));

  it('caps the goal that counts', () => {
    expect(ringPrize('hard', 40)).toBe(75);
    expect(ringPrize('speed', 9)).toBe(50);
    expect(ringPrize('medium', 100)).toBe(60);
  });

  it('pays nothing for a zero or negative goal', () => {
    expect(ringPrize('speed', 0)).toBe(0);
    expect(ringPrize('hard', -3)).toBe(0);
  });

  it('counts what is left and earned', () => {
    const g = { speed: 2, hard: 5, medium: 10 };
    expect(prizeLeft(g, new Set())).toBe(90);
    expect(prizeLeft(g, new Set(['speed'] as const))).toBe(70);
    expect(prizeEarned(g, new Set(['speed', 'hard', 'medium', 'all'] as const))).toBe(90);
  });

  it('starts the day at local midnight', () => {
    const now = new Date(2026, 10, 10, 15, 30);
    expect(new Date(dayStartIso(now)).getTime()).toBe(new Date(2026, 10, 10).getTime());
    expect(tzOffsetMin(now)).toBe(-now.getTimezoneOffset());
  });
});
