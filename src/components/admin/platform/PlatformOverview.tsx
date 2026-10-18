import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, TrendingUp, Clock, Radio, AlertTriangle, Ban, Send, Unlock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInstitutionCustomers, localToday, money } from '@/hooks/useInstitutionCustomers';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { CustomerGlobe } from './CustomerGlobe';
import { countryCentroid } from './countryCentroids';

const sumByCurrency = (rows: { amount: number; currency: string }[]) => {
  const m = new Map<string, number>();
  rows.forEach(r => m.set(r.currency, (m.get(r.currency) ?? 0) + Number(r.amount)));
  return [...m.entries()];
};
const fmtGroups = (g: [string, number][], mult = 1) => (g.length ? g.map(([c, v]) => money(v * mult, c)).join(' · ') : money(0, 'USD'));

function Stat({ icon: Icon, label, value, sub, loading, tip }: { icon: typeof Users; label: string; value: string; sub: string; loading: boolean; tip?: React.ReactNode }) {
  const body = (
    <div className="min-w-0 space-y-2 xl:border-r xl:last:border-r-0 pr-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      {loading ? <Skeleton className="h-8 w-24" /> : <p className={`font-mono font-medium tabular-nums ${value.length > 12 ? "text-lg leading-snug" : "text-2xl truncate"}`}>{value}</p>}
      <p className="text-xs text-muted-foreground truncate">{sub}</p>
    </div>
  );
  if (!tip) return body;
  return <Tooltip><TooltipTrigger asChild><div className="cursor-help">{body}</div></TooltipTrigger><TooltipContent>{tip}</TooltipContent></Tooltip>;
}

