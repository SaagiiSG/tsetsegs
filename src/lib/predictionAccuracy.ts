export interface PredictionPoint { date: string; score: number | null }

/** Within this many points the prediction counts as on target. */
export const ON_TARGET_POINTS = 30;

/**
 * Compare the last saved prediction made on or before the real test date
 * with the real Math score. Predictions saved after the test never count.
 */
export function compareToReal(predictions: PredictionPoint[], realMath: number | null, realDate: string | null) {
  if (realMath == null) return null;
  const before = predictions
    .filter(p => p.score != null && (!realDate || p.date <= realDate))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!before) return { predicted: null, predictedOn: null, miss: null, onTarget: null } as const;
  const miss = (before.score as number) - realMath;
  return { predicted: before.score as number, predictedOn: before.date, miss, onTarget: Math.abs(miss) <= ON_TARGET_POINTS };
}

/** Summary across many students: average absolute miss and share on target. */
export function summarizeMisses(misses: number[]) {
  if (!misses.length) return null;
  const abs = misses.map(Math.abs);
  return {
    count: misses.length,
    avgMiss: Math.round(abs.reduce((a, b) => a + b, 0) / abs.length),
    bias: Math.round(misses.reduce((a, b) => a + b, 0) / misses.length),
    onTargetShare: abs.filter(m => m <= ON_TARGET_POINTS).length / abs.length,
  };
}
