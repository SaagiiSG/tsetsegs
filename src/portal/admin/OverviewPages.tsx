import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCenter } from '../centerContext';
import { localDate } from '../centerApi';
import { useCenterAdminData, useQuestionTopics, pct } from './useCenterAdminData';
import { Bar, Empty, Loading, PageHeader, Section, StatRow } from './ui';
import { DashboardView } from '@/components/admin/DashboardStats';
import { activeSprintId } from '../studentStats';
import { useCenterSprints } from './ToolPages';
import { centerDashboard } from './centerDashboard';

const ATTENDED = new Set(['present', 'late']);

export function DashboardPage() {
  const { center } = useCenter();
  const { data, isLoading } = useCenterAdminData();
  const sid = activeSprintId(useCenterSprints().data);
  // Same key as CenterRankings, so the running sprint's board is one cache entry.
  const board = useQuery({ queryKey: ['center-board', center.id, sid], enabled: !!sid,
    queryFn: async () => { const { data, error } = await supabase.rpc('tenant_student_board', { _institution: center.id, _sprint: sid! }); if (error) throw error; return data ?? []; } });
  const solved = useQuery({ queryKey: ['center-solved', center.id],
    queryFn: async () => {
      const { count, error } = await supabase.from('tenant_attempts').select('id', { count: 'exact', head: true }).eq('institution_id', center.id).eq('is_correct', true);
      if (error) throw error; return count ?? 0;
    } });
  const weekIds = useMemo(() => (data?.attempts ?? []).filter(a => new Date(a.created_at).getTime() >= Date.now() - 7 * 864e5).map(a => a.question_id), [data]);
  const topics = useQuestionTopics(weekIds);
  const view = useMemo(() => data && centerDashboard(data, sid ? board.data ?? null : null, topics.data, solved.data ?? 0), [data, sid, board.data, topics.data, solved.data]);
  if (isLoading || !view) return <Loading />;
  return (
    <DashboardView title="Dashboard" {...view} isLoading={solved.isLoading}
      links={{ sprints: '/admin/sprints', classes: '/admin/batches', classTo: () => '/admin/batches', atRisk: '/admin/students', studentTo: (id) => `/admin/students/${id}` }} />
  );
}

export function AnalyticsPage() {
  const { data, isLoading } = useCenterAdminData();
  const topics = useQuestionTopics(data?.attempts.map(a => a.question_id) ?? []);
  const view = useMemo(() => {
    if (!data) return null;
    const days: { date: string; answered: number; correct: number }[] = [];
    for (let i = 13; i >= 0; i--) days.push({ date: localDate(new Date(Date.now() - i * 864e5)), answered: 0, correct: 0 });
    const byDay = new Map(days.map(d => [d.date, d]));
    data.attempts.forEach(a => { const d = byDay.get(localDate(new Date(a.created_at))); if (d) { d.answered++; if (a.is_correct) d.correct++; } });
    const topicMap = new Map<string, { n: number; c: number; subject: string }>();
    data.attempts.forEach(a => {
      const t = topics.data?.get(a.question_id); if (!t) return;
      const e = topicMap.get(t.topic) ?? { n: 0, c: 0, subject: t.subject }; e.n++; if (a.is_correct) e.c++; topicMap.set(t.topic, e);
    });
    const weak = [...topicMap.entries()].filter(([, v]) => v.n >= 3).map(([k, v]) => ({ topic: k, ...v, acc: v.c / v.n })).sort((a, b) => a.acc - b.acc).slice(0, 8);
    const byClass = data.classes.map(c => {
      const rows = data.attendance.filter(a => a.class_id === c.id);
      return { name: c.name, rate: rows.length ? rows.filter(r => ATTENDED.has(r.status)).length / rows.length : null, sessions: new Set(rows.map(r => r.session_date)).size };
    });
    const subjects = ['math', 'english'].map(s => {
      const rows = data.attempts.filter(a => (topics.data?.get(a.question_id)?.subject ?? 'math').startsWith(s));
      return { s, n: rows.length, c: rows.filter(r => r.is_correct).length };
    });
    return { days, weak, byClass, subjects };
  }, [data, topics.data]);
  if (isLoading || !data || !view) return <Loading />;
  const maxDay = Math.max(1, ...view.days.map(d => d.answered));
  return (
    <div className="space-y-10">
      <PageHeader title="Analytics" description="Last 30 days of practice and attendance." />
      <StatRow stats={[
        ['Questions answered', data.attempts.length],
        ['Accuracy', pct(data.attempts.filter(a => a.is_correct).length, data.attempts.length)],
        ...view.subjects.map(x => [`${x.s === 'math' ? 'Math' : 'English'} accuracy`, pct(x.c, x.n), `${x.n} answered`] as [string, string, string]),
      ]} />
      <Section title="Questions per day (14 days)">
        <div className="flex items-end gap-1 h-36" role="img" aria-label="Questions answered per day">
          {view.days.map(d => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.date}: ${d.answered} answered, ${pct(d.correct, d.answered)} correct`}>
              <div className="w-full rounded-sm bg-foreground/60" style={{ height: `${(d.answered / maxDay) * 100}%`, minHeight: d.answered ? 2 : 0 }} />
              <span className="text-[10px] text-muted-foreground font-mono">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </Section>
      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Weak topics">
          {view.weak.length ? <ul className="space-y-3">{view.weak.map(w => (
            <li key={w.topic} className="space-y-1"><div className="flex justify-between text-sm"><span className="truncate">{w.topic}</span><span className="font-mono text-xs text-muted-foreground">{Math.round(w.acc * 100)}% · {w.n}</span></div><Bar value={w.c} max={w.n} /></li>
          ))}</ul> : <Empty>Not enough practice yet to find weak topics.</Empty>}
        </Section>
        <Section title="Attendance by batch">
          {view.byClass.length ? <ul className="space-y-3">{view.byClass.map(c => (
            <li key={c.name} className="space-y-1"><div className="flex justify-between text-sm"><span>{c.name}</span><span className="font-mono text-xs text-muted-foreground">{c.rate === null ? '—' : `${Math.round(c.rate * 100)}%`} · {c.sessions} sessions</span></div><Bar value={c.rate ?? 0} max={1} /></li>
          ))}</ul> : <Empty>No batches yet.</Empty>}
        </Section>
      </div>
    </div>
  );
}
