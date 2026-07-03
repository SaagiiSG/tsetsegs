// Mini Challenge scoring — mirrors regular practice:
// 1st correct = 10, 2nd = 5, 3rd = 2, 4th+ = 0. Wrong = 0.

export type Difficulty = 'easy' | 'medium' | 'hard' | string | null | undefined;

export function calculatePoints(isCorrect: boolean, attemptNumber: number): number {
  if (!isCorrect) return 0;
  if (attemptNumber <= 1) return 10;
  if (attemptNumber === 2) return 5;
  if (attemptNumber === 3) return 2;
  return 0;
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
