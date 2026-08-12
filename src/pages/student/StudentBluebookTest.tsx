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
import { QuestionFigures } from "@/components/QuestionFigures";
import { DesmosCalculator, toggleCalculator, useCalculatorSnap } from '@/components/student/DesmosCalculator';
import { ReferenceSheet, ReferenceSheetButton } from '@/components/student/ReferenceSheet';
import { BluebookResultsDialog } from '@/components/student/BluebookResultsDialog';
import { cn } from '@/lib/utils';
import {
  buildBluebookResults,
  normaliseChoices,
  type BluebookResultsData,
} from '@/lib/bluebookReview';

import { setDesmosContext, clearDesmosContext } from '@/lib/desmosTracking';


type ResultsData = BluebookResultsData;


interface Question {
  id: string;
  question_id: string;
  question_text: string;
  question_image_url: string | null;
  question_image_url_2: string | null;
  question_type: string;
  multiple_choice_options: any;
  choice_images: any;
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
            id, question_id, question_text, question_image_url, question_image_url_2,
            question_type, multiple_choice_options, choice_images, passage_text
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
    if (!attemptId || !attempt?.test_id) return;

    // Build results from the test's module question list so skipped questions
    // still count against the section totals and appear in the review.
    const results = await buildBluebookResults(attemptId, attempt.test_id);

    const { error } = await supabase
      .from('bluebook_attempts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        rw_raw_score: results.rwRaw,
        math_raw_score: results.mathRaw,
        rw_scaled_score: results.rwScaled,
        math_scaled_score: results.mathScaled,
        total_score: results.totalScore
      })
      .eq('id', attemptId);

    if (error) {
      toast.error('Failed to complete test');
      return;
    }

    logActivity('bluebook_test_complete', { attemptId, totalScore: results.totalScore });

    setResultsData(results);
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

  // Track Desmos calculator usage context (math modules only)
  useEffect(() => {
    if (!questionId || currentModule?.section !== 'math') return;
    setDesmosContext({ questionId, context: 'bluebook' });
    return () => clearDesmosContext();
  }, [questionId, currentModule?.section]);

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
      <header className="sticky top-0 z-50 bg-card border-b px-2 py-1.5 md:px-4 md:py-3">
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
          {/* Left: Exit and Test Info */}
          <div className="flex items-center gap-1 md:gap-4 flex-1 min-w-0">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-11 w-11 md:h-10 md:w-10 shrink-0"
              onClick={() => navigate('/practice/bluebook')}
            >
              <X className="h-5 w-5" />
            </Button>
            {/* Title is hidden on phones — the module label lives in the question drawer */}
            <div className="hidden md:block min-w-0">
              <h1 className="font-semibold truncate">{attempt?.test?.name}</h1>
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
                "gap-1 text-base md:text-lg px-2.5 md:px-3 py-1 tabular-nums transition-all",
                timeRemaining !== null && timeRemaining < 60 && "animate-pulse shadow-[0_0_15px_hsl(var(--destructive))]"
              )}
            >
              <Clock className="h-4 w-4" />
              {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
            </Badge>
          </div>


          {/* Right: Calculator, Reference, Settings */}
          <div className="flex items-center gap-1 md:gap-2 flex-1 justify-end">
            {/* Calculator Button - Only for Math */}
            {currentModule?.section === 'math' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleCalculator()}
                className="gap-2 h-11 w-11 p-0 md:h-9 md:w-auto md:px-3"
                aria-label="Calculator"
              >
                <Calculator className="h-4 w-4" />
                <span className="hidden md:inline">Calculator</span>
              </Button>
            )}

            {/* Reference Button - Only for Math */}
            {currentModule?.section === 'math' && <ReferenceSheetButton />}

            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11 md:h-10 md:w-10">
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
          "flex-1 overflow-auto pb-[max(5rem,calc(4.5rem+env(safe-area-inset-bottom)))] transition-all duration-300",
          calculatorSnapSide === 'left' && "ml-[40vw]",
          calculatorSnapSide === 'right' && "mr-[40vw]"
        )}
      >
        <main className="px-2.5 py-3 md:p-6">
          {currentQuestion?.question && (
            <div className={cn(
              "space-y-3 md:space-y-6 transition-all duration-300",
              calculatorSnapSide ? "max-w-2xl mx-auto" : "max-w-4xl mx-auto"
            )}>
              {/* Passage (if any) */}
              {currentQuestion.question.passage_text && (
                <Card className="bg-muted/30">
                  <CardContent className="p-3 md:p-4">
                    <MathText text={currentQuestion.question.passage_text} />
                  </CardContent>
                </Card>
              )}

              {/* Question */}
              <Card>
                <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
                  <div className="flex items-start justify-between gap-2 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <Badge variant="outline" className="mb-2 md:mb-3">
                        Question {currentQuestionIndex + 1}
                      </Badge>
                      

                      
                      {/* Question Image */}
                      <QuestionFigures
                        url1={currentQuestion.question.question_image_url}
                        url2={currentQuestion.question.question_image_url_2}
                        className="mb-3 md:mb-4"
                        imgClassName={
                          currentQuestion.question.question_image_url_2
                            ? "max-h-56 md:max-h-72 w-auto rounded-lg"
                            : "w-full sm:w-[55%] h-auto rounded-lg"
                        }
                      />

                      {/* Question Text */}
                      <div className="text-base md:text-lg">
                        <MathText text={currentQuestion.question.question_text} />
                      </div>
                    </div>

                    {/* Mark for Review */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => questionId && handleToggleMark(questionId)}
                      className={cn(
                        "shrink-0 h-11 w-11",
                        currentAnswer?.is_marked && "text-amber-500"
                      )}
                    >
                      <Flag className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Answer Options */}
                  <div className="pt-1 md:pt-4">

                    {currentQuestion.question.question_type === 'multiple_choice' ? (
                      <RadioGroup
                        value={currentAnswer?.answer_submitted || ''}
                        onValueChange={(value) => questionId && handleAnswerChange(questionId, value)}
                        className="space-y-3"
                      >
                        {normaliseChoices(
                          currentQuestion.question.multiple_choice_options,
                          (currentQuestion.question as any).choice_images,
                        ).map(({ letter, text, image }) => (
                          <Label
                            key={letter}
                            htmlFor={`option-${letter}`}
                            className={cn(
                              "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                              currentAnswer?.answer_submitted === letter
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <RadioGroupItem value={letter} id={`option-${letter}`} />
                            <span className="font-medium mr-2">{letter}.</span>
                            <span className="flex-1 min-w-0">
                              {text ? <MathText text={text} /> : null}
                              {image && (
                                <img
                                  src={image}
                                  alt={`Answer choice ${letter}`}
                                  loading="lazy"
                                  className={cn(
                                    "max-h-40 w-auto rounded-md border bg-background object-contain",
                                    text && "mt-2"
                                  )}
                                />
                              )}
                            </span>
                          </Label>
                        ))}
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
