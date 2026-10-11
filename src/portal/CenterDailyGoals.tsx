import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, Flame, Wind, Minus, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { computeGoals, DEFAULT_GOALS, type GoalIntensity } from '@/hooks/useDailyGoals';
import { useCenter } from './centerContext';
import type { QMeta } from './questionMeta';

export type CenterGoals = { speed: number; hard: number; medium: number; intensity: GoalIntensity | null; sat_date: string | null; isSet: boolean };

/** Daily ring goals for a center student (tenant_student_goals). */
export function useCenterGoals(studentId: string) {
  const { center } = useCenter();
  return useQuery({
    queryKey: ['center-goals', studentId],
    queryFn: async (): Promise<CenterGoals> => {
      const { data } = await supabase.from('tenant_student_goals').select('*').eq('student_id', studentId).maybeSingle();
      if (!data) return { ...DEFAULT_GOALS, sat_date: null, isSet: false, intensity: null };
      return { speed: data.speed, hard: data.hard, medium: data.medium, intensity: data.intensity as GoalIntensity | null, sat_date: data.sat_date, isSet: true };
    },
    meta: { institution: center.id },
  });
}

/** Today's progress: speed runs completed + distinct hard/medium correct questions. */
export function useCenterDailyProgress(studentId: string, attempts: { question_id: string; is_correct: boolean; created_at: string }[], meta: Record<string, QMeta>) {
  const runs = useQuery({
    queryKey: ['center-speed-runs', studentId],
    queryFn: async () => (await supabase.from('tenant_speed_runs').select('created_at, correct, total').eq('student_id', studentId).order('created_at', { ascending: false }).limit(500)).data ?? [],
  });
  return useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const hard = new Set<string>(), medium = new Set<string>();
    for (const a of attempts) {
      if (!a.is_correct || new Date(a.created_at) < start) continue;
      const d = (meta[a.question_id]?.difficulty_level ?? '').toLowerCase();
      if (d === 'hard') hard.add(a.question_id); else if (d === 'medium') medium.add(a.question_id);
    }
    const speed = (runs.data ?? []).filter(r => new Date(r.created_at) >= start).length;
    return { speed, hard: hard.size, medium: medium.size, runs: runs.data ?? [] };
  }, [attempts, meta, runs.data]);
}

const INTENSITIES: { key: GoalIntensity; label: string; blurb: string; icon: typeof Zap }[] = [
  { key: 'intense', label: 'Intense', blurb: 'Big daily push', icon: Flame },
  { key: 'gradual', label: 'Gradual', blurb: 'Steady progress', icon: Zap },
  { key: 'with_the_flow', label: 'With the flow', blurb: 'Light and consistent', icon: Wind },
];

export function CenterGoalDialog({ open, onOpenChange, studentId, goals }: { open: boolean; onOpenChange: (o: boolean) => void; studentId: string; goals?: CenterGoals }) {
  const { center } = useCenter();
  const qc = useQueryClient();
  const [intensity, setIntensity] = useState<GoalIntensity>('gradual');
  const [satDate, setSatDate] = useState('');
  const [vals, setVals] = useState({ speed: 2, hard: 5, medium: 10 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !goals) return;
    setIntensity(goals.intensity ?? 'gradual');
    setSatDate(goals.sat_date ?? '');
    setVals({ speed: goals.speed, hard: goals.hard, medium: goals.medium });
  }, [open, goals]);

  const days = satDate ? Math.ceil((new Date(satDate).getTime() - Date.now()) / 86400000) : null;
  const pick = (k: GoalIntensity) => { setIntensity(k); setVals(computeGoals(k, days)); };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('tenant_student_goals').upsert({
      student_id: studentId, institution_id: center.id, ...vals, intensity, sat_date: satDate || null, set_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast.error('Could not save your goals'); return; }
    qc.invalidateQueries({ queryKey: ['center-goals', studentId] });
    toast.success('Daily goals saved');
    onOpenChange(false);
  };

  const Stepper = ({ k, label }: { k: keyof typeof vals; label: string }) => (
    <div className="flex items-center justify-between rounded-xl border p-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setVals(v => ({ ...v, [k]: Math.max(1, v[k] - 1) }))}><Minus className="h-3.5 w-3.5" /></Button>
        <span className="font-mono w-6 text-center">{vals[k]}</span>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setVals(v => ({ ...v, [k]: Math.min(50, v[k] + 1) }))}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set your daily ring</DialogTitle>
          <DialogDescription>Pick a pace and your test date. You can change it any time.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {INTENSITIES.map(({ key, label, blurb, icon: Icon }) => (
              <button key={key} onClick={() => pick(key)} className={cn('rounded-xl border p-3 text-left transition-colors', intensity === key ? 'border-foreground bg-foreground/5' : 'hover:bg-foreground/5')}>
                <Icon className="h-4 w-4 mb-2" /><p className="text-sm font-medium">{label}</p><p className="text-[11px] text-muted-foreground">{blurb}</p>
              </button>
            ))}
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">SAT date (optional)</span>
            <Input type="date" value={satDate} onChange={e => { setSatDate(e.target.value); const d = e.target.value ? Math.ceil((new Date(e.target.value).getTime() - Date.now()) / 86400000) : null; setVals(computeGoals(intensity, d)); }} />
            {days !== null && days >= 0 && <span className="text-xs text-muted-foreground">{days} days to go</span>}
          </label>
          <div className="space-y-2">
            <Stepper k="speed" label="Speed sessions" />
            <Stepper k="hard" label="Hard questions correct" />
            <Stepper k="medium" label="Medium questions correct" />
          </div>
          <Button className="w-full" onClick={save} disabled={saving}><Check className="h-4 w-4" />Save goals</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
