import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { History, Play, Target, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export type SpeedRun = { id: string; created_at: string; subject: string; correct: number; total: number; duration_seconds: number | null; total_time_seconds: number | null; category: string | null };
export type SpeedConfig = { subject: 'math' | 'english'; duration: number; count: number; category: string | null };

const DURATIONS = [90, 120, 150, 180];
const COUNTS = [10, 15, 20, 25];
const ENGLISH = ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'];
const fmt = (s: number) => `${Math.floor(s / 60) ? `${Math.floor(s / 60)}m` : ''}${s % 60 ? ` ${s % 60}s` : ''}`.trim();
const perQ = (r: SpeedRun) => (r.total ? Math.round((r.total_time_seconds ?? r.duration_seconds ?? 0) / r.total) : 0);
const acc = (r: SpeedRun) => (r.total ? Math.round((100 * r.correct) / r.total) : 0);
const rating = (s: number) => (s === 0 ? '—' : s <= 30 ? 'Excellent' : s <= 60 ? 'Good' : s <= 90 ? 'Steady' : 'Slow');

function Picker<T extends number>({ label, values, value, onChange, render }: { label: string; values: T[]; value: T; onChange: (v: T) => void; render: (v: T) => string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-1">
        {values.map(v => (
          <button key={v} onClick={() => onChange(v)}
            className={`min-w-28 rounded-2xl px-5 py-2 font-mono transition-all active:scale-[0.97] ${v === value ? 'bg-foreground/10 text-2xl font-semibold text-foreground' : 'text-lg text-muted-foreground/60 hover:text-foreground'}`}>{render(v)}</button>
        ))}
      </div>
    </div>
  );
}

export function CenterSpeedLobby({ runs, onStart }: { runs: SpeedRun[]; onStart: (c: SpeedConfig) => void }) {
  const [range, setRange] = useState<7 | 14 | 30>(7);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cfg, setCfg] = useState<SpeedConfig>({ subject: 'math', duration: 120, count: 15, category: null });
  const cats = useQuery({ queryKey: ['question-categories'], queryFn: async () => (await supabase.from('question_categories').select('id, name').order('name')).data ?? [] });
  const domainOptions = (cats.data ?? []).filter(c => (cfg.subject === 'english') === ENGLISH.includes(c.name));
  const catName = Object.fromEntries((cats.data ?? []).map(c => [c.id, c.name]));

  const bestAcc = runs.length ? Math.max(...runs.map(acc)) : 0;
  const last = runs[0];
  const chart = useMemo(() => {
    const since = Date.now() - range * 864e5;
    return runs.filter(r => +new Date(r.created_at) >= since).reverse()
      .map(r => ({ date: new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), accuracy: acc(r), pace: perQ(r) }));
  }, [runs, range]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border admin-glass"><Zap className="h-6 w-6" /></span>
        <div className="flex-1"><h1 className="text-2xl font-bold tracking-tight">Speed Practice</h1><p className="text-sm text-muted-foreground">Challenge yourself with timed sessions</p></div>
        {[['Best acc', `${bestAcc}%`], ['Sessions', String(runs.length)]].map(([l, v]) => (
          <div key={l} className="admin-glass-card rounded-2xl border px-5 py-3 text-center"><p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{l}</p><p className="font-mono text-2xl font-semibold">{v}</p></div>
        ))}
      </header>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="admin-glass-card admin-glass-neutral rounded-3xl border p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="flex-1 font-semibold">Last {range} days performance</h2>
            <div className="flex gap-1 rounded-xl border p-1">
              {([7, 14, 30] as const).map(d => <button key={d} onClick={() => setRange(d)} className={`rounded-lg px-3 py-1 text-sm ${range === d ? 'bg-foreground/15 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{d}d</button>)}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}><History className="h-4 w-4" />History</Button>
          </div>
          {chart.length === 0 ? (
            <div className="grid h-56 place-items-center text-center text-sm text-muted-foreground"><div><Zap className="mx-auto mb-2 h-8 w-8 opacity-50" /><p>No sessions in the last {range} days</p><p className="text-xs">Complete sessions to see your progress</p></div></div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs><linearGradient id="speedAcc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.25} /><stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--popover-foreground))' }}
                    formatter={(v: number, k: string) => (k === 'accuracy' ? [`${v}%`, 'Accuracy'] : [`${v}s`, 'Per problem'])} />
                  <Area type="monotone" dataKey="accuracy" stroke="hsl(var(--foreground))" strokeWidth={2} fill="url(#speedAcc)" />
                  <Area type="monotone" dataKey="pace" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="admin-glass-card admin-glass-neutral flex flex-col rounded-3xl border p-5">
          <p className="text-sm text-muted-foreground">Last session</p>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4">
            <p className="font-mono text-5xl font-semibold">{last ? perQ(last) : 0}<span className="text-2xl">s</span></p>
            <p className="text-sm text-muted-foreground">per problem</p>
            <p className="w-full rounded-full border py-1.5 text-center text-sm font-medium">{last ? rating(perQ(last)) : 'No sessions yet'}</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Target className="h-4 w-4" />{last ? acc(last) : 0}% · {last?.total ?? 0} questions</p>
          </div>
        </section>
      </div>

      <section className="admin-glass-card admin-glass-neutral grid gap-6 rounded-3xl border p-6 md:grid-cols-[auto_auto_1fr]">
        <Picker label="Duration" values={DURATIONS} value={cfg.duration} onChange={v => setCfg(c => ({ ...c, duration: v }))} render={fmt} />
        <Picker label="Questions" values={COUNTS} value={cfg.count} onChange={v => setCfg(c => ({ ...c, count: v }))} render={String} />
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Category</p>
          <div className="flex gap-1 rounded-2xl border p-1">
            {(['math', 'english'] as const).map(s => <button key={s} onClick={() => setCfg(c => ({ ...c, subject: s, category: null }))} className={`rounded-xl px-4 py-1.5 text-sm ${cfg.subject === s ? 'bg-foreground/15 text-foreground' : 'text-muted-foreground'}`}>{s === 'math' ? 'Math' : 'English'}</button>)}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => setCfg(c => ({ ...c, category: null }))} className={`rounded-full border px-4 py-2 text-sm ${!cfg.category ? 'bg-foreground/15' : 'hover:bg-foreground/5'}`}>All mixed</button>
            {domainOptions.map(d => <button key={d.id} onClick={() => setCfg(c => ({ ...c, category: d.id }))} className={`rounded-full border px-4 py-2 text-sm ${cfg.category === d.id ? 'bg-foreground/15' : 'hover:bg-foreground/5'}`}>{d.name}</button>)}
          </div>
        </div>
      </section>

      <Button size="lg" className="h-14 w-full rounded-2xl text-lg" onClick={() => onStart(cfg)}><Play className="h-5 w-5" />Start session</Button>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle>Session history</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-2">
            {runs.length === 0 && <p className="text-sm text-muted-foreground">No sessions yet.</p>}
            {runs.map(r => (
              <div key={r.id} className="rounded-2xl border p-3">
                <div className="flex justify-between text-sm"><span className="font-medium">{r.subject === 'english' ? 'English' : 'Math'} · {r.category ? catName[r.category] ?? 'Topic' : 'All mixed'}</span><span className="text-muted-foreground">{new Date(r.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
                <div className="mt-2 flex gap-4 font-mono text-sm"><span>{r.correct}/{r.total}</span><span>{acc(r)}%</span><span>{perQ(r)}s / problem</span>{r.duration_seconds && <span className="text-muted-foreground">{fmt(r.duration_seconds)}</span>}</div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
