import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pause, Play, Plus, Square, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { TeacherQuestionSearchTab } from '@/components/teacher/practice/search/TeacherQuestionSearchTab';
import { useCenter } from '../centerContext';
import { localDate } from '../centerApi';
import { useCenterAdminData } from './useCenterAdminData';
import { Empty, Loading, PageHeader, Section } from './ui';

export function QuestionsPage() {
  return (
    <div>
      <PageHeader title="Search Questions" description="Search the shared question bank your students practice from. Read-only." />
      <TeacherQuestionSearchTab />
    </div>
  );
}

export function useCenterSprints() {
  const { center } = useCenter();
  return useQuery({
    queryKey: ['center-sprints', center.id],
    queryFn: async () => (await supabase.from('tenant_sprints').select('*').eq('institution_id', center.id).order('starts_on', { ascending: false }).limit(50)).data ?? [],
  });
}

export function SprintLeaderboard({ sprintId, highlight, limit = 200 }: { sprintId: string; highlight?: string; limit?: number }) {
  const board = useQuery({
    queryKey: ['center-sprint-board', sprintId],
    queryFn: async () => { const { data, error } = await supabase.rpc('tenant_sprint_leaderboard', { _sprint: sprintId }); if (error) throw error; return data ?? []; },
  });
  if (board.isLoading) return <Loading />;
  const rows = (board.data ?? []).slice(0, limit);
  if (!rows.length) return <Empty>No students yet.</Empty>;
  return (
    <ol className="divide-y text-sm">{rows.map((r, i) => (
      <li key={r.student_id} className={`py-2 flex items-center gap-3 ${r.student_id === highlight ? 'font-semibold' : ''}`}>
        <span className="w-6 font-mono text-xs text-muted-foreground">{i + 1}</span>
        <span className="flex-1 min-w-0 truncate">{r.name}{r.class_name && <span className="ml-2 text-xs text-muted-foreground font-normal">{r.class_name}</span>}</span>
        <span className="font-mono">{r.points}</span><span className="w-16 text-right text-xs text-muted-foreground font-mono">{r.answered} q</span>
      </li>
    ))}</ol>
  );
}

export function SprintsPage() {
  const { center } = useCenter();
  const qc = useQueryClient();
  const sprints = useCenterSprints();
  const today = localDate();
  const [form, setForm] = useState({ name: '', starts_on: today, ends_on: localDate(new Date(Date.now() + 6 * 864e5)) });
  const [selected, setSelected] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['center-sprints', center.id] });
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('tenant_sprints').insert({ institution_id: center.id, ...form, name: form.name.trim() });
    if (error) return toast.error(error.message.includes('check') ? 'End date must be after the start date.' : error.message);
    toast.success('Sprint started'); setForm({ ...form, name: '' }); refresh();
  };
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('tenant_sprints').update({ status }).eq('id', id);
    if (error) toast.error(error.message); else refresh();
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this sprint? Points come from practice, so nothing else is lost.')) return;
    await supabase.from('tenant_sprints').delete().eq('id', id); refresh();
  };
  const list = sprints.data ?? [];
  const current = selected ?? list.find(s => s.status === 'active')?.id ?? list[0]?.id ?? null;
  return (
    <div className="space-y-8">
      <PageHeader title="Sprint Monitor" description="Points competitions for your students only. 10 points per correct first try during the sprint dates." />
      <form onSubmit={create} className="flex flex-wrap gap-3 items-end rounded-lg border p-4">
        <div className="space-y-1"><Label htmlFor="sp-name">Sprint name</Label><Input id="sp-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Week 1" required maxLength={80} /></div>
        <div className="space-y-1"><Label htmlFor="sp-start">Starts</Label><Input id="sp-start" type="date" value={form.starts_on} onChange={e => setForm({ ...form, starts_on: e.target.value })} required /></div>
        <div className="space-y-1"><Label htmlFor="sp-end">Ends</Label><Input id="sp-end" type="date" value={form.ends_on} onChange={e => setForm({ ...form, ends_on: e.target.value })} required /></div>
        <Button><Plus className="h-4 w-4" />Start sprint</Button>
      </form>
      {sprints.isLoading ? <Loading /> : !list.length ? <Empty>No sprints yet. Start one above.</Empty> : (
        <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
          <ul className="space-y-1">{list.map(s => (
            <li key={s.id}><button onClick={() => setSelected(s.id)} className={`w-full text-left rounded-md px-3 py-2 text-sm ${current === s.id ? 'bg-muted' : 'hover:bg-muted/60'}`}>
              <span className="flex justify-between gap-2"><span className="font-medium truncate">{s.name}</span>
                <span className={`text-xs rounded px-1.5 py-0.5 ${s.status === 'active' ? 'bg-status-healthy/10 text-status-healthy' : s.status === 'paused' ? 'bg-status-watch/10 text-status-watch' : 'bg-muted text-muted-foreground'}`}>{s.status}</span></span>
              <span className="font-mono text-xs text-muted-foreground">{s.starts_on} → {s.ends_on}</span>
            </button></li>
          ))}</ul>
          {current && (() => { const s = list.find(x => x.id === current)!; return (
            <Section title={s.name} actions={<div className="flex gap-1">
              {s.status === 'active' && <Button size="sm" variant="outline" onClick={() => setStatus(s.id, 'paused')}><Pause className="h-4 w-4" />Pause</Button>}
              {s.status === 'paused' && <Button size="sm" variant="outline" onClick={() => setStatus(s.id, 'active')}><Play className="h-4 w-4" />Resume</Button>}
              {s.status !== 'finished' && <Button size="sm" variant="outline" onClick={() => setStatus(s.id, 'finished')}><Square className="h-4 w-4" />Finish</Button>}
              <Button size="sm" variant="ghost" aria-label="Delete sprint" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>}>
              <SprintLeaderboard sprintId={s.id} />
            </Section>
          ); })()}
        </div>
      )}
    </div>
  );
}

