import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  GraduationCap, Target, BookOpen, CheckCircle2, XCircle, 
  Clock, TrendingUp, Calendar, Award, UserCheck, ClipboardCheck, Trophy
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
          linked_student_id,
          linked_student:students(
            id,
            first_name,
            last_name,
            school_name,
            grade,
            batch_id,
            batch:batches(
              id,
              batch_name,
              course_type,
              schedule,
              start_date
            )
          )
        `)
        .eq('share_token', shareToken)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!shareToken
  });

  const linkedStudent = studentAccount?.linked_student as {
    id: string;
    first_name: string;
    last_name: string | null;
    school_name: string | null;
    grade: string | null;
    batch_id: string;
    batch: {
      id: string;
      batch_name: string;
      course_type: 'SAT' | 'IELTS';
      schedule: string;
      start_date: string;
    } | null;
  } | null;

  // Fetch attendance data
  const { data: attendanceData } = useQuery({
    queryKey: ['shared-attendance', linkedStudent?.id, linkedStudent?.batch_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', linkedStudent!.id)
        .eq('batch_id', linkedStudent!.batch_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!linkedStudent?.id && !!linkedStudent?.batch_id
  });

  // Fetch homework data
  const { data: homeworkData } = useQuery({
    queryKey: ['shared-homework', linkedStudent?.id, linkedStudent?.batch_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homework')
        .select('session_number, completed')
        .eq('student_id', linkedStudent!.id)
        .eq('batch_id', linkedStudent!.batch_id);
      if (error) throw error;
      return data;
    },
    enabled: !!linkedStudent?.id && !!linkedStudent?.batch_id
  });

  // Fetch practice tests
  const { data: practiceTests } = useQuery({
    queryKey: ['shared-practice-tests', linkedStudent?.id, linkedStudent?.batch_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_tests')
        .select('test_number, score, created_at')
        .eq('student_id', linkedStudent!.id)
        .eq('batch_id', linkedStudent!.batch_id)
        .order('test_number');
      if (error) throw error;
      return data;
    },
    enabled: !!linkedStudent?.id && !!linkedStudent?.batch_id
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

  const studentName = linkedStudent 
    ? `${linkedStudent.first_name} ${linkedStudent.last_name || ''}`.trim()
    : 'Student';

  const courseType = linkedStudent?.batch?.course_type || 'SAT';
  const maxSessions = courseType === 'IELTS' ? 24 : 15;

  // Calculate course stats (attendance, homework, practice tests)
  const courseStats = (() => {
    // Attendance
    let attendedCount = 0;
    let markedCount = 0;
    if (attendanceData) {
      for (let i = 1; i <= maxSessions; i++) {
        const status = (attendanceData as any)[`session_${i}`];
        if (status !== null) {
          markedCount++;
          if (status === 'present' || status === 'late') {
            attendedCount++;
          }
        }
      }
    }
    const attendanceRate = markedCount > 0 ? Math.round((attendedCount / markedCount) * 100) : 0;

    // Homework
    const homeworkCompleted = homeworkData?.filter(h => h.completed === true).length || 0;
    const homeworkMarked = homeworkData?.filter(h => h.completed !== null).length || 0;
    const homeworkRate = homeworkMarked > 0 ? Math.round((homeworkCompleted / homeworkMarked) * 100) : 0;

    // Practice tests
    const testsWithScores = practiceTests?.filter(t => t.score !== null) || [];
    const avgScore = testsWithScores.length > 0 
      ? Math.round(testsWithScores.reduce((sum, t) => sum + (t.score || 0), 0) / testsWithScores.length)
      : 0;
    const latestScore = testsWithScores.length > 0 ? testsWithScores[testsWithScores.length - 1].score : null;

    return {
      attendedCount,
      markedCount,
      attendanceRate,
      homeworkCompleted,
      homeworkMarked,
      homeworkRate,
      testsCompleted: testsWithScores.length,
      avgScore,
      latestScore,
    };
  })();

  // Calculate practice stats
  const totalQuestions = questions?.length || 0;
  const videosWatched = progress?.filter(p => p.video_watched).length || 0;
  
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

  // Recent attempts (last 10)
  const recentAttempts = attempts?.slice(0, 10).map(a => {
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
                  <Badge>{courseType}</Badge>
                </div>
                {linkedStudent?.batch?.batch_name && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {linkedStudent.batch.batch_name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Completion Stats */}
        {linkedStudent?.batch && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Course Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <UserCheck className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{courseStats.attendanceRate}%</p>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                  <p className="text-xs text-muted-foreground">
                    {courseStats.attendedCount}/{courseStats.markedCount} sessions
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <ClipboardCheck className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{courseStats.homeworkRate}%</p>
                  <p className="text-xs text-muted-foreground">Homework</p>
                  <p className="text-xs text-muted-foreground">
                    {courseStats.homeworkCompleted}/{courseStats.homeworkMarked} completed
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {courseStats.avgScore > 0 ? courseStats.avgScore : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                  <p className="text-xs text-muted-foreground">
                    {courseStats.testsCompleted} tests taken
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <TrendingUp className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {courseStats.latestScore ?? '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Latest Score</p>
                  <p className="text-xs text-muted-foreground">
                    {courseType === 'IELTS' ? 'Band' : 'SAT'}
                  </p>
                </div>
              </div>

              {/* Practice Test History */}
              {practiceTests && practiceTests.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3">Practice Test History</h4>
                  <div className="flex flex-wrap gap-2">
                    {practiceTests.map((test) => (
                      <div 
                        key={test.test_number}
                        className="px-3 py-2 rounded-lg bg-muted text-center min-w-[70px]"
                      >
                        <p className="text-xs text-muted-foreground">
                          {courseType === 'IELTS' ? `Mock ${test.test_number}` : (test.test_number === 9 ? 'SAT Mock' : `Test ${test.test_number + 3}`)}
                        </p>
                        <p className="font-semibold">
                          {test.score ?? '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Practice Stats Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              SAT Practice Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{questionsCompleted}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <BookOpen className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{videosWatched}</p>
                <p className="text-xs text-muted-foreground">Videos Watched</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Target className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Clock className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{reviewCount}</p>
                <p className="text-xs text-muted-foreground">To Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Overall Question Progress
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
          <p>Tsetsegs Talent Agency • {courseType} Prep Portal</p>
          <p className="mt-1">This is a read-only view for parents</p>
        </div>
      </div>
    </div>
  );
}
