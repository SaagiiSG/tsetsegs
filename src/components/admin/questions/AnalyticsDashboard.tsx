import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Target, Clock, TrendingDown, Loader2 } from 'lucide-react';

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899'];

export function AnalyticsDashboard() {
  const [selectedStudent, setSelectedStudent] = useState<string>('all');

  // Fetch all students
  const { data: students } = useQuery({
    queryKey: ['practice-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch all attempts with question info
  const { data: attempts, isLoading } = useQuery({
    queryKey: ['all-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_attempts')
        .select(`
          *,
          question:questions(question_id, category:question_categories(name))
        `);
      if (error) throw error;
      return data;
    }
  });

  // Fetch all progress
  const { data: progress } = useQuery({
    queryKey: ['all-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_progress')
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  // Fetch questions count
  const { data: totalQuestions } = useQuery({
    queryKey: ['questions-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      return count || 0;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
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

  // Calculate stats
  const totalAttempts = filteredAttempts?.length || 0;
  const correctAttempts = filteredAttempts?.filter(a => a.is_correct).length || 0;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const videosWatched = filteredProgress?.filter(p => p.video_watched).length || 0;
  const avgTimeSpent = totalAttempts > 0 
    ? Math.round((filteredAttempts?.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) || 0) / totalAttempts)
    : 0;

  // Category performance
  const categoryStats: Record<string, { total: number; correct: number }> = {};
  filteredAttempts?.forEach((a: any) => {
    const cat = a.question?.category?.name || 'Unknown';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, correct: 0 };
    }
    categoryStats[cat].total++;
    if (a.is_correct) categoryStats[cat].correct++;
  });

  const categoryData = Object.entries(categoryStats).map(([name, stats]) => ({
    name: name.length > 15 ? name.slice(0, 15) + '...' : name,
    fullName: name,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    attempts: stats.total
  }));

  // Hardest questions (lowest accuracy, min 3 attempts)
  const questionStats: Record<string, { id: string; total: number; correct: number }> = {};
  filteredAttempts?.forEach((a: any) => {
    const qId = a.question?.question_id;
    if (!qId) return;
    if (!questionStats[qId]) {
      questionStats[qId] = { id: qId, total: 0, correct: 0 };
    }
    questionStats[qId].total++;
    if (a.is_correct) questionStats[qId].correct++;
  });

  const hardestQuestions = Object.values(questionStats)
    .filter(q => q.total >= 3)
    .map(q => ({
      ...q,
      accuracy: Math.round((q.correct / q.total) * 100)
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 10);

  // Pie chart data for completion
  const pieData = [
    { name: 'Completed', value: correctAttempts },
    { name: 'Incorrect', value: totalAttempts - correctAttempts },
  ];

  return (
    <div className="space-y-6">
      {/* Student Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Performance Analytics</CardTitle>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.phone_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttempts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracy}%</div>
            <Progress value={accuracy} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Watched</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videosWatched}/{totalQuestions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time/Question</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTimeSpent}s</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Accuracy']}
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

        {/* Accuracy Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Correct vs Incorrect</CardTitle>
          </CardHeader>
          <CardContent>
            {totalAttempts > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
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
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hardest Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Hardest Questions (Most Wrong Answers)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hardestQuestions.length > 0 ? (
            <div className="space-y-3">
              {hardestQuestions.map((q, i) => (
                <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{q.id}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {q.total} attempts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={q.accuracy} className="w-24" />
                    <span className={`font-medium ${q.accuracy < 50 ? 'text-red-500' : 'text-yellow-500'}`}>
                      {q.accuracy}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Not enough data yet (need at least 3 attempts per question)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
