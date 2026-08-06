import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { ChevronLeft, ChevronRight, Flag, Grid3X3, Loader2, EyeOff, Calculator } from 'lucide-react';
import { DesmosCalculator, toggleCalculator } from '@/components/student/DesmosCalculator';
import type { ClassTest } from '@/hooks/useClassTest';
import { ClassTestResultScreen } from './ClassTestResultScreen';
import { ExamTimer } from './ExamTimer';


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

function normalizeFill(v: string) {
  return v.trim().toLowerCase().replace(/\s+/g, '').replace(/^0+(?=\d)/, '');
}

function isCorrect(q: QuestionRow, value: string) {
  const isFill = (q.question_type ?? '').includes('fill');
  return isFill
    ? normalizeFill(value) === normalizeFill(q.answer ?? '')
    : value.trim().toUpperCase() === (q.answer ?? '').trim().toUpperCase();
}

type Option = { key: string; text: string; img?: string };

/** Question body is memoized so only a question change / new pick repaints it. */
const QuestionBody = memo(function QuestionBody({
  question,
  options,
  picked,
  isMobile,
  onPick,
  onType,
  nextImage,
}: {
  question: QuestionRow;
  options: Option[];
  picked: string | undefined;
  isMobile: boolean;
  onPick: (q: QuestionRow, key: string) => void;
  onType: (q: QuestionRow, value: string) => void;
  nextImage?: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      {question.passage_text && (
        <Card className="p-3 text-sm bg-muted/30">
          <MathText text={question.passage_text} />
        </Card>
      )}
      <div className={cn('font-medium', isMobile ? 'text-base' : 'text-lg')}>
        <MathText text={question.question_text} />
      </div>
      {question.question_image_url && (
        <img
          src={question.question_image_url}
          alt="Question figure"
          decoding="async"
          className="rounded-md max-h-72 mx-auto"
        />
      )}
      {/* warm the next figure so navigation feels instant */}
      {nextImage && <link rel="prefetch" as="image" href={nextImage} />}

      {options.length > 0 ? (
        <div className="grid gap-2">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onPick(question, opt.key)}
              className={cn(
                'w-full text-left rounded-lg border p-3 flex gap-3 items-start transition-colors',
                isMobile && 'p-4',
                picked === opt.key ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
              )}
            >
              <span className="font-bold shrink-0">{opt.key}.</span>
              <span className="flex-1 min-w-0 space-y-2">
                <MathText text={opt.text} />
                {opt.img && <img src={opt.img} alt={`Choice ${opt.key}`} loading="lazy" decoding="async" className="max-h-40 rounded" />}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <FillInInput
          key={question.id}
          question={question}
          initial={picked ?? ''}
          isMobile={isMobile}
          onCommit={onType}
        />
      )}
    </div>
  );
});

/** Keeps keystrokes local and debounces the save so typing never repaints the screen. */
function FillInInput({
  question,
  initial,
  isMobile,
  onCommit,
}: {
  question: QuestionRow;
  initial: string;
  isMobile: boolean;
  onCommit: (q: QuestionRow, value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const schedule = (v: string) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (v.trim()) onCommit(question, v);
    }, 600);
  };

  return (
    <Input
      inputMode="text"
      placeholder="Type your answer"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        schedule(e.target.value);
      }}
      onBlur={() => {
        clearTimeout(timerRef.current);
        if (value.trim()) onCommit(question, value);
      }}
      className={cn(isMobile && 'h-12 text-base')}
    />
  );
}

