import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, Clock, PlayCircle, CheckCircle2, 
  FileText, AlertCircle, Trophy
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BluebookTest {
  id: string;
  name: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface BluebookAttempt {
  id: string;
  test_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_score: number | null;
  rw_scaled_score: number | null;
  math_scaled_score: number | null;
}

export default function StudentBluebook() {
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();

  // Fetch published tests
  const { data: tests, isLoading: testsLoading } = useQuery({
    queryKey: ['student-bluebook-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_tests')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BluebookTest[];
    },
    enabled: !!student
  });

  // Fetch module counts for tests
  const { data: moduleStats } = useQuery({
    queryKey: ['student-bluebook-module-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_modules')
        .select(`
          test_id,
          time_limit_minutes,
          bluebook_module_questions(count)
        `);

      if (error) throw error;

      // Aggregate per test
      const stats: Record<string, { questions: number; totalTime: number }> = {};
      data?.forEach((module: any) => {
        const testId = module.test_id;
        const count = module.bluebook_module_questions?.[0]?.count || 0;
        if (!stats[testId]) {
          stats[testId] = { questions: 0, totalTime: 0 };
        }
        stats[testId].questions += count;
        stats[testId].totalTime += module.time_limit_minutes || 0;
      });

      return stats;
    },
    enabled: !!student
  });

  // Fetch student's attempts
  const { data: attempts } = useQuery({
    queryKey: ['student-bluebook-attempts', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from('bluebook_attempts')
        .select('*')
        .eq('student_account_id', student.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data as BluebookAttempt[];
    },
    enabled: !!student
  });

  const getTestAttempt = (testId: string) => {
    return attempts?.find(a => a.test_id === testId);
  };

  const handleStartTest = async (testId: string) => {
    const existingAttempt = getTestAttempt(testId);
    
    if (existingAttempt && existingAttempt.status !== 'completed') {
      // Resume existing attempt
      navigate(`/practice/bluebook/test/${existingAttempt.id}`);
    } else {
      // Create new attempt
      const { data: modules } = await supabase
        .from('bluebook_modules')
        .select('id')
        .eq('test_id', testId)
        .order('module_number')
        .limit(1);

      const firstModuleId = modules?.[0]?.id || null;

      const { data: attempt, error } = await supabase
        .from('bluebook_attempts')
        .insert({
          test_id: testId,
          student_account_id: student?.id,
          status: 'in_progress',
          current_module: 1,
          current_module_id: firstModuleId,
          started_at: new Date().toISOString(),
          module_started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create attempt:', error);
        return;
      }

      logActivity('bluebook_test_start', { testId, attemptId: attempt.id });
      navigate(`/practice/bluebook/test/${attempt.id}`);
    }
  };

  if (testsLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Practice Tests</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 select-none">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Practice Tests</h1>
          <p className="text-sm text-muted-foreground">Full SAT practice tests</p>
        </div>
      </div>

      {/* Tests Grid */}
      {!tests || tests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tests Available</h3>
            <p className="text-muted-foreground text-center">
              Practice tests will appear here when published.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map(test => {
            const stats = moduleStats?.[test.id];
            const attempt = getTestAttempt(test.id);
            const isCompleted = attempt?.status === 'completed';
            const isInProgress = attempt?.status === 'in_progress';

            return (
              <Card 
                key={test.id}
                className={`transition-all hover:border-primary/50 ${
                  isCompleted ? 'border-green-500/50 bg-green-500/5' : 
                  isInProgress ? 'border-amber-500/50 bg-amber-500/5' : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {test.name}
                      </CardTitle>
                      {isCompleted && attempt?.total_score && (
                        <Badge variant="default" className="mt-2 gap-1 bg-green-500">
                          <Trophy className="h-3 w-3" />
                          Score: {attempt.total_score}
                        </Badge>
                      )}
                      {isInProgress && (
                        <Badge variant="secondary" className="mt-2 gap-1 bg-amber-500/20 text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          In Progress
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {test.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {test.description}
                    </p>
                  )}
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{stats?.questions || 0} questions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{stats?.totalTime || 0} min</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button 
                    className="w-full gap-2"
                    variant={isCompleted ? 'outline' : 'default'}
                    onClick={() => handleStartTest(test.id)}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Review Test
                      </>
                    ) : isInProgress ? (
                      <>
                        <PlayCircle className="h-4 w-4" />
                        Continue Test
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4" />
                        Start Test
                      </>
                    )}
                  </Button>

                  {/* Previous Scores */}
                  {isCompleted && attempt && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Reading & Writing</p>
                        <p className="text-lg font-bold">{attempt.rw_scaled_score || '-'}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Math</p>
                        <p className="text-lg font-bold">{attempt.math_scaled_score || '-'}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
