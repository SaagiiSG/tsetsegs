import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ScorePredictionResult {
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

function calculatePracticeAdj(attempts: any[]): { hardAccuracy: number; volume: number; adj: number } {
  if (!attempts || attempts.length === 0) return { hardAccuracy: 0, volume: 0, adj: 0 };

  const volume = attempts.length;
  const hardAttempts = attempts.filter(a => a.difficulty_level === 'Hard');
  const hardCorrect = hardAttempts.filter(a => a.is_correct).length;
  const hardAccuracy = hardAttempts.length > 0 ? (hardCorrect / hardAttempts.length) * 100 : 0;

  let hardAdj = 0;
  if (hardAttempts.length === 0) hardAdj = 0;
  else if (hardAccuracy > 55) hardAdj = 10;
  else if (hardAccuracy >= 40) hardAdj = 3;
  else if (hardAccuracy >= 25) hardAdj = 0;
  else hardAdj = -5;

  let volumeAdj = 0;
  if (volume > 400) volumeAdj = 5;
  else if (volume >= 200) volumeAdj = 2;
  else if (volume < 100) volumeAdj = -5;

  return { hardAccuracy, volume, adj: hardAdj + volumeAdj };
}

function getBaseFromHardAccuracy(hardAccuracy: number): number {
  if (hardAccuracy > 65) return 720;
  if (hardAccuracy >= 50) return 680;
  if (hardAccuracy >= 35) return 620;
  if (hardAccuracy >= 20) return 560;
  return 500;
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
          .order('test_number', { ascending: false })
          .limit(3),
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

      // Fetch platform attempts if student account exists
      let attempts: any[] = [];
      if (studentAccountRes.data?.id) {
        const { data: attemptsData } = await supabase
          .from('student_attempts')
          .select('is_correct, time_spent_seconds, question_id')
          .eq('student_account_id', studentAccountRes.data.id);
        
        if (attemptsData && attemptsData.length > 0) {
          // Get question difficulty levels
          const questionIds = [...new Set(attemptsData.map(a => a.question_id))];
          // Fetch in batches of 500 to avoid query limits
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
            difficulty_level: difficultyMap.get(a.question_id) || 'Medium',
          }));
        }
      }

      // Calculate base score
      const tests = (practiceTestsRes.data || []).filter(t => t.score !== null);
      let baseScore: number;
      let hasBaseline = tests.length > 0;
      let variancePenalty = 0;
      let halfRange = 10; // default ±10

      if (tests.length >= 3) {
        // tests are ordered desc, so [0]=most recent, [1]=second, [2]=third
        baseScore = tests[0].score! * 0.5 + tests[1].score! * 0.3 + tests[2].score! * 0.2;
        
        // Variance penalty: if scores are volatile, prediction is less reliable
        const scores = tests.slice(0, 3).map(t => t.score!);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
        const stdev = Math.sqrt(variance);
        // Penalty: half the stdev, capped at -30
        variancePenalty = -Math.min(Math.round(stdev * 0.5), 30);
        // Widen range when volatile
        if (stdev > 30) halfRange = Math.min(Math.round(stdev * 0.5), 25);
      } else if (tests.length === 2) {
        baseScore = tests[0].score! * 0.6 + tests[1].score! * 0.4;
      } else if (tests.length === 1) {
        baseScore = tests[0].score!;
      } else {
        // No baseline - use hard accuracy lookup
        const hardAttempts = attempts.filter(a => a.difficulty_level === 'Hard');
        const hardCorrect = hardAttempts.filter(a => a.is_correct).length;
        const hardAcc = hardAttempts.length > 0 ? (hardCorrect / hardAttempts.length) * 100 : 0;
        baseScore = getBaseFromHardAccuracy(hardAcc);
        halfRange = 20; // wider range for no-baseline estimates
      }

      // Calculate adjustments
      const { rate: attendanceRate, adj: attendanceAdj } = calculateAttendanceAdj(attendanceRes.data);
      const { rate: homeworkRate, adj: homeworkAdj } = calculateHomeworkAdj(homeworkRes.data || []);
      let { hardAccuracy, volume: attemptVolume, adj: practiceAdj } = calculatePracticeAdj(attempts);

      // Cap practice bonus at higher base scores (diminishing returns)
      if (baseScore >= 730) practiceAdj = Math.min(practiceAdj, 5);
      else if (baseScore >= 700) practiceAdj = Math.min(practiceAdj, 10);

      // Final prediction
      const predicted = Math.max(200, Math.min(800, Math.round(
        baseScore + attendanceAdj + homeworkAdj + practiceAdj + variancePenalty
      )));

      // Confidence — downgrade when variance is high
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (hasBaseline && tests.length >= 3 && attemptVolume >= 100) {
        confidence = Math.abs(variancePenalty) > 15 ? 'medium' : 'high';
      } else if (hasBaseline) {
        confidence = 'medium';
      }

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
      };
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}
