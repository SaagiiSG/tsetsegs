import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  GraduationCap, Target, BookOpen, CheckCircle2, XCircle, 
  Clock, TrendingUp, Calendar, Award
} from 'lucide-react';
import { format } from 'date-fns';

export default function StudentShareProfile() {
  const { shareToken } = useParams<{ shareToken: string }>();

  // Fetch student account by share token
  const { data: studentAccount, isLoading: loadingAccount } = useQuery({
    queryKey: ['shared-profile', shareToken],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_accounts')
        .select(`
          id,
          phone_number,
          created_at,
          linked_student:students(
            first_name,
            last_name,
            school_name,
            grade
          )
        `)
        .eq('share_token', shareToken)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!shareToken
  });

  // Fetch questions for progress calculation
  const { data: questions } = useQuery({
    queryKey: ['shared-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_id, category:question_categories(name)')
        .eq('is_original', true)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!studentAccount
  });

  // Fetch student progress
  const { data: progress } = useQuery({
    queryKey: ['shared-progress', studentAccount?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_progress')
        .select('question_id, video_watched')
        .eq('student_account_id', studentAccount!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!studentAccount?.id
  });

  // Fetch student attempts
  const { data: attempts } = useQuery({
    queryKey: ['shared-attempts', studentAccount?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_attempts')
        .select('question_id, is_correct, attempt_number, attempted_at')
        .eq('student_account_id', studentAccount!.id)
        .order('attempted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!studentAccount?.id
  });

  // Fetch review queue
  const { data: reviewQueue } = useQuery({
    queryKey: ['shared-review', studentAccount?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_review_queue')
        .select('id')
        .eq('student_account_id', studentAccount!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!studentAccount?.id
  });

  if (loadingAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!studentAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Profile Not Found</h2>
            <p className="text-muted-foreground">
              This share link is invalid or has been revoked.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const linkedStudent = studentAccount.linked_student as { 
    first_name: string; 
    last_name: string | null;
    school_name: string | null;
    grade: string | null;
  } | null;

  const studentName = linkedStudent 
    ? `${linkedStudent.first_name} ${linkedStudent.last_name || ''}`.trim()
    : 'Student';

  // Calculate stats
  const totalQuestions = questions?.length || 0;
  const videosWatched = progress?.filter(p => p.video_watched).length || 0;
  
  // Group attempts by question to find correct ones
  const attemptsByQuestion = attempts?.reduce((acc, a) => {
    if (!acc[a.question_id]) acc[a.question_id] = [];
    acc[a.question_id].push(a);
    return acc;
  }, {} as Record<string, typeof attempts>);
  
  const questionsCompleted = Object.values(attemptsByQuestion || {})
    .filter(arr => arr?.some(a => a.is_correct)).length;
  
  const totalAttempts = attempts?.length || 0;
  const correctAttempts = attempts?.filter(a => a.is_correct).length || 0;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const reviewCount = reviewQueue?.length || 0;
  const overallProgress = totalQuestions > 0 ? Math.round((questionsCompleted / totalQuestions) * 100) : 0;

  // Category breakdown
  const categoryStats = questions?.reduce((acc, q) => {
    const cat = q.category?.name || 'Uncategorized';
    if (!acc[cat]) acc[cat] = { total: 0, completed: 0 };
    acc[cat].total++;
    if (attemptsByQuestion?.[q.id]?.some(a => a.is_correct)) {
      acc[cat].completed++;
    }
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  // Recent attempts (last 20)
  const recentAttempts = attempts?.slice(0, 20).map(a => {
    const q = questions?.find(q => q.id === a.question_id);
    return { ...a, question: q };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{studentName}</h1>
                <div className="flex flex-wrap gap-2 mt-1">
                  {linkedStudent?.school_name && (
                    <Badge variant="secondary">{linkedStudent.school_name}</Badge>
                  )}
                  {linkedStudent?.grade && (
                    <Badge variant="outline">Grade {linkedStudent.grade}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  SAT Practice Progress Report
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{questionsCompleted}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{videosWatched}</p>
              <p className="text-xs text-muted-foreground">Videos Watched</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{accuracy}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{reviewCount}</p>
              <p className="text-xs text-muted-foreground">To Review</p>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{questionsCompleted} of {totalQuestions} questions completed</span>
                <span className="font-medium">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Category Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(categoryStats || {}).map(([cat, stats]) => {
              const catProgress = stats.total > 0 
                ? Math.round((stats.completed / stats.total) * 100) 
                : 0;
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{cat}</span>
                    <span className="text-muted-foreground">
                      {stats.completed}/{stats.total} ({catProgress}%)
                    </span>
                  </div>
                  <Progress value={catProgress} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttempts && recentAttempts.length > 0 ? (
              <div className="space-y-2">
                {recentAttempts.map((attempt, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {attempt.is_correct ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <span className="font-mono text-sm font-medium">
                          {attempt.question?.question_id || 'Question'}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {attempt.question?.category?.name}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(attempt.attempted_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No practice attempts yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-6">
          <p>Tsetsegs Talent Agency • SAT Practice Portal</p>
          <p className="mt-1">This is a read-only view for parents</p>
        </div>
      </div>
    </div>
  );
}