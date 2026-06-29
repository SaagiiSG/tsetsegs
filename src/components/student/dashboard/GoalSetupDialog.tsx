import { useEffect, useMemo, useState } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { CalendarIcon, Zap, Flame, Wind, Minus, Plus, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDailyGoals, computeGoals, GoalIntensity } from '@/hooks/useDailyGoals';
import { toast } from 'sonner';

interface GoalSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INTENSITY_OPTIONS: { value: GoalIntensity; label: string; icon: any; desc: string; tint: string }[] = [
  { value: 'intense', label: 'Intense', icon: Flame, desc: 'Daily heavy load. Maximum gains, fast.', tint: 'text-red-500' },
  { value: 'gradual', label: 'Gradual', icon: Zap, desc: 'Balanced. Consistent steady progress.', tint: 'text-amber-500' },
  { value: 'with_the_flow', label: 'With the Flow', icon: Wind, desc: 'Light & flexible. Whenever you can.', tint: 'text-sky-500' },
];

export function GoalSetupDialog({ open, onOpenChange }: GoalSetupDialogProps) {
  const { student } = useStudentAuth();
  const { goals, updateGoals } = useDailyGoals();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [satDate, setSatDate] = useState<Date | undefined>();
  const [intensity, setIntensity] = useState<GoalIntensity>('gradual');
  const [speed, setSpeed] = useState(2);
  const [hard, setHard] = useState(5);
  const [medium, setMedium] = useState(10);

  // Prefill on open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    const stored = student?.linked_student?.sat_test_month;
    if (stored) {
      try {
        const p = parseISO(stored);
        if (!isNaN(p.getTime())) setSatDate(p);
      } catch {}
    }
    if (goals.intensity) setIntensity(goals.intensity);
    setSpeed(goals.speed);
    setHard(goals.hard);
    setMedium(goals.medium);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const daysUntilSAT = useMemo(() => {
    if (!satDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.max(0, differenceInDays(satDate, now));
  }, [satDate]);

  // Recompute when intensity chosen
  useEffect(() => {
    if (step === 3) {
      const computed = computeGoals(intensity, daysUntilSAT);
      setSpeed(computed.speed);
      setHard(computed.hard);
      setMedium(computed.medium);
    }
  }, [step, intensity, daysUntilSAT]);

  const saveSatDate = async (date: Date) => {
    const ids = student?.linked_students?.map((s) => s.id) ||
      (student?.linked_student_id ? [student.linked_student_id] : []);
    if (ids.length === 0) return;
    try {
      await supabase.from('students').update({ sat_test_month: format(date, 'yyyy-MM-dd') }).in('id', ids);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    try {
      await updateGoals.mutateAsync({ speed, hard, medium, intensity });
      if (satDate) await saveSatDate(satDate);
      toast.success('Daily goals saved 🎯');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Could not save goals');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 1 && 'When is your SAT?'}
            {step === 2 && 'Pick your pace'}
            {step === 3 && 'Your daily ring'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'We tailor your daily ring to how close test day is.'}
            {step === 2 && 'How hard do you want to push every day?'}
            {step === 3 && 'Tweak any number, then save. You can change this any time.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={cn(
                'h-1.5 rounded-full transition-all',
                n === step ? 'w-8 bg-primary' : n < step ? 'w-6 bg-primary/60' : 'w-6 bg-muted'
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal h-12', !satDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {satDate ? format(satDate, 'PPP') : 'Pick your test date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={satDate}
                  onSelect={setSatDate}
                  initialFocus
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
            {daysUntilSAT !== null && (
              <div className="text-center text-sm text-muted-foreground">
                <span className="font-mono font-bold text-primary text-lg">{daysUntilSAT}</span> days until SAT
              </div>
            )}
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Skip</Button>
              <Button onClick={() => setStep(2)} disabled={!satDate}>Continue</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 py-2">
            {INTENSITY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = intensity === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIntensity(opt.value)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3',
                    selected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  )}
                >
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center bg-muted/60 shrink-0', opt.tint)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      {opt.label}
                      {selected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 py-2">
            <RingRow label="Speed sessions" emoji="⚡️" value={speed} setValue={setSpeed} min={1} max={10} tint="text-amber-500" />
            <RingRow label="Hard correct" emoji="🔥" value={hard} setValue={setHard} min={1} max={30} tint="text-red-500" />
            <RingRow label="Medium correct" emoji="🎯" value={medium} setValue={setMedium} min={1} max={50} tint="text-teal-500" />
            <div className="flex justify-between gap-2 pt-3">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSave} disabled={updateGoals.isPending}>
                {updateGoals.isPending ? 'Saving…' : 'Save my ring'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RingRow({
  label, emoji, value, setValue, min, max, tint,
}: {
  label: string; emoji: string; value: number; setValue: (n: number) => void; min: number; max: number; tint: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <span className={cn('font-medium', tint)}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setValue(Math.max(min, value - 1))}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="font-mono font-bold w-8 text-center text-lg">{value}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setValue(Math.min(max, value + 1))}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
