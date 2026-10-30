import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { CenterContext } from './centerContext';
import { StudentRail, ACCOUNT_LINKS, initials } from './StudentRail';
const ctx = { center: { id: 'c', name: 'Sky Prep', country: 'US', slug: 'sky' }, role: 'student' as const, name: 'Ana', userId: 'u', signOut: () => {}, reloadCenter: () => {} };
const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/student']}><CenterContext.Provider value={ctx}><StudentRail /></CenterContext.Provider></MemoryRouter>);
describe('student rail', () => {
  it('has no emoji', () => expect(html).not.toMatch(/\p{Extended_Pictographic}/u));
  it('lists the pages, with Badges and Help moved into the account menu', () => {
    for (const l of ['Home', 'Practice', 'Concept videos', 'Practice tests', 'Speed mode', 'Leaderboard', 'Analytics', 'Review mistakes']) expect(html).toContain(l);
    expect(html).toContain('href="/student/tests"');
    expect(html).not.toContain('href="/student/badges"'); expect(html).not.toContain('href="/student/help"');
  });
  it('puts the student at the foot of the rail as the account menu', () => {
    expect(html).toContain('aria-label="Account menu for Ana"'); expect(html).toContain('>A<');
    expect(ACCOUNT_LINKS.map(l => l.label)).toEqual(['Profile', 'Badges', 'Settings', 'Help']);
    expect(ACCOUNT_LINKS.map(l => l.to)).toEqual(['/student/profile', '/student/badges', '/student/settings', '/student/help']);
  });
  it('makes initials from a name', () => {
    expect(initials('Zaya Bat')).toBe('ZB'); expect(initials('  ana ')).toBe('A'); expect(initials('')).toBe('?');
  });
  it('opens on hover and keyboard focus only', () => {
    const cls = html.match(/<aside class="([^"]*)"/)![1];
    expect(cls).toContain('has-[:focus-visible]:w-60'); expect(cls).not.toContain('focus-within');
    expect(cls).toContain('[@media(hover:hover)]:hover:w-60'); expect(cls.split(' ')).not.toContain('hover:w-60');
  });
});
