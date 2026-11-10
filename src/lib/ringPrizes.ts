import { type Ring } from '@/portal/studentStats';

export type RingKey = 'speed' | 'hard' | 'medium';
export type PrizeKey = RingKey | 'all';

export const RING_RATE: Record<RingKey, number> = {
  speed: 10,
  hard: 5,
  medium: 2,
};

export const RING_CAP: Record<RingKey, number> = {
  speed: 5,
  hard: 15,
  medium: 30,
};

export const ALL_RINGS_BONUS = 25;

export function ringPrize(ring: RingKey, goal: number): number {
  if (goal <= 0) return 0;
  const capped = Math.min(goal, RING_CAP[ring]);
  return capped * RING_RATE[ring];
}

export function ringPrizes(goals: Ring): Record<PrizeKey, number> {
  return {
    speed: ringPrize('speed', goals.speed),
    hard: ringPrize('hard', goals.hard),
    medium: ringPrize('medium', goals.medium),
    all: ALL_RINGS_BONUS,
  };
}

export function prizeLeft(goals: Ring, paid: ReadonlySet<PrizeKey>): number {
  const allPrizes = ringPrizes(goals);
  let sum = 0;
  for (const key of Object.keys(allPrizes) as PrizeKey[]) {
    if (!paid.has(key)) {
      sum += allPrizes[key];
    }
  }
  return sum;
}

export function prizeEarned(goals: Ring, paid: ReadonlySet<PrizeKey>): number {
  const allPrizes = ringPrizes(goals);
  let sum = 0;
  for (const key of Object.keys(allPrizes) as PrizeKey[]) {
    if (paid.has(key)) {
      sum += allPrizes[key];
    }
  }
  return sum;
}

export function dayStartIso(now: Date = new Date()): string {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return midnight.toISOString();
}

export function tzOffsetMin(now: Date = new Date()): number {
  return -now.getTimezoneOffset();
}
