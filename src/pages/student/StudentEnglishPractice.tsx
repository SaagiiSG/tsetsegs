import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, PlayCircle, Loader2, 
  Target, RotateCcw, BookOpen, ArrowLeft
} from 'lucide-react';
import { useEffect, useState } from 'react';

const ENGLISH_CATEGORIES = [
  'Information and Ideas',
  'Craft and Structure',
  'Standard English Conventions',
  'Expression of Ideas'
];

export default function StudentEnglishPractice() {
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (student) {
      logActivity('english_practice_view');
    }
  }, [student]);

  // Fetch English questions
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['english-practice-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          id,
          question_id,
          category_id,
          question_set,
          passage_text,
          category:question_categories(id, name)
        `)
        .eq('is_original', true)
        .eq('is_active', true)
        .eq('subject', 'english')
        .order('question_id');
      
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  const { data: categories } = useQuery({
    queryKey: ['english-question-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_categories')
        .select('id, name')
        .in('name', ENGLISH_CATEGORIES)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  const { data: progress } = useQuery({
    queryKey: ['student-english-progress', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const questionIds = questions?.map(q => q.id) || [];
      if (questionIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('student_progress')
        .select('question_id, video_watched')
        .eq('student_account_id', student.id)
        .in('question_id', questionIds);
      if (error) throw error;
      return data;
    },
    enabled: !!student && !!questions?.length
  });

  const { data: attempts } = useQuery({
    queryKey: ['student-english-attempts', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const questionIds = questions?.map(q => q.id) || [];
      if (questionIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('student_attempts')
        .select('question_id, is_correct, attempt_number')
        .eq('student_account_id', student.id)
        .in('question_id', questionIds);
      if (error) throw error;
      return data;
    },
    enabled: !!student && !!questions?.length
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
  const totalQuestions = questions?.length || 0;
  const progressPercent = totalQuestions > 0 ? (completedCount / totalQuestions) * 100 : 0;

  const getCategoryColor = (categoryName: string) => {
    const colors: Record<string, string> = {
      'Information and Ideas': 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      'Craft and Structure': 'bg-violet-500/10 text-violet-500 border-violet-500/20',
      'Standard English Conventions': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'Expression of Ideas': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    };
    return colors[categoryName] || 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/practice/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">SAT English Practice</h1>
          <p className="text-sm text-muted-foreground">Reading & Writing Questions</p>
        </div>
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
      {categoryStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Skill Progress
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
      )}

      {/* Questions */}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {filteredQuestions.map((question) => {
                const status = getQuestionStatus(question.id);
                
                return (
                  <Card 
                    key={question.id}
                    className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                      status === 'completed' ? 'border-green-500/50 bg-green-500/5' :
                      status === 'needs_review' ? 'border-orange-500/50 bg-orange-500/5' :
                      status === 'video_watched' ? 'border-yellow-500/50 bg-yellow-500/5' :
                      ''
                    }`}
                    onClick={() => {
                      logActivity('english_question_click', { question_id: question.id });
                      navigate(`/practice/english/question/${question.id}`);
                    }}
                  >
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm">{question.question_id}</span>
                        {status === 'completed' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {status === 'needs_review' && (
                          <RotateCcw className="h-4 w-4 text-orange-500" />
                        )}
                        {status === 'video_watched' && (
                          <PlayCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] truncate max-w-full ${getCategoryColor(question.category?.name || '')}`}
                      >
                        {question.category?.name?.split(' ')[0] || 'N/A'}
                      </Badge>
                      {question.passage_text && (
                        <span className="text-[10px] text-muted-foreground block">Has passage</span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No English questions available yet</p>
                <p className="text-sm mt-2">Check back soon!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
