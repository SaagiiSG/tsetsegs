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
const ctx = { center: { id: 'c', name: 'Sky Prep', country: 'US', slug: 'sky' }, role: 'student' as const, name: 'Ana', userId: 'u', signOut: () => {}, reloadCenter: () => {} };
const me = { student: { id: 's', name: 'Ana Bold', class_id: null }, cls: null, att: [], attempts: [], meta: {}, videosDone: ['e1', 'e2'] };
const v = (id: string, module: string, order_index: number) => ({ id, title: `Video ${id}`, module, order_index });
// Topic 1 has three videos (two watched); topic 2 follows with two.
const videos = [v('e1', 'Exponents & Radicals', 1), v('e2', 'Exponents & Radicals', 2), v('e3', 'Exponents & Radicals', 3), v('x1', 'Expressions', 4), v('x2', 'Expressions', 5)];
const render = () => {
  const client = new QueryClient();
  client.setQueryData(['center-concept-videos'], videos);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}><MemoryRouter><CenterContext.Provider value={ctx}>
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
});
