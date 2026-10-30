import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarDays, Copy, Filter, LayoutGrid, List, MoreHorizontal, Pencil, Plus, QrCode, Trash2, Users } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LiquidGlassFX } from '@/components/admin/LiquidGlassFX';
import { liquidTrack, liquidRest } from '@/hooks/useLiquidHighlight';
import { ScheduleTemplatesDialog, type ScheduleTemplate } from '@/components/admin/batches/ScheduleTemplatesDialog';
import { formatScheduleDisplay } from '@/components/admin/ScheduleBuilder';
import { toast } from 'sonner';
import { useCenter } from '../centerContext';
import { allPages, localDate } from '../centerApi';
import { useCenterAdminData, useRefreshCenter, type CenterAdminData } from './useCenterAdminData';
import { batchStats, intakeMonth, intakeTrend, joinUrl, type BatchStats } from './centerIntake';
import { IntakeWizard, centerScheduleStore } from './IntakeWizard';
import { Empty, Loading, PageHeader } from './ui';

type Cls = CenterAdminData['classes'][number];
type Mark = { student_id: string; class_id: string; session_date: string; status: string };

const VIEW_KEY = 'center:intake:view';
const readView = () => { try { return localStorage.getItem(VIEW_KEY) === 'rows' ? 'rows' : 'cards'; } catch { return 'cards'; } };
const monthLabel = (key: string) => new Date(`${key}-01T00:00`).toLocaleString('en', { month: 'long', year: 'numeric' });
const shortDate = (d: string) => new Date(`${d}T00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' });

/** Homework marks from the last 30 days; null while the center homework table (0103) isn't live. */
function useCenterHomework() {
  const { center } = useCenter();
  return useQuery({
    queryKey: ['center-homework', center.id],
    queryFn: async (): Promise<Mark[] | null> => {
      const since = localDate(new Date(Date.now() - 30 * 864e5));
      try {
        return await allPages(p => supabase.from('tenant_homework' as any).select('student_id, class_id, session_date, status')
          .eq('institution_id', center.id).gte('session_date', since).order('id').range(p, p + 999) as unknown as PromiseLike<{ data: Mark[] | null; error: unknown }>, 20000);
      } catch { return null; }
    },
  });
}

function JoinLinkDialog({ cls, onClose }: { cls: Cls; onClose: () => void }) {
  const url = joinUrl(cls.join_code);
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Sign-up link · {cls.name}</DialogTitle><DialogDescription>Students who use this link are enrolled in this class right away.</DialogDescription></DialogHeader>
        <div className="mx-auto rounded-md border bg-white p-2"><QRCode value={url} size={224} level="H" title={`QR code for ${cls.name} sign-up`} /></div>
        <p className="font-mono text-xs break-all rounded-md border p-2">{url}</p>
        <Button onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copied'); }}><Copy className="h-4 w-4" />Copy link</Button>
      </DialogContent>
    </Dialog>
  );
}

type Actions = { onEdit: () => void; onLink: () => void; onDelete: () => void };

function BatchMenu({ cls, onEdit, onLink, onDelete }: Actions & { cls: Cls }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Actions for ${cls.name}`}><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4" />Edit batch</DropdownMenuItem>
        <DropdownMenuItem onClick={onLink}><QrCode className="h-4 w-4" />Sign-up link</DropdownMenuItem>
        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(joinUrl(cls.join_code)); toast.success('Link copied'); }}><Copy className="h-4 w-4" />Copy link</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />Delete batch</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const pctText = (n: number | null) => (n === null ? '—' : `${n}%`);

