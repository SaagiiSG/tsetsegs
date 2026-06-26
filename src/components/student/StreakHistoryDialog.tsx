import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flame } from 'lucide-react';
import { useStudentStreak } from '@/hooks/useStudentStreak';
import { StudyStreakCalendar } from './StudyStreakCalendar';
import { StreakRewardsPanel } from './StreakRewardsPanel';

interface StreakHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StreakHistoryDialog({ open, onOpenChange }: StreakHistoryDialogProps) {
  const { streak, isStreakActive } = useStudentStreak();
  const current = streak?.current_streak ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className={`w-5 h-5 ${isStreakActive ? "text-orange-500" : "text-muted-foreground grayscale opacity-50"}`} />
            {isStreakActive ? `${current}-day streak` : 'Start your streak today'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
