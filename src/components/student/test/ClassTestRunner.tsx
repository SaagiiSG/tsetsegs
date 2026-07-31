import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { MathText } from '@/components/MathText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Flag, Grid3X3, Loader2, EyeOff } from 'lucide-react';
import type { ClassTest } from '@/hooks/useClassTest';
import { ClassTestResultScreen } from './ClassTestResultScreen';

interface QuestionRow {
  id: string;
  question_text: string;
  question_image_url: string | null;
  multiple_choice_options: any;
  choice_images: any;
  answer: string;
  question_type: string | null;
  passage_text: string | null;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function normalizeFill(v: string) {
  return v.trim().toLowerCase().replace(/\s+/g, '').replace(/^0+(?=\d)/, '');
}

export function ClassTestRunner({
  test,
  ended = false,
  onExit,
}: {
  test: ClassTest;
  /** Teacher ended the test early or the clock expired — force-submit and show the score. */
  ended?: boolean;
  onExit?: () => void;
}) {
  const { student } = useStudentAuth();
  const isMobile = useIsMobile();
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const questionStartRef = useRef<number>(Date.now());
  const violationsRef = useRef(0);
  const submittingRef = useRef(false);

  const endsAt = useMemo(
    () => new Date(test.starts_at).getTime() + test.duration_seconds * 1000,
    [test.starts_at, test.duration_seconds],
  );
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));

  /* ---------- load questions ---------- */
  useEffect(() => {
    if (test.question_ids.length === 0) return;
    supabase
      .from('questions')
      .select('id, question_text, question_image_url, multiple_choice_options, choice_images, answer, question_type, passage_text')
      .in('id', test.question_ids)
      .then(({ data }) => {
        const byId = new Map((data ?? []).map((q: any) => [q.id, q as QuestionRow]));
        setQuestions(test.question_ids.map((id) => byId.get(id)).filter(Boolean) as QuestionRow[]);
      });
  }, [test.question_ids]);

  /* ---------- ensure participant ---------- */
  useEffect(() => {
    if (!student) return;
    const name = student.linked_student
      ? `${student.linked_student.first_name} ${student.linked_student.last_name ?? ''}`.trim()
      : student.phone_number;
    (async () => {
      const { data: existing } = await supabase
        .from('class_test_participants')
        .select('id, submitted_at')
        .eq('test_id', test.id)
        .eq('student_account_id', student.id)
        .maybeSingle();
      if (existing) {
        setParticipantId(existing.id);
        if (existing.submitted_at) setSubmitted(true);
        return;
      }
      const { data } = await supabase
        .from('class_test_participants')
        .insert({ test_id: test.id, student_account_id: student.id, display_name: name })
        .select('id')
        .maybeSingle();
      if (data) setParticipantId(data.id);
    })();
  }, [student, test.id]);

  /* ---------- timer ---------- */
  const submitTest = useCallback(async (auto = false) => {
    if (submittingRef.current || !participantId) return;
    submittingRef.current = true;
    const correct = questions.reduce((acc, q) => {
      const given = answers[q.id];
      if (!given) return acc;
      const isFill = (q.question_type ?? '').includes('fill');
      const ok = isFill
        ? normalizeFill(given) === normalizeFill(q.answer ?? '')
        : given.trim().toUpperCase() === (q.answer ?? '').trim().toUpperCase();
      return acc + (ok ? 1 : 0);
    }, 0);
    await supabase
      .from('class_test_participants')
      .update({
        submitted_at: new Date().toISOString(),
        correct_count: correct,
        answered_count: Object.keys(answers).length,
        focus_violations: violationsRef.current,
      })
      .eq('id', participantId);
    setSubmitted(true);
    if (auto) toast('Time is up — your test was submitted');
  }, [participantId, questions, answers]);

  useEffect(() => {
    const t = setInterval(() => {
      const r = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setRemaining(r);
      if (r === 0 && !submitted) submitTest(true);
    }, 500);
    return () => clearInterval(t);
  }, [endsAt, submitted, submitTest]);

  /* ---------- focus lock (tablet / desktop only) ---------- */
  useEffect(() => {
    if (isMobile || submitted) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        violationsRef.current += 1;
        setBlurred(true);
        if (participantId) {
          supabase
            .from('class_test_participants')
            .update({ focus_violations: violationsRef.current })
            .eq('id', participantId)
            .then(() => {});
        }
      }
    };
    const onBlur = () => setBlurred(true);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', onBlur);
    };
  }, [isMobile, submitted, participantId]);

  const current = questions[cursor];

  const options = useMemo(() => {
    if (!current?.multiple_choice_options) return [] as Array<{ key: string; text: string; img?: string }>;
    const raw = current.multiple_choice_options;
    const imgs = (current.choice_images ?? {}) as Record<string, string>;
    if (Array.isArray(raw)) {
      return raw.map((t: any, i: number) => {
        const key = String.fromCharCode(65 + i);
        return { key, text: String(t), img: imgs?.[key] };
      });
    }
    return Object.entries(raw).map(([k, v]) => ({ key: k, text: String(v), img: imgs?.[k] }));
  }, [current]);

  const saveAnswer = useCallback(async (q: QuestionRow, value: string) => {
    setAnswers((a) => ({ ...a, [q.id]: value }));
    if (!participantId) return;
    const isFill = (q.question_type ?? '').includes('fill');
    const ok = isFill
      ? normalizeFill(value) === normalizeFill(q.answer ?? '')
      : value.trim().toUpperCase() === (q.answer ?? '').trim().toUpperCase();
    const timeMs = Date.now() - questionStartRef.current;
    await supabase.from('class_test_answers').upsert(
      {
        test_id: test.id,
        participant_id: participantId,
        question_id: q.id,
        selected_answer: value,
        is_correct: ok,
        time_ms: timeMs,
        flagged: !!flags[q.id],
      },
      { onConflict: 'participant_id,question_id' },
    );
    await supabase
      .from('class_test_participants')
      .update({ answered_count: Object.keys({ ...answers, [q.id]: value }).length })
      .eq('id', participantId);
  }, [participantId, test.id, flags, answers]);

  const goto = (i: number) => {
    if (i < 0 || i >= questions.length) return;
    questionStartRef.current = Date.now();
    setCursor(i);
    setGridOpen(false);
  };

  if (submitted) {
    return <ClassTestResultScreen test={test} participantId={participantId} questions={questions} answers={answers} />;
  }

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin opacity-60" />
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const timerTone =
    remaining <= 60 ? 'text-destructive' : remaining <= 300 ? 'text-amber-500' : 'text-muted-foreground';

  const grid = (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {questions.map((q, i) => {
        const done = !!answers[q.id];
        return (
          <button
            key={q.id}
            onClick={() => goto(i)}
            className={cn(
              'h-9 rounded-md text-xs font-semibold border transition-colors',
              i === cursor && 'ring-2 ring-primary',
              done ? 'bg-primary/15 border-primary/40' : 'bg-muted/40',
              flags[q.id] && 'border-amber-500',
            )}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] bg-background flex flex-col">
      {/* top bar */}
      <div className="border-b px-3 py-2 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{test.title}</div>
          <div className="text-xs font-medium">
            Question {cursor + 1} of {questions.length}
          </div>
        </div>
        <div className={cn('font-mono text-sm tabular-nums', timerTone)}>{fmt(remaining)}</div>
        {isMobile ? (
          <Sheet open={gridOpen} onOpenChange={setGridOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-8">
              <div className="text-sm font-semibold mb-3">Questions</div>
              {grid}
            </SheetContent>
          </Sheet>
        ) : (
          <Button size="sm" onClick={() => setConfirmOpen(true)}>Submit</Button>
        )}
      </div>
      <Progress value={(answeredCount / questions.length) * 100} className="h-1 rounded-none" />

      <div className="flex-1 min-h-0 flex">
        {/* question pane */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-2xl space-y-4">
            {current.passage_text && (
              <Card className="p-3 text-sm bg-muted/30">
                <MathText text={current.passage_text} />
              </Card>
            )}
            <div className={cn('font-medium', isMobile ? 'text-base' : 'text-lg')}>
              <MathText text={current.question_text} />
            </div>
            {current.question_image_url && (
              <img src={current.question_image_url} alt="Question figure" className="rounded-md max-h-72 mx-auto" />
            )}

            {options.length > 0 ? (
              <div className="grid gap-2">
                {options.map((opt) => {
                  const picked = answers[current.id] === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => saveAnswer(current, opt.key)}
                      className={cn(
                        'w-full text-left rounded-lg border p-3 flex gap-3 items-start transition-colors',
                        isMobile && 'p-4',
                        picked ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
                      )}
                    >
                      <span className="font-bold shrink-0">{opt.key}.</span>
                      <span className="flex-1 min-w-0 space-y-2">
                        <MathText text={opt.text} />
                        {opt.img && <img src={opt.img} alt={`Choice ${opt.key}`} className="max-h-40 rounded" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Input
                inputMode="text"
                placeholder="Type your answer"
                value={answers[current.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [current.id]: e.target.value }))}
                onBlur={(e) => e.target.value && saveAnswer(current, e.target.value)}
                className={cn(isMobile && 'h-12 text-base')}
              />
            )}
          </div>
        </div>

        {/* desktop rail */}
        {!isMobile && (
          <div className="w-56 shrink-0 border-l p-3 overflow-y-auto hidden md:block">
            <div className="text-xs font-semibold mb-2 text-muted-foreground">Questions</div>
            {grid}
          </div>
        )}
      </div>

      {/* bottom bar */}
      <div className="border-t px-3 py-2 flex items-center gap-2">
        <Button variant="outline" size={isMobile ? 'default' : 'sm'} onClick={() => goto(cursor - 1)} disabled={cursor === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={flags[current.id] ? 'default' : 'outline'}
          size={isMobile ? 'default' : 'sm'}
          onClick={() => setFlags((f) => ({ ...f, [current.id]: !f[current.id] }))}
        >
          <Flag className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        {isMobile && (
          <Button variant="secondary" size="default" onClick={() => setConfirmOpen(true)}>
            Submit
          </Button>
        )}
        <Button size={isMobile ? 'default' : 'sm'} onClick={() => goto(cursor + 1)} disabled={cursor === questions.length - 1}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* focus lock overlay */}
      {blurred && !isMobile && (
        <div className="fixed inset-0 z-[80] backdrop-blur-xl bg-background/80 flex flex-col items-center justify-center gap-4 text-center px-6">
          <EyeOff className="h-8 w-8 text-destructive" />
          <div>
            <div className="text-lg font-semibold">Return to your test</div>
            <p className="text-sm text-muted-foreground">Leaving the test screen is recorded and shared with your teacher.</p>
          </div>
          <Button onClick={() => setBlurred(false)}>Resume test</Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your test?</AlertDialogTitle>
            <AlertDialogDescription>
              You answered {answeredCount} of {questions.length} questions. You cannot change answers after submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitTest(false)}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
