import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MathText } from '@/components/MathText';
import { normaliseChoices } from '@/lib/bluebookReview';
import { PortalShell, STATUS_LABEL, useCenter } from './centerContext';

type Q = { id: string; question_text: string; question_image_url: string | null; question_image_url_2: string | null; multiple_choice_options: any; choice_images: any; answer: string; alternate_answers: any; rationale: string | null; subject: string | null; passage_text: string | null };
const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, '');

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
      return { student: s, cls: cls.data, att: att.data ?? [], attempts: attempts.data ?? [] };
    },
  });

  const [subject, setSubject] = useState<'math' | 'english'>('math');
  const [q, setQ] = useState<Q | null>(null);
  const [picked, setPicked] = useState(''); const [typed, setTyped] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [tries, setTries] = useState(0);

  const loadQuestion = useCallback(async () => {
    setResult(null); setPicked(''); setTyped(''); setTries(0);
    const sub = subject === 'math' ? ['math', 'Math'] : ['english', 'English'];
    const { count } = await supabase.from('questions').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('hide_from_practice', false).in('subject', sub);
    const offset = Math.floor(Math.random() * Math.max(1, count ?? 1));
    const { data } = await supabase.from('questions').select('id, question_text, question_image_url, question_image_url_2, multiple_choice_options, choice_images, answer, alternate_answers, rationale, subject, passage_text')
      .eq('is_active', true).eq('hide_from_practice', false).in('subject', sub).range(offset, offset);
    setQ((data?.[0] as Q) ?? null);
  }, [subject]);
  useEffect(() => { loadQuestion(); }, [loadQuestion]);

  const choices = q ? normaliseChoices(q.multiple_choice_options, q.choice_images) : [];
  const submit = async () => {
    if (!q || !me.data) return;
    const given = choices.length ? picked : typed;
    const alts: string[] = Array.isArray(q.alternate_answers) ? q.alternate_answers.map(String) : [];
    const ok = [q.answer, ...alts].some(a => norm(a) === norm(given));
    // Only the first try counts toward stats.
    if (tries === 0) {
      await supabase.from('tenant_attempts').insert({ institution_id: center.id, student_id: me.data.student.id, question_id: q.id, is_correct: ok });
      qc.invalidateQueries({ queryKey: ['center-student', center.id, userId] });
    }
    setTries(t => t + 1); setResult(ok ? 'correct' : 'wrong');
  };

  const total = me.data?.attempts.length ?? 0;
  const correct = me.data?.attempts.filter(a => a.is_correct).length ?? 0;
  const present = me.data?.att.filter(a => a.status === 'present' || a.status === 'late').length ?? 0;

  return (
    <PortalShell title="Student">
      {me.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !me.data ? <p className="text-sm">Your account isn't linked. Contact your center.</p> : (
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <section className="space-y-5 min-w-0">
            <div className="flex gap-2" role="tablist" aria-label="Subject">
              {(['math', 'english'] as const).map(s => <button key={s} role="tab" aria-selected={subject === s} onClick={() => setSubject(s)}
                className={`rounded-md px-3 py-1.5 text-sm border active:scale-[0.97] ${subject === s ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>{s === 'math' ? 'Math' : 'English'}</button>)}
            </div>
            {!q ? <p className="text-sm text-muted-foreground">Loading question…</p> : (
              <article className="rounded-lg border bg-card p-5 space-y-5">
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
                {result === 'correct' && (
                  <div role="status" className="space-y-3"><p className="text-sm text-status-healthy">Correct!</p>
                    {q.rationale && <div className="text-sm text-muted-foreground border-t pt-3"><MathText text={q.rationale} /></div>}</div>
                )}
                <div className="flex gap-2">
                  {result !== 'correct' && <Button onClick={submit} disabled={choices.length ? !picked : !typed.trim()}>Check</Button>}
                  <Button variant={result === 'correct' ? 'default' : 'ghost'} onClick={loadQuestion}>Next question</Button>
                </div>
              </article>
            )}
          </section>
          <aside className="space-y-6">
            <div><p className="text-xs text-muted-foreground">Class</p><p className="font-medium">{me.data.cls?.name ?? 'Not assigned'}</p>{me.data.cls?.schedule && <p className="text-xs text-muted-foreground">{me.data.cls.schedule}</p>}</div>
            <div className="grid grid-cols-2 gap-4 border-y py-4">
              <div><p className="text-xs text-muted-foreground">Answered</p><p className="font-mono text-xl">{total}</p></div>
              <div><p className="text-xs text-muted-foreground">Accuracy</p><p className="font-mono text-xl">{total ? `${Math.round(100 * correct / total)}%` : '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Attended</p><p className="font-mono text-xl">{present}/{me.data.att.length}</p></div>
            </div>
            {me.data.att.length > 0 && <ul className="text-sm space-y-1">{me.data.att.slice(0, 8).map(a => <li key={a.session_date} className="flex justify-between"><span className="font-mono text-xs">{a.session_date}</span><span className="text-muted-foreground">{STATUS_LABEL[a.status]}</span></li>)}</ul>}
          </aside>
        </div>
      )}
    </PortalShell>
  );
}
