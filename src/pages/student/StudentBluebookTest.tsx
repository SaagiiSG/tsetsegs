import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, Flag, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertCircle, BookOpen, Calculator,
  Pause, Play, X
} from 'lucide-react';
import { toast } from 'sonner';
import { MathText } from '@/components/MathText';
import { DesmosCalculator } from '@/components/student/DesmosCalculator';
import { cn } from '@/lib/utils';

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

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || isPaused || showBreak) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          handleModuleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isPaused, showBreak]);

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
    // Calculate scores
    const { data: allAnswers } = await supabase
      .from('bluebook_answers')
      .select(`
        *,
        question:questions(answer)
      `)
      .eq('attempt_id', attemptId);

    let rwCorrect = 0;
    let mathCorrect = 0;

    // Get module sections
    const { data: modules } = await supabase
      .from('bluebook_modules')
      .select('id, section')
      .eq('test_id', attempt?.test_id);

    const moduleMap = new Map(modules?.map(m => [m.id, m.section]));

    allAnswers?.forEach(a => {
      const isCorrect = a.answer_submitted?.toLowerCase() === a.question?.answer?.toLowerCase();
      const section = moduleMap.get(a.module_id!);
      
      if (isCorrect) {
        if (section === 'reading_writing') rwCorrect++;
        else if (section === 'math') mathCorrect++;
      }
    });

    // Simple scaling (placeholder - real SAT uses equating tables)
    const rwScaled = Math.round(200 + (rwCorrect / 54) * 600);
    const mathScaled = Math.round(200 + (mathCorrect / 44) * 600);
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
    toast.success(`Test completed! Score: ${totalScore}`);
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
      {/* Calculator for Math sections */}
      {currentModule?.section === 'math' && <DesmosCalculator />}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
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

          <div className="flex items-center gap-4">
            {/* Timer */}
            <Badge 
              variant={timeRemaining && timeRemaining < 300 ? 'destructive' : 'secondary'}
              className="gap-1 text-lg px-3 py-1"
            >
              <Clock className="h-4 w-4" />
              {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
            </Badge>

            {/* Question counter */}
            <Badge variant="outline" className="text-sm">
              {currentQuestionIndex + 1} / {moduleQuestions?.length || 0}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Question Navigator - Side Panel */}
        <aside className="hidden md:block w-64 border-r bg-card/50 p-4">
          <h3 className="text-sm font-medium mb-3">Questions</h3>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="grid grid-cols-5 gap-2">
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
                      isAnswered && !isMarked && "bg-green-500/20 border-green-500",
                      isMarked && "bg-amber-500/20 border-amber-500"
                    )}
                    onClick={() => setCurrentQuestionIndex(idx)}
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

          {/* Legend */}
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border bg-green-500/20 border-green-500" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border bg-amber-500/20 border-amber-500" />
              <span>Marked for Review</span>
            </div>
          </div>
        </aside>

        {/* Question Area */}
        <main className="flex-1 p-6 overflow-auto">
          {currentQuestion?.question && (
            <div className="max-w-4xl mx-auto space-y-6">
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
                        <img 
                          src={currentQuestion.question.question_image_url}
                          alt="Question"
                          className="max-w-full h-auto rounded-lg mb-4"
                        />
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
                        {(currentQuestion.question.multiple_choice_options as string[])?.map((option, idx) => {
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
                        })}
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

      {/* Footer Navigation */}
      <footer className="sticky bottom-0 bg-card border-t px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {/* Mobile question indicator */}
          <div className="md:hidden">
            <Badge variant="outline">
              {currentQuestionIndex + 1} / {moduleQuestions?.length || 0}
            </Badge>
          </div>

          {currentQuestionIndex === (moduleQuestions?.length || 0) - 1 ? (
            <Button onClick={handleModuleComplete} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finish Module
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => Math.min((moduleQuestions?.length || 0) - 1, prev + 1))}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
