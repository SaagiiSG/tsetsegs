import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { CenterContext } from './centerContext';
import { VideoRoadmap } from './VideoRoadmap';
const ctx = { center: { id: 'c', name: 'Sky Prep', country: 'US', slug: 'sky' }, role: 'student' as const, name: 'Ana', userId: 'u', signOut: () => {}, reloadCenter: () => {} };
const v = (id: string, module: string, order_index: number) => ({ id, title: `Video ${id}`, description: null, module, domain: 'Math', video_url: '', subtitles_vtt: null, labels: [], duration_minutes: null, order_index });
const videos = { data: [v('e1', 'Exponents & Radicals', 1), v('e2', 'Exponents & Radicals', 2), v('f1', 'Functions', 3), v('q1', 'Quadratic Functions', 4)], isLoading: false } as unknown as UseQueryResult<unknown[]>;
const render = (path: string, vids = videos, done = ['e1']) => renderToStaticMarkup(
  <MemoryRouter initialEntries={[path]}><QueryClientProvider client={new QueryClient()}><CenterContext.Provider value={ctx}>
    <VideoRoadmap videos={vids} me={{ student: { id: 's' }, videosDone: done }} />
  </CenterContext.Provider></QueryClientProvider></MemoryRouter>,
);
// The opening tag of the element carrying data-column="list" or "map".
const column = (html: string, col: string) => html.match(new RegExp(`<[^>]*data-column="${col}"[^>]*>`))?.[0] ?? '';
const activeCard = (html: string) => html.slice(html.indexOf('aria-current="true"')).match(/Topic \d+ · [^<]+/)?.[0];
const mapTitle = (html: string) => html.match(/<h2[^>]*>([^<]+)<\/h2>/)?.[1];

describe('concept videos page', () => {
  it('lists every topic and opens on the up-next one', () => {
    const html = render('/student/videos');
    const at = ['Topic 1 · Exponents &amp; Radicals', 'Topic 5 · Functions', 'Topic 16 · Quadratic Functions'].map(t => html.indexOf(t));
    expect(at.every(i => i >= 0)).toBe(true);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(activeCard(html)).toBe('Topic 1 · Exponents &amp; Radicals');
    expect(mapTitle(html)).toBe('Topic 1 · Exponents &amp; Radicals');
    expect(html.match(/>Start</g)).toHaveLength(1);
  });
  it('opens the topic named in the address', () => {
    const html = render('/student/videos?topic=5');
    expect(activeCard(html)).toBe('Topic 5 · Functions');
    expect(mapTitle(html)).toBe('Topic 5 · Functions');
  });
  it('falls back to the up-next topic for a topic it does not have', () => {
    for (const p of ['/student/videos?topic=99', '/student/videos?topic=abc']) expect(mapTitle(render(p))).toBe('Topic 1 · Exponents &amp; Radicals');
  });
  it('has the search box but no label pills', () => {
    const labelled = { data: [{ ...v('e1', 'Exponents & Radicals', 1), labels: ['Desmos'] }], isLoading: false } as unknown as UseQueryResult<unknown[]>;
    const html = render('/student/videos', labelled, []);
    expect(html).toContain('Search videos or labels');
    expect(html).not.toMatch(/>All<\/button>/);
  });
  it('on a phone shows the list first, and the map once a topic is picked', () => {
    const list = render('/student/videos'), picked = render('/student/videos?topic=5');
    expect(column(list, 'map')).toContain('max-lg:hidden');
    expect(column(list, 'list')).not.toContain('max-lg:hidden');
    expect(column(picked, 'list')).toContain('max-lg:hidden');
    expect(column(picked, 'map')).not.toContain('max-lg:hidden');
    expect(picked).toContain('‹ Topics');
  });
  it('no emoji', () => expect(render('/student/videos')).not.toMatch(/\p{Extended_Pictographic}/u));
  it('a failed read says so, with Try again, and no 0 watched', () => {
    const failed = { data: undefined, isLoading: false, isError: true, refetch: () => {} } as unknown as UseQueryResult<unknown[]>;
    const out = render('/student/videos', failed, []);
    expect(out).toContain('Couldn&#x27;t load videos.');
    expect(out).toContain('Try again');
    expect(out).not.toContain('No videos yet.');
    expect(out).not.toMatch(/watched/);
  });
});
