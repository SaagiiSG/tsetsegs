// The server's badge rules (student_badge_earned in drizzle/migrations 0027/0029/0052),
// used only to draw progress bars. Unlocking is decided by the server.

export interface AttemptRow { is_correct: boolean | null; time_spent_seconds: number | null; attempted_at: string }
export interface SpeedSessionRow { total_questions: number; correct_count: number; duration_seconds: number; created_at: string }

const DAY_MS = 86_400_000;

const ubFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' });
/** Calendar day in Mongolia, which is how the server dates activity. */
export const ubDay = (ts: string) => ubFormat.format(new Date(ts));

export function longestDayRun(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0, run = 0;
  sorted.forEach((d, i) => {
    run = i > 0 && Date.parse(d) - Date.parse(sorted[i - 1]) === DAY_MS ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

/** Longest run of correct answers in a row whose times add up to at most maxSeconds. */
export function bestCorrectRun(attempts: AttemptRow[], maxSeconds: number): number {
  let best = 0;
  for (let i = 0; i < attempts.length; i++) {
    let secs = 0, run = 0;
    for (let j = i; j < attempts.length && attempts[j].is_correct; j++) {
      secs += attempts[j].time_spent_seconds ?? 0;
      if (secs > maxSeconds) break;
      run++;
    }
    best = Math.max(best, run);
  }
  return best;
}

/** Some `size` answers in a row took at most maxSeconds with at least minAccuracy% right. */
export function hasAccurateWindow(attempts: AttemptRow[], size: number, maxSeconds: number, minAccuracy: number): boolean {
  let secs = 0, right = 0;
  for (let i = 0; i < attempts.length; i++) {
    secs += attempts[i].time_spent_seconds ?? 0;
    right += attempts[i].is_correct ? 1 : 0;
    if (i >= size) {
      secs -= attempts[i - size].time_spent_seconds ?? 0;
      right -= attempts[i - size].is_correct ? 1 : 0;
    }
    if (i >= size - 1 && secs <= maxSeconds && right * 100 >= minAccuracy * size) return true;
  }
  return false;
}

const accurate = (s: SpeedSessionRow, minAccuracy: number) => s.correct_count * 100 >= minAccuracy * s.total_questions;

export const countAccurateSessions = (sessions: SpeedSessionRow[], minQuestions: number, minAccuracy: number) =>
  sessions.filter(s => s.total_questions >= minQuestions && accurate(s, minAccuracy)).length;

export function longestPerfectRun(sessions: SpeedSessionRow[]): number {
  let best = 0, run = 0;
  [...sessions].sort((a, b) => a.created_at.localeCompare(b.created_at)).forEach(s => {
    run = s.total_questions > 0 && s.correct_count === s.total_questions ? run + 1 : 0;
    best = Math.max(best, run);
  });
  return best;
}

export const hasQualifyingSession = (
  sessions: SpeedSessionRow[],
  rule: { minQuestions: number; maxSeconds: number; minAccuracy: number },
) => sessions.some(s => s.total_questions >= rule.minQuestions && s.duration_seconds <= rule.maxSeconds && accurate(s, rule.minAccuracy));

/** Rounds down, so 299/300 shows 99% and not a finished bar. */
export const percentOf = (current: number, target: number) =>
  target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 0;
