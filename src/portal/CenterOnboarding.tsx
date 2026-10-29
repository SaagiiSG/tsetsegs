import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, ClipboardCheck, Goal, PenLine, Scale, Sparkles, Target, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { MathText } from '@/components/MathText';
import { QuestionFigures } from '@/components/QuestionFigures';
import { ExplanationView } from '@/components/explanation/ExplanationView';
import { normaliseChoices } from '@/lib/bluebookReview';
import { cn } from '@/lib/utils';
import { computeGoals, type GoalIntensity } from '@/hooks/useDailyGoals';
import { CenterLogo, centerDisplayName, useCenter } from './centerContext';
import { INTENSITIES, useCenterDailyProgress, type CenterGoals } from './CenterDailyGoals';
import { MiniRing, SKY_RING } from './CenterStreak';
import { AURORA } from './SkyDepth';
import { SkyCardSkeleton } from './SkySkeleton';
import { isCorrect } from './LiveSession';
import { centerSatProgress } from './centerSatSimulation';
import type { QMeta } from './questionMeta';
import { canSkip, defaultIntensity, helpMePick, questionSubjects, ringPlanCopy, satDateOptions, stepSixMessage, welcomeCopy } from './onboarding';

export type RecordFn = (questionId: string, ok: boolean, seconds?: number, answer?: string) => Promise<{ is_correct: boolean; points: number } | null>;
type Attempt = { question_id: string; is_correct: boolean; created_at: string; time_spent_seconds: number | null };
type Patch = Omit<TablesInsert<'tenant_student_goals'>, 'student_id' | 'institution_id'>;
type Q = { id: string; question_text: string; question_image_url: string | null; question_image_url_2: string | null; figure_svg: string | null; figure_description: string | null; multiple_choice_options: unknown; choice_images: unknown; answer: string; alternate_answers: unknown; rationale: string | null; passage_text: string | null; difficulty_level: string | null };
const COLS = 'id, question_text, question_image_url, question_image_url_2, figure_svg, figure_description, multiple_choice_options, choice_images, answer, alternate_answers, rationale, passage_text, difficulty_level';
const SECTIONS = [['math', 'Math'], ['reading_writing', 'Reading and Writing'], ['same', 'About the same']] as const;
/** One lucide tile per step for the picture side. */
const ART = [[Sparkles, 'sky-tile-violet'], [CalendarDays, 'sky-tile-blue'], [ClipboardCheck, 'sky-tile-orange'], [Target, 'sky-tile-pink'], [Scale, 'sky-tile-violet']] as const;
const SAVE_ERROR = "We couldn't save that. Check your connection and try again.";

function Choice({ on, onClick, disabled, children }: { on: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick}
      className={cn('flex w-full min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-medium transition-[background-color,border-color,transform] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:active:scale-100',
        on ? 'border-primary bg-primary/10' : 'border-transparent bg-card shadow-sm hover:bg-muted/60')}>
      {children}
    </button>
  );
}

