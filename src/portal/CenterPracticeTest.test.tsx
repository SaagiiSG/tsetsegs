import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
const query = vi.hoisted(() => ({ result: {} as Record<string, unknown>, options: {} as Record<string, any>, plan: null as { plan: string; premium_until: string | null } | null }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({}),
  useQuery: (o: { queryKey: unknown[] }) => {
    if (o.queryKey[0] === 'solo-plan') return { data: query.plan, isPending: false };
    if (o.queryKey[0] !== 'center-test-state') return { data: undefined };
    query.options = o;
    return query.result;
  },
}));
import { CenterContext } from './centerContext';
import { CenterPracticeTest } from './CenterPracticeTest';
const ctx = { center: { id: 'c', name: 'Sky Prep', country: 'US', slug: 'sky' }, role: 'student' as const, name: 'Ana', userId: 'u', isSolo: false, signOut: () => {}, reloadCenter: () => {} };
const question = { id: 'q1', question_id: 'X1', question_text: 'What is half of one?', multiple_choice_options: null };
const inProgress = { id: 'a1', test_name: 'Test 1', status: 'in_progress', current_module: 0, module_started_at: new Date().toISOString(), answers: {}, paper: [{ number: 1, minutes: 35, questions: [question] }], math_correct: null, math_total: null, math_score: null };
const completed = { ...inProgress, status: 'completed', answers: { q1: { value: '.5' } }, paper: [{ number: 1, minutes: 35, questions: [{ ...question, answer: '1/2', alternate_answers: ['.5'], rationale: null }] }], math_correct: 1, math_total: 1, math_score: 800 };
const render = (value = ctx) => renderToStaticMarkup(
  <MemoryRouter initialEntries={['/student/tests/a1']}><CenterContext.Provider value={value}>
    <Routes><Route path="/student/tests/:attemptId" element={<CenterPracticeTest />} /></Routes>
  </CenterContext.Provider></MemoryRouter>,
);
beforeEach(() => { query.result = {}; query.plan = null; });

describe('practice test runner', () => {
  it('keeps the loaded test on screen when a background refetch fails', () => {
    query.result = { data: inProgress, error: new Error('network'), refetch: () => {} };
    const html = render();
    expect(html).toContain('What is half of one?');
    expect(html).not.toContain('Could not load this test.');
  });
  it('says it could not load only when there is no test', () => {
    query.result = { data: undefined, error: new Error('network'), refetch: () => {} };
    expect(render()).toContain('Could not load this test.');
  });
  it('does not refetch on focus mid-test, only once it is done', () => {
    query.result = { data: inProgress, error: null, refetch: () => {} };
    render();
    expect(query.options.refetchOnWindowFocus({ state: { data: inProgress } })).toBe(false);
    expect(query.options.refetchOnWindowFocus({ state: { data: completed } })).toBe(true);
  });
  it('review lists the other accepted answers', () => {
    query.result = { data: completed, error: null, refetch: () => {} };
    expect(render()).toContain('1/2 or .5');
  });
  it('review off shows the score only, without a popup hold', () => {
    query.result = { data: { ...completed, paper: [], session: { status: 'active', review_mode: 'off', title: 'Test 1' } }, error: null, refetch: () => {} };
    const html = render();
    expect(html).toContain('800');
    expect(html).toContain('1/1 correct');
    expect(html).toContain('Your teacher will share answers later.');
    expect(html).not.toContain('Could not load this test.');
    expect(html).not.toContain('data-popup-hold');
  });
  it('review hides the explanation behind the Premium lock for a free solo user', () => {
    const explained = { ...completed, paper: [{ number: 1, minutes: 35, questions: [{ ...question, answer: '1/2', alternate_answers: ['.5'], rationale: 'Half of one is one over two.' }] }] };
    query.result = { data: explained, error: null, refetch: () => {} };
    expect(render()).toContain('Half of one is one over two.');
    const free = render({ ...ctx, center: { ...ctx.center, slug: 'solo' }, isSolo: true });
    expect(free).toContain('1/2 or .5');
    expect(free).toContain('Step-by-step explanations');
    expect(free).toContain('Try Premium free for 7 days');
    expect(free).not.toContain('Half of one is one over two.');
    query.plan = { plan: 'premium', premium_until: null };
    expect(render({ ...ctx, center: { ...ctx.center, slug: 'solo' }, isSolo: true })).toContain('Half of one is one over two.');
  });
});
