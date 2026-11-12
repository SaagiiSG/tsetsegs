import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, MotionConfig, motion, useReducedMotion, type Variants } from 'framer-motion';
import Lenis from 'lenis';
import { ArrowRight, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Flower, PART, RollingNumber, SkyClouds } from './OnboardingSky';
import { SkyCardSkeleton } from './SkySkeleton';
import { isCorrect } from './LiveSession';
import { centerSatProgress } from './centerSatSimulation';
import type { QMeta } from './questionMeta';
import { autoAdvances, backStep, canSkip, defaultIntensity, helpMePick, helpMePickReason, planProfile, questionSubjects, ringPlanCopy, satDateOptions, stepSixMessage, welcomeCopy } from './onboarding';
import { freeDraw, useSoloPlan } from './soloPlan';
import { SoloLock } from './SoloLock';

export type RecordFn = (questionId: string, ok: boolean, seconds?: number, answer?: string) => Promise<{ is_correct: boolean; points: number } | null>;
type Attempt = { question_id: string; is_correct: boolean; created_at: string; time_spent_seconds: number | null };
type Patch = Omit<TablesInsert<'tenant_student_goals'>, 'student_id' | 'institution_id'>;
type Q = { id: string; question_text: string; question_image_url: string | null; question_image_url_2: string | null; figure_svg: string | null; figure_description: string | null; multiple_choice_options: unknown; choice_images: unknown; answer: string; alternate_answers: unknown; rationale: string | null; passage_text: string | null; difficulty_level: string | null };
const COLS = 'id, question_text, question_image_url, question_image_url_2, figure_svg, figure_description, multiple_choice_options, choice_images, answer, alternate_answers, rationale, passage_text, difficulty_level';
const SECTIONS = [['math', 'Math'], ['reading_writing', 'Reading and Writing'], ['same', 'About the same']] as const;
const SAVE_ERROR = "We couldn't save that. Check your connection and try again.";
const AUTO_ADVANCE_MS = 350; // long enough to see the card pop before the step moves on

const SOFT = { type: 'spring', visualDuration: 0.5, bounce: 0.16 } as const;
const POP = { type: 'spring', stiffness: 520, damping: 26 } as const;
// A step rises in and drifts up on its way out; `custom` is the direction (1 forward, -1 Back), which flips both.
const STEP: Variants = {
  enter: (d: number) => ({ opacity: 0, y: 28 * d }),
  show: { opacity: 1, y: 0, transition: { ...SOFT, staggerChildren: 0.04, delayChildren: 0.03 } },
  exit: (d: number) => ({ opacity: 0, y: -22 * d, transition: { duration: 0.16, ease: 'easeIn' } }),
};
// The title, then each choice, cascades in under STEP's stagger.
const ITEM: Variants = { enter: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: SOFT } };

