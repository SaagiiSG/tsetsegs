import { describe, expect, it } from 'vitest';
import { inviteRow, totals } from './status';

const base = { signed_up: '2026-12-03T00:00:00Z', whop_status: null, billing_days: null, period_end: null, earning_status: null, paid_at: null, due_at: null, paid_marked_at: null };

describe('inviteRow', () => {
  it('reads each state', () => {
    expect(inviteRow(base)).toEqual({ date: '3 Dec', status: 'Free', payout: '—' });
    expect(inviteRow({ ...base, whop_status: 'trialing', period_end: '2026-12-10T00:00:00Z' }).status).toBe('In trial, ends 10 Dec');
    expect(inviteRow({ ...base, whop_status: 'active', billing_days: 30 })).toMatchObject({ status: 'Monthly', payout: 'No payout (monthly)' });
    expect(inviteRow({ ...base, whop_status: 'canceled' })).toMatchObject({ status: 'Canceled', payout: 'No payout' });
    expect(inviteRow({ ...base, earning_status: 'pending', paid_at: '2026-12-10T10:00:00Z', due_at: '2026-12-24T00:00:00Z' })).toMatchObject({ status: 'Yearly, paid 10 Dec', payout: '$10 due 24 Dec' });
    expect(inviteRow({ ...base, earning_status: 'paid', paid_at: '2026-12-10T10:00:00Z', paid_marked_at: '2026-12-24T09:00:00Z' }).payout).toBe('$10 paid 24 Dec');
    expect(inviteRow({ ...base, earning_status: 'void', whop_status: 'canceled' })).toMatchObject({ status: 'Refunded', payout: 'No payout' });
  });
});

describe('totals', () => {
  it('counts and sums', () => {
    expect(totals([base, { ...base, whop_status: 'trialing' }, { ...base, earning_status: 'pending' }, { ...base, earning_status: 'paid' }, { ...base, earning_status: 'void' }]))
      .toEqual({ signedUp: 5, inTrial: 1, paidYearly: 2, onItsWayCents: 1000, paidCents: 1000 });
  });
});
