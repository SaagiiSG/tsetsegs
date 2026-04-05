import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { subDays, format, startOfWeek, getHours } from 'date-fns';

export interface TopicAccuracy {
  topicName: string;
  subject: 'Math' | 'English';
  accuracy: number;
  questionsAttempted: number;
  correctAnswers: number;
  averageTime: number;
  optimalTime: number;
}

export interface ErrorPatterns {
  careless: number;
  conceptual: number;
  timePressure: number;
  trapAnswers: number;
}

export interface ProgressHistory {
  date: string;
  score: number;
  accuracy: number;
  questionsAttempted: number;
}

export interface DifficultyBreakdown {
  easy: { total: number; correct: number; accuracy: number };
  medium: { total: number; correct: number; accuracy: number };
  hard: { total: number; correct: number; accuracy: number };
}

export interface ConsistencyMetrics {
  scoreVariance: number;
  bestTimeOfDay: 'morning' | 'afternoon' | 'evening';
  bestDayOfWeek: string;
  dailyActivity: { date: string; attempts: number; accuracy: number }[];
  timeOfDayStats: { period: string; accuracy: number; attempts: number }[];
}

export interface StudentAnalytics {
  studentId: string;
  currentScore: number;
  targetScore: number;
  topicAccuracy: TopicAccuracy[];
  errorPatterns: ErrorPatterns;
  progressHistory: ProgressHistory[];
  difficultyBreakdown: DifficultyBreakdown;
  consistencyMetrics: ConsistencyMetrics;
  totalAttempts: number;
  totalCorrect: number;
  overallAccuracy: number;
  questionsCompleted: number;
  totalQuestions: number;
  weakestTopic: TopicAccuracy | null;
  isLoading: boolean;
}

// Target: 40 seconds per question across all topics
const OPTIMAL_TIME = 40;

const OPTIMAL_TIMES: Record<string, number> = {
  'Advanced Math': OPTIMAL_TIME,
  'Algebra': OPTIMAL_TIME,
  'Geometry and Trigonometry': OPTIMAL_TIME,
  'Data Analysis and Problem Solving': OPTIMAL_TIME,
  'Reading': OPTIMAL_TIME,
  'Writing': OPTIMAL_TIME,
  'Grammar': OPTIMAL_TIME,
};

const TOPIC_SUBJECTS: Record<string, 'Math' | 'English'> = {
  'Advanced Math': 'Math',
  'Algebra': 'Math',
  'Geometry and Trigonometry': 'Math',
  'Data Analysis and Problem Solving': 'Math',
  'Reading': 'English',
  'Writing': 'English',
  'Grammar': 'English',
};

