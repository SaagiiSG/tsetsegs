import { motion } from 'framer-motion';
import { Clock, Flame } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { SprintInfo } from '@/hooks/useLeaderboard';

interface SprintTimerProps {
  sprint: SprintInfo | null;
}

export function SprintTimer({ sprint }: SprintTimerProps) {
  if (!sprint) {
    return (
      <div className="rounded-lg border bg-card p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
        <div className="h-10 bg-muted rounded w-2/3"></div>
      </div>
    );
  }

  const totalDuration = 14; // 14 days
  const daysElapsed = totalDuration - sprint.daysRemaining;
  const progressPercent = Math.min(100, (daysElapsed / totalDuration) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-gradient-to-br from-card to-card/80 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="font-semibold text-sm">
            Season {sprint.seasonNumber} - Sprint {sprint.sprintNumber}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-xs">Ends in</span>
        </div>
      </div>

      {/* Countdown */}
      <div className="flex items-baseline justify-center gap-1">
        <TimeUnit value={sprint.daysRemaining} label="days" />
        <span className="text-2xl font-bold text-muted-foreground">:</span>
        <TimeUnit value={sprint.hoursRemaining} label="hrs" />
        <span className="text-2xl font-bold text-muted-foreground">:</span>
        <TimeUnit value={sprint.minutesRemaining} label="min" />
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <Progress value={progressPercent} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Day {daysElapsed + 1} of {totalDuration}</span>
          <span>{Math.round(100 - progressPercent)}% remaining</span>
        </div>
      </div>
    </motion.div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <motion.span 
        key={value}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-3xl font-bold tabular-nums"
      >
        {String(value).padStart(2, '0')}
      </motion.span>
      <span className="text-xs text-muted-foreground ml-0.5">{label}</span>
    </div>
  );
}
