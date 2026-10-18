import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { Building2, User, Activity, HeartPulse, Wallet, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInstitutionCustomers, localToday, money, healthLabels, healthStyles } from '@/hooks/useInstitutionCustomers';
import { Skeleton } from '@/components/ui/skeleton';

type Period = 'weekly' | 'monthly';

const startOfWeek = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const bucketKey = (d: Date, p: Period) => p === 'weekly' ? startOfWeek(d).toISOString().slice(0, 10) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function buckets(p: Period) {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  if (p === 'weekly') {
    const s = startOfWeek(now);
    for (let i = 11; i >= 0; i--) { const d = new Date(s); d.setDate(d.getDate() - i * 7); out.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) }); }
  } else {
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push({ key: bucketKey(d, p), label: d.toLocaleDateString('en', { month: 'short' }) }); }
  }
  return out;
}

function Kpi({ label, value, sub, loading }: { label: string; value: string; sub: string; loading?: boolean }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {loading ? <Skeleton className="h-7 w-20" /> : <p className="font-mono text-xl font-medium tabular-nums truncate">{value}</p>}
      <p className="text-xs text-muted-foreground truncate">{sub}</p>
    </div>
  );
}

const headCount = async (q: PromiseLike<{ count: number | null; error: unknown }>) => { const { count, error } = await q; if (error) throw error; return count ?? 0; };

