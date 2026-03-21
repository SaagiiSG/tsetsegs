import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { CalendarClock } from 'lucide-react';
import { differenceInDays, differenceInHours, format } from 'date-fns';
import { cn } from '@/lib/utils';

// Known SAT test dates mapped by YYYY-MM to approximate test day
const SAT_DATE_MAP: Record<string, number> = {
  '03': 28, '05': 3, '06': 7, '08': 23, '09': 27, '10': 4, '11': 1, '12': 6,
};

function getNextSATDate(satTestMonth: string | null | undefined): Date | null {
  if (!satTestMonth) return null;
  const [year, month] = satTestMonth.split('-').map(Number);
  if (!year || !month) return null;
  const monthStr = String(month).padStart(2, '0');
  const day = SAT_DATE_MAP[monthStr] || 15;
  return new Date(year, month - 1, day);
}

interface SATCountdownWidgetProps {
  variant?: 'sidebar' | 'banner' | 'compact';
  className?: string;
  onSetDate?: () => void;
}

export function SATCountdownWidget({ variant = 'sidebar', className, onSetDate }: SATCountdownWidgetProps) {
  const { student } = useStudentAuth();
  const satDate = getNextSATDate(student?.linked_student?.sat_test_month);

  if (!satDate || satDate < new Date()) {
    if (!onSetDate) return null;
    return (
      <button
        onClick={onSetDate}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30 text-xs text-muted-foreground hover:bg-muted transition-colors w-full",
          className
        )}
      >
        <CalendarClock className="h-4 w-4" />
        <span>Set your SAT date</span>
      </button>
    );
  }

  const now = new Date();
  const days = differenceInDays(satDate, now);
  const hours = differenceInHours(satDate, now) % 24;

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs", className)}>
        <CalendarClock className="h-3.5 w-3.5 text-primary" />
        <span className="font-bold">{days}d</span>
        <span className="text-muted-foreground">to SAT</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10",
      className
    )}>
      <CalendarClock className="h-5 w-5 text-primary flex-shrink-0" />
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">SAT:</span>
        <span className="font-bold text-foreground">{days}d {hours}h</span>
        <span className="text-muted-foreground hidden sm:inline">({format(satDate, 'MMM d')})</span>
      </div>
    </div>
  );
}
