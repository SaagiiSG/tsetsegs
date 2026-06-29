// SAT-style score simulation from the student's recent platform attempts.
// Pure functions only — easy to unit test and to re-use in hooks/components.

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface SimAttempt {
  is_correct: boolean;
  time_spent_seconds: number | null;
  difficulty_level: string | null | undefined;
  question_id: string;
  attempted_at?: string;
}

export interface SimulationResult {
  simScore: number;          // 400-800
  accuracy: number;          // 0-1
  avgTimeSec: number;
  hardShare: number;         // 0-1
  mediumShare: number;
  easyShare: number;
  totalQuestions: number;    // distinct questions in this batch (44)
  confidence: 'high' | 'med' | 'low';
}

const TARGET_SECS = 95; // SAT Math pace per question
const WEIGHT: Record<Difficulty, number> = { easy: 0.6, medium: 1.0, hard: 1.5 };

const normalizeDifficulty = (d: string | null | undefined): Difficulty => {
  const k = (d ?? '').toLowerCase();
  if (k === 'hard') return 'hard';
  if (k === 'easy') return 'easy';
  return 'medium';
};

/** Compute one simulation from exactly the attempts you pass in (expected 44). */
export function calculateSimulation(attempts: SimAttempt[]): SimulationResult | null {
  if (!attempts || attempts.length === 0) return null;
  const n = attempts.length;

  let weightedScore = 0;
  let weightSum = 0;
  let correctCount = 0;
  let timeSum = 0;
  let timeCount = 0;
  const counts = { easy: 0, medium: 0, hard: 0 };

  for (const a of attempts) {
    const diff = normalizeDifficulty(a.difficulty_level);
    counts[diff] += 1;
    const w = WEIGHT[diff];
    weightSum += w;

    const t = a.time_spent_seconds ?? 0;
    if (t > 0) {
      timeSum += t;
      timeCount += 1;
    }

    if (a.is_correct) {
      correctCount += 1;
      let timeFactor = 1;
      if (t > 0) {
        // Faster than target → small bonus, slower → small penalty. Capped to ±15%.
        timeFactor = 1 + ((TARGET_SECS - t) / TARGET_SECS) * 0.15;
        if (timeFactor > 1.15) timeFactor = 1.15;
        if (timeFactor < 0.85) timeFactor = 0.85;
      }
      weightedScore += w * timeFactor;
    }
  }

  if (weightSum === 0) return null;

  const raw = weightedScore / weightSum; // 0..~1.15
  const hardShare = counts.hard / n;
  const mediumShare = counts.medium / n;
  const easyShare = counts.easy / n;

  // Penalize batches lacking hard questions — they don't resemble a real SAT.
  const mixPenalty = 1 - Math.max(0, 0.5 - hardShare) * 0.4;
  const adjusted = raw * mixPenalty;

  let simScore = Math.round(400 + adjusted * 400);
  if (simScore < 400) simScore = 400;
  if (simScore > 800) simScore = 800;

  const avgTimeSec = timeCount > 0 ? timeSum / timeCount : 0;

  // Confidence tag for this batch
  let confidence: SimulationResult['confidence'] = 'low';
  if (hardShare >= 0.35 && avgTimeSec >= 60 && avgTimeSec <= 150) {
    confidence = 'high';
  } else if (hardShare >= 0.2) {
    confidence = 'med';
  }

  return {
    simScore,
    accuracy: correctCount / n,
    avgTimeSec,
    hardShare,
    mediumShare,
    easyShare,
    totalQuestions: n,
    confidence,
  };
}

/**
 * Build sim history from a list of distinct attempts ordered most-recent first.
 * - Latest sim: most recent 44 attempts.
 * - Previous sims: slide window back by 10 each time (so it recomputes every 10 Qs).
 * Returns up to `maxSims` results, newest first.
 */
export function buildSimHistory(
  attemptsDistinctNewestFirst: SimAttempt[],
  maxSims = 3,
): SimulationResult[] {
  const BATCH = 44;
  const STEP = 10;
  const history: SimulationResult[] = [];
  for (let i = 0; i < maxSims; i++) {
    const start = i * STEP;
    const end = start + BATCH;
    if (end > attemptsDistinctNewestFirst.length) break;
    const slice = attemptsDistinctNewestFirst.slice(start, end);
    const sim = calculateSimulation(slice);
    if (sim) history.push(sim);
  }
  return history;
}

/** Confidence-weighted average of the latest N sims. Newest first. */
export function blendSimHistory(history: SimulationResult[]): number | null {
  if (!history || history.length === 0) return null;
  const weights = { high: 1.0, med: 0.7, low: 0.4 } as const;
  let num = 0;
  let den = 0;
  for (const s of history) {
    const w = weights[s.confidence];
    num += s.simScore * w;
    den += w;
  }
  if (den === 0) return null;
  return num / den;
}

/**
 * Keep only the most recent attempt per question, preserving newest-first order.
 * Input must already be sorted newest-first by attempted_at.
 */
export function dedupeDistinctNewestFirst(attempts: SimAttempt[]): SimAttempt[] {
  const seen = new Set<string>();
  const out: SimAttempt[] = [];
  for (const a of attempts) {
    if (seen.has(a.question_id)) continue;
    seen.add(a.question_id);
    out.push(a);
  }
  return out;
}
