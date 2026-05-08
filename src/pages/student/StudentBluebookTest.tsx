import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Clock, Flag, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertCircle, Grid3X3,
  Pause, Play, X, Calculator, BookOpen, Settings,
  Save, LogOut, Coffee
} from 'lucide-react';
import { toast } from 'sonner';
import { MathText } from '@/components/MathText';
import { DesmosCalculator, toggleCalculator, useCalculatorSnap } from '@/components/student/DesmosCalculator';
import { ReferenceSheet, ReferenceSheetButton } from '@/components/student/ReferenceSheet';
import { BluebookResultsDialog } from '@/components/student/BluebookResultsDialog';
import { cn } from '@/lib/utils';
import { setDesmosContext, clearDesmosContext } from '@/lib/desmosTracking';

interface ResultsData {
  totalScore: number;
  rwScaled: number;
  mathScaled: number;
  rwRaw: number;
  mathRaw: number;
  rwTotal: number;
  mathTotal: number;
  questions: QuestionResult[];
}

interface QuestionResult {
  id: string;
  question_id: string;
  question_text: string;
  question_image_url: string | null;
  question_type: string;
  multiple_choice_options: any;
  passage_text: string | null;
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean;
  order_index: number;
  section: 'reading_writing' | 'math';
  module_number: number;
}

interface Question {
  id: string;
  question_id: string;
  question_text: string;
  question_image_url: string | null;
  question_type: string;
  multiple_choice_options: any;
  passage_text: string | null;
}

interface ModuleQuestion {
  id: string;
  order_index: number;
  question: Question;
}

interface Module {
  id: string;
  module_number: number;
  section: string;
  time_limit_minutes: number;
  difficulty: string;
}

interface Answer {
  question_id: string;
  answer_submitted: string | null;
  is_marked: boolean;
  time_spent_seconds: number;
}

