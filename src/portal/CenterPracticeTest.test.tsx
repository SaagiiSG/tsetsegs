import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
const query = vi.hoisted(() => ({ result: {} as Record<string, unknown>, options: {} as Record<string, any> }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({}),
  useQuery: (o: { queryKey: unknown[] }) => {
    if (o.queryKey[0] !== 'center-test-state') return { data: undefined };
    query.options = o;
    return query.result;
  },
}));
import { CenterContext } from './centerContext';
import { CenterPracticeTest } from './CenterPracticeTest';
const ctx = { center: { id: 'c', name: 'Sky Prep', country: 'US', slug: 'sky' }, role: 'student' as const, name: 'Ana', userId: 'u', signOut: () => {}, reloadCenter: () => {} };
const question = { id: 'q1', question_id: 'X1', question_text: 'What is half of one?', multiple_choice_options: null };
const inProgress = { id: 'a1', test_name: 'Test 1', status: 'in_progress', current_module: 0, module_started_at: new Date().toISOString(), answers: {}, paper: [{ number: 1, minutes: 35, questions: [question] }], math_correct: null, math_total: null, math_score: null };
const completed = { ...inProgress, status: 'completed', answers: { q1: { value: '.5' } }, paper: [{ number: 1, minutes: 35, questions: [{ ...question, answer: '1/2', alternate_answers: ['.5'], rationale: null }] }], math_correct: 1, math_total: 1, math_score: 800 };
const render = () => renderToStaticMarkup(
  <MemoryRouter initialEntries={['/student/tests/a1']}><CenterContext.Provider value={ctx}>
    <Routes><Route path="/student/tests/:attemptId" element={<CenterPracticeTest />} /></Routes>
  </CenterContext.Provider></MemoryRouter>,
);
beforeEach(() => { query.result = {}; });

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
});
