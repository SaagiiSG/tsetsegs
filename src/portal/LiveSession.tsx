import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Radio, ChevronRight, Eye, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MathText } from '@/components/MathText';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normaliseChoices } from '@/lib/bluebookReview';
import { toast } from 'sonner';
import { useCenter } from './centerContext';

type LiveQ = { id: string; question_text: string; question_image_url: string | null; multiple_choice_options: any; choice_images: any; answer: string; alternate_answers: any; passage_text: string | null };
const Q_COLS = 'id, question_text, question_image_url, multiple_choice_options, choice_images, answer, alternate_answers, passage_text';
const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, '');
export const isCorrect = (q: LiveQ, given: string) => {
  const alts: string[] = Array.isArray(q.alternate_answers) ? q.alternate_answers.map(String) : [];
  return [q.answer, ...alts].some(a => norm(a) === norm(given));
};

/** Re-fetches a query whenever its table changes for this session. */
function useLiveRefetch(table: string, filter: string, key: unknown[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel(`${table}-${filter}`).on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => qc.invalidateQueries({ queryKey: key })).subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter]);
}

function QuestionBody({ q, big = false }: { q: LiveQ; big?: boolean }) {
  return (
    <div className={`space-y-4 ${big ? 'text-lg' : ''}`}>
      {q.passage_text && <div className="text-sm leading-relaxed border-l-2 pl-4"><MathText text={q.passage_text} /></div>}
      <div className="leading-relaxed"><MathText text={q.question_text} /></div>
      {q.question_image_url && <img src={q.question_image_url} alt="Question figure" className="max-h-72 rounded border bg-background" />}
    </div>
  );
}

