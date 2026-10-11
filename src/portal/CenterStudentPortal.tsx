import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calculator, Lightbulb, Home, BookOpen, RotateCcw, Zap, Trophy, PlayCircle, Award, LogOut, Megaphone, Timer,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MathText } from '@/components/MathText';
import { ExplanationView } from '@/components/explanation/ExplanationView';
import { DesmosCalculator, toggleCalculator } from '@/components/student/DesmosCalculator';
import { ConceptVideoPlayer } from '@/components/concept-videos/ConceptVideoPlayer';
import { LiquidGlassFX } from '@/components/admin/LiquidGlassFX';
import { liquidTrack, liquidRest } from '@/hooks/useLiquidHighlight';
import { AdminBackgroundPaths } from '@/components/ui/background-paths';
import { normaliseChoices } from '@/lib/bluebookReview';
import { CenterLogo, STATUS_LABEL, centerDisplayName, hexToHslToken, useCenter } from './centerContext';
import { StudentAnnouncements } from './StudentExtras';
import { SprintLeaderboard, useCenterSprints } from './admin/ToolPages';
import { StudentLive, isCorrect } from './LiveSession';
import { domainStats, loadQuestionMeta, pct } from './questionMeta';

type Q = { id: string; question_text: string; question_image_url: string | null; question_image_url_2: string | null; multiple_choice_options: any; choice_images: any; answer: string; alternate_answers: any; rationale: string | null; subject: string | null; passage_text: string | null };
const COLS = 'id, question_text, question_image_url, question_image_url_2, multiple_choice_options, choice_images, answer, alternate_answers, rationale, subject, passage_text';
const DIFFS = [['all', 'Any difficulty'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']] as const;
/** Math sets available to international students (the intl bank hides everything else). */
const SETS = [
  { key: '68', label: '68 Questions', blurb: 'Core SAT math patterns' },
  { key: 'SATMathTraining800', label: '150 Hard', blurb: 'Hardest problems for 800' },
  { key: 'ANP120Aug3', label: 'Updated set', blurb: 'Freshly explained problems' },
] as const;
const DAILY_GOAL = 20;
const glass = 'relative admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-5';

function Glass({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div onPointerMove={liquidTrack} onPointerLeave={liquidRest} className={`${glass} ${className}`}><LiquidGlassFX /><div className="relative">{children}</div></div>;
}

/** Everything the student pages share: profile, class, attendance, attempts + question meta. */
function useMe() {
  const { center, userId } = useCenter();
  return useQuery({
    queryKey: ['center-student', center.id, userId],
    queryFn: async () => {
      const { data: s } = await supabase.from('tenant_students').select('id, name, class_id').eq('institution_id', center.id).eq('user_id', userId!).maybeSingle();
      if (!s) throw new Error('missing');
      const [cls, att, attempts] = await Promise.all([
        s.class_id ? supabase.from('tenant_classes').select('name, schedule').eq('id', s.class_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('tenant_attendance').select('session_date, status').eq('student_id', s.id).order('session_date', { ascending: false }).limit(60),
        supabase.from('tenant_attempts').select('question_id, is_correct, created_at').eq('student_id', s.id).order('created_at', { ascending: false }).limit(10000),
      ]);
      const list = attempts.data ?? [];
      const meta = await loadQuestionMeta(list.map(a => a.question_id));
      return { student: s, cls: cls.data as { name: string; schedule: string | null } | null, att: att.data ?? [], attempts: list, meta };
    },
  });
}
type Me = NonNullable<ReturnType<typeof useMe>['data']>;

function useSetTotals() {
  return useQuery({
    queryKey: ['intl-set-totals'],
    queryFn: async () => {
      const out: Record<string, string[]> = {};
      await Promise.all(SETS.map(async s => {
        const { data } = await supabase.from('intl_questions').select('id').eq('question_set', s.key).eq('is_active', true).eq('hide_from_practice', false).limit(1000);
        out[s.key] = (data ?? []).map(r => r.id);
      }));
      return out;
    },
  });
}

/* ------------------------------ Shell ------------------------------ */

const NAV = [
  { to: '/student', label: 'Home', icon: Home, end: true },
  { to: '/student/practice', label: 'Practice', icon: BookOpen },
  { to: '/student/speed', label: 'Speed mode', icon: Zap },
  { to: '/student/review', label: 'Review mistakes', icon: RotateCcw },
  { to: '/student/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/student/videos', label: 'Concept videos', icon: PlayCircle },
  { to: '/student/badges', label: 'Badges', icon: Award },
  { to: '/student/announcements', label: 'Announcements', icon: Megaphone },
];

export default function CenterStudentPortal() {
  const { center, name, signOut } = useCenter();
  const me = useMe();
  const glow = (center.portal_settings?.brand_color && hexToHslToken(center.portal_settings.brand_color)) || '217 91% 60%';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted overflow-x-hidden admin-glow-scope" style={{ '--section-glow': glow } as React.CSSProperties}>
      <div aria-hidden className="admin-page-atmosphere" />
      <AdminBackgroundPaths />
      <div className="relative flex">
        <aside className="hidden md:flex sticky top-3 m-3 h-[calc(100vh-1.5rem)] w-60 shrink-0 flex-col admin-glass rounded-2xl border p-3">
          <div className="flex items-center gap-2.5 px-2 pt-2 pb-4">
            <CenterLogo center={center} className="h-8 w-8" />
            <div className="min-w-0"><p className="text-sm font-semibold truncate">{centerDisplayName(center)}</p><p className="text-xs text-muted-foreground truncate">{name}</p></div>
          </div>
          <nav aria-label="Student" className="flex-1 space-y-0.5 overflow-y-auto">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors active:scale-[0.98] ${isActive ? 'bg-foreground text-background font-medium' : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'}`}>
                <Icon className="h-4 w-4" />{label}
              </NavLink>
            ))}
          </nav>
          <Button variant="ghost" size="sm" className="justify-start text-muted-foreground" onClick={signOut}><LogOut className="h-4 w-4" />Log out</Button>
        </aside>

        <main className="flex-1 min-w-0 p-3 md:p-6 lg:p-8 pb-28 md:pb-8">
          <div className="md:hidden flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><CenterLogo center={center} className="h-8 w-8" /><p className="font-semibold">{centerDisplayName(center)}</p></div>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Log out"><LogOut className="h-4 w-4" /></Button>
          </div>
          {me.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !me.data ? <p className="text-sm">Your account isn't linked. Contact your center.</p> : (
            <div className="max-w-[1400px] mx-auto space-y-5">
              {me.data.student.class_id && <StudentLive studentId={me.data.student.id} classId={me.data.student.class_id} />}
              <Routes>
                <Route index element={<HomePage me={me.data} />} />
                <Route path="practice" element={<PracticePage me={me.data} />} />
                <Route path="speed" element={<SpeedPage me={me.data} />} />
                <Route path="review" element={<ReviewPage me={me.data} />} />
                <Route path="leaderboard" element={<LeaderboardPage me={me.data} />} />
                <Route path="videos" element={<VideosPage />} />
                <Route path="badges" element={<BadgesPage me={me.data} />} />
                <Route path="announcements" element={<div className="max-w-2xl"><h1 className="text-2xl font-bold mb-4">Announcements</h1><StudentAnnouncements studentId={me.data.student.id} /></div>} />
                <Route path="*" element={<Navigate to="/student" replace />} />
              </Routes>
            </div>
          )}
        </main>
      </div>

      {/* Mobile glass dock */}
      <nav aria-label="Student" className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 admin-glass rounded-full border shadow-lg px-1.5 py-1.5 flex items-center gap-0.5">
        {NAV.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => `rounded-full p-2.5 transition-colors ${isActive ? 'bg-foreground text-background' : 'text-foreground/65'}`}><Icon className="h-4 w-4" /></NavLink>
        ))}
      </nav>
    </div>
  );
}