/** First-run flow for a new center student: answers save as they go, step 7 sets the daily ring. */
export function CenterOnboarding({ studentId, attempts, meta, start, satMonth, goals, record }: { studentId: string; attempts: Attempt[]; meta: Record<string, QMeta>; start: number; satMonth: string | null; goals: CenterGoals | undefined; record: RecordFn }) {
  const { center, name, signOut } = useCenter();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const titleId = useId();
  const title = useRef<HTMLHeadingElement>(null);
  const dates = useMemo(() => satDateOptions(new Date(), satMonth), [satMonth]);
  const [step, setStep] = useState(start);
  const [saving, setSaving] = useState(false);
  // undefined = not answered yet, null = "Not sure yet".
  const [satDate, setSatDate] = useState<string | null | undefined>(goals?.sat_date ?? dates.prefill ?? undefined);
  const [savedSat, setSavedSat] = useState(goals?.sat_date ?? null); // a skipped step 2 saves no date
  const [prior, setPrior] = useState<'no' | 'yes' | null>(goals?.prior_score != null ? 'yes' : null);
  const [priorText, setPriorText] = useState(goals?.prior_score != null ? String(goals.prior_score) : '');
  const [target, setTarget] = useState(goals?.target_score ?? 1300);
  const [weak, setWeak] = useState(goals?.weak_section ?? null);
  const [pace, setPace] = useState<GoalIntensity | null>(null);
  const [q, setQ] = useState<Q | null | undefined>(undefined);
  const [picked, setPicked] = useState('');
  const [tries, setTries] = useState(0);
  const [solved, setSolved] = useState(false); // correct, or both tries used
  const [msg, setMsg] = useState('');
  const [answerFailed, setAnswerFailed] = useState(false); // the last step-6 answer didn't save: offer Skip
  const startedAt = useRef(0);

  const priorNum = Number(priorText);
  const priorOk = Number.isInteger(priorNum) && priorNum >= 400 && priorNum <= 1600; // tenant_student_goals CHECK
  const priorScore = prior === 'yes' && priorOk ? priorNum : null;
  const daysTo = (d: string | null | undefined) => (d ? Math.ceil((new Date(`${d}T00:00:00`).getTime() - Date.now()) / 86400000) : null);
  const days = daysTo(savedSat), shownDays = daysTo(satDate);
  const intensity = pace ?? defaultIntensity(days);
  const vals = computeGoals(intensity, days);
  const prog = useCenterDailyProgress(studentId, attempts, meta);

  useEffect(() => { title.current?.focus(); }, [step]);

  useEffect(() => {
    if (step !== 6) return;
    let live = true;
    (async () => {
      const base = () => supabase.from('intl_questions').select(COLS, { count: 'exact' }).eq('is_active', true).eq('hide_from_practice', false)
        .in('subject', questionSubjects(weak)).ilike('difficulty_level', 'medium');
      const { count } = await base().range(0, 0);
      const off = Math.floor(Math.random() * Math.max(1, (count ?? 0) - 20));
      const { data } = await base().range(off, off + 19);
      const seen = new Set(attempts.map(a => a.question_id));
      const pool = ((data ?? []) as unknown as Q[]).filter(x => !seen.has(x.id) && normaliseChoices(x.multiple_choice_options, x.choice_images).length);
      if (!live) return;
      setQ(pool.find(x => x.rationale) ?? pool[0] ?? null);
      startedAt.current = Date.now();
    })();
    return () => { live = false; };
    // Load once on reaching step 6: answering adds attempts and must not swap the question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const save = async (patch: Patch, next: number) => {
    setSaving(true);
    const { error } = await supabase.from('tenant_student_goals').upsert({ student_id: studentId, institution_id: center.id, onboarding_step: next, ...patch });
    if (error) toast.error(SAVE_ERROR);
    else if (patch.onboarding_done_at) {
      const done = patch.onboarding_done_at;
      // Cache the finished row so the gate opens home even if the refetch fails.
      qc.setQueryData<CenterGoals>(['center-goals', studentId], old => old && { ...old, ...vals, intensity, sat_date: savedSat, isSet: true, onboarding_step: 7, onboarding_done_at: done });
      qc.invalidateQueries({ queryKey: ['center-goals', studentId] });
      navigate('/student', { replace: true });
    } else {
      if ('sat_date' in patch) setSavedSat(patch.sat_date ?? null);
      setStep(next);
    }
    setSaving(false);
  };

  const check = async () => {
    if (!q) return;
    const tryNo = tries === 0 ? 1 : 2;
    setSaving(true);
    const res = await record(q.id, isCorrect(q, picked), (Date.now() - startedAt.current) / 1000, picked);
    setSaving(false);
    setMsg(stepSixMessage(res, tryNo, q.difficulty_level));
    setAnswerFailed(!res);
    if (!res) return; // not saved: same try again
    setTries(tryNo);
    if (res.is_correct || tryNo === 2) setSolved(true); else setPicked('');
  };

  const finish = () => { const at = new Date().toISOString(); save({ ...vals, intensity, set_at: at, onboarding_done_at: at }, 7); };
  const action: { label: string; ready: boolean; run: () => void } =
    step === 1 ? { label: 'Start', ready: true, run: () => save({}, 2) }
    : step === 2 ? { label: 'Continue', ready: satDate !== undefined, run: () => save({ sat_date: satDate ?? null }, 3) }
    : step === 3 ? { label: 'Continue', ready: prior === 'no' || priorScore != null, run: () => save({ prior_score: priorScore }, 4) }
    : step === 4 ? { label: 'Continue', ready: true, run: () => save({ target_score: target }, 5) }
    : step === 5 ? { label: 'Continue', ready: !!weak, run: () => save({ weak_section: weak }, 6) }
    : step === 6 ? (q === null || solved ? { label: 'Continue', ready: true, run: () => save({}, 7) } : { label: 'Check', ready: !!q && !!picked, run: check })
    : { label: "I'm in", ready: true, run: finish };

  const first = name.split(' ')[0];
  const titles = [first ? `Welcome, ${first}` : 'Welcome', 'When is your SAT?', 'Taken a practice SAT?', 'Target score', 'Which part feels harder?', 'Try one real SAT question', 'Set your daily ring'];
  // The picture side echoes the latest answer: [big value, caption].
  const [answer, caption]: [string | null, string] =
    step === 2 ? [shownDays != null && shownDays >= 0 ? String(shownDays) : null, shownDays === 1 ? 'day to your SAT' : 'days to your SAT']
    : step === 3 ? [priorScore != null ? String(priorScore) : prior === 'no' ? 'Not yet' : null, priorScore != null ? 'practice score' : '']
    : step === 4 ? [String(target), 'target score']
    : step === 5 ? [SECTIONS.find(s => s[0] === weak)?.[1] ?? null, 'feels harder']
    : [null, ''];
  const ring: [number, number, number] = [prog.speed / vals.speed, prog.hard / vals.hard, prog.medium / vals.medium];
  const [Icon, tile] = ART[Math.min(step, 5) - 1];
  const choices = q ? normaliseChoices(q.multiple_choice_options, q.choice_images) : [];

  return (
    <div className="student-theme customer-student-theme min-h-dvh overflow-x-clip">
      <Progress value={(step / 7) * 100} aria-label="Onboarding progress" className="fixed inset-x-0 top-0 z-50 !h-1 !rounded-none bg-primary/15" />
      <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
        <aside aria-hidden className="sky-decor relative flex h-28 items-center justify-between gap-4 overflow-hidden px-5 lg:sticky lg:top-0 lg:h-dvh lg:flex-col lg:items-stretch lg:p-10"
          style={{ '--wave': `url(${AURORA})`, background: 'linear-gradient(160deg, hsl(var(--primary) / .22), hsl(var(--primary) / .04))' } as React.CSSProperties}>
          <div className="flex items-center gap-3"><CenterLogo center={center} className="h-10 w-10 lg:h-12 lg:w-12" /><p className="hidden font-semibold lg:block">{centerDisplayName(center)}</p></div>
          <div className="flex items-center gap-4 lg:flex-1 lg:flex-col lg:justify-center lg:gap-6">
            {step >= 6 ? (<>
              <span className="lg:hidden"><MiniRing size={72} p={ring} colors={SKY_RING} stroke={7} /></span>
              <span className="hidden lg:block"><MiniRing size={220} p={ring} colors={SKY_RING} stroke={20} gap={6} /></span>
            </>) : (<>
              <span className={`sky-tile ${tile} lg:h-20 lg:w-20 lg:[&_svg]:h-10 lg:[&_svg]:w-10`}><Icon /></span>
              {answer && <div className="text-right lg:text-center">
                <p className={cn('font-bold leading-none', /^\d+$/.test(answer) ? 'font-mono text-4xl lg:text-8xl' : 'text-xl lg:text-4xl')}>{answer}</p>
                {caption && <p className="mt-1 text-xs sky-body lg:mt-3 lg:text-base">{caption}</p>}
              </div>}
            </>)}
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-col">
          {/* Shared phones and wrong accounts need a way out before onboarding is done. */}
          <Button variant="ghost" size="sm" className="absolute right-2 top-0 h-8 text-muted-foreground lg:top-3" onClick={signOut}>Log out</Button>
          <div key={step} className="mx-auto w-full max-w-md flex-1 space-y-6 px-5 pt-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 lg:pt-[16vh]">
            <h1 id={titleId} ref={title} tabIndex={-1} className="text-3xl font-bold outline-none lg:text-4xl">{titles[step - 1]}</h1>
            {step === 1 && <p className="text-lg sky-body">{welcomeCopy(centerDisplayName(center))}</p>}
            {step === 2 && <div role="group" aria-labelledby={titleId} className="grid gap-2">
              {dates.options.map(o => <Choice key={o.value} on={satDate === o.value} onClick={() => setSatDate(o.value)}>{o.label}</Choice>)}
              <Choice on={satDate === null} onClick={() => setSatDate(null)}>Not sure yet</Choice>
            </div>}
            {step === 3 && <div className="space-y-3">
              <div role="group" aria-labelledby={titleId} className="grid gap-2">
                <Choice on={prior === 'no'} onClick={() => setPrior('no')}>Not yet</Choice>
                <Choice on={prior === 'yes'} onClick={() => setPrior('yes')}>Yes, about</Choice>
              </div>
              {prior === 'yes' && <>
                <Input autoFocus type="number" inputMode="numeric" min={400} max={1600} step={10} aria-label="Practice SAT score" placeholder="Your score"
                  value={priorText} onChange={e => setPriorText(e.target.value)} className="h-14 font-mono text-xl" />
                {priorText && !priorOk && <p className="text-sm text-status-risk">Enter a score from 400 to 1600.</p>}
              </>}
            </div>}
            {step === 4 && <div className="space-y-5">
              <Slider min={1000} max={1600} step={50} value={[target]} onValueChange={([v]) => setTarget(v)} aria-label="Target score" className="py-2" />
              <div className="flex justify-between font-mono text-xs sky-body"><span>1000</span><span>1600</span></div>
              <Button variant="outline" className="rounded-full" onClick={() => setTarget(helpMePick(priorScore))}><Wand2 className="h-4 w-4" />Help me pick</Button>
            </div>}
            {step === 5 && <div role="group" aria-labelledby={titleId} className="grid gap-2">
              {SECTIONS.map(([v, l]) => <Choice key={v} on={weak === v} onClick={() => setWeak(v)}>{l}</Choice>)}
            </div>}
            {step === 6 && (q === undefined ? <SkyCardSkeleton lines={4} /> : q === null ? <p className="sky-body">We couldn't load a question right now. You'll find plenty in Practice.</p> : (
              <div className="space-y-4">
                <div className="sky-card space-y-4">
                  {q.passage_text && <div className="border-l-2 pl-4 text-sm leading-relaxed"><MathText text={q.passage_text} /></div>}
                  <div className="leading-relaxed"><MathText text={q.question_text} /></div>
                  <QuestionFigures svg={q.figure_svg} description={q.figure_description} url1={q.question_image_url} url2={q.question_image_url_2} className="justify-start" imgClassName="max-h-64 rounded border bg-background" />
                  <div role="group" aria-label="Answer choices" className="grid gap-2">
                    {choices.map(c => <Choice key={c.letter} on={picked === c.letter} disabled={solved || saving} onClick={() => setPicked(c.letter)}>
                      <span className="w-5 font-mono text-sm">{c.letter}</span><span className="min-w-0 flex-1 font-normal">{c.image ? <img src={c.image} alt={`Choice ${c.letter}`} className="max-h-40" /> : <MathText text={c.text} />}</span>
                    </Choice>)}
                  </div>
                </div>
                {msg && <p role="status" className="font-semibold">{msg}</p>}
                {tries > 0 && q.rationale && <div className="sky-card"><ExplanationView text={q.rationale} /></div>}
              </div>
            ))}
            {step === 7 && <div className="space-y-4">
              <div role="group" aria-labelledby={titleId} className="grid gap-2">
                {INTENSITIES.map(({ key, label, blurb, icon: I }) => <Choice key={key} on={intensity === key} onClick={() => setPace(key)}>
                  <I className="h-5 w-5 shrink-0" /><span><span className="block">{label}</span><span className="block text-sm font-normal sky-body">{blurb}</span></span>
                </Choice>)}
              </div>
              <p className="sky-body">{ringPlanCopy(vals, centerSatProgress(attempts, meta), weak)} You can change it any time.</p>
            </div>}
          </div>
          <div className="sticky bottom-0 pb-[env(safe-area-inset-bottom)]" style={{ background: 'linear-gradient(hsl(var(--student-canvas) / 0), hsl(var(--student-canvas)) 35%)' }}>
            <div className="mx-auto flex w-full max-w-md gap-2 px-5 py-4 lg:pb-12">
              {step >= 2 && <Button variant="ghost" size="lg" className="h-12 rounded-full" disabled={saving} onClick={() => setStep(step === 7 ? 5 : step - 1)}>Back</Button>}
              {canSkip(step, answerFailed) && <Button variant="ghost" size="lg" className="h-12 rounded-full" disabled={saving} onClick={() => save({}, step + 1)}>Skip</Button>}
              <Button size="lg" className="h-12 flex-1 rounded-full text-base" disabled={!action.ready || saving} onClick={action.run}>{action.label}<ArrowRight className="h-5 w-5" /></Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
