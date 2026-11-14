import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { paidFromRows } from './useRingPrizes';

describe('paidFromRows', () => {
  it('counts rows with points and a known ring', () => {
    expect([...paidFromRows([{ metadata: { ring: 'speed' }, points: 20 }, { metadata: { ring: 'all' }, points: 25 }])].sort()).toEqual(['all', 'speed']);
  });
  it('ignores zero points, unknown rings and null metadata', () => {
    expect(paidFromRows([{ metadata: { ring: 'hard' }, points: 0 }, { metadata: { ring: 'bogus' }, points: 5 }, { metadata: null, points: 5 }, { metadata: {}, points: 5 }]).size).toBe(0);
  });
});