export function PlatformInsights() {
  const { customers, payments, isLoading } = useInstitutionCustomers();
  const [period, setPeriod] = useState<Period>('weekly');
  const today = localToday();

  const activity = useQuery({
    queryKey: ['admin-customer-activity'],
    queryFn: async () => { const { data, error } = await supabase.rpc('admin_customer_activity'); if (error) throw error; return data ?? []; },
  });
  const solo = useQuery({
    queryKey: ['admin-solo-health'],
    queryFn: async () => {
      const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
      const since14 = new Date(Date.now() - 14 * 864e5).toISOString();
      const [active, attempts7, attemptsPrev, correct7] = await Promise.all([
        headCount(supabase.from('student_accounts').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_ghost', false).eq('is_dev_account', false)),
        headCount(supabase.from('student_attempts').select('id', { count: 'exact', head: true }).gte('attempted_at', since7)),
        headCount(supabase.from('student_attempts').select('id', { count: 'exact', head: true }).gte('attempted_at', since14).lt('attempted_at', since7)),
        headCount(supabase.from('student_attempts').select('id', { count: 'exact', head: true }).gte('attempted_at', since7).eq('is_correct', true)),
      ]);
      return { active, attempts7, attemptsPrev, accuracy: attempts7 ? Math.round((correct7 / attempts7) * 100) : 0 };
    },
  });

  const loading = isLoading || activity.isLoading;
  const act = activity.data ?? [];
  const centerStudents = act.reduce((s, a) => s + Number(a.students ?? 0), 0);
  const centerAttempts = act.reduce((s, a) => s + Number(a.attempts_7d ?? 0), 0);
  const activeCenters = act.filter(a => Number(a.attempts_7d) > 0).length;

  const healthCounts = useMemo(() => {
    const m: Record<string, number> = { healthy: 0, watch: 0, at_risk: 0, not_assessed: 0 };
    customers.forEach(c => { m[c.health] = (m[c.health] ?? 0) + 1; });
    return m;
  }, [customers]);

  const currency = useMemo(() => {
    const m = new Map<string, number>();
    payments.forEach(p => m.set(p.currency, (m.get(p.currency) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'USD';
  }, [payments]);
  const inCur = payments.filter(p => p.currency === currency);
  const otherCurrencies = new Set(payments.map(p => p.currency)).size > 1;

  const billedDue = inCur.filter(p => p.due_date <= today);
  const collected = billedDue.filter(p => p.paid_at).reduce((s, p) => s + Number(p.amount), 0);
  const billed = billedDue.reduce((s, p) => s + Number(p.amount), 0);
  const collectionRate = billed ? Math.round((collected / billed) * 100) : 0;
  const overdueAmt = inCur.filter(p => !p.paid_at && p.due_date < today).reduce((s, p) => s + Number(p.amount), 0);

  const trend = useMemo(() => {
    const bs = buckets(period);
    const m = new Map(bs.map(b => [b.key, 0]));
    inCur.forEach(p => { if (!p.paid_at) return; const k = bucketKey(new Date(p.paid_at), period); if (m.has(k)) m.set(k, m.get(k)! + Number(p.amount)); });
    return bs.map(b => ({ label: b.label, customers: m.get(b.key) ?? 0, solo: 0 }));
  }, [inCur, period]);
  const periodTotal = trend.reduce((s, t) => s + t.customers, 0);
  const last = trend[trend.length - 1]?.customers ?? 0;
  const prev = trend[trend.length - 2]?.customers ?? 0;
  const change = prev ? Math.round(((last - prev) / prev) * 100) : null;

  const s = solo.data;
  const soloChange = s && s.attemptsPrev ? Math.round(((s.attempts7 - s.attemptsPrev) / s.attemptsPrev) * 100) : null;

  return (
    <div className="space-y-6 min-h-[calc(100vh-8rem)]">
      <h1 className="text-2xl font-semibold font-chillax tracking-normal text-foreground [text-shadow:0_0_24px_hsl(var(--section-glow,217_91%_60%)/0.45)]">
        Insights
      </h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="admin-glass-card rounded-xl border p-5 space-y-5">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-medium">Customer health</h2></div>
          <div className="grid grid-cols-3 gap-4">
            <Kpi label="Active centers" value={`${activeCenters}/${customers.length}`} sub="answered questions in 7 days" loading={loading} />
            <Kpi label="Center students" value={centerStudents.toLocaleString()} sub="across all centers" loading={loading} />
            <Kpi label="Questions · 7d" value={centerAttempts.toLocaleString()} sub="answered in centers" loading={loading} />
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(healthCounts).map(([k, v]) => (
              <span key={k} className={`text-xs px-2 py-1 rounded-full font-medium ${healthStyles[k] ?? 'bg-muted'}`}>{healthLabels[k] ?? k} · {v}</span>
            ))}
          </div>
        </section>

        <section className="admin-glass-card rounded-xl border p-5 space-y-5">
          <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-medium">Solo students health</h2></div>
          <div className="grid grid-cols-3 gap-4">
            <Kpi label="Active accounts" value={(s?.active ?? 0).toLocaleString()} sub="excludes test accounts" loading={solo.isLoading} />
            <Kpi label="Questions · 7d" value={(s?.attempts7 ?? 0).toLocaleString()} sub={soloChange === null ? 'no prior week data' : `${soloChange >= 0 ? '+' : ''}${soloChange}% vs last week`} loading={solo.isLoading} />
            <Kpi label="Accuracy · 7d" value={`${s?.accuracy ?? 0}%`} sub="correct answers" loading={solo.isLoading} />
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" />Solo students don't pay yet, so their revenue shows 0 until a paywall exists.</p>
        </section>
      </div>

      <section className="admin-glass-card rounded-xl border p-5">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 pb-5 border-b">
          <Kpi label={`Revenue · last 12 ${period === 'weekly' ? 'weeks' : 'months'}`} value={money(periodTotal, currency)} sub="customers + solo" loading={isLoading} />
          <Kpi label={`This ${period === 'weekly' ? 'week' : 'month'}`} value={money(last, currency)} sub={change === null ? 'no previous revenue' : `${change >= 0 ? '+' : ''}${change}% vs previous`} loading={isLoading} />
          <Kpi label="Collection rate" value={`${collectionRate}%`} sub={`${money(collected, currency)} of ${money(billed, currency)} billed`} loading={isLoading} />
          <Kpi label="Overdue" value={money(overdueAmt, currency)} sub="unpaid past due date" loading={isLoading} />
        </div>
        <div className="flex items-center justify-between gap-2 pt-5">
          <div>
            <h2 className="text-sm font-medium flex items-center gap-2"><Wallet className="h-3.5 w-3.5" />Revenue trend</h2>
            <p className="text-xs text-muted-foreground">Paid bills, in {currency}{otherCurrencies ? ' (other currencies not included)' : ''}</p>
          </div>
          <div className="flex rounded-lg border p-0.5 text-xs">
            {(['weekly', 'monthly'] as const).map(k => (
              <button key={k} onClick={() => setPeriod(k)} className={`px-2.5 py-1 rounded-md capitalize ${period === k ? 'bg-muted font-medium' : 'text-muted-foreground'}`}>{k}</button>
            ))}
          </div>
        </div>
        <div className="h-64 mt-4">
          {isLoading ? <Skeleton className="h-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={56} />
                <RTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: number, n: string) => [money(v, currency), n === 'customers' ? 'Customers' : 'Solo students']} />
                <Area type="monotone" dataKey="customers" stroke="hsl(var(--foreground))" strokeWidth={2} fill="url(#revFill)" />
                <Area type="monotone" dataKey="solo" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1.5} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-foreground" />Customers</span>
          <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t border-dashed border-muted-foreground" />Solo students</span>
          {healthCounts.at_risk > 0 && <span className="flex items-center gap-1.5 ml-auto text-status-risk"><AlertTriangle className="h-3.5 w-3.5" />{healthCounts.at_risk} at-risk {healthCounts.at_risk === 1 ? 'customer' : 'customers'}</span>}
          {healthCounts.at_risk === 0 && <span className="flex items-center gap-1.5 ml-auto"><HeartPulse className="h-3.5 w-3.5" />No at-risk customers</span>}
        </div>
      </section>
    </div>
  );
}
