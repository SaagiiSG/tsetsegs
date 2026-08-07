import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MathText } from "@/components/MathText";
import { DesmosCalculator, toggleCalculator, useCalculatorSnap } from "@/components/student/DesmosCalculator";
import { ReferenceSheet, toggleReferenceSheet } from "@/components/student/ReferenceSheet";
import { BookOpen, Calculator, Flower2, Loader2, Timer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LIMIT_MS = 20 * 60 * 1000;

interface QuestionRow {
  id: string;
  question_text: string;
  question_image_url: string | null;
  multiple_choice_options: unknown;
  question_type: string | null;
  passage_text: string | null;
}

export default function FlowersChallengePlay() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const calculatorSnapSide = useCalculatorSnap();

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(LIMIT_MS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ correct_count: number; answered_count: number; goal_met: boolean } | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data: attempt, error } = await supabase
        .from("flowers_challenge_attempts")
        .select("id, question_ids, started_at, submitted_at, correct_count, answered_count, goal_met")
        .eq("id", attemptId)
        .maybeSingle();

      if (error || !attempt) {
        toast.error("Challenge attempt not found");
        navigate("/practice/flowers", { replace: true });
        return;
      }
      if (attempt.submitted_at) {
        setResult({
          correct_count: attempt.correct_count,
          answered_count: attempt.answered_count,
          goal_met: attempt.goal_met,
        });
        setLoading(false);
        return;
      }

      const ids = (attempt.question_ids as string[]) ?? [];
      const { data: qs } = await supabase
        .from("questions")
        .select("id, question_text, question_image_url, multiple_choice_options, question_type, passage_text")
        .in("id", ids);

      const ordered = ids
        .map((id) => (qs ?? []).find((q) => q.id === id))
        .filter(Boolean) as QuestionRow[];
      setQuestions(ordered);
      setStartedAt(new Date(attempt.started_at).getTime());
      setLoading(false);
    })();
  }, [attemptId, navigate]);

  const submit = useCallback(
    async (auto = false) => {
      if (!attemptId || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      const duration = startedAt ? Math.min(LIMIT_MS, Date.now() - startedAt) : LIMIT_MS;
      const { data, error } = await supabase.rpc("flowers_challenge_submit", {
        p_attempt_id: attemptId,
        p_answers: answers,
        p_duration_ms: duration,
      });
      setSubmitting(false);
      if (error) {
        submittedRef.current = false;
        toast.error(error.message);
        return;
      }
      const row = (data as Array<{ correct_count: number; answered_count: number; goal_met: boolean }> | null)?.[0];
      if (row) setResult(row);
      if (auto) toast("Time's up — your answers were submitted");
    },
    [attemptId, answers, startedAt],
  );

  useEffect(() => {
    if (!startedAt || result) return;
    const tick = () => {
      const left = Math.max(0, LIMIT_MS - (Date.now() - startedAt));
      setRemaining(left);
      if (left === 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [startedAt, result, submit]);

  const question = questions[cursor];
  const options = useMemo(() => {
    const raw = question?.multiple_choice_options;
    if (!raw) return [] as Array<{ key: string; text: string }>;
    if (Array.isArray(raw)) {
      return raw.map((t, i) => ({ key: String.fromCharCode(65 + i), text: String(t) }));
    }
    return Object.entries(raw as Record<string, unknown>).map(([k, v]) => ({ key: k, text: String(v) }));
  }, [question]);

  const isFill = (question?.question_type ?? "").includes("fill") || options.length === 0;
  const answeredCount = Object.values(answers).filter((v) => v.trim() !== "").length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="container max-w-md py-10">
        <Card className="p-6 text-center space-y-4">
          <Flower2 className={cn("h-10 w-10 mx-auto", result.goal_met ? "text-emerald-500" : "text-primary")} />
          <div>
            <h1 className="text-2xl font-bold font-mono">{result.correct_count}/22</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {result.goal_met
                ? "Goal met — badge unlocked. Absolute flowers."
                : "Goal not met this time. 20 correct under 20 minutes is the target."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/practice/flowers")}>
              Leaderboard
            </Button>
            <Button className="flex-1" onClick={() => navigate("/practice/badges")}>
              My badges
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="w-full min-h-screen flex flex-col transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[padding,max-width]"
      style={{
        paddingLeft: calculatorSnapSide === "left" ? "40vw" : 0,
        paddingRight: calculatorSnapSide === "right" ? "40vw" : 0,
      }}
    >
      <div
        className="w-full px-4 py-4 space-y-4 pb-28 mx-auto transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[max-width]"
        style={{ maxWidth: calculatorSnapSide ? "60vw" : "42rem" }}
      >

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-mono font-semibold">
          <Timer className={cn("h-4 w-4", remaining < 120000 ? "text-destructive" : "text-primary")} />
          <span className={remaining < 120000 ? "text-destructive" : ""}>
            {Math.floor(remaining / 60000)}:{String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{answeredCount}/22 answered</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Calculator"
            onClick={() => toggleCalculator()}
            className="h-9 w-9 rounded-full bg-muted/50"
          >
            <Calculator className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Formula sheet"
            onClick={() => toggleReferenceSheet()}
            className="h-9 w-9 rounded-full bg-muted/50"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Progress value={((cursor + 1) / Math.max(questions.length, 1)) * 100} />

      {question ? (
        <Card className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">Question {cursor + 1} of {questions.length}</p>
          {question.passage_text && (
            <div className="p-3 bg-muted/40 rounded text-sm">
              <MathText text={question.passage_text} />
            </div>
          )}
          <div className="text-base font-medium">
            <MathText text={question.question_text} />
          </div>
          {question.question_image_url && (
            <img src={question.question_image_url} alt="Question figure" className="rounded-md max-h-72 mx-auto" />
          )}

          {isFill ? (
            <Input
              placeholder="Your answer"
              className="font-mono text-center text-lg"
              value={answers[question.id] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
            />
          ) : (
            <div className="grid gap-2">
              {options.map((opt) => (
                <Button
                  key={opt.key}
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left h-auto py-3 whitespace-normal",
                    answers[question.id] === opt.key && "border-primary bg-primary/10",
                  )}
                  onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: opt.key }))}
                >
                  <span className="font-bold mr-2">{opt.key}.</span>
                  <span className="flex-1">
                    <MathText text={opt.text} />
                  </span>
                </Button>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCursor((c) => Math.max(0, c - 1))}
              disabled={cursor === 0}
            >
              Back
            </Button>
            {cursor < questions.length - 1 ? (
              <Button className="flex-1" onClick={() => setCursor((c) => c + 1)}>
                Next
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => submit(false)} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-10 text-center text-sm text-muted-foreground">No questions available.</Card>
      )}

      <DesmosCalculator />
      <ReferenceSheet />
      </div>
    </div>
  );
}
