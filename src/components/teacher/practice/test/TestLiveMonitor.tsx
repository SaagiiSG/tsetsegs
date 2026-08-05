import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClassTestMonitor } from '@/hooks/useClassTest';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ArrowLeft, EyeOff, Loader2 } from 'lucide-react';
import { ClassTestResults } from './ClassTestResults';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function TestLiveMonitor({ testId, onBack }: { testId: string; onBack: () => void }) {
  const { test, participants, refresh } = useClassTestMonitor(testId);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [ending, setEnding] = useState(false);
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

  if (!test) {
    return <div className="p-10 text-center"><Loader2 className="h-5 w-5 mx-auto animate-spin opacity-60" /></div>;
  }

  if (test.status === 'finished' || test.status === 'cancelled') {
    return <ClassTestResults testId={testId} onBack={onBack} />;
  }

  const total = test.question_ids.length;
  const submitted = participants.filter((p) => p.submitted_at).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{test.title}</div>
          <div className="text-xs text-muted-foreground">
            {participants.length} joined · {submitted} submitted
          </div>
        </div>
        <div className="font-mono text-lg tabular-nums">{fmt(remaining ?? Math.max(0, Math.floor(((endsAt ?? 0) - Date.now()) / 1000)))}</div>
        <Button size="sm" variant="destructive" onClick={endNow} disabled={ending}>End now</Button>
      </div>

      <Card className="divide-y">
        {participants.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Waiting for students to appear — they are pulled in automatically.
          </div>
        ) : (
          participants
            .slice()
            .sort((a, b) => b.answered_count - a.answered_count)
            .map((p) => (
              <div key={p.id} className="p-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.display_name}</div>
                  <Progress value={total ? (p.answered_count / total) * 100 : 0} className="h-1.5 mt-1.5" />
                </div>
                {p.focus_violations > 0 && (
                  <Badge variant="destructive" className="gap-1 text-[10px]">
                    <EyeOff className="h-3 w-3" /> {p.focus_violations}
                  </Badge>
                )}
                <span className={cn('text-xs font-mono shrink-0', p.submitted_at ? 'text-emerald-500' : 'text-muted-foreground')}>
                  {p.submitted_at ? 'Submitted' : `${p.answered_count}/${total}`}
                </span>
              </div>
            ))
        )}
      </Card>
    </div>
  );
}
