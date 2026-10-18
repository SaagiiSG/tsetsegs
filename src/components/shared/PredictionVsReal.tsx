import { compareToReal, ON_TARGET_POINTS, type PredictionPoint } from '@/lib/predictionAccuracy';

interface Props {
  predictions: PredictionPoint[];
  realMath: number | null;
  realDate: string | null;
}

/** Latest predicted Math score and, once a real SAT is in, how close it was. */
export function PredictionVsReal({ predictions, realMath, realDate }: Props) {
  const latest = [...predictions].filter(p => p.score != null).sort((a, b) => b.date.localeCompare(a.date))[0];
  const cmp = compareToReal(predictions, realMath, realDate);
  return (
    <div className="rounded-lg border p-3 space-y-2 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground">Predicted Math</span>
        <span className="font-mono text-lg font-semibold">{latest ? latest.score : '—'}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {latest ? `Saved ${latest.date} · ${predictions.length} day${predictions.length === 1 ? '' : 's'} on record` : 'Saved automatically once the student unlocks the SAT simulation.'}
      </p>
      {cmp && (
        cmp.predicted == null
          ? <p className="text-xs text-muted-foreground">No prediction was saved before this real SAT, so it can't be checked.</p>
          : <div className="rounded-md bg-muted/50 p-2 text-xs space-y-0.5">
              <div className="flex justify-between"><span>Predicted before test ({cmp.predictedOn})</span><span className="font-mono">{cmp.predicted}</span></div>
              <div className="flex justify-between"><span>Real SAT Math</span><span className="font-mono">{realMath}</span></div>
              <div className="flex justify-between font-medium">
                <span>{cmp.onTarget ? `On target (within ${ON_TARGET_POINTS})` : 'Missed'}</span>
                <span className="font-mono">{cmp.miss! > 0 ? '+' : ''}{cmp.miss}</span>
              </div>
            </div>
      )}
    </div>
  );
}
