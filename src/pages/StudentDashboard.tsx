import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LogOut, CheckCircle2, PlayCircle, Circle, Loader2 } from 'lucide-react';

export default function StudentDashboard() {
  const { student, logout, isLoading: authLoading } = useStudentAuth();
  const navigate = useNavigate();

  // Fetch all questions
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['practice-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          id,
          question_id,
          category:question_categories(name)
        `)
        .eq('is_original', true)
        .eq('is_active', true)
        .order('question_id');
      
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  // Fetch student progress
  const { data: progress } = useQuery({
    queryKey: ['student-progress', student?.id],
    queryFn: async () => {
      if (!student) return [];
      
      const { data, error } = await supabase
        .from('student_progress')
        .select('question_id, video_watched')
        .eq('student_account_id', student.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  // Fetch student attempts
  const { data: attempts } = useQuery({
    queryKey: ['student-attempts', student?.id],
    queryFn: async () => {
      if (!student) return [];
      
      const { data, error } = await supabase
        .from('student_attempts')
        .select('question_id, is_correct')
        .eq('student_account_id', student.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return <Navigate to="/practice" replace />;
  }

  const progressMap = new Map(progress?.map(p => [p.question_id, p]) || []);
  const attemptsMap = new Map<string, boolean>();
  
  attempts?.forEach(a => {
    if (a.is_correct) {
      attemptsMap.set(a.question_id, true);
    }
  });

  const getQuestionStatus = (questionId: string) => {
    const prog = progressMap.get(questionId);
    const completed = attemptsMap.get(questionId);
    
    if (completed) return 'completed';
    if (prog?.video_watched) return 'video_watched';
    return 'not_started';
  };

  const completedCount = questions?.filter(q => getQuestionStatus(q.id) === 'completed').length || 0;
  const videoWatchedCount = questions?.filter(q => getQuestionStatus(q.id) === 'video_watched').length || 0;
  const totalQuestions = questions?.length || 68;
  const progressPercent = (completedCount / totalQuestions) * 100;

  const getCategoryColor = (categoryName: string) => {
    const colors: Record<string, string> = {
      'Algebra': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'Geometry': 'bg-green-500/10 text-green-500 border-green-500/20',
      'Statistics': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'Reading Comprehension': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'Grammar/Writing': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    };
    return colors[categoryName] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">SAT Practice</h1>
            <p className="text-sm text-muted-foreground">{student.phone_number}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>{completedCount} of {totalQuestions} completed</span>
              <span className="font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{completedCount} Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-yellow-500" />
                <span>{videoWatchedCount} Video Only</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span>{totalQuestions - completedCount - videoWatchedCount} Not Started</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">All Questions</h2>
          
          {questionsLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : questions && questions.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {questions.map((question) => {
                const status = getQuestionStatus(question.id);
                
                return (
                  <Card 
                    key={question.id}
                    className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                      status === 'completed' ? 'border-green-500/50 bg-green-500/5' :
                      status === 'video_watched' ? 'border-yellow-500/50 bg-yellow-500/5' :
                      ''
                    }`}
                    onClick={() => navigate(`/practice/question/${question.id}`)}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-lg">{question.question_id}</span>
                        {status === 'completed' && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {status === 'video_watched' && (
                          <PlayCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getCategoryColor(question.category?.name || '')}`}
                      >
                        {question.category?.name || 'N/A'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No questions available yet</p>
                <p className="text-sm">Check back later!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
