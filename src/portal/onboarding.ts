import type { GoalIntensity } from '@/hooks/useDailyGoals';
import { SAT_DATES } from '@/lib/satDates';
import { localDate } from './centerApi';
import { CENTER_SAT_UNLOCK_AT } from './centerSatSimulation';
import type { CenterGoals } from './CenterDailyGoals';

/** Step to open onboarding at, or null for the normal portal. Unknown eligibility or goals means no onboarding. */
export function onboardingStep(eligible: boolean | undefined, goals: CenterGoals | undefined): number | null {
  if (!eligible || !goals || goals.onboarding_done_at) return null;
  return goals.onboarding_step ?? (goals.isSet ? null : 1);
}

export const canSkip = (step: number) => step >= 2 && step <= 5;

export const welcomeCopy = (centerName: string) => `${centerName} set you up on FlowersOS. 6 quick steps, about 2 minutes.`;

/** Official SAT dates from today on; the admin's SAT month (YYYY-MM) picks its real date when that date is still ahead. */
export function satDateOptions(now: Date, satMonth: string | null) {
  const today = localDate(now);
  const options = SAT_DATES.filter(d => d >= today).map(value => ({
    value, label: new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
  }));
  return { options, prefill: (satMonth && options.find(o => o.value.startsWith(satMonth))?.value) || null };
}

export const helpMePick = (prior: number | null) =>
  prior == null ? 1300 : Math.min(1600, Math.max(1000, Math.round((prior + 150) / 50) * 50));

export function defaultIntensity(daysToSat: number | null): GoalIntensity {
  if (daysToSat == null) return 'gradual';
  return daysToSat <= 60 ? 'intense' : daysToSat <= 120 ? 'gradual' : 'with_the_flow';
}

/** Daily questions in the ring, and how long until the Math prediction unlocks at that pace. */
export function ringPlanCopy(goals: { hard: number; medium: number }, distinctMath: number) {
  const perDay = goals.hard + goals.medium;
  const head = `About ${perDay} questions a day. Your Math score prediction`;
  if (distinctMath >= CENTER_SAT_UNLOCK_AT) return `${head} is already unlocked.`;
  const weeks = Math.max(1, Math.round(Math.ceil((CENTER_SAT_UNLOCK_AT - distinctMath) / perDay) / 7));
  return `${head} unlocks in about ${weeks === 1 ? 'a week' : `${weeks} weeks`}.`;
}

export const questionSubjects = (weak: string | null) => (weak === 'reading_writing' ? ['english', 'English'] : ['math', 'Math']);

/** The ring counts only correct medium/hard answers, so an easy one never claims ring progress. */
export function stepSixMessage(result: { is_correct: boolean; points: number } | null, tryNo: 1 | 2, difficulty: string | null) {
  if (!result) return "We couldn't save that answer. Check your connection and try again.";
  if (!result.is_correct) return tryNo === 1 ? 'Not quite. Read how it works, then try once more.' : "Good try — here's how it works";
  const paid = result.points > 0 ? `+${result.points} points` : 'Correct';
  return ['medium', 'hard'].includes((difficulty ?? '').toLowerCase()) ? `${paid}, your ring moved` : paid;
}
