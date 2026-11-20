import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@whop/elements', () => ({ loadWhop: () => { throw new Error('Whop must not load during these renders'); } }));
import { CenterContext } from './centerContext';
import { SoloPremium } from './SoloPremium';

const ctx = { center: { id: 'c', name: 'Solo', country: 'US', slug: 'solo' }, role: 'student' as const, name: 'Ana', userId: 'u', isSolo: true, signOut: () => {}, reloadCenter: () => {} };
const free = { plan: 'free', premium_until: null };
const premium = { plan: 'premium', premium_until: '2099-01-01T00:00:00Z' };

const render = (plan: typeof free, path = '/student/premium', isSolo = true) => {
  const client = new QueryClient();
  client.setQueryData(['solo-plan', 'u'], plan);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><CenterContext.Provider value={{ ...ctx, isSolo }}>
      <Routes>
        <Route path="/student/premium" element={<SoloPremium />} />
        <Route path="/student" element={<p>home</p>} />
      </Routes>
    </CenterContext.Provider></MemoryRouter></QueryClientProvider>,
  );
};

describe('solo premium page', () => {
  it('offers both plans to a free student, yearly picked, with the checkout still loading', () => {
    const html = render(free);
    expect(html).toContain('Go Premium');
    expect(html).toContain('Monthly · $19');
    expect(html).toContain('Yearly · $39');
    expect(html).toMatch(/aria-selected="true"[^>]*>Yearly/);
    expect(html).toContain('Every practice test');
    expect(html).not.toContain('Your payment didn');
    expect(html).not.toContain('Manage or cancel');
  });

  it('says a failed or canceled payment did not go through and shows the form again', () => {
    expect(render(free, '/student/premium?payment=pay_1&status=failed')).toContain('Your payment didn&#x27;t go through');
    expect(render(free, '/student/premium?payment=pay_1&status=canceled')).toContain('Go Premium');
  });

  it('waits for the webhook after a successful payment instead of unlocking anything itself', () => {
    const html = render(free, '/student/premium?payment=pay_1&status=succeeded');
    expect(html).toContain('Turning on Premium');
    expect(html).not.toContain('Go Premium');
  });

  it('once Premium is on, never shows a second checkout', () => {
    // After paying it goes to the dashboard, any other visit to Billing (<Navigate> renders nothing; it runs on mount).
    expect(render(premium, '/student/premium?payment=pay_1&status=succeeded')).toBe('');
    expect(render(premium)).toBe('');
  });

  it('is only for solo students', () => {
    // <Navigate> renders nothing; the redirect itself runs on mount.
    expect(render(free, '/student/premium', false)).toBe('');
  });
});

describe('starting a checkout', () => {
  it('shows our message, not a crash, when the function call fails without a Response', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase as { functions?: unknown }).functions = { invoke: async () => ({ data: null, error: { name: 'FunctionsFetchError', context: new TypeError('Failed to fetch') } }) };
    const { startCheckout } = await import('./SoloPremium');
    await expect(startCheckout('monthly')).rejects.toThrow('Checkout is unavailable right now. Please try again.');
  });
  it("passes on the function's own error message", async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase as { functions?: unknown }).functions = { invoke: async () => ({ data: null, error: { context: new Response(JSON.stringify({ error: "Premium isn't open yet." }), { status: 403 }) } }) };
    const { startCheckout } = await import('./SoloPremium');
    await expect(startCheckout('yearly')).rejects.toThrow("Premium isn't open yet.");
  });
});
