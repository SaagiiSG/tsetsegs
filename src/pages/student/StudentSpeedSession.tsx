import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Zap, CheckCircle2, XCircle, ArrowRight, Loader2, Trophy, Home, Calculator, BookOpen, Star
} from 'lucide-react';
import { MathText } from '@/components/MathText';
import { SecurityWrapper } from '@/components/security/SecurityWrapper';
import { DesmosCalculator, useCalculatorSnap, toggleCalculator } from '@/components/student/DesmosCalculator';
import { ReferenceSheet, toggleReferenceSheet } from '@/components/student/ReferenceSheet';
import { checkSpeedBadgeProgress } from '@/hooks/useSpeedBadgeProgress';
import { syncBadgeProgressForStudent } from '@/hooks/useSyncBadgeProgress';
import { updateStudentStreak } from '@/hooks/useStudentStreak';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { setDesmosContext, clearDesmosContext } from '@/lib/desmosTracking';
import { ensureSprintEnrollment, getSprintEnrollmentSnapshot, type SprintEnrollmentSnapshot } from '@/lib/sprintEnrollment';
import { SprintEnrollmentDialog } from '@/components/student/SprintEnrollmentDialog';

interface Question {
  id: string;
  question_id: string;
  question_text: string;
  answer: string;
  question_type: string;
  multiple_choice_options: Record<string, string> | null;
  category: { name: string } | null;
}

// Circular Timer SVG Component
function CircularTimer({ timeLeft, duration, size = 200 }: { timeLeft: number; duration: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / duration;
  const strokeDashoffset = circumference * (1 - progress);
  const isUrgent = timeLeft < 10;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={8}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isUrgent ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(
          "font-mono text-4xl font-bold tracking-tight",
          isUrgent ? "text-destructive animate-pulse" : "text-foreground"
        )}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
        <span className="text-xs text-muted-foreground mt-1">remaining</span>
      </div>
    </div>
  );
}

// Score tier data (display only - actual scoring unchanged)
const scoreTiers = [
  { stars: 3, label: '1600 pts', threshold: '≤28s', maxTime: 28 },
  { stars: 2, label: '1450 pts', threshold: '≤46s', maxTime: 46 },
  { stars: 1, label: '1300 pts', threshold: '≤91s', maxTime: 91 },
];

