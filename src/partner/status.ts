import { PARTNER_EARNING_CENTS } from '../../supabase/functions/_shared/partner-rules';

export type Invite = {
  signed_up: string; whop_status: string | null; billing_days: number | null; period_end: string | null;
  earning_status: 'pending' | 'void' | 'paid' | null; paid_at: string | null; due_at: string | null; paid_marked_at: string | null;
};

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const usd = (cents: number) => `$${cents / 100}`;
const on = (iso: string | null) => (iso ? fmtDate(iso) : '');

/** One invite as a date, a status and a payout line. The earning wins over the Whop status. */
export function inviteRow(i: Invite): { date: string; status: string; payout: string } {
  const date = fmtDate(i.signed_up);
  const $ = usd(PARTNER_EARNING_CENTS);
  if (i.earning_status === 'pending') return { date, status: `Yearly, paid ${on(i.paid_at)}`, payout: `${$} due ${on(i.due_at)}` };
  if (i.earning_status === 'paid') return { date, status: `Yearly, paid ${on(i.paid_at)}`, payout: `${$} paid ${on(i.paid_marked_at)}` };
  if (i.earning_status === 'void') return { date, status: 'Refunded', payout: 'No payout' };
  if (i.whop_status === 'trialing') return { date, status: i.period_end ? `In trial, ends ${on(i.period_end)}` : 'In trial', payout: '—' };
  if (i.whop_status === null) return { date, status: 'Free', payout: '—' };
  if (i.whop_status === 'canceled') return { date, status: 'Canceled', payout: 'No payout' };
  if (i.whop_status === 'active' || i.whop_status === 'canceling') {
    // No earning yet can mean the payment webhook hasn't landed, so a long plan says "Checking", not "No payout".
    if (i.billing_days == null) return { date, status: 'Paid plan', payout: 'Checking' };
    return i.billing_days <= 31 ? { date, status: 'Monthly', payout: 'No payout (monthly)' } : { date, status: 'Yearly', payout: 'Checking' };
  }
  return { date, status: 'Not on a plan', payout: '—' };
}

export function totals(invites: Invite[]) {
  const count = (s: Invite['earning_status']) => invites.filter(i => i.earning_status === s).length;
  return {
    signedUp: invites.length,
    inTrial: invites.filter(i => i.whop_status === 'trialing' && !i.earning_status).length,
    paidYearly: count('pending') + count('paid'),
    onItsWayCents: count('pending') * PARTNER_EARNING_CENTS,
    paidCents: count('paid') * PARTNER_EARNING_CENTS,
  };
}
