import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, RotateCcw, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { phoneDigits } from '@/lib/tenant';
import { PortalShell, useCenter } from './centerContext';
import { centerAccounts, localDate } from './centerApi';

function useCenterData(institutionId: string) {
  return useQuery({
    queryKey: ['center-data', institutionId],
    queryFn: async () => {
      const [members, classes, students, dues, attempts] = await Promise.all([
        supabase.from('tenant_members').select('*').eq('institution_id', institutionId).order('created_at'),
        supabase.from('tenant_classes').select('*').eq('institution_id', institutionId).order('created_at'),
        supabase.from('tenant_students').select('*').eq('institution_id', institutionId).order('name').limit(5000),
        supabase.from('institution_payment_dues').select('*').eq('customer_id', institutionId).order('due_date'),
        supabase.from('tenant_attempts').select('student_id, is_correct, created_at').eq('institution_id', institutionId)
          .gte('created_at', new Date(Date.now() - 7 * 864e5).toISOString()).limit(10000),
      ]);
      for (const r of [members, classes, students, dues, attempts]) if (r.error) throw r.error;
      return { members: members.data!, classes: classes.data!, students: students.data!, dues: dues.data!, attempts: attempts.data! };
    },
  });
}

export default function CenterAdminPortal() {
  const { center } = useCenter();
  const qc = useQueryClient();
  const { data, isLoading } = useCenterData(center.id);
  const refresh = () => qc.invalidateQueries({ queryKey: ['center-data', center.id] });
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);

  const teachers = data?.members.filter(m => m.role === 'teacher') ?? [];
  const today = localDate();
  const active7 = useMemo(() => new Set(data?.attempts.map(a => a.student_id)).size, [data]);
  const acc = data?.attempts.length ? Math.round(100 * data.attempts.filter(a => a.is_correct).length / data.attempts.length) : null;
  const nextDue = data?.dues.find(d => !d.paid_at);

  return (
    <PortalShell title="Center admin" nav={<Link to="/teacher" className="text-sm text-muted-foreground hover:text-foreground">Teacher view</Link>}>
      {isLoading || !data ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <Tabs defaultValue="overview">
          <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="classes">Classes</TabsTrigger><TabsTrigger value="teachers">Teachers</TabsTrigger><TabsTrigger value="students">Students</TabsTrigger></TabsList>

          <TabsContent value="overview" className="mt-6 space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 border-y">
              {[['Students', data.students.filter(s => s.active).length], ['Active this week', active7], ['Accuracy (7 days)', acc === null ? '—' : `${acc}%`], ['Classes', data.classes.length]].map(([l, v]) => (
                <div key={l as string} className="py-5 px-3 lg:border-r last:border-r-0"><p className="text-xs text-muted-foreground">{l}</p><p className="font-mono text-2xl mt-1">{v}</p></div>
              ))}
            </div>
            <section className="space-y-3">
              <h2 className="font-chillax text-lg font-semibold">Billing</h2>
              {nextDue ? <p className="text-sm">Next payment: <span className="font-mono">{new Intl.NumberFormat('en', { style: 'currency', currency: nextDue.currency }).format(Number(nextDue.amount))}</span> due <span className="font-mono">{nextDue.due_date}</span>{nextDue.due_date < today && <span className="ml-2 text-xs rounded px-2 py-0.5 bg-status-risk/10 text-status-risk">Overdue</span>}</p> : <p className="text-sm text-muted-foreground">No open payments.</p>}
              <table className="w-full text-sm"><tbody className="divide-y">{data.dues.map(d => (
                <tr key={d.id}><td className="py-2">{d.description || 'Payment'}</td><td className="py-2 font-mono">{new Intl.NumberFormat('en', { style: 'currency', currency: d.currency }).format(Number(d.amount))}</td><td className="py-2 font-mono text-xs">{d.due_date}</td><td className="py-2 text-xs">{d.paid_at ? 'Paid' : d.due_date < today ? 'Overdue' : 'Upcoming'}</td></tr>
              ))}</tbody></table>
            </section>
          </TabsContent>

          <TabsContent value="classes" className="mt-6"><ClassesTab data={data} teachers={teachers} refresh={refresh} /></TabsContent>
          <TabsContent value="teachers" className="mt-6"><TeachersTab teachers={teachers} refresh={refresh} onCredential={setCredential} /></TabsContent>
          <TabsContent value="students" className="mt-6"><StudentsTab data={data} refresh={refresh} /></TabsContent>
        </Tabs>
      )}
      <Dialog open={!!credential} onOpenChange={o => !o && setCredential(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Teacher login</DialogTitle><DialogDescription>Share this once — the password isn't shown again.</DialogDescription></DialogHeader>
          {credential && <div className="rounded-md border p-3 font-mono text-sm space-y-1"><p>{credential.email}</p><p>{credential.password}</p></div>}
          <Button onClick={() => { navigator.clipboard.writeText(`${credential?.email}\n${credential?.password}`); toast.success('Copied'); }}><Copy className="h-4 w-4" />Copy</Button>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}

type Data = NonNullable<ReturnType<typeof useCenterData>['data']>;

function ClassesTab({ data, teachers, refresh }: { data: Data; teachers: Data['members']; refresh: () => void }) {
  const { center } = useCenter();
  const [name, setName] = useState(''); const [schedule, setSchedule] = useState('');
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('tenant_classes').insert({ institution_id: center.id, name: name.trim(), schedule: schedule.trim() });
    if (error) return toast.error(error.message);
    setName(''); setSchedule(''); refresh();
  };
  const assign = async (id: string, teacher: string) => {
    const { error } = await supabase.from('tenant_classes').update({ teacher_member_id: teacher === 'none' ? null : teacher }).eq('id', id);
    if (error) toast.error(error.message); else refresh();
  };
  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><Label htmlFor="cl-name">Class name</Label><Input id="cl-name" value={name} onChange={e => setName(e.target.value)} required /></div>
        <div className="space-y-1"><Label htmlFor="cl-sch">Schedule</Label><Input id="cl-sch" value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="Mon/Wed 5pm" /></div>
        <Button><Plus className="h-4 w-4" />Add class</Button>
      </form>
      <table className="w-full text-sm"><thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2">Class</th><th className="text-left">Schedule</th><th className="text-left">Students</th><th className="text-left">Teacher</th></tr></thead>
        <tbody className="divide-y">{data.classes.map(c => (
          <tr key={c.id}><td className="py-3">{c.name}</td><td className="text-muted-foreground">{c.schedule || '—'}</td><td className="font-mono">{data.students.filter(s => s.class_id === c.id && s.active).length}</td>
            <td><Select value={c.teacher_member_id ?? 'none'} onValueChange={v => assign(c.id, v)}><SelectTrigger className="w-44 h-8" aria-label={`Teacher for ${c.name}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.display_name}</SelectItem>)}</SelectContent></Select></td></tr>
        ))}</tbody></table>
      {!data.classes.length && <p className="text-sm text-muted-foreground">No classes yet.</p>}
    </div>
  );
}

function TeachersTab({ teachers, refresh, onCredential }: { teachers: Data['members']; refresh: () => void; onCredential: (c: { email: string; password: string }) => void }) {
  const { center } = useCenter();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await centerAccounts<{ email: string; temporaryPassword: string }>({ action: 'create_member', institution_id: center.id, role: 'teacher', name, email });
      onCredential({ email: r.email, password: r.temporaryPassword }); setName(''); setEmail(''); refresh();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  const reset = async (t: Data['members'][number]) => {
    try { const r = await centerAccounts<{ temporaryPassword: string }>({ action: 'reset_member_password', institution_id: center.id, member_id: t.id }); onCredential({ email: t.email, password: r.temporaryPassword }); }
    catch (err) { toast.error((err as Error).message); }
  };
  const toggle = async (t: Data['members'][number]) => {
    const { error } = await supabase.from('tenant_members').update({ active: !t.active }).eq('id', t.id);
    if (error) toast.error(error.message); else refresh();
  };
  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><Label htmlFor="t-name">Name</Label><Input id="t-name" value={name} onChange={e => setName(e.target.value)} required /></div>
        <div className="space-y-1"><Label htmlFor="t-email">Email</Label><Input id="t-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <Button disabled={busy}><Plus className="h-4 w-4" />{busy ? 'Adding…' : 'Add teacher'}</Button>
      </form>
      <ul className="divide-y">{teachers.map(t => (
        <li key={t.id} className="py-3 flex items-center gap-3 text-sm">
          <div className="flex-1 min-w-0"><p className={t.active ? '' : 'text-muted-foreground line-through'}>{t.display_name}</p><p className="text-xs text-muted-foreground">{t.email}</p></div>
          <Button variant="outline" size="sm" onClick={() => reset(t)}><KeyRound className="h-4 w-4" />Reset password</Button>
          <Button variant="ghost" size="sm" onClick={() => toggle(t)}>{t.active ? 'Deactivate' : 'Reactivate'}</Button>
        </li>
      ))}</ul>
      {!teachers.length && <p className="text-sm text-muted-foreground">No teachers yet.</p>}
    </div>
  );
}

function StudentsTab({ data, refresh }: { data: Data; refresh: () => void }) {
  const { center } = useCenter();
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [classId, setClassId] = useState('none'); const [q, setQ] = useState('');
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneDigits(phone);
    if (digits.length < 6) return toast.error('Enter a valid phone number.');
    const { error } = await supabase.from('tenant_students').insert({ institution_id: center.id, name: name.trim(), phone: digits, class_id: classId === 'none' ? null : classId });
    if (error) return toast.error(error.code === '23505' ? 'That phone number is already registered.' : error.message);
    setName(''); setPhone(''); refresh();
  };
  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from('tenant_students').update(patch).eq('id', id);
    if (error) toast.error(error.message); else refresh();
  };
  const resetPw = async (id: string) => {
    if (!confirm('Reset this student\'s password? They will create a new one next time they sign in.')) return;
    try { await centerAccounts({ action: 'reset_student', institution_id: center.id, student_id: id }); toast.success('Password reset'); refresh(); }
    catch (err) { toast.error((err as Error).message); }
  };
  const list = data.students.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.phone.includes(phoneDigits(q) || '§'));
  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><Label htmlFor="s-name">Student name</Label><Input id="s-name" value={name} onChange={e => setName(e.target.value)} required /></div>
        <div className="space-y-1"><Label htmlFor="s-phone">Phone</Label><Input id="s-phone" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} required /></div>
        <div className="space-y-1"><Label>Class</Label><Select value={classId} onValueChange={setClassId}><SelectTrigger className="w-44" aria-label="Class"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No class</SelectItem>{data.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <Button><Plus className="h-4 w-4" />Add student</Button>
      </form>
      <p className="text-xs text-muted-foreground">Students sign in at this portal with this phone number and create their own password the first time.</p>
      <Input aria-label="Search students" placeholder="Search students…" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
      <table className="w-full text-sm"><thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2">Name</th><th className="text-left">Phone</th><th className="text-left">Class</th><th className="text-left">Status</th><th /></tr></thead>
        <tbody className="divide-y">{list.map(s => (
          <tr key={s.id}><td className={`py-3 ${s.active ? '' : 'text-muted-foreground line-through'}`}>{s.name}</td><td className="font-mono text-xs">{s.phone}</td>
            <td><Select value={s.class_id ?? 'none'} onValueChange={v => update(s.id, { class_id: v === 'none' ? null : v })}><SelectTrigger className="w-40 h-8" aria-label={`Class for ${s.name}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No class</SelectItem>{data.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></td>
            <td className="text-xs text-muted-foreground">{s.user_id ? 'Signed up' : 'Not signed up yet'}</td>
            <td className="text-right whitespace-nowrap">{s.user_id && <Button variant="ghost" size="sm" onClick={() => resetPw(s.id)}><RotateCcw className="h-4 w-4" />Reset password</Button>}<Button variant="ghost" size="sm" onClick={() => update(s.id, { active: !s.active })}>{s.active ? 'Remove access' : 'Restore'}</Button></td></tr>
        ))}</tbody></table>
      {!list.length && <p className="text-sm text-muted-foreground">No students.</p>}
    </div>
  );
}
