import { describe, expect, it } from 'vitest';
import { compareToReal, summarizeMisses } from './predictionAccuracy';

describe('prediction vs real SAT', () => {
  const preds = [
    { date: '2026-09-01', score: 600 },
    { date: '2026-10-01', score: 650 },
    { date: '2026-10-10', score: 720 }, // after the test — must be ignored
  ];
  it('uses the last prediction on or before the test date', () => {
    expect(compareToReal(preds, 640, '2026-10-05')).toEqual({ predicted: 650, predictedOn: '2026-10-01', miss: 10, onTarget: true });
  });
  it('flags a miss bigger than 30 points', () => {
    expect(compareToReal(preds, 700, '2026-10-05')?.onTarget).toBe(false);
  });
  it('summarizes average miss across students', () => {
    expect(summarizeMisses([10, -50, 20])).toEqual({ count: 3, avgMiss: 27, bias: -7, onTargetShare: 2 / 3 });
  });
});
