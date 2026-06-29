// Points formula for Mini Challenges.
// Keeps it simple, deterministic, and weighted by difficulty + speed.
// Mirrors the *feel* of the regular practice scoring without coupling to it.

export type Difficulty = 'easy' | 'medium' | 'hard' | string | null | undefined;

const BASE_POINTS: Record<string, number> = {
  easy: 80,
  medium: 130,
  hard: 220,
};

const DEFAULT_BASE = 130;
const TARGET_TIME_MS = 45_000; // beyond this, speed bonus is 0

export function calculatePoints(
  isCorrect: boolean,
  difficulty: Difficulty,
  timeMs: number,
): number {
  if (!isCorrect) return 0;
  const key = (difficulty ?? '').toString().toLowerCase();
  const base = BASE_POINTS[key] ?? DEFAULT_BASE;
  const speedFactor = Math.max(0, 1 - timeMs / TARGET_TIME_MS);
  const speedBonus = Math.round(base * speedFactor * 0.6);
  return Math.round(base * 0.6) + speedBonus;
}

export const QUESTION_SETS = [
  { value: '68', label: '68 Problems' },
  { value: 'CollegeBoard', label: 'CollegeBoard' },
  { value: 'SATMathTraining800', label: '150 Hard' },
  { value: 'English', label: 'English' },
  { value: 'all', label: 'All' },
] as const;

export const FORMAT_LABELS: Record<string, string> = {
  first_to_points: 'First to N points',
  first_to_correct: 'First to N correct',
  time_sprint: 'Time sprint',
  fixed_set: 'Fixed set race',
};

export const FORMAT_TARGETS: Record<string, number[]> = {
  first_to_points: [100, 500, 1000],
  first_to_correct: [10, 25, 50, 100],
  fixed_set: [10, 20],
};

export const SPRINT_DURATIONS = [300, 600]; // 5 / 10 min