export default function StudentSpeedSession() {
  const { student, logActivity } = useStudentAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const calculatorSnapSide = useCalculatorSnap();

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
  const questionStartTime = useRef(Date.now());
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const pendingEnrollmentSnapshot = useRef<SprintEnrollmentSnapshot | null>(null);
  const pendingEnrollmentPoints = useRef<number>(0);
  const [enrollmentDialog, setEnrollmentDialog] = useState<{ open: boolean; snapshot: SprintEnrollmentSnapshot | null; pointsEarned: number }>({ open: false, snapshot: null, pointsEarned: 0 });

  const { data: questions, isLoading } = useQuery({
    queryKey: ['speed-questions', categoryId, maxQuestions],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select(`
          id, question_id, question_text, answer, question_type,
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
      const shuffled = (data as Question[]).sort(() => Math.random() - 0.5);
      return shuffled.slice(0, maxQuestions);
    },
    enabled: !!student
  });

  const currentQuestion = questions?.[currentIndex];

  // Track Desmos calculator usage context for the current question
  useEffect(() => {
    if (!currentQuestion?.id) return;
    setDesmosContext({ questionId: currentQuestion.id, context: 'speed' });
    return () => clearDesmosContext();
  }, [currentQuestion?.id]);

  // Track elapsed time per question for star display
  useEffect(() => {
    if (sessionComplete || !questions?.length || showResult) return;
    const interval = setInterval(() => {
      setQuestionElapsed(Math.floor((Date.now() - questionStartTime.current) / 1000));
    }, 500);
    return () => clearInterval(interval);
  }, [sessionComplete, questions, showResult, currentIndex]);

  const submitAttempt = useMutation({
    mutationFn: async ({ questionId, answer, correct, timeSpent }: { 
      questionId: string; answer: string; correct: boolean; timeSpent: number;
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

      if (correct) {
        const timeInSeconds = timeSpent / 1000;
        const points = timeInSeconds < 10 ? 15 : timeInSeconds < 20 ? 10 : timeInSeconds < 30 ? 5 : 2;
        
        const { data: activeSprint } = await supabase
          .from('sprints').select('id').eq('is_active', true).maybeSingle();

        await supabase.from('point_transactions').insert({
          student_account_id: student.id,
          sprint_id: activeSprint?.id || null,
          points,
          category: 'speed_session',
          metadata: { question_id: questionId, time_seconds: timeInSeconds }
        });

        if (activeSprint) {
          const { ranking, wasNewlyEnrolled } = await ensureSprintEnrollment(student.id, activeSprint.id);

          if (ranking) {
            await supabase.from('student_sprint_rankings')
              .update({ total_points: (ranking.total_points || 0) + points, updated_at: new Date().toISOString() })
              .eq('id', ranking.id);
          }

          if (wasNewlyEnrolled) {
            const snapshot = await getSprintEnrollmentSnapshot(student.id, activeSprint.id);
            if (snapshot) {
              pendingEnrollmentSnapshot.current = snapshot;
              pendingEnrollmentPoints.current = points;
            }
          }
        }
      }
    }
  });

  // Timer
  useEffect(() => {
    if (sessionComplete || !questions?.length) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { setSessionComplete(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionComplete, questions]);

  useEffect(() => {
    questionStartTime.current = Date.now();
    setQuestionElapsed(0);
  }, [currentIndex]);

  const normalizeAnswer = (answer: string) => answer.trim().toLowerCase().replace(/\s+/g, ' ');

  const handleSubmit = useCallback((timeout = false) => {
    if (!currentQuestion || showResult) return;
    const timeSpent = Date.now() - questionStartTime.current;
    const correct = !timeout && normalizeAnswer(selectedAnswer) === normalizeAnswer(currentQuestion.answer);
    
    setIsCorrect(correct);
    setShowResult(true);
    setResults(prev => [...prev, { correct, questionId: currentQuestion.id, timeSpent }]);

    submitAttempt.mutate({ questionId: currentQuestion.id, answer: timeout ? 'TIMEOUT' : selectedAnswer, correct, timeSpent });
    logActivity('speed_mode_answer', { question_id: currentQuestion.id, correct, timeout, timeSpent: Math.round(timeSpent / 1000) });
  }, [currentQuestion, selectedAnswer, showResult, logActivity, submitAttempt]);

  const handleNext = () => {
    if (currentIndex >= (questions?.length || 0) - 1 || currentIndex >= maxQuestions - 1) {
      setSessionComplete(true);
      return;
    }
    setCurrentIndex(prev => prev + 1);
    setSelectedAnswer('');
    setShowResult(false);
    setIsCorrect(false);
  };

  const handleFinish = async () => {
    const correctCount = results.filter(r => r.correct).length;
    const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0);
    const totalTimeSeconds = Math.round(totalTime / 1000);
    const avgTimePerQuestion = results.length > 0 ? totalTime / results.length / 1000 : 0;
    const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

    logActivity('speed_mode_complete', { total: results.length, correct: correctCount, duration, maxQuestions, avgTimePerQuestion: Math.round(avgTimePerQuestion * 10) / 10 });

    if (student?.id) {
      updateStudentStreak(student.id).catch(() => {});
      try {
        const { data: activeSprint } = await supabase.from('sprints').select('id').eq('is_active', true).maybeSingle();
        await supabase.from('point_transactions').insert({
          student_account_id: student.id, sprint_id: activeSprint?.id || null, points: 0, category: 'speed',
          metadata: { session_summary: true, total_questions: results.length, correct_count: correctCount, accuracy, total_time_seconds: totalTimeSeconds, avg_time_per_question: Math.round(avgTimePerQuestion * 10) / 10 }
        });
      } catch (err) { console.error('Failed to record speed session summary:', err); }

      try {
        const { badgesUnlocked } = await checkSpeedBadgeProgress(student.id, { totalQuestions: results.length, correctCount, totalTimeSeconds, accuracy });
        badgesUnlocked.forEach(badgeName => { toast.success(`🏆 Badge Unlocked: ${badgeName}!`, { description: 'Check your badges page!', duration: 5000 }); });
        if (badgesUnlocked.length > 0) queryClient.invalidateQueries({ queryKey: ['student-badges'] });
      } catch (error) { console.error('Failed to check speed badge progress:', error); }

      try {
        const newBadges = await syncBadgeProgressForStudent(student.id, student.linked_student_id || undefined);
        newBadges.forEach(badgeName => { toast.success(`🏆 Badge Unlocked: ${badgeName}!`, { description: 'Check your badges page!', duration: 5000 }); });
        if (newBadges.length > 0) queryClient.invalidateQueries({ queryKey: ['student-badges'] });
      } catch (error) { console.error('Failed to sync badge progress:', error); }
    }

    queryClient.invalidateQueries({ queryKey: ['student-dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['student-mastery-data'] });
    queryClient.invalidateQueries({ queryKey: ['speed-stats'] });
    queryClient.invalidateQueries({ queryKey: ['sprint-leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['total-points'] });
    queryClient.invalidateQueries({ queryKey: ['activity-heatmap'] });
    queryClient.invalidateQueries({ queryKey: ['performance-stats'] });
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
        <Button onClick={() => navigate('/practice/speed')} className="mt-4">Go Back</Button>
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
                <Zap className="h-4 w-4 mr-2" />Try Again
              </Button>
              <Button onClick={() => navigate('/practice/dashboard')} className="flex-1">
                <Home className="h-4 w-4 mr-2" />Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalQuestions = Math.min(questions.length, maxQuestions);
  const options = currentQuestion?.multiple_choice_options as Record<string, string> | null;
  const isMultipleChoice = currentQuestion?.question_type === 'multiple_choice' && options;

  // Determine current star tier based on elapsed time
  const currentTier = scoreTiers.findIndex(t => questionElapsed <= t.maxTime);

  return (
    <SecurityWrapper>
      <DesmosCalculator />
      <ReferenceSheet />
      <div 
        className="min-h-screen bg-background p-3 md:p-6 select-none"
        style={{ 
          marginLeft: calculatorSnapSide === 'left' ? '40vw' : 0,
          marginRight: calculatorSnapSide === 'right' ? '40vw' : 0,
          width: calculatorSnapSide ? '60vw' : '100%'
        }}
      >
        {/* Tool Bar */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => toggleCalculator()} className="h-9 w-9 rounded-full bg-muted/50">
            <Calculator className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => toggleReferenceSheet()} className="h-9 w-9 rounded-full bg-muted/50">
            <BookOpen className="h-4 w-4" />
          </Button>
          <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Speed Mode
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-4 max-w-6xl mx-auto">
          {/* Left: Question area (60-65%) */}
          <div className="flex-1 lg:w-[62%] space-y-4">
            <Card className="border-border/50">
              <CardContent className="p-5 space-y-5">
                {/* Question header */}
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary text-sm">
                    {currentQuestion?.question_id}
                  </span>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted/50">
                    {currentQuestion?.category?.name}
                  </span>
                </div>

                {/* Question text */}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MathText text={currentQuestion?.question_text || ''} />
                </div>

                {/* Answer options */}
                {isMultipleChoice ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          className={cn(
                            "h-auto py-3 px-4 justify-start text-left transition-all",
                            showCorrect && 'border-green-500 bg-green-500/10',
                            showWrong && 'border-destructive bg-destructive/10',
                            isSelected && !showResult && 'border-primary bg-primary/10',
                          )}
                          onClick={() => setSelectedAnswer(letter)}
                        >
                          <span className="font-bold mr-2 text-muted-foreground">{letter}.</span>
                          <MathText text={options[letter]} />
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Your Answer</label>
                    <Input
                      placeholder="Type your answer..."
                      value={selectedAnswer}
                      onChange={(e) => setSelectedAnswer(e.target.value)}
                      disabled={showResult}
                      className="text-lg h-12 border-2"
                      onKeyDown={(e) => e.key === 'Enter' && !showResult && handleSubmit()}
                      autoFocus
                    />
                  </div>
                )}

                {/* Result */}
                {showResult && (
                  <div className={cn("flex items-center gap-3 p-4 rounded-lg", isCorrect ? 'bg-green-500/10' : 'bg-destructive/10')}>
                    {isCorrect ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <XCircle className="h-6 w-6 text-destructive" />}
                    <div>
                      <p className={cn("font-medium", isCorrect ? 'text-green-600' : 'text-destructive')}>
                        {isCorrect ? 'Correct!' : 'Incorrect'}
                      </p>
                      {!isCorrect && <p className="text-sm text-muted-foreground">Answer: {currentQuestion?.answer}</p>}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {!showResult ? (
                    <Button onClick={() => handleSubmit()} disabled={!selectedAnswer} className="flex-1">Submit</Button>
                  ) : (
                    <Button onClick={handleNext} className="flex-1">
                      {currentIndex >= totalQuestions - 1 ? 'Finish' : 'Next'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleFinish}>End</Button>
                </div>
              </CardContent>
            </Card>

            {/* Question dots */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {Array.from({ length: totalQuestions }).map((_, i) => {
                const result = results[i];
                return (
                  <div
                    key={i}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all",
                      i === currentIndex && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                      result?.correct && 'bg-green-500',
                      result && !result.correct && 'bg-destructive',
                      !result && i !== currentIndex && 'bg-muted-foreground/20',
                      !result && i === currentIndex && 'bg-primary',
                    )}
                  />
                );
              })}
            </div>

            {/* Score summary */}
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{results.filter(r => r.correct).length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-destructive" />
                <span>{results.filter(r => !r.correct).length}</span>
              </div>
            </div>
          </div>

          {/* Right: Timer + Score tiers (35-40%) */}
          <div className="lg:w-[38%] space-y-4">
            {/* Circular Timer Card */}
            <Card className="border-border/50">
              <CardContent className="p-6 flex flex-col items-center">
                <CircularTimer timeLeft={timeLeft} duration={duration} size={180} />
                <p className="text-sm text-muted-foreground mt-3">
                  Q {currentIndex + 1} / {totalQuestions}
                </p>
              </CardContent>
            </Card>

            {/* Star Rating + Score Tiers */}
            <Card className="border-border/50">
              <CardContent className="p-5 space-y-4">
                {/* Current stars */}
                <div className="flex items-center justify-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-7 w-7 transition-all",
                        currentTier !== -1 && i >= (2 - currentTier)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted-foreground/20"
                      )}
                    />
                  ))}
                </div>

                {/* Score tier table */}
                <div className="space-y-2">
                  {scoreTiers.map((tier, i) => {
                    const isActive = currentTier === i;
                    const isPast = currentTier > i || currentTier === -1;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all",
                          isActive && 'bg-primary/10 border border-primary/30',
                          isPast && 'opacity-40',
                          !isActive && !isPast && 'bg-muted/30',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {Array.from({ length: tier.stars }).map((_, j) => (
                            <Star key={j} className={cn("h-3.5 w-3.5", isActive ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/50")} />
                          ))}
                        </div>
                        <span className={cn("font-semibold", isActive && "text-primary")}>{tier.label}</span>
                        <span className="text-muted-foreground text-xs">{tier.threshold}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Current question time */}
                <div className="text-center">
                  <span className="text-2xl font-mono font-bold text-foreground">{questionElapsed}s</span>
                  <p className="text-xs text-muted-foreground">this question</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SecurityWrapper>
  );
}
