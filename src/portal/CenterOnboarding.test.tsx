import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { CenterContext } from './centerContext';
import { CenterOnboarding } from './CenterOnboarding';
const ctx = { center: { id: 'c', name: 'Sky Prep', country: 'US', slug: 'sky' }, role: 'student' as const, name: 'Ana', userId: 'u', signOut: () => {}, reloadCenter: () => {} };
const html = renderToStaticMarkup(
  <QueryClientProvider client={new QueryClient()}><MemoryRouter><CenterContext.Provider value={ctx}>
    <CenterOnboarding studentId="s" attempts={[]} meta={{}} start={1} satMonth={null} goals={undefined} record={async () => null} />
  </CenterContext.Provider></MemoryRouter></QueryClientProvider>,
);
describe('center onboarding', () => {
  it('always offers a way out for a wrong account or shared phone', () => expect(html).toMatch(/<button[^>]*>Log out<\/button>/));
});
