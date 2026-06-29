import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CALIBRATION_REQUIRED } from "./useCalibrationProgress";
import {
  buildSimHistory,
  blendSimHistory,
  dedupeDistinctNewestFirst,
  type SimulationResult,
  type SimAttempt,
} from "@/lib/satSimulation";

export interface ScorePredictionResult {
  predictedRange: [number, number];
  confidence: 'high' | 'medium' | 'low';
  baseScore: number;
  factors: {
    attendanceRate: number;
    attendanceAdj: number;
    homeworkRate: number;
    homeworkAdj: number;
    hardAccuracy: number;
    attemptVolume: number;
    practiceAdj: number;
    variancePenalty: number;
  };
  hasBaseline: boolean;
  // Total distinct questions the student has solved on the platform.
  distinctSolved: number;
  // Simulation engine — teacher/admin facing only. Students never see this.
  simulation?: {
    latest: SimulationResult;
    history: SimulationResult[];      // newest first, up to 3
    blendedScore: number;             // confidence-weighted avg
    blendWeight: number;              // 0..1 weight of sim in base score
    practiceTestCount: number;        // how many real tests fed the base
  };
  // When set, the student hasn't finished calibration yet — UI should show
  // a locked card and the underlying prediction values are not meaningful.
  calibrationLocked?: {
    solved: number;
    required: number;
  };
}

function calculateAttendanceAdj(attendanceData: any): { rate: number; adj: number } {
  if (!attendanceData) return { rate: 0, adj: -20 };

  let weightedCount = 0;
  let totalWeight = 0;

  for (let i = 1; i <= 15; i++) {
    const status = attendanceData[`session_${i}`];
    if (status === null || status === undefined) continue;
    
    const weight = i === 3 ? 2 : 1;
    totalWeight += weight;
    
    if (status === 'present' || status === 'late') {
      weightedCount += weight;
    }
  }

  if (totalWeight === 0) return { rate: 0, adj: 0 };

  const rate = weightedCount / totalWeight;
  let adj = 0;
  if (rate >= 1) adj = 0;
  else if (rate >= 0.9) adj = -3;
  else if (rate >= 0.8) adj = -8;
  else if (rate >= 0.7) adj = -15;
  else adj = -20;

  return { rate: rate * 100, adj };
}

function calculateHomeworkAdj(homeworkData: any[]): { rate: number; adj: number } {
  if (!homeworkData || homeworkData.length === 0) return { rate: 0, adj: 0 };

  const total = homeworkData.length;
  const completed = homeworkData.filter(h => h.completed).length;
  const rate = completed / total;

  let adj = 0;
  if (rate >= 1) adj = 0;
  else if (rate >= 0.9) adj = -2;
  else if (rate >= 0.8) adj = -5;
  else adj = -10;

  return { rate: rate * 100, adj };
}

// Normalize difficulty — DB stores lowercase ('hard','medium','easy'),
// older code compared against 'Hard' (capitalized) and silently matched nothing.
const isHard = (d: string | null | undefined) => (d ?? '').toLowerCase() === 'hard';

function calculatePracticeAdj(attempts: any[]): { hardAccuracy: number; volume: number; adj: number; hardCount: number } {
  if (!attempts || attempts.length === 0) return { hardAccuracy: 0, volume: 0, adj: 0, hardCount: 0 };

  const volume = attempts.length;
  const hardAttempts = attempts.filter(a => isHard(a.difficulty_level));
  const hardCorrect = hardAttempts.filter(a => a.is_correct).length;
  const hardAccuracy = hardAttempts.length > 0 ? (hardCorrect / hardAttempts.length) * 100 : 0;

  let hardAdj = 0;
  if (hardAttempts.length === 0) hardAdj = 0;
  else if (hardAccuracy > 70) hardAdj = 15;        // new top tier — proven mastery
  else if (hardAccuracy > 55) hardAdj = 10;
  else if (hardAccuracy >= 40) hardAdj = 3;
  else if (hardAccuracy >= 25) hardAdj = 0;
  else hardAdj = -5;

  let volumeAdj = 0;
  if (volume > 400) volumeAdj = 5;
  else if (volume >= 200) volumeAdj = 2;
  else if (volume < 100) volumeAdj = -5;

  return { hardAccuracy, volume, adj: hardAdj + volumeAdj, hardCount: hardAttempts.length };
}

