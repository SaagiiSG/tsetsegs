import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, Target, CheckCircle2, XCircle, Clock, TrendingUp, Award, Loader2
} from 'lucide-react';

export default function StudentStats() {
  const { student } = useStudentAuth();

  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['all-student-attempts', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from('student_attempts')
        .select(`
          *,
          question:questions(
            question_id,
            category:question_categories(name)
          )
        `)
        .eq('student_account_id', student.id)
        .order('attempted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  const { data: questions } = useQuery({
    queryKey: ['practice-questions-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, category:question_categories(name)')
        .eq('is_original', true)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  const { data: progress } = useQuery({
    queryKey: ['student-video-progress', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from('student_progress')
        .select('question_id, video_watched')
        .eq('student_account_id', student.id)
        .eq('video_watched', true);
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  if (attemptsLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate stats
  const totalAttempts = attempts?.length || 0;
  const correctAttempts = attempts?.filter(a => a.is_correct).length || 0;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  
  const uniqueQuestionsAttempted = new Set(attempts?.map(a => a.question_id)).size;
  const questionsCompleted = new Set(
    attempts?.filter(a => a.is_correct).map(a => a.question_id)
  ).size;
  
  const totalQuestions = questions?.length || 68;
  const videosWatched = progress?.length || 0;

  // First attempt accuracy
  const firstAttempts = attempts?.filter(a => a.attempt_number === 1) || [];
  const firstAttemptCorrect = firstAttempts.filter(a => a.is_correct).length;
  const firstAttemptAccuracy = firstAttempts.length > 0 
    ? Math.round((firstAttemptCorrect / firstAttempts.length) * 100) 
    : 0;

  // Category breakdown
  const categoryStats = questions?.reduce((acc, q) => {
    const catName = q.category?.name || 'Unknown';
    if (!acc[catName]) {
      acc[catName] = { total: 0, completed: 0, attempts: 0, correct: 0 };
    }
    acc[catName].total++;
    return acc;
  }, {} as Record<string, { total: number; completed: number; attempts: number; correct: number }>) || {};

  attempts?.forEach(a => {
    const catName = a.question?.category?.name || 'Unknown';
    if (categoryStats[catName]) {
      categoryStats[catName].attempts++;
      if (a.is_correct) {
        categoryStats[catName].correct++;
        categoryStats[catName].completed++;
      }
    }
  });

  // Dedupe completed count per category
  const completedByCategory: Record<string, Set<string>> = {};
  attempts?.filter(a => a.is_correct).forEach(a => {
    const catName = a.question?.category?.name || 'Unknown';
    if (!completedByCategory[catName]) {
      completedByCategory[catName] = new Set();
    }
    completedByCategory[catName].add(a.question_id);
  });

  Object.keys(categoryStats).forEach(cat => {
    categoryStats[cat].completed = completedByCategory[cat]?.size || 0;
  });

  const getCategoryColor = (categoryName: string) => {
    const colors: Record<string, string> = {
      'Advanced Math': 'text-blue-500',
      'Algebra': 'text-emerald-500',
      'Geometry and Trigonometry': 'text-purple-500',
      'Data Analysis and Problem Solving': 'text-orange-500',
    };
    return colors[categoryName] || 'text-muted-foreground';
  };

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Your Statistics
        </h1>
        <p className="text-muted-foreground">
          Track your progress and performance
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{questionsCompleted}</p>
            <p className="text-xs text-muted-foreground">of {totalQuestions}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">Accuracy</span>
            </div>
            <p className="text-2xl font-bold mt-1">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">{correctAttempts}/{totalAttempts} attempts</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">First Try</span>
            </div>
            <p className="text-2xl font-bold mt-1">{firstAttemptAccuracy}%</p>
            <p className="text-xs text-muted-foreground">{firstAttemptCorrect}/{firstAttempts.length}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Videos</span>
            </div>
            <p className="text-2xl font-bold mt-1">{videosWatched}</p>
            <p className="text-xs text-muted-foreground">watched</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4" />
            Overall Mastery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>{questionsCompleted} of {totalQuestions} questions mastered</span>
            <span className="font-medium">{Math.round((questionsCompleted / totalQuestions) * 100)}%</span>
          </div>
          <Progress value={(questionsCompleted / totalQuestions) * 100} className="h-3" />
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Performance</CardTitle>
          <CardDescription>See how you're doing in each area</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(categoryStats).map(([category, stats]) => {
            const catAccuracy = stats.attempts > 0 
              ? Math.round((stats.correct / stats.attempts) * 100) 
              : 0;
            const catCompletion = stats.total > 0 
              ? Math.round((stats.completed / stats.total) * 100) 
              : 0;
            
            return (
              <div key={category} className="space-y-2 p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${getCategoryColor(category)}`}>
                    {category}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stats.completed}/{stats.total} mastered
                  </span>
                </div>
                <Progress value={catCompletion} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{stats.attempts} attempts</span>
                  <span>{catAccuracy}% accuracy</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {attempts && attempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Your last 10 attempts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {attempts.slice(0, 10).map((attempt) => (
              <div 
                key={attempt.id}
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {attempt.is_correct ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <span className="font-mono font-bold">
                      {attempt.question?.question_id}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Attempt #{attempt.attempt_number}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(attempt.attempted_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
