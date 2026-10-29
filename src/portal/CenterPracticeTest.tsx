import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag, Timer, BookOpen, ArrowLeft, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MathText } from '@/components/MathText';
import { QuestionFigures } from '@/components/QuestionFigures';
import { ExplanationView } from '@/components/explanation/ExplanationView';
import { useFigureFields } from '@/hooks/useFigureFields';
import { normaliseChoices } from '@/lib/bluebookReview';
import { DesmosCalculator, toggleCalculator } from '@/components/student/DesmosCalculator';
import { ReferenceSheet, toggleReferenceSheet } from '@/components/student/ReferenceSheet';
import { useCenter } from './centerContext';
import { SkyCardSkeleton } from './SkySkeleton';
import { moduleSecondsLeft } from './testTimer';

type Answer = { value: string; flagged?: boolean };
// answer, alternate_answers and rationale only arrive once the test is completed.
type Question = { id: string; question_id: string; question_text: string; passage_text?: string; question_image_url?: string; question_image_url_2?: string; multiple_choice_options: unknown; choice_images?: Record<string, string>; answer?: string; rationale?: string | null };
type PaperModule = { number: number; minutes: number; questions: Question[] };
type TestState = { id: string; test_name: string; status: string; current_module: number; module_started_at: string; answers: Record<string, Answer>; paper: PaperModule[]; math_correct: number | null; math_total: number | null; math_score: number | null };
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const draftKey = (s: TestState) => `center-test-draft:${s.id}:${s.current_module}`;