function BatchCard({ cls, teacher, stats, ...actions }: Actions & { cls: Cls; teacher: string; stats: BatchStats }) {
  return (
    <div role="button" tabIndex={0} onClick={actions.onEdit} onKeyDown={e => e.key === 'Enter' && actions.onEdit()}
      onPointerMove={liquidTrack} onPointerLeave={liquidRest}
      className="admin-glass-card admin-glass-card-glow admin-glass-liquid rounded-xl border p-4 space-y-3 cursor-pointer text-left">
      <LiquidGlassFX />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-chillax font-semibold truncate">{cls.name}</p>
          <p className="text-xs text-foreground/65 mt-0.5 truncate">{cls.schedule || 'No schedule yet'}</p>
        </div>
        <BatchMenu cls={cls} {...actions} />
      </div>
      <p className="text-sm">{teacher}</p>
      {stats.attendanceRate !== null && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs"><span className="text-foreground/65">Attendance, 30 days</span><span className="font-mono">{stats.attendanceRate}%</span></div>
          <Progress value={stats.attendanceRate} className="h-1.5" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 border-t text-xs text-foreground/70">
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{stats.students} students</span>
        <span>Homework <span className="font-mono">{pctText(stats.homeworkRate)}</span></span>
        <span>Today <span className="font-mono">{stats.markedToday}/{stats.students}</span></span>
        {stats.atRisk > 0 && <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3.5 w-3.5" />{stats.atRisk} at risk</span>}
        {cls.starts_on && <span className="ml-auto">Starts {shortDate(cls.starts_on)}</span>}
      </div>
    </div>
  );
}

function BatchRow({ cls, teacher, stats, ...actions }: Actions & { cls: Cls; teacher: string; stats: BatchStats }) {
  return (
    <div role="button" tabIndex={0} onClick={actions.onEdit} onKeyDown={e => e.key === 'Enter' && actions.onEdit()}
      className="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer min-w-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{cls.name}</p>
        <p className="text-xs text-muted-foreground truncate">{teacher} · {cls.schedule || 'No schedule yet'}</p>
      </div>
      <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">{cls.starts_on ? shortDate(cls.starts_on) : '—'}</span>
      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1"><Users className="h-3.5 w-3.5" />{stats.students}</span>
      <span className="hidden md:inline text-xs text-muted-foreground shrink-0 w-28 text-right">Attendance <span className="font-mono">{pctText(stats.attendanceRate)}</span></span>
      <span className="hidden md:inline text-xs text-muted-foreground shrink-0 w-28 text-right">Homework <span className="font-mono">{pctText(stats.homeworkRate)}</span></span>
      <span className={`text-xs shrink-0 w-16 text-right ${stats.atRisk ? 'text-destructive' : 'text-muted-foreground'}`}>{stats.atRisk ? `${stats.atRisk} at risk` : ''}</span>
      <BatchMenu cls={cls} {...actions} />
    </div>
  );
}

/** Edit a batch and see who's in it. */
function BatchDetailsDialog({ cls, data, homework, onClose, onLink, onDelete }: {
  cls: Cls; data: CenterAdminData; homework: Mark[] | null; onClose: () => void; onLink: () => void; onDelete: () => void;
}) {
  const { center } = useCenter();
  const refresh = useRefreshCenter();
  const store = useMemo(() => centerScheduleStore(center.id), [center.id]);
  const [form, setForm] = useState({ name: cls.name, teacher: cls.teacher_member_id ?? 'none', starts_on: cls.starts_on ?? '', schedule: cls.schedule });
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [newSchedule, setNewSchedule] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { store.list().then(setTemplates); }, [store]);
  const roster = data.students.filter(s => s.class_id === cls.id && s.active).map(s => ({
    s,
    absent: data.attendance.filter(a => a.class_id === cls.id && a.student_id === s.id && a.status === 'absent').length,
    missed: (homework ?? []).filter(h => h.class_id === cls.id && h.student_id === s.id && h.status === 'incomplete').length,
  }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from('tenant_classes').update({
      name: form.name.trim(), schedule: form.schedule.trim(), starts_on: form.starts_on || null, teacher_member_id: form.teacher === 'none' ? null : form.teacher,
    }).eq('id', cls.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Batch saved'); refresh(); onClose();
  };
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{cls.name}</DialogTitle><DialogDescription>{roster.length} students</DialogDescription></DialogHeader>
        <div className="grid gap-8 md:grid-cols-2">
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="bd-name">Batch name</Label><Input id="bd-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength={80} /></div>
            <div className="space-y-1.5"><Label>Teacher</Label>
              <Select value={form.teacher} onValueChange={v => setForm({ ...form, teacher: v })}><SelectTrigger aria-label="Teacher"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Unassigned</SelectItem>{data.members.filter(m => m.active).map(t => <SelectItem key={t.id} value={t.id}>{t.display_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="bd-start">Start date</Label><Input id="bd-start" type="date" value={form.starts_on} onChange={e => setForm({ ...form, starts_on: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="bd-sch">Schedule</Label><Input id="bd-sch" value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} placeholder="Mon/Wed 5–7pm" />
              <div className="flex flex-wrap gap-2 pt-1">
                {templates.length > 0 && <Select value="" onValueChange={id => { const t = templates.find(x => x.id === id); if (t) setForm({ ...form, schedule: formatScheduleDisplay(t.schedule_data) }); }}>
                  <SelectTrigger className="h-8 w-auto text-xs" aria-label="Use a saved schedule"><SelectValue placeholder="Use a saved schedule" /></SelectTrigger>
                  <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>}
                <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setNewSchedule(true)}><Plus className="h-3.5 w-3.5" />New schedule</Button>
              </div></div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
              <Button type="button" variant="outline" onClick={onLink}><QrCode className="h-4 w-4" />Sign-up link</Button>
              <Button type="button" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete</Button>
            </div>
          </form>
          <div className="space-y-2 min-w-0">
            <p className="text-sm font-medium">Students</p>
            {roster.length ? <ul className="divide-y rounded-lg border text-sm">{roster.map(({ s, absent, missed }) => (
              <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                <Link to={`/admin/students/${s.id}`} className="flex-1 min-w-0 truncate hover:underline">{s.name}</Link>
                <span className="text-xs text-muted-foreground font-mono shrink-0" title="Absences and missed homework, last 30 days">{absent} abs · {missed} hw</span>
                {(absent >= 3 || missed >= 3) && <span className="text-xs rounded px-1.5 py-0.5 bg-status-risk/10 text-status-risk shrink-0">At risk</span>}
              </li>
            ))}</ul> : <Empty>No students yet. Share the sign-up link.</Empty>}
          </div>
        </div>
        <ScheduleTemplatesDialog open={newSchedule} onOpenChange={setNewSchedule} startInCreate store={store}
          onSaved={t => { store.list().then(setTemplates); setForm(f => ({ ...f, schedule: formatScheduleDisplay(t.schedule_data) })); setNewSchedule(false); }} />
      </DialogContent>
    </Dialog>
  );
}

/** One page for every batch: intake trend, cards or rows by month, the New batch wizard and saved schedules. */
export function IntakePage() {
  const { center } = useCenter();
  const { data, isLoading } = useCenterAdminData();
  const homework = useCenterHomework();
  const refresh = useRefreshCenter();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const store = useMemo(() => centerScheduleStore(center.id), [center.id]);
  const [view, setView] = useState<'cards' | 'rows'>(readView);
  const [month, setMonth] = useState('all');
  const [teacher, setTeacher] = useState('all');
  const [schedulesOpen, setSchedulesOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [linkFor, setLinkFor] = useState<Cls | null>(null);
  const [deleting, setDeleting] = useState<Cls | null>(null);
  const today = localDate();

  const trend = useMemo(() => (data ? intakeTrend(data.classes, data.students) : []), [data]);
  if (isLoading || !data) return <Loading />;

  const teacherName = (id: string | null) => data.members.find(m => m.id === id)?.display_name ?? 'Unassigned';
  const months = [...new Set(data.classes.map(intakeMonth))].sort().reverse();
  const shown = data.classes.filter(c => (month === 'all' || intakeMonth(c) === month) && (teacher === 'all' || (c.teacher_member_id ?? 'none') === teacher));
  const groups = months.map(m => ({ m, classes: shown.filter(c => intakeMonth(c) === m) })).filter(g => g.classes.length);
  const filters = [month, teacher].filter(v => v !== 'all').length;
  const changeView = (v: string) => { if (v !== 'cards' && v !== 'rows') return; setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage unavailable */ } };
  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('tenant_classes').delete().eq('id', deleting.id);
    if (error) toast.error(error.message); else { toast.success('Batch deleted'); setEditId(null); refresh(); }
    setDeleting(null);
  };
  const editing = data.classes.find(c => c.id === editId);
  const activeStudents = data.students.filter(s => s.active).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Intake" description={`${data.classes.length} batch${data.classes.length === 1 ? '' : 'es'} · ${activeStudents} students`} actions={<>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5" />Filter{filters > 0 && <span className="font-mono text-xs rounded-full bg-muted px-1.5">{filters}</span>}</Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-60 space-y-3">
            {[
              { label: 'Intake', value: month, set: setMonth, opts: [['all', 'All intakes'], ...months.map(m => [m, monthLabel(m)])] },
              { label: 'Teacher', value: teacher, set: setTeacher, opts: [['all', 'All teachers'], ['none', 'Unassigned'], ...data.members.map(m => [m.id, m.display_name])] },
            ].map(f => (
              <div key={f.label} className="space-y-1">
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <Select value={f.value} onValueChange={f.set}>
                  <SelectTrigger className="h-8 text-xs" aria-label={f.label}><SelectValue /></SelectTrigger>
                  <SelectContent>{f.opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            {filters > 0 && <Button variant="ghost" size="sm" className="w-full" onClick={() => { setMonth('all'); setTeacher('all'); }}>Clear filters</Button>}
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="sm" onClick={() => setSchedulesOpen(true)}><CalendarDays className="h-3.5 w-3.5" />Schedules</Button>
        <Button size="sm" onClick={() => navigate('/admin/batches/new')}><Plus className="h-3.5 w-3.5" />New batch</Button>
      </>} />

      <Card className="admin-glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Intake trend</CardTitle>
          <CardDescription>Batches and students starting each month, last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ students: { label: 'Students', color: 'hsl(var(--foreground))' }, batches: { label: 'Batches', color: 'hsl(var(--muted-foreground))' } }} className="h-48 w-full">
            <LineChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={32} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="students" stroke="var(--color-students)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="batches" stroke="var(--color-batches)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Showing {shown.length} of {data.classes.length}</p>
        <ToggleGroup type="single" size="sm" variant="outline" value={view} onValueChange={changeView} aria-label="Show batches as">
          <ToggleGroupItem value="cards" aria-label="Cards" className="gap-1.5"><LayoutGrid className="h-4 w-4" />Cards</ToggleGroupItem>
          <ToggleGroupItem value="rows" aria-label="Rows" className="gap-1.5"><List className="h-4 w-4" />Rows</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {groups.length === 0 ? (
        <Empty>{data.classes.length ? 'No batches match your filters.' : <>No batches yet. <Link className="underline" to="/admin/batches/new">Create your first batch</Link>.</>}</Empty>
      ) : groups.map(g => (
        <section key={g.m} className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{monthLabel(g.m)}</h2>
          <div className={view === 'cards' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'divide-y rounded-lg border overflow-hidden'}>
            {g.classes.map(c => {
              const props = {
                cls: c, teacher: teacherName(c.teacher_member_id), stats: batchStats(c.id, data, homework.data ?? null, today),
                onEdit: () => setEditId(c.id), onLink: () => setLinkFor(c), onDelete: () => setDeleting(c),
              };
              return view === 'cards' ? <BatchCard key={c.id} {...props} /> : <BatchRow key={c.id} {...props} />;
            })}
          </div>
        </section>
      ))}

      <IntakeWizard open={pathname.endsWith('/batches/new')} onOpenChange={o => !o && navigate('/admin/batches')} data={data} />
      <ScheduleTemplatesDialog open={schedulesOpen} onOpenChange={setSchedulesOpen} store={store} />
      {editing && <BatchDetailsDialog key={editing.id} cls={editing} data={data} homework={homework.data ?? null} onClose={() => setEditId(null)} onLink={() => setLinkFor(editing)} onDelete={() => setDeleting(editing)} />}
      {linkFor && <JoinLinkDialog cls={linkFor} onClose={() => setLinkFor(null)} />}
      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Students stay, but are unassigned. The batch's attendance and homework marks are deleted. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete batch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
