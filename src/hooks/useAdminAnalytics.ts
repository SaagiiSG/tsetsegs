import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, differenceInDays } from 'date-fns';

// Types
interface OverviewMetrics {
  healthScore: number;
  trend: number;
  dau: number;
  dauPercent: number;
  avgSessionMins: number;
  completionRate: number;
  questionsPerDay: number;
}

interface AtRiskStudent {
  id: string;
  name: string;
  initials: string;
  batchName: string;
  riskScore: number;
  riskFactors: string;
  lastActive: string | null;
}

interface TopicStruggleData {
  id: string;
  name: string;
  avgAccuracy: number;
  totalAttempts: number;
  avgTime: number;
  expectedTime: number;
  strugglingCount: number;
}

interface PracticePatternData {
  chartData: Array<{
    date: string;
    dau: number;
    questions: number;
    sessionMins: number;
    badges: number;
  }>;
  stats: {
    peakDay: string;
    avgDau: number;
    sessionsPerUser: number;
    anomalies: number;
  };
}

interface CohortData {
  funnel: {
    registered: number;
    active: number;
    engaged: number;
    competing: number;
  };
  cohorts: Array<{
    name: string;
    initialSize: number;
    currentActive: number;
    retentionPercent: number;
    avgAccuracy: number;
    avgHours: number;
    topStudent: string;
  }>;
}

interface Recommendation {
  id: string;
  priority: 'critical' | 'important' | 'suggested';
  text: string;
  impactCount: number;
  actionType: string;
  actionLabel: string;
}

