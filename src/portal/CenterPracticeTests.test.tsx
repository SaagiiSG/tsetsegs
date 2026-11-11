import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { CenterContext } from './centerContext';
import { CenterPracticeTests } from './CenterPracticeTests';

const ctx = { center: { id: 'c', name: 'Sky Prep', country: 'US', slug: 'sky' }, role: 'student' as const, name: 'Ana', userId: 'u', isSolo: false, signOut: () => {}, reloadCenter: () => {} };
const test = { id: 't1', name: 'Practice Test 1', test_month: null, test_year: null, modules: 2, questions: 44, minutes: 70, last_score: null, open_attempt: null };
// `plan` given: a solo student on that plan; undefined plan with `solo`: the plan read is still out.
const render = (tests: unknown[], plan?: { plan: string; premium_until: string | null }, solo = !!plan) => {
  const client = new QueryClient();
  client.setQueryData(['center-tests', 'c', 'list', 's'], tests);
  client.setQueryData(['center-tests', 'c', 'history', 's'], []);
  if (plan) client.setQueryData(['solo-plan', 'u'], plan);
  return renderToStaticMarkup(
    <MemoryRouter><QueryClientProvider client={client}><CenterContext.Provider value={{ ...ctx, isSolo: solo }}>
      <CenterPracticeTests studentId="s" />
    </CenterContext.Provider></QueryClientProvider></MemoryRouter>,
  );
};

describe('practice tests on the free solo plan', () => {
  it('a free user sees the free test and one lock for the rest', () => {
    const html = render([test], { plan: 'free', premium_until: null });
    expect(html).toContain('Practice Test 1');
    expect(html).toContain('5 more practice tests');
    expect(html).toContain('Try Premium free for 7 days');
  });
  it('a free user with no free test still sees the lock, not "No tests"', () => {
    const html = render([], { plan: 'free', premium_until: null });
    expect(html).toContain('5 more practice tests');
    expect(html).not.toContain('No tests are available yet.');
  });
  it('premium and normal centers show no lock', () => {
    expect(render([test], { plan: 'premium', premium_until: null })).not.toContain('5 more practice tests');
    expect(render([test])).not.toContain('5 more practice tests');
    expect(render([])).toContain('No tests are available yet.');
  });
  it('waits for the plan before showing tests or a lock', () => {
    const html = render([test], undefined, true);
    expect(html).not.toContain('Practice Test 1');
    expect(html).not.toContain('5 more practice tests');
  });
});
