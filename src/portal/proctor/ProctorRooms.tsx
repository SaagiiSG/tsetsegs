import { useCallback, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { ArrowLeft, Copy, Eye, EyeOff, Loader2, Play, RefreshCw, ShieldCheck, Square, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { isLateJoin, rosterState, type RosterState } from './proctorModel';

const CARD = 'admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-4 md:p-5 space-y-3';
const rpc = (name: string, args: object) => supabase.rpc(name as never, args as never);

export type Session = {
  id: string; title: string | null; join_code: string; unlock_code: string;
  status: 'lobby' | 'active' | 'finished'; review_mode: 'off' | 'correctness' | 'explanations'; started_at: string | null;
};
type Row = {
  id: string; name: string; started_at: string; code_verified_at: string | null; oath_accepted_at: string | null;
  current_module: number; focus_violations: number; status: string; math_score: number | null; math_correct: number | null; math_total: number | null;
};

/** Session + roster, polled. `ms` is 4000 in the lobby and 6000 in the monitor. */
function useRoom(id: string, ms: number) {
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        supabase.from('tenant_proctor_sessions' as any).select('id, title, join_code, unlock_code, status, review_mode, started_at').eq('id', id).maybeSingle(),
        supabase.from('tenant_test_attempts' as any).select('id, student_id, started_at, code_verified_at, oath_accepted_at, current_module, focus_violations, status, math_score, math_correct, math_total').eq('session_id', id).order('started_at'),
      ]);
      if (s.error) throw s.error;
      if (a.error) throw a.error;
      const att = (a.data ?? []) as any[];
      const ids = att.map(x => x.student_id);
      const names = new Map<string, string>();
      if (ids.length) {
        const { data } = await supabase.from('tenant_students' as any).select('id, name').in('id', ids);
        ((data ?? []) as any[]).forEach(x => names.set(x.id, x.name));
      }
      setSession(s.data as unknown as Session | null);
      setRows(att.map(x => ({ ...x, name: names.get(x.student_id) ?? 'Student' })));
      setFailed(false);
    } catch { setFailed(true); }
  }, [id]);
  useEffect(() => { load(); const t = setInterval(load, ms); return () => clearInterval(t); }, [load, ms]);
  return { session, rows, failed, load, setSession };
}

function Header({ title, sub, onBack, children }: { title: string; sub: string; onBack: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack} aria-label="Back"><ArrowLeft className="h-4 w-4" /></Button>
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold truncate">{title}</h2><p className="text-xs text-muted-foreground">{sub}</p></div>
      {children}
    </div>
  );
}

const Loading = ({ failed, onBack }: { failed: boolean; onBack: () => void }) => failed ? (
  <div className={CARD}><p role="alert" className="text-sm">Could not load this session.</p><Button variant="outline" onClick={onBack}>Back</Button></div>
) : <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

const STATE_LABEL: Record<RosterState, string> = { joined: 'joined', unlocked: 'unlocked', oath: 'oath done', testing: 'testing', done: 'done' };

function ReviewModeControl({ session, onChange }: { session: Session; onChange: (m: Session['review_mode']) => void }) {
  const [saving, setSaving] = useState(false);
  const update = async (next: Session['review_mode']) => {
    const prev = session.review_mode;
    onChange(next); setSaving(true);
    const { error } = await supabase.from('tenant_proctor_sessions' as any).update({ review_mode: next }).eq('id', session.id);
    setSaving(false);
    if (error) { onChange(prev); return toast.error('Could not change what students see.'); }
    toast.success(next === 'off' ? 'Review locked' : 'Review unlocked for students');
  };
  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 text-xs font-semibold"><Eye className="h-4 w-4 text-primary" /> After the test, what students see</div>
      <Label className="sr-only" htmlFor="review-mode">Review mode</Label>
      <Select value={session.review_mode} onValueChange={v => update(v as Session['review_mode'])} disabled={saving}>
        <SelectTrigger id="review-mode"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="off">Score only</SelectItem>
          <SelectItem value="correctness">Right or wrong per question</SelectItem>
          <SelectItem value="explanations">Answers and explanations</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">Review opens once a student submits, or after you end the session. You can change this any time.</p>
    </div>
  );
}

