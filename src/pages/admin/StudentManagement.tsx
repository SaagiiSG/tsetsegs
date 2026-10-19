import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, KeyRound, Loader2, Power, PowerOff, RefreshCw, Search, ShieldOff, User, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PasswordResetRequestsPanel } from '@/components/admin/PasswordResetRequestsPanel';
import { RegistrationQueue } from '@/components/admin/RegistrationQueue';
import { useAdminCohort } from '@/contexts/AdminCohortContext';
import { toast } from 'sonner';

const PAGE = 20;
const last8 = (p: string | null) => (p || '').replace(/\D/g, '').slice(-8);
const SELECT = 'id, first_name, last_name, name, phone, parent_phone, grade, created_at, batch:batches(id, batch_name, course_type)';

type Row = { id: string; first_name: string; last_name: string | null; name: string | null; phone: string; parent_phone: string | null; grade: string | null; created_at: string; batch: { batch_name: string | null; course_type: string } | null };
type Account = { id: string; phone_number: string; password_hash: string | null; registered_device_id: string | null };

async function count(q: PromiseLike<{ count: number | null; error: unknown }>) { const { count, error } = await q; if (error) throw error; return count ?? 0; }

function Stat({ icon: Icon, label, value, loading }: { icon: typeof User; label: string; value: number; loading: boolean }) {
  return (
    <div className="admin-glass-card rounded-xl border p-4 flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div><p className="text-xs text-muted-foreground">{label}</p>{loading ? <Skeleton className="h-7 w-16 mt-1" /> : <p className="font-mono text-2xl tabular-nums">{value.toLocaleString()}</p>}</div>
    </div>
  );
}

