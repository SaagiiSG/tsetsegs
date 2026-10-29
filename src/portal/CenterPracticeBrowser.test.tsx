import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
// A fake intl_questions table of `db.total` rows; the page starting at `db.failAt` errors.
const db = vi.hoisted(() => ({ total: 0, failAt: -1 }));
vi.mock('@/integrations/supabase/client', () => {
  const page = (from: number, to: number) => from === db.failAt ? { data: null, error: new Error('network') }
    : { data: Array.from({ length: Math.max(0, Math.min(to + 1, db.total) - from) }, (_, i) => ({ id: `q${from + i}`, question_id: `Q${from + i}`, subject: 'math', question_set: null, category_id: null, skill: null })), error: null };
  const query = () => {
    const q: Record<string, unknown> = {};
    q.select = q.eq = q.order = () => q;
    q.range = (from: number, to: number) => Promise.resolve(page(from, to));
    q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok); // question_categories
    return q;
  };
  return { supabase: { from: query } };
});
const refetch = vi.hoisted(() => vi.fn());
const options = vi.hoisted(() => ({ last: {} as { queryFn?: () => Promise<unknown[]> } }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (o: typeof options.last) => { options.last = o; return { isError: true, isLoading: false, data: undefined, refetch }; } }));
import { CenterPracticeBrowser, LoadError, usePracticeQuestions } from './CenterPracticeBrowser';

describe('practice browser', () => {
  it('says it could not load, and shows no 0, when the read fails', () => {
    const html = renderToStaticMarkup(<CenterPracticeBrowser attempts={[]} subject="math" setKey="150" onSubject={() => {}} onSet={() => {}} onOpen={() => {}} onRandom={() => {}} />);
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
    usePracticeQuestions();
    expect(await options.last.queryFn!()).toHaveLength(4500);
  });
  it('throws on any page error instead of a short pool', async () => {
    db.total = 4500; db.failAt = 3000;
    usePracticeQuestions();
    await expect(options.last.queryFn!()).rejects.toThrow('network');
  });
});
