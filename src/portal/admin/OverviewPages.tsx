import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FolderPlus, Megaphone, UserPlus, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STATUS_LABEL, STATUS_STYLE } from '../centerContext';
import { localDate } from '../centerApi';
import { useCenterAdminData, useQuestionTopics, pct, money } from './useCenterAdminData';
import { Bar, Empty, Loading, PageHeader, Section, StatRow } from './ui';

const ATTENDED = new Set(['present', 'late']);

export function DashboardPage() {
  const { data, isLoading } = useCenterAdminData();
  const today = localDate();
  const stats = useMemo(() => {
    if (!data) return null;
    const week = Date.now() - 7 * 864e5;
    const recent = data.attempts.filter(a => new Date(a.created_at).getTime() >= week);
    const att = data.attendance;
    return {
      students: data.students.filter(s => s.active).length,
      active: new Set(recent.map(a => a.student_id)).size,
      acc: pct(recent.filter(a => a.is_correct).length, recent.length),
      attendance: pct(att.filter(a => ATTENDED.has(a.status)).length, att.length),
    };
  }, [data]);
  if (isLoading || !data || !stats) return <Loading />;
  const open = data.dues.filter(d => !d.paid_at);
  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="How your center is doing this week." />
      <StatRow stats={[['Students', stats.students], ['Active this week', stats.active], ['Accuracy (7 days)', stats.acc], ['Attendance (30 days)', stats.attendance]]} />
      <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm"><Link to="/admin/students"><UserPlus className="h-4 w-4" />Add student</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/admin/batches/new"><FolderPlus className="h-4 w-4" />Create batch</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/admin/announcements"><Megaphone className="h-4 w-4" />Post announcement</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/admin/registrations"><Inbox className="h-4 w-4" />Registration queue{data.pendingRegistrations ? ` (${data.pendingRegistrations})` : ''}</Link></Button>
      </nav>
      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Batches">
          {data.classes.length ? <ul className="divide-y text-sm">{data.classes.map(c => (
            <li key={c.id} className="py-2.5 flex justify-between gap-2"><span>{c.name}</span><span className="text-muted-foreground font-mono text-xs">{data.students.filter(s => s.class_id === c.id && s.active).length} students</span></li>
          ))}</ul> : <Empty>No batches yet. <Link className="underline" to="/admin/batches/new">Create one</Link>.</Empty>}
        </Section>
        <Section title="Billing">
          {open.length ? <ul className="divide-y text-sm">{open.map(d => (
            <li key={d.id} className="py-2.5 flex justify-between gap-2"><span>{d.description || 'Payment'}</span>
              <span className="flex items-center gap-2"><span className="font-mono">{money(d.amount, d.currency)}</span><span className="font-mono text-xs text-muted-foreground">{d.due_date}</span>
                {d.due_date < today && <span className="text-xs rounded px-2 py-0.5 bg-status-risk/10 text-status-risk">Overdue</span>}</span></li>
          ))}</ul> : <Empty>No open payments.</Empty>}
        </Section>
      </div>
    </div>
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

export function ClassOverviewPage() {
  const { data, isLoading } = useCenterAdminData();
  const today = localDate();
  if (isLoading || !data) return <Loading />;
  const teacher = (id: string | null) => data.members.find(m => m.id === id)?.display_name ?? 'Unassigned';
  const missed = data.students.filter(s => s.active).map(s => {
    const rows = data.attendance.filter(a => a.student_id === s.id).sort((a, b) => b.session_date.localeCompare(a.session_date));
    return { s, absent: rows.filter(r => r.status === 'absent').length };
  }).filter(x => x.absent >= 3).sort((a, b) => b.absent - a.absent);
  return (
    <div className="space-y-10">
      <PageHeader title="Class Overview" description={`Today, ${today}`} />
      <Section title="Today's attendance">
        {data.classes.length ? <table className="w-full text-sm"><thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2">Batch</th><th className="text-left">Teacher</th><th className="text-left">Marked</th><th className="text-left">Status</th></tr></thead>
          <tbody className="divide-y">{data.classes.map(c => {
            const roster = data.students.filter(s => s.class_id === c.id && s.active);
            const rows = data.attendance.filter(a => a.class_id === c.id && a.session_date === today);
            const counts = Object.entries(rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {}));
            return <tr key={c.id}><td className="py-3">{c.name}<p className="text-xs text-muted-foreground">{c.schedule || 'No schedule'}</p></td><td className="text-muted-foreground">{teacher(c.teacher_member_id)}</td>
              <td className="font-mono text-xs">{rows.length}/{roster.length}</td>
              <td><span className="flex flex-wrap gap-1">{counts.length ? counts.map(([st, n]) => <span key={st} className={`text-xs rounded px-1.5 py-0.5 ${STATUS_STYLE[st]}`}>{STATUS_LABEL[st]} {n}</span>) : <span className="text-xs text-muted-foreground">Not taken</span>}</span></td></tr>;
          })}</tbody></table> : <Empty>No batches yet.</Empty>}
      </Section>
      <Section title="Students who missed 3+ classes (30 days)">
        {missed.length ? <ul className="divide-y text-sm">{missed.map(({ s, absent }) => (
          <li key={s.id} className="py-2.5 flex justify-between gap-2"><Link to={`/admin/students/${s.id}`} className="hover:underline">{s.name}</Link><span className="text-xs rounded px-2 py-0.5 bg-status-risk/10 text-status-risk">{absent} absent</span></li>
        ))}</ul> : <Empty>No one has missed 3 or more classes.</Empty>}
      </Section>
    </div>
  );
}
