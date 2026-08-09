import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MathText } from '@/components/MathText';
import { QuestionFigures } from "@/components/QuestionFigures";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Calculator, Grid3X3, Loader2, ShieldCheck, BookOpen } from 'lucide-react';
import { DesmosCalculator, toggleCalculator, useCalculatorSnap } from '@/components/student/DesmosCalculator';
import { ReferenceSheet, toggleReferenceSheet } from '@/components/student/ReferenceSheet';
import { ExamTimer } from '@/components/student/test/ExamTimer';

export interface PaperRow {
  module_id: string;
  module_number: number;
  section: string;
  time_limit_minutes: number;
  order_index: number;
  question_id: string;
  question_text: string;
  question_image_url: string | null;
  question_image_url_2: string | null;
  passage_text: string | null;
  question_type: string | null;
  multiple_choice_options: unknown;
  choice_images: unknown;
}

interface ModuleGroup {
  moduleNumber: number;
  section: string;
  minutes: number;
  rows: PaperRow[];
}

type Option = { key: string; text: string; img?: string };

function toOptions(row: PaperRow): Option[] {
  const raw = row.multiple_choice_options;
  const imgs = (row.choice_images ?? null) as Record<string, string> | null;
  let list: Array<{ key: string; text: string }> = [];
  if (Array.isArray(raw)) {
    list = raw.map((v, i) => ({ key: String.fromCharCode(65 + i), text: String(v ?? '') }));
  } else if (raw && typeof raw === 'object') {
    list = Object.entries(raw as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ key: k.toUpperCase(), text: String(v ?? '') }));
  }
  return list
    .filter((o) => o.text.trim() !== '' || imgs?.[o.key])
    .map((o) => ({ ...o, img: imgs?.[o.key] }));
}

function FillIn({ qid, initial, onCommit }: { qid: string; initial: string; onCommit: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  const t = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(t.current), []);
  return (
    <Input
      key={qid}
      placeholder="Type your answer"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        clearTimeout(t.current);
        t.current = setTimeout(() => onCommit(e.target.value), 500);
      }}
      onBlur={() => onCommit(value)}
      className="h-12 text-center text-lg font-mono"
    />
  );
}

interface Props {
  participantId: string;
  title: string;
  displayName: string;
  paper: PaperRow[];
  initialAnswers: Record<string, string>;
  initialModule: number;
  ended: boolean;
  onDone: () => void;
}

