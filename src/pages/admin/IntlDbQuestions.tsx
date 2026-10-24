import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MathText } from '@/components/MathText';
import { CheckCircle2, ChevronDown, ChevronUp, CircleDashed, Download, PencilLine, RefreshCw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QuestionForm } from '@/components/admin/questions/QuestionForm';
import { CBQuestionForm } from '@/components/admin/questions/CBQuestionForm';
import { QuestionFigures } from '@/components/QuestionFigures';

type Row = {
  id: string; question_id: string; ext_question_id: string | null; subject: string | null;
  question_set: string | null; difficulty_level: string | null; question_type: string | null;
  question_text: string | null; passage_text: string | null; multiple_choice_options: any;
  answer: string | null; rationale: string | null; question_image_url: string | null;
  question_image_url_2: string | null; figure_svg: string | null; figure_description: string | null;
};

export default function IntlDbQuestions() {
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('all');
  const [expl, setExpl] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const { toast } = useToast();
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editingCBQuestion, setEditingCBQuestion] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [cbFormOpen, setCbFormOpen] = useState(false);
  const [syncing, setSyncing] = useState<null | 'checking' | 'importing'>(null);
  const [syncResult, setSyncResult] = useState<null | { found: number; changed: number; inserted: number; errors: number; dryRun: boolean; banks?: { intl: number; mn: number } }>(null);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['intl-db-variant-questions'],
    queryFn: async () => {
      // The API returns at most 1,000 rows per request, so read page by page until a short page.
      const rows: Row[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await (supabase.from('intl_questions') as any)
          .select('id, question_id, ext_question_id, subject, question_set, difficulty_level, question_type, question_text, passage_text, multiple_choice_options, answer, rationale, question_image_url, question_image_url_2, figure_svg, figure_description')
          .eq('ext_variant', true)
          .eq('is_active', true) // switched-off copies (e.g. merged duplicates) don't count
          .order('question_id')
          .order('id')
          .range(from, from + 999);
        if (error) throw error;
        rows.push(...((data || []) as Row[]));
        if (!data || data.length < 1000) return rows;
      }
    },
  });

  const hasExpl = (r: Row) => !!r.rationale && r.rationale.trim().length > 0;

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter((r) =>
      (subject === 'all' || r.subject === subject) &&
      (expl === 'all' || (expl === 'yes' ? hasExpl(r) : !hasExpl(r))) &&
      (!s || [r.question_id, r.ext_question_id, r.question_text, r.question_set].some((v) => v?.toLowerCase().includes(s))));
  }, [data, q, subject, expl]);

  const math = data.filter((r) => r.subject === 'math').length;
  const explained = data.filter((r) => hasExpl(r)).length;

  const openEditor = async (row: Row) => {
    const { data: full, error } = await supabase
      .from('intl_questions')
      .select('*')
      .eq('id', row.id)
      .maybeSingle();
    if (error || !full) {
      toast({ title: 'Question not found', description: row.question_id, variant: 'destructive' });
      return;
    }
    if ((full as any).question_set === 'CollegeBoard') {
      setEditingCBQuestion(full);
      setCbFormOpen(true);
    } else {
      setEditingQuestion(full);
      setFormOpen(true);
    }
  };

  // figures: copy redrawn figures (only the drawing) into both banks, intDB first, then the Mongolian bank.
  const runSync = async (dryRun: boolean, figures = false) => {
    setSyncing(dryRun ? 'checking' : 'importing');
    const agg = { found: 0, changed: 0, inserted: 0, errors: 0 };
    const banks = { intl: 0, mn: 0 };
    const show = () => setSyncResult({ ...agg, dryRun, ...(figures ? { banks: { ...banks } } : {}) });
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) throw new Error("Please sign in again before updating questions.");
      const batchSize = dryRun ? 200 : 50;
      for (const target of figures ? (['intl', 'mn'] as const) : [null]) {
        let offset = 0, hasMore = true;
        while (hasMore) {
          const { data: d, error } = await supabase.functions.invoke('sync-external-questions', {
            body: { mode: 'update', dry_run: dryRun, offset, limit: batchSize, ...(target ? { figures_only: true, target } : { skip_image_diffs: true }) },
          });
          if (error) {
            let detail = error.message;
            if ("context" in error && error.context instanceof Response) {
              const response = await error.context.json().catch(() => null);
              detail = response?.error || detail;
            }
            throw new Error(detail);
          }
          if (!d || d.error) throw new Error(d?.error || "No update result returned.");
          if (target !== 'mn') agg.found += d?.total_found || 0; // both banks scan the same external rows
          agg.changed += d?.updated || 0;
          agg.inserted += d?.inserted || 0;
          agg.errors += d?.errors || 0;
          if (target) banks[target] += d?.updated || 0;
          show();
          if (d.errors > 0 || d.success === false) throw new Error(d.error_details?.join("; ") || "Some questions failed to update. Please retry.");
          hasMore = d?.has_more === true;
          const nextOffset = d?.next_offset ?? offset + batchSize;
          if (hasMore && nextOffset <= offset) throw new Error("The scan did not advance. Please retry.");
          offset = nextOffset;
        }
      }
      show();
      if (!dryRun) {
        toast(figures
          ? { title: 'Figures updated', description: `${banks.intl} in intDB, ${banks.mn} in the Mongolian bank.` }
          : { title: 'Imported into intDB', description: `${agg.changed} updated, ${agg.inserted} added.` });
        refetch();
      }
    } catch (e: any) {
      toast({ title: 'Sync failed', description: e.message || 'Unknown error', variant: 'destructive' });
      setSyncResult(null);
    } finally {
      if (!dryRun) refetch();
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold">INT DB Questions</h1>
          <p className="text-sm text-muted-foreground">
            Every question flagged as an updated variant in the external database, pulled into the International bank (intDB).
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" disabled={!!syncing} onClick={() => runSync(true)}>
            {syncing === 'checking' ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Check for updates
          </Button>
          <Button size="sm" disabled={!!syncing || !syncResult?.dryRun || !!syncResult.banks} onClick={() => runSync(false)}>
            {syncing === 'importing' ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Import to intDB
          </Button>
          <Button variant="outline" size="sm" disabled={!!syncing} onClick={() => runSync(true, true)}>
            <Search className="h-4 w-4 mr-2" />
            Check figures
          </Button>
          <Button size="sm" disabled={!!syncing || !syncResult?.dryRun || !syncResult.banks} onClick={() => runSync(false, true)}>
            <Download className="h-4 w-4 mr-2" />
            Update figures
          </Button>
        </div>
      </div>

      {syncResult && (
        <Card><CardContent className="p-4 text-sm flex flex-wrap gap-x-6 gap-y-1">
          <span>{syncing ? 'Scanning…' : syncResult.dryRun ? 'Check complete' : 'Import complete'}</span>
          <span className="text-muted-foreground">{syncResult.banks ? 'With a figure in external DB' : 'Flagged in external DB'}: <span className="font-mono">{syncResult.found}</span></span>
          <span className="text-muted-foreground">{syncResult.dryRun ? 'Will update' : 'Updated'}: <span className="font-mono">{syncResult.changed}</span></span>
          {syncResult.banks && <span className="text-muted-foreground">Figures — intDB: <span className="font-mono">{syncResult.banks.intl}</span>, Mongolian bank: <span className="font-mono">{syncResult.banks.mn}</span></span>}
          {!syncResult.dryRun && !syncResult.banks && <span className="text-muted-foreground">Added: <span className="font-mono">{syncResult.inserted}</span></span>}
          {syncResult.errors > 0 && <span className="text-destructive">Errors: {syncResult.errors}</span>}
          {syncResult.dryRun && !syncing && syncResult.changed === 0 && <span className="text-muted-foreground">Everything is already up to date.</span>}
        </CardContent></Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Total', data.length], ['Math', math], ['English', data.length - math], ['With explanation', explained]].map(([l, v]) => (
          <Card key={l as string}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="text-2xl font-mono font-semibold">{v}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search code, text or set…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            <SelectItem value="math">Math</SelectItem>
            <SelectItem value="english">English</SelectItem>
          </SelectContent>
        </Select>
        <Select value={expl} onValueChange={setExpl}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Explanation: any</SelectItem>
            <SelectItem value="yes">Has explanation</SelectItem>
            <SelectItem value="no">Missing explanation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{rows.length} shown</p>
          {rows.map((r) => {
            const isOpen = open === r.id;
            const opts = r.multiple_choice_options && typeof r.multiple_choice_options === 'object' ? Object.entries(r.multiple_choice_options) : [];
            return (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-2">
                  <button className="w-full flex items-start gap-3 text-left" onClick={() => setOpen(isOpen ? null : r.id)}>
                    <span className="font-mono text-sm font-semibold shrink-0">{r.question_id}</span>
                    <span className="flex-1 text-sm text-muted-foreground line-clamp-2">{r.question_text}</span>
                    <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                      {hasExpl(r)
                        ? <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />Explained</Badge>
                        : <Badge variant="outline" className="gap-1 text-muted-foreground"><CircleDashed className="h-3 w-3" />No explanation</Badge>}
                      {r.subject && <Badge variant="outline">{r.subject}</Badge>}
                      {r.question_set && <Badge variant="secondary">{r.question_set}</Badge>}
                      {r.difficulty_level && <Badge variant="outline">{r.difficulty_level}</Badge>}
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isOpen && (
                    <div className="space-y-3 pt-2 border-t text-sm">
                      <div className="flex items-center gap-2">
                        {r.ext_question_id && <p className="text-xs text-muted-foreground font-mono">External ID: {r.ext_question_id}</p>}
                        <Button variant="outline" size="sm" className="ml-auto h-7 gap-1 text-xs" onClick={() => openEditor(r)}>
                          <PencilLine className="h-3.5 w-3.5" /> Edit question
                        </Button>
                      </div>
                      {r.passage_text && <div className="rounded-md bg-muted p-3"><MathText text={r.passage_text} /></div>}
                      <QuestionFigures svg={r.figure_svg} description={r.figure_description} url1={r.question_image_url} url2={r.question_image_url_2} className="justify-start" imgClassName="max-h-64 rounded-md" />
                      <MathText text={r.question_text || ''} />
                      {opts.length > 0 && (
                        <ul className="space-y-1">
                          {opts.map(([k, v]) => (
                            <li key={k} className={`rounded-md border px-3 py-1.5 ${k === r.answer ? 'border-primary font-medium' : ''}`}>
                              <span className="font-mono mr-2">{k}.</span><MathText text={String(v)} />
                            </li>
                          ))}
                        </ul>
                      )}
                      <p><span className="text-muted-foreground">Answer:</span> <span className="font-mono">{r.answer}</span></p>
                      {hasExpl(r)
                        ? <div className="rounded-md border p-3"><MathText text={r.rationale || ''} /></div>
                        : <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">No explanation yet — use "Edit question" to add one.</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {rows.length === 0 && <Button variant="ghost" disabled>No questions match.</Button>}
        </div>
      )}

      <QuestionForm
        table="intl_questions"
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) { setEditingQuestion(null); refetch(); } }}
        editingQuestion={editingQuestion}
      />
      <CBQuestionForm
        table="intl_questions"
        open={cbFormOpen}
        onOpenChange={(o) => { setCbFormOpen(o); if (!o) { setEditingCBQuestion(null); refetch(); } }}
        editingQuestion={editingCBQuestion}
      />
    </div>
  );
}
