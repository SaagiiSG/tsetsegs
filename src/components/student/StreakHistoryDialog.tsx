import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flame } from 'lucide-react';
import { useStudentStreak } from '@/hooks/useStudentStreak';
import { StudyStreakCalendar } from './StudyStreakCalendar';
import { StreakRewardsPanel } from './StreakRewardsPanel';
import { PastDailyRings } from './dashboard/PastDailyRings';

interface StreakHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StreakHistoryDialog({ open, onOpenChange }: StreakHistoryDialogProps) {
  const { streak, isStreakActive } = useStudentStreak();
  const current = streak?.current_streak ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className={`w-5 h-5 ${isStreakActive ? "text-orange-500" : "text-muted-foreground grayscale opacity-50"}`} />
            {isStreakActive ? `${current}-day streak` : 'Start your streak today'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 min-w-0">
          <div className="flex flex-col items-center gap-1 py-2">
            <div className={`relative grid place-items-center h-24 w-24 rounded-full ${isStreakActive ? 'bg-primary/10' : 'bg-muted'}`}>
              {isStreakActive && <span aria-hidden className="absolute inset-0 rounded-full bg-primary/20 blur-xl motion-safe:animate-pulse" />}
              <Flame className={`relative h-14 w-14 ${isStreakActive ? 'student-chip-flame fill-current' : 'text-muted-foreground opacity-50'}`} />
            </div>
            <p className="font-mono text-4xl font-bold leading-none mt-2">{current}</p>
            <p className="text-xs text-muted-foreground">{current === 1 ? 'day' : 'days'} in a row</p>
          </div>
          <PastDailyRings />
          <StreakRewardsPanel />
          <StudyStreakCalendar />
          <p className="text-xs text-center text-muted-foreground">
            Practice any question tomorrow to keep your streak alive.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