function Choice({ on, onClick, disabled, children }: { on: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <motion.button type="button" aria-pressed={on} disabled={disabled} onClick={onClick} variants={ITEM} transition={POP}
      whileHover={disabled ? undefined : { y: -2 }} whileTap={disabled ? undefined : { scale: 0.97 }}
      className={cn('flex w-full min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-medium transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        on ? 'border-primary bg-primary/10' : 'border-transparent bg-card shadow-sm hover:shadow-md')}>
      {children}
      <span aria-hidden className={cn('ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }} transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }} />
        </svg>
      </span>
    </motion.button>
  );
}

/** First-run flow for a new center student: answers save as they go, step 7 sets the daily ring. */
export function CenterOnboarding({ studentId, attempts, meta, start, satMonth, goals, record }: { studentId: string; attempts: Attempt[]; meta: Record<string, QMeta>; start: number; satMonth: string | null; goals: CenterGoals | undefined; record: RecordFn }) {
  const { center, name, isSolo, signOut } = useCenter();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const plan = useSoloPlan();
  const reduce = useReducedMotion();
  const titleId = useId();
  const dates = useMemo(() => satDateOptions(new Date(), satMonth), [satMonth]);
  const [step, setStep] = useState(start);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);
  const [parting, setParting] = useState(false); // the clouds part after the finish saves, then home opens
  // undefined = not answered yet, null = "Not sure yet".
  const [satDate, setSatDate] = useState<string | null | undefined>(goals?.sat_date ?? dates.prefill ?? undefined);
  const [savedSat, setSavedSat] = useState(goals?.sat_date ?? null); // a skipped step 2 saves no date
  const [prior, setPrior] = useState<'no' | 'yes' | null>(goals?.prior_score != null ? 'yes' : null);
  const [priorText, setPriorText] = useState(goals?.prior_score != null ? String(goals.prior_score) : '');
  const [target, setTarget] = useState(goals?.target_score ?? 1300);
  const [why, setWhy] = useState(''); // "Help me pick" says why, so it gives feedback even when the pick is the current target
  const [nod, setNod] = useState(0); // each pick pulses the flower once
  const [glide, setGlide] = useState(false); // the slider eases to a pick instead of jumping; a drag turns it off
  const [weak, setWeak] = useState(goals?.weak_section ?? null);
  const [pace, setPace] = useState<GoalIntensity | null>(null);
  const [q, setQ] = useState<Q | null | undefined>(undefined);
  const [picked, setPicked] = useState('');
  const [tries, setTries] = useState(0);
  const [solved, setSolved] = useState(false); // correct, or both tries used
  const [msg, setMsg] = useState('');
  const [answerFailed, setAnswerFailed] = useState(false); // the last step-6 answer didn't save: offer Skip
  const startedAt = useRef(0);
  const lenis = useRef<Lenis | null>(null);
  const page = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLElement | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const choicesRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);
  const timer = useRef(0);

  const priorNum = Number(priorText);
  const priorOk = Number.isInteger(priorNum) && priorNum >= 400 && priorNum <= 1600; // tenant_student_goals CHECK
  const priorScore = prior === 'yes' && priorOk ? priorNum : null;
  const daysTo = (d: string | null | undefined) => (d ? Math.ceil((new Date(`${d}T00:00:00`).getTime() - Date.now()) / 86400000) : null);
  const days = daysTo(savedSat), shownDays = daysTo(satDate);
  const intensity = pace ?? defaultIntensity(days);
  const vals = computeGoals(intensity, days);
  const prog = useCenterDailyProgress(studentId, attempts, meta);

  // Each step's title takes focus as it mounts (after the old step has left), and the new step starts at the top.
  const focusTitle = useCallback((el: HTMLHeadingElement | null) => {
    if (!el) return;
    if (lenis.current) lenis.current.scrollTo(0, { immediate: true }); else scroller.current?.scrollTo(0, 0);
    el.focus({ preventScroll: true });
  }, []);

  // Smooth scrolling, mostly for step 6's long question on phones. Off for reduced motion. The portal scrolls inside #root
  // (html, body and #root are all 100% tall), not the window, so Lenis drives the nearest scrolling ancestor.
  useEffect(() => {
    let el = page.current?.parentElement ?? null;
    while (el && !/auto|scroll/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
    scroller.current = el ?? document.documentElement;
    if (reduce) return;
    const l = new Lenis({ wrapper: scroller.current, content: page.current! });
    let frame = requestAnimationFrame(function raf(time: number) { l.raf(time); frame = requestAnimationFrame(raf); });
    lenis.current = l;
    return () => { cancelAnimationFrame(frame); l.destroy(); lenis.current = null; };
  }, [reduce]);

  /** Scrolls just enough that `el`'s bottom clears the sticky action bar. */
  const reveal = (el: Element | null) => {
    const sc = scroller.current;
    if (!el || !bar.current || !sc) return;
    const gap = el.getBoundingClientRect().bottom - bar.current.getBoundingClientRect().top + 16;
    if (gap <= 0) return;
    if (!lenis.current) { sc.scrollTop += gap; return; }
    lenis.current.resize(); // the content just grew; a stale limit would clamp the scroll short
    lenis.current.scrollTo(sc.scrollTop + gap, { duration: 0.8 });
  };
  useEffect(() => { if (msg) reveal(msgRef.current); }, [msg]);

  // A pending auto-advance belongs to the step it was tapped on.
  useEffect(() => () => clearTimeout(timer.current), [step]);

  useEffect(() => {
    if (step !== 6 || q) return; // coming back to step 6 keeps the question and the answer
    let live = true;
    (async () => {
      const scope = await freeDraw(plan.premium);
      const base = () => scope(supabase.from('intl_questions').select(COLS, { count: 'exact' }).eq('is_active', true).eq('hide_from_practice', false)
        .in('subject', questionSubjects(weak)).ilike('difficulty_level', 'medium'));
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

  const goTo = (next: number) => { setDir(next < step ? -1 : 1); setStep(next); };

  const save = async (patch: Patch, next: number) => {
    setSaving(true);
    const { error } = await supabase.from('tenant_student_goals').upsert({ student_id: studentId, institution_id: center.id, onboarding_step: next, ...patch });
    if (error) toast.error(SAVE_ERROR);
    else if (patch.onboarding_done_at) {
      const done = patch.onboarding_done_at;
      // Saved: let the clouds part first, since caching the finished row below unmounts this screen.
      if (!reduce) { setParting(true); await new Promise(r => setTimeout(r, 750)); }
      // Cache the finished row so the gate opens home even if the refetch fails.
      qc.setQueryData<CenterGoals>(['center-goals', studentId], old => old && { ...old, ...vals, intensity, sat_date: savedSat, isSet: true, onboarding_step: 7, onboarding_done_at: done });
      qc.invalidateQueries({ queryKey: ['center-goals', studentId] });
      navigate('/student', { replace: true });
    } else {
      if ('sat_date' in patch) setSavedSat(patch.sat_date ?? null);
      goTo(next);
    }
    setSaving(false);
  };

  const check = async () => {
    if (!q) return;
    const tryNo = tries === 0 ? 1 : 2;
    setSaving(true);
    const res = await record(q.id, isCorrect(q, picked), (Date.now() - startedAt.current) / 1000, picked);
    setSaving(false);
    setMsg(stepSixMessage(res, tryNo, q.difficulty_level, !plan.premium));
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
  // The timer runs the action of the render after the tap, so it saves exactly what Continue would, newest tap included.
  const latest = useRef(action);
  latest.current = action;
  /** Picks a choice; a one-tap answer moves on after the pop unless another tap replaces it first. */
  const tap = (choice: string | null, pick: () => void) => {
    pick();
    clearTimeout(timer.current);
    if (autoAdvances(step, choice)) timer.current = window.setTimeout(() => latest.current.run(), AUTO_ADVANCE_MS);
  };
  const now = (run: () => void) => () => { clearTimeout(timer.current); run(); }; // a button press replaces a pending auto-advance
  const pickTarget = () => { setGlide(true); setTarget(helpMePick(priorScore)); setWhy(helpMePickReason(priorScore)); setNod(n => n + 1); };

  const first = name.split(' ')[0];
  const titles = [first ? `Welcome, ${first}` : 'Welcome', 'When is your SAT?', 'Taken a practice SAT?', 'Target score', 'Which part feels harder?', 'Try one real SAT question'];
  const [lead, profile] = planProfile(intensity);
  // The sky echoes the latest answer: [big value, caption].
  const [answer, caption]: [string | null, string] =
    step === 2 ? [shownDays != null && shownDays >= 0 ? String(shownDays) : null, shownDays === 1 ? 'day to your SAT' : 'days to your SAT']
    : step === 3 ? [priorScore != null ? String(priorScore) : prior === 'no' ? 'Not yet' : null, priorScore != null ? 'practice score' : '']
    : step === 4 ? [String(target), 'target score']
    : step === 5 ? [SECTIONS.find(s => s[0] === weak)?.[1] ?? null, 'feels harder']
    : [null, ''];
  const isNum = answer != null && /^\d+$/.test(answer);
  // Steps 1-3 open the bud a little each; from step 4 the target sets the bloom (a bud at 1000, full at 1600).
  const bloom = step <= 3 ? (step - 1) * 0.12 : Math.min(1, Math.max(0, (target - 1000) / 600));
  const ring: [number, number, number] = [prog.speed / vals.speed, prog.hard / vals.hard, prog.medium / vals.medium];
  const choices = q ? normaliseChoices(q.multiple_choice_options, q.choice_images) : [];

  return (
    <MotionConfig reducedMotion="user">
    <div ref={page} className="student-theme customer-student-theme min-h-dvh overflow-x-clip">
      <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
        <aside aria-hidden className="onb-sky relative h-36 overflow-hidden rounded-b-[2rem] lg:sticky lg:top-3 lg:m-3 lg:h-[calc(100dvh-1.5rem)] lg:rounded-[2rem]">
          <SkyClouds step={step} parting={parting} />
          <div className="relative z-40 flex items-center gap-3 p-5 lg:p-8"><CenterLogo center={center} className="h-10 w-10 lg:h-11 lg:w-11" /><p className="hidden font-semibold lg:block">{centerDisplayName(center)}</p></div>
          {/* Positioning, framer's transform and the CSS sway/float each need their own element. */}
          <div className="absolute -bottom-3 right-3 z-20 h-40 lg:-bottom-10 lg:left-1/2 lg:right-auto lg:h-[min(54vh,32rem)] lg:-translate-x-1/2">
            <motion.div className="h-full" initial={false} animate={parting ? { y: -16, scale: 1.04 } : { y: 0, scale: 1 }} transition={PART}>
              <Flower bloom={bloom} nod={nod} className="h-full w-auto" />
            </motion.div>
          </div>
          <div className="absolute right-28 top-1/2 z-40 -translate-y-1/2 text-right lg:inset-x-8 lg:top-[12%] lg:translate-y-0 lg:text-center"><div className="onb-float">
            <AnimatePresence mode="wait" initial={false}>
              {step >= 6 ? (
                <motion.div key={step} className="flex flex-col items-end lg:items-center" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={SOFT}>
                  {/* A frosted disc gives the ring a surface; on bare sky its pale tracks read as a blur. */}
                  <span className="rounded-full bg-white/75 p-1.5 shadow-[0_16px_40px_-18px_hsl(220_60%_35%/.45)] backdrop-blur-sm dark:bg-white/[.06] lg:p-4">
                    <span className="lg:hidden"><MiniRing size={72} p={ring} colors={SKY_RING} stroke={7} reveal={!reduce} /></span>
                    <span className="hidden lg:block"><MiniRing size={168} p={ring} colors={SKY_RING} stroke={16} gap={5} reveal={!reduce} /></span>
                  </span>
                  <p className="mt-1 hidden text-xs sky-body lg:mt-4 lg:block lg:text-lg">your daily ring</p>
                </motion.div>
              ) : answer && (
                <motion.div key={isNum ? step : `${step}${answer}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }} transition={SOFT}>
                  <p className={cn('font-chillax font-semibold leading-none', isNum ? 'text-5xl lg:text-8xl' : 'text-2xl lg:text-5xl')}>
                    {isNum ? <RollingNumber value={Number(answer)} from={step === 2 ? 0 : undefined} /> : answer}
                  </p>
                  {caption && <p className="mt-1 text-xs sky-body lg:mt-3 lg:text-lg">{caption}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </div></div>
        </aside>

        <main className="relative flex min-w-0 flex-col">
          {/* Shared phones and wrong accounts need a way out before onboarding is done. */}
          <Button variant="ghost" size="sm" className="absolute right-2 top-3 z-10 h-8 text-muted-foreground lg:right-5 lg:top-6" onClick={signOut}>Log out</Button>
          <motion.div className="mx-auto w-full max-w-md flex-1 px-5 pt-3 lg:pt-[14vh]" animate={{ opacity: parting ? 0 : 1 }} transition={{ duration: 0.4 }}>
            <div className="flex h-8 items-center">
              <div role="progressbar" aria-label="Onboarding progress" aria-valuemin={1} aria-valuemax={7} aria-valuenow={step} aria-valuetext={`Step ${step} of 7`} className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map(i => <motion.span key={i} className="h-1.5 rounded-full bg-primary" initial={false}
                  animate={{ width: i === step ? 22 : 6, opacity: i <= step ? 1 : 0.2 }} transition={{ type: 'spring', visualDuration: 0.45, bounce: 0.2 }} />)}
              </div>
            </div>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} variants={STEP} initial="enter" animate="show" exit="exit" className="space-y-6 pb-4 pt-6">
                <motion.h1 variants={ITEM} id={titleId} ref={focusTitle} tabIndex={-1} className="text-3xl font-bold outline-none lg:text-4xl">
                  {step < 7 ? titles[step - 1] : (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={profile} className="block" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                        {lead} <span className="text-primary">{profile}</span>
                      </motion.span>
                    </AnimatePresence>
                  )}
                </motion.h1>
                {step === 1 && <motion.p variants={ITEM} className="text-lg sky-body">{welcomeCopy(centerDisplayName(center), isSolo)}</motion.p>}
                {step === 2 && <div role="group" aria-labelledby={titleId} className="grid gap-2">
                  {dates.options.map(o => <Choice key={o.value} on={satDate === o.value} disabled={saving} onClick={() => tap(o.value, () => setSatDate(o.value))}>{o.label}</Choice>)}
                  <Choice on={satDate === null} disabled={saving} onClick={() => tap(null, () => setSatDate(null))}>Not sure yet</Choice>
                </div>}
                {step === 3 && <div className="space-y-3">
                  <div role="group" aria-labelledby={titleId} className="grid gap-2">
                    <Choice on={prior === 'no'} disabled={saving} onClick={() => tap('no', () => setPrior('no'))}>Not yet</Choice>
                    <Choice on={prior === 'yes'} disabled={saving} onClick={() => tap('yes', () => setPrior('yes'))}>Yes, about</Choice>
                  </div>
                  {prior === 'yes' && <motion.div variants={ITEM} className="space-y-2">
                    <Input autoFocus type="number" inputMode="numeric" min={400} max={1600} step={10} aria-label="Practice SAT score" placeholder="Your score"
                      value={priorText} onChange={e => setPriorText(e.target.value)} className="h-14 font-mono text-xl" />
                    {priorText && !priorOk && <p className="text-sm text-status-risk">Enter a score from 400 to 1600.</p>}
                  </motion.div>}
                </div>}
                {step === 4 && <div className="space-y-5">
                  <motion.div variants={ITEM}>
                    <Slider min={1000} max={1600} step={50} value={[target]} onValueChange={([v]) => { setGlide(false); setTarget(v); setWhy(''); }} aria-label="Target score"
                      className={cn('py-3', glide && !reduce && '[&_span]:transition-[left,right] [&_span]:duration-500 [&_span]:ease-[cubic-bezier(.32,.72,0,1)]')} />
                    <div className="mt-1 flex justify-between font-mono text-xs sky-body"><span>1000</span><span>1600</span></div>
                  </motion.div>
                  <motion.div variants={ITEM} className="space-y-3">
                    <Button variant="outline" className="rounded-full" onClick={pickTarget}><Wand2 className="h-4 w-4" />Help me pick</Button>
                    <p role="status" className="min-h-6 sky-body">
                      <AnimatePresence mode="wait" initial={false}>
                        {why && <motion.span key={nod} className="block" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>{why}</motion.span>}
                      </AnimatePresence>
                    </p>
                  </motion.div>
                </div>}
                {step === 5 && <div role="group" aria-labelledby={titleId} className="grid gap-2">
                  {SECTIONS.map(([v, l]) => <Choice key={v} on={weak === v} disabled={saving} onClick={() => tap(v, () => setWeak(v))}>{l}</Choice>)}
                </div>}
                {step === 6 && (q === undefined ? <motion.div variants={ITEM}><SkyCardSkeleton lines={4} /></motion.div> : q === null ? <motion.p variants={ITEM} className="sky-body">We couldn't load a question right now. You'll find plenty in Practice.</motion.p> : (
                  <div className="space-y-4">
                    <motion.div variants={ITEM} className="sky-card space-y-4">
                      {q.passage_text && <div className="border-l-2 pl-4 text-sm leading-relaxed"><MathText text={q.passage_text} /></div>}
                      <div className="leading-relaxed"><MathText text={q.question_text} /></div>
                      <QuestionFigures svg={q.figure_svg} description={q.figure_description} url1={q.question_image_url} url2={q.question_image_url_2} className="justify-start" imgClassName="max-h-64 rounded border bg-background" />
                      <div ref={choicesRef} role="group" aria-label="Answer choices" className="grid gap-2">
                        {choices.map(c => <Choice key={c.letter} on={picked === c.letter} disabled={solved || saving} onClick={() => { setPicked(c.letter); requestAnimationFrame(() => reveal(choicesRef.current)); }}>
                          <span className="w-5 font-mono text-sm">{c.letter}</span><span className="min-w-0 flex-1 font-normal">{c.image ? <img src={c.image} alt={`Choice ${c.letter}`} className="max-h-40" /> : <MathText text={c.text} />}</span>
                        </Choice>)}
                      </div>
                    </motion.div>
                    {msg && <p ref={msgRef} role="status" className="font-semibold">{msg}</p>}
                    {tries > 0 && q.rationale && (plan.premium ? <div className="sky-card"><ExplanationView text={q.rationale} /></div> : plan.ready && <SoloLock title="Step-by-step explanations" />)}
                  </div>
                ))}
                {step === 7 && <>
                  <motion.p variants={ITEM} className="text-lg sky-body">
                    {days != null && days >= 0 && <><span className="font-semibold text-foreground">{days} {days === 1 ? 'day' : 'days'}</span> to your SAT. </>}
                    {ringPlanCopy(vals, centerSatProgress(attempts, meta), weak)} You can change it any time.
                  </motion.p>
                  <div role="group" aria-labelledby={titleId} className="grid gap-2">
                    {INTENSITIES.map(({ key, label, blurb, icon: I }) => <Choice key={key} on={intensity === key} disabled={saving} onClick={() => setPace(key)}>
                      <I className="h-5 w-5 shrink-0" /><span><span className="block">{label}</span><span className="block text-sm font-normal sky-body">{blurb}</span></span>
                    </Choice>)}
                  </div>
                </>}
              </motion.div>
            </AnimatePresence>
          </motion.div>
          <div ref={bar} className="sticky bottom-0 z-10 pb-[env(safe-area-inset-bottom)]" style={{ background: 'linear-gradient(hsl(var(--student-canvas) / 0), hsl(var(--student-canvas)) 35%)' }}>
            <div className="mx-auto flex w-full max-w-md gap-2 px-5 py-4 lg:pb-12">
              {backStep(step) != null && <Button variant="ghost" size="lg" className="h-12 rounded-full" disabled={saving} onClick={now(() => goTo(backStep(step)!))}>Back</Button>}
              {canSkip(step, answerFailed) && <Button variant="ghost" size="lg" className="h-12 rounded-full" disabled={saving} onClick={now(() => save({}, step + 1))}>Skip</Button>}
              <Button size="lg" className="h-12 flex-1 rounded-full text-base" disabled={!action.ready || saving} onClick={now(action.run)}>{action.label}<ArrowRight className="h-5 w-5" /></Button>
            </div>
          </div>
        </main>
      </div>
    </div>
    </MotionConfig>
  );
}
