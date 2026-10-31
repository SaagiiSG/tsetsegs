import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleStop, Clock, Pause, Play, Plus, Repeat, Trash2, Trophy, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TIER_DISPLAY_NAMES } from '@/data/badgeDefinitions';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { TeacherQuestionSearchTab } from '@/components/teacher/practice/search/TeacherQuestionSearchTab';
import { useCenter } from '../centerContext';
import { allPages, localDate } from '../centerApi';
import { useCenterAdminData } from './useCenterAdminData';
import { Empty, Loading, PageHeader, Section } from './ui';
import { addDays, seasonSlots, tierBoards, type Slot } from './centerSprints';

export function QuestionsPage() {
  return (
    <div>
      <PageHeader title="Search Questions" description="Search the shared question bank your students practice from. Read-only." />
      <TeacherQuestionSearchTab />
    </div>
  );
}

export type CenterSprintRow = Tables<'tenant_sprints'> & { season_number?: number | null; sprint_number?: number | null; auto_next?: boolean };

export function useCenterSprints() {
  const { center } = useCenter();
  return useQuery({
    queryKey: ['center-sprints', center.id],
    queryFn: async (): Promise<CenterSprintRow[]> => {
      // 0105: this call also finishes ended sprints and starts the next one in the cycle. Until it is live, read the table.
      const r = await supabase.rpc('tenant_sprints_current' as any, { _institution: center.id });
      if (!r.error) return (r.data ?? []) as unknown as CenterSprintRow[];
      return (await supabase.from('tenant_sprints').select('*').eq('institution_id', center.id).order('starts_on', { ascending: false }).limit(50)).data ?? [];
    },
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

function useSprintBoard(sprintId: string | null | undefined) {
  const { center } = useCenter();
  // Same key as CenterRankings, so the two share one cache entry.
  return useQuery({
    queryKey: ['center-board', center.id, sprintId], enabled: !!sprintId,
    queryFn: async () => { const { data, error } = await supabase.rpc('tenant_student_board', { _institution: center.id, _sprint: sprintId! }); if (error) throw error; return data ?? []; },
  });
}

function useCountdown(endsOn: string | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!endsOn) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsOn]);
  if (!endsOn) return null;
  const ms = Math.max(0, new Date(`${addDays(endsOn, 1)}T00:00`).getTime() - now);
  return `${Math.floor(ms / 864e5)}d ${Math.floor(ms / 36e5) % 24}h ${Math.floor(ms / 6e4) % 60}m ${Math.floor(ms / 1e3) % 60}s`;
}

