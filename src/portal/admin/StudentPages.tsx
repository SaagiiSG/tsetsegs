import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Copy, KeyRound, Plus, PowerOff, RefreshCw, RotateCcw, Search, Upload, User, UserCheck, UserX, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { phoneDigits } from '@/lib/tenant';
import { STATUS_LABEL, STATUS_STYLE, useCenter } from '../centerContext';
import { centerAccounts } from '../centerApi';
import { useCenterAdminData, useRefreshCenter, pct, type CenterAdminData } from './useCenterAdminData';
import { googleStatus, hasGoogleColumns, signsInWithGoogle, hasEither, formatDue, type GoogleFields } from './studentGoogle';
import { checkStudentRows, failedRowsText, type ImportRow } from './studentImport';
import { Empty, Loading, PageHeader, Section, StatRow } from './ui';
import { PredictionVsReal } from '@/components/shared/PredictionVsReal';
import { compareToReal, type PredictionPoint } from '@/lib/predictionAccuracy';

type RealSatStudent = { id: string; real_sat_math: number | null; real_sat_total: number | null; real_sat_date: string | null };

function RealSatEditor({ student, predictions, onSaved }: { student: RealSatStudent; predictions: PredictionPoint[]; onSaved: () => void }) {
  const [math, setMath] = useState(student.real_sat_math?.toString() ?? '');
  const [total, setTotal] = useState(student.real_sat_total?.toString() ?? '');
  const [date, setDate] = useState(student.real_sat_date ?? '');
  const [saving, setSaving] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = math.trim() ? parseInt(math, 10) : null;
    const t = total.trim() ? parseInt(total, 10) : null;
    if (m != null && (m < 200 || m > 800)) return toast.error('Math must be between 200 and 800.');
    if (t != null && (t < 400 || t > 1600)) return toast.error('Total must be between 400 and 1600.');
    if (m != null && !date) return toast.error('Add the test date so we can check the prediction made before it.');
    setSaving(true);
    const { error } = await supabase.from('tenant_students').update({ real_sat_math: m, real_sat_total: t, real_sat_date: date || null } as any).eq('id', student.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    const cmp = compareToReal(predictions, m, date || null);
    toast.success('Real SAT saved', {
      description: cmp?.predicted != null ? `Prediction was ${cmp.predicted} vs real ${m} (${cmp.miss! > 0 ? '+' : ''}${cmp.miss}) — ${cmp.onTarget ? 'on target' : 'missed'}.` : undefined,
    });
    onSaved();
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1"><Label htmlFor="rs-math">Math</Label><Input id="rs-math" type="number" min={200} max={800} placeholder="200-800" value={math} onChange={e => setMath(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="rs-total">Total</Label><Input id="rs-total" type="number" min={400} max={1600} placeholder="400-1600" value={total} onChange={e => setTotal(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="rs-date">Test date</Label><Input id="rs-date" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        </div>
        <Button size="sm" disabled={saving}><Check className="h-4 w-4" />{saving ? 'Saving…' : 'Save real SAT'}</Button>
      </form>
      <PredictionVsReal predictions={predictions} realMath={student.real_sat_math} realDate={student.real_sat_date} />
    </div>
  );
}

function ClassSelect({ value, onChange, classes, label, className = 'w-44' }: { value: string | null; onChange: (v: string | null) => void; classes: { id: string; name: string }[]; label: string; className?: string }) {
  return (
    <Select value={value ?? 'none'} onValueChange={v => onChange(v === 'none' ? null : v)}>
      <SelectTrigger className={`${className} h-8`} aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="none">No batch</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
    </Select>
  );
}

const plural = (n: number) => `${n} student${n === 1 ? '' : 's'}`;

