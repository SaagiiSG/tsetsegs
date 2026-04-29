import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, PlayCircle, Loader2, 
  Target, RotateCcw, BookOpen, FileText, ChevronDown, ChevronRight, StickyNote
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { DesmosCalculator } from '@/components/student/DesmosCalculator';
import { cn } from '@/lib/utils';

type QuestionSet = '68' | 'CB' | '150';
type Subject = 'math' | 'english';

const MATH_CATEGORIES = [
  'Advanced Math',
  'Algebra',
  'Geometry and Trigonometry',
  'Data Analysis and Problem Solving'
];

const ENGLISH_CATEGORIES = [
  'Information and Ideas',
  'Craft and Structure',
  'Standard English Conventions',
  'Expression of Ideas'
];

export default function StudentPractice() {
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();
  const [questionSet, setQuestionSet] = useState<QuestionSet>('68');
  const [subject, setSubject] = useState<Subject>('math');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (student) {
      logActivity('dashboard_view');
    }
  }, [student]);

  // Fetch questions that are NOT part of bluebook tests
  const { data: bluebookQuestionIds = new Set<string>(), isSuccess: bluebookLoaded } = useQuery({
    queryKey: ['bluebook-question-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_module_questions')
        .select('question_id');
      if (error) throw error;
      return new Set((data?.map(q => q.question_id).filter(Boolean) as string[]) || []);
    },
    enabled: !!student,
    staleTime: 10 * 60 * 1000
  });

  // Fetch questions based on selected question set and subject
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['practice-questions', questionSet, subject, bluebookQuestionIds ? 'filtered' : 'pending'],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select(`
          id,
          question_id,
          category_id,
          question_set,
          subject,
          subtopic,
          is_original,
          parent_question_id,
          category:question_categories(id, name)
        `)
        .eq('is_active', true)
        .eq('subject', subject);
      
      if (subject === 'math') {
        if (questionSet === '68') {
          query = query.eq('question_set', '68');
        } else if (questionSet === '150') {
          query = query.eq('question_set', 'SATMathTraining800');
        } else {
          query = query.neq('question_set', '68').neq('question_set', 'SATMathTraining800').eq('is_original', true);
        }
      } else {
        // For English: only originals
        query = query.eq('is_original', true);
      }
      
      const { data, error } = await query.order('question_id');
      if (error) throw error;
      
      // Filter out bluebook questions
      if (bluebookQuestionIds && data) {
        return data.filter(q => !bluebookQuestionIds.has(q.id));
      }
      return data;
    },
    enabled: !!student && bluebookLoaded
  });

  // Fetch question counts for all sets (excluding bluebook questions)
  const { data: questionCounts } = useQuery({
    queryKey: ['question-set-counts', bluebookQuestionIds ? 'filtered' : 'pending'],
    queryFn: async () => {
      const [set68Result, cbResult, englishResult, set150Result] = await Promise.all([
        supabase
          .from('questions')
          .select('id')
          .eq('is_active', true)
          .eq('question_set', '68')
          .eq('subject', 'math'),
        supabase
          .from('questions')
          .select('id')
          .eq('is_original', true)
          .eq('is_active', true)
          .neq('question_set', '68')
          .neq('question_set', 'SATMathTraining800')
          .eq('subject', 'math'),
        supabase
          .from('questions')
          .select('id')
          .eq('is_original', true)
          .eq('is_active', true)
          .eq('subject', 'english'),
        supabase
          .from('questions')
          .select('id')
          .eq('is_active', true)
          .eq('question_set', 'SATMathTraining800')
          .eq('subject', 'math')
      ]);
      
      const filterBluebook = (data: { id: string }[] | null) => {
        if (!data || !bluebookQuestionIds) return 0;
        return data.filter(q => !bluebookQuestionIds.has(q.id)).length;
      };
      
      return {
        set68: filterBluebook(set68Result.data),
        cb: filterBluebook(cbResult.data),
        english: filterBluebook(englishResult.data),
        set150: filterBluebook(set150Result.data)
      };
    },
    enabled: !!student && bluebookLoaded
  });

  const categoryNames = subject === 'english' ? ENGLISH_CATEGORIES : MATH_CATEGORIES;
  
  const { data: categories } = useQuery({
    queryKey: ['question-categories', subject],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_categories')
        .select('id, name')
        .in('name', categoryNames)
        .order('name');
      if (error) throw error;
      return data || [];
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

  // Fetch which questions have notes
  const { data: questionNotes } = useQuery({
    queryKey: ['student-question-notes', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from('student_question_notes')
        .select('question_id')
        .eq('student_account_id', student.id);
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  const notesSet = new Set(Array.isArray(questionNotes) ? questionNotes.map(n => n.question_id) : []);

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

  // Build category tree with subtopics
  const categoryTree = useMemo(() => {
    if (!categories || !questions) return [];
    
    return categories.map(cat => {
      const catQuestions = questions.filter(q => q.category_id === cat.id);
      const subtopics = [...new Set(
        catQuestions
          .map(q => q.subtopic)
          .filter((s): s is string => Boolean(s))
      )].sort();
      
      const completed = catQuestions.filter(q => getQuestionStatus(q.id) === 'completed').length;
      
      return {
        ...cat,
        subtopics,
        total: catQuestions.length,
        completed,
        percent: catQuestions.length > 0 ? Math.round((completed / catQuestions.length) * 100) : 0
      };
    });
  }, [categories, questions, attempts, progress]);

  // Filter questions based on selection
  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    
    return questions.filter(q => {
      if (selectedCategory) {
        if (q.category_id !== selectedCategory) return false;
      }
      if (selectedSubtopic) {
        if (q.subtopic !== selectedSubtopic) return false;
      }
      return true;
    });
  }, [questions, selectedCategory, selectedSubtopic]);

  // Calculate stats for selected area
  const areaStats = useMemo(() => {
    const completed = filteredQuestions.filter(q => getQuestionStatus(q.id) === 'completed').length;
    const total = filteredQuestions.length;
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [filteredQuestions, attempts, progress]);

  const completedCount = questions?.filter(q => getQuestionStatus(q.id) === 'completed').length || 0;
  const totalQuestions = questions?.length || 0;
  const progressPercent = totalQuestions > 0 ? (completedCount / totalQuestions) * 100 : 0;

  const selectedCategoryName = categories?.find(c => c.id === selectedCategory)?.name;

  const getCategoryColor = (categoryName: string) => {
    const colors: Record<string, string> = {
      // Math categories
      'Advanced Math': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'Algebra': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'Geometry and Trigonometry': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'Data Analysis and Problem Solving': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      // English categories
      'Information and Ideas': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      'Craft and Structure': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      'Standard English Conventions': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'Expression of Ideas': 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    };
    return colors[categoryName] || 'bg-muted text-muted-foreground border-border';
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedSubtopic(null);
  };

  const handleSubtopicClick = (catId: string, subtopic: string) => {
    setSelectedCategory(catId);
    setSelectedSubtopic(subtopic);
  };

  const clearSelection = () => {
    setSelectedCategory(null);
    setSelectedSubtopic(null);
  };

  return (
    <div className="p-2 md:p-6 space-y-2 md:space-y-4 select-none flex flex-col h-[calc(100vh-2rem)]">
      {/* Desmos Calculator Floating Button (only for Math) */}
      {subject === 'math' && <DesmosCalculator />}
      
      {/* Island Selector */}
      <Card className="bg-gradient-to-br from-card via-card to-muted/30 shadow-lg border-2">
        <CardContent className="p-2 md:p-4 space-y-2 md:space-y-4">
          {/* Subject & Question Set Row */}
          <div className="flex flex-wrap items-center gap-1.5 md:gap-3">
            {/* Subject Toggle */}
            <div className="flex rounded-lg border bg-muted/50 p-0.5 md:p-1">
              <Button
                variant={subject === 'math' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setSubject('math');
                  setSelectedCategory(null);
                  setSelectedSubtopic(null);
                }}
                className="gap-1 md:gap-2 h-7 md:h-9 text-xs md:text-sm px-2 md:px-3"
              >
                <Target className="h-3 w-3 md:h-4 md:w-4" />
                Math
              </Button>
              <Button
                variant={subject === 'english' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setSubject('english');
                  setSelectedCategory(null);
                  setSelectedSubtopic(null);
                }}
                className="gap-1 md:gap-2 h-7 md:h-9 text-xs md:text-sm px-2 md:px-3"
              >
                <FileText className="h-3 w-3 md:h-4 md:w-4" />
                English
              </Button>
            </div>

            {/* Question Set Toggle (Math only) */}
            {subject === 'math' && (
              <div className="flex rounded-lg border bg-muted/50 p-0.5 md:p-1">
                <Button
                  variant={questionSet === '68' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setQuestionSet('68');
                    setSelectedCategory(null);
                    setSelectedSubtopic(null);
                  }}
                  className="gap-1 md:gap-2 h-7 md:h-9 text-xs md:text-sm px-1.5 md:px-3"
                >
                  <BookOpen className="h-3 w-3 md:h-4 md:w-4 hidden md:block" />
                  68 ({questionCounts?.set68 || 0})
                </Button>
                <Button
                  variant={questionSet === 'CB' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setQuestionSet('CB');
                    setSelectedCategory(null);
                    setSelectedSubtopic(null);
                  }}
                  className="gap-1 md:gap-2 h-7 md:h-9 text-xs md:text-sm px-1.5 md:px-3"
                >
                  CB ({questionCounts?.cb || 0})
                </Button>
                <Button
                  variant={questionSet === '150' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setQuestionSet('150');
                    setSelectedCategory(null);
                    setSelectedSubtopic(null);
                  }}
                  className="gap-1 md:gap-2 h-7 md:h-9 text-xs md:text-sm px-1.5 md:px-3"
                >
                  150 ({questionCounts?.set150 || 0})
                </Button>
              </div>
            )}

            {subject === 'english' && (
              <Badge variant="outline" className="text-xs md:text-sm">
                {questionCounts?.english || 0} questions
              </Badge>
            )}
          </div>

          {/* Overall Progress Bar */}
          <div className="space-y-1 md:space-y-2">
            <div className="flex items-center justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{completedCount}/{totalQuestions} ({Math.round(progressPercent)}%)</span>
            </div>
            <Progress value={progressPercent} className="h-1.5 md:h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Layout: 150 tab = full width grid, others = two column */}
      {questionSet === '150' && subject === 'math' ? (
        <div className="flex flex-col flex-1 gap-4 mb-4" style={{ minHeight: 0 }}>
          {/* Selected Area Header & Progress */}
          <Card className="shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                150 Hard Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={areaStats.percent} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {areaStats.completed}/{areaStats.total} mastered ({areaStats.percent}%)
              </p>
            </CardContent>
          </Card>

          {/* Full Width Question Grid - fills remaining height */}
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardContent className="p-4 flex-1 min-h-0">
              {questionsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </div>
              ) : filteredQuestions.length > 0 ? (
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-15 gap-2 pr-4">
                    {filteredQuestions.map((question, index) => {
                      const status = getQuestionStatus(question.id);
                      const inReview = reviewQueueSet.has(question.id);
                      const displayNum = index + 1;

                      return (
                        <button
                          key={question.id}
                          className={cn(
                            "aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 text-xs font-bold transition-all hover:scale-105 hover:shadow-md cursor-pointer",
                            status === 'completed' && 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400',
                            status !== 'completed' && (status === 'needs_review' || inReview) && 'border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400',
                            status === 'video_watched' && !inReview && 'border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
                            status === 'not_started' && 'border-border bg-card text-muted-foreground hover:border-primary/50'
                          )}
                          onClick={() => {
                            logActivity('question_click', { question_id: question.id });
                            navigate(`/practice/question/${question.id}`);
                          }}
                        >
                          <span className="text-sm font-bold">{displayNum}</span>
                          {status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                          {status !== 'completed' && (status === 'needs_review' || inReview) && <RotateCcw className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No questions available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-4 min-h-[calc(100vh-320px)]">
          {/* Left Panel - Categories & Subtopics */}
          <Card className="h-fit lg:h-full">
            <CardHeader className="pb-1 md:pb-2 px-2 md:px-6 pt-2 md:pt-6">
              <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2">
                <Target className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {subject === 'math' ? 'Math Areas' : 'English Skills'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 md:p-2">
              <ScrollArea className="h-[250px] lg:h-[calc(100vh-450px)]">
                <div className="space-y-1 pr-4">
                  {/* All Questions option */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-between text-left h-auto py-2 px-3",
                      !selectedCategory && "bg-primary/10 text-primary"
                    )}
                    onClick={clearSelection}
                  >
                    <span className="font-medium">All Questions</span>
                    <span className="text-xs text-muted-foreground">{questions?.length || 0}</span>
                  </Button>

                  {categoryTree.map(cat => (
                    <Collapsible 
                      key={cat.id} 
                      open={expandedCategories.has(cat.id)}
                      onOpenChange={() => toggleCategory(cat.id)}
                    >
                      <div className="flex items-center">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 hover:bg-transparent"
                          >
                            {expandedCategories.has(cat.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "flex-1 justify-between text-left h-auto py-2 px-2",
                            selectedCategory === cat.id && !selectedSubtopic && "bg-primary/10 text-primary"
                          )}
                          onClick={() => handleCategoryClick(cat.id)}
                        >
                          <span className="font-medium text-sm truncate">{cat.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{cat.completed}/{cat.total}</span>
                            <Progress value={cat.percent} className="w-12 h-1.5" />
                          </div>
                        </Button>
                      </div>
                      <CollapsibleContent className="pl-7 space-y-0.5">
                        {cat.subtopics.length > 0 ? (
                          cat.subtopics.map(subtopic => {
                            const subtopicQuestions = questions?.filter(
                              q => q.category_id === cat.id && q.subtopic === subtopic
                            ) || [];
                            const subtopicCompleted = subtopicQuestions.filter(
                              q => getQuestionStatus(q.id) === 'completed'
                            ).length;
                            
                            return (
                              <Button
                                key={subtopic}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "w-full justify-between text-left h-auto py-1.5 px-2 text-xs",
                                  selectedSubtopic === subtopic && selectedCategory === cat.id && "bg-primary/10 text-primary"
                                )}
                                onClick={() => handleSubtopicClick(cat.id, subtopic)}
                              >
                                <span className="truncate">{subtopic}</span>
                                <span className="text-muted-foreground">{subtopicCompleted}/{subtopicQuestions.length}</span>
                              </Button>
                            );
                          })
                        ) : (
                          <p className="text-xs text-muted-foreground py-2 px-2">No subtopics available</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Panel - Questions Display */}
          <div className="space-y-2 md:space-y-4">
            {/* Selected Area Header & Progress */}
            <Card>
              <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-2 md:pt-6">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  {selectedSubtopic || selectedCategoryName || 'All Questions'}
                  {selectedCategory && (
                    <Button variant="ghost" size="sm" onClick={clearSelection} className="ml-auto text-xs h-6">
                      Clear
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 md:space-y-2 px-3 md:px-6">
                <Progress value={areaStats.percent} className="h-1.5 md:h-2" />
                <p className="text-xs md:text-sm text-muted-foreground">
                  {areaStats.completed}/{areaStats.total} mastered ({areaStats.percent}%)
                </p>
              </CardContent>
            </Card>

            {/* Question Grid */}
            <Card className="flex-1">
              <CardContent className="p-2 md:p-3">
                <ScrollArea className="h-[250px] lg:h-[calc(100vh-520px)]">
                  {questionsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mx-auto text-primary" />
                    </div>
                  ) : filteredQuestions.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5 md:gap-2 pr-2 md:pr-4">
                      {filteredQuestions.map((question, index) => {
                        const status = getQuestionStatus(question.id);
                        const inReview = reviewQueueSet.has(question.id);
                        
                        const displayId = question.question_id;
                        let simpleId = displayId;
                        
                        if (displayId.startsWith('CB')) {
                          const num = parseInt(displayId.replace('CB', ''), 10);
                          simpleId = isNaN(num) ? displayId : String(num);
                        } else if (displayId.startsWith('ENG')) {
                          const num = parseInt(displayId.replace('ENG', ''), 10);
                          simpleId = isNaN(num) ? displayId : String(num);
                        }
                        
                        return (
                          <Card 
                            key={question.id}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
                              status === 'completed' && 'border-green-500/50 bg-green-500/5',
                              status !== 'completed' && (status === 'needs_review' || inReview) && 'border-orange-500/50 bg-orange-500/5',
                              status === 'video_watched' && !inReview && 'border-yellow-500/50 bg-yellow-500/5'
                            )}
                            onClick={() => {
                              logActivity('question_click', { question_id: question.id });
                              navigate(subject === 'english' 
                                ? `/practice/english/question/${question.id}` 
                                : `/practice/question/${question.id}`
                              );
                            }}
                          >
                            <CardContent className="p-2 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-xs">{simpleId}</span>
                                <div className="flex items-center gap-0.5">
                                  {notesSet.has(question.id) && (
                                    <StickyNote className="h-3 w-3 text-amber-500" />
                                  )}
                                  {status === 'completed' && (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  )}
                                  {status !== 'completed' && (status === 'needs_review' || inReview) && (
                                    <RotateCcw className="h-3 w-3 text-orange-500" />
                                  )}
                                  {status === 'video_watched' && !inReview && (
                                    <PlayCircle className="h-3 w-3 text-yellow-500" />
                                  )}
                                </div>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[9px] truncate max-w-full",
                                  getCategoryColor(question.category?.name || '')
                                )}
                              >
                                {question.category?.name?.split(' ')[0] || 'N/A'}
                              </Badge>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No questions in this selection</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