export default function StudentManagement() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { cohort } = useAdminCohort();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<null | 'resets' | 'registrations'>(null);
  const [dialogSearch, setDialogSearch] = useState('');
  const [confirm, setConfirm] = useState<null | { kind: 'password' | 'device'; account: Account; name: string }>(null);
  const intlIds = useRef<string[] | null>(null);

  useEffect(() => { const t = setTimeout(() => { setDebounced(query.trim()); setPage(1); }, 250); return () => clearTimeout(t); }, [query]);
  useEffect(() => { intlIds.current = null; setPage(1); }, [cohort]);

  const getIntl = async () => {
    if (intlIds.current) return intlIds.current;
    const { data: b } = await supabase.from('batches').select('id').eq('is_international', true);
    const ids = (b ?? []).map(x => x.id);
    const out: string[] = [];
    if (ids.length) for (let f = 0; ; f += 1000) { const { data } = await supabase.from('students').select('id').in('batch_id', ids).range(f, f + 999); out.push(...(data ?? []).map(s => s.id)); if (!data || data.length < 1000) break; }
    return (intlIds.current = out);
  };
  const scope = <T extends { in: any; not: any }>(q: T, ids: string[]): T =>
    cohort === 'intl' ? q.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']) : ids.length ? q.not('id', 'in', `(${ids.join(',')})`) : q;

  const stats = useQuery({
    queryKey: ['student-mgmt-stats', cohort],
    queryFn: async () => {
      const acc = () => supabase.from('student_accounts').select('id', { count: 'exact', head: true }).eq('is_ghost', false).eq('cohort', cohort);
      const [total, deactivated, sessions, resets, pendingRegs, google] = await Promise.all([
        count(acc()), count(acc().eq('is_active', false)),
        count(supabase.from('student_sessions').select('id', { count: 'exact', head: true }).eq('is_active', true).gt('expires_at', new Date().toISOString())),
        count(supabase.from('password_reset_requests').select('id', { count: 'exact', head: true })),
        count(supabase.from('registration_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
        count(supabase.from('student_email_links').select('id, student_accounts!inner(cohort, is_ghost)', { count: 'exact', head: true }).eq('student_accounts.cohort', cohort).eq('student_accounts.is_ghost', false)),
      ]);
      return { total, deactivated, sessions, resets, pendingRegs, google };
    },
  });

  const list = useQuery({
    queryKey: ['student-mgmt-list', cohort, debounced, page],
    queryFn: async () => {
      const ids = await getIntl();
      let q = supabase.from('students').select(SELECT, { count: 'exact' }).eq('is_ghost', false).order('created_at', { ascending: false });
      if (debounced) {
        const digits = debounced.replace(/[-\s+]/g, '');
        q = /^\d+$/.test(digits) ? q.or(`phone.ilike.%${digits}%,parent_phone.ilike.%${digits}%`) : q.or(`first_name.ilike.%${debounced}%,last_name.ilike.%${debounced}%,name.ilike.%${debounced}%`);
      }
      q = scope(q, ids).range((page - 1) * PAGE, page * PAGE - 1);
      const { data, count: total, error } = await q;
      if (error) throw error;
      const rows = (data ?? []).map((r: any) => ({ ...r, batch: Array.isArray(r.batch) ? r.batch[0] : r.batch })) as Row[];
      const keys = [...new Set(rows.map(r => last8(r.phone)).filter(Boolean))];
      const accounts = new Map<string, Account>();
      if (keys.length) {
        const { data: a } = await supabase.from('student_accounts').select('id, phone_number, password_hash, registered_device_id').eq('is_ghost', false).or(keys.map(k => `phone_number.ilike.%${k}`).join(','));
        (a ?? []).forEach(x => accounts.set(last8(x.phone_number), x));
      }
      const googleIds = new Set<string>();
      const accIds = [...accounts.values()].map(x => x.id);
      if (accIds.length) {
        const { data: l } = await supabase.from('student_email_links').select('student_account_id').in('student_account_id', accIds);
        (l ?? []).forEach(x => googleIds.add(x.student_account_id));
      }
      return { rows, total: total ?? 0, accounts, googleIds };
    },
    placeholderData: prev => prev,
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['student-mgmt-stats'] }); qc.invalidateQueries({ queryKey: ['student-mgmt-list'] }); };

  const runConfirm = async () => {
    if (!confirm) return;
    const patch = confirm.kind === 'password' ? { password_hash: null, password_set_at: null } : { registered_device_id: null, device_registered_at: null };
    const { error } = await supabase.from('student_accounts').update(patch).eq('id', confirm.account.id);
    if (error) toast.error(error.message);
    else toast.success(confirm.kind === 'password' ? `${confirm.name} will set a new password at next login` : `${confirm.name} can sign in on a new device`);
    setConfirm(null); refresh();
  };

  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE));
  const s = stats.data;
  const openDialog = (d: 'resets' | 'registrations') => { setDialogSearch(''); setDialog(d); };

  const IconAction = ({ label, onClick, disabled, icon: Icon }: { label: string; onClick: () => void; disabled: boolean; icon: typeof KeyRound }) => (
    <Tooltip><TooltipTrigger asChild>
      <span><Button size="icon" variant="ghost" className="h-7 w-7" aria-label={label} disabled={disabled} onClick={e => { e.stopPropagation(); onClick(); }}><Icon className="h-3.5 w-3.5" /></Button></span>
    </TooltipTrigger><TooltipContent>{disabled ? `${label} — nothing to reset` : label}</TooltipContent></Tooltip>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold font-chillax tracking-normal text-foreground [text-shadow:0_0_24px_hsl(var(--section-glow,12_85%_60%)/0.45)]">Student Management</h1>
          <p className="text-sm text-muted-foreground">Search and manage all registered students</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name or phone…" className="pl-9 h-9" />
          </div>
          <Button size="icon" variant="outline" className="h-9 w-9" aria-label="Refresh" onClick={refresh}><RefreshCw className={`h-4 w-4 ${list.isFetching ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Stat icon={User} label="Total accounts" value={s?.total ?? 0} loading={stats.isLoading} />
        <Stat icon={Power} label="Active sessions" value={s?.sessions ?? 0} loading={stats.isLoading} />
        <Stat icon={PowerOff} label="Deactivated accounts" value={s?.deactivated ?? 0} loading={stats.isLoading} />
        <Stat icon={Mail} label="Not connected to Google" value={Math.max(0, (s?.total ?? 0) - (s?.google ?? 0))} loading={stats.isLoading} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="gap-2" onClick={() => openDialog('resets')}><KeyRound className="h-4 w-4" />Reset requests<span className="font-mono text-xs text-muted-foreground">· {s?.resets ?? '…'}</span></Button>
        <Button variant="outline" className="gap-2" onClick={() => openDialog('registrations')}><UserPlus className="h-4 w-4" />Registration queue{!!s?.pendingRegs && <span className="font-mono text-xs rounded-full bg-muted px-1.5">{s.pendingRegs}</span>}</Button>
      </div>

      <div className="admin-glass-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-10 px-1"><span className="sr-only">Reset password</span></TableHead>
              <TableHead className="w-10 px-1"><span className="sr-only">Reset device lock</span></TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Parent phone</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Google</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading ? Array.from({ length: 6 }).map((_, i) => <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-5" /></TableCell></TableRow>)
              : list.data?.rows.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-10">No students found</TableCell></TableRow>
              : list.data?.rows.map(r => {
                const acc = list.data!.accounts.get(last8(r.phone));
                const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.name || 'Unnamed';
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/admin/student/${r.id}`)}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="px-1"><IconAction label="Reset password" icon={KeyRound} disabled={!acc?.password_hash} onClick={() => acc && setConfirm({ kind: 'password', account: acc, name })} /></TableCell>
                    <TableCell className="px-1"><IconAction label="Reset device lock" icon={ShieldOff} disabled={!acc?.registered_device_id} onClick={() => acc && setConfirm({ kind: 'device', account: acc, name })} /></TableCell>
                    <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{r.parent_phone || '—'}</TableCell>
                    <TableCell className="text-sm">{r.grade || '—'}</TableCell>
                    <TableCell className="text-sm max-w-[220px] truncate">{r.batch?.batch_name || <span className="text-muted-foreground">No batch</span>}</TableCell>
                    <TableCell className="text-sm">{r.batch?.course_type || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{acc && list.data!.googleIds.has(acc.id) ? <span className="inline-flex items-center gap-1 text-foreground"><Mail className="h-3.5 w-3.5" />Connected</span> : <span className="text-muted-foreground">Not connected</span>}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
          <span className="font-mono">{(list.data?.total ?? 0).toLocaleString()} students</span>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-mono text-xs">{page} / {totalPages}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={o => { if (!o) { setDialog(null); refresh(); } }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog === 'resets' ? 'Reset requests' : 'Registration queue'}</DialogTitle>
            <DialogDescription>{dialog === 'resets' ? 'Approving clears the password so the student sets a new one at next login.' : 'Approve students to give them access, optionally into a batch.'}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input autoFocus value={dialogSearch} onChange={e => setDialogSearch(e.target.value)} placeholder={dialog === 'resets' ? 'Search reset requests…' : 'Search registration queue…'} className="pl-9" />
          </div>
          {dialog === 'resets' && <PasswordResetRequestsPanel embedded search={dialogSearch} onResolved={refresh} />}
          {dialog === 'registrations' && <RegistrationQueue embedded search={dialogSearch} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.kind === 'password' ? 'Reset password?' : 'Reset device lock?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'password' ? `${confirm?.name} will have to set a new password the next time they sign in.` : `${confirm?.name} will be able to sign in from a new device. Their next device becomes locked in for 90 days.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={runConfirm}>Reset</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
