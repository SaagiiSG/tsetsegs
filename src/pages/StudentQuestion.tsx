import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle2, XCircle, Flag, Loader2, Play, ChevronRight, ChevronLeft, Calculator, Bookmark } from 'lucide-react';
import { MathText } from '@/components/MathText';
import { SecurityWrapper } from '@/components/security/SecurityWrapper';
import { DesmosCalculator, useCalculatorSnap, toggleCalculator } from '@/components/student/DesmosCalculator';
import { QuestionNavigatorDialog, toggleQuestionMark, useMarkedQuestions } from '@/components/student/QuestionNavigatorDialog';

// SM-2 spaced repetition algorithm helper
const calculateNextReview = (quality: number, easeFactor: number, interval: number) => {
  // quality: 0-2 = wrong, 3 = barely correct, 4-5 = correct
  let newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEF = Math.max(1.3, newEF);
  
  let newInterval: number;
  if (quality < 3) {
    newInterval = 1; // Reset to 1 day
  } else {
    if (interval === 0) newInterval = 1;
    else if (interval === 1) newInterval = 6;
    else newInterval = Math.round(interval * newEF);
  }
  
  return { newEF, newInterval };
};

export default function StudentQuestion() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { student, isLoading: authLoading, logActivity } = useStudentAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const calculatorSnapSide = useCalculatorSnap();
  const markedQuestions = useMarkedQuestions();
  const isCurrentMarked = questionId ? markedQuestions.has(questionId) : false;
  
  const [videoWatched, setVideoWatched] = useState(false);
  const [currentVariationIndex, setCurrentVariationIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [fillAnswer, setFillAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  // Security: Prevent screenshots
  useEffect(() => {
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    // Log question view
    if (student && questionId) {
      logActivity('question_view', { question_id: questionId });
    }

    return () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [student, questionId]);

  // Fetch all practice questions for navigation
  const { data: allQuestions } = useQuery({
    queryKey: ['all-practice-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_id')
        .eq('is_original', true)
        .eq('is_active', true)
        .order('question_id');
      
      if (error) throw error;
      return data;
    },
    enabled: !!student,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Prefetch nearby questions for smooth navigation
  useEffect(() => {
    if (!allQuestions || !questionId || !student) return;
    
    const currentIndex = allQuestions.findIndex(q => q.id === questionId);
    if (currentIndex === -1) return;

    // Get 2 questions before and 2 after current
    const nearbyIds = [];
    for (let i = -2; i <= 2; i++) {
      const idx = currentIndex + i;
      if (idx >= 0 && idx < allQuestions.length && idx !== currentIndex) {
        nearbyIds.push(allQuestions[idx].id);
      }
    }

    // Prefetch each nearby question
    nearbyIds.forEach(id => {
      queryClient.prefetchQuery({
        queryKey: ['question', id],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('questions')
            .select(`
              *,
              category:question_categories(name)
            `)
            .eq('id', id)
            .eq('is_original', true)
            .single();
          
          if (error) throw error;
          return data;
        },
        staleTime: 5 * 60 * 1000
      });
    });
  }, [allQuestions, questionId, student, queryClient]);

  // Fetch original question details
  const { data: question, isLoading: questionLoading, isPlaceholderData } = useQuery({
    queryKey: ['question', questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          category:question_categories(name)
        `)
        .eq('id', questionId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!questionId && !!student,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000
  });

  // Fetch variations for this question
  const { data: variations } = useQuery({
    queryKey: ['question-variations', questionId],
    queryFn: async () => {
      // Get approved variations that are children of this original question
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('parent_question_id', questionId)
        .eq('is_active', true)
        .order('created_at');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!questionId && !!student,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000
  });

  // Fetch existing progress
  const { data: existingProgress } = useQuery({
    queryKey: ['question-progress', questionId, student?.id],
    queryFn: async () => {
      if (!student) return null;
      
      const { data } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_account_id', student.id)
        .eq('question_id', questionId)
        .single();
      
      return data;
    },
    enabled: !!questionId && !!student
  });

  // Fetch existing attempts for all variations
  const { data: existingAttempts } = useQuery({
    queryKey: ['question-attempts-all', questionId, student?.id],
    queryFn: async () => {
      if (!student || !variations) return {};
      
      const variationIds = [questionId, ...variations.map(v => v.id)];
      const { data } = await supabase
        .from('student_attempts')
        .select('*')
        .eq('student_account_id', student.id)
        .in('question_id', variationIds)
        .order('attempt_number');
      
      // Group by question_id
      const grouped: Record<string, any[]> = {};
      data?.forEach(a => {
        if (!grouped[a.question_id]) grouped[a.question_id] = [];
        grouped[a.question_id].push(a);
      });
      return grouped;
    },
    enabled: !!questionId && !!student && !!variations
  });

  // Questions to practice (variations if available, otherwise original)
  const practiceQuestions = variations && variations.length > 0 
    ? variations 
    : question ? [question] : [];

  const currentQuestion = practiceQuestions[currentVariationIndex];
  const currentAttempts = currentQuestion ? (existingAttempts?.[currentQuestion.id] || []) : [];

  useEffect(() => {
    if (existingProgress?.video_watched) {
      setVideoWatched(true);
    }
  }, [existingProgress]);

  useEffect(() => {
    // Reset state when variation changes
    const attempts = currentQuestion ? (existingAttempts?.[currentQuestion.id] || []) : [];
    setAttemptCount(attempts.length);
    const correct = attempts.find(a => a.is_correct);
    if (correct) {
      setSubmitted(true);
      setIsCorrect(true);
    } else {
      setSubmitted(false);
      setIsCorrect(false);
    }
    setSelectedAnswer(null);
    setFillAnswer('');
    setStartTime(Date.now());
  }, [currentVariationIndex, currentQuestion?.id, existingAttempts]);

  // Mark video as watched mutation
  const markVideoWatchedMutation = useMutation({
    mutationFn: async () => {
      if (!student || !questionId) return;
      
      await supabase
        .from('student_progress')
        .upsert({
          student_account_id: student.id,
          question_id: questionId,
          video_watched: true,
          video_watched_at: new Date().toISOString(),
        }, {
          onConflict: 'student_account_id,question_id'
        });

      // Log activity
      logActivity('video_watch', { question_id: questionId });
    },
    onSuccess: () => {
      setVideoWatched(true);
      queryClient.invalidateQueries({ queryKey: ['student-progress'] });
    }
  });

  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async (answer: string) => {
      if (!student || !currentQuestion) return;
      
      const correct = answer.toUpperCase() === currentQuestion.answer.toUpperCase();
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      await supabase
        .from('student_attempts')
        .insert({
          student_account_id: student.id,
          question_id: currentQuestion.id,
          attempt_number: currentAttempts.length + 1,
          answer_submitted: answer,
          is_correct: correct,
          time_spent_seconds: timeSpent,
        });

      // Log activity
      logActivity('question_attempt', {
        question_id: currentQuestion.id,
        is_correct: correct,
        attempt_number: currentAttempts.length + 1,
        time_spent: timeSpent
      });

      // Add to spaced repetition queue if incorrect
      if (!correct && questionId) {
        const { data: existing } = await supabase
          .from('student_review_queue')
          .select('*')
          .eq('student_account_id', student.id)
          .eq('question_id', questionId)
          .maybeSingle();

        if (existing) {
          // Update existing review item with SM-2 algorithm
          const { newEF, newInterval } = calculateNextReview(
            0, // quality 0 for wrong answer
            Number(existing.ease_factor) || 2.5,
            existing.interval_days || 1
          );
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + newInterval);

          await supabase
            .from('student_review_queue')
            .update({
              next_review_at: nextReview.toISOString(),
              ease_factor: newEF,
              interval_days: newInterval,
              review_count: (existing.review_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          // Create new review item
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + 1); // First review after 1 day

          await supabase
            .from('student_review_queue')
            .insert({
              student_account_id: student.id,
              question_id: questionId,
              next_review_at: nextReview.toISOString(),
              ease_factor: 2.5,
              interval_days: 1,
              review_count: 1
            });
        }
      } else if (correct && questionId) {
        // Remove from review queue if correct (or update with longer interval)
        const { data: existing } = await supabase
          .from('student_review_queue')
          .select('*')
          .eq('student_account_id', student.id)
          .eq('question_id', questionId)
          .maybeSingle();

        if (existing) {
          const { newEF, newInterval } = calculateNextReview(
            5, // quality 5 for correct
            Number(existing.ease_factor) || 2.5,
            existing.interval_days || 1
          );
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + newInterval);

          await supabase
            .from('student_review_queue')
            .update({
              next_review_at: nextReview.toISOString(),
              ease_factor: newEF,
              interval_days: newInterval,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        }
      }

      return correct;
    },
    onSuccess: (correct) => {
      setSubmitted(true);
      setIsCorrect(correct || false);
      setAttemptCount(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['question-attempts-all'] });
      queryClient.invalidateQueries({ queryKey: ['student-progress'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Flag question mutation
  const flagMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!student || !questionId) return;
      
      await supabase
        .from('question_flags')
        .upsert({
          student_account_id: student.id,
          question_id: questionId,
          flag_reason: reason || null,
          flagged_at: new Date().toISOString(),
        }, {
          onConflict: 'question_id,student_account_id'
        });
    },
    onSuccess: () => {
      toast({ title: 'Question flagged', description: 'Thank you for your feedback!' });
      setFlagDialogOpen(false);
      setFlagReason('');
    }
  });

  const handleSubmit = () => {
    if (currentAttempts.length >= 3) {
      toast({
        title: 'Maximum attempts reached',
        description: 'You have used all 3 attempts for this variation',
        variant: 'destructive'
      });
      return;
    }

    const answer = currentQuestion?.question_type === 'multiple_choice' 
      ? selectedAnswer 
      : fillAnswer;

    if (!answer) {
      toast({
        title: 'Please select an answer',
        variant: 'destructive'
      });
      return;
    }

    submitAnswerMutation.mutate(answer);
  };

  const handleTryAgain = () => {
    setSubmitted(false);
    setSelectedAnswer(null);
    setFillAnswer('');
    setStartTime(Date.now());
  };

  const handleNextVariation = () => {
    if (currentVariationIndex < practiceQuestions.length - 1) {
      setCurrentVariationIndex(prev => prev + 1);
    }
  };

  // Question navigation
  const currentQuestionIndex = allQuestions?.findIndex(q => q.id === questionId) ?? -1;
  const prevQuestion = currentQuestionIndex > 0 ? allQuestions?.[currentQuestionIndex - 1] : null;
  const nextQuestion = currentQuestionIndex >= 0 && currentQuestionIndex < (allQuestions?.length ?? 0) - 1 
    ? allQuestions?.[currentQuestionIndex + 1] 
    : null;

  const handlePrevQuestion = () => {
    if (prevQuestion) {
      navigate(`/practice/question/${prevQuestion.id}`);
    }
  };

  const handleNextQuestion = () => {
    if (nextQuestion) {
      navigate(`/practice/question/${nextQuestion.id}`);
    }
  };

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  if (authLoading || questionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return <Navigate to="/practice" replace />;
  }

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p>Question not found</p>
            <Button className="mt-4" onClick={() => navigate('/practice/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const videoId = question.video_url ? getYouTubeId(question.video_url) : null;
  const options = currentQuestion?.multiple_choice_options as Record<string, string> | null;
  const completedVariations = practiceQuestions.filter(q => 
    existingAttempts?.[q.id]?.some(a => a.is_correct)
  ).length;

  return (
    <SecurityWrapper>
      <DesmosCalculator />
      <div 
        className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 transition-all duration-300"
        style={{ 
          marginLeft: calculatorSnapSide === 'left' ? '40vw' : 0,
          marginRight: calculatorSnapSide === 'right' ? '40vw' : 0,
          width: calculatorSnapSide ? '60vw' : '100%'
        }}
      >
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/practice/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
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
              <Button variant="ghost" size="sm" onClick={() => toggleCalculator()}>
                <Calculator className="h-4 w-4" />
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
            subject={question?.subject || 'math'}
          />
        </div>

        {/* Prev/Next Navigation - centered */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-background/90 backdrop-blur-sm p-2 rounded-full shadow-lg border">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevQuestion}
            disabled={!prevQuestion}
            className="rounded-full"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextQuestion}
            disabled={!nextQuestion}
            className="rounded-full"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
          {/* Video Section */}
          {videoId && !videoWatched && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Watch the lesson first
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => markVideoWatchedMutation.mutate()}
                >
                  I've watched the video - Start Practice
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Practice Section */}
          {(videoWatched || !videoId) && currentQuestion && (
            <>
              {/* Progress indicator */}
              {practiceQuestions.length > 1 && (
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Variation {currentVariationIndex + 1} of {practiceQuestions.length}</span>
                      <span>{completedVariations}/{practiceQuestions.length} completed</span>
                    </div>
                    <Progress value={(completedVariations / practiceQuestions.length) * 100} />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>
                    {practiceQuestions.length > 1 
                      ? `Practice ${currentVariationIndex + 1}` 
                      : `Question ${question.question_id}`
                    }
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => questionId && toggleQuestionMark(questionId)}
                    className={isCurrentMarked ? 'text-yellow-500' : 'text-muted-foreground'}
                  >
                    <Bookmark className={`h-5 w-5 ${isCurrentMarked ? 'fill-yellow-500' : ''}`} />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Question Text */}
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-lg">
                      <MathText text={currentQuestion.question_text} />
                    </p>
                  </div>

                  {/* Question Image */}
                  {currentQuestion.question_image_url && (
                    <img 
                      src={currentQuestion.question_image_url} 
                      alt="Question" 
                      className="max-w-full rounded-lg border"
                    />
                  )}

                  {/* Multiple Choice Options */}
                  {currentQuestion.question_type === 'multiple_choice' && options && (
                    <div className="space-y-3">
                      {['A', 'B', 'C', 'D'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => !submitted && setSelectedAnswer(opt)}
                          disabled={submitted}
                          className={`w-full p-4 rounded-lg border text-left transition-all ${
                            submitted && opt === selectedAnswer && isCorrect
                              ? 'border-green-500 bg-green-500/10'
                              : submitted && opt === selectedAnswer && !isCorrect
                              ? 'border-red-500 bg-red-500/10'
                              : selectedAnswer === opt
                              ? 'border-primary bg-primary/10'
                              : 'hover:border-primary/50'
                          }`}
                        >
                          <span className="font-medium mr-3">{opt}.</span>
                          <MathText text={options[opt]} />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Fill in the Blank */}
                  {currentQuestion.question_type === 'fill_blank' && (
                    <div className="space-y-3">
                      <Input
                        value={fillAnswer}
                        onChange={(e) => setFillAnswer(e.target.value)}
                        placeholder="Type your answer..."
                        disabled={submitted}
                        className="text-lg"
                      />
                    </div>
                  )}

                  {/* Result */}
                  {submitted && (
                    <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                            <span className="text-green-500 font-medium">Correct!</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-6 w-6 text-red-500" />
                            <span className="text-red-500 font-medium">
                              Incorrect. {attemptCount < 3 ? 'Try again!' : 'Review the video for help.'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    {!submitted ? (
                      <Button 
                        className="flex-1" 
                        onClick={handleSubmit}
                        disabled={submitAnswerMutation.isPending || (!selectedAnswer && !fillAnswer)}
                      >
                        {submitAnswerMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Submit Answer ({attemptCount}/3 attempts)
                      </Button>
                    ) : !isCorrect && attemptCount < 3 ? (
                      <Button className="flex-1" onClick={handleTryAgain}>
                        Try Again ({attemptCount}/3 attempts)
                      </Button>
                    ) : currentVariationIndex < practiceQuestions.length - 1 ? (
                      <Button className="flex-1" onClick={handleNextVariation}>
                        Next Variation
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button 
                        className="flex-1" 
                        onClick={() => navigate('/practice/dashboard')}
                      >
                        Back to Questions
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
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
                Found an error or have feedback about this question? Let us know!
              </p>
              <Textarea
                placeholder="Describe the issue (optional)..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => flagMutation.mutate(flagReason)} disabled={flagMutation.isPending}>
                {flagMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Flag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SecurityWrapper>
  );
}
