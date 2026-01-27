import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format, subWeeks, startOfWeek, endOfWeek, differenceInDays, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Target, BookOpen, Award, Pencil, RotateCcw, Calendar,
  TrendingUp, Clock, Brain, Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PracticeTestScoreDrawer } from '@/components/student/PracticeTestScoreDrawer';
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

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['student-dashboard-stats', student?.id],
    queryFn: async () => {
      if (!student?.id) return null;

      // Fetch 68 problems - get question IDs first
      const { data: questions68 } = await supabase
        .from('questions')
        .select('id')
        .eq('question_set', '68')
        .eq('is_active', true);

      const question68Ids = questions68?.map(q => q.id) || [];

      // Only count correct attempts for questions in the 68 set
      const { data: attempts68 } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', student.id)
        .eq('is_correct', true)
        .in('question_id', question68Ids.length > 0 ? question68Ids : ['00000000-0000-0000-0000-000000000000']);

      const unique68Correct = new Set(attempts68?.map(a => a.question_id) || []);
      const total68Count = questions68?.length || 0;
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

      // Fetch practice tests for linked student
      let practiceTestAvg = 0;
      let realTestScore: number | null = null;
      if (student.linked_student_id) {
        const { data: practiceTests } = await supabase
          .from('practice_tests')
          .select('test_number, score')
          .eq('student_id', student.linked_student_id)
          .order('test_number');

        const tests1to7 = practiceTests?.filter(t => t.test_number >= 1 && t.test_number <= 7 && t.score) || [];
        if (tests1to7.length > 0) {
          practiceTestAvg = Math.round(tests1to7.reduce((sum, t) => sum + (t.score || 0), 0) / tests1to7.length);
        }

        const test8 = practiceTests?.find(t => t.test_number === 8);
        realTestScore = test8?.score || null;
      }

      return {
        completion68,
        total68: total68Count,
        completed68: completed68Count,
        cbCompletion,
        totalCB: totalCBCount,
        completedCB: completedCBCount,
        practiceTestAvg,
        realTestScore,
      };
    },
    enabled: !!student?.id,
  });

  // Fetch mastery data for radar chart
  const { data: masteryData, isLoading: masteryLoading } = useQuery({
    queryKey: ['student-mastery-data', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];

      const twoWeeksAgo = subWeeks(new Date(), 2).toISOString();

      // Fetch recent attempts with question info
      const { data: recentAttempts } = await supabase
        .from('student_attempts')
        .select(`
          question_id,
          is_correct,
          time_spent_seconds,
          attempt_number,
          attempted_at,
          questions!inner(subject, subtopic)
        `)
        .eq('student_account_id', student.id)
        .gte('attempted_at', twoWeeksAgo);

      // Category mapping
      const categories = {
        'Algebra': { correct: 0, total: 0, totalTime: 0, correctCount: 0 },
        'Advanced Math': { correct: 0, total: 0, totalTime: 0, correctCount: 0 },
        'Geometry & Trig': { correct: 0, total: 0, totalTime: 0, correctCount: 0 },
        'Problem Solving': { correct: 0, total: 0, totalTime: 0, correctCount: 0 },
      };

      let totalFirstAttemptTime = 0;
      let firstAttemptCount = 0;

      recentAttempts?.forEach((attempt: any) => {
        const subtopic = attempt.questions?.subtopic || '';
        let category = 'Algebra';

        if (subtopic.toLowerCase().includes('advanced') || subtopic.toLowerCase().includes('quadratic') || subtopic.toLowerCase().includes('polynomial')) {
          category = 'Advanced Math';
        } else if (subtopic.toLowerCase().includes('geometry') || subtopic.toLowerCase().includes('trig') || subtopic.toLowerCase().includes('circle')) {
          category = 'Geometry & Trig';
        } else if (subtopic.toLowerCase().includes('data') || subtopic.toLowerCase().includes('problem') || subtopic.toLowerCase().includes('ratio')) {
          category = 'Problem Solving';
        }

        if (categories[category as keyof typeof categories]) {
          categories[category as keyof typeof categories].total++;
          if (attempt.is_correct) {
            categories[category as keyof typeof categories].correct++;
          }
        }

        // Speed calculation from first attempts
        if (attempt.attempt_number === 1 && attempt.time_spent_seconds && attempt.is_correct) {
          totalFirstAttemptTime += attempt.time_spent_seconds;
          firstAttemptCount++;
        }
      });

      // Calculate speed score (goal: 15-20 seconds with 90%+ accuracy)
      const avgTime = firstAttemptCount > 0 ? totalFirstAttemptTime / firstAttemptCount : 60;
      // Normalize: 15s = 100, 60s+ = 0
      const speedScore = Math.max(0, Math.min(100, Math.round(100 - ((avgTime - 15) / 45) * 100)));

      // Fetch vocab progress
      const { data: totalVocabWords } = await supabase
        .from('vocabulary_words')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      const { data: learnedVocab } = await supabase
        .from('student_vocabulary_progress')
        .select('word_id')
        .eq('student_account_id', student.id);

      const totalWords = (totalVocabWords as any)?.count || 325;
      const learnedWords = learnedVocab?.length || 0;
      const vocabScore = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

      return [
        { 
          area: 'Algebra', 
          score: categories['Algebra'].total > 0 
            ? Math.round((categories['Algebra'].correct / categories['Algebra'].total) * 100) 
            : 0,
          fullMark: 100 
        },
        { 
          area: 'Advanced Math', 
          score: categories['Advanced Math'].total > 0 
            ? Math.round((categories['Advanced Math'].correct / categories['Advanced Math'].total) * 100) 
            : 0,
          fullMark: 100 
        },
        { 
          area: 'Geometry & Trig', 
          score: categories['Geometry & Trig'].total > 0 
            ? Math.round((categories['Geometry & Trig'].correct / categories['Geometry & Trig'].total) * 100) 
            : 0,
          fullMark: 100 
        },
        { 
          area: 'Problem Solving', 
          score: categories['Problem Solving'].total > 0 
            ? Math.round((categories['Problem Solving'].correct / categories['Problem Solving'].total) * 100) 
            : 0,
          fullMark: 100 
        },
        { area: 'Speed', score: speedScore, fullMark: 100 },
        { area: 'Vocab', score: vocabScore, fullMark: 100 },
      ];
    },
    enabled: !!student?.id,
  });

  // Fetch weekly accuracy history
  const { data: weeklyData, isLoading: weeklyLoading } = useQuery({
    queryKey: ['student-weekly-accuracy', student?.id],
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

  // Calculate days until SAT
  const daysUntilSAT = useMemo(() => {
    if (!student?.linked_student?.batch_id) return null;
    // This would need the sat_test_month from student profile
    // For now, return placeholder
    return null;
  }, [student]);

  // Fetch student rank
  const { data: rankData } = useQuery({
    queryKey: ['student-rank', student?.id],
    queryFn: async () => {
      if (!student?.id) return null;

      // Get all students' correct attempt counts
      const { data: allStudents } = await supabase
        .from('student_accounts')
        .select('id')
        .eq('is_active', true);

      const studentScores = await Promise.all(
        (allStudents || []).map(async (s) => {
          const { count } = await supabase
            .from('student_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('student_account_id', s.id)
            .eq('is_correct', true);

          return { id: s.id, score: count || 0 };
        })
      );

      studentScores.sort((a, b) => b.score - a.score);
      const rank = studentScores.findIndex(s => s.id === student.id) + 1;
      const myScore = studentScores.find(s => s.id === student.id)?.score || 0;

      return { rank, total: studentScores.length, score: myScore };
    },
    enabled: !!student?.id,
  });

  const isLoading = statsLoading || masteryLoading || weeklyLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Track your SAT prep progress</p>
      </div>

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

        {/* Practice Test Average */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
                Tests 4-10 average
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

        {/* Real Practice Test */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Real Mock Score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.realTestScore || '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                SAT Mock Test
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Radar Chart - 40% */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Mastery Overview
              </CardTitle>
              <CardDescription>Your skills across all areas</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <RadarChart data={masteryData || []} outerRadius="70%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Mastery"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
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
                      {recentHistory?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className={item.isCorrect ? 'text-green-600' : 'text-destructive'}>
                              {item.isCorrect ? '✓' : '✗'}
                            </span>
                            <span className="text-muted-foreground">
                              #{item.displayId}
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
                      ))}
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
              <CardTitle className="text-lg">Your Standing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* Rank */}
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold text-primary">
                    #{rankData?.rank || '—'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    of {rankData?.total || 0} students
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {rankData?.score || 0} correct
                  </Badge>
                </div>

                {/* SAT Countdown */}
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-3xl font-bold mt-2">
                    {daysUntilSAT ?? '—'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    days until SAT
                  </p>
                  {daysUntilSAT && daysUntilSAT <= 30 && (
                    <Badge variant="destructive" className="mt-2">
                      Final Push!
                    </Badge>
                  )}
                </div>
              </div>

              {/* Motivational message */}
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-sm text-center">
                  {rankData?.rank === 1 
                    ? "🏆 You're leading the pack! Keep it up!"
                    : rankData?.rank && rankData.rank <= 3
                    ? "🔥 You're in the top 3! Amazing work!"
                    : "💪 Keep practicing to climb the ranks!"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
