import { useMemo, useState } from 'react';
import { BarChart3, Sparkles, Loader2 } from 'lucide-react';
import { format, startOfWeek, subDays, getHours } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { PriorityAlertCard } from '@/components/student/analytics/PriorityAlertCard';
import { WeaknessIdentifier } from '@/components/student/analytics/WeaknessIdentifier';
import { DifficultyAnalysis } from '@/components/student/analytics/DifficultyAnalysis';
import { ErrorPatternTracker } from '@/components/student/analytics/ErrorPatternTracker';
import { ProgressVelocityGraph } from '@/components/student/analytics/ProgressVelocityGraph';
import { ConsistencyScoreCard } from '@/components/student/analytics/ConsistencyScoreCard';
import type { TopicAccuracy, DifficultyBreakdown, ErrorPatterns, ProgressHistory, ConsistencyMetrics } from '@/hooks/useStudentAnalytics';
import type { QMeta } from './questionMeta';

type Attempt = { question_id: string; is_correct: boolean; created_at: string };

/** Same metrics as the main analytics page, computed from tenant attempts + intl question meta. */
function compute(attempts: Attempt[], meta: Record<string, QMeta>, subject: 'math' | 'english') {
  const list = attempts.filter(a => (meta[a.question_id]?.subject ?? 'math').toLowerCase() === subject);
  const topics: Record<string, { c: number; n: number }> = {};
  const diff: DifficultyBreakdown = { easy: { total: 0, correct: 0, accuracy: 0 }, medium: { total: 0, correct: 0, accuracy: 0 }, hard: { total: 0, correct: 0, accuracy: 0 } };
  const wrongCount: Record<string, number> = {};
  for (const a of list) {
    const m = meta[a.question_id];
    const t = (topics[m?.domain ?? 'Other'] ??= { c: 0, n: 0 }); t.n++; if (a.is_correct) t.c++;
    const d = (m?.difficulty_level ?? 'medium').toLowerCase() as keyof DifficultyBreakdown;
    if (diff[d]) { diff[d].total++; if (a.is_correct) diff[d].correct++; }
    if (!a.is_correct) wrongCount[a.question_id] = (wrongCount[a.question_id] ?? 0) + 1;
  }
  (Object.keys(diff) as (keyof DifficultyBreakdown)[]).forEach(k => { diff[k].accuracy = diff[k].total ? Math.round(100 * diff[k].correct / diff[k].total) : 0; });
  const topicAccuracy: TopicAccuracy[] = Object.entries(topics).filter(([n]) => n !== 'Other').map(([topicName, s]) => ({
    topicName, subject: subject === 'math' ? 'Math' : 'English', accuracy: Math.round(100 * s.c / s.n), questionsAttempted: s.n, correctAnswers: s.c, averageTime: 0, optimalTime: 40,
  })).sort((a, b) => a.accuracy - b.accuracy);

  // Without timing data: repeated misses → conceptual; misses on easy → careless; rest → trap answers.
  const ep: ErrorPatterns = { careless: 0, conceptual: 0, timePressure: 0, trapAnswers: 0 };
  for (const a of list) {
    if (a.is_correct) continue;
    const d = (meta[a.question_id]?.difficulty_level ?? '').toLowerCase();
    if (wrongCount[a.question_id] > 1) ep.conceptual++; else if (d === 'easy') ep.careless++; else ep.trapAnswers++;
  }
  const te = ep.careless + ep.conceptual + ep.trapAnswers;
  if (te) (Object.keys(ep) as (keyof ErrorPatterns)[]).forEach(k => { ep[k] = Math.round(100 * ep[k] / te); });

  const weeks: Record<string, { c: number; n: number }> = {}, days: Record<string, { c: number; n: number }> = {};
  const tod: Record<string, { c: number; n: number }> = { morning: { c: 0, n: 0 }, afternoon: { c: 0, n: 0 }, evening: { c: 0, n: 0 } };
  const dow: Record<string, { c: number; n: number }> = {};
  for (const a of list) {
    const dt = new Date(a.created_at);
    if (dt >= subDays(new Date(), 56)) { const w = (weeks[format(startOfWeek(dt), 'yyyy-MM-dd')] ??= { c: 0, n: 0 }); w.n++; if (a.is_correct) w.c++; }
    if (dt >= subDays(new Date(), 30)) { const d = (days[format(dt, 'yyyy-MM-dd')] ??= { c: 0, n: 0 }); d.n++; if (a.is_correct) d.c++; }
    const h = getHours(dt), p = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
    tod[p].n++; if (a.is_correct) tod[p].c++;
    const wd = (dow[format(dt, 'EEEE')] ??= { c: 0, n: 0 }); wd.n++; if (a.is_correct) wd.c++;
  }
  const acc = (s: { c: number; n: number }) => (s.n ? Math.round(100 * s.c / s.n) : 0);
  const progressHistory: ProgressHistory[] = Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).map(([date, s]) => ({ date, score: acc(s) * 16, accuracy: acc(s), questionsAttempted: s.n }));
  const dailyActivity = Object.entries(days).sort(([a], [b]) => a.localeCompare(b)).map(([date, s]) => ({ date, attempts: s.n, accuracy: acc(s) }));
  const avg = dailyActivity.length ? dailyActivity.reduce((x, d) => x + d.accuracy, 0) / dailyActivity.length : 0;
  const best = (r: Record<string, { c: number; n: number }>, def: string) => Object.entries(r).reduce((b, [k, s]) => (s.n && s.c / s.n > b[1] ? [k, s.c / s.n] as [string, number] : b), [def, 0] as [string, number])[0];
  const consistency: ConsistencyMetrics = {
    scoreVariance: dailyActivity.length ? Math.round(Math.sqrt(dailyActivity.reduce((x, d) => x + (d.accuracy - avg) ** 2, 0) / dailyActivity.length)) : 0,
    bestTimeOfDay: best(tod, 'morning') as ConsistencyMetrics['bestTimeOfDay'], bestDayOfWeek: best(dow, 'Monday'), dailyActivity,
    timeOfDayStats: Object.entries(tod).map(([period, s]) => ({ period, accuracy: acc(s), attempts: s.n })),
  };
  const total = list.length, correct = list.filter(a => a.is_correct).length, overall = total ? Math.round(100 * correct / total) : 0;
  const mastered = new Set(list.filter(a => a.is_correct).map(a => a.question_id)).size;
  return { topicAccuracy, diff, ep, progressHistory, consistency, total, correct, overall, mastered, currentScore: Math.round(overall * 16) };
}