/* ------------------------------ Home ------------------------------ */

function Ring({ value, goal, label }: { value: number; goal: number; label: string }) {
  const r = 52, c = 2 * Math.PI * r, p = Math.min(1, goal ? value / goal : 0);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
        <circle cx="60" cy="60" r={r} className="stroke-muted" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke="hsl(var(--section-glow))" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <p className="-mt-24 mb-14 font-mono text-2xl">{value}<span className="text-sm text-muted-foreground">/{goal}</span></p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function HomePage({ me }: { me: Me }) {
  const navigate = useNavigate();
  const totals = useSetTotals();
  const today = new Date().toDateString();
  const todayList = me.attempts.filter(a => new Date(a.created_at).toDateString() === today);
  const total = me.attempts.length, correct = me.attempts.filter(a => a.is_correct).length;
  const present = me.att.filter(a => a.status === 'present' || a.status === 'late').length;
  const domains = useMemo(() => domainStats(me.attempts, me.meta), [me]);
  const solved = useMemo(() => new Set(me.attempts.filter(a => a.is_correct).map(a => a.question_id)), [me]);
  const streak = useMemo(() => {
    const days = new Set(me.attempts.map(a => new Date(a.created_at).toDateString()));
    let n = 0; const d = new Date();
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }, [me]);
  const first = me.student.name.split(' ')[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Hey {first} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{todayList.length >= DAILY_GOAL ? 'Daily goal done — keep the streak going.' : "Let's close today's ring."}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-12">
        <Glass className="md:col-span-4 lg:col-span-3 flex flex-col items-center justify-center">
          <Ring value={todayList.length} goal={DAILY_GOAL} label="Questions today" />
          <div className="grid grid-cols-2 gap-6 text-center mt-2">
            <div><p className="font-mono text-xl">{streak}🔥</p><p className="text-xs text-muted-foreground">Day streak</p></div>
            <div><p className="font-mono text-xl">{todayList.length ? `${pct(todayList.filter(a => a.is_correct).length, todayList.length)}%` : '—'}</p><p className="text-xs text-muted-foreground">Today</p></div>
          </div>
        </Glass>
        <div className="md:col-span-8 lg:col-span-9 grid gap-4 sm:grid-cols-3">
          {SETS.map(s => {
            const ids = totals.data?.[s.key] ?? [];
            const done = ids.filter(id => solved.has(id)).length;
            return (
              <button key={s.key} onClick={() => navigate(`/student/practice?set=${s.key}`)} className="text-left">
                <Glass className="h-full hover:-translate-y-0.5 transition-transform">
                  <p className="text-xs text-muted-foreground">{s.blurb}</p>
                  <p className="text-lg font-semibold mt-1">{s.label}</p>
                  <p className="font-mono text-3xl mt-6">{done}<span className="text-base text-muted-foreground">/{ids.length || '…'}</span></p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2"><div className="h-full rounded-full" style={{ width: `${pct(done, ids.length)}%`, background: 'hsl(var(--section-glow))' }} /></div>
                  <p className="text-xs text-muted-foreground mt-3">Continue →</p>
                </Glass>
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Glass className="lg:col-span-2 space-y-3">
          <p className="font-medium">Domain mastery</p>
          {!domains.length ? <p className="text-sm text-muted-foreground">Solve a few problems to see your strengths.</p> : domains.map(d => (
            <div key={d.domain} className="space-y-1"><div className="flex justify-between text-sm"><span>{d.domain} <span className="text-xs text-muted-foreground capitalize">· {d.subject}</span></span><span className="font-mono text-xs">{pct(d.c, d.n)}% <span className="text-muted-foreground">({d.n})</span></span></div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-foreground/70" style={{ width: `${pct(d.c, d.n)}%` }} /></div></div>
          ))}
        </Glass>
        <Glass className="space-y-4">
          <div><p className="text-xs text-muted-foreground">Class</p><p className="font-medium">{me.cls?.name ?? 'Not assigned'}</p>{me.cls?.schedule && <p className="text-xs text-muted-foreground">{me.cls.schedule}</p>}</div>
          <div className="grid grid-cols-3 gap-3 border-t pt-4">
            <div><p className="text-xs text-muted-foreground">Answered</p><p className="font-mono text-xl">{total}</p></div>
            <div><p className="text-xs text-muted-foreground">Accuracy</p><p className="font-mono text-xl">{total ? `${pct(correct, total)}%` : '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Attended</p><p className="font-mono text-xl">{present}/{me.att.length}</p></div>
          </div>
          {me.att.length > 0 && <ul className="text-sm space-y-1 border-t pt-3">{me.att.slice(0, 6).map(a => <li key={a.session_date} className="flex justify-between"><span className="font-mono text-xs">{a.session_date}</span><span className="text-muted-foreground">{STATUS_LABEL[a.status]}</span></li>)}</ul>}
        </Glass>
      </div>
    </div>
  );
}

/* ------------------------------ Solver ------------------------------ */

function useRecordAttempt(me: Me) {
  const { center, userId } = useCenter();
  const qc = useQueryClient();
  return async (questionId: string, ok: boolean) => {
    await supabase.from('tenant_attempts').insert({ institution_id: center.id, student_id: me.student.id, question_id: questionId, is_correct: ok });
    qc.invalidateQueries({ queryKey: ['center-student', center.id, userId] });
  };
}

function Solver({ q, me, onNext }: { q: Q; me: Me; onNext: () => void }) {
  const record = useRecordAttempt(me);
  const [picked, setPicked] = useState(''); const [typed, setTyped] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [tries, setTries] = useState(0);
  const [showExp, setShowExp] = useState(false);
  const [forfeit, setForfeit] = useState(false);
  useEffect(() => { setPicked(''); setTyped(''); setResult(null); setTries(0); setShowExp(false); setForfeit(false); }, [q.id]);
  const choices = normaliseChoices(q.multiple_choice_options, q.choice_images);
  const submit = async () => {
    const ok = isCorrect(q, choices.length ? picked : typed);
    // Only the first try counts, and peeking at the explanation first forfeits it.
    if (tries === 0 && !forfeit) await record(q.id, ok);
    setTries(t => t + 1); setResult(ok ? 'correct' : 'wrong');
  };
  const openExplanation = () => {
    if (!showExp && result !== 'correct' && q.rationale && !forfeit) {
      if (!window.confirm("Viewing the explanation before solving means this question won't count toward your stats. Continue?")) return;
      setForfeit(true);
    }
    setShowExp(v => !v);
  };
  return (
    <div className={`grid gap-4 ${showExp ? 'xl:grid-cols-[1fr_minmax(0,420px)]' : ''}`}>
      <article className="admin-glass-card rounded-2xl border p-5 space-y-5 min-w-0">
        {q.passage_text && <div className="text-sm leading-relaxed border-l-2 pl-4"><MathText text={q.passage_text} /></div>}
        <div className="leading-relaxed"><MathText text={q.question_text} /></div>
        {[q.question_image_url, q.question_image_url_2].filter(Boolean).map(u => <img key={u!} src={u!} alt="Question figure" className="max-h-80 rounded border bg-background" />)}
        {choices.length ? (
          <div className="grid gap-2">{choices.map(c => (
            <button key={c.letter} disabled={result === 'correct'} onClick={() => { setPicked(c.letter); if (result === 'wrong') setResult(null); }}
              className={`text-left rounded-xl border p-3 flex gap-3 items-start transition-colors active:scale-[0.99] ${picked === c.letter ? 'border-foreground bg-muted' : 'hover:bg-muted/50'}`}>
              <span className="font-mono text-sm w-5">{c.letter}</span><span className="min-w-0 flex-1">{c.image ? <img src={c.image} alt={`Choice ${c.letter}`} className="max-h-40" /> : <MathText text={c.text} />}</span>
            </button>))}</div>
        ) : <Input aria-label="Your answer" value={typed} onChange={e => { setTyped(e.target.value); if (result === 'wrong') setResult(null); }} placeholder="Type your answer" className="max-w-xs font-mono" />}
        {result === 'wrong' && <p role="status" className="text-sm text-status-risk">Not quite — try again.</p>}
        {result === 'correct' && <p role="status" className="text-sm text-status-healthy">Correct!{forfeit && ' (not counted — explanation viewed)'}</p>}
        <div className="flex flex-wrap gap-2">
          {result !== 'correct' && <Button onClick={submit} disabled={choices.length ? !picked : !typed.trim()}>Check</Button>}
          <Button variant="outline" onClick={openExplanation}><Lightbulb className="h-4 w-4" />{showExp ? 'Hide explanation' : 'Show explanation'}</Button>
          <Button variant={result === 'correct' ? 'default' : 'ghost'} onClick={onNext}>Next question</Button>
        </div>
      </article>
      {showExp && (
        <aside className="admin-glass-card rounded-2xl border p-5 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-3">Explanation</p>
          {q.rationale ? <ExplanationView text={q.rationale} /> : <p className="text-sm text-muted-foreground">No explanation has been written for this question yet.</p>}
        </aside>
      )}
    </div>
  );
}

/* ------------------------------ Practice ------------------------------ */

function PracticePage({ me }: { me: Me }) {
  const [params, setParams] = useSearchParams();
  const set = params.get('set') ?? 'all';
  const pinned = params.get('q');
  const cats = useQuery({ queryKey: ['question-categories'], queryFn: async () => (await supabase.from('question_categories').select('id, name').order('name')).data ?? [] });
  const [subject, setSubject] = useState<'math' | 'english'>(set !== 'all' ? 'math' : 'math');
  const [domain, setDomain] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [q, setQ] = useState<Q | null | undefined>(undefined);

  const domainOptions = useMemo(() => {
    const english = ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'];
    return (cats.data ?? []).filter(c => subject === 'english' ? english.includes(c.name) : !english.includes(c.name));
  }, [cats.data, subject]);
  useEffect(() => { setDomain('all'); }, [subject]);

  const loadQuestion = useCallback(async () => {
    setQ(undefined);
    if (pinned) {
      const { data } = await supabase.from('intl_questions').select(COLS).eq('id', pinned).maybeSingle();
      setQ((data as Q) ?? null); return;
    }
    const sub = subject === 'math' ? ['math', 'Math'] : ['english', 'English'];
    const base = () => {
      let b = supabase.from('intl_questions').select(COLS, { count: 'exact' }).eq('is_active', true).eq('hide_from_practice', false).in('subject', sub);
      if (subject === 'math' && set !== 'all') b = b.eq('question_set', set);
      if (domain !== 'all') b = b.eq('category_id', domain);
      if (difficulty !== 'all') b = b.ilike('difficulty_level', difficulty);
      return b;
    };
    const { count } = await base().range(0, 0);
    if (!count) { setQ(null); return; }
    const offset = Math.floor(Math.random() * count);
    const { data } = await base().range(offset, offset);
    setQ((data?.[0] as Q) ?? null);
  }, [subject, domain, difficulty, set, pinned]);
  useEffect(() => { loadQuestion(); }, [loadQuestion]);

  const setSet = (v: string) => { const p = new URLSearchParams(params); p.delete('q'); v === 'all' ? p.delete('set') : p.set('set', v); setParams(p); setSubject('math'); };
  const next = () => { if (pinned) { const p = new URLSearchParams(params); p.delete('q'); setParams(p); } else loadQuestion(); };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Practice</h1>
      <div className="flex flex-wrap gap-2 items-center p-2 admin-glass rounded-xl border">
        <div className="flex gap-1 rounded-lg border p-1" role="tablist" aria-label="Subject">
          {(['math', 'english'] as const).map(s => <button key={s} role="tab" aria-selected={subject === s} onClick={() => { setSubject(s); if (s === 'english') setSet('all'); }}
            className={`rounded-md px-3 py-1 text-sm active:scale-[0.97] transition-colors ${subject === s ? 'bg-foreground text-background' : 'text-foreground/70 hover:text-foreground'}`}>{s === 'math' ? 'Math' : 'English'}</button>)}
        </div>
        {subject === 'math' && <Select value={set} onValueChange={setSet}><SelectTrigger className="w-44" aria-label="Question set"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All math sets</SelectItem>{SETS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select>}
        <Select value={domain} onValueChange={setDomain}><SelectTrigger className="w-56" aria-label="Domain"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All domains</SelectItem>{domainOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Select value={difficulty} onValueChange={setDifficulty}><SelectTrigger className="w-40" aria-label="Difficulty"><SelectValue /></SelectTrigger>
          <SelectContent>{DIFFS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
        {subject === 'math' && <Button variant="outline" size="sm" onClick={toggleCalculator}><Calculator className="h-4 w-4" />Desmos</Button>}
      </div>
      {q === undefined ? <p className="text-sm text-muted-foreground">Loading question…</p> : q === null ? <p className="text-sm text-muted-foreground">No questions match these filters. Try another set, domain or difficulty.</p> : <Solver q={q} me={me} onNext={next} />}
      {subject === 'math' && <DesmosCalculator />}
    </div>
  );
}

/* ------------------------------ Speed mode ------------------------------ */

const SPEED_COUNT = 10, SPEED_SECONDS = 90;
function SpeedPage({ me }: { me: Me }) {
  const record = useRecordAttempt(me);
  const [subject, setSubject] = useState<'math' | 'english'>('math');
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(SPEED_SECONDS);
  const [picked, setPicked] = useState(''); const [typed, setTyped] = useState('');
  const [score, setScore] = useState<boolean[]>([]);

  const start = async () => {
    const sub = subject === 'math' ? ['math', 'Math'] : ['english', 'English'];
    const { count } = await supabase.from('intl_questions').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('hide_from_practice', false).in('subject', sub);
    const off = Math.max(0, Math.floor(Math.random() * Math.max(1, (count ?? 0) - 60)));
    const { data } = await supabase.from('intl_questions').select(COLS).eq('is_active', true).eq('hide_from_practice', false).in('subject', sub).range(off, off + 59);
    const pool = [...(data as Q[] ?? [])].sort(() => Math.random() - 0.5).slice(0, SPEED_COUNT);
    setQs(pool); setI(0); setScore([]); setLeft(SPEED_SECONDS); setPicked(''); setTyped('');
  };
  const q = qs?.[i];
  const done = qs && i >= qs.length;
  const answer = useCallback(async (given: string) => {
    if (!q) return;
    const ok = !!given && isCorrect(q, given);
    record(q.id, ok);
    setScore(s => [...s, ok]); setI(n => n + 1); setLeft(SPEED_SECONDS); setPicked(''); setTyped('');
  }, [q, record]);
  useEffect(() => {
    if (!q) return;
    if (left <= 0) { answer(''); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, q, answer]);

  if (!qs) return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">Speed mode</h1>
      <Glass className="space-y-4">
        <p className="text-sm text-muted-foreground">{SPEED_COUNT} questions, {SPEED_SECONDS} seconds each. Every answer counts toward your stats.</p>
        <div className="flex gap-1 rounded-lg border p-1 w-fit">
          {(['math', 'english'] as const).map(s => <button key={s} onClick={() => setSubject(s)} className={`rounded-md px-3 py-1 text-sm ${subject === s ? 'bg-foreground text-background' : 'text-foreground/70'}`}>{s === 'math' ? 'Math' : 'English'}</button>)}
        </div>
        <Button onClick={start}><Zap className="h-4 w-4" />Start</Button>
      </Glass>
    </div>
  );
  if (done) {
    const c = score.filter(Boolean).length;
    const stars = c >= 9 ? 3 : c >= 7 ? 2 : c >= 5 ? 1 : 0;
    return (
      <Glass className="max-w-xl text-center space-y-3">
        <p className="text-4xl">{'★'.repeat(stars)}<span className="text-muted-foreground/30">{'★'.repeat(3 - stars)}</span></p>
        <p className="font-mono text-3xl">{c}/{qs.length}</p>
        <p className="text-sm text-muted-foreground">{stars === 3 ? 'Perfect pace.' : 'Run it again to climb a star.'}</p>
        <div className="flex justify-center gap-2"><Button onClick={start}>Play again</Button><Button variant="ghost" onClick={() => setQs(null)}>Change subject</Button></div>
      </Glass>
    );
  }
  if (!q) return <p className="text-sm text-muted-foreground">No questions available.</p>;
  const choices = normaliseChoices(q.multiple_choice_options, q.choice_images);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm">{i + 1}/{qs.length}</span>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full transition-[width] duration-1000 ease-linear" style={{ width: `${(left / SPEED_SECONDS) * 100}%`, background: left < 15 ? 'hsl(var(--status-risk, 0 80% 55%))' : 'hsl(var(--section-glow))' }} /></div>
        <span className="font-mono text-sm flex items-center gap-1"><Timer className="h-4 w-4" />{left}s</span>
      </div>
      <article className="admin-glass-card rounded-2xl border p-5 space-y-5">
        {q.passage_text && <div className="text-sm leading-relaxed border-l-2 pl-4"><MathText text={q.passage_text} /></div>}
        <div className="leading-relaxed"><MathText text={q.question_text} /></div>
        {[q.question_image_url, q.question_image_url_2].filter(Boolean).map(u => <img key={u!} src={u!} alt="Question figure" className="max-h-72 rounded border bg-background" />)}
        {choices.length ? <div className="grid gap-2">{choices.map(c => (
          <button key={c.letter} onClick={() => setPicked(c.letter)} className={`text-left rounded-xl border p-3 flex gap-3 ${picked === c.letter ? 'border-foreground bg-muted' : 'hover:bg-muted/50'}`}>
            <span className="font-mono text-sm w-5">{c.letter}</span><span className="flex-1 min-w-0">{c.image ? <img src={c.image} alt={`Choice ${c.letter}`} className="max-h-40" /> : <MathText text={c.text} />}</span></button>))}</div>
          : <Input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Type your answer" className="max-w-xs font-mono" />}
        <Button onClick={() => answer(choices.length ? picked : typed)} disabled={choices.length ? !picked : !typed.trim()}>Submit</Button>
      </article>
      {subject === 'math' && <><Button variant="outline" size="sm" onClick={toggleCalculator}><Calculator className="h-4 w-4" />Desmos</Button><DesmosCalculator /></>}
    </div>
  );
}

/* ------------------------------ Review ------------------------------ */

function ReviewPage({ me }: { me: Me }) {
  const navigate = useNavigate();
  // Questions whose latest attempt was wrong (attempts are newest-first).
  const pending = useMemo(() => {
    const seen = new Set<string>(); const out: { id: string; at: string }[] = [];
    for (const a of me.attempts) { if (seen.has(a.question_id)) continue; seen.add(a.question_id); if (!a.is_correct) out.push({ id: a.question_id, at: a.created_at }); }
    return out;
  }, [me]);
  const texts = useQuery({
    enabled: pending.length > 0,
    queryKey: ['center-review-texts', pending.map(p => p.id).join(',').slice(0, 200), pending.length],
    queryFn: async () => (await supabase.from('intl_questions').select('id, question_text').in('id', pending.slice(0, 150).map(p => p.id))).data ?? [],
  });
  const textOf = Object.fromEntries((texts.data ?? []).map(t => [t.id, t.question_text]));
  return (
    <div className="space-y-4 max-w-3xl">
      <div><h1 className="text-2xl font-bold tracking-tight">Review mistakes</h1><p className="text-sm text-muted-foreground">Retry questions you missed. Solve one correctly and it leaves this list.</p></div>
      {!pending.length ? <Glass><p className="text-sm text-muted-foreground">No mistakes waiting — nice work.</p></Glass> : (
        <ul className="space-y-2">{pending.slice(0, 150).map(p => (
          <li key={p.id}><button onClick={() => navigate(`/student/practice?q=${p.id}`)} className="w-full text-left admin-glass-card rounded-2xl border p-4 hover:-translate-y-0.5 transition-transform">
            <div className="text-sm line-clamp-2"><MathText text={(textOf[p.id] ?? '…').slice(0, 220)} /></div>
            <p className="text-xs text-muted-foreground mt-1">{me.meta[p.id]?.domain ?? ''} · missed {new Date(p.at).toLocaleDateString()}</p>
          </button></li>))}</ul>
      )}
    </div>
  );
}

/* ------------------------------ Leaderboard ------------------------------ */

function LeaderboardPage({ me }: { me: Me }) {
  const sprints = useCenterSprints();
  const list = (sprints.data ?? []).filter(s => s.status !== 'paused');
  const [id, setId] = useState<string | null>(null);
  const cur = list.find(s => s.id === id) ?? list.find(s => s.status === 'active') ?? list[0];
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
      {!cur ? <Glass><p className="text-sm text-muted-foreground">Your center hasn't started a sprint yet.</p></Glass> : (
        <Glass className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{cur.name} <span className="text-xs text-muted-foreground font-mono">{cur.starts_on} → {cur.ends_on}</span></p>
            {list.length > 1 && <Select value={cur.id} onValueChange={setId}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{list.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>}
          </div>
          <SprintLeaderboard sprintId={cur.id} highlight={me.student.id} />
        </Glass>
      )}
    </div>
  );
}

/* ------------------------------ Concept videos ------------------------------ */

function VideosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['center-concept-videos'],
    queryFn: async () => (await supabase.from('concept_videos').select('*').eq('is_published', true).order('order_index')).data ?? [],
  });
  const [open, setOpen] = useState<string | null>(null);
  const video = data?.find(v => v.id === open);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Concept videos</h1>
      {video && <Glass className="space-y-3"><p className="font-medium">{video.title}</p><ConceptVideoPlayer video={video as any} /></Glass>}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !data?.length ? <Glass><p className="text-sm text-muted-foreground">No videos yet.</p></Glass> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.map(v => (
          <button key={v.id} onClick={() => { setOpen(v.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-left">
            <Glass className={`h-full ${open === v.id ? 'ring-1 ring-foreground/40' : ''}`}><PlayCircle className="h-5 w-5 text-muted-foreground" /><p className="font-medium mt-2">{v.title}</p>{(v as any).description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{(v as any).description}</p>}</Glass>
          </button>))}</div>
      )}
    </div>
  );
}

/* ------------------------------ Badges ------------------------------ */

function BadgesPage({ me }: { me: Me }) {
  const totals = useSetTotals();
  const n = me.attempts.length, c = me.attempts.filter(a => a.is_correct).length;
  const solved = new Set(me.attempts.filter(a => a.is_correct).map(a => a.question_id));
  const present = me.att.filter(a => a.status === 'present' || a.status === 'late').length;
  const setDone = (k: string) => { const ids = totals.data?.[k] ?? []; return ids.length > 0 && ids.every(id => solved.has(id)); };
  const badges = [
    { name: 'First steps', desc: 'Answer 10 questions', got: n >= 10, prog: [n, 10] },
    { name: 'Centurion', desc: 'Answer 100 questions', got: n >= 100, prog: [n, 100] },
    { name: 'Marathon', desc: 'Answer 500 questions', got: n >= 500, prog: [n, 500] },
    { name: 'Sharpshooter', desc: '80% accuracy over 50+ questions', got: n >= 50 && c / n >= 0.8, prog: [n >= 50 ? Math.round(100 * c / n) : n, n >= 50 ? 80 : 50] },
    { name: 'Regular', desc: 'Attend 10 classes', got: present >= 10, prog: [present, 10] },
    ...SETS.map(s => ({ name: `${s.label} master`, desc: `Solve every ${s.label} question`, got: setDone(s.key), prog: [(totals.data?.[s.key] ?? []).filter(id => solved.has(id)).length, (totals.data?.[s.key] ?? []).length || 1] })),
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Badges <span className="text-base text-muted-foreground font-mono">{badges.filter(b => b.got).length}/{badges.length}</span></h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{badges.map(b => (
        <Glass key={b.name} className={b.got ? '' : 'opacity-60'}>
          <Award className={`h-6 w-6 ${b.got ? '' : 'text-muted-foreground'}`} style={b.got ? { color: 'hsl(var(--section-glow))' } : undefined} />
          <p className="font-medium mt-2">{b.name}</p><p className="text-xs text-muted-foreground">{b.desc}</p>
          {!b.got && <div className="h-1 rounded-full bg-muted overflow-hidden mt-3"><div className="h-full bg-foreground/60" style={{ width: `${Math.min(100, pct(b.prog[0], b.prog[1]))}%` }} /></div>}
        </Glass>))}</div>
    </div>
  );
}