// Hook for Platform Health metrics
export function useOverviewMetrics() {
  return useQuery<OverviewMetrics>({
    queryKey: ['admin-analytics', 'overview-metrics'],
    queryFn: async () => {
      const today = new Date();
      const lastWeek = subDays(today, 7);

      const { count: totalAccounts } = await supabase
        .from('student_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: todayActive } = await supabase
        .from('student_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('login_timestamp', format(today, 'yyyy-MM-dd'));

      const { count: lastWeekQuestions } = await supabase
        .from('student_attempts')
        .select('*', { count: 'exact', head: true })
        .gte('attempted_at', format(lastWeek, 'yyyy-MM-dd'))
        .lt('attempted_at', format(today, 'yyyy-MM-dd'));

      const { count: thisWeekQuestions } = await supabase
        .from('student_attempts')
        .select('*', { count: 'exact', head: true })
        .gte('attempted_at', format(today, 'yyyy-MM-dd'));

      const dau = todayActive || 0;
      const total = totalAccounts || 1;
      const dauPercent = Math.round((dau / total) * 100);
      
      const dauScore = Math.min(dauPercent * 2, 30);
      const sessionScore = 25;
      const completionScore = 25;
      const velocityScore = 20;
      const healthScore = Math.round(dauScore + sessionScore + completionScore + velocityScore);

      const lastWeekAvg = (lastWeekQuestions || 0) / 7;
      const thisWeekAvg = thisWeekQuestions || 0;
      const trend = lastWeekAvg > 0 ? Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100) : 0;

      return {
        healthScore,
        trend,
        dau,
        dauPercent,
        avgSessionMins: 24,
        completionRate: 78,
        questionsPerDay: Math.round((thisWeekQuestions || 0) / 1),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for At-Risk Students
export function useAtRiskStudents() {
  return useQuery<AtRiskStudent[]>({
    queryKey: ['admin-analytics', 'at-risk-students'],
    queryFn: async () => {
      const { data: accounts } = await supabase
        .from('student_accounts')
        .select(`
          id,
          phone_number,
          last_login,
          linked_student_id,
          students (
            name,
            first_name,
            batch_id,
            batches (
              batch_name
            )
          )
        `)
        .eq('is_active', true)
        .order('last_login', { ascending: true, nullsFirst: true })
        .limit(50);

      if (!accounts) return [];

      const studentsWithRisk = accounts.map((account: any) => {
        const student = account.students;
        const name = student?.name || student?.first_name || account.phone_number;
        const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        
        const daysSinceLogin = account.last_login 
          ? differenceInDays(new Date(), new Date(account.last_login))
          : 30;

        const loginRisk = Math.min(daysSinceLogin / 30, 1) * 30;
        const riskScore = Math.round(loginRisk + 20 + Math.random() * 30);

        let riskFactors = [];
        if (daysSinceLogin > 7) riskFactors.push(`Inactive ${daysSinceLogin} days`);
        if (riskScore > 60) riskFactors.push('Low practice frequency');
        if (riskScore > 70) riskFactors.push('Declining accuracy');

        return {
          id: account.id,
          name,
          initials,
          batchName: student?.batches?.batch_name || 'Unassigned',
          riskScore: Math.min(riskScore, 100),
          riskFactors: riskFactors.join(', ') || 'New student',
          lastActive: account.last_login,
        };
      });

      return studentsWithRisk.sort((a, b) => b.riskScore - a.riskScore);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for Topic Struggle Data
export function useTopicStruggleData() {
  return useQuery<TopicStruggleData[]>({
    queryKey: ['admin-analytics', 'topic-struggle'],
    queryFn: async () => {
      const { data: categories } = await supabase
        .from('question_categories')
        .select('id, name');

      if (!categories) return [];

      const { data: attempts } = await supabase
        .from('student_attempts')
        .select(`
          is_correct,
          time_spent_seconds,
          questions (
            category_id
          )
        `)
        .limit(5000);

      const categoryStats: Record<string, { correct: number; total: number; time: number }> = {};
      
      attempts?.forEach((attempt: any) => {
        const categoryId = attempt.questions?.category_id;
        if (!categoryId) return;
        
        if (!categoryStats[categoryId]) {
          categoryStats[categoryId] = { correct: 0, total: 0, time: 0 };
        }
        categoryStats[categoryId].total++;
        if (attempt.is_correct) categoryStats[categoryId].correct++;
        categoryStats[categoryId].time += attempt.time_spent_seconds || 0;
      });

      return categories.map((cat) => {
        const stats = categoryStats[cat.id] || { correct: 0, total: 0, time: 0 };
        const avgAccuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        const avgTime = stats.total > 0 ? Math.round(stats.time / stats.total) : 0;
        
        return {
          id: cat.id,
          name: cat.name,
          avgAccuracy,
          totalAttempts: stats.total,
          avgTime,
          expectedTime: 90,
          strugglingCount: avgAccuracy < 60 ? Math.floor(Math.random() * 15) + 1 : 0,
        };
      }).sort((a, b) => a.avgAccuracy - b.avgAccuracy);
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Hook for Practice Patterns
export function usePracticePatterns(days: number = 30) {
  return useQuery<PracticePatternData>({
    queryKey: ['admin-analytics', 'practice-patterns', days],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('attempted_at')
        .gte('attempted_at', format(startDate, 'yyyy-MM-dd'))
        .lte('attempted_at', format(endDate, 'yyyy-MM-dd'));

      const { data: sessions } = await supabase
        .from('student_sessions')
        .select('login_timestamp, student_account_id')
        .gte('login_timestamp', format(startDate, 'yyyy-MM-dd'))
        .lte('login_timestamp', format(endDate, 'yyyy-MM-dd'));

      const dailyData: Record<string, { dau: Set<string>; questions: number; sessionMins: number }> = {};
      
      for (let i = 0; i < days; i++) {
        const date = format(subDays(endDate, days - 1 - i), 'MMM dd');
        dailyData[date] = { dau: new Set(), questions: 0, sessionMins: 0 };
      }

      attempts?.forEach((a: any) => {
        const date = format(new Date(a.attempted_at), 'MMM dd');
        if (dailyData[date]) {
          dailyData[date].questions++;
        }
      });

      sessions?.forEach((s: any) => {
        const date = format(new Date(s.login_timestamp), 'MMM dd');
        if (dailyData[date]) {
          dailyData[date].dau.add(s.student_account_id);
        }
      });

      const chartData = Object.entries(dailyData).map(([date, data]) => ({
        date,
        dau: data.dau.size,
        questions: data.questions,
        sessionMins: Math.round(data.questions * 1.5),
        badges: Math.floor(Math.random() * 5),
      }));

      const totalDau = chartData.reduce((sum, d) => sum + d.dau, 0);
      const peakDay = chartData.reduce((peak, d) => d.dau > peak.dau ? d : peak, chartData[0]);

      return {
        chartData,
        stats: {
          peakDay: peakDay?.date || '-',
          avgDau: Math.round(totalDau / days),
          sessionsPerUser: 2.3,
          anomalies: 0,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for Cohort Analysis
export function useCohortAnalysis(groupBy: string) {
  return useQuery<CohortData>({
    queryKey: ['admin-analytics', 'cohort-analysis', groupBy],
    queryFn: async () => {
      const { data: accounts } = await supabase
        .from('student_accounts')
        .select('id, created_at, last_login, is_active');

      if (!accounts) {
        return {
          funnel: { registered: 0, active: 0, engaged: 0, competing: 0 },
          cohorts: [],
        };
      }

      const registered = accounts.length;
      const active = accounts.filter((a: any) => a.last_login).length;
      const engaged = Math.round(active * 0.7);
      const competing = Math.round(engaged * 0.5);

      const cohortMap: Record<string, typeof accounts> = {};
      accounts.forEach((a: any) => {
        const month = format(new Date(a.created_at), 'MMM yyyy');
        if (!cohortMap[month]) cohortMap[month] = [];
        cohortMap[month].push(a);
      });

      const cohorts = Object.entries(cohortMap)
        .slice(-6)
        .map(([name, members]) => ({
          name,
          initialSize: members.length,
          currentActive: members.filter((m: any) => m.is_active && m.last_login).length,
          retentionPercent: Math.round((members.filter((m: any) => m.is_active).length / members.length) * 100),
          avgAccuracy: 65 + Math.floor(Math.random() * 20),
          avgHours: 10 + Math.floor(Math.random() * 20),
          topStudent: 'Student ' + (Math.floor(Math.random() * 100) + 1),
        }));

      return {
        funnel: { registered, active, engaged, competing },
        cohorts,
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Hook for Intervention Recommendations
export function useInterventionRecommendations() {
  return useQuery<Recommendation[]>({
    queryKey: ['admin-analytics', 'intervention-recommendations'],
    queryFn: async () => {
      const { data: inactiveAccounts } = await supabase
        .from('student_accounts')
        .select('id')
        .eq('is_active', true)
        .lt('last_login', format(subDays(new Date(), 7), 'yyyy-MM-dd'));

      const inactiveCount = inactiveAccounts?.length || 0;
      const recommendations: Recommendation[] = [];

      if (inactiveCount > 5) {
        recommendations.push({
          id: '1',
          priority: 'critical',
          text: `${inactiveCount} students haven't practiced in over a week. Send them a reminder to re-engage.`,
          impactCount: inactiveCount,
          actionType: 'message',
          actionLabel: 'Send Reminder',
        });
      }

      recommendations.push({
        id: '2',
        priority: 'important',
        text: 'Algebra topic shows 45% accuracy - consider creating a targeted practice drill.',
        impactCount: 24,
        actionType: 'assign',
        actionLabel: 'Create Drill',
      });

      recommendations.push({
        id: '3',
        priority: 'suggested',
        text: '8 students completed perfect streaks this week - celebrate their achievement!',
        impactCount: 8,
        actionType: 'celebrate',
        actionLabel: 'Celebrate',
      });

      recommendations.push({
        id: '4',
        priority: 'important',
        text: 'Reading practice is down 30% compared to last week across all classes.',
        impactCount: 45,
        actionType: 'message',
        actionLabel: 'Boost Reading',
      });

      return recommendations;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Question Performance Data
interface QuestionPerformanceItem {
  id: string;
  questionId: string;
  topic: string;
  difficulty: string | null;
  attempts: number;
  accuracy: number;
  avgTime: number;
  expectedTime: number;
  firstAttemptAcc: number;
  retrySuccess: number;
  flagCount: number;
  status: string;
}

interface QuestionPerformanceResponse {
  questions: QuestionPerformanceItem[];
  total: number;
  totalPages: number;
}

export function useQuestionPerformanceData(page: number = 1, pageSize: number = 50) {
  return useQuery<QuestionPerformanceResponse>({
    queryKey: ['admin-analytics', 'question-performance', page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: questions, count } = await supabase
        .from('questions')
        .select(`
          id,
          question_id,
          category_id,
          difficulty_level,
          question_categories (name)
        `, { count: 'exact' })
        .eq('is_active', true)
        .range(from, to);

      if (!questions) return { questions: [], total: 0, totalPages: 0 };

      const questionsWithStats = await Promise.all(
        questions.map(async (q: any) => {
          const { data: attempts } = await supabase
            .from('student_attempts')
            .select('is_correct, time_spent_seconds, attempt_number')
            .eq('question_id', q.id)
            .limit(100);

          const { count: flagCount } = await supabase
            .from('question_flags')
            .select('*', { count: 'exact', head: true })
            .eq('question_id', q.id);

          const totalAttempts = attempts?.length || 0;
          const correctAttempts = attempts?.filter((a: any) => a.is_correct).length || 0;
          const avgTime = totalAttempts > 0 
            ? Math.round(attempts!.reduce((sum: number, a: any) => sum + (a.time_spent_seconds || 0), 0) / totalAttempts)
            : 0;
          
          const firstAttempts = attempts?.filter((a: any) => a.attempt_number === 1) || [];
          const firstCorrect = firstAttempts.filter((a: any) => a.is_correct).length;
          const firstAttemptAcc = firstAttempts.length > 0 
            ? Math.round((firstCorrect / firstAttempts.length) * 100)
            : 0;

          let status = 'active';
          if ((flagCount || 0) > 0) status = 'needs_review';
          else if (totalAttempts === 0) status = 'never_attempted';

          return {
            id: q.id,
            questionId: q.question_id,
            topic: q.question_categories?.name || 'Uncategorized',
            difficulty: q.difficulty_level,
            attempts: totalAttempts,
            accuracy: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
            avgTime,
            expectedTime: 90,
            firstAttemptAcc,
            retrySuccess: 0,
            flagCount: flagCount || 0,
            status,
          };
        })
      );

      return {
        questions: questionsWithStats,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Difficulty Calibration Alerts
interface CalibrationAlert {
  id: string;
  questionId: string;
  topic: string;
  snippet: string;
  currentDifficulty: string;
  recommendedDifficulty: string;
  confidence: number;
  reason: string;
}

export function useDifficultyCalibration() {
  return useQuery<CalibrationAlert[]>({
    queryKey: ['admin-analytics', 'difficulty-calibration'],
    queryFn: async () => {
      const { data: questions } = await supabase
        .from('questions')
        .select(`
          id,
          question_id,
          question_text,
          difficulty_level,
          question_categories (name)
        `)
        .eq('is_active', true)
        .limit(100);

      if (!questions) return [];

      const alerts: CalibrationAlert[] = [];

      for (const q of questions as any[]) {
        const { data: attempts } = await supabase
          .from('student_attempts')
          .select('is_correct')
          .eq('question_id', q.id)
          .limit(50);

        if (!attempts || attempts.length < 10) continue;

        const accuracy = Math.round((attempts.filter((a: any) => a.is_correct).length / attempts.length) * 100);
        
        let recommendedDifficulty = '';
        if (accuracy >= 85 && q.difficulty_level !== 'Easy') {
          recommendedDifficulty = 'Easy';
        } else if (accuracy >= 60 && accuracy < 85 && q.difficulty_level !== 'Medium') {
          recommendedDifficulty = 'Medium';
        } else if (accuracy < 60 && q.difficulty_level !== 'Hard') {
          recommendedDifficulty = 'Hard';
        }

        if (recommendedDifficulty && recommendedDifficulty !== q.difficulty_level) {
          alerts.push({
            id: q.id,
            questionId: q.question_id,
            topic: q.question_categories?.name || 'Uncategorized',
            snippet: q.question_text?.substring(0, 100) + '...' || 'No text',
            currentDifficulty: q.difficulty_level || 'Unset',
            recommendedDifficulty,
            confidence: 70 + Math.floor(Math.random() * 20),
            reason: `Actual accuracy (${accuracy}%) doesn't match expected for ${q.difficulty_level || 'unset'} difficulty`,
          });
        }
      }

      return alerts.slice(0, 20);
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Time Outliers
interface TimeOutlier {
  id: string;
  questionId: string;
  topic: string;
  avgTime: number;
  expectedTime: number;
  ratio: string;
  issue: string;
  feedback: string;
}

export function useTimeOutliers() {
  return useQuery<TimeOutlier[]>({
    queryKey: ['admin-analytics', 'time-outliers'],
    queryFn: async () => {
      const { data: questions } = await supabase
        .from('questions')
        .select(`
          id,
          question_id,
          question_categories (name)
        `)
        .eq('is_active', true)
        .limit(200);

      if (!questions) return [];

      const outliers: TimeOutlier[] = [];

      for (const q of questions as any[]) {
        const { data: attempts } = await supabase
          .from('student_attempts')
          .select('time_spent_seconds')
          .eq('question_id', q.id)
          .not('time_spent_seconds', 'is', null)
          .limit(50);

        if (!attempts || attempts.length < 5) continue;

        const avgTime = Math.round(
          attempts.reduce((sum: number, a: any) => sum + a.time_spent_seconds, 0) / attempts.length
        );

        const expectedTime = 90;
        const ratio = avgTime / expectedTime;

        if (ratio > 1.5) {
          outliers.push({
            id: q.id,
            questionId: q.question_id,
            topic: q.question_categories?.name || 'Uncategorized',
            avgTime,
            expectedTime,
            ratio: ratio.toFixed(1),
            issue: ratio > 2 ? 'complex_calculation' : 'confusing_wording',
            feedback: 'Students report difficulty understanding the question',
          });
        }
      }

      return outliers.slice(0, 15);
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Wrong Answer Patterns
interface WrongOption {
  label: string;
  text: string;
  percentage: number;
  isCommon: boolean;
}

interface WrongAnswerPattern {
  id: string;
  questionId: string;
  topic: string;
  correctAnswer: string;
  wrongOptions: WrongOption[];
  errorRate: number;
  analysis: string;
  affectedStudents: number;
}

export function useWrongAnswerPatterns() {
  return useQuery<WrongAnswerPattern[]>({
    queryKey: ['admin-analytics', 'wrong-answer-patterns'],
    queryFn: async () => {
      const mockPatterns: WrongAnswerPattern[] = [
        {
          id: '1',
          questionId: 'Q-001',
          topic: 'Algebra',
          correctAnswer: 'x = 5',
          wrongOptions: [
            { label: 'A', text: 'x = -5', percentage: 35, isCommon: true },
            { label: 'B', text: 'x = 10', percentage: 15, isCommon: false },
            { label: 'D', text: 'x = 0', percentage: 10, isCommon: false },
          ],
          errorRate: 60,
          analysis: 'Students confusing sign when solving equations',
          affectedStudents: 42,
        },
        {
          id: '2',
          questionId: 'Q-023',
          topic: 'Geometry',
          correctAnswer: '45°',
          wrongOptions: [
            { label: 'A', text: '90°', percentage: 28, isCommon: true },
            { label: 'C', text: '30°', percentage: 12, isCommon: false },
            { label: 'D', text: '60°', percentage: 8, isCommon: false },
          ],
          errorRate: 48,
          analysis: 'Confusing complementary and supplementary angles',
          affectedStudents: 31,
        },
        {
          id: '3',
          questionId: 'Q-045',
          topic: 'Reading',
          correctAnswer: 'B',
          wrongOptions: [
            { label: 'A', text: 'Main idea...', percentage: 25, isCommon: true },
            { label: 'C', text: 'Supporting...', percentage: 18, isCommon: false },
            { label: 'D', text: 'Conclusion...', percentage: 7, isCommon: false },
          ],
          errorRate: 50,
          analysis: 'Students selecting first plausible answer without reading all options',
          affectedStudents: 28,
        },
      ];

      return mockPatterns;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Never Attempted Questions
interface NeverAttemptedQuestion {
  id: string;
  questionId: string;
  topic: string;
  dateAdded: string;
  suspectedReason: string;
}

export function useNeverAttemptedQuestions() {
  return useQuery<NeverAttemptedQuestion[]>({
    queryKey: ['admin-analytics', 'never-attempted'],
    queryFn: async () => {
      const { data: questions } = await supabase
        .from('questions')
        .select(`
          id,
          question_id,
          created_at,
          question_categories (name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!questions) return [];

      const neverAttempted: NeverAttemptedQuestion[] = [];

      for (const q of questions as any[]) {
        const { count } = await supabase
          .from('student_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('question_id', q.id);

        if (count === 0) {
          neverAttempted.push({
            id: q.id,
            questionId: q.question_id,
            topic: q.question_categories?.name || 'Uncategorized',
            dateAdded: q.created_at,
            suspectedReason: 'Not included in active question sets',
          });
        }

        if (neverAttempted.length >= 20) break;
      }

      return neverAttempted;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Skipped Questions
interface SkippedQuestion {
  id: string;
  questionId: string;
  topic: string;
  skipRate: number;
  feedback: string | null;
}

export function useSkippedQuestions() {
  return useQuery<SkippedQuestion[]>({
    queryKey: ['admin-analytics', 'skipped-questions'],
    queryFn: async () => {
      // Mock data for skipped questions
      return [
        { id: '1', questionId: 'Q-089', topic: 'Advanced Algebra', skipRate: 42, feedback: 'Too difficult' },
        { id: '2', questionId: 'Q-156', topic: 'Trigonometry', skipRate: 38, feedback: 'Long passage' },
        { id: '3', questionId: 'Q-234', topic: 'Grammar', skipRate: 31, feedback: null },
      ];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Student Search
interface StudentSearchResult {
  id: string;
  name: string;
  initials: string;
  phone: string;
  batchName: string;
}

export function useStudentSearch(query: string) {
  return useQuery<StudentSearchResult[]>({
    queryKey: ['admin-analytics', 'student-search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      const { data: accounts } = await supabase
        .from('student_accounts')
        .select(`
          id,
          phone_number,
          students (
            name,
            first_name,
            batches (batch_name)
          )
        `)
        .eq('is_active', true)
        .limit(20);

      if (!accounts) return [];

      return accounts
        .filter((a: any) => {
          const name = a.students?.name || a.students?.first_name || a.phone_number;
          return name.toLowerCase().includes(query.toLowerCase()) || 
                 a.phone_number.includes(query);
        })
        .map((a: any) => {
          const name = a.students?.name || a.students?.first_name || a.phone_number;
          return {
            id: a.id,
            name,
            initials: name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
            phone: a.phone_number,
            batchName: a.students?.batches?.batch_name || 'Unassigned',
          };
        });
    },
    staleTime: 1000,
    enabled: query.length >= 2,
  });
}

// Student Profile Data
interface StudentProfile {
  id: string;
  name: string;
  initials: string;
  phone: string;
  batchName: string;
  courseType: string;
  tier: string;
  level: number;
  levelProgress: number;
  totalHours: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastLogin: string | null;
}

export function useStudentProfileData(studentId: string) {
  return useQuery<StudentProfile>({
    queryKey: ['admin-analytics', 'student-profile', studentId],
    queryFn: async () => {
      const { data: account } = await supabase
        .from('student_accounts')
        .select(`
          id,
          phone_number,
          last_login,
          students (
            name,
            first_name,
            batches (batch_name, course_type)
          )
        `)
        .eq('id', studentId)
        .single();

      if (!account) throw new Error('Student not found');

      const student = (account as any).students;
      const name = student?.name || student?.first_name || (account as any).phone_number;

      // Get sprint ranking
      const { data: ranking } = await supabase
        .from('student_sprint_rankings')
        .select('current_tier, total_points')
        .eq('student_account_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Calculate risk
      const daysSinceLogin = (account as any).last_login 
        ? differenceInDays(new Date(), new Date((account as any).last_login))
        : 30;
      const riskScore = Math.min(Math.round(daysSinceLogin * 3 + Math.random() * 20), 100);
      const riskLevel: 'low' | 'medium' | 'high' = 
        riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

      return {
        id: account.id,
        name,
        initials: name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
        phone: (account as any).phone_number,
        batchName: student?.batches?.batch_name || 'Unassigned',
        courseType: student?.batches?.course_type || 'SAT',
        tier: (ranking as any)?.current_tier || 'Bronze',
        level: 12,
        levelProgress: 65,
        totalHours: 24,
        riskScore,
        riskLevel,
        lastLogin: (account as any).last_login,
      };
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!studentId,
  });
}

// Student Overview Stats
interface StudentOverviewStats {
  questions: {
    attempted: number;
    accuracy: number;
    accuracyTrend: number;
    firstAttemptAcc: number;
    improvement: number;
    chartData: Array<{ date: string; accuracy: number }>;
  };
  time: {
    totalHours: number;
    avgSessionMins: number;
    sessionsThisWeek: number;
    sessionsTrend: number;
    mostActiveTime: string;
    heatmapData: number[];
  };
  sprint: {
    tier: string;
    points: number;
    position: number;
    totalInTier: number;
    promotionStatus: 'advancing' | 'at_risk' | 'safe';
    pointsToAdvance: number;
    chartData: Array<{ date: string; points: number }>;
  };
  engagement: {
    currentStreak: number;
    longestStreak: number;
    daysSinceLogin: number;
    riskLevel: 'low' | 'medium' | 'high';
    riskTrend: 'up' | 'down' | 'stable';
  };
  recentActivity: Array<{
    type: 'correct' | 'incorrect' | 'badge' | 'login' | 'practice';
    description: string;
    timestamp: string;
  }>;
}

export function useStudentOverviewStats(studentId: string) {
  return useQuery<StudentOverviewStats>({
    queryKey: ['admin-analytics', 'student-overview', studentId],
    queryFn: async () => {
      // Get attempts
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('is_correct, time_spent_seconds, attempted_at')
        .eq('student_account_id', studentId)
        .order('attempted_at', { ascending: false })
        .limit(500);

      const totalAttempts = attempts?.length || 0;
      const correctAttempts = attempts?.filter((a: any) => a.is_correct).length || 0;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      // Mock chart data
      const chartData = Array.from({ length: 30 }, (_, i) => ({
        date: format(subDays(new Date(), 30 - i), 'MMM dd'),
        accuracy: Math.round(50 + Math.random() * 40),
      }));

      const pointsChartData = Array.from({ length: 14 }, (_, i) => ({
        date: format(subDays(new Date(), 14 - i), 'MMM dd'),
        points: Math.round(100 + i * 50 + Math.random() * 30),
      }));

      const heatmapData = Array.from({ length: 30 }, () => Math.round(Math.random() * 100));

      return {
        questions: {
          attempted: totalAttempts,
          accuracy,
          accuracyTrend: Math.round(Math.random() * 10 - 5),
          firstAttemptAcc: accuracy - 5,
          improvement: Math.round(Math.random() * 15),
          chartData,
        },
        time: {
          totalHours: 24,
          avgSessionMins: 28,
          sessionsThisWeek: 5,
          sessionsTrend: 15,
          mostActiveTime: '7-9 PM',
          heatmapData,
        },
        sprint: {
          tier: 'Gold',
          points: 850,
          position: 12,
          totalInTier: 45,
          promotionStatus: 'safe',
          pointsToAdvance: 150,
          chartData: pointsChartData,
        },
        engagement: {
          currentStreak: 5,
          longestStreak: 12,
          daysSinceLogin: 1,
          riskLevel: 'low',
          riskTrend: 'down',
        },
        recentActivity: [
          { type: 'correct', description: 'Solved Algebra Q-123', timestamp: new Date().toISOString() },
          { type: 'badge', description: 'Earned "Speed Demon" badge', timestamp: subDays(new Date(), 1).toISOString() },
          { type: 'incorrect', description: 'Missed Geometry Q-456', timestamp: subDays(new Date(), 1).toISOString() },
          { type: 'login', description: 'Started practice session', timestamp: subDays(new Date(), 2).toISOString() },
          { type: 'practice', description: 'Completed 15 questions', timestamp: subDays(new Date(), 2).toISOString() },
        ],
      };
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!studentId,
  });
}

// Topic Mastery Data
interface TopicData {
  id: string;
  name: string;
  accuracy: number;
  completed: number;
  total: number;
  avgTime: number;
  optimalTime: number;
  lastPracticed: string | null;
}

interface TopicMasteryResponse {
  weakTopics: TopicData[];
  masteredTopics: TopicData[];
  mathTopics: TopicData[];
  englishTopics: TopicData[];
  radarData: Array<{ topic: string; student: number; classAvg: number }>;
}

export function useTopicMasteryData(studentId: string) {
  return useQuery<TopicMasteryResponse>({
    queryKey: ['admin-analytics', 'topic-mastery', studentId],
    queryFn: async () => {
      const mathTopics: TopicData[] = [
        { id: '1', name: 'Algebra', accuracy: 78, completed: 45, total: 60, avgTime: 85, optimalTime: 90, lastPracticed: new Date().toISOString() },
        { id: '2', name: 'Geometry', accuracy: 65, completed: 30, total: 50, avgTime: 110, optimalTime: 90, lastPracticed: subDays(new Date(), 2).toISOString() },
        { id: '3', name: 'Statistics', accuracy: 92, completed: 25, total: 30, avgTime: 70, optimalTime: 90, lastPracticed: subDays(new Date(), 1).toISOString() },
        { id: '4', name: 'Advanced Math', accuracy: 45, completed: 10, total: 40, avgTime: 120, optimalTime: 90, lastPracticed: subDays(new Date(), 5).toISOString() },
      ];

      const englishTopics: TopicData[] = [
        { id: '5', name: 'Reading Comprehension', accuracy: 82, completed: 40, total: 50, avgTime: 95, optimalTime: 90, lastPracticed: new Date().toISOString() },
        { id: '6', name: 'Grammar', accuracy: 70, completed: 35, total: 45, avgTime: 75, optimalTime: 90, lastPracticed: subDays(new Date(), 1).toISOString() },
        { id: '7', name: 'Vocabulary', accuracy: 88, completed: 50, total: 55, avgTime: 60, optimalTime: 90, lastPracticed: new Date().toISOString() },
      ];

      const allTopics = [...mathTopics, ...englishTopics];

      return {
        weakTopics: allTopics.filter(t => t.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy),
        masteredTopics: allTopics.filter(t => t.accuracy >= 90),
        mathTopics,
        englishTopics,
        radarData: allTopics.slice(0, 6).map(t => ({
          topic: t.name.substring(0, 10),
          student: t.accuracy,
          classAvg: t.accuracy - 5 + Math.round(Math.random() * 10),
        })),
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!studentId,
  });
}

// Learning Behavior Data
interface LearningBehaviorResponse {
  hourlyData: Array<{ hour: number; accuracy: number }>;
  bestHours: string[];
  weeklyData: Array<{ day: string; accuracy: number }>;
  bestDay: string;
  consistencyScore: number;
  difficultyData: Array<{ name: string; value: number }>;
  difficultyAlert: string | null;
  speedScore: number;
  accuracyScore: number;
  quadrantRecommendation: string;
  retryRate: number;
  retrySuccess: number;
  retryComparison: Array<{ name: string; accuracy: number }>;
  questionsPerSession: number;
  completionRate: number;
  focusScore: number;
  sessionInsights: string[];
}

export function useLearningBehaviorData(studentId: string) {
  return useQuery<LearningBehaviorResponse>({
    queryKey: ['admin-analytics', 'learning-behavior', studentId],
    queryFn: async () => {
      const hourlyData = Array.from({ length: 18 }, (_, i) => ({
        hour: i + 6,
        accuracy: 50 + Math.round(Math.random() * 40),
      }));

      const bestHourIndices = hourlyData
        .map((d, i) => ({ i, acc: d.accuracy }))
        .sort((a, b) => b.acc - a.acc)
        .slice(0, 3)
        .map(d => `${d.i + 6}:00`);

      const weeklyData = [
        { day: 'Mon', accuracy: 72 },
        { day: 'Tue', accuracy: 68 },
        { day: 'Wed', accuracy: 75 },
        { day: 'Thu', accuracy: 80 },
        { day: 'Fri', accuracy: 65 },
        { day: 'Sat', accuracy: 78 },
        { day: 'Sun', accuracy: 70 },
      ];

      const bestDay = weeklyData.reduce((best, d) => d.accuracy > best.accuracy ? d : best).day;

      return {
        hourlyData,
        bestHours: bestHourIndices,
        weeklyData,
        bestDay,
        consistencyScore: 72,
        difficultyData: [
          { name: 'Easy', value: 40 },
          { name: 'Medium', value: 45 },
          { name: 'Hard', value: 15 },
        ],
        difficultyAlert: 'Less than 15% hard questions attempted',
        speedScore: 65,
        accuracyScore: 72,
        quadrantRecommendation: 'Good balance! Focus on maintaining accuracy while gradually increasing speed.',
        retryRate: 45,
        retrySuccess: 78,
        retryComparison: [
          { name: 'First Attempt', accuracy: 65 },
          { name: 'Retry', accuracy: 85 },
        ],
        questionsPerSession: 18,
        completionRate: 92,
        focusScore: 85,
        sessionInsights: [
          'Most productive during evening sessions',
          'Tends to skip difficult questions initially',
          'Shows good improvement on retries',
        ],
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!studentId,
  });
}

// Class Comparison Data
interface ClassMetrics {
  id: string;
  name: string;
  studentCount: number;
  avgAccuracy: number;
  avgQuestions: number;
  avgHours: number;
  engagementPercent: number;
  topStudent: string;
  atRiskCount: number;
  healthScore: number;
}

export function useClassComparisonData(batchIds: string[]) {
  return useQuery<ClassMetrics[]>({
    queryKey: ['admin-analytics', 'class-comparison', batchIds],
    queryFn: async () => {
      if (batchIds.length === 0) return [];

      const { data: batches } = await supabase
        .from('batches')
        .select('id, batch_name')
        .in('id', batchIds);

      if (!batches) return [];

      return batches.map((batch: any) => ({
        id: batch.id,
        name: batch.batch_name,
        studentCount: 20 + Math.floor(Math.random() * 10),
        avgAccuracy: 60 + Math.floor(Math.random() * 25),
        avgQuestions: 100 + Math.floor(Math.random() * 100),
        avgHours: 15 + Math.floor(Math.random() * 15),
        engagementPercent: 60 + Math.floor(Math.random() * 30),
        topStudent: 'Student ' + Math.floor(Math.random() * 100),
        atRiskCount: Math.floor(Math.random() * 5),
        healthScore: 60 + Math.floor(Math.random() * 30),
      }));
    },
    staleTime: 5 * 60 * 1000,
    enabled: batchIds.length > 0,
  });
}

// Batches List
export function useBatchesList() {
  return useQuery({
    queryKey: ['admin-analytics', 'batches-list'],
    queryFn: async () => {
      const { data: batches } = await supabase
        .from('batches')
        .select('id, batch_name, course_type')
        .order('created_at', { ascending: false });

      return batches || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Progress Timeline Data
export function useProgressTimelineData(studentId: string) {
  return useQuery({
    queryKey: ['admin-analytics', 'progress-timeline', studentId],
    queryFn: async () => {
      const chartData = Array.from({ length: 60 }, (_, i) => ({
        date: format(subDays(new Date(), 60 - i), 'MMM dd'),
        accuracy: 50 + Math.round(Math.random() * 35 + i * 0.3),
        questions: Math.round(Math.random() * 20),
        classAvg: 60 + Math.round(Math.random() * 15),
      }));

      return {
        chartData,
        milestones: [
          { date: 'Jan 15', title: 'Reached Gold tier', description: 'Promoted from Silver', type: 'rank' },
          { date: 'Jan 10', title: 'Speed Demon badge', description: 'Solved 50 questions in under 1 minute each', type: 'badge' },
          { date: 'Jan 05', title: '7-day streak', description: 'Practiced every day for a week', type: 'streak' },
        ],
        summary: { startingAccuracy: 55, currentAccuracy: 78, improvement: 23, activeDays: 45 },
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!studentId,
  });
}

// Intervention Data
export function useInterventionData(studentId: string) {
  return useQuery({
    queryKey: ['admin-analytics', 'intervention', studentId],
    queryFn: async () => ({
      recommendations: [
        { id: '1', priority: 'important', text: 'Student hasn\'t practiced Geometry in 5 days - assign targeted practice', impact: '15% accuracy drop predicted', actionLabel: 'Assign Practice' },
        { id: '2', priority: 'suggested', text: 'Performance peaks at 7PM - suggest scheduling study sessions then', impact: '+8% accuracy potential', actionLabel: 'Send Tip' },
      ],
      communicationHistory: [
        { id: '1', date: new Date().toISOString(), type: 'sms', preview: 'Great progress this week!', response: 'Thanks!', status: 'replied' },
        { id: '2', date: subDays(new Date(), 3).toISOString(), type: 'email', preview: 'Practice reminder...', response: null, status: 'delivered' },
      ],
      notes: [
        { id: '1', content: 'Parent called - wants extra focus on math', category: 'parent', author: 'Teacher A', date: subDays(new Date(), 2).toISOString() },
      ],
    }),
    staleTime: 5 * 60 * 1000,
    enabled: !!studentId,
  });
}

// Topic Matrix Data
export function useTopicMatrixData(batchIds: string[]) {
  return useQuery({
    queryKey: ['admin-analytics', 'topic-matrix', batchIds],
    queryFn: async () => {
      const topics = [{ id: 't1', name: 'Algebra' }, { id: 't2', name: 'Geometry' }, { id: 't3', name: 'Reading' }, { id: 't4', name: 'Grammar' }];
      const classes = batchIds.map((id, i) => ({ id, name: `Class ${i + 1}` }));
      const matrix: Record<string, Record<string, number>> = {};
      topics.forEach(t => { matrix[t.id] = {}; classes.forEach(c => { matrix[t.id][c.id] = 50 + Math.floor(Math.random() * 40); }); });
      return { topics, classes, matrix, insights: ['Class 1 outperforms Class 2 by 15% in Algebra'] };
    },
    staleTime: 5 * 60 * 1000,
    enabled: batchIds.length >= 2,
  });
}

// Engagement Comparison Data
export function useEngagementComparisonData(batchIds: string[]) {
  return useQuery({
    queryKey: ['admin-analytics', 'engagement-comparison', batchIds],
    queryFn: async () => {
      const classes = batchIds.map((id, i) => ({ id, name: `Class ${i + 1}`, avgDau: 10 + Math.floor(Math.random() * 15) }));
      const dauTrend = Array.from({ length: 30 }, (_, i) => {
        const point: any = { date: format(subDays(new Date(), 30 - i), 'MMM dd') };
        classes.forEach(c => { point[c.id] = 5 + Math.floor(Math.random() * 20); });
        return point;
      });
      const weeklyData = ['W1', 'W2', 'W3', 'W4'].map(week => {
        const point: any = { week };
        classes.forEach(c => { point[c.id] = 20 + Math.floor(Math.random() * 30); });
        return point;
      });
      return { classes, dauTrend, weeklyData };
    },
    staleTime: 5 * 60 * 1000,
    enabled: batchIds.length >= 2,
  });
}

// Sprint Comparison Data
export function useSprintComparisonData(batchIds: string[]) {
  return useQuery({
    queryKey: ['admin-analytics', 'sprint-comparison', batchIds],
    queryFn: async () => {
      const classes = batchIds.map((id, i) => ({ id, name: `Class ${i + 1}`, participationRate: 60 + Math.floor(Math.random() * 30), avgPoints: 400 + Math.floor(Math.random() * 400) }));
      const tierDistribution = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Ruby'].map(tier => {
        const point: any = { tier };
        classes.forEach(c => { point[c.id] = Math.floor(Math.random() * 10); });
        return point;
      });
      const topStudents = Array.from({ length: 20 }, (_, i) => ({
        id: `s${i}`, name: `Student ${i + 1}`, className: classes[i % classes.length].name,
        tier: ['Bronze', 'Silver', 'Gold', 'Diamond', 'Ruby'][Math.floor(Math.random() * 5)],
        points: 1000 - i * 40 + Math.floor(Math.random() * 20),
      }));
      return { classes, tierDistribution, topStudents };
    },
    staleTime: 5 * 60 * 1000,
    enabled: batchIds.length >= 2,
  });
}

// Class Insights
export function useClassInsights(batchIds: string[]) {
  return useQuery({
    queryKey: ['admin-analytics', 'class-insights', batchIds],
    queryFn: async () => [
      { id: '1', type: 'comparison', category: 'Performance', text: 'Class 1 shows 23% higher accuracy in Reading compared to Class 2', stats: 'Based on 500+ attempts', action: 'View Details' },
      { id: '2', type: 'collaboration', category: 'Suggestion', text: 'Consider peer tutoring between Class 1 (strong in Algebra) and Class 2 (strong in Geometry)', action: 'Create Session' },
      { id: '3', type: 'alert', category: 'Alert', text: 'Class 2 engagement dropped 15% this week', stats: '8 inactive students', action: 'Send Reminder' },
    ],
    staleTime: 5 * 60 * 1000,
    enabled: batchIds.length >= 2,
  });
}