export function CenterPracticeTest() {
  const { attemptId } = useParams();
  const { center } = useCenter();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['center-test-state', center.id, attemptId], enabled: !!attemptId, queryFn: async () => {
    if (!attemptId) throw new Error('Missing test');
    const { data, error } = await supabase.rpc('tenant_test_state' as never, { _attempt: attemptId } as never); if (error) throw error; return data as unknown as TestState;
  } });
  const state = query.data;
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const answersRef = useRef(answers);
  const [index, setIndex] = useState(0);
  const [reviewModule, setReviewModule] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [saveLabel, setSaveLabel] = useState('All answers saved');
  const advancing = useRef(false);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const pendingAdvance = useRef(false);
  const completed = state?.status === 'completed';
  const moduleIndex = completed ? reviewModule : state?.current_module ?? 0;
  const module = state?.paper[moduleIndex];
  const last = !!state && moduleIndex === state.paper.length - 1;
  const q = module?.questions[index];
  const figures = useFigureFields(state?.paper.flatMap(m => m.questions.map(x => x.id)) ?? [], 'intl_questions');
  const seconds = state && module ? moduleSecondsLeft(state.module_started_at, module.minutes, now) : 0;
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!state) return;
    let local: Record<string, Answer> = {};
    try { local = JSON.parse(localStorage.getItem(draftKey(state)) ?? '{}'); } catch { /* Ignore malformed drafts. */ }
    // Review shows only what the server graded.
    const merged = state.status === 'completed' ? state.answers : { ...state.answers, ...local };
    answersRef.current = merged; setAnswers(merged); setIndex(0);
    // A new module or status means the server already moved past any advance whose reply was lost.
    pendingAdvance.current = false;
  }, [state?.id, state?.current_module, state?.status]);
  // Every save names its module: the server ignores a stale one (double click, timer racing a click, retry).
  function save(next: Record<string, Answer>) {
    if (!attemptId || !state) return Promise.resolve();
    const _module = state.current_module;
    setSaveLabel('Saving…');
    const task = saveQueue.current.catch(() => undefined).then(async () => {
      const { error } = await supabase.rpc('tenant_test_save' as never, { _attempt: attemptId, _answers: next, _module } as never);
      if (error) { setSaveLabel('Not synced · answers kept on this device'); throw error; }
      setSaveLabel('All answers saved');
    });
    saveQueue.current = task;
    return task;
  }
  function change(value: string, flagged?: boolean) {
    if (!q || !state || completed || seconds === 0) return;
    const next = { ...answersRef.current, [q.id]: { value, flagged: flagged ?? answersRef.current[q.id]?.flagged ?? false } };
    answersRef.current = next; setAnswers(next);
    try { localStorage.setItem(draftKey(state), JSON.stringify(next)); } catch { /* Storage full or blocked: the server save below still runs. */ }
    void save(next).catch(() => undefined);
  }
  async function advance() {
    if (!attemptId || !state || advancing.current) return;
    advancing.current = true; setBusy(true);
    try {
      await saveQueue.current.catch(() => undefined);
      const { error } = await supabase.rpc('tenant_test_save' as never, { _attempt: attemptId, _answers: answersRef.current, _advance: true, _module: state.current_module } as never); if (error) throw error;
      localStorage.removeItem(draftKey(state));
      pendingAdvance.current = false;
      // A stale call returns silently without moving, so read where the server really is.
      await query.refetch(); await qc.invalidateQueries({ queryKey: ['center-tests', center.id] });
    } catch { pendingAdvance.current = true; toast.error('Unable to sync the test. Reconnect and try again.'); }
    finally { advancing.current = false; setBusy(false); }
  }
  useEffect(() => { if (state && !completed && seconds === 0 && !pendingAdvance.current) void advance(); }, [seconds, completed, state?.current_module]);
  useEffect(() => {
    const reconnect = () => { if (pendingAdvance.current) void advance(); else if (state && !completed) void save(answersRef.current).catch(() => undefined); };
    window.addEventListener('online', reconnect); return () => window.removeEventListener('online', reconnect);
  }, [state?.id, state?.current_module, completed]);
  if (query.isLoading) return <SkyCardSkeleton />;
  if (query.error || !state || !module) return <div className="sky-card space-y-3"><p role="alert">Could not load this test.</p><Button variant="outline" onClick={() => query.refetch()}>Try again</Button></div>;
  const choices = q ? normaliseChoices(q.multiple_choice_options, q.choice_images) : [];
  return <div className="space-y-5">
    <header className="flex flex-wrap justify-between items-center gap-3"><div className="min-w-0"><Button variant="ghost" className="px-0" onClick={() => navigate('/student/tests')}><ArrowLeft className="h-4 w-4"/>Practice tests</Button><h1 className="text-xl font-semibold">{state.test_name}</h1><p className="text-sm text-muted-foreground">Module {moduleIndex + 1} of {state.paper.length}</p></div>
      {completed ? state.math_score != null && <div className="text-right"><p className="font-mono text-2xl">{state.math_score}</p><p className="text-xs text-muted-foreground">Practice score (estimate) · {state.math_correct}/{state.math_total} correct</p></div> : <div className="text-right"><p className="font-mono text-2xl flex gap-2 items-center"><Timer className="h-5 w-5"/>{formatTime(seconds)}</p><p className="text-xs text-muted-foreground" role="status">{saveLabel}</p></div>}</header>
    {completed && <div className="flex flex-wrap gap-2">{state.paper.map((_, i) => <Button key={i} variant={reviewModule === i ? 'default' : 'outline'} onClick={() => { setReviewModule(i); setIndex(0); }}>Module {i + 1}</Button>)}</div>}
    {q && <div className="grid lg:grid-cols-[1fr_240px] gap-5"><section className="sky-card min-w-0 space-y-5"><div className="flex items-center justify-between gap-2"><p className="font-mono text-sm">Question {index + 1} of {module.questions.length}</p>{!completed && <Button size="sm" variant={answers[q.id]?.flagged ? 'default' : 'outline'} onClick={() => change(answers[q.id]?.value ?? '', !answers[q.id]?.flagged)}><Flag className="h-4 w-4"/>Review later</Button>}</div>
      {q.passage_text && <div className="border-b pb-5"><MathText text={q.passage_text}/></div>}<MathText text={q.question_text}/><QuestionFigures svg={figures?.get(q.id)?.figure_svg} description={figures?.get(q.id)?.figure_description} url1={q.question_image_url} url2={q.question_image_url_2} className="justify-start" imgClassName="max-h-96 max-w-full object-contain"/>
      {choices.length ? <div className="space-y-3">{choices.map(choice => <Button key={choice.letter} disabled={completed || seconds === 0} variant={answers[q.id]?.value === choice.letter ? 'default' : 'outline'} className="w-full h-auto min-h-12 justify-start text-left whitespace-normal p-4" onClick={() => change(choice.letter)}><span className="font-mono mr-3">{choice.letter}</span><span className="min-w-0"><MathText text={choice.text}/>{choice.image && <img src={choice.image} alt={`Choice ${choice.letter}`} className="max-h-48 max-w-full"/>}</span></Button>)}</div> : <Input aria-label="Your answer" value={answers[q.id]?.value ?? ''} disabled={completed || seconds === 0} onChange={e => change(e.target.value)} placeholder="Your answer"/>}
      {completed && <div className="border-t pt-4 space-y-2"><p>Your answer: <span className="font-mono">{answers[q.id]?.value?.trim() || 'Omitted'}</span></p><p>Correct answer: <span className="font-mono">{q.answer}</span></p>{q.rationale ? <ExplanationView text={q.rationale}/> : <p className="text-sm text-muted-foreground">No explanation yet.</p>}</div>}
      <div className="flex justify-between gap-2"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(i => i - 1)}>Previous</Button><Button disabled={index === module.questions.length - 1} onClick={() => setIndex(i => i + 1)}>Next</Button></div>
    </section><aside className="space-y-4"><div className="grid grid-cols-5 gap-2">{module.questions.map((item, i) => <Button key={item.id} size="icon" variant={index === i ? 'default' : 'outline'} className={`w-full relative ${answers[item.id]?.value && index !== i ? 'bg-foreground/10' : ''}`} onClick={() => setIndex(i)}>{i + 1}{answers[item.id]?.flagged && <Flag className="absolute top-0 right-0 h-2 w-2"/>}</Button>)}</div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={toggleCalculator}><Calculator className="h-4 w-4"/>Calculator</Button><Button variant="outline" onClick={toggleReferenceSheet}><BookOpen className="h-4 w-4"/>Reference</Button></div>{!completed && <Button disabled={busy} className="w-full" onClick={() => { if (seconds === 0 || window.confirm(last ? 'Finish the test? You cannot change your answers after this.' : 'Finish this module? You cannot return to it.')) void advance(); }}>{busy ? 'Saving…' : last ? 'Finish test' : 'Finish module'}</Button>}</aside></div>}
    <DesmosCalculator/><ReferenceSheet/>
  </div>;
}
