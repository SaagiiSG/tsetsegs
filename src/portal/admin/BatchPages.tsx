import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, FolderPlus, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useCenter } from '../centerContext';
import { useCenterAdminData, useRefreshCenter, type CenterAdminData } from './useCenterAdminData';
import { Empty, Loading, PageHeader } from './ui';

export const joinUrl = (code: string) => `${window.location.origin}/join/${code}`;

function JoinLinkDialog({ cls, onClose }: { cls: CenterAdminData['classes'][number]; onClose: () => void }) {
  const url = joinUrl(cls.join_code);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Sign-up link · {cls.name}</DialogTitle><DialogDescription>Students who use this link are enrolled in this class right away.</DialogDescription></DialogHeader>
        <img src={qr} alt={`QR code for ${cls.name} sign-up`} className="mx-auto h-60 w-60 rounded-md border bg-background p-2" />
        <p className="font-mono text-xs break-all rounded-md border p-2">{url}</p>
        <Button onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copied'); }}><Copy className="h-4 w-4" />Copy link</Button>
      </DialogContent>
    </Dialog>
  );
}

export function BatchesPage() {
  const { data, isLoading } = useCenterAdminData();
  const refresh = useRefreshCenter();
  const [joinFor, setJoinFor] = useState<CenterAdminData['classes'][number] | null>(null);
  if (isLoading || !data) return <Loading />;
  const teachers = data.members.filter(m => m.active);
  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from('tenant_classes').update(patch).eq('id', id);
    if (error) toast.error(error.message); else refresh();
  };
  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete batch "${name}"? Students stay, but are unassigned. Its attendance is deleted.`)) return;
    const { error } = await supabase.from('tenant_classes').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Batch deleted'); refresh(); }
  };
  return (
    <div>
      <PageHeader title="All Batches" description={`${data.classes.length} batches`} actions={<Button asChild size="sm"><Link to="/admin/batches/new"><FolderPlus className="h-4 w-4" />Create batch</Link></Button>} />
      {data.classes.length ? (
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]"><thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2">Batch</th><th className="text-left">Schedule</th><th className="text-left">Starts</th><th className="text-left">Students</th><th className="text-left">Teacher</th><th /></tr></thead>
          <tbody className="divide-y">{data.classes.map(c => (
            <tr key={c.id}>
              <td className="py-3 font-medium">{c.name}</td>
              <td className="text-muted-foreground">{c.schedule || '—'}</td>
              <td className="font-mono text-xs">{c.starts_on ?? '—'}</td>
              <td className="font-mono">{data.students.filter(s => s.class_id === c.id && s.active).length}</td>
              <td><Select value={c.teacher_member_id ?? 'none'} onValueChange={v => update(c.id, { teacher_member_id: v === 'none' ? null : v })}>
                <SelectTrigger className="w-44 h-8" aria-label={`Teacher for ${c.name}`}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Unassigned</SelectItem>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.display_name}</SelectItem>)}</SelectContent></Select></td>
              <td className="text-right whitespace-nowrap">
                <Button variant="ghost" size="sm" onClick={() => setJoinFor(c)}><QrCode className="h-4 w-4" />Sign-up link</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(c.id, c.name)}>Delete</Button>
              </td>
            </tr>
          ))}</tbody></table></div>
      ) : <Empty>No batches yet. <Link className="underline" to="/admin/batches/new">Create your first batch</Link>.</Empty>}
      {joinFor && <JoinLinkDialog cls={joinFor} onClose={() => setJoinFor(null)} />}
    </div>
  );
}

export function CreateBatchPage() {
  const { center } = useCenter();
  const { data } = useCenterAdminData();
  const refresh = useRefreshCenter();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', schedule: '', starts_on: '', teacher: 'none' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from('tenant_classes').insert({
      institution_id: center.id, name: form.name.trim(), schedule: form.schedule.trim(),
      starts_on: form.starts_on || null, teacher_member_id: form.teacher === 'none' ? null : form.teacher,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Batch created'); refresh(); navigate('/admin/batches');
  };
  return (
    <div className="max-w-lg">
      <PageHeader title="Create Batch" description="A batch is one class group with its own schedule, teacher and sign-up link." />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="b-name">Batch name</Label><Input id="b-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="SAT Fall Evening" required maxLength={80} /></div>
        <div className="space-y-1.5"><Label htmlFor="b-sch">Schedule</Label><Input id="b-sch" value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} placeholder="Mon/Wed 5–7pm" /></div>
        <div className="space-y-1.5"><Label htmlFor="b-start">Start date</Label><Input id="b-start" type="date" value={form.starts_on} onChange={e => setForm({ ...form, starts_on: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Teacher</Label>
          <Select value={form.teacher} onValueChange={v => setForm({ ...form, teacher: v })}><SelectTrigger aria-label="Teacher"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Assign later</SelectItem>{data?.members.filter(m => m.active).map(t => <SelectItem key={t.id} value={t.id}>{t.display_name}</SelectItem>)}</SelectContent></Select>
          {!data?.members.some(m => m.role === 'teacher') && <p className="text-xs text-muted-foreground">No teachers yet — add them on the <Link to="/admin/team" className="underline">Team</Link> page.</p>}
        </div>
        <div className="flex gap-2 pt-2"><Button disabled={busy}>{busy ? 'Creating…' : 'Create batch'}</Button><Button type="button" variant="ghost" onClick={() => navigate('/admin/batches')}>Cancel</Button></div>
      </form>
    </div>
  );
}