/* ---------------- Teacher host ---------------- */
export function TeacherLive({ classId, studentCount }: { classId: string; studentCount: number }) {
  const { center } = useCenter();
  const qc = useQueryClient();
  const [subject, setSubject] = useState('math');
  const [count, setCount] = useState('10');
  const [busy, setBusy] = useState(false);

  const sessionKey = ['center-live-host', classId];
  const session = useQuery({
    queryKey: sessionKey,
    queryFn: async () => (await supabase.from('tenant_live_sessions').select('*').eq('class_id', classId).eq('status', 'live').order('created_at', { ascending: false }).limit(1).maybeSingle()).data,
  });
  const s = session.data;
  const qid = s?.question_ids[s.current_index];
  const question = useQuery({ enabled: !!qid, queryKey: ['live-q', qid], queryFn: async () => (await supabase.from('intl_questions').select(Q_COLS).eq('id', qid!).single()).data as LiveQ });
  const answersKey = ['center-live-answers', s?.id, qid];
  const answers = useQuery({ enabled: !!s && !!qid, queryKey: answersKey, queryFn: async () => (await supabase.from('tenant_live_answers').select('student_id, answer, is_correct').eq('session_id', s!.id).eq('question_id', qid!)).data ?? [] });
  useLiveRefetch('tenant_live_answers', `session_id=eq.${s?.id ?? 'none'}`, answersKey);

  const start = async () => {
    setBusy(true);
    const sub = subject === 'math' ? ['math', 'Math'] : ['english', 'English'];
    const { data: pool } = await supabase.from('intl_questions').select('id').eq('is_active', true).eq('hide_from_practice', false).in('subject', sub).limit(1000);
    const ids = (pool ?? []).map(p => p.id).sort(() => Math.random() - 0.5).slice(0, Number(count));
    if (!ids.length) { setBusy(false); return toast.error('No questions available'); }
    const { error } = await supabase.from('tenant_live_sessions').insert({ institution_id: center.id, class_id: classId, question_ids: ids });
    setBusy(false);
    if (error) toast.error('Could not start the session'); else qc.invalidateQueries({ queryKey: sessionKey });
  };
  const patch = async (p: Record<string, unknown>) => {
    const { error } = await supabase.from('tenant_live_sessions').update(p).eq('id', s!.id);
    if (error) toast.error('Could not update the session'); qc.invalidateQueries({ queryKey: sessionKey });
  };

  if (session.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!s) return (
    <div className="admin-glass-card rounded-xl border p-6 max-w-lg space-y-4">
      <div><p className="font-medium flex items-center gap-2"><Radio className="h-4 w-4" />Start a live session</p>
        <p className="text-sm text-muted-foreground">Questions appear on every student's screen at the same time. You control when to reveal and move on.</p></div>
      <div className="flex flex-wrap gap-3">
        <Select value={subject} onValueChange={setSubject}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="math">Math</SelectItem><SelectItem value="english">English</SelectItem></SelectContent></Select>
        <Select value={count} onValueChange={setCount}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{['5', '10', '15', '20'].map(n => <SelectItem key={n} value={n}>{n} questions</SelectItem>)}</SelectContent></Select>
        <Button onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Go live'}</Button>
      </div>
    </div>
  );

  const total = s.question_ids.length;
  const a = answers.data ?? [];
  const right = a.filter(x => x.is_correct).length;
  const last = s.current_index >= total - 1;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-risk"><span className="h-2 w-2 rounded-full bg-status-risk animate-pulse" />LIVE</span>
        <span className="font-mono text-sm">Question {s.current_index + 1}/{total}</span>
        <span className="text-sm text-muted-foreground">{a.length}/{studentCount} answered</span>
        <div className="flex-1" />
        {!s.revealed && <Button variant="outline" onClick={() => patch({ revealed: true })}><Eye className="h-4 w-4" />Reveal answer</Button>}
        {s.revealed && !last && <Button onClick={() => patch({ current_index: s.current_index + 1, revealed: false })}>Next<ChevronRight className="h-4 w-4" /></Button>}
        <Button variant="ghost" onClick={() => patch({ status: 'ended' })}><Square className="h-4 w-4" />End</Button>
      </div>
      <div className="admin-glass-card rounded-xl border p-6">
        {question.data ? <QuestionBody q={question.data} big /> : <p className="text-sm text-muted-foreground">Loading question…</p>}
        {s.revealed && question.data && (
          <div className="mt-5 border-t pt-4 flex flex-wrap gap-6 text-sm">
            <p>Answer: <span className="font-mono font-medium">{question.data.answer}</span></p>
            <p>{right}/{a.length} correct {a.length ? `(${Math.round(100 * right / a.length)}%)` : ''}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Student player ---------------- */
export function StudentLive({ studentId, classId }: { studentId: string; classId: string }) {
  const { center } = useCenter();
  const qc = useQueryClient();
  const key = ['center-live-student', classId];
  const session = useQuery({ queryKey: key, queryFn: async () => (await supabase.from('tenant_live_sessions').select('*').eq('class_id', classId).eq('status', 'live').order('created_at', { ascending: false }).limit(1).maybeSingle()).data });
  useLiveRefetch('tenant_live_sessions', `class_id=eq.${classId}`, key);
  const s = session.data;
  const qid = s?.question_ids[s.current_index];
  const question = useQuery({ enabled: !!qid, queryKey: ['live-q', qid], queryFn: async () => (await supabase.from('intl_questions').select(Q_COLS).eq('id', qid!).single()).data as LiveQ });
  const mineKey = ['live-mine', s?.id, qid];
  const mine = useQuery({ enabled: !!qid, queryKey: mineKey, queryFn: async () => (await supabase.from('tenant_live_answers').select('answer, is_correct').eq('session_id', s!.id).eq('question_id', qid!).eq('student_id', studentId).maybeSingle()).data });
  const [picked, setPicked] = useState(''); const [typed, setTyped] = useState('');
  useEffect(() => { setPicked(''); setTyped(''); }, [qid]);
  const choices = useMemo(() => question.data ? normaliseChoices(question.data.multiple_choice_options, question.data.choice_images) : [], [question.data]);

  if (!s || !question.data) return null;
  const submit = async () => {
    const given = choices.length ? picked : typed;
    const { error } = await supabase.from('tenant_live_answers').insert({ session_id: s.id, institution_id: center.id, student_id: studentId, question_id: qid!, answer: given, is_correct: isCorrect(question.data!, given) });
    if (error) toast.error('Answer not saved — the teacher may have moved on.');
    qc.invalidateQueries({ queryKey: mineKey });
  };
  const locked = !!mine.data || s.revealed;
  return (
    <section aria-label="Live session" className="admin-glass-card admin-glass-card-glow rounded-xl border p-5 space-y-5">
      <div className="relative z-[1] flex items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-risk"><span className="h-2 w-2 rounded-full bg-status-risk animate-pulse" />LIVE</span>
        <span className="font-mono">Question {s.current_index + 1}/{s.question_ids.length}</span>
      </div>
      <div className="relative z-[1] space-y-5">
        <QuestionBody q={question.data} />
        {choices.length ? (
          <div className="grid gap-2">{choices.map(c => {
            const chosen = (mine.data?.answer ?? picked) === c.letter;
            const reveal = s.revealed && isCorrect(question.data!, c.letter);
            return <button key={c.letter} disabled={locked} onClick={() => setPicked(c.letter)}
              className={`text-left rounded-md border p-3 flex gap-3 items-start transition-colors active:scale-[0.99] ${reveal ? 'border-status-healthy bg-status-healthy/10' : chosen ? 'border-foreground bg-muted' : 'hover:bg-muted/50'}`}>
              <span className="font-mono text-sm w-5">{c.letter}</span><span className="min-w-0 flex-1">{c.image ? <img src={c.image} alt={`Choice ${c.letter}`} className="max-h-40" /> : <MathText text={c.text} />}</span>
            </button>;
          })}</div>
        ) : <Input aria-label="Your answer" disabled={locked} value={mine.data?.answer ?? typed} onChange={e => setTyped(e.target.value)} className="max-w-xs font-mono" />}
        {!locked && <Button onClick={submit} disabled={choices.length ? !picked : !typed.trim()}>Submit</Button>}
        {mine.data && !s.revealed && <p role="status" className="text-sm text-muted-foreground">Answer locked in — wait for your teacher.</p>}
        {s.revealed && <p role="status" className={`text-sm ${mine.data?.is_correct ? 'text-status-healthy' : 'text-status-risk'}`}>{mine.data ? (mine.data.is_correct ? 'Correct!' : `Not this time — answer: ${question.data.answer}`) : `Answer: ${question.data.answer}`}</p>}
      </div>
    </section>
  );
}
