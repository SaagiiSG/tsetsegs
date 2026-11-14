import type { GoalIntensity } from '@/hooks/useDailyGoals';
import { SAT_DATES } from '@/lib/satDates';
import { localDate } from './centerApi';
import { CENTER_SAT_UNLOCK_AT } from './centerSatSimulation';
import type { CenterGoals } from './CenterDailyGoals';

/** Step to open onboarding at, or null for the normal portal. Unknown eligibility or goals means no onboarding.
 *  A student with answers but no onboarding row started on the old frontend, so they're never forced in. */
export function onboardingStep(eligible: boolean | undefined, goals: CenterGoals | undefined, hasAttempts: boolean): number | null {
  if (eligible !== true || !goals || goals.onboarding_done_at) return null;
  return goals.onboarding_step ?? (goals.isSet || hasAttempts ? null : 1);
}

export type GateLatch = { user: string; step: number | null } | null;
/** The gate decides once per signed-in user, when its reads settle, so neither a late goals refetch nor the step-6 answer
 *  (which makes hasAttempts true while the cached row still says no step) can flip it mid-flow. A new user decides afresh. */
export function latchGate(prev: GateLatch, user: string, settled: boolean, live: number | null): GateLatch {
  if (prev && prev.user === user) return prev;
  return settled ? { user, step: live } : null;
}

/** Steps 2-5 can be skipped; step 6 too once an answer failed to save, so a broken connection can't trap the student. */
export const canSkip = (step: number, saveFailed = false) => (step >= 2 && step <= 5) || (step === 6 && saveFailed);

/** Where Back goes. Step 7 skips the step-6 question so it is never answered twice. */
export const backStep = (step: number) => (step <= 1 ? null : step === 7 ? 5 : step - 1);

/** Solo students have no center to thank: "flowersos set you up on FlowersOS" reads wrong. */
export const welcomeCopy = (centerName: string, solo = false) =>
  solo ? "Let's build your SAT plan. 6 quick steps, under a minute." : `${centerName} set you up on FlowersOS. 6 quick steps, about 2 minutes.`;

/** One-tap answers move on by themselves: "Not yet" on the practice score, any section. "Yes, about" needs a typed score,
 *  and the SAT date stays put so the day count can finish and its message land, so both wait for Continue. */
export const autoAdvances = (step: number, choice: string | null) => step === 5 || (step === 3 && choice === 'no');

/** The line after the day count lands. Hype, never a score number (no score promises). */
export const dateMessage = (days: number | null) =>
  days == null ? "No problem, you can add it later. Next, let's set your target."
  : days < 30 ? "Tight, but every day counts. Let's go."
  : "Plenty of time for a real jump. Next, let's set your target.";

/** Step 7's heading, from the chosen pace: [lead, name]. */
export const planProfile = (intensity: GoalIntensity): [string, string] =>
  intensity === 'intense' ? ["You're a", 'Sprinter'] : intensity === 'gradual' ? ["You're a", 'Steady Climber'] : ["You're an", 'Explorer'];

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

/** The line under "Help me pick", so the button always says something even when the pick equals the current target. */
export const helpMePickReason = (prior: number | null) =>
  prior == null ? '1300 is a strong first goal. You can raise it later.'
  : prior >= 1450 ? '1600 it is. Aim for the top.'
  : prior < 850 ? '1000 is a solid place to start. You can raise it later.'
  : `Your ${prior} practice score + 150 is a stretch you can hit.`;

export function defaultIntensity(daysToSat: number | null): GoalIntensity {
  if (daysToSat == null) return 'gradual';
  return daysToSat <= 60 ? 'intense' : daysToSat <= 120 ? 'gradual' : 'with_the_flow';
}

/** Daily questions in the ring, and how long until the Math prediction unlocks at that pace. */
export function ringPlanCopy(goals: { hard: number; medium: number }, distinctMath: number, weak: string | null) {
  const perDay = goals.hard + goals.medium;
  if (weak === 'reading_writing') {
    const left = CENTER_SAT_UNLOCK_AT - distinctMath;
    return `About ${perDay} questions a day. The score prediction covers Math only and ${left <= 0 ? 'is already unlocked' : `unlocks after ${left} more Math questions`}.`;
  }
  const head = `About ${perDay} questions a day. Your Math score prediction`;
  if (distinctMath >= CENTER_SAT_UNLOCK_AT) return `${head} is already unlocked.`;
  const weeks = Math.max(1, Math.round(Math.ceil((CENTER_SAT_UNLOCK_AT - distinctMath) / perDay) / 7));
  return `${head} unlocks in about ${weeks === 1 ? 'a week' : `${weeks} weeks`}.`;
}

export const questionSubjects = (weak: string | null) => (weak === 'reading_writing' ? ['english', 'English'] : ['math', 'Math']);

/** The ring counts only correct medium/hard answers, so an easy one never claims ring progress. A free solo user (`free`)
 *  gets no explanation, so their copy doesn't point at one. */
export function stepSixMessage(result: { is_correct: boolean; points: number } | null, tryNo: 1 | 2, difficulty: string | null, free = false) {
  if (!result) return "We couldn't save that answer. Check your connection and try again.";
  if (!result.is_correct && free) return tryNo === 1 ? 'Not quite. Give it one more try.' : 'Good try. Practice makes these click.';
  if (!result.is_correct) return tryNo === 1 ? 'Not quite. Read how it works, then try once more.' : "Good try — here's how it works";
  const paid = result.points > 0 ? `+${result.points} points` : 'Correct';
  return ['medium', 'hard'].includes((difficulty ?? '').toLowerCase()) ? `${paid}, your ring moved` : paid;
}