export function useStudentAnalytics(subject: 'math' | 'english' | 'all' = 'all'): StudentAnalytics {
  const { student } = useStudentAuth();

  // Fetch all attempts with question details
  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['analytics-attempts', student?.id, subject],
    queryFn: async () => {
      if (!student) return [];
      let query = supabase
        .from('student_attempts')
        .select(`
          *,
          question:questions!inner(
            id,
            question_id,
            difficulty_level,
            subject,
            subtopic,
            category:question_categories(name)
          )
        `)
        .eq('student_account_id', student.id)
        .order('attempted_at', { ascending: false });
      if (subject !== 'all') {
        query = query.eq('question.subject', subject);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!student,
  });

  // Fetch total questions count
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['analytics-questions-count', subject],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select('id, category:question_categories(name), difficulty_level, subject')
        .eq('is_original', true)
        .eq('is_active', true);
      if (subject !== 'all') {
        query = query.eq('subject', subject);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!student,
  });

  // Fetch bluebook attempts for score history
  const { data: bluebookAttempts, isLoading: bluebookLoading } = useQuery({
    queryKey: ['analytics-bluebook', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from('bluebook_attempts')
        .select('*')
        .eq('student_account_id', student.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!student,
  });

  const isLoading = attemptsLoading || questionsLoading || bluebookLoading;

  // Calculate topic accuracy
  const topicAccuracy: TopicAccuracy[] = [];
  const topicStats: Record<string, { correct: number; total: number; times: number[] }> = {};

  attempts?.forEach((attempt) => {
    const topicName = attempt.question?.category?.name || 'Unknown';
    if (!topicStats[topicName]) {
      topicStats[topicName] = { correct: 0, total: 0, times: [] };
    }
    topicStats[topicName].total++;
    if (attempt.is_correct) topicStats[topicName].correct++;
    if (attempt.time_spent_seconds) {
      topicStats[topicName].times.push(attempt.time_spent_seconds);
    }
  });

  Object.entries(topicStats).forEach(([topicName, stats]) => {
    if (topicName === 'Unknown') return;
    const avgTime = stats.times.length > 0 
      ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length 
      : 0;
    topicAccuracy.push({
      topicName,
      subject: TOPIC_SUBJECTS[topicName] || 'Math',
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      questionsAttempted: stats.total,
      correctAnswers: stats.correct,
      averageTime: Math.round(avgTime),
      optimalTime: OPTIMAL_TIMES[topicName] || 75,
    });
  });

  // Sort by accuracy ascending (weakest first)
  topicAccuracy.sort((a, b) => a.accuracy - b.accuracy);

  // Calculate error patterns
  const errorPatterns: ErrorPatterns = { careless: 0, conceptual: 0, timePressure: 0, trapAnswers: 0 };
  const incorrectAttempts = attempts?.filter((a) => !a.is_correct) || [];
  
  incorrectAttempts.forEach((attempt) => {
    const time = attempt.time_spent_seconds || 0;
    const difficulty = attempt.question?.difficulty_level?.toLowerCase() || 'medium';
    
    // Careless: Quick answer on easy questions
    if (time < 30 && (difficulty === 'easy' || difficulty === 'Easy')) {
      errorPatterns.careless++;
    }
    // Time pressure: Long time and still wrong
    else if (time > 180) {
      errorPatterns.timePressure++;
    }
    // Check for multiple attempts on same question (conceptual)
    else {
      const sameQuestionAttempts = attempts?.filter(
        (a) => a.question_id === attempt.question_id && !a.is_correct
      ).length || 0;
      if (sameQuestionAttempts > 1) {
        errorPatterns.conceptual++;
      } else {
        errorPatterns.trapAnswers++;
      }
    }
  });

  // Normalize to percentages
  const totalErrors = Object.values(errorPatterns).reduce((a, b) => a + b, 0);
  if (totalErrors > 0) {
    errorPatterns.careless = Math.round((errorPatterns.careless / totalErrors) * 100);
    errorPatterns.conceptual = Math.round((errorPatterns.conceptual / totalErrors) * 100);
    errorPatterns.timePressure = Math.round((errorPatterns.timePressure / totalErrors) * 100);
    errorPatterns.trapAnswers = Math.round((errorPatterns.trapAnswers / totalErrors) * 100);
  }

  // Calculate difficulty breakdown
  const difficultyBreakdown: DifficultyBreakdown = {
    easy: { total: 0, correct: 0, accuracy: 0 },
    medium: { total: 0, correct: 0, accuracy: 0 },
    hard: { total: 0, correct: 0, accuracy: 0 },
  };

  attempts?.forEach((attempt) => {
    const difficulty = (attempt.question?.difficulty_level?.toLowerCase() || 'medium') as 'easy' | 'medium' | 'hard';
    if (difficultyBreakdown[difficulty]) {
      difficultyBreakdown[difficulty].total++;
      if (attempt.is_correct) difficultyBreakdown[difficulty].correct++;
    }
  });

  Object.keys(difficultyBreakdown).forEach((key) => {
    const k = key as 'easy' | 'medium' | 'hard';
    difficultyBreakdown[k].accuracy = difficultyBreakdown[k].total > 0
      ? Math.round((difficultyBreakdown[k].correct / difficultyBreakdown[k].total) * 100)
      : 0;
  });

  // Calculate progress history (last 8 weeks, weekly data)
  const progressHistory: ProgressHistory[] = [];
  const last56Days = subDays(new Date(), 56);
  
  const weeklyData: Record<string, { correct: number; total: number }> = {};
  
  attempts?.forEach((attempt) => {
    const date = new Date(attempt.attempted_at);
    if (date >= last56Days) {
      const weekStart = format(startOfWeek(date), 'yyyy-MM-dd');
      if (!weeklyData[weekStart]) {
        weeklyData[weekStart] = { correct: 0, total: 0 };
      }
      weeklyData[weekStart].total++;
      if (attempt.is_correct) weeklyData[weekStart].correct++;
    }
  });

  Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, stats]) => {
      const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      progressHistory.push({
        date,
        score: accuracy * 16, // Rough conversion to SAT-like score
        accuracy,
        questionsAttempted: stats.total,
      });
    });

  // Calculate consistency metrics
  const timeOfDayStats: Record<string, { correct: number; total: number }> = {
    morning: { correct: 0, total: 0 },
    afternoon: { correct: 0, total: 0 },
    evening: { correct: 0, total: 0 },
  };

  const dayOfWeekStats: Record<string, { correct: number; total: number }> = {};
  const dailyActivity: { date: string; attempts: number; accuracy: number }[] = [];
  const dailyData: Record<string, { correct: number; total: number }> = {};

  attempts?.forEach((attempt) => {
    const date = new Date(attempt.attempted_at);
    const hour = getHours(date);
    const dayName = format(date, 'EEEE');
    const dateStr = format(date, 'yyyy-MM-dd');

    // Time of day
    let period = 'morning';
    if (hour >= 12 && hour < 18) period = 'afternoon';
    else if (hour >= 18) period = 'evening';

    timeOfDayStats[period].total++;
    if (attempt.is_correct) timeOfDayStats[period].correct++;

    // Day of week
    if (!dayOfWeekStats[dayName]) {
      dayOfWeekStats[dayName] = { correct: 0, total: 0 };
    }
    dayOfWeekStats[dayName].total++;
    if (attempt.is_correct) dayOfWeekStats[dayName].correct++;

    // Daily activity (last 30 days)
    if (date >= subDays(new Date(), 30)) {
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { correct: 0, total: 0 };
      }
      dailyData[dateStr].total++;
      if (attempt.is_correct) dailyData[dateStr].correct++;
    }
  });

  Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, stats]) => {
      dailyActivity.push({
        date,
        attempts: stats.total,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      });
    });

  // Find best time of day and day of week
  let bestTimeOfDay: 'morning' | 'afternoon' | 'evening' = 'morning';
  let bestTimeAccuracy = 0;
  Object.entries(timeOfDayStats).forEach(([period, stats]) => {
    const acc = stats.total > 0 ? stats.correct / stats.total : 0;
    if (acc > bestTimeAccuracy) {
      bestTimeAccuracy = acc;
      bestTimeOfDay = period as 'morning' | 'afternoon' | 'evening';
    }
  });

  let bestDayOfWeek = 'Monday';
  let bestDayAccuracy = 0;
  Object.entries(dayOfWeekStats).forEach(([day, stats]) => {
    const acc = stats.total > 0 ? stats.correct / stats.total : 0;
    if (acc > bestDayAccuracy) {
      bestDayAccuracy = acc;
      bestDayOfWeek = day;
    }
  });

  // Calculate score variance
  const accuracies = dailyActivity.map((d) => d.accuracy);
  const avgAccuracy = accuracies.length > 0 
    ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length 
    : 0;
  const variance = accuracies.length > 0
    ? Math.round(
        Math.sqrt(
          accuracies.reduce((sum, acc) => sum + Math.pow(acc - avgAccuracy, 2), 0) / accuracies.length
        )
      )
    : 0;

  const consistencyMetrics: ConsistencyMetrics = {
    scoreVariance: variance,
    bestTimeOfDay,
    bestDayOfWeek,
    dailyActivity,
    timeOfDayStats: Object.entries(timeOfDayStats).map(([period, stats]) => ({
      period,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      attempts: stats.total,
    })),
  };

  // Calculate overall stats
  const totalAttempts = attempts?.length || 0;
  const totalCorrect = attempts?.filter((a) => a.is_correct).length || 0;
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  
  const questionsCompleted = new Set(
    attempts?.filter((a) => a.is_correct).map((a) => a.question_id)
  ).size;
  const totalQuestions = questions?.length || 68;

  // Get current and target scores
  const latestBluebook = bluebookAttempts?.[bluebookAttempts.length - 1];
  const currentScore = latestBluebook?.total_score || Math.round(overallAccuracy * 16);
  const targetScore = 1400; // Default target

  return {
    studentId: student?.id || '',
    currentScore,
    targetScore,
    topicAccuracy,
    errorPatterns,
    progressHistory,
    difficultyBreakdown,
    consistencyMetrics,
    totalAttempts,
    totalCorrect,
    overallAccuracy,
    questionsCompleted,
    totalQuestions,
    weakestTopic: topicAccuracy.length > 0 ? topicAccuracy[0] : null,
    isLoading,
  };
}
