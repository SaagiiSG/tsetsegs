import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { loadWhop } from '@whop/elements';
import { Checkout, CheckoutElement, WhopElements } from '@whop/elements-react';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PREMIUM_PLAN, PRICE } from '@/solo/plans';
import { PageHeader } from './admin/ui';
import { useSoloPlan } from './soloPlan';

type Cycle = 'monthly' | 'yearly';
type Session = { id: string; environment: 'production' | 'sandbox'; email: string };

// Whop's hosted script loads on the first visit to this page, once, and never on any other page.
let whop: ReturnType<typeof loadWhop> | undefined;
const getWhop = () => (whop ??= loadWhop());

/** whop-checkout picks the plan (14 days for early birds) and puts the student's id on the checkout. */
export async function startCheckout(cycle: Cycle): Promise<Session> {
  const { data, error } = await supabase.functions.invoke('whop-checkout', { body: { cycle } });
  if (error) {
    // Only an HTTP error carries a Response; a network or missing-function error carries something else (19 Nov).
    const ctx = (error as { context?: unknown }).context;
    const msg = ctx instanceof Response ? await ctx.json().then((j: { error?: string }) => j.error).catch(() => null) : null;
    throw new Error(msg || 'Checkout is unavailable right now. Please try again.');
  }
  return data as Session;
}

/**
 * Solo Premium checkout: our page around Whop's card form (Saagii, 17 Nov). Premium turns on only from Whop's webhook
 * (whop-webhook, 0145), never from this page. Whop sends the buyer back here with ?status= after paying, or after a
 * bank check such as 3D Secure, so `succeeded` waits for the webhook and anything else shows the form again.
 */
export function SoloPremium() {
  const { isSolo, premium, ready } = useSoloPlan();
  const [params] = useSearchParams();
  const status = params.get('status');
  const [cycle, setCycle] = useState<Cycle>('yearly');
  // Paid and the webhook has landed: the dashboard, under the Premium welcome dialog (PremiumWelcome, 19 Nov).
  const welcome = premium && status === 'succeeded';

  if (!isSolo) return <Navigate to="/student" replace />;
  if (!ready) return <Skeleton className="h-96 w-full max-w-xl rounded-xl" />;
  if (welcome) return <Navigate to="/student" replace state={{ premiumWelcome: true }} />;
  // Premium already: Billing shows the plan (19 Nov).
  if (premium) return <Navigate to="/student/billing" replace />;
  if (status === 'succeeded') return <Activating />;

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title="Go Premium" description="Your free trial starts today. The form below shows the date of your first charge." />
      {status && <p className="text-sm text-destructive">Your payment didn't go through. You can try again below.</p>}
      <ul className="space-y-2 text-sm">
        {PREMIUM_PLAN.map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{item}</li>)}
      </ul>
      <Tabs value={cycle} onValueChange={v => setCycle(v as Cycle)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly">Monthly · {PRICE.monthly}</TabsTrigger>
          <TabsTrigger value="yearly">Yearly · {PRICE.yearly}</TabsTrigger>
        </TabsList>
      </Tabs>
      {/* A new checkout per plan: Whop fixes what's being bought when the form mounts. */}
      <CheckoutForm key={cycle} cycle={cycle} />
    </div>
  );
}

function CheckoutForm({ cycle }: { cycle: Cycle }) {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const session = useQuery({ queryKey: ['whop-checkout', cycle], queryFn: () => startCheckout(cycle), staleTime: Infinity, retry: false });
  const loading = <Skeleton className="h-96 w-full rounded-xl" />;
  if (session.isPending) return loading;
  if (session.isError) return <p className="text-sm text-destructive">{session.error.message}</p>;
  const { id, environment, email } = session.data;
  return (
    // skipPixel: no Whop ad tracking on a page our students use.
    <WhopElements elements={getWhop()} environment={environment} skipPixel
      appearance={{ theme: { appearance: resolvedTheme === 'dark' ? 'dark' : 'light', accentColor: 'sky' } }}>
      {/* onComplete: an on-page payment never leaves, so go to the wait screen ourselves. That also skips Whop's success
          screen, which offers to claim the purchase into a Whop account by emailing a code. */}
      <Checkout checkoutConfiguration={id} returnUrl={`${window.location.origin}/solo/student/premium`} fallback={loading}
        onComplete={() => navigate('/student/premium?status=succeeded', { replace: true })}>
        <CheckoutElement buyerEmail={email} lockBuyerEmail />
      </Checkout>
    </WhopElements>
  );
}

/** Paid: Whop's webhook usually lands within seconds. Re-read the plan until it does. */
function Activating() {
  const qc = useQueryClient();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const tick = setInterval(() => { qc.invalidateQueries({ queryKey: ['solo-plan'] }); qc.invalidateQueries({ queryKey: ['solo-billing'] }); }, 2000);
    const late = setTimeout(() => setSlow(true), 60_000);
    return () => { clearInterval(tick); clearTimeout(late); };
  }, [qc]);
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Turning on Premium…</CardTitle>
        <CardDescription>
          {slow ? 'Your payment went through, but Premium is taking longer than usual. Check back in a few minutes, or contact us from Help.' : 'Your payment went through. This takes a few seconds.'}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
