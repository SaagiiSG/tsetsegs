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
          "student-chip w-full justify-center border-dashed text-muted-foreground",
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
      <div className={cn("student-chip", className)}>
        <CalendarClock className="h-3.5 w-3.5 text-primary" />
        <span className="font-bold">{days}d</span>
        <span className="text-muted-foreground">to SAT</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "student-chip gap-2.5 !px-3 !py-2 !rounded-2xl",
      className
    )}>
      <svg viewBox="0 0 36 36" className="h-7 w-7 -rotate-90 flex-shrink-0" aria-hidden>
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" className="stroke-muted" />
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-primary"
          strokeDasharray={`${Math.max(4, 94 * (1 - Math.min(days, 180) / 180))} 94`} />
      </svg>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">SAT:</span>
        <span className="font-bold text-foreground">{days}d {hours}h</span>
        <span className="text-muted-foreground hidden sm:inline">({format(satDate, 'MMM d')})</span>
      </div>
    </div>
  );
}
