import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
// The concept-videos read fails when `videosFail` is on; every other read goes through React Query as normal.
const flags = vi.hoisted(() => ({ videosFail: false }));
vi.mock('@tanstack/react-query', async importOriginal => {
  const rq = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...rq, useQuery: (o: Parameters<typeof rq.useQuery>[0]) => {
    const r = rq.useQuery(o);
    return flags.videosFail && o.queryKey[0] === 'center-concept-videos' ? { ...r, data: undefined, isError: true, error: new Error('network') } : r;
  } };
});
import { CenterContext } from './centerContext';
import { HomePage } from './CenterStudentPortal';
const ctx = { center: { id: 'c', name: 'Sky Prep', country: 'US', slug: 'sky' }, role: 'student' as const, name: 'Ana', userId: 'u', isSolo: false, signOut: () => {}, reloadCenter: () => {} };
const me = { student: { id: 's', name: 'Ana Bold', class_id: null }, cls: null, att: [], attempts: [], meta: {}, videosDone: ['e1', 'e2'] };
const v = (id: string, module: string, order_index: number) => ({ id, title: `Video ${id}`, module, order_index });
// Topic 1 has three videos (two watched); topic 2 follows with two.
const videos = [v('e1', 'Exponents & Radicals', 1), v('e2', 'Exponents & Radicals', 2), v('e3', 'Exponents & Radicals', 3), v('x1', 'Expressions', 4), v('x2', 'Expressions', 5)];
// `plan` given: a solo student on that plan (the cached solo_students row).
const render = (plan?: { plan: string; premium_until: string | null }) => {
  const client = new QueryClient();
  client.setQueryData(['center-concept-videos'], videos);
  if (plan) client.setQueryData(['solo-plan', 'u'], plan);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}><MemoryRouter><CenterContext.Provider value={plan ? { ...ctx, isSolo: true } : ctx}>
      <HomePage me={me as never} />
    </CenterContext.Provider></MemoryRouter></QueryClientProvider>,
  );
};

describe('center home', () => {
  it('greets with no emoji', () => {
    const html = render();
    expect(html).toContain('Hey Ana');
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
  });
  it('has no streak badge by the greeting; the top bar chip shows the streak', () => {
    const html = render();
    expect(html).not.toContain('day streak');
    expect(html).not.toContain('Open streak details');
  });
  it('roadmap preview opens the next topic\'s first video, like the videos page', () => {
    const preview = render().split('aria-label="Your video roadmap progress"')[1];
    const icons = [...preview.matchAll(/lucide-(check|play|lock)\b/g)].map(m => m[1]);
    expect(icons).toEqual(['check', 'check', 'play', 'play', 'lock']);
  });
  it('a failed videos read says so, with no 0 or empty bar', () => {
    flags.videosFail = true;
    try {
      const card = render().split('Your video roadmap')[1].split('Continue your roadmap')[0];
      expect(card).toContain('Couldn&#x27;t load videos.');
      expect(card).not.toMatch(/>0<|\/…|sky-fill-violet/);
    } finally { flags.videosFail = false; }
  });
  it('locks the 68 and 150 cards for a free solo user only', () => {
    const free = render({ plan: 'free', premium_until: null });
    expect(free).toContain('The 68 set');
    expect(free).toContain('The 150 set');
    expect(free).toContain('Try Premium free for 7 days');
    expect(free).toContain('All other math, including the new 120'); // CB stays a card
    for (const html of [render(), render({ plan: 'premium', premium_until: null })]) {
      expect(html).not.toContain('Try Premium');
      expect(html).toContain('Core SAT math patterns');
    }
  });
});
