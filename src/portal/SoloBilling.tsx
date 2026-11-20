import { useContext, useState } from 'react';
import { Link, Navigate, NavLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreditCard, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { TERMS_URL } from '@/lib/terms';
import { PRICE } from '@/solo/plans';
import { PageHeader } from './admin/ui';
import { CenterContext } from './centerContext';
import { isPremium, useSoloPlan } from './soloPlan';

// shortcut: Whop's shared Orders page, not the membership's own manage_url (webhooks may leave it out), and live Whop
// only, so a sandbox tester cancels in the sandbox dashboard. Swap to manage_url if buyers get lost there.
export const WHOP_ORDERS = 'https://whop.com/@me/settings/orders/';

export type Billing = {
  plan: string; premium_until: string | null; whop_membership_id: string | null; whop_status: string | null;
  whop_period_end: string | null; whop_cancel_at_period_end: boolean | null; whop_billing_period_days: number | null;
};

/** The solo student's Whop details (0149), apart from useSoloPlan so a failed read here never locks Premium pages. */
export function useSoloBilling() {
  const ctx = useContext(CenterContext);
  return useQuery({
    queryKey: ['solo-billing', ctx?.userId], enabled: !!ctx?.isSolo && !!ctx?.userId, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('solo_students')
        .select('plan, premium_until, whop_membership_id, whop_status, whop_period_end, whop_cancel_at_period_end, whop_billing_period_days')
        .eq('user_id', ctx!.userId!).maybeSingle();
      if (error) throw error;
      return data as Billing | null;
    },
  });
}

const DAY = 864e5;
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** What the Billing page and the plan chip say. Whop sets every field but plan and premium_until. */
export function billingSummary(b: Billing, now = new Date()) {
  if (!isPremium(b, now)) return { kind: 'free' as const, title: 'Free', line: "You're on the Free plan. No card on file." };
  const cycle = b.whop_billing_period_days === 365 ? 'yearly' : b.whop_billing_period_days === 30 ? 'monthly' : null;
  const title = cycle ? `Premium · ${cycle === 'yearly' ? 'Yearly' : 'Monthly'}` : 'Premium';
  const end = b.whop_period_end ?? (b.premium_until && new Date(new Date(b.premium_until).getTime() - DAY).toISOString());
  if (!b.whop_membership_id || !end) {
    return { kind: 'gift' as const, title, line: b.premium_until ? `Open until ${fmt(b.premium_until)}.` : 'No end date.' };
  }
  const price = cycle && `${PRICE[cycle]} a ${cycle === 'yearly' ? 'year' : 'month'}`;
  const cancel = !!b.whop_cancel_at_period_end || b.whop_status === 'canceling';
  const until = fmt(end);
  if (b.whop_status === 'trialing') {
    const line = cancel ? `Your trial ends ${until}. You won't be charged.` : `Free trial ends ${until}${price ? `, then ${price}` : ''}.`;
    return { kind: 'trial' as const, title, line, until, cancel };
  }
  if (cancel) return { kind: 'paid' as const, title, line: `Cancels on ${until}. You keep Premium until then.`, until, cancel };
  return { kind: 'paid' as const, title, line: `Renews on ${until}${cycle ? ` for ${PRICE[cycle]}` : ''}.`, until, cancel };
}

/** The signed-in solo student's summary, null while loading. A failed details read falls back to the plan alone. */
export function useBillingSummary() {
  const { premium, ready } = useSoloPlan();
  const billing = useSoloBilling();
  if (!ready || billing.isPending) return null;
  return billingSummary(billing.data ?? { plan: premium ? 'premium' : 'free', premium_until: null, whop_membership_id: null, whop_status: null, whop_period_end: null, whop_cancel_at_period_end: null, whop_billing_period_days: null });
}

/** Solo students' plan on their profile (Saagii: 19 Nov in Settings, 20 Nov moved to the merged Profile): the same line as
 *  Billing, with Upgrade or Manage billing. */
export function SoloPlanCard() {
  const s = useBillingSummary();
  if (!s) return null;
  return (
    <div className="sky-card space-y-4">
      <div className="flex items-center gap-3">
        <span className="sky-tile sky-tile-blue"><CreditCard /></span>
        <div><p className="text-lg font-bold">Plan & billing</p><p className="text-sm text-muted-foreground">{s.title}</p></div>
      </div>
      <p className="text-sm">{s.line}</p>
      <div className="flex flex-wrap gap-2">
        {s.kind === 'free' && <Button asChild><Link to="/student/premium">Upgrade to Premium</Link></Button>}
        {(s.kind === 'trial' || s.kind === 'paid') && <Button asChild variant="outline"><Link to="/student/billing">Manage billing</Link></Button>}
      </div>
    </div>
  );
}

