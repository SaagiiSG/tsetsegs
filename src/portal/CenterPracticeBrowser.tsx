import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Check, ChevronRight, CircleDot, FileText, Shuffle, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SkyListSkeleton } from './SkySkeleton';
import { PRACTICE_SETS, inPracticeSet } from './practiceSets';

type Row = { id: string; question_id: string | null; subject: string | null; question_set: string | null; category_id: string | null; skill: string | null };
type Attempt = { question_id: string; is_correct: boolean };

const ENGLISH = ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'];
const short = (d: string) => d.replace(/ and .*/, '').replace(/Advanced Math/, 'Advanced').replace(/Data Analysis.*/, 'Data').replace(/Geometry.*/, 'Geometry');

/** Main-site style practice browser: subject + set tabs, overall progress, domain tree and question code grid. */
export function CenterPracticeBrowser({ attempts, subject, setKey, onSubject, onSet, onOpen, onRandom }: {
  attempts: Attempt[]; subject: 'math' | 'english'; setKey: string;
  onSubject: (s: 'math' | 'english') => void; onSet: (k: string) => void; onOpen: (id: string) => void; onRandom: () => void;
}) {
  const [domain, setDomain] = useState<string>('all');
  const [skill, setSkill] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const data = useQuery({
    queryKey: ['center-practice-browser'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: cats }, ...pages] = await Promise.all([
        supabase.from('question_categories').select('id, name'),
        ...[0, 1, 2, 3].map(p => supabase.from('intl_questions').select('id, question_id, subject, question_set, category_id, skill')
          .eq('is_active', true).eq('hide_from_practice', false).order('question_id').range(p * 1000, p * 1000 + 999)),
      ]);
      const cat = Object.fromEntries((cats ?? []).map(c => [c.id, c.name]));
      const rows = pages.flatMap(p => (p.data ?? []) as Row[]);
      return rows.map(r => ({ ...r, domain: (r.category_id && cat[r.category_id]) || 'Other', sub: (r.subject ?? 'math').toLowerCase() as 'math' | 'english' }));
    },
  });

  const status = useMemo(() => {
    const m: Record<string, 'done' | 'tried'> = {};
    for (const a of attempts) if (a.is_correct) m[a.question_id] = 'done'; else if (!m[a.question_id]) m[a.question_id] = 'tried';
    return m;
  }, [attempts]);

  const all = data.data ?? [];
  const inSubject = all.filter(r => r.sub === subject);
  const pool = subject === 'math' ? inSubject.filter(r => inPracticeSet(setKey, r.question_set)) : inSubject;
  const setCount = (k: string) => inSubject.filter(r => inPracticeSet(k, r.question_set)).length;
  const done = (rows: typeof pool) => rows.filter(r => status[r.id] === 'done').length;

  const domains = useMemo(() => {
    const m: Record<string, { rows: typeof pool; skills: Record<string, typeof pool> }> = {};
    for (const r of pool) {
      const d = (m[r.domain] ??= { rows: [], skills: {} });
      d.rows.push(r);
      if (r.skill) (d.skills[r.skill] ??= []).push(r);
    }
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
  }, [pool]);

  const shown = pool.filter(r => (domain === 'all' || r.domain === domain) && (!skill || r.skill === skill));
  const total = pool.length, mastered = done(pool);
  const tab = (active: boolean) => `inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors active:scale-[0.97] ${active ? 'bg-accent text-accent-foreground' : 'text-foreground/70 hover:text-foreground'}`;
  const bar = (c: number, n: number) => <div className="sky-track !h-1.5 w-full"><div className="h-full rounded-full sky-fill-accent transition-all" style={{ width: `${n ? (100 * c) / n : 0}%` }} /></div>;

  return (
    <div className="space-y-4">
      <section className="sky-card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-2xl border p-1" role="tablist" aria-label="Subject">
            <Button variant="ghost" role="tab" aria-selected={subject === 'math'} className={tab(subject === 'math')} onClick={() => { onSubject('math'); setDomain('all'); setSkill(null); }}><Target className="h-4 w-4" />Math</Button>
            <Button variant="ghost" role="tab" aria-selected={subject === 'english'} className={tab(subject === 'english')} onClick={() => { onSubject('english'); setDomain('all'); setSkill(null); }}><FileText className="h-4 w-4" />English</Button>
          </div>
          {subject === 'math' && (
            <div className="flex flex-wrap gap-1 rounded-2xl border p-1" role="tablist" aria-label="Question set">
              {PRACTICE_SETS.map(s => <Button variant="ghost" key={s.key} className={tab(setKey === s.key)} onClick={() => { onSet(s.key); setDomain('all'); setSkill(null); }}>
                {setKey === s.key && <BookOpen className="h-4 w-4" />}{s.label} ({setCount(s.key)})</Button>)}
            </div>
          )}
          <Button variant="outline" size="sm" className="ml-auto" onClick={onRandom}><Shuffle className="h-4 w-4" />Random question</Button>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="text-muted-foreground">Overall progress</span><span className="font-mono">{mastered}/{total} ({total ? Math.round((100 * mastered) / total) : 0}%)</span></div>
          {bar(mastered, total)}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
        <aside className="sky-card space-y-3 lg:sticky lg:top-6 lg:self-start">
          <p className="flex items-center gap-2 font-medium"><Target className="h-4 w-4" />{subject === 'math' ? 'Math areas' : 'English areas'}</p>
          <Button variant="ghost" onClick={() => { setDomain('all'); setSkill(null); }} className={`w-full rounded-2xl px-4 py-3 text-left transition-colors ${domain === 'all' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}>
            <span className="flex flex-wrap justify-between gap-2 text-sm"><span>All questions</span><span className="font-mono text-muted-foreground">{total}</span></span>
          </Button>
          {domains.map(([name, d]) => {
            const isOpen = open[name] ?? false;
            return (
              <div key={name}>
                <div className={`flex items-center gap-2 rounded-2xl px-2 py-2 ${domain === name && !skill ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}>
                  <Button variant="ghost" aria-label={isOpen ? 'Collapse' : 'Expand'} onClick={() => setOpen(o => ({ ...o, [name]: !isOpen }))} className="h-8 w-8 shrink-0 p-1 text-muted-foreground"><ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} /></Button>
                  <Button variant="ghost" className="h-auto min-w-0 flex flex-1 items-center gap-3 whitespace-normal px-0 text-left text-sm" onClick={() => { setDomain(name); setSkill(null); }}>
                    <span className="min-w-0 flex-1">{name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{done(d.rows)}/{d.rows.length}</span>
                    <span className="hidden w-12 shrink-0 xl:block">{bar(done(d.rows), d.rows.length)}</span>
                  </Button>
                </div>
                {isOpen && Object.entries(d.skills).sort().map(([sk, rows]) => (
                  <Button variant="ghost" key={sk} onClick={() => { setDomain(name); setSkill(sk); }} className={`ml-9 flex w-[calc(100%-2.25rem)] justify-between rounded-xl px-3 py-1.5 text-left text-xs ${skill === sk && domain === name ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}`}>
                    <span>{sk}</span><span className="font-mono">{done(rows)}/{rows.length}</span>
                  </Button>
                ))}
              </div>
            );
          })}
        </aside>

        <section className="sky-card lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          {data.isLoading ? <div className="p-4"><SkyListSkeleton rows={5} /></div> : shown.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No questions here yet.</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {shown.map(r => {
                const s = status[r.id];
                return (
                  <Button variant="ghost" key={r.id} onClick={() => onOpen(r.id)}
                    className={`h-auto min-h-24 flex-col items-stretch justify-start whitespace-normal rounded-xl border p-3 text-left transition-colors hover:bg-accent/50 active:scale-[0.98] ${s === 'done' ? 'border-primary/40 bg-primary/5' : ''}`}>
                    <span className="flex items-center justify-between gap-1">
                      <span className="truncate font-mono text-sm font-semibold">{r.question_id ?? r.id.slice(0, 6)}</span>
                      {s === 'done' ? <Check className="h-4 w-4 shrink-0" aria-label="Solved" /> : s === 'tried' ? <CircleDot className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Attempted" /> : null}
                    </span>
                    <span className="mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{ENGLISH.includes(r.domain) ? r.domain.split(' ')[0] : short(r.domain)}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
