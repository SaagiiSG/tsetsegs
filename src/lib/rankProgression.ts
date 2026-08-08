import { TIER_ORDER, TIER_PROMOTION_CUTOFFS, TierType } from '@/data/badgeDefinitions';

/**
 * Single source of truth for sprint rank progression, mirroring the
 * `finalize-sprint` edge function. Keep both in sync.
 *
 * Rules:
 *  - Per sprint: within a tier+group, rank <= cutoff → promote one tier,
 *    otherwise → drop one tier. Ruby only keeps rank 1 (others → diamond).
 *  - Season end (last sprint of the season): the group winner (P1) PRESERVES
 *    their exact tier into the next season. Everyone else drops one tier
 *    (floored at unranked).
 */

export const LAST_SPRINT_OF_SEASON = 3;

export type RankRule = 'preserved' | 'promoted' | 'dropped' | 'stayed';

export interface RankOutcome {
  rule: RankRule;
  nextTier: TierType;
  label: string;
}

export function tierIndex(tier: string): number {
  const i = TIER_ORDER.indexOf(tier as TierType);
  return i < 0 ? 0 : i;
}

export function nextTierOf(tier: string): TierType {
  const i = tierIndex(tier);
  return i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : (tier as TierType);
}

export function prevTierOf(tier: string): TierType {
  const i = tierIndex(tier);
  return TIER_ORDER[Math.max(0, i - 1)];
}

export function promotionCutoff(tier: string): number {
  return TIER_PROMOTION_CUTOFFS[tier as TierType] ?? 20;
}

/** Outcome of a normal (non season-ending) sprint. */
export function computeSprintOutcome(tier: string, rank: number): RankOutcome {
  const t = (TIER_ORDER.includes(tier as TierType) ? tier : 'unranked') as TierType;

  if (t === 'ruby') {
    return rank === 1
      ? { rule: 'stayed', nextTier: 'ruby', label: 'Rank kept' }
      : { rule: 'dropped', nextTier: 'diamond', label: 'Drops to Diamond' };
  }

  const isAdvancing = rank <= promotionCutoff(t) && tierIndex(t) < TIER_ORDER.length - 1;
  const nextTier = isAdvancing ? nextTierOf(t) : prevTierOf(t);
  return {
    rule: isAdvancing ? 'promoted' : 'dropped',
    nextTier,
    label: isAdvancing ? 'Advancing' : nextTier === t ? 'Rank kept' : 'Drops a tier',
  };
}

/**
 * Outcome of the LAST sprint of a season — carried into the next season.
 * P1 preserves their exact tier; everyone else drops one tier.
 */
export function computeSeasonEndOutcome(tier: string, rank: number): RankOutcome {
  const t = (TIER_ORDER.includes(tier as TierType) ? tier : 'unranked') as TierType;

  if (rank === 1) {
    return { rule: 'preserved', nextTier: t, label: 'Rank preserved' };
  }

  const nextTier = prevTierOf(t);
  return {
    rule: nextTier === t ? 'stayed' : 'dropped',
    nextTier,
    label: nextTier === t ? 'Stays Unranked' : 'Drops a tier',
  };
}

/** Convenience wrapper used by the leaderboard UI. */
export function getRankOutcome(
  tier: string,
  rank: number,
  opts: { sprintNumber?: number | null } = {}
): RankOutcome {
  const isSeasonFinale = opts.sprintNumber === LAST_SPRINT_OF_SEASON;
  return isSeasonFinale ? computeSeasonEndOutcome(tier, rank) : computeSprintOutcome(tier, rank);
}
