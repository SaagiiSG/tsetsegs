import { TIER_ORDER, type TierType } from '@/data/badgeDefinitions';

export type Ring = { speed: number; hard: number; medium: number };

// Board rule: points ?? (is_correct ? 10 : 0) per attempt, correct * 10 per speed run.
export function todayPoints(
  attempts: { created_at: string; is_correct: boolean; points: number | null }[],
  runs: { created_at: string; correct: number }[],
  now: Date = new Date(),
): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const today = (s: string) => new Date(s).getTime() >= midnight;
  return (
    attempts.filter((a) => today(a.created_at)).reduce((n, a) => n + (a.points ?? (a.is_correct ? 10 : 0)), 0) +
    runs.filter((r) => today(r.created_at)).reduce((n, r) => n + r.correct * 10, 0)
  );
}

export function ringStatus(progress: Ring, goals: Ring) {
  const keys: (keyof Ring)[] = ['speed', 'hard', 'medium'];
  const left = (k: keyof Ring) => Math.max(0, goals[k] - progress[k]);
  const goalTotal = keys.reduce((n, k) => n + goals[k], 0);
  const doneTotal = keys.reduce((n, k) => n + Math.min(progress[k], goals[k]), 0);
  const closed = keys.filter((k) => left(k) === 0).length;
  return {
    closed,
    pct: goalTotal ? Math.round((100 * doneTotal) / goalTotal) : 0,
    questionsLeft: left('hard') + left('medium'),
    speedLeft: left('speed'),
    done: closed === keys.length,
  };
}

// undefined = sprint list still loading; null = no active sprint (use all-time board).
export function activeSprintId(sprints: { id: string; status: string }[] | undefined): string | null | undefined {
  if (!sprints) return undefined;
  return sprints.find((s) => s.status === 'active')?.id ?? null;
}

export function rankFromBoard(
  rows: { student_id: string; standing: number; tier: string | null }[] | undefined,
  studentId: string,
): { place: number; tier: TierType } | null {
  const me = rows?.find((r) => r.student_id === studentId);
  if (!me) return null;
  const tier = TIER_ORDER.find((t) => t === me.tier) ?? 'unranked';
  return { place: me.standing, tier };
}