export function ProctorLobby({ sessionId, onBack, onStarted }: { sessionId: string; onBack: () => void; onStarted: () => void }) {
  const { session, rows, failed, load, setSession } = useRoom(sessionId, 4000);
  const [show, setShow] = useState(false);
  const [working, setWorking] = useState(false);
  // Started or ended from another tab: the lobby has nothing left to do.
  const gone = !!session && session.status !== 'lobby';
  useEffect(() => { if (gone) onStarted(); }, [gone, onStarted]);
  if (!session) return <Loading failed={failed} onBack={onBack} />;
  const url = `${window.location.origin}/proctor/${session.join_code}`;
  const ready = rows.filter(r => r.oath_accepted_at).length;

  const rotate = async () => {
    setWorking(true);
    const { data, error } = await rpc('tenant_proctor_rotate_unlock', { _session: sessionId });
    setWorking(false);
    if (error) return toast.error('Could not make a new code.');
    setSession({ ...session, unlock_code: data as unknown as string });
    toast.success('New unlock code');
  };
  const start = async () => {
    setWorking(true);
    const { error } = await rpc('tenant_proctor_start', { _session: sessionId });
    setWorking(false);
    if (error) {
      // The session moved on without us; the next poll sends us to the monitor.
      if (/already started|ended/i.test(error.message)) { toast.error('This session already started.'); load(); return; }
      return toast.error('Could not start the test. Try again.');
    }
    onStarted();
  };
  // Never started, so finalize deletes every attempt and keeps no score.
  const cancel = async () => {
    setWorking(true);
    const { error } = await rpc('tenant_proctor_finalize', { _session: sessionId });
    setWorking(false);
    if (error) return toast.error('Could not cancel the session. Try again.');
    toast.success('Session cancelled');
    onBack();
  };

  return (
    <div className="space-y-4">
      <Header title={session.title ?? 'Proctored test'} sub="Lobby, waiting for students" onBack={onBack} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className={`${CARD} flex flex-col items-center gap-4`}>
          <div className="bg-white p-4 rounded-xl"><QRCode value={url} size={200} level="H" /></div>
          <div className="text-center space-y-1 max-w-full">
            <p className="text-3xl sm:text-4xl font-mono font-bold tracking-[0.3em]">{session.join_code}</p>
            <p className="text-xs text-muted-foreground break-all">{url}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => { navigator.clipboard?.writeText(url); toast.success('Link copied'); }}>
            <Copy className="h-4 w-4" /> Copy link
          </Button>
        </div>
        <div className="space-y-4 min-w-0">
          <div className={CARD}>
            <div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Unlock code (read it out loud)</div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-2xl font-mono font-bold tracking-[0.2em]">{show ? session.unlock_code : '••••••'}</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShow(v => !v)} aria-label={show ? 'Hide code' : 'Show code'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={rotate} disabled={working} aria-label="New code"><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Students enter this after joining, then take the oath.</p>
          </div>
          <div className={CARD}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold"><Users className="h-4 w-4 text-primary" /> Joined</div>
              <Badge variant="secondary" className="font-mono text-[11px]">{ready}/{rows.length} ready</Badge>
            </div>
            <div className="max-h-[280px] overflow-y-auto divide-y">
              {rows.length === 0 ? <p className="text-xs text-muted-foreground py-6 text-center">Nobody has scanned yet.</p> : rows.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                  <span className="truncate">{r.name}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{STATE_LABEL[rosterState(r)]}</span>
                </div>
              ))}
            </div>
          </div>
          <ReviewModeControl session={session} onChange={m => setSession({ ...session, review_mode: m })} />
          <Button className="w-full gap-2" onClick={start} disabled={working || rows.length === 0}>
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Start for everyone
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2" disabled={working}><Square className="h-4 w-4" /> Cancel session</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
                <AlertDialogDescription>Students who joined are removed and no scores are kept.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Keep the lobby</AlertDialogCancel><AlertDialogAction onClick={cancel}>Cancel session</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

export function ProctorMonitor({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const { session, rows, failed, load, setSession } = useRoom(sessionId, 6000);
  const [ending, setEnding] = useState(false);
  if (!session) return <Loading failed={failed} onBack={onBack} />;
  const done = rows.filter(r => r.status === 'completed').length;
  const end = async () => {
    setEnding(true);
    const { error } = await rpc('tenant_proctor_finalize', { _session: sessionId });
    setEnding(false);
    if (error) return toast.error('Could not end the session. Try again.');
    toast.success('Session ended. Results are in.');
    load();
  };
  return (
    <div className="space-y-4">
      <Header title={session.title ?? 'Proctored test'} sub={`${session.status === 'finished' ? 'Finished' : 'In progress'} · ${done}/${rows.length} submitted`} onBack={onBack}>
        {session.status !== 'finished' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2 shrink-0" disabled={ending}>
                {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />} Force end
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End this test for everyone?</AlertDialogTitle>
                <AlertDialogDescription>Students still working will be stopped and graded on what they answered.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Keep going</AlertDialogCancel><AlertDialogAction onClick={end}>End test</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </Header>
      <ReviewModeControl session={session} onChange={m => setSession({ ...session, review_mode: m })} />
      <div className="admin-glass-card admin-glass-neutral rounded-3xl border divide-y">
        <div className="flex items-center gap-2 p-3 text-xs font-semibold text-muted-foreground"><Users className="h-4 w-4" /> Roster</div>
        {rows.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No students in this session.</p> : rows.map(r => {
          const st = rosterState(r, session.status !== 'lobby');
          return (
            <div key={r.id} className="p-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-sm truncate flex-1 min-w-[8rem]">{r.name}</span>
              {isLateJoin(r.started_at, session.started_at) && <Badge variant="outline" className="text-[10px] font-mono">late join</Badge>}
              {r.focus_violations > 0 && <Badge variant="destructive" className="text-[10px] font-mono">{r.focus_violations} focus</Badge>}
              <Badge variant="secondary" className="text-[10px] font-mono">
                {st === 'done' ? (r.math_total ? `${r.math_correct ?? 0}/${r.math_total}${r.math_score != null ? ` · ${r.math_score}` : ''}` : 'submitted') : st === 'testing' ? `module ${r.current_module + 1}` : STATE_LABEL[st]}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
