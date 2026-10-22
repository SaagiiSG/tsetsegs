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
import { useFigureFields } from '@/hooks/useFigureFields';
import { normaliseChoices } from '@/lib/bluebookReview';
import { DesmosCalculator, toggleCalculator } from '@/components/student/DesmosCalculator';
import { useCenter } from './centerContext';

type Answer = { value: string; flagged?: boolean };
type Question = { id: string; question_id: string; question_text: string; passage_text?: string; question_image_url?: string; question_image_url_2?: string; multiple_choice_options: unknown; choice_images?: Record<string, string>; answer?: string; rationale?: string };
type PaperModule = { section: string; minutes: number; questions: Question[] };
type TestState = { id: string; status: string; current_module: number; module_started_at: string; break_until: string | null; answers: Record<string, Answer>; paper: PaperModule[]; rw_score: number | null; math_score: number | null };
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const resultSelect = 'id,started_at,status,rw_score,math_score,current_module' as const;

export function CenterSATList({ studentId }: { studentId: string }) {
  const { center } = useCenter();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const attempts = useQuery({ queryKey: ['center-sat', center.id, studentId], queryFn: async () => {
    const { data, error } = await supabase.from('tenant_sat_attempts').select(resultSelect).eq('institution_id', center.id).eq('student_id', studentId).order('started_at', { ascending: false }).limit(100); if (error) throw error; return data ?? [];
  } });
  async function start() {
    setBusy(true);
    try { const { data, error } = await supabase.rpc('tenant_sat_start', { _institution: center.id }); if (error) throw error; navigate(`/student/sat/${data}`); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not start the test. Try again.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-7 max-w-5xl"><header><h1 className="text-3xl font-bold">SAT simulation</h1><p className="text-muted-foreground mt-2">Full-length practice · International question bank</p></header>
    <div className="admin-glass-card admin-glass-neutral border rounded-3xl p-6 space-y-6"><BookOpen className="h-8 w-8"/><div><h2 className="text-xl font-semibold">Digital SAT practice</h2><p className="text-sm text-muted-foreground mt-2">98 questions · 2 hours 14 minutes · 10-minute break</p></div><div className="grid sm:grid-cols-2 gap-5"><div><h3 className="font-medium">Reading & Writing</h3><p className="text-sm text-muted-foreground">2 modules · 27 questions · 32 minutes each</p></div><div><h3 className="font-medium">Math</h3><p className="text-sm text-muted-foreground">2 modules · 22 questions · 35 minutes each</p></div></div><p className="text-xs text-muted-foreground">Practice score estimates are not official SAT scores. This simulation uses fixed modules, not College Board adaptive scoring. Timers continue if you leave the test.</p><Button disabled={busy || attempts.isLoading || !!attempts.error} onClick={start}>{busy ? 'Preparing test…' : attempts.data?.some(a => a.status === 'in_progress') ? 'Resume test' : 'Start full test'}</Button></div>
    <section><h2 className="text-xl font-semibold mb-4">Your tests</h2>{attempts.isLoading ? <p>Loading tests…</p> : attempts.error ? <p role="alert">Could not load your tests.</p> : !attempts.data?.length ? <p className="text-muted-foreground">Your test results will appear here.</p> : <div className="divide-y">{attempts.data.map(a => <div key={a.id} className="flex justify-between items-center gap-3 py-4"><div><p className="font-medium">{new Date(a.started_at).toLocaleDateString()}</p><p className="text-sm text-muted-foreground">{a.status === 'completed' ? `Reading & Writing ${a.rw_score} · Math ${a.math_score}` : `In progress · Module ${a.current_module + 1}`}</p></div><div className="flex items-center gap-4">{a.status === 'completed' && <span className="text-2xl font-mono">{(a.rw_score ?? 0) + (a.math_score ?? 0)}</span>}<Button variant="outline" onClick={() => navigate(`/student/sat/${a.id}`)}>{a.status === 'completed' ? 'Review' : 'Resume'}</Button></div></div>)}</div>}</section>
  </div>;
}

export function CenterSATTest() {
  const { attemptId } = useParams();
  const { center } = useCenter();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['center-sat-state', center.id, attemptId], enabled: !!attemptId, queryFn: async () => {
    if (!attemptId) throw new Error('Missing test');
    const { data, error } = await supabase.rpc('tenant_sat_state', { _attempt: attemptId }); if (error) throw error; return data as unknown as TestState;
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
  const q = module?.questions[index];
  const figures = useFigureFields(state?.paper.flatMap(m => m.questions.map(x => x.id)) ?? [], 'intl_questions');
  const onBreak = !!state?.break_until && new Date(state.break_until).getTime() > now;
  const deadline = state && module ? new Date(onBreak ? state.break_until ?? state.module_started_at : state.module_started_at).getTime() + (onBreak ? 0 : module.minutes * 60000) : now;
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!state) return;
    let local: Record<string, Answer> = {};
    try { local = JSON.parse(localStorage.getItem(`center-sat-draft:${state.id}:${state.current_module}`) ?? '{}'); } catch { /* Ignore malformed drafts. */ }
    const merged = { ...state.answers, ...local };
    answersRef.current = merged; setAnswers(merged); setIndex(0);
  }, [state?.id, state?.current_module, state?.status]);
  function save(next: Record<string, Answer>) {
    if (!attemptId) return Promise.resolve();
    setSaveLabel('Saving…');
    const task = saveQueue.current.catch(() => undefined).then(async () => {
      const { error } = await supabase.rpc('tenant_sat_save', { _attempt: attemptId, _answers: next });
      if (error) { setSaveLabel('Not synced · answers kept on this device'); throw error; }
      setSaveLabel('All answers saved');
    });
    saveQueue.current = task;
    return task;
  }
  function change(value: string, flagged?: boolean) {
    if (!q || !state || completed || seconds === 0 || onBreak) return;
    const next = { ...answersRef.current, [q.id]: { value, flagged: flagged ?? answersRef.current[q.id]?.flagged ?? false } };
    answersRef.current = next; setAnswers(next);
    localStorage.setItem(`center-sat-draft:${state.id}:${state.current_module}`, JSON.stringify(next));
    void save(next).catch(() => undefined);
  }
  async function advance() {
    if (!attemptId || !state || advancing.current) return;
    advancing.current = true; setBusy(true);
    try {
      await saveQueue.current.catch(() => undefined);
      const { error } = await supabase.rpc('tenant_sat_save', { _attempt: attemptId, _answers: answersRef.current, _advance: true }); if (error) throw error;
      localStorage.removeItem(`center-sat-draft:${state.id}:${state.current_module}`);
      pendingAdvance.current = false;
      await query.refetch(); await qc.invalidateQueries({ queryKey: ['center-sat', center.id] });
    } catch { pendingAdvance.current = true; toast.error('Unable to sync the test. Reconnect and try again.'); }
    finally { advancing.current = false; setBusy(false); }
  }
  useEffect(() => { if (state && !completed && !onBreak && seconds === 0 && !pendingAdvance.current) void advance(); }, [seconds, onBreak, completed, state?.current_module]);
  useEffect(() => {
    const reconnect = () => { if (pendingAdvance.current) void advance(); else if (state && !completed) void save(answersRef.current).catch(() => undefined); };
    window.addEventListener('online', reconnect); return () => window.removeEventListener('online', reconnect);
  }, [state?.id, completed]);
  if (query.isLoading) return <p>Loading your test…</p>;
  if (query.error || !state || !module) return <div><p role="alert">Could not load this test.</p><Button onClick={() => query.refetch()}>Try again</Button></div>;
  if (onBreak) return <div className="max-w-xl mx-auto text-center space-y-6 py-20"><Timer className="h-12 w-12 mx-auto"/><h1 className="text-3xl font-bold">Take a break</h1><p className="text-5xl font-mono">{formatTime(seconds)}</p><p className="text-muted-foreground">Math starts when your 10-minute break ends.</p><Button variant="outline" onClick={() => navigate('/student/sat')}>Back to tests</Button></div>;
  const choices = q ? normaliseChoices(q.multiple_choice_options, q.choice_images) : [];
  return <div className="space-y-5">
    <header className="flex flex-wrap justify-between items-center gap-3"><div><Button variant="ghost" className="px-0" onClick={() => navigate('/student/sat')}><ArrowLeft className="h-4 w-4"/>Your tests</Button><h1 className="text-xl font-semibold">{module.section === 'math' ? 'Math' : 'Reading & Writing'} · Module {moduleIndex % 2 + 1}</h1></div>{completed ? <div className="font-mono text-2xl">{(state.rw_score ?? 0) + (state.math_score ?? 0)}<span className="text-xs block text-muted-foreground">Estimated practice score</span></div> : <div className="text-right"><p className="font-mono text-2xl flex gap-2 items-center"><Timer className="h-5 w-5"/>{formatTime(seconds)}</p><p className="text-xs text-muted-foreground" role="status">{saveLabel}</p></div>}</header>
    {completed && <div className="flex flex-wrap gap-2">{state.paper.map((m, i) => <Button key={i} variant={reviewModule === i ? 'default' : 'outline'} onClick={() => { setReviewModule(i); setIndex(0); }}>{m.section === 'math' ? 'Math' : 'R&W'} {i % 2 + 1}</Button>)}</div>}
    {q && <div className="grid lg:grid-cols-[1fr_240px] gap-5"><section className="min-w-0 admin-glass-card admin-glass-neutral rounded-3xl border p-5 md:p-7 space-y-5"><div className="flex items-center justify-between"><p className="font-mono text-sm">Question {index + 1} of {module.questions.length}</p>{!completed && <Button size="sm" variant={answers[q.id]?.flagged ? 'default' : 'outline'} onClick={() => change(answers[q.id]?.value ?? '', !answers[q.id]?.flagged)}><Flag className="h-4 w-4"/>Review later</Button>}</div>
      {q.passage_text && <div className="border-b pb-5"><MathText text={q.passage_text}/></div>}<MathText text={q.question_text}/><QuestionFigures svg={figures?.get(q.id)?.figure_svg} description={figures?.get(q.id)?.figure_description} url1={q.question_image_url} url2={q.question_image_url_2} className="justify-start" imgClassName="max-h-96 max-w-full object-contain"/>
      {choices.length ? <div className="space-y-3">{choices.map(choice => <Button key={choice.letter} disabled={completed || seconds === 0} variant={answers[q.id]?.value === choice.letter ? 'default' : 'outline'} className="w-full h-auto min-h-12 justify-start text-left whitespace-normal p-4" onClick={() => change(choice.letter)}><span className="font-mono mr-3">{choice.letter}</span><span className="min-w-0"><MathText text={choice.text}/>{choice.image && <img src={choice.image} alt={`Choice ${choice.letter}`} className="max-h-48"/>}</span></Button>)}</div> : <Input aria-label="Your answer" value={answers[q.id]?.value ?? ''} disabled={completed || seconds === 0} onChange={e => change(e.target.value)} placeholder="Your answer"/>}
      {completed && <div className="border-t pt-4 space-y-2"><p>Your answer: {answers[q.id]?.value || 'Not answered'} · Correct answer: {q.answer}</p>{q.rationale && <MathText text={q.rationale}/>}</div>}
      <div className="flex justify-between gap-2"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(i => i - 1)}>Previous</Button><Button disabled={index === module.questions.length - 1} onClick={() => setIndex(i => i + 1)}>Next</Button></div>
    </section><aside className="space-y-4"><div className="grid grid-cols-5 gap-2">{module.questions.map((item, i) => <Button key={item.id} size="icon" variant={index === i ? 'default' : 'outline'} className={`w-full relative ${answers[item.id]?.value && index !== i ? 'bg-foreground/10' : ''}`} onClick={() => setIndex(i)}>{i + 1}{answers[item.id]?.flagged && <Flag className="absolute top-0 right-0 h-2 w-2"/>}</Button>)}</div>{module.section === 'math' && <><Button variant="outline" onClick={toggleCalculator}><Calculator className="h-4 w-4"/>Calculator</Button><DesmosCalculator/></>}{!completed && <Button disabled={busy} className="w-full" onClick={() => { if (seconds === 0 || window.confirm('Finish this module? You cannot return to it.')) void advance(); }}>{busy ? 'Saving…' : moduleIndex === 3 ? 'Finish test' : 'Finish module'}</Button>}</aside></div>}
  </div>;
}