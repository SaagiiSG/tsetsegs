import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Calculator, LogOut } from 'lucide-react';
import { MathText } from '@/components/MathText';
import { QuestionFigures } from '@/components/QuestionFigures';
import { DesmosCalculator, toggleCalculator, useCalculatorSnap } from '@/components/student/DesmosCalculator';
import { BluebookResultsDialog } from '@/components/student/BluebookResultsDialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import type { BluebookResultsData } from '@/lib/bluebookReview';
import { stageReducer, type Stage } from '@/lib/bluebookStage';
import {
  crossOutKey, nextStep, readLocal, remainingSeconds, sectionLabel, toggleLetter, writeLocal, type FlowModule,
} from '@/lib/bluebookTest';
import { clearDesmosContext, setDesmosContext } from '@/lib/desmosTracking';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { BluebookFrame, type MenuItem, type Tool } from './BluebookFrame';
import { FigureZoom, ReferencePanel } from './MathTools';
import { CheckYourWork, NavigatorContent } from './QuestionGrid';
import { AnswerChoices, GridIn, QuestionHeader, SprDirections } from './QuestionPane';
import { ModuleOver, StandBy } from './Screens';
import { IrisTransition, LOADER_MIN_MS, MODULE_OVER_MS, StartLoader, SWITCHING_MIN_MS, pickFigure } from './Transitions';

export type SessionModule = FlowModule & { time_limit_minutes: number };

export interface SessionQuestion {
  id: string;
  question_id: string;
  question_text: string;
  question_image_url: string | null;
  question_image_url_2: string | null;
  figure_svg?: string | null;
  figure_description?: string | null;
  question_type: string;
  multiple_choice_options: unknown;
  choice_images: unknown;
  passage_text: string | null;
}

