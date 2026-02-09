import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Target,
  Loader2,
  BookMarked
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PassageGroup {
  passageId: string;
  passageText: string;
  questions: {
    id: string;
    question_id: string;
    question_text: string;
    multiple_choice_options: any;
    answer: string;
    category?: { name: string };
  }[];
  status: 'not_started' | 'in_progress' | 'completed';
  correctCount: number;
}

export default function StudentReadingModule() {
  const navigate = useNavigate();
  const { student, logActivity } = useStudentAuth();
  const [selectedPassage, setSelectedPassage] = useState<PassageGroup | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState<Map<string, { answer: string; correct: boolean }>>(new Map());
  const [readingStartTime, setReadingStartTime] = useState<Date | null>(null);
  const [hasFinishedReading, setHasFinishedReading] = useState(false);

  useEffect(() => {
    if (student) {
      logActivity('reading_module_view');
    }
  }, [student]);

  // Fetch English questions with passages
  const { data: passageQuestions, isLoading } = useQuery({
    queryKey: ['reading-passage-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          id,
          question_id,
          question_text,
          passage_text,
          multiple_choice_options,
          answer,
          category:question_categories(name)
        `)
        .eq('is_active', true)
        .eq('subject', 'english')
        .not('passage_text', 'is', null)
        .order('question_id');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!student,
  });

  // Fetch student attempts for these questions
  const { data: attempts } = useQuery({
    queryKey: ['reading-attempts', student?.id],
    queryFn: async () => {
      if (!student || !passageQuestions?.length) return [];
      
      const { data, error } = await supabase
        .from('student_attempts')
        .select('question_id, is_correct')
        .eq('student_account_id', student.id)
        .in('question_id', passageQuestions.map(q => q.id));
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!student && !!passageQuestions?.length,
  });

  // Group questions by passage
  const passageGroups = useMemo(() => {
    if (!passageQuestions) return [];
    
    const attemptMap = new Map(attempts?.map(a => [a.question_id, a.is_correct]) || []);
    const groups = new Map<string, PassageGroup>();
    
    passageQuestions.forEach(q => {
      if (!q.passage_text) return;
      
      // Create a hash of the passage for grouping
      const passageId = q.passage_text.substring(0, 100);
      
      if (!groups.has(passageId)) {
        groups.set(passageId, {
          passageId,
          passageText: q.passage_text,
          questions: [],
          status: 'not_started',
          correctCount: 0,
        });
      }
      
      const group = groups.get(passageId)!;
      group.questions.push({
        id: q.id,
        question_id: q.question_id,
        question_text: q.question_text,
        multiple_choice_options: q.multiple_choice_options,
        answer: q.answer,
        category: q.category,
      });
      
      // Update status based on attempts
      if (attemptMap.has(q.id)) {
        if (attemptMap.get(q.id)) {
          group.correctCount++;
        }
      }
    });
    
    // Calculate status for each group
    groups.forEach(group => {
      const attemptedCount = group.questions.filter(q => attemptMap.has(q.id)).length;
      if (attemptedCount === 0) {
        group.status = 'not_started';
      } else if (attemptedCount < group.questions.length) {
        group.status = 'in_progress';
      } else {
        group.status = 'completed';
      }
    });
    
    return Array.from(groups.values());
  }, [passageQuestions, attempts]);

  const completedCount = passageGroups.filter(g => g.status === 'completed').length;
  const progressPercent = passageGroups.length > 0 
    ? (completedCount / passageGroups.length) * 100 
    : 0;

  const handleStartPassage = (passage: PassageGroup) => {
    setSelectedPassage(passage);
    setCurrentQuestionIndex(0);
    setHasFinishedReading(false);
    setReadingStartTime(new Date());
    setSessionAnswers(new Map());
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleFinishReading = () => {
    setHasFinishedReading(true);
    logActivity('passage_read_complete', {
      passage_id: selectedPassage?.passageId,
      reading_time_seconds: readingStartTime 
        ? Math.round((new Date().getTime() - readingStartTime.getTime()) / 1000)
        : null,
    });
  };

  const handleAnswerSelect = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !selectedPassage || !student) return;
    
    const currentQuestion = selectedPassage.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer.toUpperCase() === currentQuestion.answer.toUpperCase();
    
    // Save attempt
    await supabase.from('student_attempts').insert({
      student_account_id: student.id,
      question_id: currentQuestion.id,
      answer_submitted: selectedAnswer,
      is_correct: isCorrect,
      attempt_number: 1,
    });
    
    // Update session answers
    setSessionAnswers(prev => new Map(prev).set(currentQuestion.id, { 
      answer: selectedAnswer, 
      correct: isCorrect 
    }));
    
    setShowResult(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < selectedPassage!.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const handleFinishPassage = () => {
    setSelectedPassage(null);
    setCurrentQuestionIndex(0);
    setHasFinishedReading(false);
    setSessionAnswers(new Map());
  };

  const currentQuestion = selectedPassage?.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= (selectedPassage?.questions.length || 0) - 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Passage Reading & Answering View
  if (selectedPassage) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleFinishPassage}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Exit
            </Button>
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                Question {currentQuestionIndex + 1} of {selectedPassage.questions.length}
              </Badge>
              <Progress 
                value={((currentQuestionIndex + 1) / selectedPassage.questions.length) * 100} 
                className="w-32 h-2"
              />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4">
          {!hasFinishedReading ? (
            // Reading Phase
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookMarked className="h-5 w-5 text-primary" />
                    Read the Passage
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Take your time to understand the passage. You'll answer {selectedPassage.questions.length} questions about it.
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[50vh] pr-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {selectedPassage.passageText.split('\n').map((para, i) => (
                        <p key={i} className="mb-4 leading-relaxed">
                          {para}
                        </p>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              
              <Button 
                className="w-full h-12"
                onClick={handleFinishReading}
              >
                I've Finished Reading
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          ) : (
            // Question Answering Phase
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Passage Reference */}
              <Card className="h-fit lg:sticky lg:top-24">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Passage Reference
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[40vh] lg:h-[60vh] pr-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                      {selectedPassage.passageText.split('\n').map((para, i) => (
                        <p key={i} className="mb-3 leading-relaxed text-muted-foreground">
                          {para}
                        </p>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Question */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestionIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {currentQuestion?.category?.name || 'Reading'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {currentQuestion?.question_id}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="text-lg leading-relaxed">
                        {currentQuestion?.question_text}
                      </p>

                      <Separator />

                      {/* Answer Choices */}
                      <div className="space-y-3">
                        {Object.entries(currentQuestion?.multiple_choice_options || {}).map(([key, value]) => {
                          const isSelected = selectedAnswer === key;
                          const isCorrect = key.toUpperCase() === currentQuestion?.answer.toUpperCase();
                          
                          return (
                            <button
                              key={key}
                              onClick={() => handleAnswerSelect(key)}
                              disabled={showResult}
                              className={cn(
                                "w-full p-4 rounded-lg border-2 text-left transition-all",
                                "hover:border-primary/50 hover:bg-primary/5",
                                isSelected && !showResult && "border-primary bg-primary/10",
                                showResult && isCorrect && "border-green-500 bg-green-500/10",
                                showResult && isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <span className={cn(
                                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium border-2 shrink-0",
                                  isSelected && "bg-primary text-primary-foreground border-primary",
                                  showResult && isCorrect && "bg-green-500 text-white border-green-500",
                                  showResult && isSelected && !isCorrect && "bg-red-500 text-white border-red-500",
                                )}>
                                  {key.toUpperCase()}
                                </span>
                                <span className="text-sm leading-relaxed">{String(value)}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Result & Actions */}
                      {showResult ? (
                        <div className="space-y-4">
                          <div className={cn(
                            "p-4 rounded-lg flex items-center gap-3",
                            sessionAnswers.get(currentQuestion!.id)?.correct
                              ? "bg-green-500/10 text-green-600"
                              : "bg-red-500/10 text-red-600"
                          )}>
                            {sessionAnswers.get(currentQuestion!.id)?.correct ? (
                              <>
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium">Correct!</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-5 w-5" />
                                <span className="font-medium">
                                  Incorrect. The answer is {currentQuestion?.answer.toUpperCase()}.
                                </span>
                              </>
                            )}
                          </div>
                          
                          {isLastQuestion ? (
                            <Button className="w-full" onClick={handleFinishPassage}>
                              Finish Passage
                            </Button>
                          ) : (
                            <Button className="w-full" onClick={handleNextQuestion}>
                              Next Question
                              <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button 
                          className="w-full" 
                          onClick={handleSubmitAnswer}
                          disabled={!selectedAnswer}
                        >
                          Submit Answer
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Passage Selection View
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto select-none">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <BookMarked className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Reading Practice</h1>
            <p className="text-muted-foreground text-sm">Practice with real SAT-style passages</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Passages Completed</span>
            <span className="font-medium">{completedCount} / {passageGroups.length}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Passage List */}
      {passageGroups.length > 0 ? (
        <div className="grid gap-4">
          {passageGroups.map((group, index) => (
            <Card 
              key={group.passageId}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
                group.status === 'completed' && "border-green-500/30 bg-green-500/5",
                group.status === 'in_progress' && "border-yellow-500/30 bg-yellow-500/5"
              )}
              onClick={() => handleStartPassage(group)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Passage {index + 1}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          group.status === 'completed' && "bg-green-500/10 text-green-600 border-green-500/20",
                          group.status === 'in_progress' && "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                        )}
                      >
                        {group.questions.length} questions
                      </Badge>
                      {group.status === 'completed' && (
                        <Badge className="text-xs bg-green-500">
                          {group.correctCount}/{group.questions.length} correct
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {group.passageText.substring(0, 150)}...
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No reading passages available yet</p>
            <p className="text-sm mt-2">Check back soon!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
