import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StartTestDialog } from './StartTestDialog';
import { TestLiveMonitor } from './TestLiveMonitor';
import { TestJoinScreen } from './TestJoinScreen';
import { ClassTestResults } from './ClassTestResults';
import { ClipboardList, Play } from 'lucide-react';
import { format } from 'date-fns';

interface TestRow {
  id: string;
  join_code: string | null;
  title: string;
  status: string;
  starts_at: string;
  duration_seconds: number;
  batch_id: string;
  batch_label?: string;
}

export function TeacherTestTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [monitorId, setMonitorId] = useState<string | null>(null);
  const [lobby, setLobby] = useState<{ id: string; code: string } | null>(null);
  const [resultsId, setResultsId] = useState<string | null>(null);
  const [tests, setTests] = useState<TestRow[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from('class_tests')
      .select('id, join_code, title, status, starts_at, duration_seconds, batch_id')
      .order('created_at', { ascending: false })
      .limit(20);
    const rows = (data ?? []) as TestRow[];
    if (rows.length > 0) {
      const { data: bs } = await supabase
        .from('batches')
        .select('id, batch_name, nickname')
        .in('id', Array.from(new Set(rows.map((r) => r.batch_id))));
      const labels = new Map((bs ?? []).map((b: any) => [b.id, b.nickname || b.batch_name || 'Class']));
      setTests(rows.map((r) => ({ ...r, batch_label: labels.get(r.batch_id) })));
    } else {
      setTests([]);
    }
  };

  useEffect(() => {
    load();
  }, [monitorId, resultsId, dialogOpen, lobby]);

  if (lobby) {
    return (
      <TestJoinScreen
        testId={lobby.id}
        joinCode={lobby.code}
        onBack={() => setLobby(null)}
        onStarted={() => {
          setMonitorId(lobby.id);
          setLobby(null);
        }}
      />
    );
  }
  if (monitorId) {
    return <TestLiveMonitor testId={monitorId} onBack={() => setMonitorId(null)} />;
  }
  if (resultsId) {
    return <ClassTestResults testId={resultsId} onBack={() => setResultsId(null)} />;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">68 Hardest 22</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            A timed 22-question test built from the lowest-accuracy, slowest-solved problems in the 68 set. Students
            join by scanning the QR code and entering their phone number.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 shrink-0">
          <Play className="h-4 w-4" /> Start 68 Exam
        </Button>
      </Card>

      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">Recent tests</div>
        <Card className="divide-y">
          {tests.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No tests yet.</div>
          ) : (
            tests.map((t) => {
              const live = t.status === 'active' || t.status === 'scheduled';
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.status === 'scheduled' && t.join_code) setLobby({ id: t.id, code: t.join_code });
                    else if (live) setMonitorId(t.id);
                    else setResultsId(t.id);
                  }}
                  className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {t.batch_label ?? 'Class'} · {t.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {format(new Date(t.starts_at), 'MMM d, HH:mm')} · {Math.round(t.duration_seconds / 60)} min
                    </div>
                  </div>
                  <Badge variant={live ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                    {t.status === 'scheduled' ? 'Lobby' : live ? 'Live' : 'Finished'}
                  </Badge>
                </button>
              );
            })
          )}
        </Card>
      </div>

      <StartTestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onStarted={(id, code) => setLobby({ id, code })}
      />
    </div>
  );
}
