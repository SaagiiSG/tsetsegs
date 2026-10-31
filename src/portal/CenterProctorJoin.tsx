import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useCenter } from './centerContext';
import { useExamLock } from './examLock';

type ProctorState = { title: string; status: 'lobby' | 'active' | 'finished'; review_mode: string; started_at: string | null; unlocked: boolean; oath: boolean; attempt_status: 'in_progress' | 'completed'; current_module: number };
const rpc = (name: string, args: object) => supabase.rpc(name as never, args as never);
const message = (e: unknown) => (e instanceof Error ? e.message : (e as { message?: string } | null)?.message) ?? '';

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="sky-card max-w-md mx-auto space-y-4" data-popup-hold>{children}</div>;
}

export function CenterProctorJoin() {
  const { code = '' } = useParams();
  const { center } = useCenter();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [unlock, setUnlock] = useState('');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Joining is safe to repeat: the server hands back the same attempt.
  const join = useQuery({ queryKey: ['center-proctor-join', center.id, code], retry: false, staleTime: Infinity, queryFn: async () => {
    const { data, error } = await rpc('tenant_proctor_join', { _institution: center.id, _join_code: code }); if (error) throw error;
    return data as unknown as string;
  } });
  const attemptId = join.data;
  const state = useQuery({ queryKey: ['center-proctor-state', attemptId], enabled: !!attemptId, retry: 2, refetchInterval: 5000, queryFn: async () => {
    const { data, error } = await rpc('tenant_proctor_state', { _attempt: attemptId }); if (error) throw error;
    return data as unknown as ProctorState;
  } });
  const s = state.data;
  const goToTest = !!s && ((s.status === 'active' && s.unlocked && s.oath) || (s.status === 'finished' && s.attempt_status === 'completed'));
  useEffect(() => { if (goToTest && attemptId) navigate(`/student/tests/${attemptId}`, { replace: true }); }, [goToTest, attemptId, navigate]);

  // Locked from the oath screen on (the redirect and waiting room included), until the session ends.
  useExamLock(!!s && s.unlocked && s.status !== 'finished');

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError('');
    try { await fn(); await qc.invalidateQueries({ queryKey: ['center-proctor-state', attemptId] }); } catch (e) { setError(message(e) || 'Something went wrong. Try again.'); } finally { setBusy(false); }
  }
  const submitUnlock = () => run(async () => {
    const { data, error } = await rpc('tenant_proctor_unlock', { _attempt: attemptId, _code: unlock.trim() }); if (error) throw error;
    if (!data) throw new Error("That code didn't work");
  });
  const acceptOath = () => run(async () => { const { error } = await rpc('tenant_proctor_oath', { _attempt: attemptId }); if (error) throw error; });

  const back = <Button variant="outline" className="w-full" onClick={() => navigate('/student/tests')}>Back to practice tests</Button>;
  if (join.isLoading) return <Screen><p className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Joining…</p></Screen>;
  if (join.error || !attemptId) return <Screen><p role="alert">{message(join.error) || "This code isn't open"}</p>{back}</Screen>;
  // Only a missing attempt means the session is gone; a failed poll keeps the last state on screen.
  if (state.error && /not allowed/i.test(message(state.error))) return <Screen><p role="alert">This session has ended</p>{back}</Screen>;
  if (state.error && !s) return <Screen><p role="alert">Could not load. Check your connection.</p><Button variant="outline" onClick={() => state.refetch()}>Try again</Button></Screen>;
  if (!s || goToTest) return <Screen><p className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Loading…</p></Screen>;
  if (s.status === 'finished') return <Screen><p role="alert">This session has ended</p>{back}</Screen>;

  if (!s.unlocked) return <Screen>
    <div className="space-y-1"><h1 className="text-xl font-semibold">{s.title}</h1><p className="text-sm text-muted-foreground">Enter the code your teacher gave you.</p></div>
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); void submitUnlock(); }}>
      <Input aria-label="Unlock code" autoFocus autoComplete="off" value={unlock} onChange={e => setUnlock(e.target.value)} placeholder="Unlock code"/>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="sky-btn sky-btn-blue w-full" disabled={busy || !unlock.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Unlock'}</Button>
    </form>
  </Screen>;

  if (!s.oath) return <Screen>
    <div className="space-y-1"><h1 className="text-xl font-semibold">Test-taker oath</h1><p className="text-sm text-muted-foreground">Read it, then confirm to enter the room.</p></div>
    <div className="rounded-md border p-3 text-sm space-y-2">
      <p>I will do my own work on this test.</p>
      <p>I will not use notes, another device, or help from anyone else.</p>
      <p>I will not copy, photograph, or share any question from this test.</p>
      <p>I will stay on this screen until I submit.</p>
    </div>
    <label className="flex items-start gap-2 text-sm cursor-pointer"><Checkbox checked={checked} onCheckedChange={v => setChecked(!!v)} className="mt-0.5"/><span>I agree, and I understand that breaking the oath voids my score.</span></label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button className="sky-btn sky-btn-blue w-full" disabled={busy || !checked} onClick={() => void acceptOath()}>{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : 'I agree'}</Button>
  </Screen>;

  return <Screen>
    <Timer className="h-8 w-8 mx-auto"/>
    <div className="text-center space-y-1"><h1 className="text-xl font-semibold">{s.title}</h1><p className="text-sm text-muted-foreground" role="status">You're ready. Your teacher will start the test soon. Keep this page open.</p></div>
  </Screen>;
}
