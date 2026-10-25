import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Brain, Target, FileText, History, XCircle, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { MathText } from '@/components/MathText';
import { PRACTICE_SETS, inPracticeSet } from './practiceSets';
import { supabase } from '@/integrations/supabase/client';
import type { QMeta } from './questionMeta';
import { centerReviewModel, type ReviewAttempt } from './centerReviewModel';

type Detail = { id: string; question_id: string | null; question_text: string; question_set: string | null };
const chartConfig = { score: { label: 'Mastery', color: 'hsl(var(--primary))' } };
// Math questions are named by their practice tab (68, 150, CB), the names students see on Practice.
const source = (s: string | null, subject: 'math' | 'english') =>
  subject === 'math' ? PRACTICE_SETS.find(p => inPracticeSet(p.key, s))?.label ?? s : s;

export function CenterReviewPage({ attempts, meta, studentId }: { attempts: ReviewAttempt[]; meta: Record<string, QMeta>; studentId: string }) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<'math' | 'english'>('math');
  const [area, setArea] = useState<string | null>(null);
  const model = useMemo(() => centerReviewModel(attempts, meta, subject), [attempts, meta, subject]);
  const ids = useMemo(() => [...new Set([...model.pending, ...model.history].map(a => a.question_id))], [model]);
  const details = useQuery({
    queryKey: ['center-review-details', studentId, subject, ids], enabled: ids.length > 0,
    queryFn: async () => {
      const pages = await Promise.all(Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) =>
        supabase.from('intl_questions').select('id, question_id, question_text, question_set').in('id', ids.slice(i * 100, i * 100 + 100))));
      for (const page of pages) if (page.error) throw page.error;
      return Object.fromEntries(pages.flatMap(p => (p.data ?? []) as Detail[]).map(q => [q.id, q]));
    },
  });
  const open = (id: string) => navigate(`/student/practice?q=${encodeURIComponent(id)}`);
  const shown = model.pending.filter(a => !area || meta[a.question_id]?.domain === area);
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3"><span className="sky-tile sky-tile-violet"><Brain /></span><div><h1 className="text-3xl font-bold">Review mistakes</h1><p className="sky-body mt-1">Your next chance to get it right.</p></div></div>
      <span className="sky-pill"><RotateCcw className="h-4 w-4 text-primary" /><span className="font-mono font-semibold">{model.pending.length}</span><span className="text-sm sky-body">to revisit</span></span>
    </header>
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-card p-1" role="tablist" aria-label="Review subject">
      {(['math', 'english'] as const).map(s => <Button key={s} role="tab" aria-selected={subject === s} variant={subject === s ? 'default' : 'ghost'} className="rounded-full" onClick={() => { setSubject(s); setArea(null); }}>{s === 'math' ? <Target className="h-4 w-4" /> : <FileText className="h-4 w-4" />}{s === 'math' ? 'Math' : 'English'}</Button>)}
    </div>
    <div className="grid min-w-0 gap-4 xl:grid-cols-10">
      <div className="min-w-0 space-y-4 xl:col-span-7">
        <section className="sky-card">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-semibold"><Brain className="h-4 w-4 text-primary" />Weakness areas</h2><span className="text-xs text-muted-foreground">Mastery · last 14 days</span></div>
          <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,180px)]">
            <ChartContainer config={chartConfig} className="h-[260px] w-full min-w-0 aspect-auto">
              <RadarChart data={model.mastery} outerRadius="65%"><PolarGrid /><PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} /><PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={5} /><Radar name="Mastery" dataKey="score" stroke="var(--color-score)" fill="var(--color-score)" fillOpacity={0.25} /><ChartTooltip content={<ChartTooltipContent />} /></RadarChart>
            </ChartContainer>
            <div className="min-w-0 space-y-2 border-t pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0"><h3 className="mb-3 text-sm font-medium">Mistakes by area</h3>
              {Object.entries(model.byArea).sort((a, b) => b[1] - a[1]).map(([d, n]) => <Button key={d} variant="ghost" onClick={() => setArea(area === d ? null : d)} className={`h-auto w-full justify-between gap-3 whitespace-normal rounded-lg px-2 py-2 text-left text-xs ${area === d ? 'bg-accent text-accent-foreground' : ''}`}><span className="min-w-0">{d}</span><span className="shrink-0 rounded-full bg-accent px-2 py-1 font-mono text-accent-foreground">{n}</span></Button>)}
              {!model.pending.length && <p className="text-sm text-muted-foreground">No mistakes found.</p>}
            </div>
          </div>
        </section>
        <section className="sky-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-semibold"><RotateCcw className="h-4 w-4 text-primary" />Wrong questions <span className="font-mono text-muted-foreground">({shown.length})</span></h2>{area && <Button variant="ghost" size="sm" onClick={() => setArea(null)}>All areas</Button>}</div>
          {details.isError && <p role="alert" className="text-sm text-destructive">Question previews couldn’t load. <Button variant="link" onClick={() => details.refetch()}>Try again</Button></p>}
          {shown.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
            {shown.map(a => { const q = details.data?.[a.question_id]; return <Button key={a.question_id} variant="outline" onClick={() => open(a.question_id)} className="h-auto min-h-36 w-full min-w-0 flex-col items-stretch justify-start gap-2 whitespace-normal rounded-xl border-destructive/20 bg-destructive/5 p-3 text-left hover:border-primary/40 hover:bg-accent">
              <span className="flex items-center justify-between gap-2"><XCircle className="h-4 w-4 shrink-0 text-destructive" /><span className="truncate rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">{source(q?.question_set ?? null, subject) ?? subject}</span></span>
              <span className="truncate font-mono text-xs font-semibold">{q?.question_id ?? a.question_id.slice(0, 8)}</span><span className="text-xs font-medium">{meta[a.question_id]?.domain}</span>
              <span className="line-clamp-2 text-xs font-normal text-muted-foreground"><MathText text={q?.question_text ?? 'Loading preview…'} /></span>
            </Button>; })}
          </div> : <div className="py-8 text-center"><CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" /><p className="font-medium">No mistakes waiting.</p><Button variant="link" onClick={() => navigate('/student/practice')}>Keep practicing <ArrowRight className="h-4 w-4" /></Button></div>}
        </section>
      </div>
      <aside className="sky-card min-w-0 xl:col-span-3 xl:sticky xl:top-6 xl:self-start">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><History className="h-4 w-4 text-primary" />Review history</h2>
        <div className="max-h-[480px] space-y-2 overflow-y-auto xl:max-h-[calc(100vh-14rem)]">
          {model.history.map((a, i) => { const q = details.data?.[a.question_id]; return <Button key={`${a.question_id}-${a.created_at}-${i}`} variant="ghost" className="h-auto w-full min-w-0 items-start justify-start gap-2 whitespace-normal rounded-xl bg-muted/40 p-3 text-left" onClick={() => open(a.question_id)}>
            {a.is_correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-healthy" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
            <span className="min-w-0 flex-1 space-y-1"><span className="block truncate font-mono text-xs">{q?.question_id ?? a.question_id.slice(0, 8)}</span><span className="block text-xs text-muted-foreground">{meta[a.question_id]?.domain}</span><span className="block line-clamp-2 text-xs font-normal"><MathText text={q?.question_text ?? 'Loading preview…'} /></span><span className="block text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span></span>
          </Button>; })}
          {!model.history.length && <p className="py-8 text-center text-sm text-muted-foreground">No review history yet.</p>}
        </div>
      </aside>
    </div>
  </div>;
}