export function CenterAnalyticsPage({ attempts, meta, streak }: { attempts: Attempt[]; meta: Record<string, QMeta>; streak: number }) {
  const [subject, setSubject] = useState<'math' | 'english'>('math');
  const a = useMemo(() => compute(attempts, meta, subject), [attempts, meta, subject]);
  const [ai, setAi] = useState(''); const [aiErr, setAiErr] = useState(''); const [loading, setLoading] = useState(false);

  const askAi = async () => {
    setLoading(true); setAi(''); setAiErr('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/student-analytics-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ stats: { subject, totalAttempts: a.total, accuracy: a.overall, mastered: a.mastered, streak, topics: a.topicAccuracy.map(t => ({ t: t.topicName, acc: t.accuracy, n: t.questionsAttempted })), difficulty: a.diff, errorMix: a.ep, weekly: a.progressHistory.map(w => ({ w: w.date, acc: w.accuracy, n: w.questionsAttempted })) } }),
      });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'AI insights are unavailable right now.'); }
      const reader = res.body.getReader(), dec = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; setAi(s => s + dec.decode(value, { stream: true })); }
    } catch (e) { setAiErr(e instanceof Error ? e.message : 'Something went wrong'); }
    setLoading(false);
  };

  const link = '/student/practice';
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><BarChart3 className="h-6 w-6" />Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Actionable insights to improve your SAT score</p>
        </div>
        <Tabs value={subject} onValueChange={v => { setSubject(v as 'math' | 'english'); setAi(''); }}>
          <TabsList><TabsTrigger value="math">Math</TabsTrigger><TabsTrigger value="english">English</TabsTrigger></TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Questions mastered', a.mastered], ['Total attempts', a.total], ['Correct answers', a.correct], ['Accuracy', `${a.overall}%`]].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl border admin-glass-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="font-mono text-xl font-semibold">{v}</p></div>
        ))}
      </div>

      <div className="rounded-2xl border admin-glass-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /><p className="font-semibold">AI study coach</p></div>
          <Button size="sm" onClick={askAi} disabled={loading || a.total === 0}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{ai ? 'Refresh plan' : 'Get my plan'}</Button>
        </div>
        {a.total === 0 && <p className="text-sm text-muted-foreground">Practice a few {subject} questions to unlock your personal plan.</p>}
        {aiErr && <p className="text-sm text-destructive">{aiErr}</p>}
        {ai && <div className="text-sm whitespace-pre-wrap leading-relaxed">{ai}</div>}
        {!ai && !aiErr && a.total > 0 && !loading && <p className="text-sm text-muted-foreground">Get a short, personal plan based on your results.</p>}
      </div>

      <PriorityAlertCard weakestTopic={a.topicAccuracy[0] ?? null} practiceLink={link} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeaknessIdentifier topicAccuracy={a.topicAccuracy} practiceLink={link} />
        <DifficultyAnalysis difficultyBreakdown={a.diff} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorPatternTracker errorPatterns={a.ep} />
        <ConsistencyScoreCard consistencyMetrics={a.consistency} />
      </div>
      <ProgressVelocityGraph progressHistory={a.progressHistory} currentScore={a.currentScore} targetScore={1400} />
    </div>
  );
}
