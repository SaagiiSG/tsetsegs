import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldCheck, Timer, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { ProctorRunner, type PaperRow } from '@/components/student/proctor/ProctorRunner';

interface State {
  display_name: string;
  code_verified: boolean;
  oath_accepted: boolean;
  current_module: number;
  answers: Record<string, string>;
  focus_violations: number;
  submitted_at: string | null;
  session_status: string;
  session_title: string;
}

const KEY = 'proctor-exam:';

export default function ProctorExam() {
  const { joinCode = '' } = useParams();
  const code = joinCode.toUpperCase();

  const [participantId, setParticipantId] = useState<string | null>(() => localStorage.getItem(KEY + code));
  const [phone, setPhone] = useState('');
  const [unlock, setUnlock] = useState('');
  const [oathChecked, setOathChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(!!participantId);
  const [paper, setPaper] = useState<PaperRow[] | null>(null);
  const [done, setDone] = useState(false);

  /* ---------- poll my own state ---------- */
  const loadState = useCallback(async () => {
    if (!participantId) return;
    const { data, error } = await supabase.rpc('proctor_state', { p_participant_id: participantId });
    const row = (Array.isArray(data) ? data[0] : data) as State | undefined;
    if (error || !row) {
      // stale participant (session deleted) — start over
      localStorage.removeItem(KEY + code);
      setParticipantId(null);
      setState(null);
      setLoading(false);
      return;
    }
    setState({ ...row, answers: (row.answers ?? {}) as Record<string, string> });
    setLoading(false);
  }, [participantId, code]);

  useEffect(() => {
    loadState();
    const t = setInterval(loadState, 5000);
    return () => clearInterval(t);
  }, [loadState]);

  /* ---------- pull the paper once the oath is accepted and the test is live ---------- */
  useEffect(() => {
    if (!participantId || !state?.oath_accepted || state.session_status !== 'active' || paper) return;
    (async () => {
      const { data, error } = await supabase.rpc('proctor_paper', { p_participant_id: participantId });
      if (error) return toast.error('Could not download the test paper — retrying');
      setPaper((data ?? []) as PaperRow[]);
    })();
  }, [participantId, state?.oath_accepted, state?.session_status, paper]);

  const guard = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await fn();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const join = () =>
    guard(async () => {
      const { data, error } = await supabase.rpc('proctor_join', { p_join_code: code, p_phone: phone });
      const row = (Array.isArray(data) ? data[0] : data) as { participant_id: string } | undefined;
      if (error || !row) return void toast.error(error?.message ?? 'Could not join this test');
      localStorage.setItem(KEY + code, row.participant_id);
      setParticipantId(row.participant_id);
    });

  const verifyCode = () =>
    guard(async () => {
      const { data, error } = await supabase.rpc('proctor_unlock', {
        p_participant_id: participantId!,
        p_code: unlock,
      });
      if (error) return void toast.error(error.message);
      if (!data) return void toast.error('That code is wrong — ask your proctor to repeat it');
      await loadState();
    });

  const acceptOath = () =>
    guard(async () => {
      const { data, error } = await supabase.rpc('proctor_accept_oath', { p_participant_id: participantId! });
      if (error) return void toast.error(error.message);
      if (!data) return void toast.error('Enter the unlock code first');
      await loadState();
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin opacity-60" />
      </div>
    );
  }

  /* ---------- 1. phone gate ---------- */
  if (!participantId || !state) {
    return (
      <Shell>
        <div className="text-center space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Proctored test</div>
          <h1 className="text-xl font-semibold">Join with your phone number</h1>
          <p className="text-sm text-muted-foreground font-mono">{code}</p>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            join();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs">Phone number</Label>
            <Input
              id="phone"
              inputMode="numeric"
              autoFocus
              placeholder="8 digits"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 text-center text-lg font-mono tracking-widest"
            />
          </div>
          <Button type="submit" className="w-full h-11" disabled={busy || phone.replace(/\D/g, '').length < 8}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
          </Button>
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Only numbers registered with us can sit this test.
          </p>
        </form>
      </Shell>
    );
  }

  if (done || state.submitted_at) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold">Your test is submitted</h1>
        <p className="text-sm text-muted-foreground">
          Scores are with your teacher — they will go through the paper in class. You can close this page.
        </p>
      </Shell>
    );
  }

  if (state.session_status === 'finished' && !paper) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold">This session has ended</h1>
        <p className="text-sm text-muted-foreground">Ask your teacher for the results.</p>
      </Shell>
    );
  }

  /* ---------- 2. unlock code ---------- */
  if (!state.code_verified) {
    return (
      <Shell>
        <LockKeyhole className="h-8 w-8 text-primary mx-auto" />
        <div className="text-center space-y-1">
          <h1 className="text-lg font-semibold">Hi {state.display_name}</h1>
          <p className="text-sm text-muted-foreground">Type the 6-character code your proctor reads out.</p>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            verifyCode();
          }}
        >
          <Input
            autoFocus
            value={unlock}
            onChange={(e) => setUnlock(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="h-12 text-center text-2xl font-mono tracking-[0.3em] uppercase"
          />
          <Button type="submit" className="w-full h-11" disabled={busy || unlock.trim().length < 6}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
          </Button>
        </form>
      </Shell>
    );
  }

  /* ---------- 3. oath ---------- */
  if (!state.oath_accepted) {
    return (
      <Shell>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Test-taker oath</h1>
          <p className="text-sm text-muted-foreground">Read it, then confirm to enter the room.</p>
        </div>
        <Card className="p-3 text-sm bg-muted/30 space-y-2">
          <p>I will do my own work on this test.</p>
          <p>I will not use notes, another device, or help from anyone else.</p>
          <p>I will not copy, photograph, or share any question from this test.</p>
          <p>I will stay on this screen until I submit.</p>
        </Card>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <Checkbox checked={oathChecked} onCheckedChange={(v) => setOathChecked(!!v)} className="mt-0.5" />
          <span>I agree, and I understand that breaking the oath voids my score.</span>
        </label>
        <Button className="w-full h-11" disabled={busy || !oathChecked} onClick={acceptOath}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'I accept'}
        </Button>
      </Shell>
    );
  }

  /* ---------- 4. waiting room ---------- */
  if (state.session_status !== 'active' || !paper) {
    return (
      <Shell>
        <Timer className="h-8 w-8 text-primary mx-auto" />
        <div className="text-center space-y-1">
          <h1 className="text-lg font-semibold">You're ready, {state.display_name}</h1>
          <p className="text-sm text-muted-foreground">
            {state.session_status === 'active'
              ? 'Downloading your paper…'
              : 'Waiting for your proctor to start. Keep this screen open.'}
          </p>
        </div>
      </Shell>
    );
  }

  /* ---------- 5. the test ---------- */
  return (
    <ProctorRunner
      participantId={participantId}
      title={state.session_title}
      displayName={state.display_name}
      paper={paper}
      initialAnswers={state.answers ?? {}}
      initialModule={state.current_module ?? 1}
      ended={state.session_status === 'finished'}
      onDone={() => setDone(true)}
    />
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-sm p-6 space-y-5">{children}</Card>
    </div>
  );
}
