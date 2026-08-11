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
import {
  ProctorRunner,
  type PaperRow,
  type ProctorResult,
  type ProctorModuleResult,
} from '@/components/student/proctor/ProctorRunner';
import { loadPaper, savePaper, loadSnapshot, saveSnapshot, answeredCount } from '@/components/student/proctor/proctorStorage';
import { compareAttempts, type AnswerMap } from '@/components/student/proctor/proctorConflict';
import { ProctorRecoveryScreen } from '@/components/student/proctor/ProctorRecoveryScreen';


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
  session_current_module: number | null;
  module_started_at: string | null;

  rw_correct: number | null;
  math_correct: number | null;
  rw_total: number | null;
  math_total: number | null;
  module_results: ProctorModuleResult[] | null;
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
  const [paper, setPaper] = useState<PaperRow[] | null>(() => {
    const pid = localStorage.getItem(KEY + code);
    return pid ? loadPaper(pid) : null;
  });
  const [done, setDone] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [result, setResult] = useState<ProctorResult | null>(null);
  const [resolvedChoice, setResolvedChoice] = useState(false);
  const entryRef = useRef<{ saved: number; conflict: boolean } | null>(null);



  /* ---------- poll my own state ---------- */
  const loadState = useCallback(async () => {
    if (!participantId) return;
    const { data, error } = await supabase.rpc('proctor_state', { p_participant_id: participantId });
    const row = (Array.isArray(data) ? data[0] : data) as unknown as State | undefined;
    if (error || !row) {
      // no network? keep the student in their test using the cached paper
      if (loadPaper(participantId)) {
        setLoading(false);
        return;
      }
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
      if (error) {
        const cached = loadPaper(participantId);
        if (cached) return setPaper(cached);
        return toast.error('Could not download the test paper — retrying');
      }
      const rows = (data ?? []) as PaperRow[];
      savePaper(participantId, rows);
      setPaper(rows);
    })();
  }, [participantId, state?.oath_accepted, state?.session_status, paper]);

  /* ---------- auto-resume the moment the device is back online ----------
     No prompt, no lost work: pull fresh state, re-download the paper if the
     cache is empty, and drop the student straight back into their attempt. */
  useEffect(() => {
    if (!participantId) return;
    const onOnline = async () => {
      const hadAttempt = answeredCount(loadSnapshot(participantId)?.answers ?? {}) > 0;
      await loadState();
      if (!loadPaper(participantId)) {
        const { data } = await supabase.rpc('proctor_paper', { p_participant_id: participantId });
        const rows = (data ?? []) as PaperRow[];
        if (rows.length > 0) {
          savePaper(participantId, rows);
          setPaper(rows);
        }
      }
      if (hadAttempt) {
        setResumed(true);
        toast.success('Back online — your saved answers are restored');
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [participantId, loadState]);



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
    const mods = (result?.module_results ?? state.module_results ?? []) as ProctorModuleResult[];
    const correct = (result?.math_correct ?? state.math_correct ?? 0) + (result?.rw_correct ?? state.rw_correct ?? 0);
    const total = (result?.math_total ?? state.math_total ?? 0) + (result?.rw_total ?? state.rw_total ?? 0);
    return (
      <Shell>
        <h1 className="text-lg font-semibold">Your test is submitted</h1>
        {total > 0 ? (
          <>
            <div className="rounded-xl border p-4 text-center">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Raw score</div>
              <div className="text-3xl font-mono font-bold">
                {correct}
                <span className="text-base text-muted-foreground">/{total}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{total - correct} wrong or blank</div>
            </div>
            {mods.length > 0 && (
              <div className="space-y-1.5">
                {[...mods]
                  .sort((a, b) => a.module - b.module)
                  .map((m) => (
                    <div key={`${m.section}-${m.module}`} className="flex items-center justify-between text-sm rounded-lg bg-muted/40 px-3 py-2">
                      <span className="capitalize">
                        Module {m.module} · {m.section}
                      </span>
                      <span className="font-mono font-semibold">
                        {m.correct}/{m.total}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Your teacher has the full breakdown — they will go through the paper in class. You can close this page.
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

  /* ---------- 5. recovery: device copy vs online copy ---------- */
  const snap = loadSnapshot(participantId);
  const deviceAnswers = (snap?.answers ?? {}) as AnswerMap;
  const serverAnswers = (state.answers ?? {}) as AnswerMap;
  const report = compareAttempts(deviceAnswers, serverAnswers);
  const savedModule = Math.max(snap?.module ?? 1, state.current_module ?? 1);

  /* These two screens are entry gates only. Freezing the decision on the first
     render stops the 5s state poll from yanking a student mid-test back to
     "Continue where you left off" the moment their first answer lands. */
  if (entryRef.current === null) {
    entryRef.current = {
      saved: Math.max(report.deviceCount, report.serverCount),
      conflict: report.needsChoice,
    };
  }
  const savedAnswers = entryRef.current.saved;

  if (!resolvedChoice && entryRef.current.conflict) {

    const chooseCopy = (answers: AnswerMap, label: string) => {
      // Make the choice the single source of truth on both sides before resuming.
      saveSnapshot(participantId, {
        module: savedModule,
        qIdx: snap?.qIdx ?? 0,
        answers,
        violations: Math.max(snap?.violations ?? 0, state.focus_violations ?? 0),
        savedAt: Date.now(),
      });
      setState((prev) => (prev ? { ...prev, answers } : prev));
      void supabase.rpc('proctor_save_progress', {
        p_participant_id: participantId,
        p_answers: answers,
        p_module: savedModule,
        p_violations: Math.max(snap?.violations ?? 0, state.focus_violations ?? 0),
      });
      setResolvedChoice(true);
      setResumed(true);
      toast.success(
        label === 'combined'
          ? 'All your saved answers are restored'
          : label === 'device'
            ? "Continuing with this device's answers"
            : 'Continuing with your online answers',
      );
    };
    return (
      <ProctorRecoveryScreen
        report={report}
        device={deviceAnswers}
        server={serverAnswers}
        savedAt={snap?.savedAt}
        onChoose={chooseCopy}
      />
    );
  }

  if (!resumed && savedAnswers > 0) {

    return (
      <Shell>
        <Timer className="h-8 w-8 text-primary mx-auto" />
        <div className="text-center space-y-1">
          <h1 className="text-lg font-semibold">Continue where you left off</h1>
          <p className="text-sm text-muted-foreground">
            Module {savedModule}
            {snap?.qIdx != null ? ` · question ${snap.qIdx + 1}` : ''} · {savedAnswers} answers saved.
          </p>
          <p className="text-xs text-muted-foreground">
            Your module timer kept running, so go back in as soon as you're ready.
          </p>
        </div>
        <Button className="w-full h-11" onClick={() => setResumed(true)}>
          Resume my test
        </Button>
      </Shell>
    );
  }

  /* ---------- 6. the test ---------- */
  return (
    <ProctorRunner
      participantId={participantId}
      title={state.session_title}
      displayName={state.display_name}
      paper={paper}
      initialAnswers={state.answers ?? {}}
      initialModule={state.current_module ?? 1}
      sessionModule={state.session_current_module}
      moduleStartedAt={state.module_started_at}
      ended={(state.session_status as string) === 'finished'}

      onDone={(res) => {
        if (res) setResult(res);
        setDone(true);
        loadState();
      }}
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
