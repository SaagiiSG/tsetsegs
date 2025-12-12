import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { 
  Users, Target, Clock, TrendingDown, Loader2, TrendingUp, 
  Award, AlertTriangle, Video, BarChart3, Trophy, Zap
} from 'lucide-react';

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];

export function AnalyticsDashboard() {
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [analyticsTab, setAnalyticsTab] = useState('overview');

  // Fetch all students with linked info
  const { data: students } = useQuery({
    queryKey: ['practice-students-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_accounts')
        .select('*, linked_student:students(name, first_name, last_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch all attempts with question info
  const { data: attempts, isLoading } = useQuery({
    queryKey: ['all-attempts-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_attempts')
        .select(`
          *,
          question:questions(
            id, question_id, question_set, question_type, answer, 
            difficulty_level, subtopic,
            category:question_categories(name),
            multiple_choice_options
          )
        `)
        .order('attempted_at', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Fetch all progress
  const { data: progress } = useQuery({
    queryKey: ['all-progress-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_progress')
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  // Fetch questions
  const { data: questions } = useQuery({
    queryKey: ['all-questions-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*, category:question_categories(name)')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground mt-2">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  // Filter data by selected student
  const filteredAttempts = selectedStudent === 'all' 
    ? attempts 
    : attempts?.filter(a => a.student_account_id === selectedStudent);

  const filteredProgress = selectedStudent === 'all'
    ? progress
    : progress?.filter(p => p.student_account_id === selectedStudent);

  // ===== STUDENT PERFORMANCE METRICS =====
  const totalAttempts = filteredAttempts?.length || 0;
  const correctAttempts = filteredAttempts?.filter(a => a.is_correct).length || 0;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  
  // First attempt success rate
  const firstAttempts = filteredAttempts?.filter(a => a.attempt_number === 1) || [];
  const firstAttemptCorrect = firstAttempts.filter(a => a.is_correct).length;
  const firstAttemptRate = firstAttempts.length > 0 
    ? Math.round((firstAttemptCorrect / firstAttempts.length) * 100) : 0;

  // Retry success rate (attempts 2+)
  const retryAttempts = filteredAttempts?.filter(a => a.attempt_number > 1) || [];
  const retryCorrect = retryAttempts.filter(a => a.is_correct).length;
  const retrySuccessRate = retryAttempts.length > 0 
    ? Math.round((retryCorrect / retryAttempts.length) * 100) : 0;

  // Time analytics
  const validTimeAttempts = filteredAttempts?.filter(a => a.time_spent_seconds && a.time_spent_seconds > 0) || [];
  const avgTimeSpent = validTimeAttempts.length > 0 
    ? Math.round(validTimeAttempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / validTimeAttempts.length)
    : 0;
  const fastestTime = validTimeAttempts.length > 0 
    ? Math.min(...validTimeAttempts.map(a => a.time_spent_seconds || 999)) : 0;
  const slowestTime = validTimeAttempts.length > 0 
    ? Math.max(...validTimeAttempts.map(a => a.time_spent_seconds || 0)) : 0;

  // Video watch rate
  const totalQuestions = questions?.length || 0;
  const videosWatched = filteredProgress?.filter(p => p.video_watched).length || 0;
  const videoWatchRate = totalQuestions > 0 ? Math.round((videosWatched / totalQuestions) * 100) : 0;

  // ===== QUESTION ANALYTICS =====
  // Question difficulty ranking
  const questionStats: Record<string, { 
    id: string; questionId: string; total: number; correct: number; 
    category: string; difficulty: string; questionSet: string; avgTime: number; times: number[];
    wrongAnswers: Record<string, number>;
  }> = {};
  
  filteredAttempts?.forEach((a: any) => {
    const qId = a.question?.id;
    const questionId = a.question?.question_id;
    if (!qId) return;
    if (!questionStats[qId]) {
      questionStats[qId] = { 
        id: qId, 
        questionId: questionId || 'Unknown',
        total: 0, 
        correct: 0, 
        category: a.question?.category?.name || 'Unknown',
        difficulty: a.question?.difficulty_level || 'Unknown',
        questionSet: a.question?.question_set || '68',
        avgTime: 0,
        times: [],
        wrongAnswers: {}
      };
    }
    questionStats[qId].total++;
    if (a.is_correct) {
      questionStats[qId].correct++;
    } else {
      // Track wrong answers
      const wrongAnswer = a.answer_submitted;
      questionStats[qId].wrongAnswers[wrongAnswer] = (questionStats[qId].wrongAnswers[wrongAnswer] || 0) + 1;
    }
    if (a.time_spent_seconds) {
      questionStats[qId].times.push(a.time_spent_seconds);
    }
  });

  // Calculate avg time per question
  Object.values(questionStats).forEach(q => {
    q.avgTime = q.times.length > 0 
      ? Math.round(q.times.reduce((a, b) => a + b, 0) / q.times.length) 
      : 0;
  });

  // Hardest questions (lowest accuracy, min 3 attempts)
  const hardestQuestions = Object.values(questionStats)
    .filter(q => q.total >= 3)
    .map(q => ({
      ...q,
      accuracy: Math.round((q.correct / q.total) * 100)
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 15);

  // Category performance
  const categoryStats: Record<string, { total: number; correct: number; avgTime: number; times: number[] }> = {};
  filteredAttempts?.forEach((a: any) => {
    const cat = a.question?.category?.name || 'Unknown';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, correct: 0, avgTime: 0, times: [] };
    }
    categoryStats[cat].total++;
    if (a.is_correct) categoryStats[cat].correct++;
    if (a.time_spent_seconds) categoryStats[cat].times.push(a.time_spent_seconds);
  });

  Object.values(categoryStats).forEach(c => {
    c.avgTime = c.times.length > 0 
      ? Math.round(c.times.reduce((a, b) => a + b, 0) / c.times.length) 
      : 0;
  });

  const categoryData = Object.entries(categoryStats).map(([name, stats]) => ({
    name: name.length > 20 ? name.slice(0, 20) + '...' : name,
    fullName: name,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    attempts: stats.total,
    avgTime: stats.avgTime
  })).sort((a, b) => b.attempts - a.attempts);

  // Difficulty level analysis
  const difficultyStats: Record<string, { total: number; correct: number }> = {};
  filteredAttempts?.forEach((a: any) => {
    const diff = a.question?.difficulty_level || 'Unknown';
    if (!difficultyStats[diff]) {
      difficultyStats[diff] = { total: 0, correct: 0 };
    }
    difficultyStats[diff].total++;
    if (a.is_correct) difficultyStats[diff].correct++;
  });

  const difficultyData = Object.entries(difficultyStats)
    .filter(([name]) => name !== 'Unknown')
    .map(([name, stats]) => ({
      name,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      attempts: stats.total
    }));

  // ===== 68 vs CB COMPARISON =====
  const questionSetStats = {
    '68': { total: 0, correct: 0, avgTime: 0, times: [] as number[] },
    'CollegeBoard': { total: 0, correct: 0, avgTime: 0, times: [] as number[] }
  };

  filteredAttempts?.forEach((a: any) => {
    const set = a.question?.question_set === 'CollegeBoard' ? 'CollegeBoard' : '68';
    questionSetStats[set].total++;
    if (a.is_correct) questionSetStats[set].correct++;
    if (a.time_spent_seconds) questionSetStats[set].times.push(a.time_spent_seconds);
  });

  Object.values(questionSetStats).forEach(s => {
    s.avgTime = s.times.length > 0 
      ? Math.round(s.times.reduce((a, b) => a + b, 0) / s.times.length) 
      : 0;
  });

  const questionSetComparison = [
    { 
      name: '68 Questions', 
      accuracy: questionSetStats['68'].total > 0 
        ? Math.round((questionSetStats['68'].correct / questionSetStats['68'].total) * 100) : 0,
      attempts: questionSetStats['68'].total,
      avgTime: questionSetStats['68'].avgTime
    },
    { 
      name: 'CollegeBoard', 
      accuracy: questionSetStats['CollegeBoard'].total > 0 
        ? Math.round((questionSetStats['CollegeBoard'].correct / questionSetStats['CollegeBoard'].total) * 100) : 0,
      attempts: questionSetStats['CollegeBoard'].total,
      avgTime: questionSetStats['CollegeBoard'].avgTime
    }
  ];

  // ===== STUDENT LEADERBOARD =====
  const studentPerformance: Record<string, { 
    id: string; name: string; phone: string; 
    total: number; correct: number; avgTime: number; times: number[];
  }> = {};

  attempts?.forEach((a: any) => {
    const sid = a.student_account_id;
    if (!studentPerformance[sid]) {
      const student = students?.find(s => s.id === sid);
      const linkedStudent = student?.linked_student as any;
      studentPerformance[sid] = {
        id: sid,
        name: linkedStudent?.first_name 
          ? `${linkedStudent.first_name} ${linkedStudent.last_name || ''}`.trim()
          : linkedStudent?.name || 'Unknown',
        phone: student?.phone_number || 'Unknown',
        total: 0,
        correct: 0,
        avgTime: 0,
        times: []
      };
    }
    studentPerformance[sid].total++;
    if (a.is_correct) studentPerformance[sid].correct++;
    if (a.time_spent_seconds) studentPerformance[sid].times.push(a.time_spent_seconds);
  });

  Object.values(studentPerformance).forEach(s => {
    s.avgTime = s.times.length > 0 
      ? Math.round(s.times.reduce((a, b) => a + b, 0) / s.times.length) 
      : 0;
  });

  const leaderboard = Object.values(studentPerformance)
    .filter(s => s.total >= 5) // Min 5 attempts
    .map(s => ({
      ...s,
      accuracy: Math.round((s.correct / s.total) * 100)
    }))
    .sort((a, b) => b.accuracy - a.accuracy || b.total - a.total);

  // ===== COMMON WRONG ANSWERS =====
  const allWrongAnswerPatterns: { questionId: string; wrongAnswer: string; count: number; category: string }[] = [];
  Object.values(questionStats).forEach(q => {
    Object.entries(q.wrongAnswers).forEach(([answer, count]) => {
      if (count >= 2) { // Min 2 occurrences
        allWrongAnswerPatterns.push({
          questionId: q.questionId,
          wrongAnswer: answer,
          count,
          category: q.category
        });
      }
    });
  });
  const topWrongPatterns = allWrongAnswerPatterns
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ===== IMPROVEMENT OVER TIME =====
  const weeklyData: Record<string, { week: string; total: number; correct: number }> = {};
  filteredAttempts?.forEach((a: any) => {
    const date = new Date(a.attempted_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { week: weekKey, total: 0, correct: 0 };
    }
    weeklyData[weekKey].total++;
    if (a.is_correct) weeklyData[weekKey].correct++;
  });

  const progressOverTime = Object.values(weeklyData)
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12) // Last 12 weeks
    .map(w => ({
      week: new Date(w.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      accuracy: w.total > 0 ? Math.round((w.correct / w.total) * 100) : 0,
      attempts: w.total
    }));

  // Pie chart data
  const pieData = [
    { name: 'Correct', value: correctAttempts },
    { name: 'Incorrect', value: totalAttempts - correctAttempts },
  ];

  const getStudentDisplayName = (student: any) => {
    const linked = student?.linked_student as any;
    if (linked?.first_name) {
      return `${linked.first_name} ${linked.last_name || ''}`.trim();
    }
    return linked?.name || student?.phone_number || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header with Student Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Analytics
              </CardTitle>
              <CardDescription>Comprehensive insights into student practice performance</CardDescription>
            </div>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {getStudentDisplayName(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Analytics Tabs */}
      <Tabs value={analyticsTab} onValueChange={setAnalyticsTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Question Analytics</TabsTrigger>
          <TabsTrigger value="comparison">68 vs CB</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="patterns">Wrong Answer Patterns</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Total Attempts</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAttempts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Overall Accuracy</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accuracy}%</div>
                <Progress value={accuracy} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">1st Attempt Rate</CardTitle>
                <Zap className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{firstAttemptRate}%</div>
                <p className="text-xs text-muted-foreground">{firstAttempts.length} attempts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Retry Success</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{retrySuccessRate}%</div>
                <p className="text-xs text-muted-foreground">{retryAttempts.length} retries</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Avg Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgTimeSpent}s</div>
                <p className="text-xs text-muted-foreground">{fastestTime}s - {slowestTime}s</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Videos Watched</CardTitle>
                <Video className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{videoWatchRate}%</div>
                <p className="text-xs text-muted-foreground">{videosWatched}/{totalQuestions}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} unit="%" />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'accuracy' ? `${value}%` : value,
                          name === 'accuracy' ? 'Accuracy' : 'Attempts'
                        ]}
                        labelFormatter={(label) => categoryData.find(c => c.name === label)?.fullName || label}
                      />
                      <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Accuracy Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {progressOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={progressOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Accuracy']} />
                      <Area 
                        type="monotone" 
                        dataKey="accuracy" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Not enough data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Correct vs Incorrect Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Correct vs Incorrect</CardTitle>
              </CardHeader>
              <CardContent>
                {totalAttempts > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#ef4444'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Difficulty Level Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance by Difficulty</CardTitle>
              </CardHeader>
              <CardContent>
                {difficultyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={difficultyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Accuracy']} />
                      <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                        {difficultyData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.name === 'Easy' ? '#22c55e' : entry.name === 'Medium' ? '#f59e0b' : '#ef4444'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No difficulty data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* QUESTION ANALYTICS TAB */}
        <TabsContent value="questions" className="space-y-6">
          {/* Hardest Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Hardest Questions (Lowest Accuracy)
              </CardTitle>
              <CardDescription>Questions with at least 3 attempts, sorted by accuracy</CardDescription>
            </CardHeader>
            <CardContent>
              {hardestQuestions.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question ID</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Set</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Accuracy</TableHead>
                        <TableHead>Avg Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hardestQuestions.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{q.questionId}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{q.category}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="secondary"
                              className={
                                q.difficulty === 'Easy' ? 'bg-green-500/20 text-green-700' :
                                q.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-700' :
                                q.difficulty === 'Hard' ? 'bg-red-500/20 text-red-700' : ''
                              }
                            >
                              {q.difficulty}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={q.questionSet === 'CollegeBoard' ? 'secondary' : 'outline'}>
                              {q.questionSet === 'CollegeBoard' ? 'CB' : '68'}
                            </Badge>
                          </TableCell>
                          <TableCell>{q.total}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={q.accuracy} className="w-16 h-2" />
                              <span className={q.accuracy < 50 ? 'text-red-500 font-medium' : ''}>
                                {q.accuracy}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{q.avgTime}s</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Not enough data yet (need at least 3 attempts per question)
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Deep Dive */}
          <Card>
            <CardHeader>
              <CardTitle>Category Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryData.map((cat) => (
                    <TableRow key={cat.fullName}>
                      <TableCell className="font-medium">{cat.fullName}</TableCell>
                      <TableCell>{cat.attempts}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={cat.accuracy} className="w-20 h-2" />
                          <span>{cat.accuracy}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{cat.avgTime}s</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 68 vs CB COMPARISON TAB */}
        <TabsContent value="comparison" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {questionSetComparison.map((set, i) => (
              <Card key={set.name} className={i === 1 ? 'border-purple-500/30' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {set.name}
                    {i === 1 && <Badge className="bg-purple-500">CB</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{set.attempts}</p>
                      <p className="text-xs text-muted-foreground">Attempts</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{set.accuracy}%</p>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{set.avgTime}s</p>
                      <p className="text-xs text-muted-foreground">Avg Time</p>
                    </div>
                  </div>
                  <Progress value={set.accuracy} className="h-3" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Side-by-Side Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={questionSetComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="accuracy" name="Accuracy %" fill="#3b82f6" />
                  <Bar dataKey="avgTime" name="Avg Time (s)" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEADERBOARD TAB */}
        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Student Leaderboard
              </CardTitle>
              <CardDescription>Students with at least 5 attempts, ranked by accuracy</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Correct</TableHead>
                        <TableHead>Accuracy</TableHead>
                        <TableHead>Avg Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((s, i) => (
                        <TableRow key={s.id} className={i < 3 ? 'bg-yellow-500/5' : ''}>
                          <TableCell>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground">{s.phone}</TableCell>
                          <TableCell>{s.total}</TableCell>
                          <TableCell>{s.correct}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={s.accuracy} className="w-16 h-2" />
                              <span className="font-medium">{s.accuracy}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{s.avgTime}s</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Not enough data yet (students need at least 5 attempts)
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WRONG ANSWER PATTERNS TAB */}
        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Common Wrong Answer Patterns
              </CardTitle>
              <CardDescription>Most frequently selected wrong answers (min 2 occurrences)</CardDescription>
            </CardHeader>
            <CardContent>
              {topWrongPatterns.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Wrong Answer</TableHead>
                      <TableHead>Times Selected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topWrongPatterns.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{p.questionId}</Badge>
                        </TableCell>
                        <TableCell>{p.category}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{p.wrongAnswer}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{p.count}x</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Not enough wrong answer data yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}