import { Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CENTER_SAT_UNLOCK_AT } from './centerSatSimulation';

export function CenterSatUnlockIsland({ distinct }: { distinct: number }) {
  const progress = Math.min(CENTER_SAT_UNLOCK_AT, Math.max(0, distinct));
  const remaining = CENTER_SAT_UNLOCK_AT - progress;
  const p = Math.round((progress / CENTER_SAT_UNLOCK_AT) * 100);
  return (
    <section aria-label="SAT simulation unlock progress" className="sky-card sky-wash w-full md:p-6" style={{ '--wash': 'hsl(245 80% 95%)' } as React.CSSProperties}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="sky-tile sky-tile-lock"><Lock /></span>
            <h2 className="text-xl font-bold">SAT Simulation</h2>
            <span className="sky-chip">Not unlocked yet</span>
          </div>
          <p className="sky-body">Solve 440 distinct Math questions to unlock your simulated SAT score.</p>
          <p className="font-semibold">{remaining} more questions to unlock</p>
        </div>
        <Link to="/student/practice" className="sky-btn sky-btn-blue shrink-0">Keep practicing<ArrowRight className="h-5 w-5" /></Link>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={CENTER_SAT_UNLOCK_AT} aria-label="Questions toward SAT simulation" className="sky-track !h-3.5 flex-1">
          <div className="sky-fill-accent" style={{ width: `${p}%` }} />
        </div>
        <span className="shrink-0 font-mono font-medium">{progress} / {CENTER_SAT_UNLOCK_AT}</span>
      </div>
    </section>
  );
}
