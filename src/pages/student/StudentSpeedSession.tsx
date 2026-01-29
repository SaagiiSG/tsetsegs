import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Timer, Zap, CheckCircle2, XCircle, ArrowRight, Loader2, Trophy, Home
} from 'lucide-react';
import { MathText } from '@/components/MathText';
import { SecurityWrapper } from '@/components/security/SecurityWrapper';
import { DesmosCalculator, useCalculatorSnap } from '@/components/student/DesmosCalculator';

interface Question {
  id: string;
  question_id: string;
  question_text: string;
  answer: string;
  question_type: string;
  multiple_choice_options: Record<string, string> | null;
  category: { name: string } | null;
}

export default function StudentSpeedSession() {
  const { student, logActivity } = useStudentAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const calculatorSnapSide = useCalculatorSnap();

  // New params: duration (seconds) and questions (count)
  const duration = Number(searchParams.get('duration')) || 120;
  const maxQuestions = Number(searchParams.get('questions')) || 15;
  const categoryId = searchParams.get('category');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [results, setResults] = useState<{ correct: boolean; questionId: string; timeSpent: number }[]>([]);
  
  // Track time spent per question
  const questionStartTime = useRef(Date.now());

  // Fetch questions (limited to maxQuestions)
  const { data: questions, isLoading } = useQuery({
    queryKey: ['speed-questions', categoryId, maxQuestions],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select(`
          id,
          question_id,
          question_text,
          answer,
          question_type,
          multiple_choice_options,
          category:question_categories(name)
        `)
        .eq('is_original', true)
        .eq('is_active', true);

      if (categoryId && categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query.order('question_id');
      if (error) throw error;
      
      // Shuffle and limit to maxQuestions
      const shuffled = (data as Question[]).sort(() => Math.random() - 0.5);
      return shuffled.slice(0, maxQuestions);
    },
    enabled: !!student
  });

  const currentQuestion = questions?.[currentIndex];

  // Submit attempt mutation
  const submitAttempt = useMutation({
    mutationFn: async ({ questionId, answer, correct, timeSpent }: { 
      questionId: string; 
      answer: string; 
      correct: boolean;
      timeSpent: number;
    }) => {
      if (!student) return;

      const { data: existing } = await supabase
        .from('student_attempts')
        .select('attempt_number')
        .eq('student_account_id', student.id)
        .eq('question_id', questionId)
        .order('attempt_number', { ascending: false })
        .limit(1);

      const attemptNumber = (existing?.[0]?.attempt_number || 0) + 1;

      await supabase.from('student_attempts').insert({
        student_account_id: student.id,
        question_id: questionId,
        answer_submitted: answer,
        is_correct: correct,
        attempt_number: attemptNumber,
        time_spent_seconds: Math.round(timeSpent / 1000)
      });
    }
  });

  // Timer logic - counts down from duration
  useEffect(() => {
    if (sessionComplete || !questions?.length) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Session time's up
          setSessionComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionComplete, questions]);

  // Reset question start time when moving to next question
  useEffect(() => {
    questionStartTime.current = Date.now();
  }, [currentIndex]);

  const normalizeAnswer = (answer: string) => {
    return answer.trim().toLowerCase().replace(/\s+/g, ' ');
  };

  const handleSubmit = useCallback((timeout = false) => {
    if (!currentQuestion || showResult) return;

    const timeSpent = Date.now() - questionStartTime.current;
    const correct = !timeout && normalizeAnswer(selectedAnswer) === normalizeAnswer(currentQuestion.answer);
    
    setIsCorrect(correct);
    setShowResult(true);
    setResults(prev => [...prev, { correct, questionId: currentQuestion.id, timeSpent }]);

    submitAttempt.mutate({
      questionId: currentQuestion.id,
      answer: timeout ? 'TIMEOUT' : selectedAnswer,
      correct,
      timeSpent
    });

    logActivity('speed_mode_answer', {
      question_id: currentQuestion.id,
      correct,
      timeout,
      timeSpent: Math.round(timeSpent / 1000)
    });
  }, [currentQuestion, selectedAnswer, showResult, logActivity, submitAttempt]);

  const handleNext = () => {
    // Check if we've reached question limit or end of available questions
    if (currentIndex >= (questions?.length || 0) - 1 || currentIndex >= maxQuestions - 1) {
      setSessionComplete(true);
      return;
    }
    
    setCurrentIndex(prev => prev + 1);
    setSelectedAnswer('');
    setShowResult(false);
    setIsCorrect(false);
  };

  const handleFinish = () => {
    const correctCount = results.filter(r => r.correct).length;
    const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0);
    const avgTimePerQuestion = results.length > 0 ? totalTime / results.length / 1000 : 0;

    logActivity('speed_mode_complete', {
      total: results.length,
      correct: correctCount,
      duration,
      maxQuestions,
      avgTimePerQuestion: Math.round(avgTimePerQuestion * 10) / 10
    });

    // Invalidate caches for auto-sync across the app
    queryClient.invalidateQueries({ queryKey: ['student-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['student-mastery-data'] });
    queryClient.invalidateQueries({ queryKey: ['speed-stats'] });
    queryClient.invalidateQueries({ queryKey: ['sprint-leaderboard'] });

    navigate('/practice/speed');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!questions?.length) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-muted-foreground">No questions available</p>
        <Button onClick={() => navigate('/practice/speed')} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  // Session complete screen
  if (sessionComplete) {
    const correctCount = results.filter(r => r.correct).length;
    const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
    const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0);
    const avgTime = results.length > 0 ? Math.round(totalTime / results.length / 1000) : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold">Session Complete!</h2>
              <p className="text-muted-foreground mt-2">Great job practicing!</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold">{results.length}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10">
                <p className="text-3xl font-bold text-green-600">{correctCount}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10">
                <p className="text-3xl font-bold text-primary">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10">
                <p className="text-3xl font-bold text-yellow-600">{avgTime}s</p>
                <p className="text-xs text-muted-foreground">Avg/Question</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/practice/speed')} className="flex-1">
                <Zap className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => navigate('/practice/dashboard')} className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timerPercent = (timeLeft / duration) * 100;
  const questionProgress = ((currentIndex + 1) / Math.min(questions.length, maxQuestions)) * 100;

  const options = currentQuestion?.multiple_choice_options as Record<string, string> | null;
  const isMultipleChoice = currentQuestion?.question_type === 'multiple_choice' && options;

  return (
    <SecurityWrapper>
    <DesmosCalculator />
    <div 
      className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 select-none transition-all duration-300"
      style={{ 
        marginLeft: calculatorSnapSide === 'left' ? '40vw' : 0,
        marginRight: calculatorSnapSide === 'right' ? '40vw' : 0,
        width: calculatorSnapSide ? '60vw' : '100%'
      }}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Timer Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Timer className={`h-4 w-4 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
              <span className={`font-mono font-bold ${timeLeft < 10 ? 'text-red-500' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <span className="text-muted-foreground">
              Question {currentIndex + 1} of {Math.min(questions.length, maxQuestions)}
            </span>
          </div>
          <Progress 
            value={timerPercent} 
            className={`h-2 ${timeLeft < 10 ? '[&>div]:bg-red-500' : ''}`} 
          />
          {/* Question progress bar */}
          <Progress 
            value={questionProgress} 
            className="h-1 [&>div]:bg-primary/50" 
          />
        </div>

        {/* Question Card */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-primary">
                  {currentQuestion?.question_id}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentQuestion?.category?.name}
                </span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MathText text={currentQuestion?.question_text || ''} />
              </div>
            </div>

            {/* Answer Input */}
            {isMultipleChoice ? (
              <div className="grid grid-cols-2 gap-3">
                {['A', 'B', 'C', 'D'].map((letter) => {
                  if (!options?.[letter]) return null;
                  const isSelected = selectedAnswer === letter;
                  const showCorrect = showResult && letter === currentQuestion?.answer;
                  const showWrong = showResult && isSelected && !isCorrect;

                  return (
                    <Button
                      key={letter}
                      variant="outline"
                      disabled={showResult}
                      className={`h-auto py-3 px-4 justify-start text-left ${
                        showCorrect ? 'border-green-500 bg-green-500/10' :
                        showWrong ? 'border-red-500 bg-red-500/10' :
                        isSelected ? 'border-primary bg-primary/10' : ''
                      }`}
                      onClick={() => setSelectedAnswer(letter)}
                    >
                      <span className="font-bold mr-2">{letter}.</span>
                      <MathText text={options[letter]} />
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Type your answer..."
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={showResult}
                  className="text-lg"
                  onKeyDown={(e) => e.key === 'Enter' && !showResult && handleSubmit()}
                />
              </div>
            )}

            {/* Result */}
            {showResult && (
              <div className={`flex items-center gap-3 p-4 rounded-lg ${
                isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {isCorrect ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <p className={`font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-muted-foreground">
                      Answer: {currentQuestion?.answer}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!showResult ? (
                <Button 
                  onClick={() => handleSubmit()} 
                  disabled={!selectedAnswer}
                  className="flex-1"
                >
                  Submit
                </Button>
              ) : (
                <Button onClick={handleNext} className="flex-1">
                  {currentIndex >= Math.min(questions.length, maxQuestions) - 1 ? 'Finish' : 'Next'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              
              <Button variant="outline" onClick={handleFinish}>
                End Session
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{results.filter(r => r.correct).length} correct</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span>{results.filter(r => !r.correct).length} incorrect</span>
          </div>
        </div>
      </div>
    </div>
    </SecurityWrapper>
  );
}