const shortDay = (d: string) => new Date(`${d}T00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' });
const dateRange = (a: string, b: string) => `${shortDay(a)} – ${shortDay(b)}`;
const SLOT_LABEL = { done: 'Done', now: 'Active', paused: 'Paused', planned: 'Planned', off: 'Not planned' } as const;

function StartSprintsDialog({ season, onStarted }: { season: number; onStarted: () => void }) {
  const { center } = useCenter();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const today = localDate();
  const plan = [0, 1, 2].map(i => ({ n: i + 1, starts_on: addDays(today, i * days), ends_on: addDays(today, (i + 1) * days - 1) }));
  const start = async () => {
    setBusy(true);
    const { error } = await supabase.from('tenant_sprints').insert({
      institution_id: center.id, name: `Season ${season} · Sprint 1`, starts_on: today, ends_on: plan[0].ends_on,
      status: 'active', season_number: season, sprint_number: 1, auto_next: true,
    } as never);
    setBusy(false);
    if (error) return toast.error(/season_number|auto_next|column/.test(error.message) ? 'Sprints that run on their own need the 0105 database update first.' : error.message);
    toast.success(`Season ${season} started`); setOpen(false); onStarted();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />Start sprints</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start Season {season}</DialogTitle>
          <DialogDescription>Sprint 1 starts today. When a sprint ends, the next one starts the next day with the same length, in seasons of 3. You can pause or stop at any time.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Sprint length</Label><span className="font-mono text-sm">{days} days</span></div>
          <Slider aria-label="Sprint length in days" min={7} max={28} step={1} value={[days]} onValueChange={([v]) => setDays(v)} />
          <div className="flex justify-between text-xs text-muted-foreground"><span>7 days</span><span>28 days</span></div>
        </div>
        <ul className="divide-y rounded-lg border text-sm">{plan.map(p => (
          <li key={p.n} className="flex justify-between px-3 py-2"><span>Sprint {p.n}</span><span className="font-mono text-xs text-muted-foreground">{dateRange(p.starts_on, p.ends_on)}</span></li>
        ))}</ul>
        <DialogFooter><Button onClick={start} disabled={busy}>{busy ? 'Starting…' : `Start Season ${season}`}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MOVE_STYLE = { up: 'bg-status-healthy/5', stay: '', down: 'bg-status-risk/5' } as const;
const MOVE_LABEL = { up: 'Moves up', stay: 'Stays', down: 'Moves down' } as const;

/** Same sections as the main Sprint Monitor: active sprint, season progress, seasons, and the board by tier. */
export function SprintsPage() {
  const { center } = useCenter();
  const qc = useQueryClient();
  const sprints = useCenterSprints();
  const list = sprints.data ?? [];
  const running = list.find(s => s.status === 'active' || s.status === 'paused') ?? null;
  const seasons = [...new Set(list.map(s => s.season_number).filter((n): n is number => !!n))].sort((a, b) => b - a);
  const hasSingles = list.some(s => !s.season_number);
  const [pick, setPick] = useState<string | null>(null);
  const [boardFor, setBoardFor] = useState<string | null>(null);
  const current = pick ?? (running?.season_number ? `season:${running.season_number}` : seasons.length ? `season:${seasons[0]}` : hasSingles ? 'single' : null);
  const shown = current === 'single' ? list.filter(s => !s.season_number) : list.filter(s => `season:${s.season_number}` === current);
  const boardId = (boardFor && list.some(s => s.id === boardFor) ? boardFor : null) ?? (running && shown.includes(running) ? running.id : shown[0]?.id) ?? null;
  const live = useSprintBoard(running?.id);
  const board = useSprintBoard(boardId);
  const countdown = useCountdown(running?.status === 'active' ? running.ends_on : undefined);
  const refresh = () => qc.invalidateQueries({ queryKey: ['center-sprints', center.id] });
  const patch = async (id: string, change: Record<string, unknown>, msg: string) => {
    const { error } = await supabase.from('tenant_sprints').update(change as never).eq('id', id);
    if (error) toast.error(error.message); else { toast.success(msg); refresh(); }
  };
  if (sprints.isLoading) return <Loading />;
  const taking = (live.data ?? []).filter(r => r.points > 0).length, eligible = live.data?.length ?? 0;
  const progressSeason = running?.season_number ?? seasons[0];
  const slots = progressSeason ? seasonSlots(list.filter(s => s.season_number === progressSeason)) : [];
  const viewed = list.find(s => s.id === boardId);
  const tiers = tierBoards(board.data ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Sprint Monitor" description="10 points for each correct first try. Sprints run back to back in seasons of 3."
        actions={!running && <StartSprintsDialog season={(seasons[0] ?? 0) + 1} onStarted={refresh} />} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="admin-glass-card">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" />Active sprint</CardTitle></CardHeader>
          <CardContent>
            {running ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xl font-semibold font-chillax">{running.name}</p><p className="text-sm text-muted-foreground">{dateRange(running.starts_on, running.ends_on)}</p></div>
                  <Badge variant={running.status === 'active' ? 'default' : 'secondary'}>{running.status === 'active' ? 'Active' : 'Paused'}</Badge>
                </div>
                {countdown && <p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Ends in</span><span className="font-mono">{countdown}</span></p>}
                <div className="space-y-1.5">
                  <p className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Taking part (1+ point)</span><span className="font-mono">{taking}</span><span className="text-muted-foreground">/ {eligible}</span>
                    <Badge variant="outline" className="ml-auto font-mono text-xs">{eligible ? Math.round((100 * taking) / eligible) : 0}%</Badge></p>
                  <Progress value={eligible ? (100 * taking) / eligible : 0} className="h-1.5" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {running.status === 'active'
                    ? <Button size="sm" variant="outline" onClick={() => patch(running.id, { status: 'paused' }, 'Sprint paused')}><Pause className="h-4 w-4" />Pause</Button>
                    : <Button size="sm" variant="outline" onClick={() => patch(running.id, { status: 'active' }, 'Sprint resumed')}><Play className="h-4 w-4" />Resume</Button>}
                  {running.season_number
                    ? running.auto_next
                      ? <Button size="sm" variant="ghost" onClick={() => patch(running.id, { auto_next: false }, 'The cycle stops after this sprint')}><CircleStop className="h-4 w-4" />Stop after this sprint</Button>
                      : <Button size="sm" variant="ghost" onClick={() => patch(running.id, { auto_next: true }, 'Sprints will keep going')}><Repeat className="h-4 w-4" />Keep the cycle going</Button>
                    : <Button size="sm" variant="ghost" onClick={() => patch(running.id, { status: 'finished' }, 'Sprint finished')}><CircleStop className="h-4 w-4" />Finish now</Button>}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2 text-sm text-muted-foreground">
                <Trophy className="h-10 w-10 mx-auto opacity-40" />
                <p>No sprint running</p>
                <p>Start sprints once. After that, each sprint starts on its own.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="admin-glass-card">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4" />Season progress</CardTitle></CardHeader>
          <CardContent>
            {progressSeason ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between"><p className="text-xl font-semibold font-chillax">Season {progressSeason}</p>
                  <span className="text-xs text-muted-foreground font-mono">{slots.filter(s => s.state === 'done').length}/{slots.length} done</span></div>
                <Progress value={(100 * slots.filter(s => s.state === 'done').length) / slots.length} className="h-1.5" />
                <ul className="divide-y text-sm">{slots.map(s => (
                  <li key={s.n} className="flex items-center gap-3 py-2">
                    <span className="w-16">Sprint {s.n}</span>
                    <span className="flex-1 font-mono text-xs text-muted-foreground">{s.starts_on && s.ends_on ? dateRange(s.starts_on, s.ends_on) : '—'}</span>
                    <Badge variant={s.state === 'now' ? 'default' : 'outline'} className="text-xs">{SLOT_LABEL[s.state]}</Badge>
                  </li>
                ))}</ul>
              </div>
            ) : <p className="text-center py-6 text-sm text-muted-foreground">No season yet</p>}
          </CardContent>
        </Card>
      </div>

      {current && <>
        <div className="flex flex-wrap items-center gap-3">
          <Label>Show</Label>
          <Select value={current} onValueChange={v => { setPick(v); setBoardFor(null); }}>
            <SelectTrigger className="w-44" aria-label="Season"><SelectValue /></SelectTrigger>
            <SelectContent>
              {seasons.map(n => <SelectItem key={n} value={`season:${n}`}>Season {n}</SelectItem>)}
              {hasSingles && <SelectItem value="single">Single sprints</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(current === 'single' ? shown.map(s => ({ n: 0, state: s.status === 'finished' ? 'done' : s.status === 'paused' ? 'paused' : 'now', starts_on: s.starts_on, ends_on: s.ends_on, sprint: s } as Slot))
            : seasonSlots(shown)).map(slot => (
            <button key={slot.sprint?.id ?? slot.n} type="button" disabled={!slot.sprint} onClick={() => slot.sprint && setBoardFor(slot.sprint.id)}
              className={`admin-glass-card rounded-xl border p-4 text-left space-y-1 disabled:opacity-50 ${slot.sprint && slot.sprint.id === boardId ? 'ring-2 ring-foreground/60' : ''}`}>
              <div className="flex items-center justify-between gap-2"><span className="font-medium truncate">{slot.sprint?.name ?? `Sprint ${slot.n}`}</span><Badge variant={slot.state === 'now' ? 'default' : 'outline'} className="text-xs shrink-0">{SLOT_LABEL[slot.state]}</Badge></div>
              <p className="font-mono text-xs text-muted-foreground">{slot.starts_on && slot.ends_on ? dateRange(slot.starts_on, slot.ends_on) : 'Not planned'}</p>
            </button>
          ))}
        </div>
      </>}

      {viewed && (
        <Card className="admin-glass-card">
          <CardHeader>
            <CardTitle className="text-base">Tier breakdown · {viewed.name}</CardTitle>
            <CardDescription>{viewed.status === 'finished' ? 'Final places in each tier.' : 'When the sprint ends, green rows move up a tier and red rows move down.'}</CardDescription>
          </CardHeader>
          <CardContent>
            {board.isLoading ? <Loading /> : !tiers.length ? <Empty>No students yet.</Empty> : (
              <Tabs key={viewed.id} defaultValue={tiers[0].tier}>
                <TabsList className="flex-wrap h-auto">{tiers.map(t => <TabsTrigger key={t.tier} value={t.tier}>{TIER_DISPLAY_NAMES[t.tier]} <span className="ml-1.5 font-mono text-xs text-muted-foreground">{t.rows.length}</span></TabsTrigger>)}</TabsList>
                {tiers.map(t => (
                  <TabsContent key={t.tier} value={t.tier}>
                    <Table>
                      <TableHeader><TableRow><TableHead className="w-14">Place</TableHead><TableHead>Student</TableHead><TableHead className="text-right">Points</TableHead><TableHead className="text-right">{viewed.status === 'finished' ? '' : 'Next'}</TableHead></TableRow></TableHeader>
                      <TableBody>{t.rows.map(r => (
                        <TableRow key={r.student_id} className={viewed.status === 'finished' ? '' : MOVE_STYLE[r.move]}>
                          <TableCell className="font-mono">{r.place}</TableCell>
                          <TableCell><span className="font-medium">{r.name}</span>{r.class_name && <span className="ml-2 text-xs text-muted-foreground">{r.class_name}</span>}</TableCell>
                          <TableCell className="text-right font-mono">{r.points}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{viewed.status === 'finished' ? '' : MOVE_LABEL[r.move]}</TableCell>
                        </TableRow>
                      ))}</TableBody>
                    </Table>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
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
        allPages(p => supabase.from('tenant_announcement_reads').select('announcement_id').eq('institution_id', center.id)
          .order('announcement_id').order('student_id').range(p, p + 999), 20000),
      ]);
      const reads = new Map<string, number>();
      r.forEach(x => reads.set(x.announcement_id, (reads.get(x.announcement_id) ?? 0) + 1));
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
