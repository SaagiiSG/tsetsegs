import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { isPremium, onlyFree } from './soloPlan';

describe('isPremium', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  it('no solo row is free', () => expect(isPremium(null, now)).toBe(false));
  it('the free plan is free', () => expect(isPremium({ plan: 'free', premium_until: null }, now)).toBe(false));
  it('premium with no end date is premium', () => expect(isPremium({ plan: 'premium', premium_until: null }, now)).toBe(true));
  it('premium that ended is free', () => expect(isPremium({ plan: 'premium', premium_until: '2026-11-09T12:00:00Z' }, now)).toBe(false));
  it('premium still running is premium', () => expect(isPremium({ plan: 'premium', premium_until: '2026-11-11T12:00:00Z' }, now)).toBe(true));
});

describe('onlyFree', () => {
  // A free user can read a free test's question copies too; only the slice counts for practice.
  const rows = [{ id: 'slice' }, { id: 'test-copy' }];
  it('a free user keeps only the slice', () => expect(onlyFree(rows, ['slice'])).toEqual([{ id: 'slice' }]));
  it('everyone else keeps every row', () => expect(onlyFree(rows, null)).toEqual(rows));
});