/** Cancel at the period end, or undo that, through whop-manage; the plan queries refresh with Whop's answer. */
function useManage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const run = async (action: 'cancel' | 'resume') => {
    setBusy(true);
    const { error } = await supabase.functions.invoke('whop-manage', { body: { action } });
    setBusy(false);
    if (error) {
      const ctx = (error as { context?: unknown }).context;
      const msg = ctx instanceof Response ? await ctx.json().then((j: { error?: string }) => j.error).catch(() => null) : null;
      toast.error(msg || "That didn't go through. Please try again.");
      return;
    }
    toast.success(action === 'cancel' ? 'Your subscription is canceled.' : 'Premium will keep going.');
    qc.invalidateQueries({ queryKey: ['solo-billing'] });
    qc.invalidateQueries({ queryKey: ['solo-plan'] });
  };
  return { busy, run };
}

/** Billing for solo students (Saagii, 19–20 Nov): the plan, its next date, and cancelling or undoing it right here. */
export function SoloBilling() {
  const manage = useManage();
  const [confirm, setConfirm] = useState(false);
  const { isSolo } = useSoloPlan();
  const s = useBillingSummary();
  if (!isSolo) return <Navigate to="/student" replace />;
  if (!s) return <Skeleton className="h-64 w-full max-w-xl rounded-xl" />;
  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title="Billing" description="Your plan and payments." />
      <Card>
        <CardHeader>
          <CardTitle>{s.title}</CardTitle>
          <CardDescription>{s.line}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {s.kind === 'free' && <Button asChild><Link to="/student/premium">Upgrade to Premium</Link></Button>}
          {(s.kind === 'trial' || s.kind === 'paid') && <>
            {s.cancel
              ? <Button disabled={manage.busy} onClick={() => void manage.run('resume')}>Keep Premium</Button>
              : <Button variant="outline" disabled={manage.busy} onClick={() => setConfirm(true)}>Cancel subscription</Button>}
            {/* Whop keeps the card, so changing it is the one step that still happens on Whop. */}
            <p className="text-xs text-muted-foreground">To change your card, <a className="underline underline-offset-4 hover:text-foreground" href={WHOP_ORDERS} target="_blank" rel="noopener noreferrer">sign in to Whop</a> with this account's email.</p>
          </>}
        </CardContent>
      </Card>
      {(s.kind === 'trial' || s.kind === 'paid') && (
        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Premium?</AlertDialogTitle>
              <AlertDialogDescription>
                {s.kind === 'trial'
                  ? `Your free trial ends ${s.until}. You won't be charged, and Premium stays on until then.`
                  : `Premium stays on until ${s.until}. You won't be charged again.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Premium</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void manage.run('cancel')}>Cancel subscription</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {(s.kind === 'trial' || s.kind === 'paid') && (
        <p className="text-xs text-muted-foreground">Refunds: email manager@tsetsegs.com within 14 days of a payment. <a className="underline underline-offset-4 hover:text-foreground" href={`${TERMS_URL}#refunds`} target="_blank" rel="noopener noreferrer">Refund rules</a></p>
      )}
    </div>
  );
}

/** Top bar chip for solo students: Free opens the upgrade page, Premium (trial included, Saagii 20 Nov) opens Billing. */
export function PlanChip() {
  const ctx = useContext(CenterContext);
  const { premium, ready } = useSoloPlan();
  if (!ctx?.isSolo || !ready) return null;
  if (!premium) {
    return <Link to="/student/premium" className="student-chip shrink-0" title="Upgrade to Premium">Free<span className="max-sm:hidden text-muted-foreground">· Upgrade</span></Link>;
  }
  return <Link to="/student/billing" className="student-chip shrink-0" title="Billing"><Sparkles className="h-3.5 w-3.5" aria-hidden />Premium</Link>;
}

/** Upgrade (on Free) and Billing, for the account menu and the phone dock's More menu. Render only for solo students. */
export function SoloMenuLinks() {
  const { premium, ready } = useSoloPlan();
  return <>
    {ready && !premium && <DropdownMenuItem asChild><NavLink to="/student/premium"><Sparkles className="h-4 w-4 mr-2" />Upgrade</NavLink></DropdownMenuItem>}
    <DropdownMenuItem asChild><NavLink to="/student/billing"><CreditCard className="h-4 w-4 mr-2" />Billing</NavLink></DropdownMenuItem>
  </>;
}
