import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, PlayCircle, Loader2, 
  Target, RotateCcw, BookOpen
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function StudentPractice() {
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (student) {
      logActivity('dashboard_view');
    }
  }, [student]);

  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['practice-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          id,
          question_id,
          category_id,
          category:question_categories(id, name)
        `)
        .eq('is_original', true)
        .eq('is_active', true)
        .order('question_id');
      
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

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

  const filteredQuestions = questions?.filter(q => {
    if (activeTab === 'all') return true;
    return q.category_id === activeTab;
  }) || [];

  const completedCount = questions?.filter(q => getQuestionStatus(q.id) === 'completed').length || 0;
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

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
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

      {/* Questions Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="all" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            All ({questions?.length || 0})
          </TabsTrigger>
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
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
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
    </div>
  );
}
