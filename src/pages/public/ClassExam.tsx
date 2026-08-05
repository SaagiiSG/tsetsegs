import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { ClassTestRunner } from '@/components/student/test/ClassTestRunner';
import type { ClassTest } from '@/hooks/useClassTest';

interface JoinResult {
  participant_id: string;
  test_id: string;
  display_name: string;
  submitted_at: string | null;
  title: string;
  question_ids: any;
  duration_seconds: number;
  starts_at: string;
  status: string;
}

const STORAGE_PREFIX = 'class-exam:';

export default function ClassExam() {
  const { joinCode = '' } = useParams();
  const code = joinCode.toUpperCase();
  const [phone, setPhone] = useState('');
  const [joining, setJoining] = useState(false);
  const joiningRef = useRef(false);
  const [joined, setJoined] = useState<JoinResult | null>(null);
  const [test, setTest] = useState<ClassTest | null>(null);
  const [loadingTest, setLoadingTest] = useState(true);
  const [exited, setExited] = useState(false);

  /* ---------- live test row (public read) ----------
     Only swap state when something meaningful changed. Returning a fresh object
     on every poll made `test.question_ids` a new reference, which re-triggered the
     runner's question fetch + KaTeX render every few seconds (the "freeze"). */
  const loadTest = useCallback(async () => {
    if (!code) return;
    const { data } = await supabase
      .from('class_tests')
      .select('*')
      .eq('join_code', code)
      .order('created_at', { ascending: false })
      .limit(1);
    const row = data?.[0];
    const next = row
      ? ({ ...row, question_ids: Array.isArray(row.question_ids) ? row.question_ids : [] } as ClassTest)
      : null;
    setTest((prev) => {
      if (!prev || !next) return prev === next ? prev : next;
      const same =
        prev.id === next.id &&
        prev.status === next.status &&
        prev.title === next.title &&
        prev.starts_at === next.starts_at &&
        prev.duration_seconds === next.duration_seconds &&
        (prev.question_ids as string[]).join(',') === (next.question_ids as string[]).join(',');
      return same ? prev : next;
    });
    setLoadingTest(false);
  }, [code]);

  useEffect(() => {
    loadTest();
    const t = setInterval(loadTest, 8000);
    return () => clearInterval(t);
  }, [loadTest]);

  // Realtime: teacher start/finish lands instantly without a periodic full pass.
  useEffect(() => {
    if (!code) return;
    const channel = supabase
      .channel(`class-exam-${code}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'class_tests', filter: `join_code=eq.${code}` },
        () => loadTest(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, loadTest]);


  /* ---------- remember the join so a refresh doesn't lose the seat ---------- */
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_PREFIX + code);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved?.phone) setPhone(saved.phone);
    } catch {
      /* ignore */
    }
  }, [code]);

  const join = async (rawPhone: string, silent = false) => {
    if (joiningRef.current || joined) return false;
    joiningRef.current = true;
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc('class_test_join', {
        p_join_code: code,
        p_phone: rawPhone,
      });
      const row = (Array.isArray(data) ? data[0] : data) as JoinResult | undefined;
      if (error || !row) {
        if (!silent) toast.error(error?.message ?? 'Could not join this exam');
        return false;
      }
      localStorage.setItem(STORAGE_PREFIX + code, JSON.stringify({ phone: rawPhone }));
      setJoined(row);
      return true;
    } finally {
      joiningRef.current = false;
      setJoining(false);
    }
  };


  // Auto re-join after a refresh with the remembered number.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_PREFIX + code);
    if (!raw || joined || !test) return;
    try {
      const saved = JSON.parse(raw);
      if (saved?.phone) join(saved.phone, true);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, test]);

  if (loadingTest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin opacity-60" />
      </div>
    );
  }

  if (!test || test.status === 'cancelled') {
    return (
      <Shell>
        <h1 className="text-lg font-semibold">This exam link isn't active</h1>
        <p className="text-sm text-muted-foreground">
          Ask your teacher to show the QR code again, or check the code you typed.
        </p>
      </Shell>
    );
  }

  const finished = test.status === 'finished';

  /* ---------- phone gate ---------- */
  if (!joined) {
    if (finished) {
      return (
        <Shell>
          <h1 className="text-lg font-semibold">This exam has ended</h1>
          <p className="text-sm text-muted-foreground">Your teacher will go through the results in class.</p>
        </Shell>
      );
    }
    return (
      <Shell>
        <div className="space-y-1 text-center">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Class exam</div>
          <h1 className="text-xl font-semibold">{test.title}</h1>
          <p className="text-sm text-muted-foreground">
            {(test.question_ids as string[]).length} questions · {Math.round(test.duration_seconds / 60)} minutes
          </p>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            join(phone);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs">Your phone number</Label>
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
          <Button type="submit" className="w-full h-11" disabled={joining || phone.replace(/\D/g, '').length < 8}>
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enter exam'}
          </Button>
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Only numbers registered in this class can join. Your result is saved to your student profile.
          </p>
        </form>
      </Shell>
    );
  }

  /* ---------- lobby ---------- */
  if (test.status === 'scheduled') {
    return (
      <Shell>
        <Timer className="h-8 w-8 text-primary mx-auto" />
        <div className="text-center space-y-1">
          <h1 className="text-lg font-semibold">You're in, {joined.display_name}</h1>
          <p className="text-sm text-muted-foreground">
            Waiting for your teacher to start the exam. Keep this screen open.
          </p>
        </div>
      </Shell>
    );
  }

  if (exited) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold">Your exam is submitted</h1>
        <p className="text-sm text-muted-foreground">You can close this page.</p>
      </Shell>
    );
  }

  return (
    <ClassTestRunner
      test={test}
      participantId={joined.participant_id}
      alreadySubmitted={!!joined.submitted_at}
      ended={finished}
      onExit={() => setExited(true)}
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
