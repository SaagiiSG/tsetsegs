import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { CenterContext } from './centerContext';
import { PlanChip, SoloBilling, billingSummary, type Billing } from './SoloBilling';

const now = new Date('2026-11-19T12:00:00Z');
const base: Billing = { plan: 'free', premium_until: null, whop_membership_id: null, whop_status: null, whop_period_end: null, whop_cancel_at_period_end: null, whop_billing_period_days: null };
const whop = (over: Partial<Billing>): Billing => ({ ...base, plan: 'premium', premium_until: '2026-11-27T12:00:00Z', whop_membership_id: 'mem_1', whop_status: 'trialing', whop_period_end: '2026-11-26T12:00:00Z', whop_cancel_at_period_end: false, whop_billing_period_days: 365, ...over });

describe('billing summary', () => {
  it('free', () => expect(billingSummary(base, now)).toMatchObject({ kind: 'free', title: 'Free' }));
  it('a yearly trial says when it ends and what comes next, with days left for the chip', () => {
    expect(billingSummary(whop({}), now)).toEqual({ kind: 'trial', title: 'Premium · Yearly', line: 'Free trial ends 26 Nov 2026, then $39 a year.', days: 7 });
  });
  it('a trial canceled early promises no charge', () => {
    expect(billingSummary(whop({ whop_cancel_at_period_end: true }), now).line).toBe("Your trial ends 26 Nov 2026. You won't be charged.");
  });
  it('a paid monthly plan renews; after a cancel it ends on the period end', () => {
    const paid = whop({ whop_status: 'active', whop_billing_period_days: 30 });
    expect(billingSummary(paid, now)).toMatchObject({ kind: 'paid', title: 'Premium · Monthly', line: 'Renews on 26 Nov 2026 for $19.' });
    expect(billingSummary({ ...paid, whop_cancel_at_period_end: true }, now).line).toBe('Cancels on 26 Nov 2026. You keep Premium until then.');
    expect(billingSummary({ ...paid, whop_status: 'canceling' }, now).line).toBe('Cancels on 26 Nov 2026. You keep Premium until then.');
  });
  it('Premium with no Whop membership (given by an admin) has no billing to manage', () => {
    expect(billingSummary({ ...base, plan: 'premium' }, now)).toEqual({ kind: 'gift', title: 'Premium', line: 'No end date.' });
    expect(billingSummary({ ...base, plan: 'premium', premium_until: '2027-01-01T12:00:00Z' }, now).line).toBe('Open until 1 Jan 2027.');
  });
  it('an ended Premium counts as free', () => {
    expect(billingSummary(whop({ premium_until: '2026-11-01T00:00:00Z' }), now).kind).toBe('free');
  });
});

const ctx = { center: { id: 'c', name: 'Solo', country: 'US', slug: 'solo' }, role: 'student' as const, name: 'Ana', userId: 'u', isSolo: true, signOut: () => {}, reloadCenter: () => {} };
const render = (el: React.ReactElement, row: Billing, isSolo = true) => {
  const client = new QueryClient();
  client.setQueryData(['solo-plan', 'u'], { plan: row.plan, premium_until: row.premium_until });
  client.setQueryData(['solo-billing', 'u'], row);
  return renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter><CenterContext.Provider value={{ ...ctx, isSolo }}>{el}</CenterContext.Provider></MemoryRouter></QueryClientProvider>);
};
const trial = whop({ premium_until: '2099-01-02T12:00:00Z', whop_period_end: '2099-01-01T12:00:00Z' });

describe('billing page', () => {
  it('free: upgrade button, no Whop link', () => {
    const html = render(<SoloBilling />, base);
    expect(html).toContain('Billing'); expect(html).toContain('href="/student/premium"'); expect(html).not.toContain('Manage or cancel');
  });
  it('trial: the plan line, the Whop link and the refund rule', () => {
    const html = render(<SoloBilling />, trial);
    expect(html).toContain('Premium · Yearly'); expect(html).toContain('Free trial ends 1 Jan 2099, then $39 a year.');
    expect(html).toContain('href="https://whop.com/@me/settings/orders/"'); expect(html).toContain('within 14 days');
  });
  it('is only for solo students', () => expect(render(<SoloBilling />, base, false)).toBe(''));
});

describe('plan chip', () => {
  it('free points at the upgrade page', () => {
    const html = render(<PlanChip />, base);
    expect(html).toContain('href="/student/premium"'); expect(html).toContain('Free'); expect(html).toContain('Upgrade');
  });
  it('a trial shows the days left and opens Billing', () => {
    const html = render(<PlanChip />, whop({ premium_until: new Date(Date.now() + 6 * 864e5).toISOString(), whop_period_end: new Date(Date.now() + 5 * 864e5 - 1000).toISOString() }));
    expect(html).toContain('href="/student/billing"'); expect(html).toContain('Trial'); expect(html).toContain('5 days left');
  });
  it('paid Premium', () => {
    const html = render(<PlanChip />, whop({ whop_status: 'active', premium_until: '2099-01-02T00:00:00Z', whop_period_end: '2099-01-01T00:00:00Z' }));
    expect(html).toContain('Premium'); expect(html).not.toContain('Trial');
  });
  it('nothing for center students', () => expect(render(<PlanChip />, base, false)).toBe(''));
});
