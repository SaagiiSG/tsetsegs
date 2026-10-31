export type RosterState = 'joined' | 'unlocked' | 'oath' | 'testing' | 'done';
type A = { code_verified_at: string | null; oath_accepted_at: string | null; status: string };

/** Where a student is. `sessionStarted` turns "oath taken" into "testing" (an attempt's started_at is just the join time). */
export function rosterState(a: A, sessionStarted = false): RosterState {
  if (a.status === 'completed') return 'done';
  if (a.oath_accepted_at) return sessionStarted ? 'testing' : 'oath';
  return a.code_verified_at ? 'unlocked' : 'joined';
}

/** Joined more than 2 minutes after the room started. */
export function isLateJoin(attemptStartedAt: string, sessionStartedAt: string | null): boolean {
  return !!sessionStartedAt && Date.parse(attemptStartedAt) - Date.parse(sessionStartedAt) > 120_000;
}