function ImportStudentsDialog({ data }: { data: CenterAdminData }) {
  const { center } = useCenter();
  const refresh = useRefreshCenter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [defaultClassId, setDefaultClassId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ added: number; failed: ImportRow[] } | null>(null);
  const rows = useMemo(() => checkStudentRows(text, { classes: data.classes, students: data.students, defaultClassId }), [text, data, defaultClassId]);
  const ok = rows.filter(r => !r.error);
  const batchName = (id: string | null) => data.classes.find(c => c.id === id)?.name ?? '—';
  const onOpenChange = (o: boolean) => {
    if (progress) return; // keep the dialog open while students are being added
    setOpen(o);
    if (!o) { setText(''); setDefaultClassId(null); setResult(null); }
  };
  const run = async () => {
    const failed = rows.filter(r => r.error);
    let next = 0; let added = 0;
    setProgress({ done: 0, total: ok.length });
    // Same insert as the one-by-one form, a few at a time.
    const worker = async () => {
      while (next < ok.length) {
        const r = ok[next++];
        const { error } = await supabase.from('tenant_students').insert({ institution_id: center.id, name: r.name, phone: r.phone, class_id: r.classId });
        if (error) failed.push({ ...r, error: error.code === '23505' ? 'That phone number is already registered.' : error.message }); else added++;
        setProgress(p => p && { ...p, done: p.done + 1 });
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    setProgress(null); setResult({ added, failed }); refresh();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button variant="outline"><Upload className="h-4 w-4" />Import students</Button></DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import students</DialogTitle>
          <DialogDescription>Paste rows from Excel or Google Sheets, or upload a .csv file. Columns: name, phone, batch (optional).</DialogDescription>
        </DialogHeader>
        {result ? <>
          <p className="text-sm">Added {plural(result.added)}.{result.failed.length > 0 && ` ${plural(result.failed.length)} not added. Copy them, fix them and paste them here again.`}</p>
          <DialogFooter className="gap-2">
            {result.failed.length > 0 && <Button variant="outline" onClick={() => { navigator.clipboard.writeText(failedRowsText(result.failed)); toast.success('Rows copied'); }}><Copy className="h-4 w-4" />Copy rows that failed</Button>}
            <Button variant="outline" onClick={() => { setText(''); setResult(null); }}>Import more</Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </> : <>
          <Textarea aria-label="Student rows" rows={6} placeholder={'Bat-Erdene, 99112233, SAT Morning'} value={text} onChange={e => setText(e.target.value)} disabled={!!progress} />
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1"><Label htmlFor="import-file">Or upload a .csv</Label>
              <Input id="import-file" type="file" accept=".csv,text/csv" className="w-64" disabled={!!progress}
                onChange={async e => { const f = e.target.files?.[0]; if (f) setText(await f.text()); e.target.value = ''; }} /></div>
            <div className="space-y-1"><Label>Batch for rows without one</Label><ClassSelect value={defaultClassId} onChange={setDefaultClassId} classes={data.classes} label="Batch for rows without one" className="w-56" /></div>
          </div>
          {rows.length > 0 && <>
            <p className="text-sm text-muted-foreground">{ok.length} ready · {rows.length - ok.length} with problems</p>
            <div className="max-h-72 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Batch</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell><TableCell>{r.name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.phone || r.rawPhone}</TableCell><TableCell>{r.batch || batchName(r.classId)}</TableCell>
                    <TableCell className={r.error ? 'text-destructive' : 'text-muted-foreground'}>{r.error ?? 'OK'}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          </>}
          {progress && <div className="space-y-1"><Progress value={(progress.done / progress.total) * 100} /><p className="text-xs text-muted-foreground">Adding {progress.done} of {progress.total}…</p></div>}
          <DialogFooter><Button onClick={run} disabled={!ok.length || !!progress}><Upload className="h-4 w-4" />Import {plural(ok.length)}</Button></DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  );
}

function AddStudentDialog({ data }: { data: CenterAdminData }) {
  const { center } = useCenter();
  const refresh = useRefreshCenter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [classId, setClassId] = useState<string | null>(null);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneDigits(phone);
    if (digits.length < 6) return toast.error('Enter a valid phone number.');
    const { error } = await supabase.from('tenant_students').insert({ institution_id: center.id, name: name.trim(), phone: digits, class_id: classId });
    if (error) return toast.error(error.code === '23505' ? 'That phone number is already registered.' : error.message);
    toast.success(`${name.trim()} added`); setName(''); setPhone(''); refresh(); setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Add student</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add student</DialogTitle><DialogDescription>Students sign in to this portal with this phone number and create their own password the first time.</DialogDescription></DialogHeader>
        <form onSubmit={add} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="s-name">Student name</Label><Input id="s-name" value={name} onChange={e => setName(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="s-phone">Phone</Label><Input id="s-phone" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>Batch</Label><ClassSelect value={classId} onChange={setClassId} classes={data.classes} label="Batch for new student" className="w-full" /></div>
          <DialogFooter><Button><Plus className="h-4 w-4" />Add student</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof User; label: string; value: number | string }) {
  return (
    <div className="admin-glass-card rounded-xl border p-4 flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-mono text-2xl tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p></div>
    </div>
  );
}

const PAGE_SIZE = 50;
const accountStatus = (s: CenterAdminData['students'][number]) => (!s.active ? 'Access removed' : s.user_id ? 'Signed up' : 'Not signed up yet');

/** Same layout as the main Student Management page, on the center's students. */
export function StudentsPage() {
  const { center } = useCenter();
  const { data, isLoading, isFetching } = useCenterAdminData();
  const refresh = useRefreshCenter();
  const navigate = useNavigate();
  const [q, setQ] = useState(''); const [batch, setBatch] = useState('all'); const [page, setPage] = useState(1);
  const [resetFor, setResetFor] = useState<CenterAdminData['students'][number] | null>(null);
  const gcols = hasGoogleColumns(data?.students ?? []);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase(); const digits = phoneDigits(q);
    return (data?.students ?? []).filter(s => (batch === 'all' || (batch === 'none' ? !s.class_id : s.class_id === batch))
      && (!needle || s.name.toLowerCase().includes(needle) || (!!digits && s.phone.includes(digits))));
  }, [data, q, batch]);
  if (isLoading || !data) return <Loading />;
  const className = (id: string | null) => data.classes.find(c => c.id === id)?.name;
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const shown = list.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE);
  const active = data.students.filter(s => s.active);
  const resetPw = async () => {
    if (!resetFor) return;
    try { await centerAccounts({ action: 'reset_student', institution_id: center.id, student_id: resetFor.id }); toast.success('Password reset'); refresh(); }
    catch (err) { toast.error((err as Error).message); }
    setResetFor(null);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-chillax text-2xl font-semibold tracking-tight">Student Management</h1>
          <p className="text-sm text-muted-foreground">Search and manage your students</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input aria-label="Search students" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Name or phone…" className="pl-9 h-9" />
          </div>
          <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" aria-label="Refresh" onClick={refresh}><RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat icon={User} label="Total students" value={data.students.length} />
        <Stat icon={UserCheck} label="Signed up" value={active.filter(s => s.user_id).length} />
        <Stat icon={UserX} label="No Google or verified email" value={gcols ? active.filter(s => !hasEither(s as GoogleFields)).length : '—'} />
        <Stat icon={PowerOff} label="Access removed" value={data.students.length - active.length} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AddStudentDialog data={data} />
        <ImportStudentsDialog data={data} />
        <Select value={batch} onValueChange={v => { setBatch(v); setPage(1); }}><SelectTrigger className="w-44 ml-auto" aria-label="Filter by batch"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All batches</SelectItem><SelectItem value="none">No batch</SelectItem>{data.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="admin-glass-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-10 px-1"><span className="sr-only">Reset password</span></TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Google</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Account</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No students found</TableCell></TableRow>
              : shown.map(s => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/admin/students/${s.id}`)}>
                  <TableCell className={`font-medium ${s.active ? '' : 'text-muted-foreground line-through'}`}>{s.name}</TableCell>
                  <TableCell className="px-1" onClick={e => e.stopPropagation()}>
                    <Tooltip><TooltipTrigger asChild><span>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Reset ${s.name}'s password`} disabled={!s.user_id || !s.active || (gcols && signsInWithGoogle(s as GoogleFields))} onClick={() => setResetFor(s)}><KeyRound className="h-4 w-4" /></Button>
                    </span></TooltipTrigger><TooltipContent>{gcols && signsInWithGoogle(s as GoogleFields) ? 'Signs in with Google' : s.user_id && s.active ? 'Reset password' : 'Reset password — not signed up yet'}</TooltipContent></Tooltip>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{s.phone}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{gcols ? ((s as GoogleFields).email ?? <span className="text-muted-foreground">—</span>) : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{gcols ? googleStatus(s as GoogleFields) : '—'}</TableCell>
                  <TableCell className="text-sm max-w-[220px] truncate">{className(s.class_id) ?? <span className="text-muted-foreground">No batch</span>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(s.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{accountStatus(s)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
          <span className="font-mono">{list.length.toLocaleString()} students</span>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-mono text-xs">{Math.min(page, pages)} / {pages}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <AlertDialog open={!!resetFor} onOpenChange={o => !o && setResetFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset {resetFor?.name}'s password?</AlertDialogTitle>
            <AlertDialogDescription>They will create a new one the next time they sign in.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={resetPw}>Reset password</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function StudentDetailPage() {
  const { studentId = '' } = useParams();
  const { center } = useCenter();
  const { data, isLoading } = useCenterAdminData();
  const refresh = useRefreshCenter();
  const history = useQuery({
    queryKey: ['center-student-history', studentId],
    queryFn: async () => {
      // Server-side counts: the API returns at most 1,000 rows per request.
      const attempts = () => supabase.from('tenant_attempts').select('created_at', { count: 'exact' }).eq('student_id', studentId);
      const [att, answered, correct, preds] = await Promise.all([
        supabase.from('tenant_attendance').select('session_date, status, class_id').eq('student_id', studentId).order('session_date', { ascending: false }).limit(200),
        attempts().order('created_at', { ascending: false }).limit(1),
        attempts().eq('is_correct', true).limit(1),
        supabase.from('tenant_sat_predictions' as any).select('snapshot_date, sim_score').eq('student_id', studentId).order('snapshot_date', { ascending: false }).limit(400),
      ]);
      return {
        att: att.data ?? [], answered: answered.count ?? 0, correct: correct.count ?? 0, last: answered.data?.[0]?.created_at,
        preds: ((preds.data as any[]) ?? []).map(r => ({ date: r.snapshot_date as string, score: r.sim_score as number | null })),
      };
    },
  });
  const s = data?.students.find(x => x.id === studentId);
  if (isLoading || !data) return <Loading />;
  if (!s) return <Empty>Student not found. <Link to="/admin/students" className="underline">Back to Student Management</Link></Empty>;
  const update = async (patch: Record<string, unknown>, msg: string) => {
    const { error } = await supabase.from('tenant_students').update(patch).eq('id', s.id);
    if (error) toast.error(error.message); else { toast.success(msg); refresh(); }
  };
  const resetPw = async () => {
    if (!confirm(`Reset ${s.name}'s password? They will create a new one next time they sign in.`)) return;
    try { await centerAccounts({ action: 'reset_student', institution_id: center.id, student_id: s.id }); toast.success('Password reset'); refresh(); }
    catch (err) { toast.error((err as Error).message); }
  };
  const gcols = hasGoogleColumns(data.students);
  const g = s as GoogleFields;
  const googleCall = async (fn: 'tenant_give_google_time' | 'tenant_switch_to_phone') => {
    const { data: res, error } = await supabase.rpc(fn as any, { _student: s.id });
    if (error) return toast.error(error.message);
    toast.success(fn === 'tenant_give_google_time' ? `Google is now due ${formatDue(String(res))}` : `${s.name} will sign in with their phone`);
    refresh();
  };
  const h = history.data;
  const attended = h?.att.filter(a => a.status === 'present' || a.status === 'late').length ?? 0;
  return (
    <div className="space-y-8">
      <Link to="/admin/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Student Management</Link>
      <PageHeader title={s.name} description={`${s.phone} · ${!s.active ? 'Access removed' : s.user_id ? 'Signed up' : 'Not signed up yet'}`} actions={<>
        {gcols && !hasEither(g) && <Button variant="outline" size="sm" onClick={() => googleCall('tenant_give_google_time')}>Give more time</Button>}
        {gcols && signsInWithGoogle(g) && <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="outline" size="sm">Switch to phone sign-in</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Switch {s.name} to phone sign-in?</AlertDialogTitle>
              <AlertDialogDescription>They will sign in with their phone and password. Their email stays saved.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => googleCall('tenant_switch_to_phone')}>Switch</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>}
        {s.user_id && !(gcols && signsInWithGoogle(g)) && <Button variant="outline" size="sm" onClick={resetPw}><RotateCcw className="h-4 w-4" />Reset password</Button>}
        <Button variant={s.active ? 'ghost' : 'outline'} size="sm" className={s.active ? 'text-destructive' : ''} onClick={() => update({ active: !s.active }, s.active ? 'Access removed' : 'Access restored')}>{s.active ? 'Remove access' : 'Restore access'}</Button>
      </>} />
      <div className="flex items-center gap-3"><Label>Batch</Label><ClassSelect value={s.class_id} onChange={v => update({ class_id: v }, 'Batch updated')} classes={data.classes} label="Move to batch" className="w-56" /></div>
      {!h ? <Loading /> : <>
        <StatRow stats={[
          ['Questions answered', h.answered],
          ['Accuracy', pct(h.correct, h.answered)],
          ['Attendance', pct(attended, h.att.length), `${attended}/${h.att.length} sessions`],
          ['Last practice', h.last ? new Date(h.last).toLocaleDateString() : '—'],
        ]} />
        <Section title="Real SAT vs predicted">
          <RealSatEditor student={s as any} predictions={h.preds} onSaved={() => { refresh(); history.refetch(); }} />
        </Section>
        <Section title="Attendance history">
          {h.att.length ? <ul className="divide-y text-sm">{h.att.slice(0, 40).map(a => (
            <li key={`${a.session_date}-${a.class_id}`} className="py-2 flex justify-between"><span className="font-mono text-xs">{a.session_date}</span><span className={`text-xs rounded px-2 py-0.5 ${STATUS_STYLE[a.status]}`}>{STATUS_LABEL[a.status]}</span></li>
          ))}</ul> : <Empty>No attendance recorded yet.</Empty>}
        </Section>
      </>}
    </div>
  );
}

export function RegistrationsPage() {
  const { center } = useCenter();
  const { data } = useCenterAdminData();
  const refresh = useRefreshCenter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const regs = useQuery({
    queryKey: ['center-registrations', center.id, tab],
    queryFn: async () => (await supabase.from('tenant_registrations').select('*').eq('institution_id', center.id).eq('status', tab).order('created_at', { ascending: false }).limit(500)).data ?? [],
  });
  const done = () => { qc.invalidateQueries({ queryKey: ['center-registrations', center.id] }); refresh(); };
  const approve = async (r: NonNullable<typeof regs.data>[number]) => {
    const { error } = await supabase.from('tenant_students').insert({ institution_id: center.id, name: r.name, phone: r.phone, class_id: r.class_id });
    if (error && error.code !== '23505') return toast.error(error.message);
    await supabase.from('tenant_registrations').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', r.id);
    toast.success(`${r.name} approved — they can sign in with their phone now`); done();
  };
  const reject = async (id: string) => {
    await supabase.from('tenant_registrations').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id);
    toast.success('Sign-up rejected'); done();
  };
  const cls = (id: string | null) => data?.classes.find(c => c.id === id)?.name ?? '—';
  return (
    <div className="space-y-6">
      <PageHeader title="Registration Queue" description="Students who signed up with a batch sign-up link. Get links on All Batches." />
      <div className="flex gap-1" role="tablist" aria-label="Status">{(['pending', 'approved', 'rejected'] as const).map(t => (
        <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-md px-3 h-8 text-sm capitalize ${tab === t ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/60'}`}>{t}</button>
      ))}</div>
      {regs.isLoading ? <Loading /> : regs.data?.length ? (
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]"><thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2">Name</th><th className="text-left">Phone</th><th className="text-left">School / grade</th><th className="text-left">Batch</th><th className="text-left">Sent</th><th /></tr></thead>
          <tbody className="divide-y">{regs.data.map(r => (
            <tr key={r.id}><td className="py-3">{r.name}{r.email && <p className="text-xs text-muted-foreground">{r.email}</p>}</td><td className="font-mono text-xs">{r.phone}</td>
              <td className="text-muted-foreground">{[r.school, r.grade].filter(Boolean).join(' · ') || '—'}</td><td>{cls(r.class_id)}</td>
              <td className="font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="text-right whitespace-nowrap">{tab === 'pending' && <>
                <Button size="sm" onClick={() => approve(r)}><Check className="h-4 w-4" />Approve</Button>
                <Button size="sm" variant="ghost" onClick={() => reject(r.id)}><X className="h-4 w-4" />Reject</Button></>}</td></tr>
          ))}</tbody></table></div>
      ) : <Empty>{tab === 'pending' ? 'No one is waiting for approval.' : `No ${tab} sign-ups.`}</Empty>}
    </div>
  );
}
