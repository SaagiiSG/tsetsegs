import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LogOut, CheckCircle2, PlayCircle, Circle, Loader2, 
  Brain, Target, Clock, TrendingUp, RotateCcw, Zap,
  BookOpen, User
} from 'lucide-react';
import { useEffect, useState } from 'react';

type QuestionSet = '68' | 'CB';

export default function StudentDashboard() {
  const { student, logout, isLoading: authLoading, logActivity } = useStudentAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [questionSet, setQuestionSet] = useState<QuestionSet>('68');

  // Security: Prevent screenshots (CSS-based)
  useEffect(() => {
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    // Log page view
    if (student) {
      logActivity('dashboard_view');
    }

    return () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [student]);

  // Fetch all questions based on selected question set
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['practice-questions', questionSet],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select(`
          id,
          question_id,
          category_id,
          question_set,
          category:question_categories(id, name)
        `)
        .eq('is_original', true)
        .eq('is_active', true);
      
      if (questionSet === '68') {
        query = query.eq('question_set', '68');
      } else {
        query = query.like('question_id', 'CB%');
      }
      
      const { data, error } = await query.order('question_id');
      
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  // Fetch categories for filtering
  const { data: categories } = useQuery({
    queryKey: ['question-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_categories')
        .select('id, name')
        .order('name');
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
        .select('question_id, is_correct, attempt_number')
        .eq('student_account_id', student.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  // Fetch review queue
  const { data: reviewQueue } = useQuery({
    queryKey: ['review-queue', student?.id],
    queryFn: async () => {
      if (!student) return [];
      
      const { data, error } = await supabase
        .from('student_review_queue')
        .select('question_id, next_review_at')
        .eq('student_account_id', student.id)
        .lte('next_review_at', new Date().toISOString());
      
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return <Navigate to="/practice" replace />;
  }

  const progressMap = new Map(progress?.map(p => [p.question_id, p]) || []);
  const attemptsMap = new Map<string, { correct: boolean; attempts: number }>();
  
  attempts?.forEach(a => {
    const existing = attemptsMap.get(a.question_id);
    if (!existing || a.is_correct) {
      attemptsMap.set(a.question_id, {
        correct: a.is_correct || existing?.correct || false,
        attempts: Math.max(a.attempt_number, existing?.attempts || 0)
      });
    }
  });

  const reviewQueueSet = new Set(reviewQueue?.map(r => r.question_id) || []);

  const getQuestionStatus = (questionId: string) => {
    const attemptInfo = attemptsMap.get(questionId);
    const prog = progressMap.get(questionId);
    
    if (attemptInfo?.correct) return 'completed';
    if (prog?.video_watched) return 'video_watched';
    if (attemptInfo && !attemptInfo.correct) return 'needs_review';
    return 'not_started';
  };

  // Calculate stats by category
  const categoryStats = categories?.map(cat => {
    const catQuestions = questions?.filter(q => q.category_id === cat.id) || [];
    const completed = catQuestions.filter(q => getQuestionStatus(q.id) === 'completed').length;
    const total = catQuestions.length;
    return {
      ...cat,
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }) || [];

  // Filter questions based on active tab
  const filteredQuestions = questions?.filter(q => {
    if (activeTab === 'all') return true;
    if (activeTab === 'review') return reviewQueueSet.has(q.id);
    return q.category_id === activeTab;
  }) || [];

  const completedCount = questions?.filter(q => getQuestionStatus(q.id) === 'completed').length || 0;
  const videoWatchedCount = questions?.filter(q => getQuestionStatus(q.id) === 'video_watched').length || 0;
  const needsReviewCount = questions?.filter(q => getQuestionStatus(q.id) === 'needs_review').length || 0;
  const totalQuestions = questions?.length || 68;
  const progressPercent = (completedCount / totalQuestions) * 100;

  const getCategoryColor = (categoryName: string) => {
    const colors: Record<string, string> = {
      'Advanced Math': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'Algebra': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'Geometry and Trigonometry': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'Data Analysis and Problem Solving': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    };
    return colors[categoryName] || 'bg-muted text-muted-foreground border-border';
  };

  const studentName = student.linked_student 
    ? `${student.linked_student.first_name}${student.linked_student.last_name ? ' ' + student.linked_student.last_name.charAt(0) + '.' : ''}`
    : student.phone_number;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 select-none">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{studentName}</h1>
              <p className="text-xs text-muted-foreground">SAT Practice Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Question Set Selector */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Question Set:</span>
              <div className="flex gap-2">
                <Button
                  variant={questionSet === '68' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setQuestionSet('68');
                    setActiveTab('all');
                  }}
                  className="gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  68 Questions
                </Button>
                <Button
                  variant={questionSet === 'CB' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setQuestionSet('CB');
                    setActiveTab('all');
                  }}
                  className="gap-2"
                >
                  <Target className="h-4 w-4" />
                  CollegeBoard ({questions?.length || 0}+)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <p className="text-2xl font-bold mt-1">{completedCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <PlayCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Watched</span>
              </div>
              <p className="text-2xl font-bold mt-1">{videoWatchedCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600">
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm font-medium">Review</span>
              </div>
              <p className="text-2xl font-bold mt-1">{reviewQueueSet.size}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Progress</span>
              </div>
              <p className="text-2xl font-bold mt-1">{Math.round(progressPercent)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>{completedCount} of {totalQuestions} questions mastered</span>
              <span className="font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </CardContent>
        </Card>

        {/* Category Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Category Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryStats.map(cat => (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-muted-foreground">{cat.completed}/{cat.total}</span>
                </div>
                <Progress value={cat.percent} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Review Queue Alert */}
        {reviewQueueSet.size > 0 && (
          <Card className="border-orange-500/50 bg-orange-500/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">Spaced Repetition</p>
                  <p className="text-sm text-muted-foreground">{reviewQueueSet.size} questions ready for review</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
                onClick={() => setActiveTab('review')}
              >
                <Zap className="h-4 w-4 mr-2" />
                Review Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Questions Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="all" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              All ({questions?.length || 0})
            </TabsTrigger>
            {reviewQueueSet.size > 0 && (
              <TabsTrigger value="review" className="text-xs text-orange-600">
                <Brain className="h-3 w-3 mr-1" />
                Review ({reviewQueueSet.size})
              </TabsTrigger>
            )}
            {categories?.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                {cat.name.split(' ')[0]} ({questions?.filter(q => q.category_id === cat.id).length || 0})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {questionsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              </div>
            ) : filteredQuestions.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {filteredQuestions.map((question) => {
                  const status = getQuestionStatus(question.id);
                  const inReview = reviewQueueSet.has(question.id);
                  
                  return (
                    <Card 
                      key={question.id}
                      className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                        status === 'completed' ? 'border-green-500/50 bg-green-500/5' :
                        status === 'needs_review' || inReview ? 'border-orange-500/50 bg-orange-500/5' :
                        status === 'video_watched' ? 'border-yellow-500/50 bg-yellow-500/5' :
                        ''
                      }`}
                      onClick={() => {
                        logActivity('question_click', { question_id: question.id });
                        navigate(`/practice/question/${question.id}`);
                      }}
                    >
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold">{question.question_id}</span>
                          {status === 'completed' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {(status === 'needs_review' || inReview) && (
                            <RotateCcw className="h-4 w-4 text-orange-500" />
                          )}
                          {status === 'video_watched' && !inReview && (
                            <PlayCircle className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] truncate max-w-full ${getCategoryColor(question.category?.name || '')}`}
                        >
                          {question.category?.name?.split(' ')[0] || 'N/A'}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>No questions in this category</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Security overlay - prevents easy screenshots */}
      <div 
        className="fixed inset-0 pointer-events-none z-50 opacity-0 select-none"
        style={{ 
          background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.01) 10px, rgba(0,0,0,0.01) 20px)'
        }}
      />
    </div>
  );
}