export interface BluebookSessionProps {
  attemptId: string;
  studentName: string;
  modules: SessionModule[];
  module: SessionModule | null;
  questions: SessionQuestion[] | undefined;
  answers: Record<string, { answer_submitted: string | null; is_marked: boolean }>;
  startedAt: string | null;
  onStartClock(): Promise<void>;
  onAnswer(questionId: string, value: string): void;
  onToggleMark(questionId: string): void;
  onAdvance(moduleId: string): Promise<void>;
  onFinish(): Promise<BluebookResultsData>;
  onExit(): void;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Keep trying a step that must happen (moving modules, starting the clock) until it lands or the stage is left. */
async function untilDone(step: () => Promise<unknown>, live: () => boolean) {
  while (live()) {
    try { await step(); return; } catch { await sleep(2000); }
  }
}

function MathDirections() {
  return (
    <div className="space-y-4">
      <p>The questions in this section address a number of important math skills.</p>
      <p>Use of a calculator is permitted for all questions. A reference sheet, calculator, and these directions can be accessed throughout the test.</p>
      <p>Unless otherwise indicated:</p>
      <ul className="list-disc space-y-1 pl-8">
        <li>All variables and expressions represent real numbers.</li>
        <li>Figures provided are drawn to scale.</li>
        <li>All figures lie in a plane.</li>
        <li>The domain of a given function <em>f</em> is the set of all real numbers <em>x</em> for which <em>f</em>(<em>x</em>) is a real number.</li>
      </ul>
      <p>For multiple-choice questions, solve each problem and choose the correct answer from the choices provided. Each multiple-choice question has a single correct answer.</p>
      <p>For student-produced response questions, solve each problem and enter your answer as described below.</p>
      <div className="pt-4"><SprDirections /></div>
    </div>
  );
}

/** Two panes with Bluebook's grey divider and drag handle; stacked on phones. */
function TwoPane({ left, right }: { left: ReactNode; right: ReactNode }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div className="px-4 py-5">
        <div className="border-b-4 border-[var(--bb-divider)] pb-6">{left}</div>
        <div className="pt-6">{right}</div>
      </div>
    );
  }
  return (
    <ResizablePanelGroup direction="horizontal" className="!h-full">
      <ResizablePanel defaultSize={50} minSize={30} className="!overflow-y-auto">
        <div className="px-10 py-8">{left}</div>
      </ResizablePanel>
      <ResizableHandle className="w-1 bg-[var(--bb-divider)] after:w-3">
        <span aria-hidden className="z-10 grid h-[30px] w-[14px] place-items-center rounded-[3px] bg-[var(--bb-ink)] text-[9px] leading-none text-white">◂▸</span>
      </ResizableHandle>
      <ResizablePanel defaultSize={50} minSize={30} className="!overflow-y-auto">
        <div className="px-10 py-8">{right}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export function BluebookSession(props: BluebookSessionProps) {
  const { attemptId, studentName, modules, module, questions, answers, startedAt, onAnswer, onToggleMark, onExit } = props;
  // Async steps read the newest props through this ref, so they don't restart every render.
  const latest = useRef(props);
  latest.current = props;

  const [stage, dispatch] = useReducer(stageReducer, { name: 'loading' } as Stage);
  const [figure] = useState(() => pickFigure());
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [timerHidden, setTimerHidden] = useState(false);
  const [crossOutMode, setCrossOutMode] = useState(false);
  const [crossed, setCrossed] = useState<string[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [results, setResults] = useState<BluebookResultsData | null>(null);
  const [standbyError, setStandbyError] = useState(false);
  const snap = useCalculatorSnap();
  const stageStart = useRef(Date.now());
  const expectModule = useRef<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const question = questions?.[index];
  const isMath = module?.section === 'math';
  const inFrame = stage.name === 'test' || stage.name === 'review';

  useEffect(() => { stageStart.current = Date.now(); }, [stage]);

  // loading / switching: wait for the module's questions and the minimum beat, start the clock, then show the test.
  const questionsReady = !!questions && !!module && (!expectModule.current || module.id === expectModule.current);
  useEffect(() => {
    if ((stage.name !== 'loading' && stage.name !== 'switching') || !questionsReady) return;
    let live = true;
    const min = stage.name === 'loading' ? LOADER_MIN_MS : SWITCHING_MIN_MS;
    const t = setTimeout(async () => {
      await untilDone(async () => { if (!latest.current.startedAt) await latest.current.onStartClock(); }, () => live);
      if (live) dispatch({ type: 'ready' });
    }, Math.max(0, min - (Date.now() - stageStart.current)));
    return () => { live = false; clearTimeout(t); };
  }, [stage, questionsReady]);

  // The clock ticks while the module is open; at 0 the module ends (the reducer ignores a second end).
  useEffect(() => {
    if (!inFrame) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [inFrame]);
  const remaining = module ? remainingSeconds(startedAt, module.time_limit_minutes, now) : null;
  useEffect(() => {
    if (remaining === 0 && inFrame && module) dispatch({ type: 'moduleDone', next: nextStep(modules, module.id) });
  }, [remaining, inFrame, module, modules]);

  // This Module Is Over: show it for Bluebook's beat while the attempt moves on, then the dimmed frame.
  useEffect(() => {
    if (stage.name !== 'moduleOver') return;
    let live = true;
    const target = stage.moduleId;
    expectModule.current = target;
    Promise.all([sleep(MODULE_OVER_MS), untilDone(() => latest.current.onAdvance(target), () => live)]).then(() => {
      if (!live) return;
      setIndex(0);
      setNavOpen(false);
      setRefOpen(false);
      dispatch({ type: 'advanced' });
    });
    return () => { live = false; };
  }, [stage]);

  // shortcut: phase 1 has no break screen yet, so R&W → Math moves straight on; Task 15 adds BreakScreen/ResumeScreen.
  useEffect(() => {
    if (stage.name === 'break') { dispatch({ type: 'breakDone' }); return; }
    if (stage.name !== 'resume') return;
    let live = true;
    const target = stage.moduleId;
    expectModule.current = target;
    untilDone(() => latest.current.onAdvance(target), () => live).then(() => {
      if (!live) return;
      setIndex(0);
      dispatch({ type: 'resumeClicked' });
    });
    return () => { live = false; };
  }, [stage]);

  // Stand By: save everything and score. A failure waits for "Try again".
  useEffect(() => {
    if (stage.name !== 'standby' || standbyError) return;
    let live = true;
    latest.current.onFinish().then(
      r => { if (live) { setResults(r); dispatch({ type: 'scored' }); } },
      () => { if (live) setStandbyError(true); },
    );
    return () => { live = false; };
  }, [stage.name, standbyError]);

  // Cross-outs live in this browser, per attempt and question.
  useEffect(() => {
    setCrossed(question ? readLocal<string[]>(crossOutKey(attemptId, question.id), []) : []);
  }, [attemptId, question]);
  const toggleCross = (letter: string) => {
    if (!question) return;
    const next = toggleLetter(crossed, letter);
    writeLocal(crossOutKey(attemptId, question.id), next);
    setCrossed(next);
  };

  // Desmos usage is tracked per question on math modules.
  useEffect(() => {
    if (!question || !isMath) return;
    setDesmosContext({ questionId: question.id, context: 'bluebook' });
    return () => clearDesmosContext();
  }, [question, isMath]);

  useEffect(() => { bodyRef.current?.closest('main')?.scrollTo(0, 0); }, [index, stage.name]);

  // The loader always sits in the same place in the tree, so it can fade out over the test.
  const screen = (content: ReactNode) => (
    <>
      {content}
      <AnimatePresence>{stage.name === 'loading' && <StartLoader key="loader" figure={figure} />}</AnimatePresence>
    </>
  );

  if (stage.name === 'moduleOver' || stage.name === 'break' || stage.name === 'resume') return screen(<ModuleOver />);
  if (stage.name === 'standby') return screen(<StandBy error={standbyError} onRetry={() => setStandbyError(false)} />);
  if (stage.name === 'iris') {
    return screen(
      <IrisTransition phase="closing" onDone={() => dispatch({ type: 'irisClosed' })}>
        <StandBy error={false} onRetry={() => {}} />
      </IrisTransition>,
    );
  }
  if (stage.name === 'results') {
    return screen(
      <IrisTransition phase="opening" onDone={() => {}}>
        <div className="student-theme fixed inset-0" />
        {results && <BluebookResultsDialog open results={results} onClose={onExit} />}
      </IrisTransition>,
    );
  }
  if (!module || stage.name === 'loading') return screen(null);

  const label = sectionLabel(modules, module);
  const count = questions?.length ?? 0;
  const items = (questions ?? []).map(q => ({ answered: !!answers[q.id]?.answer_submitted, marked: !!answers[q.id]?.is_marked }));
  const finishModule = () => dispatch({ type: 'moduleDone', next: nextStep(modules, module.id) });

  const tools: Tool[] = isMath ? [
    { key: 'calc', label: 'Calculator', icon: <Calculator />, active: snap === 'left', onClick: toggleCalculator },
    { key: 'ref', label: 'Reference', icon: <span className="bb-serif text-[17px] font-bold italic leading-5">x²</span>, active: refOpen, onClick: () => setRefOpen(o => !o) },
  ] : [];
  const menu: MenuItem[] = [{ label: 'Save and Exit', icon: <LogOut />, onClick: onExit }];

  const frame = {
    sectionLabel: label,
    directions: <MathDirections />,
    remaining, timerHidden, onToggleTimer: () => setTimerHidden(h => !h),
    tools, menu, studentName,
    aside: isMath ? <ReferencePanel open={refOpen} onClose={() => setRefOpen(false)} /> : null,
  };
  // The calculator stays mounted across the module and Check Your Work, so typed expressions survive.
  const calculator = inFrame && isMath ? <DesmosCalculator dockOnOpen="left" /> : null;

  if (stage.name === 'switching' || !question) return screen(<BluebookFrame {...frame} dimmed>{null}</BluebookFrame>);

  if (stage.name === 'review') {
    return screen(
      <>
        <BluebookFrame {...frame}
          onBack={() => { setIndex(count - 1); dispatch({ type: 'backToQuestions' }); }}
          onNext={finishModule}>
          <div ref={bodyRef} className="min-h-full">
            <CheckYourWork title={`${label} Questions`} items={items} onPick={i => { setIndex(i); dispatch({ type: 'backToQuestions' }); }} />
          </div>
        </BluebookFrame>
        {calculator}
      </>,
    );
  }

  const a = answers[question.id];
  const isMC = question.question_type === 'multiple_choice';
  const hasFigure = !!(question.figure_svg || question.question_image_url || question.question_image_url_2);
  const header = (
    <QuestionHeader number={index + 1} marked={!!a?.is_marked} onToggleMark={() => onToggleMark(question.id)}
      crossOutMode={crossOutMode} onToggleCrossOut={() => setCrossOutMode(m => !m)} />
  );
  const stem = (
    <>
      {hasFigure && (
        <FigureZoom>
          <QuestionFigures svg={question.figure_svg} description={question.figure_description}
            url1={question.question_image_url} url2={question.question_image_url_2}
            imgClassName={question.question_image_url_2 ? 'max-h-72 w-auto' : 'h-auto w-full max-w-[520px]'} />
        </FigureZoom>
      )}
      {question.passage_text && <div className="bb-serif mb-4 text-[16px] leading-[1.6]"><MathText text={question.passage_text} /></div>}
      <div className="bb-serif text-[16px] leading-[1.6]"><MathText text={question.question_text} /></div>
    </>
  );

  const body = isMC ? (
    // With the reference open, the column centres in what's left of the page, as in Bluebook.
    <div className={cn('px-4 pb-10 pt-6 md:pt-10', refOpen && 'md:pr-[496px]')}>
      <div className="mx-auto w-full max-w-[660px]">
        {header}
        <div className="mt-4">{stem}</div>
        <div className="mt-5">
          <AnswerChoices options={question.multiple_choice_options} images={question.choice_images}
            selected={a?.answer_submitted ?? null} crossed={crossed} crossOutMode={crossOutMode}
            onSelect={l => onAnswer(question.id, l)} onToggleCross={toggleCross} />
        </div>
      </div>
    </div>
  ) : (
    <TwoPane
      left={<SprDirections />}
      right={
        <>
          {header}
          <div className="mt-6">{stem}</div>
          <div className="mt-6"><GridIn value={a?.answer_submitted ?? ''} onChange={v => onAnswer(question.id, v)} /></div>
        </>
      }
    />
  );

  return screen(
    <>
      <BluebookFrame {...frame}
        bodyClassName={isMC ? undefined : 'md:overflow-hidden'}
        pill={{
          label: `Question ${index + 1} of ${count}`, open: navOpen, onOpenChange: setNavOpen,
          content: (
            <NavigatorContent title={`${label} Questions`} items={items} current={index}
              onPick={i => { setIndex(i); setNavOpen(false); }}
              onClose={() => setNavOpen(false)}
              onReviewPage={() => { setNavOpen(false); dispatch({ type: 'openReview' }); }} />
          ),
        }}
        onBack={index > 0 ? () => setIndex(i => i - 1) : undefined}
        onNext={() => (index < count - 1 ? setIndex(i => i + 1) : dispatch({ type: 'openReview' }))}
      >
        <div ref={bodyRef} className={cn(!isMC && 'md:h-full')}>{body}</div>
      </BluebookFrame>
      {calculator}
    </>,
  );
}
