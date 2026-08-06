import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClassTestMonitor } from '@/hooks/useClassTest';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Users } from 'lucide-react';
import { ClassTestResults } from './ClassTestResults';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * While the exam runs the teacher only needs the clock and a way to end it.
 * Students work fully offline and upload their paper once at submit, so there is
 * no per-question progress to stream — results appear on the results page after.
 */
export function TestLiveMonitor({ testId, onBack }: { testId: string; onBack: () => void }) {
  const { test, participants, refresh } = useClassTestMonitor(testId);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [ending, setEnding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const autoEndedRef = useRef(false);

  const endsAt = test ? new Date(test.starts_at).getTime() + test.duration_seconds * 1000 : null;

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => setRemaining(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  useEffect(() => {
    // Only auto-finish once the clock has genuinely run out (never on first render).
    if (!test || test.status !== 'active' || endsAt === null) return;
    if (autoEndedRef.current || Date.now() < endsAt) return;
    autoEndedRef.current = true;
    supabase
      .from('class_tests')
      .update({ status: 'finished', finished_at: new Date().toISOString() })
      .eq('id', testId)
      .then(() => refresh());
  }, [remaining, test, endsAt, testId, refresh]);

  const endNow = async () => {
    setEnding(true);
    await supabase
      .from('class_tests')
      .update({ status: 'finished', finished_at: new Date().toISOString() })
      .eq('id', testId);
    setEnding(false);
    refresh();
  };

  const manualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (!test) {
    return <div className="p-10 text-center"><Loader2 className="h-5 w-5 mx-auto animate-spin opacity-60" /></div>;
  }

  if (test.status === 'finished' || test.status === 'cancelled') {
    return <ClassTestResults testId={testId} onBack={onBack} />;
  }

  const submitted = participants.filter((p) => p.submitted_at).length;
  const joined = participants.length;
  const secondsLeft = remaining ?? Math.max(0, Math.floor(((endsAt ?? 0) - Date.now()) / 1000));
  const elapsedPct = test.duration_seconds
    ? Math.min(100, ((test.duration_seconds - secondsLeft) / test.duration_seconds) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{test.title}</div>
          <div className="text-xs text-muted-foreground">Exam in progress</div>
        </div>
        <Button size="sm" variant="destructive" onClick={endNow} disabled={ending}>End now</Button>
      </div>

      <Card className="p-8 flex flex-col items-center gap-5 text-center">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Time remaining</div>
          <div className="font-mono text-6xl font-bold tabular-nums">{fmt(secondsLeft)}</div>
        </div>

        <Progress value={elapsedPct} className="h-1.5 w-full max-w-md" />

        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Users className="h-3 w-3" /> Taking the exam
            </div>
            <div className="text-2xl font-bold font-mono">{joined}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" /> Submitted
            </div>
            <div className="text-2xl font-bold font-mono">{submitted}</div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground max-w-sm">
          Students have the whole paper on their device and work offline, so nothing loads mid-exam. Every answer is
          uploaded when they submit, and the full breakdown opens here as soon as the exam ends.
        </p>

        <Button variant="outline" size="sm" className="gap-2" onClick={manualRefresh} disabled={refreshing}>
          <RefreshCw className={refreshing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          Refresh count
        </Button>
      </Card>
    </div>
  );
}