export default function StudentBluebookTest() {
  const { attemptId } = useParams();
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showBreak, setShowBreak] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showQuestionDrawer, setShowQuestionDrawer] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const hasShownFiveMinWarning = useRef(false);
  
  // Track calculator snap state for content offset
  const calculatorSnapSide = useCalculatorSnap();

  // Fetch attempt details
  const { data: attempt, isLoading: attemptLoading } = useQuery({
    queryKey: ['bluebook-attempt', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_attempts')
        .select(`
          *,
          test:bluebook_tests(id, name, description)
        `)
        .eq('id', attemptId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!attemptId && !!student
  });

  // Fetch current module
  const { data: currentModule } = useQuery({
    queryKey: ['bluebook-module', attempt?.current_module_id],
    queryFn: async () => {
      if (!attempt?.current_module_id) return null;
      const { data, error } = await supabase
        .from('bluebook_modules')
        .select('*')
        .eq('id', attempt.current_module_id)
        .single();

      if (error) throw error;
      return data as Module;
    },
    enabled: !!attempt?.current_module_id
  });

  // Fetch module questions
  const { data: moduleQuestions, isLoading: questionsLoading } = useQuery({
    queryKey: ['bluebook-module-questions', attempt?.current_module_id],
    queryFn: async () => {
      if (!attempt?.current_module_id) return [];
      const { data, error } = await supabase
        .from('bluebook_module_questions')
        .select(`
          id,
          order_index,
          question:questions(
            id, question_id, question_text, question_image_url,
            question_type, multiple_choice_options, passage_text
          )
        `)
        .eq('module_id', attempt.current_module_id)
        .order('order_index');

      if (error) throw error;
      return data as ModuleQuestion[];
    },
    enabled: !!attempt?.current_module_id
  });

  // Fetch existing answers for this module
  const { data: existingAnswers } = useQuery({
    queryKey: ['bluebook-answers', attemptId, attempt?.current_module_id],
    queryFn: async () => {
      if (!attemptId || !attempt?.current_module_id) return [];
      const { data, error } = await supabase
        .from('bluebook_answers')
        .select('*')
        .eq('attempt_id', attemptId)
        .eq('module_id', attempt.current_module_id);

      if (error) throw error;
      return data;
    },
    enabled: !!attemptId && !!attempt?.current_module_id
  });

  // Initialize answers from existing data
  useEffect(() => {
    if (existingAnswers && moduleQuestions) {
      const answerMap: Record<string, Answer> = {};
      existingAnswers.forEach(a => {
        answerMap[a.question_id!] = {
          question_id: a.question_id!,
          answer_submitted: a.answer_submitted,
          is_marked: a.is_marked || false,
          time_spent_seconds: a.time_spent_seconds || 0
        };
      });
      setAnswers(answerMap);
    }
  }, [existingAnswers, moduleQuestions]);

  // Initialize timer
  useEffect(() => {
    if (currentModule && attempt?.module_started_at) {
      const moduleStartTime = new Date(attempt.module_started_at).getTime();
      const timeLimitMs = currentModule.time_limit_minutes * 60 * 1000;
      const elapsed = Date.now() - moduleStartTime;
      const remaining = Math.max(0, Math.floor((timeLimitMs - elapsed) / 1000));
      setTimeRemaining(remaining);
    }
  }, [currentModule, attempt?.module_started_at]);

  // Timer countdown with 5-minute warning
  useEffect(() => {
    if (timeRemaining === null || isPaused || showBreak) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        
        // Show 5-minute warning
        if (prev === 300 && !hasShownFiveMinWarning.current) {
          hasShownFiveMinWarning.current = true;
          toast.warning('5 minutes remaining!', {
            duration: 5000,
            icon: <Clock className="h-5 w-5 text-amber-500" />,
          });
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isPaused, showBreak]);

  // Handle time expiration - separate effect to avoid stale closure
  useEffect(() => {
    if (timeRemaining === 0 && !isPaused && !showBreak) {
      toast.error('Time is up!', { duration: 3000 });
      handleModuleComplete();
    }
  }, [timeRemaining, isPaused, showBreak]);
  // Reset warning flag when module changes
  useEffect(() => {
    hasShownFiveMinWarning.current = false;
  }, [attempt?.current_module_id]);

  // Save answer mutation
  const saveAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answer, isMarked, timeSpent }: {
      questionId: string;
      answer: string | null;
      isMarked: boolean;
      timeSpent: number;
    }) => {
      const { error } = await supabase
        .from('bluebook_answers')
        .upsert({
          attempt_id: attemptId,
          module_id: attempt?.current_module_id,
          question_id: questionId,
          answer_submitted: answer,
          is_marked: isMarked,
          time_spent_seconds: timeSpent,
          answered_at: new Date().toISOString()
        }, {
          onConflict: 'attempt_id,question_id'
        });

      if (error) throw error;
    }
  });

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const currentAnswer = answers[questionId];
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        answer_submitted: value,
        is_marked: currentAnswer?.is_marked || false,
        time_spent_seconds: (currentAnswer?.time_spent_seconds || 0) + timeSpent
      }
    }));

    saveAnswerMutation.mutate({
      questionId,
      answer: value,
      isMarked: currentAnswer?.is_marked || false,
      timeSpent: (currentAnswer?.time_spent_seconds || 0) + timeSpent
    });

    setQuestionStartTime(Date.now());
  }, [answers, questionStartTime, saveAnswerMutation]);

  const handleToggleMark = useCallback((questionId: string) => {
    const currentAnswer = answers[questionId];
    const newMarked = !currentAnswer?.is_marked;
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        question_id: questionId,
        is_marked: newMarked,
        answer_submitted: currentAnswer?.answer_submitted || null,
        time_spent_seconds: currentAnswer?.time_spent_seconds || 0
      }
    }));

    saveAnswerMutation.mutate({
      questionId,
      answer: currentAnswer?.answer_submitted || null,
      isMarked: newMarked,
      timeSpent: currentAnswer?.time_spent_seconds || 0
    });
  }, [answers, saveAnswerMutation]);

  const handleModuleComplete = async () => {
    if (!attempt) return;

    // Fetch all modules and sort them correctly: RW first (both modules), then Math (both modules)
    const { data: allModules } = await supabase
      .from('bluebook_modules')
      .select('id, module_number, section')
      .eq('test_id', attempt.test_id);

    // Sort modules: reading_writing before math, then by module_number
    const sortedModules = allModules?.sort((a, b) => {
      // reading_writing should come before math
      if (a.section !== b.section) {
        return a.section === 'reading_writing' ? -1 : 1;
      }
      return a.module_number - b.module_number;
    }) || [];

    const currentModuleIndex = sortedModules.findIndex(m => m.id === attempt.current_module_id);
    const nextModule = sortedModules[currentModuleIndex + 1];

    if (nextModule) {
      // Check if we need to show a break (between RW and Math sections)
      const currentSection = currentModule?.section;
      const nextSection = nextModule.section;
      
      if (currentSection === 'reading_writing' && nextSection === 'math') {
        setShowBreak(true);
      } else {
        await moveToNextModule(nextModule.id);
      }
    } else {
      // Complete the test
      await completeTest();
    }
  };

  const moveToNextModule = async (nextModuleId: string) => {
    const { error } = await supabase
      .from('bluebook_attempts')
      .update({
        current_module_id: nextModuleId,
        current_module: (attempt?.current_module || 1) + 1,
        module_started_at: new Date().toISOString()
      })
      .eq('id', attemptId);

    if (error) {
      toast.error('Failed to move to next module');
      return;
    }

    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowBreak(false);
    queryClient.invalidateQueries({ queryKey: ['bluebook-attempt', attemptId] });
    queryClient.invalidateQueries({ queryKey: ['bluebook-module'] });
    queryClient.invalidateQueries({ queryKey: ['bluebook-module-questions'] });
    queryClient.invalidateQueries({ queryKey: ['bluebook-answers'] });
  };

  const completeTest = async () => {
    // Fetch all answers with full question data
    const { data: allAnswers } = await supabase
      .from('bluebook_answers')
      .select(`
        *,
        question:questions(id, question_id, question_text, question_image_url, question_type, multiple_choice_options, passage_text, answer)
      `)
      .eq('attempt_id', attemptId);

    // Get all modules with questions for ordering
    const { data: allModulesData } = await supabase
      .from('bluebook_modules')
      .select(`
        id, 
        section, 
        module_number,
        bluebook_module_questions(order_index, question_id)
      `)
      .eq('test_id', attempt?.test_id);

    let rwCorrect = 0;
    let mathCorrect = 0;
    let rwTotal = 0;
    let mathTotal = 0;

    const moduleMap = new Map(allModulesData?.map(m => [m.id, { section: m.section, module_number: m.module_number }]));
    
    // Create a map for question order within modules
    const questionOrderMap = new Map<string, { module_id: string; order_index: number }>();
    allModulesData?.forEach(m => {
      m.bluebook_module_questions?.forEach((mq: any) => {
        questionOrderMap.set(mq.question_id, { module_id: m.id, order_index: mq.order_index });
      });
    });

    // Build question results
    const questionResults: QuestionResult[] = [];

    allAnswers?.forEach(a => {
      const isCorrect = a.answer_submitted?.toLowerCase() === a.question?.answer?.toLowerCase();
      const moduleInfo = moduleMap.get(a.module_id!);
      const orderInfo = questionOrderMap.get(a.question_id!);
      const section = moduleInfo?.section as 'reading_writing' | 'math';
      
      if (section === 'reading_writing') {
        rwTotal++;
        if (isCorrect) rwCorrect++;
      } else if (section === 'math') {
        mathTotal++;
        if (isCorrect) mathCorrect++;
      }

      if (a.question) {
        questionResults.push({
          id: a.question.id,
          question_id: a.question.question_id,
          question_text: a.question.question_text,
          question_image_url: a.question.question_image_url,
          question_type: a.question.question_type,
          multiple_choice_options: a.question.multiple_choice_options,
          passage_text: a.question.passage_text,
          correct_answer: a.question.answer,
          user_answer: a.answer_submitted,
          is_correct: isCorrect,
          order_index: orderInfo?.order_index || 0,
          section: section,
          module_number: moduleInfo?.module_number || 1
        });
      }
    });

    // Simple scaling (placeholder - real SAT uses equating tables)
    const rwScaled = Math.round(200 + (rwCorrect / Math.max(rwTotal, 54)) * 600);
    const mathScaled = Math.round(200 + (mathCorrect / Math.max(mathTotal, 44)) * 600);
    const totalScore = rwScaled + mathScaled;

    const { error } = await supabase
      .from('bluebook_attempts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        rw_raw_score: rwCorrect,
        math_raw_score: mathCorrect,
        rw_scaled_score: rwScaled,
        math_scaled_score: mathScaled,
        total_score: totalScore
      })
      .eq('id', attemptId);

    if (error) {
      toast.error('Failed to complete test');
      return;
    }

    logActivity('bluebook_test_complete', { attemptId, totalScore });

    // Set results data and show dialog
    setResultsData({
      totalScore,
      rwScaled,
      mathScaled,
      rwRaw: rwCorrect,
      mathRaw: mathCorrect,
      rwTotal,
      mathTotal,
      questions: questionResults
    });
    setShowResultsDialog(true);
  };

  const handleResultsClose = () => {
    setShowResultsDialog(false);
    // Invalidate dashboard caches so scores sync automatically
    queryClient.invalidateQueries({ queryKey: ['student-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['bluebook-attempts'] });
    queryClient.invalidateQueries({ queryKey: ['bluebook-tests'] });
    navigate('/practice/bluebook');
  };

  const handleContinueFromBreak = async () => {
    if (!attempt?.test_id) return;
    
    const { data, error } = await supabase
      .from('bluebook_modules')
      .select('id')
      .eq('test_id', attempt.test_id)
      .eq('section', 'math')
      .eq('module_number', 1)
      .single();

    if (error) {
      console.error('Failed to find math module:', error);
      toast.error('Failed to continue to math section');
      return;
    }

    if (data) {
      await moveToNextModule(data.id);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = moduleQuestions?.[currentQuestionIndex];
  const questionId = currentQuestion?.question?.id;
  const currentAnswer = questionId ? answers[questionId] : null;

  if (attemptLoading || questionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (showBreak) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Pause className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Break Time</h2>
            <p className="text-muted-foreground">
              You've completed the Reading & Writing section. 
              Take a 10-minute break before starting the Math section.
            </p>
            <Button onClick={handleContinueFromBreak} className="w-full gap-2">
              <Play className="h-4 w-4" />
              Continue to Math Section
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Results Dialog */}
      {resultsData && (
        <BluebookResultsDialog 
          open={showResultsDialog} 
          onClose={handleResultsClose} 
          results={resultsData} 
        />
      )}

      {/* Calculator for Math sections */}
      {currentModule?.section === 'math' && <DesmosCalculator />}
      
      {/* Reference Sheet for Math sections */}
      {currentModule?.section === 'math' && <ReferenceSheet />}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left: Exit and Test Info */}
          <div className="flex items-center gap-4 flex-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/practice/bluebook')}
            >
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{attempt?.test?.name}</h1>
              <p className="text-sm text-muted-foreground">
                {currentModule?.section === 'reading_writing' ? 'Reading & Writing' : 'Math'} - 
                Module {currentModule?.module_number}
              </p>
            </div>
          </div>

          {/* Center: Timer */}
          <div className="flex-1 flex justify-center">
            <Badge 
              variant={timeRemaining && timeRemaining < 300 ? 'destructive' : 'secondary'}
              className={cn(
                "gap-1 text-lg px-3 py-1 transition-all",
                timeRemaining !== null && timeRemaining < 60 && "animate-pulse shadow-[0_0_15px_hsl(var(--destructive))]"
              )}
            >
              <Clock className="h-4 w-4" />
              {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
            </Badge>
          </div>

          {/* Right: Calculator, Reference, Settings */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Calculator Button - Only for Math */}
            {currentModule?.section === 'math' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleCalculator()}
                className="gap-2"
              >
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Calculator</span>
              </Button>
            )}

            {/* Reference Button - Only for Math */}
            {currentModule?.section === 'math' && <ReferenceSheetButton />}

            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => {
                  // Save progress
                  toast.success('Progress saved!');
                }}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBreak(true)}>
                  <Coffee className="h-4 w-4 mr-2" />
                  Take a Break
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => navigate('/practice/bluebook')}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Exit Test
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content - Offset when calculator is snapped */}
      <div 
        className={cn(
          "flex-1 overflow-auto pb-20 transition-all duration-300",
          calculatorSnapSide === 'left' && "ml-[40vw]",
          calculatorSnapSide === 'right' && "mr-[40vw]"
        )}
      >
        <main className="p-6">
          {currentQuestion?.question && (
            <div className={cn(
              "space-y-6 transition-all duration-300",
              calculatorSnapSide ? "max-w-2xl mx-auto" : "max-w-4xl mx-auto"
            )}>
              {/* Passage (if any) */}
              {currentQuestion.question.passage_text && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <MathText text={currentQuestion.question.passage_text} />
                  </CardContent>
                </Card>
              )}

              {/* Question */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-3">
                        Question {currentQuestionIndex + 1}
                      </Badge>
                      
                      {/* Question Image */}
                      {currentQuestion.question.question_image_url && (
                        <div className="flex justify-center mb-4">
                          <img 
                            src={currentQuestion.question.question_image_url}
                            alt="Question"
                            className="w-[55%] h-auto rounded-lg"
                          />
                        </div>
                      )}

                      {/* Question Text */}
                      <div className="text-lg">
                        <MathText text={currentQuestion.question.question_text} />
                      </div>
                    </div>

                    {/* Mark for Review */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => questionId && handleToggleMark(questionId)}
                      className={cn(
                        "shrink-0",
                        currentAnswer?.is_marked && "text-amber-500"
                      )}
                    >
                      <Flag className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Answer Options */}
                  <div className="pt-4">
                    {currentQuestion.question.question_type === 'multiple_choice' ? (
                      <RadioGroup
                        value={currentAnswer?.answer_submitted || ''}
                        onValueChange={(value) => questionId && handleAnswerChange(questionId, value)}
                        className="space-y-3"
                      >
                        {(() => {
                          // Parse multiple_choice_options - could be string, array, or object
                          let options: string[] = [];
                          const rawOptions = currentQuestion.question.multiple_choice_options;
                          
                          if (Array.isArray(rawOptions)) {
                            options = rawOptions;
                          } else if (typeof rawOptions === 'string') {
                            try {
                              const parsed = JSON.parse(rawOptions);
                              options = Array.isArray(parsed) ? parsed : [];
                            } catch {
                              options = [];
                            }
                          } else if (rawOptions && typeof rawOptions === 'object') {
                            // Handle object format like {A: "option1", B: "option2"}
                            options = Object.values(rawOptions) as string[];
                          }

                          return options.map((option, idx) => {
                            const optionLetter = String.fromCharCode(65 + idx);
                            return (
                              <Label
                                key={idx}
                                htmlFor={`option-${idx}`}
                                className={cn(
                                  "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                                  currentAnswer?.answer_submitted === optionLetter 
                                    ? "border-primary bg-primary/5" 
                                    : "hover:bg-muted/50"
                                )}
                              >
                                <RadioGroupItem value={optionLetter} id={`option-${idx}`} />
                                <span className="font-medium mr-2">{optionLetter}.</span>
                                <MathText text={option} />
                              </Label>
                            );
                          });
                        })()}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="answer">Your Answer</Label>
                        <Input
                          id="answer"
                          value={currentAnswer?.answer_submitted || ''}
                          onChange={(e) => questionId && handleAnswerChange(questionId, e.target.value)}
                          placeholder="Enter your answer..."
                          className="max-w-xs"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Footer Navigation with Bottom Drawer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-3 z-40">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            size="icon"
            className="h-10 w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* Center: Question counter - opens drawer */}
          <Drawer open={showQuestionDrawer} onOpenChange={setShowQuestionDrawer}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Grid3X3 className="h-4 w-4" />
                <span className="font-medium">
                  Question {currentQuestionIndex + 1} of {moduleQuestions?.length || 0}
                </span>
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[70vh]">
              <DrawerHeader className="border-b">
                <DrawerTitle className="flex items-center justify-between">
                  <span>
                    {currentModule?.section === 'reading_writing' ? 'Reading & Writing' : 'Math'} - 
                    Module {currentModule?.module_number}
                  </span>
                  <div className="flex items-center gap-3 text-sm font-normal">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded-sm bg-primary/20 border border-primary" />
                      <span className="text-muted-foreground">Answered</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded-sm bg-amber-500/20 border border-amber-500" />
                      <span className="text-muted-foreground">For Review</span>
                    </div>
                  </div>
                </DrawerTitle>
              </DrawerHeader>
              
              <ScrollArea className="p-4">
                <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 gap-2">
                  {moduleQuestions?.map((mq, idx) => {
                    const qId = mq.question?.id;
                    const answer = qId ? answers[qId] : null;
                    const isAnswered = !!answer?.answer_submitted;
                    const isMarked = answer?.is_marked;
                    const isCurrent = idx === currentQuestionIndex;

                    return (
                      <Button
                        key={mq.id}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-10 w-10 p-0 text-sm font-medium relative",
                          isCurrent && "ring-2 ring-primary",
                          isAnswered && !isMarked && "bg-primary/20 border-primary",
                          isMarked && "bg-amber-500/20 border-amber-500"
                        )}
                        onClick={() => {
                          setCurrentQuestionIndex(idx);
                          setShowQuestionDrawer(false);
                        }}
                      >
                        {idx + 1}
                        {isMarked && (
                          <Flag className="absolute -top-1 -right-1 h-3 w-3 text-amber-500" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <Button 
                  onClick={() => {
                    setShowQuestionDrawer(false);
                    handleModuleComplete();
                  }}
                  className="w-full gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Go to Review
                </Button>
              </div>
            </DrawerContent>
          </Drawer>

          {currentQuestionIndex === (moduleQuestions?.length || 0) - 1 ? (
            <Button onClick={handleModuleComplete} size="icon" className="h-10 w-10">
              <CheckCircle2 className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => Math.min((moduleQuestions?.length || 0) - 1, prev + 1))}
              size="icon"
              className="h-10 w-10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
