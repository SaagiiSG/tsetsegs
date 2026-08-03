import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MathText } from '@/components/MathText';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Loader2, Timer, Users } from 'lucide-react';

interface HardQuestion {
  question_id: string;
  attempts: number;
  accuracy: number;
  avg_seconds: number;
  difficulty_score: number;
  question_text?: string;
}

const DURATIONS = [20, 30, 45];
const DELAYS = [
  { label: 'Now', value: 0 },
  { label: 'In 1 min', value: 1 },
  { label: 'In 5 min', value: 5 },
  { label: 'In 10 min', value: 10 },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStarted: (testId: string) => void;
}

export function StartTestDialog({ open, onOpenChange, onStarted }: Props) {
  const { teacherName } = useTeacherAuth();
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [delay, setDelay] = useState(1);
  const [batchId, setBatchId] = useState<string>('');
  const [batches, setBatches] = useState<Array<{ id: string; label: string }>>([]);
  const [picks, setPicks] = useState<HardQuestion[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || !teacherName) return;
    (async () => {
      const [{ data }, { data: completion }] = await Promise.all([
        supabase
          .from('batches')
          .select('id, batch_name, nickname, course_type')
          .eq('course_type', 'SAT')
          .ilike('teacher', `%${teacherName}%`)
          .order('start_date', { ascending: false }),
        supabase.rpc('get_batch_completion_status', { teacher_name: teacherName }),
      ]);
      const completed = new Set(
        ((completion ?? []) as Array<{ batch_id: string; is_completed: boolean }>)
          .filter((c) => c.is_completed)
          .map((c) => c.batch_id)
      );
      setBatches(
        (data ?? [])
          .filter((b: any) => !completed.has(b.id))
          .map((b: any) => ({ id: b.id, label: b.nickname || b.batch_name || 'Class' }))
      );
    })();
  }, [open, teacherName]);


  useEffect(() => {
    if (!open) return;
    setLoadingPicks(true);
    (async () => {
      const { data, error } = await supabase.rpc('pick_hardest_questions', {
        p_question_set: '68',
        p_limit: 22,
        p_min_attempts: 5,
      });
      if (error) {
        toast.error('Could not load the hardest questions');
        setLoadingPicks(false);
        return;
      }
      const rows = (data ?? []) as HardQuestion[];
      const { data: qs } = await supabase
        .from('questions')
        .select('id, question_text')
        .in('id', rows.map((r) => r.question_id));
      const textById = new Map((qs ?? []).map((q: any) => [q.id, q.question_text as string]));
      setPicks(rows.map((r) => ({ ...r, question_text: textById.get(r.question_id) })));
      setLoadingPicks(false);
    })();
  }, [open]);

  const effectiveDuration = useMemo(() => {
    const c = parseInt(customDuration, 10);
    return Number.isFinite(c) && c > 0 ? c : duration;
  }, [customDuration, duration]);

  const handleStart = async () => {
    if (!batchId) {
      toast.error('Pick a class first');
      return;
    }
    if (picks.length === 0) return;
    setCreating(true);
    const code = Array.from({ length: 6 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)],
    ).join('');
    const { data, error } = await supabase
      .from('class_tests')
      .insert({
        batch_id: batchId,
        teacher_name: teacherName ?? null,
        title: '68 Hardest 22',
        question_set: '68',
        question_ids: picks.map((p) => p.question_id),
        duration_seconds: effectiveDuration * 60,
        starts_at: new Date().toISOString(),
        status: 'scheduled',
        join_code: code,
      })
      .select('id, join_code')
      .maybeSingle();
    setCreating(false);
    if (error || !data) {
      toast.error(error?.message ?? 'Could not create the exam');
      return;
    }
    onOpenChange(false);
    onStarted(data.id, data.join_code as string);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start 68 Test</DialogTitle>
          <DialogDescription>
            22 hardest questions from the 68 set — lowest accuracy and slowest average solve time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Duration</Label>
            <div className="flex flex-wrap gap-2 mt-1.5 items-center">
              {DURATIONS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={!customDuration && duration === d ? 'default' : 'outline'}
                  onClick={() => { setDuration(d); setCustomDuration(''); }}
                >
                  {d} min
                </Button>
              ))}
              <Input
                type="number"
                min={1}
                placeholder="Custom"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="h-9 w-24"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Start</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {DELAYS.map((d) => (
                <Button
                  key={d.value}
                  size="sm"
                  variant={delay === d.value ? 'default' : 'outline'}
                  onClick={() => setDelay(d.value)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Class</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Pick a class" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Selected questions ({picks.length})</Label>
            <Card className="mt-1.5 max-h-64 overflow-y-auto divide-y">
              {loadingPicks ? (
                <div className="p-6 text-center"><Loader2 className="h-5 w-5 mx-auto animate-spin opacity-60" /></div>
              ) : picks.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Not enough attempt data yet.</div>
              ) : (
                picks.map((p, i) => (
                  <div key={p.question_id} className="p-2.5 flex gap-3 text-xs">
                    <span className="font-mono text-muted-foreground w-5 shrink-0">{i + 1}</span>
                    <span className="flex-1 min-w-0 line-clamp-2">
                      <MathText text={p.question_text ?? ''} />
                    </span>
                    <span className={cn('shrink-0 font-mono', p.accuracy < 0.4 ? 'text-destructive' : 'text-muted-foreground')}>
                      {Math.round(Number(p.accuracy) * 100)}%
                    </span>
                    <span className="shrink-0 font-mono text-muted-foreground">{Math.round(Number(p.avg_seconds))}s</span>
                  </div>
                ))
              )}
            </Card>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 mr-auto text-xs text-muted-foreground">
            <Timer className="h-3.5 w-3.5" /> {effectiveDuration} min
            <Users className="h-3.5 w-3.5 ml-2" /> whole class
          </div>
          <Button onClick={handleStart} disabled={creating || picks.length === 0}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