export function AnnouncementsPage() {
  const { center, userId } = useCenter();
  const { data } = useCenterAdminData();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', body: '', class_id: 'all' });
  const list = useQuery({
    queryKey: ['center-announcements', center.id],
    queryFn: async () => {
      const [a, r] = await Promise.all([
        supabase.from('tenant_announcements').select('*').eq('institution_id', center.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('tenant_announcement_reads').select('announcement_id').eq('institution_id', center.id).limit(20000),
      ]);
      const reads = new Map<string, number>();
      r.data?.forEach(x => reads.set(x.announcement_id, (reads.get(x.announcement_id) ?? 0) + 1));
      return (a.data ?? []).map(x => ({ ...x, reads: reads.get(x.id) ?? 0 }));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['center-announcements', center.id] });
  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('tenant_announcements').insert({ institution_id: center.id, title: form.title.trim(), body: form.body.trim(), class_id: form.class_id === 'all' ? null : form.class_id, created_by: userId });
    if (error) return toast.error(error.message);
    toast.success('Announcement posted'); setForm({ title: '', body: '', class_id: form.class_id }); refresh();
  };
  const remove = async (id: string) => { if (!confirm('Delete this announcement?')) return; await supabase.from('tenant_announcements').delete().eq('id', id); refresh(); };
  const audience = (id: string | null) => {
    const students = data?.students.filter(s => s.active && (!id || s.class_id === id)).length ?? 0;
    return { label: id ? data?.classes.find(c => c.id === id)?.name ?? 'Batch' : 'All students', students };
  };
  return (
    <div className="space-y-8">
      <PageHeader title="Announcements" description="Students see these on their portal home." />
      <form onSubmit={post} className="space-y-3 rounded-lg border p-4 max-w-2xl">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <div className="space-y-1"><Label htmlFor="an-title">Title</Label><Input id="an-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required maxLength={160} /></div>
          <div className="space-y-1"><Label>Send to</Label><Select value={form.class_id} onValueChange={v => setForm({ ...form, class_id: v })}><SelectTrigger aria-label="Audience"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All students</SelectItem>{data?.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="space-y-1"><Label htmlFor="an-body">Message</Label><Textarea id="an-body" rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} maxLength={4000} /></div>
        <Button>Post announcement</Button>
      </form>
      {list.isLoading ? <Loading /> : list.data?.length ? <ul className="divide-y max-w-2xl">{list.data.map(a => { const au = audience(a.class_id); return (
        <li key={a.id} className="py-4 space-y-1">
          <div className="flex justify-between gap-2"><p className="font-medium">{a.title}</p><Button variant="ghost" size="sm" aria-label="Delete announcement" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button></div>
          {a.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>}
          <p className="text-xs text-muted-foreground font-mono">{new Date(a.created_at).toLocaleString()} · {au.label} · read by {a.reads}/{au.students}</p>
        </li>); })}</ul> : <Empty>No announcements yet.</Empty>}
    </div>
  );
}
