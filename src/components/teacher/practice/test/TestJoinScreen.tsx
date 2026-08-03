import { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { supabase } from '@/integrations/supabase/client';
import { useClassTestMonitor } from '@/hooks/useClassTest';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Play, Users } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Lobby the teacher projects: students scan the QR, enter their phone number and
 * appear in the roster. Nobody starts until the teacher presses "Start exam".
 */
export function TestJoinScreen({
  testId,
  joinCode,
  onBack,
  onStarted,
}: {
  testId: string;
  joinCode: string;
  onBack: () => void;
  onStarted: () => void;
}) {
  const { test, participants, refresh } = useClassTestMonitor(testId);
  const [starting, setStarting] = useState(false);

  const url = useMemo(() => `${window.location.origin}/exam/${joinCode}`, [joinCode]);

  useEffect(() => {
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const start = async () => {
    setStarting(true);
    const { error } = await supabase
      .from('class_tests')
      .update({ status: 'active', starts_at: new Date().toISOString() })
      .eq('id', testId);
    setStarting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Exam started');
    onStarted();
  };

  if (!test) {
    return <div className="p-10 text-center"><Loader2 className="h-5 w-5 mx-auto animate-spin opacity-60" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{test.title}</div>
          <div className="text-[11px] text-muted-foreground">
            {test.question_ids.length} questions · {Math.round(test.duration_seconds / 60)} min
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-6 flex flex-col items-center gap-4 text-center">
          <div className="bg-white p-4 rounded-xl">
            <QRCode value={url} size={220} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Join code</div>
            <div className="font-mono text-4xl font-bold tracking-[0.2em]">{joinCode}</div>
            <div className="text-xs text-muted-foreground mt-1 break-all">{url}</div>
          </div>
          <p className="text-xs text-muted-foreground max-w-sm">
            Students scan the code, enter their phone number, and wait here. Only numbers registered in this class can
            join.
          </p>
          <Button className="w-full max-w-xs gap-2" onClick={start} disabled={starting || participants.length === 0}>
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start exam {participants.length > 0 && `(${participants.length})`}
          </Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">Joined</div>
            <Badge variant="secondary" className="ml-auto text-[10px]">{participants.length}</Badge>
          </div>
          {participants.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">Waiting for students to scan…</div>
          ) : (
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
              {participants.map((p) => (
                <div key={p.id} className="text-sm px-2 py-1.5 rounded-md bg-muted/40 truncate">
                  {p.display_name}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
