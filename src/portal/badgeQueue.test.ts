import { describe, expect, it } from 'vitest';
import { badgesToCelebrate } from './badgeQueue';
import type { CenterBadge } from './centerProfile';

const badge = (key: string, got: boolean): CenterBadge => ({ key, name: key, desc: '', got, prog: [0, 1], rarity: 'common', icon: 'Star' });

describe('badgesToCelebrate', () => {
  it('earned and unseen only', () => {
    const list = [badge('a', true), badge('b', false), badge('c', true), badge('d', true)];
    expect(badgesToCelebrate(list, new Set(['c'])).map(b => b.key)).toEqual(['a', 'd']);
  });

  it('a seen badge never returns even if lost and earned again', () => {
    expect(badgesToCelebrate([badge('sharpshooter', true)], new Set(['sharpshooter']))).toEqual([]);
  });
});
