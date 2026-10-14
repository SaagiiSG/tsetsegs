import { Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CENTER_SAT_UNLOCK_AT } from './centerSatSimulation';

export function CenterSatUnlockIsland({ distinct }: { distinct: number }) {
  const progress = Math.min(CENTER_SAT_UNLOCK_AT, Math.max(0, distinct));
  const remaining = CENTER_SAT_UNLOCK_AT - progress;
  return (
    <section aria-label="SAT simulation unlock progress" className="w-full rounded-3xl border admin-glass-card admin-glass-neutral p-5 md:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">SAT Simulation</h2>
            <Badge variant="outline">Not unlocked yet</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Solve 440 distinct Math questions to unlock your simulated SAT score.</p>
          <p className="text-sm font-medium">{remaining} more questions to unlock</p>
        </div>
        <Button asChild className="shrink-0"><Link to="/student/practice">Keep practicing<ArrowRight className="h-4 w-4" /></Link></Button>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Progress value={progress / CENTER_SAT_UNLOCK_AT * 100} aria-label="Questions toward SAT simulation" className="h-2 flex-1" />
        <span className="shrink-0 text-xs font-mono text-muted-foreground">{progress} / {CENTER_SAT_UNLOCK_AT}</span>
      </div>
    </section>
  );
}