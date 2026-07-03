import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useChallenge } from '@/hooks/useChallenge';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { calculatePoints } from '@/lib/challengeScoring';
import { MathText } from '@/components/MathText';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DesmosCalculator } from '@/components/student/DesmosCalculator';

interface QuestionRow {
  id: string;
  question_text: string;
  question_image_url: string | null;
  multiple_choice_options: any;
  answer: string;
  difficulty_level: string | null;
  passage_text: string | null;
}

export default function ChallengePlay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const { challenge, participants, finishTimeSprint } = useChallenge(id ?? null);

  const [poolIds, setPoolIds] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [question, setQuestion] = useState<QuestionRow | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  // Load question pool once
  useEffect(() => {
    if (!id) return;
    supabase
      .from('challenge_questions')
      .select('question_id')
      .eq('challenge_id', id)
      .order('order_index')
      .then(({ data }) => setPoolIds((data ?? []).map((r: any) => r.question_id)));
  }, [id]);

  // Load current question
  useEffect(() => {
    if (poolIds.length === 0 || cursor >= poolIds.length) {
      setQuestion(null);
      return;
    }
    setPicked(null);
    setFeedback(null);
    startedAtRef.current = Date.now();
    supabase
      .from('questions')
      .select('id, question_text, question_image_url, multiple_choice_options, answer, difficulty_level, passage_text')
      .eq('id', poolIds[cursor])
      .maybeSingle()
      .then(({ data }) => setQuestion(data as QuestionRow));
  }, [poolIds, cursor]);

  // Redirect on status
  useEffect(() => {
    if (!challenge) return;
    if (challenge.status === 'finished') navigate(`/practice/challenges/${id}/results`);
    if (challenge.status === 'cancelled') {
      toast('Challenge cancelled');
      navigate('/practice/challenges');
    }
    // Ambient formats are tracked from regular practice — bounce out of the play screen
    if (challenge.status === 'active' && challenge.format !== 'fixed_set') {
      navigate(challenge.subject === 'english' ? '/english-practice' : '/practice', { replace: true });
    }
  }, [challenge?.status, challenge?.format, challenge?.subject, id, navigate]);

  // Time sprint countdown
  const [remaining, setRemaining] = useState<number>(0);
  useEffect(() => {
    if (!challenge || challenge.format !== 'time_sprint' || !challenge.started_at) return;
    const tick = () => {
      const end = new Date(challenge.started_at!).getTime() + (challenge.duration_seconds ?? 0) * 1000;
      const r = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(r);
      if (r === 0 && challenge.status === 'active') {
        finishTimeSprint();
      }
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [challenge?.started_at, challenge?.duration_seconds, challenge?.status, challenge?.format, finishTimeSprint]);

  const myPart = participants.find((p) => p.student_account_id === student?.id);

  const options = useMemo(() => {
    if (!question?.multiple_choice_options) return [] as Array<{ key: string; text: string }>;
    const raw = question.multiple_choice_options;
    if (Array.isArray(raw)) {
      return raw.map((t: any, i: number) => ({ key: String.fromCharCode(65 + i), text: String(t) }));
    }
    return Object.entries(raw).map(([k, v]) => ({ key: k, text: String(v) }));
  }, [question]);

  const submit = useCallback(
    async (choice: string) => {
      if (!question || !student || !id || submitting) return;
      setSubmitting(true);
      setPicked(choice);
      const isCorrect = choice.trim().toUpperCase() === (question.answer ?? '').trim().toUpperCase();
      const timeMs = Date.now() - startedAtRef.current;
      const points = calculatePoints(isCorrect, question.difficulty_level, timeMs);
      setFeedback(isCorrect ? 'correct' : 'wrong');

      await supabase.from('challenge_attempts').insert({
        challenge_id: id,
        student_account_id: student.id,
        question_id: question.id,
        is_correct: isCorrect,
        time_ms: timeMs,
        points_awarded: points,
      });

      setTimeout(() => {
        setCursor((c) => c + 1);
        setSubmitting(false);
      }, 700);
    },
    [question, student, id, submitting],
  );

  if (!challenge) return <div className="container max-w-2xl py-10 text-center">Loading…</div>;
  if (challenge.status !== 'active') return <div className="container max-w-2xl py-10 text-center">Waiting…</div>;

  // Out of questions in pool
  if (!question && poolIds.length > 0 && cursor >= poolIds.length) {
    return (
      <div className="container max-w-xl py-10 text-center space-y-3">
        <Loader2 className="h-6 w-6 mx-auto animate-spin opacity-60" />
        <p className="text-muted-foreground">Out of questions — waiting for results…</p>
      </div>
    );
  }

  const targetText =
    challenge.format === 'first_to_points'
      ? `${myPart?.score ?? 0} / ${challenge.target_value}`
      : challenge.format === 'first_to_correct'
      ? `${myPart?.correct_count ?? 0} / ${challenge.target_value}`
      : challenge.format === 'fixed_set'
      ? `${myPart?.attempted_count ?? 0} / ${challenge.target_value}`
      : `${remaining}s left`;

  const progressPct =
    challenge.format === 'first_to_points' && challenge.target_value
      ? Math.min(100, ((myPart?.score ?? 0) / challenge.target_value) * 100)
      : challenge.format === 'first_to_correct' && challenge.target_value
      ? Math.min(100, ((myPart?.correct_count ?? 0) / challenge.target_value) * 100)
      : challenge.format === 'fixed_set' && challenge.target_value
      ? Math.min(100, ((myPart?.attempted_count ?? 0) / challenge.target_value) * 100)
      : challenge.duration_seconds
      ? Math.min(100, ((challenge.duration_seconds - remaining) / challenge.duration_seconds) * 100)
      : 0;

  return (
    <div className="container max-w-2xl py-4 space-y-4">
      {/* Live mini-leaderboard */}
      <Card className="p-3">
        <div className="text-xs text-muted-foreground mb-2">Live leaderboard</div>
        <div className="space-y-1">
          {[...participants]
            .sort((a, b) => b.score - a.score || b.correct_count - a.correct_count)
            .map((p, i) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className={p.student_account_id === student?.id ? 'font-semibold' : ''}>
                  {i + 1}. {p.display_name}
                </span>
                <span className="tabular-nums">
                  {p.score} pts · {p.correct_count} ✓
                </span>
              </div>
            ))}
        </div>
      </Card>

      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Your progress</span>
          <span className="font-semibold tabular-nums">{targetText}</span>
        </div>
        <Progress value={progressPct} />
      </div>

      {question ? (
        <Card className="p-5 space-y-4">
          {question.passage_text && (
            <div className="p-3 bg-muted/40 rounded text-sm">
              <MathText text={question.passage_text} />
            </div>
          )}
          <div className="text-base font-medium">
            <MathText text={question.question_text} />
          </div>
          {question.question_image_url && (
            <img src={question.question_image_url} alt="Question" className="rounded-md max-h-60 mx-auto" />
          )}
          <div className="grid gap-2">
            {options.map((opt) => {
              const isPicked = picked === opt.key;
              const showCorrect = feedback && opt.key === (question.answer ?? '').trim().toUpperCase();
              return (
                <Button
                  key={opt.key}
                  variant="outline"
                  className={[
                    'w-full justify-start text-left h-auto py-3 whitespace-normal',
                    isPicked && feedback === 'correct' ? 'bg-emerald-500/15 border-emerald-500' : '',
                    isPicked && feedback === 'wrong' ? 'bg-red-500/15 border-red-500' : '',
                    !isPicked && showCorrect ? 'border-emerald-500' : '',
                  ].join(' ')}
                  onClick={() => submit(opt.key)}
                  disabled={submitting}
                >
                  <span className="font-bold mr-2">{opt.key}.</span>
                  <span className="flex-1">
                    <MathText text={opt.text} />
                  </span>
                </Button>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-10 text-center">
          <Loader2 className="h-6 w-6 mx-auto animate-spin opacity-60" />
        </Card>
      )}

      {challenge.subject === 'math' && <DesmosCalculator />}
    </div>
  );
}
