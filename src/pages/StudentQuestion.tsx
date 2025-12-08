import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle2, XCircle, Flag, Loader2, Play } from 'lucide-react';

export default function StudentQuestion() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { student, isLoading: authLoading } = useStudentAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [videoWatched, setVideoWatched] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [fillAnswer, setFillAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const playerRef = useRef<any>(null);

  // Fetch question details
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

  // Fetch existing attempts
  const { data: existingAttempts } = useQuery({
    queryKey: ['question-attempts', questionId, student?.id],
    queryFn: async () => {
      if (!student) return [];
      
      const { data } = await supabase
        .from('student_attempts')
        .select('*')
        .eq('student_account_id', student.id)
        .eq('question_id', questionId)
        .order('attempt_number');
      
      return data || [];
    },
    enabled: !!questionId && !!student
  });

  useEffect(() => {
    if (existingProgress?.video_watched) {
      setVideoWatched(true);
    }
    if (existingAttempts) {
      setAttemptCount(existingAttempts.length);
      const lastCorrect = existingAttempts.find(a => a.is_correct);
      if (lastCorrect) {
        setSubmitted(true);
        setIsCorrect(true);
      }
    }
  }, [existingProgress, existingAttempts]);

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
      if (!student || !questionId || !question) return;
      
      const correct = answer.toUpperCase() === question.answer.toUpperCase();
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      await supabase
        .from('student_attempts')
        .insert({
          student_account_id: student.id,
          question_id: questionId,
          attempt_number: attemptCount + 1,
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
      queryClient.invalidateQueries({ queryKey: ['student-attempts'] });
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
    mutationFn: async () => {
      if (!student || !questionId) return;
      
      await supabase
        .from('question_flags')
        .upsert({
          student_account_id: student.id,
          question_id: questionId,
          flagged_at: new Date().toISOString(),
        }, {
          onConflict: 'question_id,student_account_id'
        });
    },
    onSuccess: () => {
      toast({ title: 'Question flagged', description: 'Thank you for your feedback!' });
    }
  });

  const handleSubmit = () => {
    if (attemptCount >= 3) {
      toast({
        title: 'Maximum attempts reached',
        description: 'You have used all 3 attempts for this question',
        variant: 'destructive'
      });
      return;
    }

    const answer = question?.question_type === 'multiple_choice' 
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
  const options = question.multiple_choice_options as Record<string, string> | null;

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
          <Button variant="ghost" size="sm" onClick={() => flagMutation.mutate()}>
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

        {/* Question Section */}
        {(videoWatched || !videoId) && (
          <Card>
            <CardHeader>
              <CardTitle>Question {question.question_id}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Text */}
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg whitespace-pre-wrap">{question.question_text}</p>
              </div>

              {/* Question Image */}
              {question.question_image_url && (
                <img 
                  src={question.question_image_url} 
                  alt="Question" 
                  className="max-w-full rounded-lg border"
                />
              )}

              {/* Multiple Choice Options */}
              {question.question_type === 'multiple_choice' && options && (
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => !submitted && setSelectedAnswer(opt)}
                      disabled={submitted}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        submitted && opt === question.answer
                          ? 'border-green-500 bg-green-500/10'
                          : submitted && opt === selectedAnswer && !isCorrect
                          ? 'border-red-500 bg-red-500/10'
                          : selectedAnswer === opt
                          ? 'border-primary bg-primary/10'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <span className="font-medium mr-3">{opt}.</span>
                      {options[opt]}
                    </button>
                  ))}
                </div>
              )}

              {/* Fill in the Blank */}
              {question.question_type === 'fill_blank' && (
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
                      Correct answer: {question.answer}
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
        )}
      </main>
    </div>
  );
}
