import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCenter } from './centerContext';
import { SkyListSkeleton } from './SkySkeleton';
import { historyLine, testCardAction, testCardLine, type PracticeTest } from './practiceTests';

type Attempt = { id: string; test_name: string; started_at: string; status: string; current_module: number; math_score: number | null };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthYear = (t: PracticeTest) => [t.test_month ? MONTHS[t.test_month - 1] : null, t.test_year].filter(Boolean).join(' ');

function Failed({ onRetry }: { onRetry: () => void }) {
  return <div className="sky-card space-y-3"><p role="alert">Could not load your tests.</p><Button variant="outline" onClick={onRetry}>Try again</Button></div>;
}

export function CenterPracticeTests({ studentId }: { studentId: string }) {
  const { center } = useCenter();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const tests = useQuery({ queryKey: ['center-tests', center.id, 'list', studentId], queryFn: async () => {
    const { data, error } = await supabase.rpc('tenant_practice_tests' as never, { _institution: center.id } as never); if (error) throw error;
    return (data ?? []) as unknown as PracticeTest[];
  } });
  const history = useQuery({ queryKey: ['center-tests', center.id, 'history', studentId], queryFn: async () => {
    // No select('*'): the paper column is not readable by students.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.from('tenant_test_attempts' as any).select('id, test_name, started_at, status, current_module, math_score')
      .eq('institution_id', center.id).eq('student_id', studentId).order('started_at', { ascending: false }).limit(100); if (error) throw error;
    return (data ?? []) as unknown as Attempt[];
  } });
  async function start(t: PracticeTest) {
    setBusy(t.id);
    try {
      const { data, error } = await supabase.rpc('tenant_test_start' as never, { _institution: center.id, _test: t.id } as never); if (error) throw error;
      navigate(`/student/tests/${data}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not start the test. Try again.'); }
    finally { setBusy(null); }
  }
  return <div className="space-y-6 max-w-3xl">
    <header><h1 className="text-3xl font-bold">Practice tests</h1><p className="text-muted-foreground mt-2">Tsetsegs SAT Math tests. Practice scores are estimates, not official SAT scores.</p></header>
    <Tabs defaultValue="tests">
      <TabsList><TabsTrigger value="tests">Tests</TabsTrigger><TabsTrigger value="history">My test history</TabsTrigger></TabsList>
      <TabsContent value="tests" className="space-y-3">
        {tests.isLoading ? <SkyListSkeleton /> : tests.error ? <Failed onRetry={() => tests.refetch()} /> : !tests.data?.length ? <p className="text-muted-foreground">No tests are available yet.</p> :
          tests.data.map(t => <div key={t.id} className="sky-card flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0"><p className="font-semibold">{t.name}</p>
              {monthYear(t) && <p className="text-sm text-muted-foreground">{monthYear(t)}</p>}
              <p className="text-sm text-muted-foreground">{testCardLine(t)}</p>
              {t.last_score != null && <p className="text-sm">Last score {t.last_score}</p>}</div>
            <Button className="sky-btn sky-btn-blue" disabled={busy === t.id} onClick={() => t.open_attempt ? navigate(`/student/tests/${t.open_attempt}`) : start(t)}>{testCardAction(t)}</Button>
          </div>)}
      </TabsContent>
      <TabsContent value="history" className="space-y-3">
        {history.isLoading ? <SkyListSkeleton /> : history.error ? <Failed onRetry={() => history.refetch()} /> : !history.data?.length ? <p className="text-muted-foreground">Your finished tests will appear here.</p> :
          history.data.map(a => <div key={a.id} className="sky-card flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0"><p className="font-semibold">{a.test_name}</p><p className="text-sm text-muted-foreground">{new Date(a.started_at).toLocaleDateString()}</p>
              <p className="text-sm">{historyLine(a)}</p></div>
            <Button variant="outline" onClick={() => navigate(`/student/tests/${a.id}`)}>{a.status === 'completed' ? 'Review' : 'Resume'}</Button>
          </div>)}
      </TabsContent>
    </Tabs>
  </div>;
}
