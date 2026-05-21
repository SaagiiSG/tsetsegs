import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle2, XCircle, Flag, Loader2, ChevronDown, ChevronLeft, ChevronRight, BookOpen, Bookmark, RotateCcw } from 'lucide-react';
import { SecurityWrapper } from '@/components/security/SecurityWrapper';
import { QuestionNavigatorDialog, toggleQuestionMark, useMarkedQuestions } from '@/components/student/QuestionNavigatorDialog';
import { updateStudentStreak } from '@/hooks/useStudentStreak';
import { isAcceptedFillBlankAnswer } from '@/lib/utils';
import { useSwipe } from '@/hooks/useSwipe';
import { useHaptics } from '@/hooks/useHaptics';
import { usePracticeRecents } from '@/hooks/usePracticeRecents';
import { ensureSprintEnrollment, getSprintEnrollmentSnapshot, type SprintEnrollmentSnapshot } from '@/lib/sprintEnrollment';
import { SprintEnrollmentDialog } from '@/components/student/SprintEnrollmentDialog';

export default function StudentEnglishQuestion() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { student, logActivity } = useStudentAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const markedQuestions = useMarkedQuestions();
  const isCurrentMarked = questionId ? markedQuestions.has(questionId) : false;
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [enrollmentDialog, setEnrollmentDialog] = useState<{ open: boolean; snapshot: SprintEnrollmentSnapshot | null; pointsEarned: number }>({ open: false, snapshot: null, pointsEarned: 0 });

  useEffect(() => {
    if (student && questionId) {
      logActivity('english_question_view', { question_id: questionId });
    }
  }, [student, questionId]);

  // Fetch bluebook question IDs to exclude
  const { data: bluebookQuestionIds } = useQuery({
    queryKey: ['bluebook-question-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_module_questions')
        .select('question_id');
      if (error) throw error;
      return new Set(data?.map(q => q.question_id) || []);
    },
    enabled: !!student,
    staleTime: 10 * 60 * 1000
  });

  // Fetch all English questions for navigation (excluding bluebook)
  const { data: allQuestions } = useQuery({
    queryKey: ['all-english-questions', bluebookQuestionIds ? 'filtered' : 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_id')
        .eq('is_original', true)
        .eq('is_active', true)
        .eq('subject', 'english')
        .order('question_id');
      
      if (error) throw error;
      
      // Filter out bluebook questions
      if (bluebookQuestionIds && data) {
        return data.filter(q => !bluebookQuestionIds.has(q.id));
      }
      return data;
    },
    enabled: !!student && !!bluebookQuestionIds,
    staleTime: 5 * 60 * 1000
  });

  // Prefetch nearby questions
  useEffect(() => {
    if (!allQuestions || !questionId || !student) return;
    
    const currentIndex = allQuestions.findIndex(q => q.id === questionId);
    if (currentIndex === -1) return;

    const nearbyIds = [];
    for (let i = -2; i <= 2; i++) {
      const idx = currentIndex + i;
      if (idx >= 0 && idx < allQuestions.length && idx !== currentIndex) {
        nearbyIds.push(allQuestions[idx].id);
      }
    }

    nearbyIds.forEach(id => {
      queryClient.prefetchQuery({
        queryKey: ['english-question', id],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('questions')
            .select(`*, category:question_categories(name)`)
            .eq('id', id)
            .single();
          
          if (error) throw error;
          return data;
        },
        staleTime: 5 * 60 * 1000
      });
    });
  }, [allQuestions, questionId, student, queryClient]);

  // Fetch question details
  const { data: question, isLoading: questionLoading } = useQuery({
    queryKey: ['english-question', questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(`*, category:question_categories(name)`)
        .eq('id', questionId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!questionId && !!student,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000
  });

  // Fetch existing attempts
  const { data: existingAttempts } = useQuery({
    queryKey: ['english-question-attempts', questionId, student?.id],
    queryFn: async () => {
      if (!student) return [];
      
      const { data } = await supabase
        .from('student_attempts')
        .select('*')
        .eq('student_account_id', student.id)
        .eq('question_id', questionId)
        .order('attempt_number', { ascending: false });
      
      return data || [];
    },
    enabled: !!student && !!questionId
  });

  useEffect(() => {
    if (existingAttempts?.length) {
      setAttemptCount(existingAttempts[0].attempt_number);
      const correctAttempt = existingAttempts.find(a => a.is_correct);
      if (correctAttempt) {
        setIsCorrect(true);
        setSubmitted(true);
        setSelectedAnswer(correctAttempt.answer_submitted);
      }
    } else {
      setAttemptCount(0);
      setIsCorrect(false);
      setSubmitted(false);
      setSelectedAnswer(null);
    }
    setStartTime(Date.now());
    setShowExplanation(false);
  }, [questionId, existingAttempts]);

  const submitMutation = useMutation({
    mutationFn: async ({ answer, questionId }: { answer: string; questionId: string }) => {
      if (!student || !question) throw new Error('Not authenticated');
      
      const correct = question.question_type === 'fill_blank'
        ? isAcceptedFillBlankAnswer(answer, question.answer, question.alternate_answers as string[] | null)
        : answer.trim().toUpperCase() === question.answer.trim().toUpperCase();
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      const attemptNumber = attemptCount + 1;
      
      const { error } = await supabase
        .from('student_attempts')
        .insert({
          student_account_id: student.id,
          question_id: questionId,
          attempt_number: attemptNumber,
          answer_submitted: answer,
          is_correct: correct,
          time_spent_seconds: timeSpent
        });
      
      if (error) throw error;
      
      logActivity('english_question_attempt', {
        question_id: questionId,
        answer,
        is_correct: correct,
        attempt_number: attemptNumber
      });

      // Award points for correct answers
      let enrollmentSnapshot: SprintEnrollmentSnapshot | null = null;
      let pointsAwarded = 0;
      if (correct) {
        const points = attemptNumber === 1 ? 10 : attemptNumber === 2 ? 5 : 2;
        pointsAwarded = points;

        // Get active sprint (optional - points are awarded regardless)
        const { data: activeSprint } = await supabase
          .from('sprints')
          .select('id')
          .eq('is_active', true)
          .maybeSingle();

        // Always insert point transaction (with or without sprint)
        await supabase
          .from('point_transactions')
          .insert({
            student_account_id: student.id,
            sprint_id: activeSprint?.id || null,
            points,
            category: 'questions',
            metadata: { question_id: questionId, attempt_number: attemptNumber, subject: 'english' }
          });

        // Update sprint ranking only if there's an active sprint.
        // First-correct-answer-of-the-sprint enrolls the student.
        if (activeSprint) {
          const { ranking, wasNewlyEnrolled } = await ensureSprintEnrollment(student.id, activeSprint.id);

          if (ranking) {
            await supabase
              .from('student_sprint_rankings')
              .update({
                total_points: (ranking.total_points || 0) + points,
                updated_at: new Date().toISOString()
              })
              .eq('id', ranking.id);
          }

          if (wasNewlyEnrolled) {
            enrollmentSnapshot = await getSprintEnrollmentSnapshot(student.id, activeSprint.id);
          }
        }
      }

      // Update study streak (fire-and-forget)
      updateStudentStreak(student.id).catch(() => {});

      return { correct, enrollmentSnapshot, pointsAwarded };
    },
    onSuccess: ({ correct, enrollmentSnapshot, pointsAwarded }) => {
      setIsCorrect(correct);
      setSubmitted(true);
      setAttemptCount(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['english-question-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['student-english-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sprint-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['total-points'] });
      queryClient.invalidateQueries({ queryKey: ['activity-heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['performance-stats'] });
      if (enrollmentSnapshot) {
        setEnrollmentDialog({ open: true, snapshot: enrollmentSnapshot, pointsEarned: pointsAwarded });
      }
    }
  });

  const flagMutation = useMutation({
    mutationFn: async () => {
      if (!student || !questionId) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('question_flags')
        .insert({
          question_id: questionId,
          student_account_id: student.id,
          flag_reason: flagReason
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Question flagged', description: 'An admin will review this question.' });
      setFlagDialogOpen(false);
      setFlagReason('');
    }
  });

  const handleSubmit = () => {
    if (!selectedAnswer || !questionId) return;
    submitMutation.mutate({ answer: selectedAnswer, questionId });
  };

  const handleTryAgain = () => {
    setSubmitted(false);
    setSelectedAnswer(null);
    setStartTime(Date.now());
  };

  // Navigation
  const currentQuestionIndex = allQuestions?.findIndex(q => q.id === questionId) ?? -1;
  const prevQuestion = currentQuestionIndex > 0 ? allQuestions?.[currentQuestionIndex - 1] : null;
  const nextQuestion = currentQuestionIndex >= 0 && currentQuestionIndex < (allQuestions?.length ?? 0) - 1 
    ? allQuestions?.[currentQuestionIndex + 1] 
    : null;

  const options = question?.multiple_choice_options as Record<string, string> | null;

  // ---------- iOS-style gestures + recents ----------
  const haptics = useHaptics();
  const { recordQuestion } = usePracticeRecents();
  useEffect(() => {
    if (questionId && question) {
      recordQuestion(questionId, String((question as any).question_id || 'English'));
    }
  }, [questionId, question, recordQuestion]);
  useSwipe({
    onSwipeLeft: () => {
      if (nextQuestion) {
        haptics('light');
        navigate(`/practice/english/question/${nextQuestion.id}`);
      }
    },
    onSwipeRight: () => {
      if (prevQuestion) {
        haptics('light');
        navigate(`/practice/english/question/${prevQuestion.id}`);
      }
    },
    threshold: 70,
    maxPerpendicular: 60,
  });
  // ---------------------------------------------------

  if (questionLoading && !question) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="p-6 text-center">
        <p>Question not found</p>
        <Button className="mt-4" onClick={() => navigate('/practice/english')}>
          Back to English Practice
        </Button>
      </div>
    );
  }

  return (
    <SecurityWrapper>
      <div className="min-h-screen bg-background pb-24 select-none">
        {/* Header */}
        <header className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10 p-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate('/practice/english')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">{question.question_id}</Badge>
              <Badge variant="secondary">{question.category?.name}</Badge>
              {allQuestions && (
                <span className="text-xs text-muted-foreground">
                  ({currentQuestionIndex + 1}/{allQuestions.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => questionId && toggleQuestionMark(questionId)}
                className={isCurrentMarked ? 'text-yellow-500' : 'text-muted-foreground'}
              >
                <Bookmark className={`h-4 w-4 ${isCurrentMarked ? 'fill-yellow-500' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setFlagDialogOpen(true)}>
                <Flag className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Question Navigator - positioned at bottom left */}
        <div className="fixed bottom-6 left-4 z-20">
          <QuestionNavigatorDialog 
            currentQuestionId={questionId || ''} 
            questionSet={question?.question_set}
            subject="english"
          />
        </div>

        {/* Prev/Next Navigation - centered */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-background/90 backdrop-blur-sm p-2 rounded-full shadow-lg border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => prevQuestion && navigate(`/practice/english/question/${prevQuestion.id}`)}
            disabled={!prevQuestion}
            className="rounded-full"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => nextQuestion && navigate(`/practice/english/question/${nextQuestion.id}`)}
            disabled={!nextQuestion}
            className="rounded-full"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
          {/* Passage */}
          {question.passage_text && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Reading Passage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[300px]">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {question.passage_text}
                  </p>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Question */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-base leading-relaxed">{question.question_text}</p>
              
              {options && (
                <RadioGroup
                  value={selectedAnswer || ''}
                  onValueChange={setSelectedAnswer}
                  disabled={submitted && isCorrect}
                  className="space-y-3"
                >
                  {Object.entries(options).map(([key, value]) => {
                    const isSelected = selectedAnswer === key;
                    const isAnswer = key === question.answer;
                    
                    let bgClass = '';
                    if (submitted) {
                      if (isSelected && isCorrect) bgClass = 'bg-green-500/10 border-green-500';
                      else if (isSelected && !isCorrect) bgClass = 'bg-red-500/10 border-red-500';
                    }
                    
                    return (
                      <div 
                        key={key}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${bgClass} ${
                          !submitted ? 'hover:bg-muted/50 cursor-pointer' : ''
                        }`}
                        onClick={() => !submitted && setSelectedAnswer(key)}
                      >
                        <RadioGroupItem value={key} id={key} className="mt-0.5" />
                        <Label htmlFor={key} className="flex-1 cursor-pointer">
                          <span className="font-medium mr-2">{key}.</span>
                          {value}
                        </Label>
                        {submitted && isSelected && (
                          isCorrect ? 
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" /> :
                            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
              )}

              {/* Submit / Try Again */}
              <div className="flex gap-3 pt-4">
                {!submitted ? (
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!selectedAnswer || submitMutation.isPending}
                    className="flex-1"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Submit Answer
                  </Button>
                ) : (
                  <>
                    {!isCorrect && attemptCount < 3 && (
                      <Button onClick={handleTryAgain} variant="outline" className="flex-1">
                        Try Again ({3 - attemptCount} left)
                      </Button>
                    )}
                    {isCorrect && (
                      <Button onClick={() => { setSubmitted(false); setIsCorrect(false); setSelectedAnswer(null); }} variant="outline" className="flex-1 gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Practice Again
                      </Button>
                    )}
                    <Button 
                      onClick={() => nextQuestion && navigate(`/practice/english/question/${nextQuestion.id}`)}
                      disabled={!nextQuestion}
                      className="flex-1"
                    >
                      Next Question
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </>
                )}
              </div>

              {/* Attempt status */}
              {attemptCount > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Attempts: {attemptCount}/3 • {isCorrect ? '✓ Correct!' : 'Keep trying!'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Explanation */}
          {submitted && question.rationale && (
            <Collapsible open={showExplanation} onOpenChange={setShowExplanation}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Explanation</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showExplanation ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {question.rationale}
                    </p>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </main>

        {/* Flag Dialog */}
        <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report a Problem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Is there an issue with this question? Let us know.
              </p>
              <Textarea
                placeholder="Describe the problem..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => flagMutation.mutate()} 
                disabled={!flagReason.trim() || flagMutation.isPending}
              >
                {flagMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SecurityWrapper>
  );
}