const QuestionGrid = memo(function QuestionGrid({
  ids,
  answered,
  flagged,
  cursor,
  onGoto,
}: {
  ids: string[];
  answered: string;
  flagged: string;
  cursor: number;
  onGoto: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {ids.map((id, i) => (
        <button
          key={id}
          onClick={() => onGoto(i)}
          className={cn(
            'h-9 rounded-md text-xs font-semibold border transition-colors',
            i === cursor && 'ring-2 ring-primary',
            answered[i] === '1' ? 'bg-primary/15 border-primary/40' : 'bg-muted/40',
            flagged[i] === '1' && 'border-amber-500',
          )}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
});

/** Bluebook-style "Review your answers" list. */
const ReviewPanel = memo(function ReviewPanel({
  questions,
  answers,
  flags,
  onGoto,
}: {
  questions: QuestionRow[];
  answers: Record<string, string>;
  flags: Record<string, boolean>;
  onGoto: (i: number) => void;
}) {
  const unanswered = questions.filter((q) => !answers[q.id]).length;
  const flaggedCount = questions.filter((q) => flags[q.id]).length;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">Check Your Work</h2>
        <p className="text-sm text-muted-foreground">
          On test day, you won't be able to move on to the next module until time expires.
          <br className="hidden sm:block" />
          For these questions, you can review your work before you submit.
        </p>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-primary/20 border border-primary/40" /> Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-dashed border-muted-foreground/60" /> Unanswered
        </span>
        <span className="flex items-center gap-1.5">
          <Flag className="h-3 w-3 text-amber-500" /> For review
        </span>
      </div>

      <div className="rounded-lg border p-3">
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {questions.map((q, i) => {
            const done = !!answers[q.id];
            return (
              <button
                key={q.id}
                onClick={() => onGoto(i)}
                className={cn(
                  'relative h-10 rounded-md text-sm font-semibold transition-colors',
                  done
                    ? 'bg-primary/15 border border-primary/40'
                    : 'border border-dashed border-muted-foreground/50 text-muted-foreground',
                )}
              >
                {i + 1}
                {flags[q.id] && <Flag className="absolute -top-1.5 -right-1.5 h-3 w-3 text-amber-500 fill-amber-500" />}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {unanswered === 0 ? 'All questions answered.' : `${unanswered} unanswered`}
        {flaggedCount > 0 && ` · ${flaggedCount} marked for review`}
      </p>
    </div>
  );
});


export function ClassTestRunner({
  test,
  participantId,
  alreadySubmitted = false,
  ended = false,
  onExit,
}: {
  test: ClassTest;
  /** Participant row created when the student joined with their phone number. */
  participantId: string;
  alreadySubmitted?: boolean;
  /** Teacher ended the test early or the clock expired — force-submit and show the score. */
  ended?: boolean;
  onExit?: () => void;
}) {
  const isMobile = useIsMobile();
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [restored, setRestored] = useState(false);
  const [needsResume, setNeedsResume] = useState(false);
  const startedKey = `class-exam:started:${test.id}:${participantId}`;
  const submitTestRef = useRef<((auto?: boolean) => void) | null>(null);
  const [calcMounted, setCalcMounted] = useState(false);
  const questionStartRef = useRef<number>(Date.now());
  const violationsRef = useRef(0);
  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const flagsRef = useRef(flags);
  flagsRef.current = flags;
  // per-question time spent, kept locally and uploaded with the submission
  const timesRef = useRef<Record<string, number>>({});

  const endsAt = useMemo(
    () => new Date(test.starts_at).getTime() + test.duration_seconds * 1000,
    [test.starts_at, test.duration_seconds],
  );

  /* ---------- load questions ONCE, then keep them in local storage ----------
     The whole paper is downloaded up front so the exam runs entirely offline
     from that point on — no database traffic while students are working. */
  const idsKey = useMemo(() => (test.question_ids as string[]).join(','), [test.question_ids]);
  const loadedKeyRef = useRef<string | null>(null);
  const paperKey = `class-exam:paper:${test.id}`;

  useEffect(() => {
    if (!idsKey) return;
    if (loadedKeyRef.current === idsKey) return;
    loadedKeyRef.current = idsKey;
    const ids = idsKey.split(',');

    // cached paper from an earlier visit / reload
    try {
      const raw = localStorage.getItem(paperKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.idsKey === idsKey && Array.isArray(cached.questions) && cached.questions.length === ids.length) {
          setQuestions(cached.questions as QuestionRow[]);
          return;
        }
      }
    } catch {
      /* ignore a bad cache */
    }

    supabase
      .from('questions')
      .select('id, question_text, question_image_url, multiple_choice_options, choice_images, answer, question_type, passage_text')
      .in('id', ids)
      .then(({ data }) => {
        const byId = new Map((data ?? []).map((q: any) => [q.id, q as QuestionRow]));
        const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as QuestionRow[];
        setQuestions(ordered);
        try {
          localStorage.setItem(paperKey, JSON.stringify({ idsKey, questions: ordered }));
        } catch {
          /* storage full — the test still works, just no offline cache */
        }
      });
  }, [idsKey, paperKey]);

  /* ---------- restore progress from this device (no network) ---------- */
  const progressKey = `class-exam:progress:${test.id}:${participantId}`;

  useEffect(() => {
    if (!participantId) return;
    let hadProgress = false;
    try {
      const raw = localStorage.getItem(progressKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.answers && typeof saved.answers === 'object') {
          setAnswers(saved.answers);
          hadProgress = Object.keys(saved.answers).length > 0;
        }
        if (saved?.flags && typeof saved.flags === 'object') setFlags(saved.flags);
        if (typeof saved?.violations === 'number') violationsRef.current = saved.violations;
      }
    } catch {
      /* ignore */
    }
    const marker = localStorage.getItem(startedKey);
    if (hadProgress || marker) setNeedsResume(true);
    localStorage.setItem(startedKey, marker ?? String(Date.now()));
    setRestored(true);
  }, [participantId, startedKey, progressKey]);

  /* ---------- persist progress locally on every change ---------- */
  useEffect(() => {
    if (!restored || submitted) return;
    try {
      localStorage.setItem(
        progressKey,
        JSON.stringify({ answers, flags, violations: violationsRef.current }),
      );
    } catch {
      /* ignore */
    }
  }, [answers, flags, restored, submitted, progressKey]);

  // Came back after the clock already ran out — submit what was saved.
  useEffect(() => {
    if (!restored || submitted || questions.length === 0) return;
    if (Date.now() >= endsAt) submitTestRef.current?.(true);
  }, [restored, submitted, questions.length, endsAt]);



  /* ---------- submit: the ONLY upload of the whole exam ---------- */
  const submitTest = useCallback(async (auto = false) => {
    if (submittingRef.current || !participantId) return;
    submittingRef.current = true;
    const current = answersRef.current;
    const currentFlags = flagsRef.current;
    const times = timesRef.current;
    const correct = questions.reduce((acc, q) => {
      const given = current[q.id];
      return acc + (given && isCorrect(q, given) ? 1 : 0);
    }, 0);

    const rows = questions
      .filter((q) => current[q.id] !== undefined && current[q.id] !== '')
      .map((q) => ({
        test_id: test.id,
        participant_id: participantId,
        question_id: q.id,
        selected_answer: current[q.id],
        is_correct: isCorrect(q, current[q.id]),
        time_ms: times[q.id] ?? null,
        flagged: !!currentFlags[q.id],
      }));

    try {
      if (rows.length > 0) {
        // one bulk write for the entire paper
        await supabase
          .from('class_test_answers')
          .upsert(rows, { onConflict: 'participant_id,question_id' });
      }
      await supabase
        .from('class_test_participants')
        .update({
          submitted_at: new Date().toISOString(),
          correct_count: correct,
          answered_count: rows.length,
          focus_violations: violationsRef.current,
        })
        .eq('id', participantId);
    } catch {
      toast.error('We could not reach the server — keep this page open and try submitting again.');
      submittingRef.current = false;
      return;
    }
    setSubmitted(true);
    if (auto) toast('Time is up — your test was submitted');
  }, [participantId, questions, test.id]);
  submitTestRef.current = submitTest;

  // Clear the crash marker once the test is really over.
  useEffect(() => {
    if (submitted) localStorage.removeItem(startedKey);
  }, [submitted, startedKey]);

  // Teacher ended the test early: submit whatever the student has so they still get a score.
  useEffect(() => {
    if (ended && !submitted) submitTest(true);
  }, [ended, submitted, submitTest]);

  const handleExpire = useCallback(() => {
    if (!submitted) submitTest(true);
  }, [submitted, submitTest]);


  /* ---------- focus lock (tablet / desktop only) ---------- */
  useEffect(() => {
    if (isMobile || submitted) return;
    // Focus moving into the Desmos calculator (or any in-page widget/iframe)
    // is not a violation — only leaving the tab/window is.
    const isInternalFocus = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return false;
      if (el.tagName === 'IFRAME') return true;
      return !!el.closest?.('[data-exam-widget], [data-calculator-window], .dcg-calculator-api-container, .dcg-container');
    };
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
    const onBlur = () => {
      // Defer so activeElement is settled after the focus transfer.
      setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          setBlurred(true);
          return;
        }
        if (document.hasFocus() || isInternalFocus()) return;
        setBlurred(true);
      }, 60);
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', onBlur);
    };
  }, [isMobile, submitted, participantId]);


  const current = questions[cursor];

  const options = useMemo<Option[]>(() => {
    if (!current?.multiple_choice_options) return [];
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

  /** Instant local update; persistence runs in the background (never awaited on tap). */
  const saveAnswer = useCallback((q: QuestionRow, value: string) => {
    setAnswers((a) => (a[q.id] === value ? a : { ...a, [q.id]: value }));
    if (!participantId) return;
    const timeMs = Date.now() - questionStartRef.current;
    const nextCount = Object.keys({ ...answersRef.current, [q.id]: value }).length;
    writeChainRef.current = writeChainRef.current
      .catch(() => {})
      .then(() =>
        Promise.all([
          supabase.from('class_test_answers').upsert(
            {
              test_id: test.id,
              participant_id: participantId,
              question_id: q.id,
              selected_answer: value,
              is_correct: isCorrect(q, value),
              time_ms: timeMs,
              flagged: !!flagsRef.current[q.id],
            },
            { onConflict: 'participant_id,question_id' },
          ),
          supabase.from('class_test_participants').update({ answered_count: nextCount }).eq('id', participantId),
        ]),
      )
      .catch(() => {});
  }, [participantId, test.id]);

  const goto = useCallback((i: number) => {
    setCursor((prev) => {
      if (i < 0 || i >= questions.length) return prev;
      questionStartRef.current = Date.now();
      return i;
    });
    setGridOpen(false);
    setReviewing(false);
  }, [questions.length]);

  const openCalculator = useCallback(() => {
    if (!calcMounted) {
      setCalcMounted(true);
      // let the calculator mount its listener before toggling it open
      setTimeout(() => toggleCalculator(), 0);
      return;
    }
    toggleCalculator();
  }, [calcMounted]);

  if (submitted) {
    return (
      <ClassTestResultScreen
        test={test}
        participantId={participantId}
        questions={questions}
        answers={answers}
        onExit={onExit}
      />
    );
  }


  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin opacity-60" />
      </div>
    );
  }

  /* ---------- crash / reload recovery gate ---------- */
  if (needsResume && restored) {
    const answeredNow = Object.keys(answers).length;
    const msLeft = Math.max(0, endsAt - Date.now());
    const mins = Math.floor(msLeft / 60000);
    const secs = Math.floor((msLeft % 60000) / 1000);
    const firstUnanswered = questions.findIndex((q) => !answers[q.id]);
    return (
      <div className="fixed inset-0 z-[70] bg-background flex items-center justify-center px-5">
        <Card className="w-full max-w-sm p-6 space-y-5 text-center">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{test.title}</div>
            <h1 className="text-xl font-semibold">Continue where you left off</h1>
            <p className="text-sm text-muted-foreground">
              Your answers were saved. Nothing is lost — the clock kept running.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Time left</div>
              <div className="text-lg font-bold font-mono">
                {mins}:{String(secs).padStart(2, '0')}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Answered</div>
              <div className="text-lg font-bold font-mono">
                {answeredNow}/{questions.length}
              </div>
            </div>
          </div>

          <Progress value={(answeredNow / questions.length) * 100} className="h-1.5" />

          <Button
            className="w-full h-11"
            onClick={() => {
              setNeedsResume(false);
              goto(firstUnanswered >= 0 ? firstUnanswered : 0);
            }}
          >
            {answeredNow > 0 ? 'Resume test' : 'Enter test'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          {firstUnanswered >= 0 && answeredNow > 0 && (
            <p className="text-[11px] text-muted-foreground">
              You'll land on question {firstUnanswered + 1}, your first unanswered one.
            </p>
          )}
        </Card>
      </div>
    );
  }


  const answeredCount = Object.keys(answers).length;
  const ids = questions.map((q) => q.id);
  const answeredMask = questions.map((q) => (answers[q.id] ? '1' : '0')).join('');
  const flaggedMask = questions.map((q) => (flags[q.id] ? '1' : '0')).join('');

  const grid = (
    <QuestionGrid ids={ids} answered={answeredMask} flagged={flaggedMask} cursor={cursor} onGoto={goto} />
  );

  return (
    <div className="fixed inset-0 z-[70] bg-background flex flex-col">
      {calcMounted && <DesmosCalculator />}
      {/* top bar */}
      <div className="border-b px-3 py-2 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{test.title}</div>
          <div className="text-xs font-medium">
            {reviewing ? 'Review your answers' : `Question ${cursor + 1} of ${questions.length}`}
          </div>
        </div>
        <ExamTimer endsAt={endsAt} paused={submitted} onExpire={handleExpire} />
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={openCalculator} aria-label="Calculator">
          <Calculator className="h-4 w-4" />
        </Button>

        {isMobile && !reviewing && (
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
        )}
      </div>

      <Progress value={(answeredCount / questions.length) * 100} className="h-1 rounded-none" />

      <div className="flex-1 min-h-0 flex">
        {/* question pane */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6">
          {reviewing ? (
            <ReviewPanel questions={questions} answers={answers} flags={flags} onGoto={goto} />
          ) : (
            <QuestionBody
              question={current}
              options={options}
              picked={answers[current.id]}
              isMobile={isMobile}
              onPick={saveAnswer}
              onType={saveAnswer}
              nextImage={questions[cursor + 1]?.question_image_url ?? null}
            />
          )}
        </div>

        {/* desktop rail */}
        {!isMobile && !reviewing && (
          <div className="w-56 shrink-0 border-l p-3 overflow-y-auto hidden md:block">
            <div className="text-xs font-semibold mb-2 text-muted-foreground">Questions</div>
            {grid}
          </div>
        )}
      </div>

      {/* bottom bar */}
      <div className="border-t px-3 py-2 flex items-center gap-2">
        {reviewing ? (
          <>
            <Button variant="outline" size={isMobile ? 'default' : 'sm'} onClick={() => goto(questions.length - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to question
            </Button>
            <div className="flex-1" />
            <Button size={isMobile ? 'default' : 'sm'} onClick={() => setConfirmOpen(true)}>
              Submit test
            </Button>
          </>
        ) : (
          <>
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
            {cursor === questions.length - 1 ? (
              <Button size={isMobile ? 'default' : 'sm'} onClick={() => setReviewing(true)}>
                Review your answers
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size={isMobile ? 'default' : 'sm'} onClick={() => goto(cursor + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
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
