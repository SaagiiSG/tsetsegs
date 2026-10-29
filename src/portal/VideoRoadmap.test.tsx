import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { CenterContext } from './centerContext';
import { VideoRoadmap } from './VideoRoadmap';
const ctx = { center: { id: 'c', name: 'Sky Prep', country: 'US', slug: 'sky' }, role: 'student' as const, name: 'Ana', userId: 'u', signOut: () => {}, reloadCenter: () => {} };
const v = (id: string, module: string, order_index: number) => ({ id, title: `Video ${id}`, description: null, module, domain: 'Math', video_url: '', subtitles_vtt: null, labels: [], duration_minutes: null, order_index });
const videos = { data: [v('e1', 'Exponents & Radicals', 1), v('e2', 'Exponents & Radicals', 2), v('f1', 'Functions', 3), v('q1', 'Quadratic Functions', 4)], isLoading: false } as unknown as UseQueryResult<unknown[]>;
const html = renderToStaticMarkup(
  <QueryClientProvider client={new QueryClient()}><CenterContext.Provider value={ctx}>
    <VideoRoadmap videos={videos} me={{ student: { id: 's' }, videosDone: ['e1'] }} />
  </CenterContext.Provider></QueryClientProvider>,
);
// The last `attr="..."` value written before `label` (the banner text) in the markup.
const attrBefore = (attr: string, label: string) => {
  const found = html.slice(0, html.indexOf(label)).match(new RegExp(`${attr}="[^"]*"`, 'g')) ?? [];
  return found[found.length - 1];
};
describe('concept videos by topic', () => {
  it('shows topic banners with book numbers', () => {
    for (const t of ['Topic 1 · Exponents &amp; Radicals', 'Topic 5 · Functions', '1/2 watched']) expect(html).toContain(t);
  });
  it('colours each banner by area', () => expect(attrBefore('style', 'Topic 5 · Functions')).toContain('#7B6CF6'));
  it('only the up-next topic starts open', () => {
    expect(attrBefore('data-state', 'Topic 1 · Exponents')).toBe('data-state="open"');
    expect(attrBefore('data-state', 'Topic 5 · Functions')).toBe('data-state="closed"');
    expect(html.match(/>Start</g)).toHaveLength(1);
  });
  it('no emoji', () => expect(html).not.toMatch(/\p{Extended_Pictographic}/u));
  it('banner text is inline inside the button, with a focus ring', () => {
    const banner = html.slice(html.lastIndexOf('<button', html.indexOf('Topic 1 · Exponents')), html.indexOf('Topic 1 · Exponents'));
    expect(banner).toContain('focus-visible:ring-2');
    expect(banner).not.toMatch(/<(div|p)\b/);
  });
  it('a failed read says so, with Try again, and no 0 watched', () => {
    const failed = { data: undefined, isLoading: false, isError: true, refetch: () => {} } as unknown as UseQueryResult<unknown[]>;
    const out = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}><CenterContext.Provider value={ctx}>
        <VideoRoadmap videos={failed} me={{ student: { id: 's' }, videosDone: [] }} />
      </CenterContext.Provider></QueryClientProvider>,
    );
    expect(out).toContain('Couldn&#x27;t load videos.');
    expect(out).toContain('Try again');
    expect(out).not.toContain('No videos yet.');
    expect(out).not.toMatch(/watched/);
  });
});
