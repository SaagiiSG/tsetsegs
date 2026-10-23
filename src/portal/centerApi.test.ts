import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { allPages } from './centerApi';

/** Fake query: `total` rows, served like the API (at most 1,000 per request). */
const fake = (total: number) => {
  const calls: number[] = [];
  const page = (from: number) => {
    calls.push(from);
    const n = Math.max(0, Math.min(1000, total - from));
    return Promise.resolve({ data: Array.from({ length: n }, (_, i) => from + i), error: null });
  };
  return { page, calls };
};

describe('allPages', () => {
  it('returns nothing for an empty table', async () => {
    const f = fake(0);
    expect(await allPages(f.page)).toEqual([]);
    expect(f.calls).toEqual([0]);
  });

  it('reads one more page after exactly 1,000 rows', async () => {
    const f = fake(1000);
    expect((await allPages(f.page)).length).toBe(1000);
    expect(f.calls).toEqual([0, 1000]);
  });

  it('reads every row past 1,000 in order', async () => {
    const f = fake(2500);
    const rows = await allPages(f.page);
    expect(rows).toEqual(Array.from({ length: 2500 }, (_, i) => i));
    expect(f.calls).toEqual([0, 1000, 2000]);
  });

  it('stops at the cap', async () => {
    const f = fake(50_000);
    expect((await allPages(f.page, 3000)).length).toBe(3000);
    expect(f.calls).toEqual([0, 1000, 2000]);
    expect((await allPages(fake(5000).page, 1500)).length).toBe(1500);
  });

  it('throws the API error instead of returning partial rows', async () => {
    const err = new Error('boom');
    await expect(allPages(from => Promise.resolve(from ? { data: null, error: err } : { data: Array(1000).fill(0), error: null }))).rejects.toBe(err);
  });
});
