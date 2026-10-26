import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { CenterContext } from './centerContext';
import { StudentRail } from './StudentRail';
const ctx = { center: { id: 'c', name: 'Sky Prep', country: 'US', slug: 'sky' }, role: 'student' as const, name: 'Ana', userId: 'u', signOut: () => {}, reloadCenter: () => {} };
const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/student']}><CenterContext.Provider value={ctx}><StudentRail /></CenterContext.Provider></MemoryRouter>);
describe('student rail', () => {
  it('has no emoji', () => expect(html).not.toMatch(/\p{Extended_Pictographic}/u));
  it('keeps the pages and adds the account block', () => {
    for (const l of ['Home', 'Practice', 'Concept videos', 'Speed mode', 'Leaderboard', 'Analytics', 'Review mistakes', 'Badges', 'Help', 'Profile', 'Settings', 'Dark mode', 'Log out']) expect(html).toContain(l);
    expect(html).toContain('href="/student/profile"'); expect(html).toContain('role="switch"');
  });
  it('opens on hover and keyboard focus only', () => {
    const cls = html.match(/<aside class="([^"]*)"/)![1];
    expect(cls).toContain('has-[:focus-visible]:w-60'); expect(cls).not.toContain('focus-within');
    expect(cls).toContain('[@media(hover:hover)]:hover:w-60'); expect(cls.split(' ')).not.toContain('hover:w-60');
  });
  it('shows Log out in red over the .sky-nav colour', () => expect(html).toMatch(/class="[^"]*!text-destructive[^"]*"[^>]*>(?:(?!<\/button>).)*Log out/s));
});
