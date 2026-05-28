import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useCalibrationProgress } from '@/hooks/useCalibrationProgress';
import { Sparkles, Lock } from 'lucide-react';

interface CalibrationProgressCardProps {
  variant?: 'leaderboard' | 'dashboard';
}

/**
 * Shows the student's progress toward unlocking their rank (44 problems).
 * Renders nothing once the student is already unlocked.
 */
export function CalibrationProgressCard({ variant = 'dashboard' }: CalibrationProgressCardProps) {
  const { student } = useStudentAuth();
  const studentAccountId = student?.id ?? null;
  const { data: progress } = useCalibrationProgress(
    studentAccountId ? { studentAccountId } : undefined,
  );

  if (!progress || progress.unlocked) return null;

  const pct = Math.min(100, Math.round((progress.solved / progress.required) * 100));
  const remaining = Math.max(0, progress.required - progress.solved);

  const heading =
    variant === 'leaderboard' ? 'Unlock your rank' : 'Calibration in progress';

  const subline =
    variant === 'leaderboard'
      ? 'Solve 44 problems to join the leaderboard.'
      : 'Solve 44 problems to unlock your rank and score prediction.';

  return (
    <Card className="border-dashed border-primary/40 bg-gradient-to-br from-primary/5 to-primary/0">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              {variant === 'leaderboard' ? (
                <Lock className="h-4 w-4 text-primary" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">{heading}</h3>
              <p className="text-xs text-muted-foreground truncate">{subline}</p>
            </div>
          </div>
          <div className="font-mono text-sm tabular-nums shrink-0">
            <span className="text-foreground font-semibold">{progress.solved}</span>
            <span className="text-muted-foreground">/{progress.required}</span>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
        {remaining > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {remaining} more problem{remaining === 1 ? '' : 's'} to go.
          </p>
        ) : (
          <p className="text-[11px] text-primary font-medium">
            Calibration complete — your rank unlocks on your next attempt.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
