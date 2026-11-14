import { describe, it, expect, vi } from 'vitest';
// solo_free_slice answers with `slice.read`.
const slice = vi.hoisted(() => ({ read: { data: [] as { item_id: string }[] | null, error: null as Error | null } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => Promise.resolve(slice.read) }) }) } }));
import { freeDraw, freeSectionDone, isPremium, onlyFree, speedRunBlocked } from './soloPlan';

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
  it('a free user keeps every English row, slice or not (all English is free, 12 Nov)', () => {
    const mixed = [{ id: 'm', subject: 'math' }, { id: 'e', subject: 'English' }, { id: 'n', subject: null }];
    expect(onlyFree(mixed, []).map(r => r.id)).toEqual(['e']);
  });
});

describe('freeDraw', () => {
  // A fake question query: `in` narrows it, like PostgREST does.
  type Fake = { ids: string[]; in: (column: 'id', values: readonly string[]) => Fake };
  const table = (ids: string[]): Fake => ({ ids, in: (_column, values) => table(ids.filter(id => values.includes(id))) });
  it('a free user draws only from the slice, never a readable free-test copy', async () => {
    slice.read = { data: [{ item_id: 'slice' }], error: null };
    expect((await freeDraw(false, 'math'))(table(['slice', 'test-copy'])).ids).toEqual(['slice']);
  });
  it('a center (or premium) user draws from everything readable', async () => {
    expect((await freeDraw(true, 'math'))(table(['slice', 'test-copy'])).ids).toEqual(['slice', 'test-copy']);
  });
  it('a free user draws English from everything readable', async () => {
    slice.read = { data: [{ item_id: 'slice' }], error: null };
    for (const subject of ['english', 'English']) expect((await freeDraw(false, subject))(table(['slice', 'e1'])).ids).toEqual(['slice', 'e1']);
  });
  it('a free user whose slice read fails draws nothing', async () => {
    slice.read = { data: null, error: new Error('network') };
    expect((await freeDraw(false, 'math'))(table(['slice', 'test-copy'])).ids).toEqual([]);
  });
});

describe('freeSectionDone', () => {
  const rows = [{ id: 'm1', sub: 'math' as const }, { id: 'm2', sub: 'math' as const }, { id: 'e1', sub: 'english' as const }];
  it('is done once every free question in the subject was right at least once', () => {
    expect(freeSectionDone(rows, [{ question_id: 'm1', is_correct: true }, { question_id: 'm2', is_correct: false }, { question_id: 'm2', is_correct: true }], 'math')).toBe(true);
  });
  it('a wrong answer alone is not solved, and other subjects do not count', () => {
    expect(freeSectionDone(rows, [{ question_id: 'm1', is_correct: true }, { question_id: 'm2', is_correct: false }, { question_id: 'e1', is_correct: true }], 'math')).toBe(false);
    expect(freeSectionDone(rows, [{ question_id: 'e1', is_correct: true }], 'english')).toBe(true);
  });
  it('an empty subject is never done', () => expect(freeSectionDone(rows.slice(0, 2), [], 'english')).toBe(false));
});

describe('speedRunBlocked', () => {
  it('blocks a free user at 0 left, and while the count is being refreshed', () => {
    expect(speedRunBlocked(true, 0, false)).toBe(true);
    expect(speedRunBlocked(true, 3, true)).toBe(true);
    expect(speedRunBlocked(true, 3, false)).toBe(false);
  });
  it('never blocks anyone else', () => {
    expect(speedRunBlocked(false, null, true)).toBe(false);
    expect(speedRunBlocked(false, undefined, false)).toBe(false);
  });
});