export function PlatformOverview() {
  const { customers, payments, isLoading, refresh } = useInstitutionCustomers();
  const activity = useQuery({
    queryKey: ['admin-customer-activity'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_customer_activity');
      if (error) throw error;
      return data ?? [];
    },
  });
  const solo = useQuery({
    queryKey: ['admin-solo-active-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('student_accounts').select('id', { count: 'exact', head: true })
        .eq('is_active', true).eq('is_ghost', false).eq('is_dev_account', false);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const [mostActive, setMostActive] = useState<'customers' | 'countries'>('customers');
  const [confirm, setConfirm] = useState<{ id: string; name: string; block: boolean } | null>(null);
  const today = localToday();

  const act = useMemo(() => new Map((activity.data ?? []).map(a => [a.institution_id, a])), [activity.data]);
  const centerStudents = (activity.data ?? []).reduce((s, a) => s + Number(a.students), 0);
  const soloCount = solo.data ?? 0;
  const byId = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

  const since30 = Date.now() - 30 * 864e5;
  const mrr = sumByCurrency(payments.filter(p => p.paid_at && new Date(p.paid_at).getTime() >= since30));
  const unpaid = payments.filter(p => !p.paid_at);
  const pending = sumByCurrency(unpaid);

  const recentPaid = payments.filter(p => p.paid_at).sort((a, b) => b.paid_at!.localeCompare(a.paid_at!)).slice(0, 6);
  const overdue = useMemo(() => {
    const g = new Map<string, { id: string; name: string; days: number; rows: typeof unpaid }>();
    unpaid.filter(p => p.due_date < today).forEach(p => {
      const c = byId.get(p.customer_id); if (!c) return;
      const days = Math.floor((Date.parse(today) - Date.parse(p.due_date)) / 864e5);
      const e = g.get(c.id) ?? { id: c.id, name: c.name, days: 0, rows: [] };
      e.days = Math.max(e.days, days); e.rows.push(p); g.set(c.id, e);
    });
    return [...g.values()].sort((a, b) => b.days - a.days);
  }, [unpaid, byId, today]);

  const markers = useMemo(() => {
    const m = new Map<string, { location: [number, number]; size: number }>();
    customers.forEach(c => {
      const loc = countryCentroid(c.country); if (!loc) return;
      const k = loc.join(',');
      const students = Number(act.get(c.id)?.students ?? 0);
      const e = m.get(k) ?? { location: loc, size: 0 };
      e.size += 1 + students; m.set(k, e);
    });
    const max = Math.max(1, ...[...m.values()].map(v => v.size));
    return [...m.values()].map(v => ({ location: v.location, size: 0.04 + 0.08 * (v.size / max) }));
  }, [customers, act]);

  const ranking = useMemo(() => {
    if (mostActive === 'customers') {
      return customers.map(c => ({ key: c.id, label: c.name, sub: c.country || '—', value: Number(act.get(c.id)?.attempts_7d ?? 0) }))
        .sort((a, b) => b.value - a.value).slice(0, 6);
    }
    const g = new Map<string, number>();
    customers.forEach(c => g.set(c.country || 'Unknown', (g.get(c.country || 'Unknown') ?? 0) + Number(act.get(c.id)?.attempts_7d ?? 0)));
    return [...g.entries()].map(([k, v]) => ({ key: k, label: k, sub: `${customers.filter(c => (c.country || 'Unknown') === k).length} customers`, value: v }))
      .sort((a, b) => b.value - a.value).slice(0, 6);
  }, [mostActive, customers, act]);
  const maxRank = Math.max(1, ...ranking.map(r => r.value));

  const warn = async (id: string) => {
    const { data, error } = await supabase.rpc('admin_customer_warn', { _id: id });
    if (error) return toast.error(error.message);
    toast.success(`Warning ${data} sent`);
    refresh();
  };
  const setBlocked = async (id: string, block: boolean) => {
    const { error } = await supabase.rpc('admin_customer_set_blocked', { _id: id, _blocked: block });
    if (error) return toast.error(error.message);
    toast.success(block ? 'Center portal locked' : 'Center portal unlocked');
    refresh();
  };

  const loading = isLoading || activity.isLoading;
  const blockedCustomers = customers.filter(c => c.access_blocked_at);

  return (
    <div className="space-y-6 min-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold font-chillax tracking-normal text-foreground [text-shadow:0_0_24px_hsl(var(--section-glow,217_91%_60%)/0.45)]">
          Platform overview
        </h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
          <Radio className="w-3 h-3 text-status-healthy" />
          <span className="text-xs font-mono text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-5 border-y py-6">
        <Stat icon={Building2} label="Customers" value={String(customers.length)} sub={`${customers.filter(c => c.portal_enabled).length} with live portals`} loading={isLoading} />
        <Stat icon={Users} label="Active accounts" value={(centerStudents + soloCount).toLocaleString()} sub="hover for breakdown" loading={loading || solo.isLoading}
          tip={<div className="text-xs space-y-0.5"><p>Center students: {centerStudents.toLocaleString()}</p><p>Solo students: {soloCount.toLocaleString()}</p></div>} />
        <Stat icon={TrendingUp} label="MRR · ARR" value={fmtGroups(mrr)} sub={`ARR ${fmtGroups(mrr, 12)} · customers only`} loading={isLoading} />
        <Stat icon={Clock} label="Pending payment" value={fmtGroups(pending)} sub={`${unpaid.length} unpaid ${unpaid.length === 1 ? 'bill' : 'bills'}`} loading={isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="admin-glass-card rounded-xl border p-5">
          <h2 className="text-sm font-medium">Customer locations</h2>
          <p className="text-xs text-muted-foreground">Pin size grows with students</p>
          <div className="mt-2">{loading ? <Skeleton className="aspect-square max-w-[420px] mx-auto rounded-full" /> : <CustomerGlobe markers={markers} />}</div>
          {!loading && customers.some(c => !countryCentroid(c.country)) && (
            <p className="text-xs text-muted-foreground mt-2">Some customers have no recognised country, so they have no pin.</p>
          )}
        </section>
        <section className="admin-glass-card rounded-xl border p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium">Most active</h2>
              <p className="text-xs text-muted-foreground">Questions answered in the last 7 days</p>
            </div>
            <div className="flex rounded-lg border p-0.5 text-xs">
              {(['customers', 'countries'] as const).map(k => (
                <button key={k} onClick={() => setMostActive(k)} className={`px-2.5 py-1 rounded-md capitalize ${mostActive === k ? 'bg-muted font-medium' : 'text-muted-foreground'}`}>{k}</button>
              ))}
            </div>
          </div>
          <ol className="mt-4 space-y-3">
            {loading ? [0, 1, 2].map(i => <Skeleton key={i} className="h-9" />) : ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground">No customers yet.</p>
            ) : ranking.map((r, i) => (
              <li key={r.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="truncate"><span className="font-mono text-muted-foreground mr-2">{i + 1}</span>{r.label} <span className="text-xs text-muted-foreground">· {r.sub}</span></span>
                  <span className="font-mono tabular-nums">{r.value.toLocaleString()}</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-foreground/60" style={{ width: `${(r.value / maxRank) * 100}%` }} /></div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="admin-glass-card rounded-xl border p-5">
          <h2 className="text-sm font-medium">Recent payments</h2>
          <ul className="mt-3 divide-y">
            {isLoading ? <Skeleton className="h-24" /> : recentPaid.length === 0 ? <p className="text-sm text-muted-foreground py-2">No payments recorded yet.</p> : recentPaid.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{byId.get(p.customer_id)?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.description || 'Payment'} · {new Date(p.paid_at!).toLocaleDateString()}</p>
                </div>
                <span className="font-mono tabular-nums">{money(Number(p.amount), p.currency)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="admin-glass-card rounded-xl border p-5">
          <h2 className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-status-risk" />Overdue payments</h2>
          <ul className="mt-3 divide-y">
            {isLoading ? <Skeleton className="h-24" /> : overdue.length === 0 && blockedCustomers.length === 0 ? <p className="text-sm text-muted-foreground py-2">Nothing overdue.</p> : overdue.map(o => {
              const c = byId.get(o.id)!;
              const warnings = c.payment_warning_count ?? 0;
              return (
                <li key={o.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{o.name}{c.access_blocked_at && <span className="ml-2 text-xs text-status-risk">Locked</span>}</p>
                      <p className="text-xs text-muted-foreground">{o.days} days late · {fmtGroups(sumByCurrency(o.rows))}</p>
                    </div>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${warnings >= 3 ? 'bg-status-risk/10 text-status-risk' : 'bg-muted text-muted-foreground'}`}>{warnings} {warnings === 1 ? 'warning' : 'warnings'}</span>
                  </div>
                  <div className="flex gap-2">
                    {!c.access_blocked_at && <Button size="sm" variant="outline" onClick={() => warn(o.id)}><Send className="h-3.5 w-3.5" />Send warning</Button>}
                    {!c.access_blocked_at && warnings >= 3 && <Button size="sm" variant="destructive" onClick={() => setConfirm({ id: o.id, name: o.name, block: true })}><Ban className="h-3.5 w-3.5" />Block access</Button>}
                    {c.access_blocked_at && <Button size="sm" variant="outline" onClick={() => setConfirm({ id: o.id, name: o.name, block: false })}><Unlock className="h-3.5 w-3.5" />Unblock</Button>}
                  </div>
                </li>
              );
            })}
            {blockedCustomers.filter(c => !overdue.some(o => o.id === c.id)).map(c => (
              <li key={c.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{c.name} <span className="text-xs text-status-risk">Locked</span></span>
                <Button size="sm" variant="outline" onClick={() => setConfirm({ id: c.id, name: c.name, block: false })}><Unlock className="h-3.5 w-3.5" />Unblock</Button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.block ? `Lock ${confirm?.name}'s portal?` : `Unlock ${confirm?.name}'s portal?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.block
                ? 'Their admin, teachers and students will not be able to use the portal until you unlock it. Their data stays safe.'
                : 'Everyone at this center can use the portal again. Their warning count resets to 0.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirm) setBlocked(confirm.id, confirm.block); setConfirm(null); }}>
              {confirm?.block ? 'Lock portal' : 'Unlock portal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
