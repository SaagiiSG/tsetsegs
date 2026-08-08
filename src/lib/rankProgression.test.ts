import { describe, it, expect } from 'vitest';
import {
  computeSprintOutcome,
  computeSeasonEndOutcome,
  getRankOutcome,
  LAST_SPRINT_OF_SEASON,
} from './rankProgression';
import { TIER_ORDER, TIER_PROMOTION_CUTOFFS, TierType } from '@/data/badgeDefinitions';

describe('sprint progression (non-finale sprints)', () => {
  it('promotes everyone at or above the tier cutoff', () => {
    for (const tier of TIER_ORDER) {
      if (tier === 'ruby') continue;
      const cutoff = TIER_PROMOTION_CUTOFFS[tier];
      const at = computeSprintOutcome(tier, cutoff);
      expect(at.rule).toBe('promoted');
      expect(at.nextTier).toBe(TIER_ORDER[TIER_ORDER.indexOf(tier) + 1]);
    }
  });

  it('drops one tier just below the cutoff', () => {
    expect(computeSprintOutcome('silver', TIER_PROMOTION_CUTOFFS.silver + 1)).toMatchObject({
      rule: 'dropped',
      nextTier: 'bronze',
    });
    expect(computeSprintOutcome('gold', 11)).toMatchObject({ rule: 'dropped', nextTier: 'silver' });
  });

  it('floors unranked drops at unranked', () => {
    expect(computeSprintOutcome('unranked', 999)).toMatchObject({ nextTier: 'unranked' });
  });

  it('keeps only ruby rank 1, drops the rest to diamond', () => {
    expect(computeSprintOutcome('ruby', 1)).toMatchObject({ rule: 'stayed', nextTier: 'ruby' });
    expect(computeSprintOutcome('ruby', 2)).toMatchObject({ rule: 'dropped', nextTier: 'diamond' });
  });

  it('promotes diamond rank 1 to ruby only', () => {
    expect(computeSprintOutcome('diamond', 1)).toMatchObject({ rule: 'promoted', nextTier: 'ruby' });
    expect(computeSprintOutcome('diamond', 2)).toMatchObject({ rule: 'dropped', nextTier: 'platinum' });
  });
});

describe('season-end rule (last sprint of the season)', () => {
  it('preserves the exact tier for the winner of every tier', () => {
    for (const tier of TIER_ORDER) {
      const out = computeSeasonEndOutcome(tier, 1);
      expect(out.rule).toBe('preserved');
      expect(out.nextTier).toBe(tier);
      expect(out.label).toBe('Rank preserved');
    }
  });

  it('does NOT promote the winner even when they cleared the cutoff', () => {
    // bronze P1 would be promoted to silver on a normal sprint
    expect(computeSprintOutcome('bronze', 1).nextTier).toBe('silver');
    // ...but at season end the tier is preserved
    expect(computeSeasonEndOutcome('bronze', 1).nextTier).toBe('bronze');
  });

  it('demotes every non-winner by exactly one tier', () => {
    const cases: Array<[TierType, TierType]> = [
      ['ruby', 'diamond'],
      ['diamond', 'platinum'],
      ['platinum', 'gold'],
      ['gold', 'silver'],
      ['silver', 'bronze'],
      ['bronze', 'unranked'],
    ];
    for (const [tier, expected] of cases) {
      expect(computeSeasonEndOutcome(tier, 2)).toMatchObject({ rule: 'dropped', nextTier: expected });
    }
  });

  it('demotes non-winners regardless of how close to the cutoff they finished', () => {
    const inCutoff = computeSeasonEndOutcome('bronze', TIER_PROMOTION_CUTOFFS.bronze);
    expect(inCutoff.nextTier).toBe('unranked');
    expect(inCutoff.rule).toBe('dropped');
  });

  it('floors unranked non-winners at unranked', () => {
    expect(computeSeasonEndOutcome('unranked', 50)).toMatchObject({ rule: 'stayed', nextTier: 'unranked' });
  });
});

describe('getRankOutcome dispatch', () => {
  it('uses sprint rules for sprints 1 and 2', () => {
    expect(getRankOutcome('bronze', 1, { sprintNumber: 1 }).nextTier).toBe('silver');
    expect(getRankOutcome('bronze', 1, { sprintNumber: 2 }).nextTier).toBe('silver');
  });

  it('uses season-end rules for the last sprint', () => {
    expect(getRankOutcome('bronze', 1, { sprintNumber: LAST_SPRINT_OF_SEASON }).rule).toBe('preserved');
    expect(getRankOutcome('bronze', 5, { sprintNumber: LAST_SPRINT_OF_SEASON }).nextTier).toBe('unranked');
  });
});

describe('parity with real production-shaped data', () => {
  // Mirrors the season-8 sprint-3 shape: 6 tier/group buckets, one winner each.
  const buckets: Array<{ tier: TierType; size: number }> = [
    { tier: 'unranked', size: 10 },
    { tier: 'bronze', size: 73 },
    { tier: 'bronze', size: 30 },
    { tier: 'silver', size: 79 },
    { tier: 'silver', size: 25 },
    { tier: 'ruby', size: 1 },
  ];

  it('preserves every group winner and demotes everyone else', () => {
    let preserved = 0;
    let demotedOrFloored = 0;

    for (const { tier, size } of buckets) {
      for (let rank = 1; rank <= size; rank++) {
        const out = computeSeasonEndOutcome(tier, rank);
        if (rank === 1) {
          expect(out.nextTier).toBe(tier);
          preserved++;
        } else {
          expect(out.nextTier).not.toBe(tier === 'unranked' ? 'impossible' : tier);
          demotedOrFloored++;
        }
      }
    }

    expect(preserved).toBe(buckets.length);
    expect(demotedOrFloored).toBe(buckets.reduce((s, b) => s + b.size, 0) - buckets.length);
  });
});
