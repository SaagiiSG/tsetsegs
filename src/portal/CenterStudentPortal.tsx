import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MathText } from '@/components/MathText';
import { ExplanationView } from '@/components/explanation/ExplanationView';
import { DesmosCalculator, toggleCalculator } from '@/components/student/DesmosCalculator';
import { normaliseChoices } from '@/lib/bluebookReview';
import { PortalShell, STATUS_LABEL, useCenter } from './centerContext';
import { StudentAnnouncements, StudentSprint } from './StudentExtras';
import { StudentLive, isCorrect } from './LiveSession';
import { domainStats, loadQuestionMeta, pct } from './questionMeta';

type Q = { id: string; question_text: string; question_image_url: string | null; question_image_url_2: string | null; multiple_choice_options: any; choice_images: any; answer: string; alternate_answers: any; rationale: string | null; subject: string | null; passage_text: string | null };
const COLS = 'id, question_text, question_image_url, question_image_url_2, multiple_choice_options, choice_images, answer, alternate_answers, rationale, subject, passage_text';
const DIFFS = [['all', 'Any difficulty'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']] as const;

export default function CenterStudentPortal() {
  const { center, userId } = useCenter();
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ['center-student', center.id, userId],
    queryFn: async () => {
      const { data: s } = await supabase.from('tenant_students').select('id, name, class_id').eq('institution_id', center.id).eq('user_id', userId!).maybeSingle();
      if (!s) throw new Error('missing');
      const [cls, att, attempts] = await Promise.all([
        s.class_id ? supabase.from('tenant_classes').select('name, schedule').eq('id', s.class_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('tenant_attendance').select('session_date, status').eq('student_id', s.id).order('session_date', { ascending: false }).limit(30),
        supabase.from('tenant_attempts').select('question_id, is_correct').eq('student_id', s.id).limit(10000),
      ]);
      const list = attempts.data ?? [];
      const meta = await loadQuestionMeta(list.map(a => a.question_id));
      return { student: s, cls: cls.data, att: att.data ?? [], attempts: list, meta };
    },
  });

  const cats = useQuery({ queryKey: ['question-categories'], queryFn: async () => (await supabase.from('question_categories').select('id, name').order('name')).data ?? [] });
  const [subject, setSubject] = useState<'math' | 'english'>('math');
  const [domain, setDomain] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [q, setQ] = useState<Q | null | undefined>(undefined);
  const [picked, setPicked] = useState(''); const [typed, setTyped] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [tries, setTries] = useState(0);
  const [showExp, setShowExp] = useState(false);
  const [forfeit, setForfeit] = useState(false);

  // Only offer domains that actually have questions for the chosen subject.
  const domainOptions = useMemo(() => {
    const english = ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'];
    return (cats.data ?? []).filter(c => subject === 'english' ? english.includes(c.name) : !english.includes(c.name));
  }, [cats.data, subject]);
  useEffect(() => { setDomain('all'); }, [subject]);

  const loadQuestion = useCallback(async () => {
    setResult(null); setPicked(''); setTyped(''); setTries(0); setShowExp(false); setForfeit(false); setQ(undefined);
    const sub = subject === 'math' ? ['math', 'Math'] : ['english', 'English'];
    const base = () => {
      let b = supabase.from('intl_questions').select(COLS, { count: 'exact' }).eq('is_active', true).eq('hide_from_practice', false).in('subject', sub);
      if (domain !== 'all') b = b.eq('category_id', domain);
      if (difficulty !== 'all') b = b.ilike('difficulty_level', difficulty);
      return b;
    };
    const { count } = await base().range(0, 0);
    if (!count) { setQ(null); return; }
    const offset = Math.floor(Math.random() * count);
    const { data } = await base().range(offset, offset);
    setQ((data?.[0] as Q) ?? null);
  }, [subject, domain, difficulty]);
  useEffect(() => { loadQuestion(); }, [loadQuestion]);

  const choices = q ? normaliseChoices(q.multiple_choice_options, q.choice_images) : [];
  const submit = async () => {
    if (!q || !me.data) return;
    const given = choices.length ? picked : typed;
    const ok = isCorrect(q, given);
    // Only the first try counts, and peeking at the explanation first forfeits it.
    if (tries === 0 && !forfeit) {
      await supabase.from('tenant_attempts').insert({ institution_id: center.id, student_id: me.data.student.id, question_id: q.id, is_correct: ok });
      qc.invalidateQueries({ queryKey: ['center-student', center.id, userId] });
    }
    setTries(t => t + 1); setResult(ok ? 'correct' : 'wrong');
  };
  const openExplanation = () => {
    if (!showExp && result !== 'correct' && q?.rationale && !forfeit) {
      if (!window.confirm('Viewing the explanation before solving means this question won\'t count toward your stats. Continue?')) return;
      setForfeit(true);
    }
    setShowExp(v => !v);
  };

  const total = me.data?.attempts.length ?? 0;
  const correct = me.data?.attempts.filter(a => a.is_correct).length ?? 0;
  const present = me.data?.att.filter(a => a.status === 'present' || a.status === 'late').length ?? 0;
  const domains = useMemo(() => me.data ? domainStats(me.data.attempts, me.data.meta) : [], [me.data]);

  return (
    <PortalShell glass title="Student">
      {me.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !me.data ? <p className="text-sm">Your account isn't linked. Contact your center.</p> : (
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <section className="space-y-5 min-w-0">
            {me.data.student.class_id && <StudentLive studentId={me.data.student.id} classId={me.data.student.class_id} />}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1 rounded-lg border p-1 admin-glass-item" role="tablist" aria-label="Subject">
                {(['math', 'english'] as const).map(s => <button key={s} role="tab" aria-selected={subject === s} onClick={() => setSubject(s)}
                  className={`rounded-md px-3 py-1 text-sm active:scale-[0.97] transition-colors ${subject === s ? 'bg-foreground text-background' : 'text-foreground/70 hover:text-foreground'}`}>{s === 'math' ? 'Math' : 'English'}</button>)}
              </div>
              <Select value={domain} onValueChange={setDomain}><SelectTrigger className="w-56" aria-label="Domain"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All domains</SelectItem>{domainOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
              <Select value={difficulty} onValueChange={setDifficulty}><SelectTrigger className="w-40" aria-label="Difficulty"><SelectValue /></SelectTrigger>
                <SelectContent>{DIFFS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
              {subject === 'math' && <Button variant="outline" size="sm" onClick={toggleCalculator}><Calculator className="h-4 w-4" />Desmos</Button>}
            </div>
            {q === undefined ? <p className="text-sm text-muted-foreground">Loading question…</p> : q === null ? <p className="text-sm text-muted-foreground">No questions match these filters. Try another domain or difficulty.</p> : (
              <div className={`grid gap-4 ${showExp ? 'xl:grid-cols-[1fr_minmax(0,420px)]' : ''}`}>
                <article className="admin-glass-card rounded-xl border p-5 space-y-5 min-w-0">
                  {q.passage_text && <div className="text-sm leading-relaxed border-l-2 pl-4"><MathText text={q.passage_text} /></div>}
                  <div className="leading-relaxed"><MathText text={q.question_text} /></div>
                  {[q.question_image_url, q.question_image_url_2].filter(Boolean).map(u => <img key={u!} src={u!} alt="Question figure" className="max-h-80 rounded border bg-background" />)}
                  {choices.length ? (
                    <div className="grid gap-2">{choices.map(c => (
                      <button key={c.letter} disabled={result === 'correct'} onClick={() => { setPicked(c.letter); if (result === 'wrong') setResult(null); }}
                        className={`text-left rounded-md border p-3 flex gap-3 items-start transition-colors active:scale-[0.99] ${picked === c.letter ? 'border-foreground bg-muted' : 'hover:bg-muted/50'}`}>
                        <span className="font-mono text-sm w-5">{c.letter}</span><span className="min-w-0 flex-1">{c.image ? <img src={c.image} alt={`Choice ${c.letter}`} className="max-h-40" /> : <MathText text={c.text} />}</span>
                      </button>))}</div>
                  ) : <Input aria-label="Your answer" value={typed} onChange={e => { setTyped(e.target.value); if (result === 'wrong') setResult(null); }} placeholder="Type your answer" className="max-w-xs font-mono" />}
                  {result === 'wrong' && <p role="status" className="text-sm text-status-risk">Not quite — try again.</p>}
                  {result === 'correct' && <p role="status" className="text-sm text-status-healthy">Correct!{forfeit && ' (not counted — explanation viewed)'}</p>}
                  <div className="flex flex-wrap gap-2">
                    {result !== 'correct' && <Button onClick={submit} disabled={choices.length ? !picked : !typed.trim()}>Check</Button>}
                    <Button variant="outline" onClick={openExplanation}><Lightbulb className="h-4 w-4" />{showExp ? 'Hide explanation' : 'Show explanation'}</Button>
                    <Button variant={result === 'correct' ? 'default' : 'ghost'} onClick={loadQuestion}>Next question</Button>
                  </div>
                </article>
                {showExp && (
                  <aside className="admin-glass-card rounded-xl border p-5 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
                    <p className="text-xs text-muted-foreground mb-3">Explanation</p>
                    {q.rationale ? <ExplanationView text={q.rationale} /> : <p className="text-sm text-muted-foreground">No explanation has been written for this question yet.</p>}
                  </aside>
                )}
              </div>
            )}
          </section>
          <aside className="space-y-6">
            <div className="admin-glass-card rounded-xl border p-4 space-y-4">
              <div><p className="text-xs text-muted-foreground">Class</p><p className="font-medium">{me.data.cls?.name ?? 'Not assigned'}</p>{me.data.cls?.schedule && <p className="text-xs text-muted-foreground">{me.data.cls.schedule}</p>}</div>
              <div className="grid grid-cols-3 gap-3 border-t pt-4">
                <div><p className="text-xs text-muted-foreground">Answered</p><p className="font-mono text-xl">{total}</p></div>
                <div><p className="text-xs text-muted-foreground">Accuracy</p><p className="font-mono text-xl">{total ? `${pct(correct, total)}%` : '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Attended</p><p className="font-mono text-xl">{present}/{me.data.att.length}</p></div>
              </div>
            </div>
            {domains.length > 0 && (
              <div className="admin-glass-card rounded-xl border p-4 space-y-3"><p className="text-xs text-muted-foreground">Your domains</p>
                {domains.map(d => <div key={d.domain} className="space-y-1"><div className="flex justify-between text-xs"><span>{d.domain}</span><span className="font-mono">{pct(d.c, d.n)}%</span></div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-foreground/70" style={{ width: `${pct(d.c, d.n)}%` }} /></div></div>)}
              </div>
            )}
            <StudentAnnouncements studentId={me.data.student.id} />
            <StudentSprint studentId={me.data.student.id} />
            {me.data.att.length > 0 && <ul className="text-sm space-y-1">{me.data.att.slice(0, 8).map(a => <li key={a.session_date} className="flex justify-between"><span className="font-mono text-xs">{a.session_date}</span><span className="text-muted-foreground">{STATUS_LABEL[a.status]}</span></li>)}</ul>}
          </aside>
        </div>
      )}
      {subject === 'math' && <DesmosCalculator />}
    </PortalShell>
  );
}
