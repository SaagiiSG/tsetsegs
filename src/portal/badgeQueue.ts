import type { CenterBadge } from './centerProfile';

/** Earned badges the student hasn't been shown yet, in list order. A seen key stays seen even if the badge is lost and won back. */
export function badgesToCelebrate(badges: CenterBadge[], seen: Set<string>): CenterBadge[] {
  return badges.filter(b => b.got && !seen.has(b.key));
}
