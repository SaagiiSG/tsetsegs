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
import { ArrowLeft, CheckCircle2, XCircle, Flag, Loader2, Play, ChevronRight } from 'lucide-react';
import { MathText } from '@/components/MathText';

export default function StudentQuestion() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { student, isLoading: authLoading } = useStudentAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  // Fetch original question details
  const { data: question, isLoading: questionLoading } = useQuery({
    queryKey: ['question-detail', questionId],
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
    enabled: !!questionId && !!student
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
    enabled: !!questionId && !!student
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

      return correct;
    },
    onSuccess: (correct) => {
      setSubmitted(true);
      setIsCorrect(correct || false);
      setAttemptCount(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['question-attempts-all'] });
      queryClient.invalidateQueries({ queryKey: ['student-progress'] });
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/practice/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{question.question_id}</Badge>
            <Badge variant="secondary">{question.category?.name}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFlagDialogOpen(true)}>
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </header>

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
              <CardHeader>
                <CardTitle>
                  {practiceQuestions.length > 1 
                    ? `Practice ${currentVariationIndex + 1}` 
                    : `Question ${question.question_id}`
                  }
                </CardTitle>
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
                          submitted && opt === currentQuestion.answer
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
                    {submitted && (
                      <p className={isCorrect ? 'text-green-500' : 'text-red-500'}>
                        Correct answer: {currentQuestion.answer}
                      </p>
                    )}
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
  );
}
