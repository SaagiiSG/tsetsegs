import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Plus, RotateCcw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { phoneDigits } from '@/lib/tenant';
import { STATUS_LABEL, STATUS_STYLE, useCenter } from '../centerContext';
import { centerAccounts } from '../centerApi';
import { useCenterAdminData, useRefreshCenter, pct } from './useCenterAdminData';
import { Empty, Loading, PageHeader, Section, StatRow } from './ui';

function ClassSelect({ value, onChange, classes, label, className = 'w-44' }: { value: string | null; onChange: (v: string | null) => void; classes: { id: string; name: string }[]; label: string; className?: string }) {
  return (
    <Select value={value ?? 'none'} onValueChange={v => onChange(v === 'none' ? null : v)}>
      <SelectTrigger className={`${className} h-8`} aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="none">No batch</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function StudentsPage() {
  const { center } = useCenter();
  const { data, isLoading } = useCenterAdminData();
  const refresh = useRefreshCenter();
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [classId, setClassId] = useState<string | null>(null);
  const [q, setQ] = useState(''); const [batch, setBatch] = useState('all');
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase(); const digits = phoneDigits(q);
    return (data?.students ?? []).filter(s => (batch === 'all' || (batch === 'none' ? !s.class_id : s.class_id === batch))
      && (!needle || s.name.toLowerCase().includes(needle) || (!!digits && s.phone.includes(digits))));
  }, [data, q, batch]);
  if (isLoading || !data) return <Loading />;
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneDigits(phone);
    if (digits.length < 6) return toast.error('Enter a valid phone number.');
    const { error } = await supabase.from('tenant_students').insert({ institution_id: center.id, name: name.trim(), phone: digits, class_id: classId });
    if (error) return toast.error(error.code === '23505' ? 'That phone number is already registered.' : error.message);
    toast.success(`${name.trim()} added`); setName(''); setPhone(''); refresh();
  };
  const className = (id: string | null) => data.classes.find(c => c.id === id)?.name ?? '—';
  return (
    <div className="space-y-8">
      <PageHeader title="Search Accounts" description={`${data.students.filter(s => s.active).length} active students`} />
      <form onSubmit={add} className="flex flex-wrap gap-3 items-end rounded-lg border p-4">
        <div className="space-y-1"><Label htmlFor="s-name">Student name</Label><Input id="s-name" value={name} onChange={e => setName(e.target.value)} required /></div>
        <div className="space-y-1"><Label htmlFor="s-phone">Phone</Label><Input id="s-phone" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} required /></div>
        <div className="space-y-1"><Label>Batch</Label><ClassSelect value={classId} onChange={setClassId} classes={data.classes} label="Batch for new student" /></div>
        <Button><Plus className="h-4 w-4" />Add student</Button>
        <p className="basis-full text-xs text-muted-foreground">Students sign in to this portal with this phone number and create their own password the first time.</p>
      </form>
      <div className="flex flex-wrap gap-2">
        <Input aria-label="Search students" placeholder="Search by name or phone…" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
        <Select value={batch} onValueChange={setBatch}><SelectTrigger className="w-44" aria-label="Filter by batch"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All batches</SelectItem><SelectItem value="none">No batch</SelectItem>{data.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
      </div>
      {list.length ? <div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]"><thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2">Name</th><th className="text-left">Phone</th><th className="text-left">Batch</th><th className="text-left">Account</th></tr></thead>
        <tbody className="divide-y">{list.map(s => (
          <tr key={s.id} className="hover:bg-muted/40"><td className="py-3"><Link to={`/admin/students/${s.id}`} className={`hover:underline ${s.active ? '' : 'text-muted-foreground line-through'}`}>{s.name}</Link></td>
            <td className="font-mono text-xs">{s.phone}</td><td className="text-muted-foreground">{className(s.class_id)}</td>
            <td className="text-xs text-muted-foreground">{!s.active ? 'Access removed' : s.user_id ? 'Signed up' : 'Not signed up yet'}</td></tr>
        ))}</tbody></table></div> : <Empty>No students match.</Empty>}
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
      const [att, attempts] = await Promise.all([
        supabase.from('tenant_attendance').select('session_date, status, class_id').eq('student_id', studentId).order('session_date', { ascending: false }).limit(200),
        supabase.from('tenant_attempts').select('is_correct, created_at').eq('student_id', studentId).order('created_at', { ascending: false }).limit(5000),
      ]);
      return { att: att.data ?? [], attempts: attempts.data ?? [] };
    },
  });
  const s = data?.students.find(x => x.id === studentId);
  if (isLoading || !data) return <Loading />;
  if (!s) return <Empty>Student not found. <Link to="/admin/students" className="underline">Back to accounts</Link></Empty>;
  const update = async (patch: Record<string, unknown>, msg: string) => {
    const { error } = await supabase.from('tenant_students').update(patch).eq('id', s.id);
    if (error) toast.error(error.message); else { toast.success(msg); refresh(); }
  };
  const resetPw = async () => {
    if (!confirm(`Reset ${s.name}'s password? They will create a new one next time they sign in.`)) return;
    try { await centerAccounts({ action: 'reset_student', institution_id: center.id, student_id: s.id }); toast.success('Password reset'); refresh(); }
    catch (err) { toast.error((err as Error).message); }
  };
  const h = history.data;
  const attended = h?.att.filter(a => a.status === 'present' || a.status === 'late').length ?? 0;
  return (
    <div className="space-y-8">
      <Link to="/admin/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Search Accounts</Link>
      <PageHeader title={s.name} description={`${s.phone} · ${!s.active ? 'Access removed' : s.user_id ? 'Signed up' : 'Not signed up yet'}`} actions={<>
        {s.user_id && <Button variant="outline" size="sm" onClick={resetPw}><RotateCcw className="h-4 w-4" />Reset password</Button>}
        <Button variant={s.active ? 'ghost' : 'outline'} size="sm" className={s.active ? 'text-destructive' : ''} onClick={() => update({ active: !s.active }, s.active ? 'Access removed' : 'Access restored')}>{s.active ? 'Remove access' : 'Restore access'}</Button>
      </>} />
      <div className="flex items-center gap-3"><Label>Batch</Label><ClassSelect value={s.class_id} onChange={v => update({ class_id: v }, 'Batch updated')} classes={data.classes} label="Move to batch" className="w-56" /></div>
      {!h ? <Loading /> : <>
        <StatRow stats={[
          ['Questions answered', h.attempts.length],
          ['Accuracy', pct(h.attempts.filter(a => a.is_correct).length, h.attempts.length)],
          ['Attendance', pct(attended, h.att.length), `${attended}/${h.att.length} sessions`],
          ['Last practice', h.attempts[0] ? new Date(h.attempts[0].created_at).toLocaleDateString() : '—'],
        ]} />
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
