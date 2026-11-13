import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
// A fake intl_questions table of `db.total` rows; the page starting at `db.failAt` errors. solo_free_slice holds `db.slice`.
const db = vi.hoisted(() => ({ total: 0, failAt: -1, slice: [] as string[] }));
vi.mock('@/integrations/supabase/client', () => {
  const page = (from: number, to: number) => from === db.failAt ? { data: null, error: new Error('network') }
    : { data: Array.from({ length: Math.max(0, Math.min(to + 1, db.total) - from) }, (_, i) => ({ id: `q${from + i}`, question_id: `Q${from + i}`, subject: 'math', question_set: null, category_id: null, skill: null })), error: null };
  const query = (table: string) => {
    const q: Record<string, unknown> = {};
    q.select = q.eq = q.order = () => q;
    q.range = (from: number, to: number) => Promise.resolve(page(from, to));
    // question_categories, or the slice's ids
    q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: table === 'solo_free_slice' ? db.slice.map(item_id => ({ item_id })) : [], error: null }).then(ok);
    return q;
  };
  return { supabase: { from: query } };
});
const refetch = vi.hoisted(() => vi.fn());
// The practice list query returns `state.result`; the solo plan query returns `state.plan` (pending while undefined).
const state = vi.hoisted(() => ({ result: {} as Record<string, unknown>, plan: undefined as { plan: string; premium_until: string | null } | null | undefined }));
const options = vi.hoisted(() => ({ last: {} as { queryFn?: () => Promise<{ id: string }[]> } }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (o: { queryKey: unknown[] } & typeof options.last) => {
  if (o.queryKey[0] === 'solo-plan') return { data: state.plan, isPending: state.plan === undefined };
  options.last = o;
  return state.result;
} }));
import { CenterContext } from './centerContext';
import { CenterPracticeBrowser, LoadError, usePracticeQuestions } from './CenterPracticeBrowser';

const ctx = { center: { id: 'c', name: 'Sky Prep', country: 'US', slug: 'sky' }, role: 'student' as const, name: 'Ana', userId: 'u', isSolo: false, signOut: () => {}, reloadCenter: () => {} };
const solo = { ...ctx, center: { ...ctx.center, slug: 'solo' }, isSolo: true };
const Probe = () => { usePracticeQuestions(); return null; };
const probe = (value = ctx) => renderToStaticMarkup(<CenterContext.Provider value={value}><Probe /></CenterContext.Provider>);
const browse = (setKey: string, value = ctx) => renderToStaticMarkup(<CenterContext.Provider value={value}>
  <CenterPracticeBrowser attempts={[]} subject="math" setKey={setKey} onSubject={() => {}} onSet={() => {}} onOpen={() => {}} onRandom={() => {}} />
</CenterContext.Provider>);
const loaded = { isError: false, isLoading: false, data: [{ id: 'q1', question_id: 'CB1', subject: 'math', question_set: null, category_id: null, skill: null, domain: 'Algebra', sub: 'math' }], refetch };
beforeEach(() => { state.result = { isError: true, isLoading: false, data: undefined, refetch }; state.plan = undefined; db.slice = []; });

describe('practice browser', () => {
  it('says it could not load, and shows no 0, when the read fails', () => {
    const html = browse('150');
    expect(html).toContain('Couldn&#x27;t load questions.');
    expect(html).toContain('Try again');
    expect(html).not.toContain('No questions here yet');
    expect(html).not.toMatch(/>0</);
    expect(html).not.toMatch(/\(0\)|0\/0|0%/);
  });
  it('Try again calls refetch', () => {
    const card = LoadError({ onRetry: () => refetch() });
    const [, button] = card.props.children;
    button.props.onClick();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
  it('reads the whole pool past 4,000 rows', async () => {
    db.total = 4500; db.failAt = -1;
    probe();
    expect(await options.last.queryFn!()).toHaveLength(4500);
  });
  it('throws on any page error instead of a short pool', async () => {
    db.total = 4500; db.failAt = 3000;
    probe();
    await expect(options.last.queryFn!()).rejects.toThrow('network');
  });
});

describe('practice browser on the free solo plan', () => {
  it('a readable question outside the free slice is left out for a free user', async () => {
    db.total = 3; db.failAt = -1; db.slice = ['q1']; state.plan = { plan: 'free', premium_until: null };
    probe(solo);
    expect((await options.last.queryFn!()).map(r => r.id)).toEqual(['q1']);
  });
  it('and kept for everyone else', async () => {
    db.total = 3; db.failAt = -1; db.slice = ['q1'];
    probe();
    expect((await options.last.queryFn!()).map(r => r.id)).toEqual(['q0', 'q1', 'q2']);
    state.plan = { plan: 'premium', premium_until: null };
    probe(solo);
    expect((await options.last.queryFn!()).map(r => r.id)).toEqual(['q0', 'q1', 'q2']);
  });
  // Free solo users never see the 68 or 150 sets (Saagii, 12 Nov): no tab, no lock.
  const tabs = (html: string) => [...html.matchAll(/>(68|150|CB) \(\d+\)</g)].map(m => m[1]);
  it('hides the 68 and 150 tabs from a free user, and keeps CB open', () => {
    state.result = loaded; state.plan = { plan: 'free', premium_until: null };
    const cb = browse('CB', solo);
    expect(tabs(cb)).toEqual(['CB']);
    expect(cb).toContain('CB1');
    expect(cb).not.toContain('Try Premium');
  });
  it('shows every tab in a normal center and to a premium user', () => {
    state.result = loaded;
    expect(tabs(browse('68'))).toEqual(['68', '150', 'CB']);
    state.plan = { plan: 'premium', premium_until: null };
    expect(tabs(browse('68', solo))).toEqual(['68', '150', 'CB']);
  });
  it('shows the loading state, not a lock or a list, until the plan is known', () => {
    state.result = loaded;
    const cb = browse('CB', solo);
    expect(cb).not.toContain('CB1');
    expect(cb).not.toContain('No questions here yet');
  });
});
