import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MathText } from "@/components/MathText";
import { ChevronRight, Trophy, Clock, Users, CheckCircle, XCircle } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  multiple_choice_options: any;
  answer: string;
  order_index: number;
  has_figure: boolean | null;
  figure_svg: string | null;
  figure_description: string | null;
  question_image_url: string | null;
  passage_text: string | null;
}

interface AnswerStats {
  total: number;
  correct: number;
  distribution: Record<string, number>;
}

interface LiveQuestionControlProps {
  sessionId: string;
  timePerQuestion: number;
  onFinish: () => void;
}

export function LiveQuestionControl({ sessionId, timePerQuestion, onFinish }: LiveQuestionControlProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [answerStats, setAnswerStats] = useState<AnswerStats>({ total: 0, correct: 0, distribution: {} });
  const [participantCount, setParticipantCount] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Load questions
  useEffect(() => {
    const loadQuestions = async () => {
      const { data } = await supabase
        .from("live_session_questions")
        .select("order_index, question_id, questions(id, question_text, multiple_choice_options, answer, has_figure, figure_svg, figure_description, question_image_url, passage_text)")
        .eq("session_id", sessionId)
        .order("order_index", { ascending: true });

      if (data) {
        const qs = data.map((d: any) => ({
          ...d.questions,
          order_index: d.order_index,
        }));
        setQuestions(qs);
      }

      const { count } = await supabase
        .from("live_session_participants")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId);
      setParticipantCount(count || 0);
    };
    loadQuestions();
  }, [sessionId]);

  // Timer
  useEffect(() => {
    setTimeLeft(timePerQuestion);
    setIsTimerActive(true);
    setShowAnswer(false);
    setAnswerStats({ total: 0, correct: 0, distribution: {} });

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsTimerActive(false);
          setShowAnswer(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, timePerQuestion]);

  // Listen for answers
  useEffect(() => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const fetchAnswers = async () => {
      const { data } = await supabase
        .from("live_session_answers")
        .select("answer, is_correct")
        .eq("session_id", sessionId)
        .eq("question_id", currentQ.id);

      if (data) {
        const dist: Record<string, number> = {};
        let correct = 0;
        data.forEach((a) => {
          dist[a.answer] = (dist[a.answer] || 0) + 1;
          if (a.is_correct) correct++;
        });
        setAnswerStats({ total: data.length, correct, distribution: dist });
      }
    };

    fetchAnswers();

    const channel = supabase
      .channel(`answers-${sessionId}-${currentQ.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_session_answers",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const ans = payload.new as any;
          if (ans.question_id === currentQ.id) {
            setAnswerStats((prev) => ({
              total: prev.total + 1,
              correct: prev.correct + (ans.is_correct ? 1 : 0),
              distribution: {
                ...prev.distribution,
                [ans.answer]: (prev.distribution[ans.answer] || 0) + 1,
              },
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, questions, currentIndex]);

  const handleNext = async () => {
    clearInterval(timerRef.current);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      await supabase
        .from("live_sessions")
        .update({ status: "finished", finished_at: new Date().toISOString() })
        .eq("id", sessionId);
      onFinish();
      return;
    }

    await supabase
      .from("live_sessions")
      .update({ current_question_index: nextIndex })
      .eq("id", sessionId);

    setCurrentIndex(nextIndex);
  };

  const handleRevealAnswer = () => {
    clearInterval(timerRef.current);
    setIsTimerActive(false);
    setShowAnswer(true);
  };

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const options = (currentQuestion.multiple_choice_options as Record<string, string>) || {};
  const maxDist = Math.max(1, ...Object.values(answerStats.distribution));

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Question {currentIndex + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {answerStats.total}/{participantCount}
          </div>
          <motion.div
            key={timeLeft}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-1.5 text-lg font-bold ${
              timeLeft <= 5 ? "text-destructive" : "text-primary"
            }`}
          >
            <Clock className="h-5 w-5" />
            {timeLeft}s
          </motion.div>
        </div>
      </div>

      <Progress value={((timePerQuestion - timeLeft) / timePerQuestion) * 100} className="h-2" />

      {/* Question */}
      <Card className="p-6">
        <div className="text-lg font-medium leading-relaxed">
          <MathText text={currentQuestion.question_text} />
        </div>

        {/* Passage text */}
        {currentQuestion.passage_text && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border text-sm leading-relaxed max-h-48 overflow-y-auto">
            <MathText text={currentQuestion.passage_text} />
          </div>
        )}

        {/* Figure: SVG or image */}
        {currentQuestion.has_figure && currentQuestion.figure_svg && (
          <div className="mt-4 flex justify-center">
            <div
              className="max-w-md w-full rounded-lg border bg-background p-2"
              dangerouslySetInnerHTML={{ __html: currentQuestion.figure_svg }}
            />
          </div>
        )}

        {currentQuestion.question_image_url && (
          <div className="mt-4 flex justify-center">
            <img
              src={currentQuestion.question_image_url}
              alt={currentQuestion.figure_description || "Question figure"}
              className="max-w-md w-full rounded-lg border"
            />
          </div>
        )}

        {/* Figure description fallback */}
        {currentQuestion.has_figure && !currentQuestion.figure_svg && !currentQuestion.question_image_url && currentQuestion.figure_description && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground italic text-center">
            📊 {currentQuestion.figure_description}
          </div>
        )}
      </Card>
      <div className="space-y-2">
        {Object.entries(options).map(([key, value]) => {
          const count = answerStats.distribution[key] || 0;
          const isCorrect = key === currentQuestion.answer;
          const barWidth = answerStats.total > 0 ? (count / participantCount) * 100 : 0;

          return (
            <motion.div
              key={key}
              className={`relative rounded-lg border overflow-hidden ${
                showAnswer && isCorrect
                  ? "border-green-500 bg-green-500/10"
                  : showAnswer && !isCorrect && count > 0
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border"
              }`}
            >
              <motion.div
                className={`absolute inset-y-0 left-0 ${
                  showAnswer && isCorrect ? "bg-green-500/20" : "bg-primary/10"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{ duration: 0.5 }}
              />
              <div className="relative flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                    {key}
                  </span>
                  <span className="text-sm">
                    <MathText text={String(value)} />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{count}</span>
                  {showAnswer && isCorrect && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {showAnswer && !isCorrect && count > 0 && (
                    <XCircle className="h-5 w-5 text-destructive/50" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {!showAnswer && (
          <Button variant="outline" className="flex-1" onClick={handleRevealAnswer}>
            Reveal Answer
          </Button>
        )}
        <Button className="flex-1" onClick={handleNext}>
          {currentIndex + 1 >= questions.length ? (
            <>
              <Trophy className="h-4 w-4 mr-2" />
              Show Results
            </>
          ) : (
            <>
              Next Question
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