function getBaseFromHardAccuracy(hardAccuracy: number): number {
  if (hardAccuracy > 65) return 720;
  if (hardAccuracy >= 50) return 680;
  if (hardAccuracy >= 35) return 620;
  if (hardAccuracy >= 20) return 560;
  return 500;
}

// Downside deviation — only penalize stdev driven by scores BELOW the mean.
// High outliers (e.g. an 800) are a positive signal at the top, not risk.
function downsideStdev(scores: number[]): number {
  if (scores.length === 0) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sq = scores.reduce((sum, s) => sum + Math.pow(Math.max(0, mean - s), 2), 0) / scores.length;
  return Math.sqrt(sq);
}

// Linear-regression slope of score vs. test_number across the supplied tests.
// tests are passed most-recent-first; we flip to chronological for slope.
function trendSlope(tests: { test_number: number; score: number }[]): number {
  if (tests.length < 3) return 0;
  const chrono = [...tests].reverse();
  const n = chrono.length;
  const xs = chrono.map(t => t.test_number);
  const ys = chrono.map(t => t.score);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += Math.pow(xs[i] - meanX, 2);
  }
  return den === 0 ? 0 : num / den;
}

export function useScorePrediction(studentId: string | undefined) {
  return useQuery({
    queryKey: ['score-prediction', studentId],
    queryFn: async (): Promise<ScorePredictionResult | null> => {
      if (!studentId) return null;

      // Fetch student to get batch_id
      const { data: student } = await supabase
        .from('students')
        .select('id, batch_id, phone')
        .eq('id', studentId)
        .maybeSingle();

      if (!student) return null;

      // Check if SAT batch
      const { data: batch } = await supabase
        .from('batches')
        .select('course_type')
        .eq('id', student.batch_id)
        .maybeSingle();

      if (!batch || batch.course_type !== 'SAT') return null;

      // Fetch all data in parallel
      const [practiceTestsRes, attendanceRes, homeworkRes, studentAccountRes] = await Promise.all([
        supabase
          .from('practice_tests')
          .select('test_number, score')
          .eq('student_id', studentId)
          .eq('batch_id', student.batch_id)
          .not('score', 'is', null)
          .order('test_number', { ascending: false }),
        supabase
          .from('attendance')
          .select('*')
          .eq('student_id', studentId)
          .eq('batch_id', student.batch_id)
          .maybeSingle(),
        supabase
          .from('homework')
          .select('session_number, completed')
          .eq('student_id', studentId)
          .eq('batch_id', student.batch_id),
        supabase
          .from('student_accounts')
          .select('id')
          .eq('phone_number', student.phone)
          .maybeSingle(),
      ]);

      // Calibration gate — short-circuit with a locked result if the student
      // hasn't completed 44 distinct questions yet. We still need to know
      // their solved count so the UI can show a progress bar.
      let calibrationLocked: { solved: number; required: number } | undefined;
      if (studentAccountRes.data?.id) {
        const { data: acctCal } = await supabase
          .from('student_accounts')
          .select('rank_unlocked_at')
          .eq('id', studentAccountRes.data.id)
          .maybeSingle();
        if (!(acctCal as any)?.rank_unlocked_at) {
          const { data: solvedRows } = await supabase
            .from('student_attempts')
            .select('question_id')
            .eq('student_account_id', studentAccountRes.data.id)
            .limit(2000);
          const distinct = new Set((solvedRows ?? []).map((r: any) => r.question_id));
          calibrationLocked = { solved: distinct.size, required: CALIBRATION_REQUIRED };
        }
      } else {
        // No student account yet — definitely locked.
        calibrationLocked = { solved: 0, required: CALIBRATION_REQUIRED };
      }

      if (calibrationLocked) {
        return {
          predictedRange: [0, 0] as [number, number],
          confidence: 'low' as const,
          baseScore: 0,
          factors: {
            attendanceRate: 0, attendanceAdj: 0,
            homeworkRate: 0, homeworkAdj: 0,
            hardAccuracy: 0, attemptVolume: 0,
            practiceAdj: 0, variancePenalty: 0,
          },
          hasBaseline: false,
          distinctSolved: calibrationLocked.solved,
          calibrationLocked,
        } as ScorePredictionResult;
      }

      // Fetch platform attempts if student account exists
      let attempts: any[] = [];
      let simAttemptsNewestFirst: SimAttempt[] = [];
      if (studentAccountRes.data?.id) {
        const { data: attemptsData } = await supabase
          .from('student_attempts')
          .select('is_correct, time_spent_seconds, question_id, attempted_at')
          .eq('student_account_id', studentAccountRes.data.id)
          .order('attempted_at', { ascending: false });

        if (attemptsData && attemptsData.length > 0) {
          const questionIds = [...new Set(attemptsData.map(a => a.question_id))];
          const allQuestions: any[] = [];
          for (let i = 0; i < questionIds.length; i += 500) {
            const batch = questionIds.slice(i, i + 500);
            const { data: qData } = await supabase
              .from('questions')
              .select('id, difficulty_level')
              .in('id', batch);
            if (qData) allQuestions.push(...qData);
          }

          const difficultyMap = new Map(allQuestions.map(q => [q.id, q.difficulty_level]));
          attempts = attemptsData.map(a => ({
            ...a,
            difficulty_level: difficultyMap.get(a.question_id) || 'medium',
          }));

          // Distinct (most-recent attempt per question), newest first — sim input
          simAttemptsNewestFirst = dedupeDistinctNewestFirst(
            attempts.map((a) => ({
              is_correct: a.is_correct,
              time_spent_seconds: a.time_spent_seconds,
              difficulty_level: a.difficulty_level,
              question_id: a.question_id,
              attempted_at: a.attempted_at,
            }))
          );
        }
      }

      // Build simulation history (latest up to 3, sliding every 10 questions)
      const simHistory = buildSimHistory(simAttemptsNewestFirst, 3);
      const simBlend = blendSimHistory(simHistory);





      // Calculate base score
      const tests = (practiceTestsRes.data || []).filter(t => t.score !== null);
      let baseScore: number;
      let hasBaseline = tests.length > 0;
      let variancePenalty = 0;
      let halfRange = 15; // default ±15
      let ceilingLift = 0;
      let trendBonus = 0;

      if (tests.length >= 5) {
        // Blend: 60% weighted-last-3 + 40% last-5-average
        const last3Weighted = tests[0].score! * 0.5 + tests[1].score! * 0.3 + tests[2].score! * 0.2;
        const last5Scores = tests.slice(0, 5).map(t => t.score!);
        const last5Avg = last5Scores.reduce((a, b) => a + b, 0) / 5;
        baseScore = last3Weighted * 0.6 + last5Avg * 0.4;

        // Downside-only variance (high outliers don't punish)
        const dStd = downsideStdev(last5Scores);
        variancePenalty = dStd > 25 ? -Math.min(Math.round((dStd - 25) * 0.4), 20) : 0;
        halfRange = Math.max(15, Math.min(Math.round(dStd * 0.5), 25));

        // Ceiling lift — reward demonstrated peak performance
        const maxLast5 = Math.max(...last5Scores);
        const last3Avg = (tests[0].score! + tests[1].score! + tests[2].score!) / 3;
        if (maxLast5 >= 780 && last3Avg >= 740) {
          ceilingLift = Math.max(0, Math.min(25,
            Math.round((maxLast5 - 760) * 0.4 + (last3Avg - 740) * 0.3)
          ));
        }
      } else if (tests.length >= 3) {
        baseScore = tests[0].score! * 0.5 + tests[1].score! * 0.3 + tests[2].score! * 0.2;
        const scores3 = tests.slice(0, 3).map(t => t.score!);
        const dStd = downsideStdev(scores3);
        variancePenalty = dStd > 25 ? -Math.min(Math.round((dStd - 25) * 0.4), 20) : 0;
        if (dStd > 30) halfRange = Math.min(Math.round(dStd * 0.5), 20);

        const max3 = Math.max(...scores3);
        const last3Avg = scores3.reduce((a, b) => a + b, 0) / 3;
        if (max3 >= 780 && last3Avg >= 740) {
          ceilingLift = Math.max(0, Math.min(20,
            Math.round((max3 - 760) * 0.35 + (last3Avg - 740) * 0.25)
          ));
        }
      } else if (tests.length === 2) {
        baseScore = tests[0].score! * 0.6 + tests[1].score! * 0.4;
      } else if (tests.length === 1) {
        baseScore = tests[0].score!;
      } else {
        // No baseline yet
        if (simBlend != null) {
          // Sim takes over as the base when we have no real practice tests.
          baseScore = simBlend;
        } else {
          // Fallback — no tests AND no sim (under 44 distinct questions).
          const hardAttempts = attempts.filter(a => isHard(a.difficulty_level));
          const hardCorrect = hardAttempts.filter(a => a.is_correct).length;
          const hardAcc = hardAttempts.length > 0 ? (hardCorrect / hardAttempts.length) * 100 : 0;
          baseScore = getBaseFromHardAccuracy(hardAcc);
        }
      }

      // Blend sim into base when both real tests AND sim exist.
      // Real tests dominate; sim is a smoothing signal.
      let simBlendWeight = 0;
      if (simBlend != null && tests.length > 0) {
        if (tests.length >= 3) simBlendWeight = 0.15;
        else simBlendWeight = 0.30; // 1-2 tests → sim gets a bigger voice
        baseScore = baseScore * (1 - simBlendWeight) + simBlend * simBlendWeight;
      } else if (simBlend != null && tests.length === 0) {
        // Sim fully drove the base
        simBlendWeight = 1.0;
      }


      // Trend bonus — reward sustained upward trajectory across last 4 tests
      if (tests.length >= 4) {
        const slope = trendSlope(tests.slice(0, 4) as any);
        if (slope >= 15) trendBonus = Math.min(10, Math.round((slope - 10) * 0.4));
        else if (slope >= 8) trendBonus = 3;
      }

      // Calculate adjustments
      const { rate: attendanceRate, adj: attendanceAdj } = calculateAttendanceAdj(attendanceRes.data);
      let { rate: homeworkRate, adj: homeworkAdj } = calculateHomeworkAdj(homeworkRes.data || []);
      let { hardAccuracy, volume: attemptVolume, adj: practiceAdj, hardCount } = calculatePracticeAdj(attempts);

      // Apply ceiling lift directly to base
      baseScore += ceilingLift;

      // Soften homework penalty when mastery is demonstrated (mastery beats compliance)
      if (hardAccuracy >= 60 && (homeworkRate / 100) >= 0.7) {
        homeworkAdj = Math.max(homeworkAdj, -3);
      }

      // Practice cap — tiered, lifts entirely when hard mastery is proven
      const provenMastery = hardAccuracy >= 65 && hardCount >= 50;
      if (!provenMastery) {
        if (baseScore >= 730) practiceAdj = Math.min(practiceAdj, 5);
        else if (baseScore >= 700) practiceAdj = Math.min(practiceAdj, 8);
      }

      // Final prediction
      const predicted = Math.max(200, Math.min(800, Math.round(
        baseScore + attendanceAdj + homeworkAdj + practiceAdj + variancePenalty + trendBonus
      )));

      // Confidence — downgrade when downside variance is high
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (hasBaseline && tests.length >= 3 && attemptVolume >= 100) {
        confidence = Math.abs(variancePenalty) > 15 ? 'medium' : 'high';
      } else if (hasBaseline) {
        confidence = 'medium';
      } else if (simHistory.length >= 2) {
        // Sim-only base: borrow some confidence from sim quality + volume
        const goodSims = simHistory.filter(s => s.confidence !== 'low').length;
        if (goodSims >= 2 && attemptVolume >= 100) confidence = 'medium';
      }

      // Buffer: ±15 floor for high confidence, up to ±20 for low.
      if (confidence === 'high') halfRange = 15;
      else if (confidence === 'medium') halfRange = 17;
      else halfRange = 20;

      return {
        predictedRange: [Math.max(200, predicted - halfRange), Math.min(800, predicted + halfRange)] as [number, number],
        confidence,
        baseScore: Math.round(baseScore),
        factors: {
          attendanceRate,
          attendanceAdj,
          homeworkRate,
          homeworkAdj,
          hardAccuracy,
          attemptVolume,
          practiceAdj,
          variancePenalty,
        },
        hasBaseline,
        distinctSolved: simAttemptsNewestFirst.length,
        simulation: simHistory.length > 0 && simBlend != null ? {
          latest: simHistory[0],
          history: simHistory,
          blendedScore: Math.round(simBlend),
          blendWeight: simBlendWeight,
          practiceTestCount: tests.length,
        } : undefined,
      };

    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}
