import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Sparkles, Users, Award } from 'lucide-react';
import type { SprintEnrollmentSnapshot } from '@/lib/sprintEnrollment';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: SprintEnrollmentSnapshot | null;
  pointsEarned?: number;
}

export function SprintEnrollmentDialog({ open, onOpenChange, snapshot, pointsEarned }: Props) {
  const navigate = useNavigate();
  if (!snapshot) return null;

  const tierLabel = snapshot.tier.charAt(0).toUpperCase() + snapshot.tier.slice(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent pointer-events-none" />
        <DialogHeader className="relative">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">
            You're in Sprint {snapshot.sprintNumber}!
          </DialogTitle>
          <DialogDescription className="text-center">
            Season {snapshot.seasonNumber} · {tierLabel} · Group {snapshot.groupNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="rounded-lg border bg-card p-3 text-center">
            <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Rank</div>
            <div className="text-xl font-mono font-bold">#{snapshot.rank}</div>
            <div className="text-[10px] text-muted-foreground">of {snapshot.groupSize}</div>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <Award className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Points</div>
            <div className="text-xl font-mono font-bold">{snapshot.totalPoints}</div>
            {pointsEarned ? (
              <div className="text-[10px] text-emerald-500 font-mono">+{pointsEarned}</div>
            ) : (
              <div className="text-[10px] text-muted-foreground">total</div>
            )}
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Group</div>
            <div className="text-xl font-mono font-bold">{snapshot.groupNumber}</div>
            <div className="text-[10px] text-muted-foreground">{tierLabel}</div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Keep solving to climb the leaderboard before the sprint ends.
        </p>

        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep practicing
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate('/student/leaderboard');
            }}
          >
            View leaderboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