export function ProctorRunner({
  participantId, title, displayName, paper, initialAnswers, initialModule, ended, onDone,
}: Props) {
  const modules = useMemo<ModuleGroup[]>(() => {
    const map = new Map<number, ModuleGroup>();
    paper.forEach((r) => {
      const g = map.get(r.module_number) ?? {
        moduleNumber: r.module_number,
        section: r.section,
        minutes: r.time_limit_minutes ?? 35,
        rows: [],
      };
      g.rows.push(r);
      map.set(r.module_number, g);
    });
    return [...map.values()].sort((a, b) => a.moduleNumber - b.moduleNumber);
  }, [paper]);

  const startIdx = Math.max(0, modules.findIndex((m) => m.moduleNumber === initialModule));
  const [modIdx, setModIdx] = useState(startIdx === -1 ? 0 : startIdx);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [showGrid, setShowGrid] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState(0);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittedRef = useRef(false);

  const snapSide = useCalculatorSnap();
  const mod = modules[modIdx];
  const isLastModule = modIdx === modules.length - 1;
  const isMath = (mod?.section ?? '').toLowerCase().startsWith('math');

  /* ---- module clock: local per-module start, survives refresh ---- */
  const clockKey = `proctor:clock:${participantId}:${mod?.moduleNumber ?? 0}`;
  const [endsAt, setEndsAt] = useState<number>(0);
  useEffect(() => {
    if (!mod) return;
    const saved = Number(localStorage.getItem(clockKey) ?? 0);
    const start = saved > 0 ? saved : Date.now();
    if (!saved) localStorage.setItem(clockKey, String(start));
    setEndsAt(start + mod.minutes * 60_000);
    setQIdx(0);
    setReviewing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockKey, mod?.moduleNumber]);

  /* ---- autosave (debounced) ---- */
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const save = useCallback(
    (immediate = false) => {
      clearTimeout(saveTimer.current);
      const run = () => {
        localStorage.setItem(`proctor:answers:${participantId}`, JSON.stringify(answersRef.current));
        supabase.rpc('proctor_save_progress', {
          p_participant_id: participantId,
          p_answers: answersRef.current,
          p_module: mod?.moduleNumber ?? 1,
          p_violations: violations,
        });
      };
      if (immediate) run();
      else saveTimer.current = setTimeout(run, 1200);
    },
    [participantId, mod?.moduleNumber, violations],
  );

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  // Tell the server which module the student is on the moment they move into it,
  // so the teacher's monitor shows real progress even before the next answer.
  useEffect(() => {
    if (!mod || submittedRef.current) return;
    save(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod?.moduleNumber]);

  /* ---- focus discipline (teacher sees the count) ---- */
  useEffect(() => {
    const onBlur = () => {
      if (document.querySelector('[data-desmos-root]')?.contains(document.activeElement)) return;
      setViolations((v) => v + 1);
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  const pick = (qid: string, value: string) => {
    setAnswers((a) => ({ ...a, [qid]: value }));
    save();
  };

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('proctor_submit', {
      p_participant_id: participantId,
      p_answers: answersRef.current,
      p_violations: violations,
    });
    setSubmitting(false);
    if (error) {
      submittedRef.current = false;
      toast.error('Could not submit — trying again keeps your answers safe');
      return;
    }
    modules.forEach((m) => localStorage.removeItem(`proctor:clock:${participantId}:${m.moduleNumber}`));
    localStorage.removeItem(`proctor:answers:${participantId}`);
    const row = (Array.isArray(data) ? data[0] : data) as ProctorResult | undefined;
    onDone(row ?? undefined);
  }, [participantId, violations, modules, onDone]);

  // Teacher force-ended the session -> submit whatever we have.
  useEffect(() => {
    if (ended) submit();
  }, [ended, submit]);

  const nextModule = () => {
    save(true);
    if (isLastModule) return submit();
    setModIdx((i) => i + 1);
  };

  if (!mod) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        This test has no questions yet — tell your teacher.
      </div>
    );
  }

  const rows = mod.rows;
  const q = rows[qIdx];
  const answeredInModule = rows.filter((r) => (answers[r.question_id] ?? '').trim() !== '').length;
  const options = q ? toOptions(q) : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b px-4 py-2 flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur z-20">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold truncate flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" /> {title}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {displayName} · Module {mod.moduleNumber} · {mod.section}
          </div>
        </div>
        {isMath && (
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toggleCalculator()}>
              <Calculator className="h-4 w-4" /> Calc
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toggleReferenceSheet()}>
              <BookOpen className="h-4 w-4" /> <span className="hidden sm:inline">Formulas</span>
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowGrid((v) => !v)}>
          <Grid3X3 className="h-4 w-4" /> {qIdx + 1}/{rows.length}
        </Button>
        {endsAt > 0 && <ExamTimer endsAt={endsAt} paused={submitting} onExpire={nextModule} />}
      </header>

      <Progress value={(answeredInModule / Math.max(rows.length, 1)) * 100} className="h-1 rounded-none" />

      {showGrid && (
        <div className="border-b p-3 grid grid-cols-8 sm:grid-cols-11 gap-1.5">
          {rows.map((r, i) => (
            <button
              key={r.question_id}
              onClick={() => {
                setQIdx(i);
                setReviewing(false);
                setShowGrid(false);
              }}
              className={cn(
                'h-9 rounded-md border text-xs font-mono',
                (answers[r.question_id] ?? '').trim() ? 'bg-primary/15 border-primary' : 'hover:bg-muted',
                i === qIdx && 'ring-2 ring-primary',
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <main
        className="flex-1 overflow-y-auto px-4 py-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[padding]"
        style={{
          paddingLeft: snapSide === 'left' ? '40vw' : undefined,
          paddingRight: snapSide === 'right' ? '40vw' : undefined,
        }}
      >
        {reviewing ? (
          <div className="mx-auto w-full max-w-2xl space-y-4">
            <h2 className="text-lg font-semibold">Check your work — Module {mod.moduleNumber}</h2>
            <p className="text-sm text-muted-foreground">
              {answeredInModule} of {rows.length} answered. Tap any number to go back.
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
              {rows.map((r, i) => (
                <button
                  key={r.question_id}
                  onClick={() => {
                    setQIdx(i);
                    setReviewing(false);
                  }}
                  className={cn(
                    'h-10 rounded-md border text-xs font-mono',
                    (answers[r.question_id] ?? '').trim() ? 'bg-primary/15 border-primary' : 'hover:bg-muted',
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <AlertDialog>
              <AlertDialogFooter className="!justify-start">
                <Button className="w-full sm:w-auto" onClick={nextModule} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isLastModule ? 'Submit test' : 'Start next module'}
                </Button>
              </AlertDialogFooter>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit?</AlertDialogTitle>
                  <AlertDialogDescription>You cannot come back to this module.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Back</AlertDialogCancel>
                  <AlertDialogAction onClick={nextModule}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : q ? (
          <div className="mx-auto w-full max-w-2xl space-y-4">
            {q.passage_text && (
              <Card className="p-3 text-sm bg-muted/30">
                <MathText text={q.passage_text} />
              </Card>
            )}
            <div className="font-medium text-base sm:text-lg">
              <MathText text={q.question_text} />
            </div>
            <QuestionFigures
              url1={q.question_image_url}
              url2={q.question_image_url_2}
              imgClassName="rounded-md max-h-72"
            />
            {options.length > 0 ? (
              <div className="grid gap-2">
                {options.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => pick(q.question_id, opt.key)}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 flex gap-3 items-start transition-colors',
                      answers[q.question_id] === opt.key ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
                    )}
                  >
                    <span className="font-bold shrink-0">{opt.key}.</span>
                    <span className="flex-1 min-w-0 space-y-2">
                      <MathText text={opt.text} />
                      {opt.img && <img src={opt.img} alt={`Choice ${opt.key}`} loading="lazy" className="max-h-40 rounded" />}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <FillIn
                qid={q.question_id}
                initial={answers[q.question_id] ?? ''}
                onCommit={(v) => pick(q.question_id, v)}
              />
            )}
          </div>
        ) : null}
      </main>

      <footer className="border-t p-3 flex items-center gap-2 sticky bottom-0 bg-background">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={qIdx === 0 || reviewing}
          onClick={() => setQIdx((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex-1" />
        {reviewing ? (
          <Button size="sm" variant="ghost" onClick={() => setReviewing(false)}>
            Keep working
          </Button>
        ) : qIdx === rows.length - 1 ? (
          <Button size="sm" className="gap-1" onClick={() => setReviewing(true)}>
            Review answers <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" className="gap-1" onClick={() => setQIdx((i) => Math.min(rows.length - 1, i + 1))}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </footer>

      <DesmosCalculator />
      <ReferenceSheet />
    </div>
  );
}
