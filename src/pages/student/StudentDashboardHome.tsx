import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format, subWeeks, startOfWeek, endOfWeek, differenceInDays, parseISO, addMonths } from 'date-fns';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Target, BookOpen, Award, Pencil, RotateCcw, CalendarIcon,
  TrendingUp, Clock, Brain, Loader2, Zap, Timer, ChevronDown, Trophy, FileText, X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ClosingReportContent, useClosingReportData } from '@/pages/student/StudentClosingReport';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PracticeTestScoreDrawer } from '@/components/student/PracticeTestScoreDrawer';
import { ScorePathwayCard } from '@/components/student/ScorePathwayCard';
import { useScoreTarget } from '@/hooks/useScoreTarget';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useStudentTier } from '@/hooks/useStudentTier';
import { TIER_COLORS, TIER_DISPLAY_NAMES, TierType } from '@/data/badgeDefinitions';
import { CalibrationProgressCard } from '@/components/student/CalibrationProgressCard';
import { useSyncBadgeProgress } from '@/hooks/useSyncBadgeProgress';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

const chartConfig = {
  mastery: {
    label: "Mastery",
    color: "hsl(var(--primary))",
  },
  accuracy: {
    label: "Accuracy",
    color: "hsl(var(--primary))",
  },
};

export default function StudentDashboardHome() {
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const [categoryTab, setCategoryTab] = useState<'math' | 'english'>('math');
  const [showClosingReport, setShowClosingReport] = useState(false);
  const { isEnabled } = useFeatureFlags();
  const [radarSubject, setRadarSubject] = useState<'math' | 'english'>('math');
  const [selectedSatDate, setSelectedSatDate] = useState<Date | null>(null);
  
  // Score target hook
  const { targetScore, currentScore: targetCurrentScore, weakestTopic, updateTargetScore, isLoading: scoreTargetLoading } = useScoreTarget();
  
  // Badge progress sync
  const { syncBadgeProgress } = useSyncBadgeProgress();
  const badgeSyncRef = useRef(false);

  // Sync badge progress on mount (once)
  useEffect(() => {
    if (student?.id && !badgeSyncRef.current) {
      badgeSyncRef.current = true;
      syncBadgeProgress().then(newlyUnlocked => {
        if (newlyUnlocked.length > 0) {
          toast.success(`🎉 Badge${newlyUnlocked.length > 1 ? 's' : ''} unlocked: ${newlyUnlocked.join(', ')}`);
        }
      });
    }
  }, [student?.id, syncBadgeProgress]);

  // Check if batch is completed (session_15 marked) for closing report
  const studentId = student?.linked_student?.id;
  const batchId = student?.linked_student?.batch_id;

  const { data: batchCompleted } = useQuery({
    queryKey: ['batch-completed-check', studentId, batchId],
    enabled: !!studentId && !!batchId && isEnabled('closing_reports'),
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('session_15')
        .eq('student_id', studentId!)
        .eq('batch_id', batchId!)
        .maybeSingle();
      return data?.session_15 != null;
    },
  });

  const { data: closingReportData, isLoading: closingReportLoading } = useClosingReportData(
    batchCompleted ? studentId : undefined,
    batchCompleted ? batchId : undefined
  );

  const { data: closingReportSettings } = useQuery({
    queryKey: ['closing-report-settings'],
    enabled: !!batchCompleted,
    queryFn: async () => {
      const { data } = await supabase
        .from('closing_report_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const [closingShareToken, setClosingShareToken] = useState<string | null>(null);
  useEffect(() => {
    if (!studentId || !batchId || !batchCompleted) return;
    (async () => {
      const { data: existing } = await supabase
        .from('closing_report_tokens')
        .select('token')
        .eq('student_id', studentId)
        .eq('batch_id', batchId)
        .maybeSingle();
      if (existing) setClosingShareToken(existing.token);
    })();
  }, [studentId, batchId, batchCompleted]);

  // Auto-show closing report once
  useEffect(() => {
    if (batchCompleted && closingReportData && isEnabled('closing_reports')) {
      const dismissKey = `closing_report_dismissed_${student?.id}`;
      if (!localStorage.getItem(dismissKey)) {
        setShowClosingReport(true);
        localStorage.setItem(dismissKey, 'true');
      }
    }
  }, [batchCompleted, closingReportData, student?.id, isEnabled]);

  useEffect(() => {
    const storedDate = student?.linked_student?.sat_test_month;
    if (storedDate) {
      try {
        const parsed = parseISO(storedDate);
        if (!isNaN(parsed.getTime())) {
          setSelectedSatDate(parsed);
        }
      } catch {}
    }
  }, [student?.linked_student?.sat_test_month]);

  // Fetch dashboard stats - auto-refresh on focus
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['student-dashboard-stats', student?.id],
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000, // Consider stale after 30 seconds
    queryFn: async () => {
      if (!student?.id) return null;

      // Fetch ALL 68 problems (original + variations treated as separate)
      const { data: questions68 } = await supabase
        .from('questions')
        .select('id')
        .eq('question_set', '68')
        .eq('is_active', true);

      const question68Ids = questions68?.map(q => q.id) || [];
      const total68Count = question68Ids.length;

      // Count correct attempts - each question (original or variation) counts separately
      const { data: attempts68 } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', student.id)
        .eq('is_correct', true)
        .in('question_id', question68Ids.length > 0 ? question68Ids : ['00000000-0000-0000-0000-000000000000']);

      const unique68Correct = new Set(attempts68?.map(a => a.question_id) || []);
      const completed68Count = unique68Correct.size;
      const completion68 = total68Count > 0
        ? Math.round((completed68Count / total68Count) * 100) 
        : 0;

      // Fetch CB questions completion
      const { data: cbQuestions } = await supabase
        .from('questions')
        .select('id')
        .eq('question_set', 'CollegeBoard')
        .eq('is_active', true);

      const cbQuestionIds = cbQuestions?.map(q => q.id) || [];

      const { data: cbAttempts } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', student.id)
        .eq('is_correct', true)
        .in('question_id', cbQuestionIds.length > 0 ? cbQuestionIds : ['00000000-0000-0000-0000-000000000000']);

      const uniqueCBCorrect = new Set(cbAttempts?.map(a => a.question_id) || []);
      const totalCBCount = cbQuestions?.length || 0;
      const completedCBCount = uniqueCBCorrect.size;
      const cbCompletion = totalCBCount > 0
        ? Math.round((completedCBCount / totalCBCount) * 100) 
        : 0;

      // Fetch practice tests for all linked students (handles multi-batch enrollment)
      let practiceTestAvg = 0;
      const allStudentIds = student.linked_students?.map(s => s.id) || 
        (student.linked_student_id ? [student.linked_student_id] : []);
      if (allStudentIds.length > 0) {
        const { data: practiceTests } = await supabase
          .from('practice_tests')
          .select('test_number, score')
          .in('student_id', allStudentIds)
          .order('test_number');

        const tests1to8 = practiceTests?.filter(t => t.test_number >= 1 && t.test_number <= 8 && t.score) || [];
        if (tests1to8.length > 0) {
          practiceTestAvg = Math.round(tests1to8.reduce((sum, t) => sum + (t.score || 0), 0) / tests1to8.length);
        }
      }

      // Fetch 150 Hard questions completion
      const { data: hard150Questions } = await supabase
        .from('questions')
        .select('id')
        .eq('question_set', 'SATMathTraining800')
        .eq('is_active', true);

      const hard150Ids = hard150Questions?.map(q => q.id) || [];

      const { data: hard150Attempts } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', student.id)
        .eq('is_correct', true)
        .in('question_id', hard150Ids.length > 0 ? hard150Ids : ['00000000-0000-0000-0000-000000000000']);

      const uniqueHard150Correct = new Set(hard150Attempts?.map(a => a.question_id) || []);
      const totalHard150 = hard150Questions?.length || 0;
      const completedHard150 = uniqueHard150Correct.size;
      const hard150Completion = totalHard150 > 0
        ? Math.round((completedHard150 / totalHard150) * 100)
        : 0;

      return {
        completion68,
        total68: total68Count,
        completed68: completed68Count,
        cbCompletion,
        totalCB: totalCBCount,
        completedCB: completedCBCount,
        practiceTestAvg,
        hard150Completion,
        totalHard150,
        completedHard150,
      };
    },
    enabled: !!student?.id,
  });

  // Fetch mastery data for MATH radar chart (6 axes: 4 categories + speed + vocab)
  const { data: mathMasteryData, isLoading: mathMasteryLoading } = useQuery({
    queryKey: ['student-math-mastery-data', student?.id],
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!student?.id) return [];

      // Fetch ALL active Math questions (68 + CollegeBoard)
      const { data: allMathQuestions } = await supabase
        .from('questions')
        .select('id, subtopic, question_categories(name)')
        .ilike('subject', 'math')
        .eq('is_active', true);

      // Fetch student's correct attempts for math questions
      const mathQuestionIds = allMathQuestions?.map(q => q.id) || [];
      const { data: correctAttempts } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', student.id)
        .eq('is_correct', true)
        .in('question_id', mathQuestionIds.length > 0 ? mathQuestionIds : ['00000000-0000-0000-0000-000000000000']);

      const correctQuestionIds = new Set(correctAttempts?.map(a => a.question_id) || []);

      // Categorize questions into 4 main SAT Math categories
      const mathCategories = {
        'Algebra': { total: 0, completed: 0 },
        'Advanced Math': { total: 0, completed: 0 },
        'Geo & Trig': { total: 0, completed: 0 },
        'Problem Solving': { total: 0, completed: 0 },
      };

      allMathQuestions?.forEach((q: any) => {
        const categoryName = q.question_categories?.name || '';
        const subtopic = q.subtopic || '';
        
        let category = 'Algebra'; // default
        
        if (categoryName.toLowerCase().includes('advanced') || 
            subtopic.toLowerCase().includes('advanced') || 
            subtopic.toLowerCase().includes('quadratic') || 
            subtopic.toLowerCase().includes('polynomial') ||
            subtopic.toLowerCase().includes('exponential') ||
            subtopic.toLowerCase().includes('function') ||
            subtopic.toLowerCase().includes('nonlinear')) {
          category = 'Advanced Math';
        } else if (categoryName.toLowerCase().includes('geometry') || 
                   categoryName.toLowerCase().includes('trigonometry') ||
                   subtopic.toLowerCase().includes('geometry') || 
                   subtopic.toLowerCase().includes('trig') || 
                   subtopic.toLowerCase().includes('circle') ||
                   subtopic.toLowerCase().includes('angle') ||
                   subtopic.toLowerCase().includes('triangle') ||
                   subtopic.toLowerCase().includes('area') ||
                   subtopic.toLowerCase().includes('volume')) {
          category = 'Geo & Trig';
        } else if (categoryName.toLowerCase().includes('problem') || 
                   categoryName.toLowerCase().includes('data') ||
                   subtopic.toLowerCase().includes('data') || 
                   subtopic.toLowerCase().includes('problem') || 
                   subtopic.toLowerCase().includes('ratio') ||
                   subtopic.toLowerCase().includes('percent') ||
                   subtopic.toLowerCase().includes('probability') ||
                   subtopic.toLowerCase().includes('statistics')) {
          category = 'Problem Solving';
        }

        mathCategories[category as keyof typeof mathCategories].total++;
        if (correctQuestionIds.has(q.id)) {
          mathCategories[category as keyof typeof mathCategories].completed++;
        }
      });

      // Calculate Speed score (target: 20s per problem)
      const { data: speedAttempts } = await supabase
        .from('student_attempts')
        .select('time_spent_seconds')
        .eq('student_account_id', student.id)
        .eq('attempt_number', 1)
        .eq('is_correct', true)
        .in('question_id', mathQuestionIds.length > 0 ? mathQuestionIds : ['00000000-0000-0000-0000-000000000000'])
        .not('time_spent_seconds', 'is', null);

      let speedScore = 0;
      if (speedAttempts && speedAttempts.length > 0) {
        const avgTime = speedAttempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / speedAttempts.length;
        // Target: 20s = 100%, 60s+ = 0%
        speedScore = Math.max(0, Math.min(100, Math.round(100 - ((avgTime - 20) / 40) * 100)));
      }

      // Fetch Math vocab progress (vocabulary is shared, count all)
      const { data: vocabTotal } = await supabase
        .from('vocabulary_words')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      const { data: vocabLearned } = await supabase
        .from('student_vocabulary_progress')
        .select('word_id')
        .eq('student_account_id', student.id);

      const totalWords = (vocabTotal as any)?.count || 0;
      const learnedWords = vocabLearned?.length || 0;
      const vocabScore = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

      return [
        { 
          area: 'Algebra', 
          score: mathCategories['Algebra'].total > 0 
            ? Math.round((mathCategories['Algebra'].completed / mathCategories['Algebra'].total) * 100) 
            : 0,
          fullMark: 100 
        },
        { 
          area: 'Advanced Math', 
          score: mathCategories['Advanced Math'].total > 0 
            ? Math.round((mathCategories['Advanced Math'].completed / mathCategories['Advanced Math'].total) * 100) 
            : 0,
          fullMark: 100 
        },
        { 
          area: 'Geo & Trig', 
          score: mathCategories['Geo & Trig'].total > 0 
            ? Math.round((mathCategories['Geo & Trig'].completed / mathCategories['Geo & Trig'].total) * 100) 
            : 0,
          fullMark: 100 
        },
        { 
          area: 'Problem Solving', 
          score: mathCategories['Problem Solving'].total > 0 
            ? Math.round((mathCategories['Problem Solving'].completed / mathCategories['Problem Solving'].total) * 100) 
            : 0,
          fullMark: 100 
        },
        { area: 'Speed', score: speedScore, fullMark: 100 },
        { area: 'Vocab', score: vocabScore, fullMark: 100 },
      ];
    },
    enabled: !!student?.id,
  });

  // Fetch mastery data for ENGLISH radar chart (4 SAT English categories)
  const { data: englishMasteryData, isLoading: englishMasteryLoading } = useQuery({
    queryKey: ['student-english-mastery-data', student?.id],
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!student?.id) return [];

      // Fetch ALL active English questions
      const { data: allEnglishQuestions } = await supabase
        .from('questions')
        .select('id, subtopic, question_categories(name)')
        .ilike('subject', 'english')
        .eq('is_active', true);

      const englishQuestionIds = allEnglishQuestions?.map(q => q.id) || [];
      
      // Fetch student's correct attempts
      const { data: correctAttempts } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', student.id)
        .eq('is_correct', true)
        .in('question_id', englishQuestionIds.length > 0 ? englishQuestionIds : ['00000000-0000-0000-0000-000000000000']);

      const correctQuestionIds = new Set(correctAttempts?.map(a => a.question_id) || []);

      // SAT English categories
      const englishCategories = {
        'Information & Ideas': { total: 0, completed: 0 },
        'Craft & Structure': { total: 0, completed: 0 },
        'Standard English': { total: 0, completed: 0 },
        'Expression of Ideas': { total: 0, completed: 0 },
      };

      allEnglishQuestions?.forEach((q: any) => {
        const categoryName = q.question_categories?.name || '';
        const subtopic = q.subtopic || '';
        
        let category = 'Information & Ideas'; // default
        
        if (categoryName.toLowerCase().includes('craft') || 
            subtopic.toLowerCase().includes('craft') ||
            subtopic.toLowerCase().includes('structure') ||
            subtopic.toLowerCase().includes('purpose') ||
            subtopic.toLowerCase().includes('tone')) {
          category = 'Craft & Structure';
        } else if (categoryName.toLowerCase().includes('standard') || 
                   categoryName.toLowerCase().includes('convention') ||
                   subtopic.toLowerCase().includes('convention') ||
                   subtopic.toLowerCase().includes('grammar') ||
                   subtopic.toLowerCase().includes('punctuation') ||
                   subtopic.toLowerCase().includes('sentence')) {
          category = 'Standard English';
        } else if (categoryName.toLowerCase().includes('expression') ||
                   subtopic.toLowerCase().includes('expression') ||
                   subtopic.toLowerCase().includes('transition') ||
                   subtopic.toLowerCase().includes('rhetorical')) {
          category = 'Expression of Ideas';
        }

        englishCategories[category as keyof typeof englishCategories].total++;
        if (correctQuestionIds.has(q.id)) {
          englishCategories[category as keyof typeof englishCategories].completed++;
        }
      });

      return [
        { 
          area: 'Information & Ideas', 
          score: englishCategories['Information & Ideas'].total > 0 
            ? Math.round((englishCategories['Information & Ideas'].completed / englishCategories['Information & Ideas'].total) * 100) 
            : 0,
          fullMark: 100 
        },
        { 
          area: 'Craft & Structure', 
          score: englishCategories['Craft & Structure'].total > 0 
            ? Math.round((englishCategories['Craft & Structure'].completed / englishCategories['Craft & Structure'].total) * 100) 
            : 0,
          fullMark: 100 
        },
        { 
          area: 'Standard English', 
          score: englishCategories['Standard English'].total > 0 
            ? Math.round((englishCategories['Standard English'].completed / englishCategories['Standard English'].total) * 100) 
            : 0,
          fullMark: 100 
        },
        { 
          area: 'Expression of Ideas', 
          score: englishCategories['Expression of Ideas'].total > 0 
            ? Math.round((englishCategories['Expression of Ideas'].completed / englishCategories['Expression of Ideas'].total) * 100) 
            : 0,
          fullMark: 100 
        },
      ];
    },
    enabled: !!student?.id,
  });

  // Fetch weekly accuracy history
  const { data: weeklyData, isLoading: weeklyLoading } = useQuery({
    queryKey: ['student-weekly-accuracy', student?.id],
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!student?.id) return [];

      const weeks = [];
      for (let i = 4; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(new Date(), i));
        const weekEnd = endOfWeek(subWeeks(new Date(), i));

        const { data: weekAttempts } = await supabase
          .from('student_attempts')
          .select('is_correct')
          .eq('student_account_id', student.id)
          .gte('attempted_at', weekStart.toISOString())
          .lte('attempted_at', weekEnd.toISOString());

        const total = weekAttempts?.length || 0;
        const correct = weekAttempts?.filter(a => a.is_correct).length || 0;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

        weeks.push({
          week: i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i} weeks ago`,
          accuracy,
          attempts: total,
        });
      }

      return weeks;
    },
    enabled: !!student?.id,
  });

  // Fetch recent practice history
  const { data: recentHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['student-recent-history', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];

      const { data } = await supabase
        .from('student_attempts')
        .select(`
          id,
          question_id,
          is_correct,
          attempted_at,
          questions!inner(question_id)
        `)
        .eq('student_account_id', student.id)
        .order('attempted_at', { ascending: false })
        .limit(10);

      return data?.map((attempt: any) => ({
        id: attempt.id,
        questionId: attempt.question_id,
        displayId: attempt.questions?.question_id || 'Unknown',
        isCorrect: attempt.is_correct,
        attemptedAt: attempt.attempted_at,
      })) || [];
    },
    enabled: !!student?.id,
  });

  // Fetch category progress
  const { data: categoryProgress, isLoading: categoryLoading } = useQuery({
    queryKey: ['student-category-progress', student?.id, categoryTab],
    queryFn: async () => {
      if (!student?.id) return [];

      const mathCategories = [
        'Algebra',
        'Advanced Math', 
        'Geometry and Trigonometry',
        'Problem Solving and Data Analysis',
      ];

      const englishCategories = [
        'Information and Ideas',
        'Craft and Structure',
        'Standard English Conventions',
        'Expression of Ideas',
      ];

      const categories = categoryTab === 'math' ? mathCategories : englishCategories;
      const subject = categoryTab === 'math' ? 'Math' : 'English';

      const results = await Promise.all(categories.map(async (category) => {
        const { data: questions } = await supabase
          .from('questions')
          .select('id')
          .eq('subject', subject)
          .ilike('subtopic', `%${category.split(' ')[0]}%`)
          .eq('is_active', true);

        const questionIds = questions?.map(q => q.id) || [];

        const { data: correctAttempts } = await supabase
          .from('student_attempts')
          .select('question_id')
          .eq('student_account_id', student.id)
          .eq('is_correct', true)
          .in('question_id', questionIds);

        const uniqueCorrect = new Set(correctAttempts?.map(a => a.question_id) || []);

        return {
          name: category,
          total: questionIds.length,
          completed: uniqueCorrect.size,
          percentage: questionIds.length > 0 
            ? Math.round((uniqueCorrect.size / questionIds.length) * 100) 
            : 0,
        };
      }));

      return results;
    },
    enabled: !!student?.id,
  });

  // Calculate days until SAT using local state
  const daysUntilSAT = useMemo(() => {
    if (!selectedSatDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.max(0, differenceInDays(selectedSatDate, now));
  }, [selectedSatDate]);

  const queryClient = useQueryClient();

  // Mutation to update SAT test date
  const updateSatDate = useMutation({
    mutationFn: async (date: Date) => {
      const allStudentIds = student?.linked_students?.map(s => s.id) || 
        (student?.linked_student_id ? [student.linked_student_id] : []);
      if (allStudentIds.length === 0) {
        throw new Error('No linked student found');
      }
      
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('students')
        .update({ sat_test_month: dateStr })
        .in('id', allStudentIds);
      
      if (error) throw error;
      return date;
    },
    onSuccess: (date) => {
      setSelectedSatDate(date); // Update local state immediately
      toast.success(`SAT test date set to ${format(date, 'MMMM d, yyyy')}`);
    },
    onError: (error) => {
      toast.error('Failed to update SAT test date');
      console.error(error);
    },
  });

  // Use leaderboard hook for sprint data
  const { 
    currentUserEntry, 
    leaderboard,
    activeSprint 
  } = useLeaderboard();
  
  // Get consistent tier from hook (handles no-active-sprint fallback)
  const { tier: currentTier } = useStudentTier();

  // Fetch speed mode stats
  const { data: speedStats } = useQuery({
    queryKey: ['student-speed-stats', student?.id],
    queryFn: async () => {
      if (!student?.id) return null;

      const twoWeeksAgo = subWeeks(new Date(), 2).toISOString();

      // Get all attempts from last 2 weeks for speed calculation
      const { data: recentAttempts } = await supabase
        .from('student_attempts')
        .select('is_correct, time_spent_seconds, attempted_at')
        .eq('student_account_id', student.id)
        .eq('attempt_number', 1)
        .gte('attempted_at', twoWeeksAgo)
        .not('time_spent_seconds', 'is', null);

      // Calculate average time and accuracy from attempts
      let avgTime: number | null = null;
      let accuracy = 0;
      let totalQuestions = 0;

      if (recentAttempts && recentAttempts.length > 0) {
        const totalTime = recentAttempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
        avgTime = Math.round(totalTime / recentAttempts.length);
        const correctCount = recentAttempts.filter(a => a.is_correct).length;
        accuracy = Math.round((correctCount / recentAttempts.length) * 100);
        totalQuestions = recentAttempts.length;
      }

      // Fetch last 3 actual speed sessions from activity logs
      const { data: speedSessions } = await supabase
        .from('student_activity_logs')
        .select('metadata, created_at')
        .eq('student_account_id', student.id)
        .eq('activity_type', 'speed_mode_complete')
        .order('created_at', { ascending: false })
        .limit(3);

      const sessions = (speedSessions || []).map(s => {
        const meta = s.metadata as { total?: number; correct?: number; avgTimePerQuestion?: number } | null;
        const total = meta?.total || 0;
        const correct = meta?.correct || 0;
        return {
          date: format(parseISO(s.created_at), 'MMM d'),
          questions: total,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
          avgTime: Math.round(meta?.avgTimePerQuestion || 0),
        };
      });

      return { avgTime, totalQuestions, accuracy, sessions };
    },
    enabled: !!student?.id,
  });

  const isLoading = statsLoading || mathMasteryLoading || englishMasteryLoading || weeklyLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Calibration gate — hidden once 44 problems are solved */}
      <CalibrationProgressCard variant="dashboard" />
      {/* Closing Report Auto-Popup Dialog */}
      <Dialog open={showClosingReport} onOpenChange={setShowClosingReport}>
        <DialogContent className="max-w-md w-[95vw] h-[80vh] max-h-[600px] p-0 gap-0 overflow-hidden">
          <div className="relative h-full overflow-hidden rounded-[inherit]">
            <button
              onClick={() => setShowClosingReport(false)}
              className="absolute right-3 top-3 z-50 rounded-full bg-background/80 p-1.5 backdrop-blur-sm hover:bg-background transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            {closingReportData && (
              <div className="h-full overflow-y-auto">
                <ClosingReportContent
                  data={closingReportData}
                  shareToken={closingShareToken || undefined}
                  settings={closingReportSettings}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Closing Report Banner - shown when batch is completed */}
      {batchCompleted && closingReportData && isEnabled('closing_reports') && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card 
            className="cursor-pointer border-primary/20 bg-gradient-to-r from-primary/5 to-pink-500/5 hover:border-primary/40 transition-colors"
            onClick={() => setShowClosingReport(true)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Your Closing Report is ready! 🎉</p>
                <p className="text-xs text-muted-foreground">Tap to view your journey summary and share with parents</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg] shrink-0" />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Track your SAT prep progress</p>
      </div>

      {/* Score Pathway Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <ScorePathwayCard
          currentScore={targetCurrentScore || null}
          targetScore={targetScore}
          onTargetScoreChange={updateTargetScore}
          weakestTopic={weakestTopic || undefined}
          isLoading={scoreTargetLoading}
        />
      </motion.div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 68 Problems Completion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                68 Problems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completion68 || 0}%</div>
              <Progress value={stats?.completion68 || 0} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.completed68 || 0} / {stats?.total68 || 68} completed
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* 150 Hard Questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                150 Hard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.hard150Completion || 0}%</div>
              <Progress value={stats?.hard150Completion || 0} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.completedHard150 || 0} / {stats?.totalHard150 || 150} mastered
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* CB Questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                CB Questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.cbCompletion || 0}%</div>
              <Progress value={stats?.cbCompletion || 0} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.completedCB || 0} / {stats?.totalCB || 1074} mastered
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Practice Test Average */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Practice Avg
                </span>
                <PracticeTestScoreDrawer />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.practiceTestAvg || '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Tests 4-11 average
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Speed Mode Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Speed Mode
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/practice/speed')}
                className="gap-2"
              >
                <Timer className="h-4 w-4" />
                Start Session
              </Button>
            </div>
            <CardDescription>Average time per question & recent sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {speedStats?.avgTime ? `${speedStats.avgTime}s` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Avg Time</p>
                  {speedStats?.avgTime && (
                    <Badge 
                      variant={speedStats.avgTime <= 20 ? "default" : speedStats.avgTime <= 40 ? "secondary" : "destructive"}
                      className="mt-2"
                    >
                      {speedStats.avgTime <= 20 ? 'Excellent' : speedStats.avgTime <= 40 ? 'Good' : 'Needs Work'}
                    </Badge>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{speedStats?.accuracy || 0}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
                  <Badge variant="outline" className="mt-2">
                    {speedStats?.totalQuestions || 0} questions
                  </Badge>
                </div>
              </div>

              {/* Recent Sessions */}
              <div className="flex-1 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">Recent Sessions</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 px-2 text-muted-foreground hover:text-primary"
                    onClick={() => navigate('/practice/speed')}
                  >
                    View All →
                  </Button>
                </div>
                {speedStats?.sessions && speedStats.sessions.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {speedStats.sessions.map((session, i) => (
                      <div key={i} className="text-center p-3 rounded-lg bg-muted/50 border">
                        <div className="text-xs text-muted-foreground font-medium">{session.date}</div>
                        <div className="font-bold text-lg mt-1">{session.avgTime}s</div>
                        <div className="text-xs text-muted-foreground">{session.accuracy}% · {session.questions}q</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No speed sessions yet. Start one to track your progress!
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Radar Chart with Toggle - 40% */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Mastery Overview
                </CardTitle>
                {/* Toggle Button Group */}
                <div className="flex rounded-lg border bg-muted p-0.5">
                  <Button
                    variant={radarSubject === 'math' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-3 text-xs rounded-md"
                    onClick={() => setRadarSubject('math')}
                  >
                    Math
                  </Button>
                  <Button
                    variant={radarSubject === 'english' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-3 text-xs rounded-md"
                    onClick={() => setRadarSubject('english')}
                  >
                    English
                  </Button>
                </div>
              </div>
              <CardDescription>
                {radarSubject === 'math' 
                  ? 'Completion across 68 + CB questions'
                  : 'Completion across English questions'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <RadarChart 
                  data={radarSubject === 'math' ? (mathMasteryData || []) : (englishMasteryData || [])} 
                  outerRadius="70%"
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="area" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar
                    name={radarSubject === 'math' ? 'Math' : 'English'}
                    dataKey="score"
                    stroke={radarSubject === 'math' ? 'hsl(var(--primary))' : 'hsl(var(--chart-2))'}
                    fill={radarSubject === 'math' ? 'hsl(var(--primary))' : 'hsl(var(--chart-2))'}
                    fillOpacity={0.4}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RadarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Line Chart + Recent History - 60% */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-3"
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Accuracy Trend
              </CardTitle>
              <CardDescription>Weekly performance over 5 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Line Chart */}
                <div className="flex-1">
                  <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <LineChart data={weeklyData || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="week" 
                        tick={{ fontSize: 10 }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ChartContainer>
                </div>

                {/* Recent History */}
                <div className="w-full lg:w-56 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-4">
                  <h4 className="font-medium text-sm mb-3">Recent Practice</h4>
                  <ScrollArea className="h-[180px]">
                    <div className="space-y-2 pr-3">
                      {recentHistory?.map((item, index) => {
                        // Convert displayId to simpler format
                        const displayId = item.displayId;
                        let simpleId = displayId;
                        
                        // For CB questions, extract just the number
                        if (displayId.startsWith('CB')) {
                          const num = parseInt(displayId.replace('CB', ''), 10);
                          simpleId = isNaN(num) ? displayId : String(num);
                        } else if (displayId.startsWith('ENG')) {
                          const num = parseInt(displayId.replace('ENG', ''), 10);
                          simpleId = isNaN(num) ? displayId : String(num);
                        }
                        
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className={item.isCorrect ? 'text-green-600' : 'text-destructive'}>
                                {item.isCorrect ? '✓' : '✗'}
                              </span>
                              <span className="text-muted-foreground">
                                #{simpleId}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => navigate(`/practice/question/${item.questionId}`)}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                      {(!recentHistory || recentHistory.length === 0) && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No practice history yet
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Category Progress</CardTitle>
                <Tabs value={categoryTab} onValueChange={(v) => setCategoryTab(v as 'math' | 'english')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="math" className="text-xs px-3">Math</TabsTrigger>
                    <TabsTrigger value="english" className="text-xs px-3">English</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryProgress?.map((category) => (
                <div key={category.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{category.name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {category.completed}/{category.total}
                    </span>
                  </div>
                  <Progress value={category.percentage} className="h-2" />
                </div>
              ))}
              {categoryTab === 'math' && (
                <div className="pt-2 border-t space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">68 Core Questions</span>
                    <span className="text-muted-foreground">
                      {stats?.completed68 || 0}/{stats?.total68 || 68}
                    </span>
                  </div>
                  <Progress value={stats?.completion68 || 0} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Rank + SAT Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Your Standing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* Sprint Rank */}
                <button 
                  onClick={() => navigate('/practice/leaderboard')}
                  className="text-center p-4 rounded-lg transition-colors hover:bg-muted"
                  style={{ 
                    backgroundColor: `${TIER_COLORS[currentUserEntry?.currentTier as TierType || currentTier]}15`
                  }}
                >
                  <div 
                    className="text-3xl font-bold"
                    style={{ 
                      color: TIER_COLORS[currentUserEntry?.currentTier as TierType || currentTier]
                    }}
                  >
                    #{currentUserEntry?.rank || '—'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    in {TIER_DISPLAY_NAMES[currentUserEntry?.currentTier as TierType || currentTier]}
                  </p>
                  <Badge 
                    variant="secondary" 
                    className="mt-2"
                    style={{
                      backgroundColor: `${TIER_COLORS[currentUserEntry?.currentTier as TierType || currentTier]}20`,
                      color: TIER_COLORS[currentUserEntry?.currentTier as TierType || currentTier]
                    }}
                  >
                    {currentUserEntry?.totalPoints?.toLocaleString() || 0} pts
                  </Badge>
                </button>

                {/* SAT Countdown */}
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  {student?.linked_student_id ? (
                    <Drawer>
                      <DrawerTrigger asChild>
                        <button className="w-full focus:outline-none">
                          {daysUntilSAT !== null && selectedSatDate ? (
                            <div className="space-y-1">
                              <div className="text-4xl font-bold text-primary">
                                {daysUntilSAT}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                days until SAT
                              </p>
                              <Badge variant="outline" className="mt-1">
                                {format(selectedSatDate, 'MMM d, yyyy')}
                              </Badge>
                              {daysUntilSAT <= 30 && (
                                <Badge variant="destructive" className="mt-1 text-xs ml-1">
                                  Final Push!
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Tap to set SAT date
                              </p>
                            </div>
                          )}
                        </button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <div className="mx-auto w-full max-w-sm">
                          <DrawerHeader>
                            <DrawerTitle>Select Your SAT Test Date</DrawerTitle>
                            <DrawerDescription>
                              Choose the exact date of your SAT exam
                            </DrawerDescription>
                          </DrawerHeader>
                          <div className="flex justify-center p-4">
                            <Calendar
                              mode="single"
                              selected={selectedSatDate || undefined}
                              onSelect={(date) => {
                                if (date) {
                                  updateSatDate.mutate(date);
                                }
                              }}
                              disabled={(date) => date < new Date()}
                              defaultMonth={selectedSatDate || addMonths(new Date(), 1)}
                              className="rounded-md border pointer-events-auto"
                            />
                          </div>
                          <DrawerFooter>
                            <DrawerClose asChild>
                              <Button variant="ghost">Cancel</Button>
                            </DrawerClose>
                          </DrawerFooter>
                        </div>
                      </DrawerContent>
                    </Drawer>
                  ) : (
                    <div className="space-y-2">
                      <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Link your student profile to set SAT date
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sprint Status Message */}
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-sm text-center">
                  {currentUserEntry?.isTop1
                    ? "🏆 You're leading your tier! Keep it up!"
                    : currentUserEntry?.isAdvancing
                    ? "🔥 You're on track to advance! Keep going!"
                    : activeSprint
                    ? "💪 Practice more to climb the leaderboard!"
                    : "📊 Join the sprint to compete with others!"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
