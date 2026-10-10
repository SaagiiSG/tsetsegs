import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Database, CheckCircle2, ImageOff, PencilLine } from 'lucide-react';
import { QuestionForm } from '@/components/admin/questions/QuestionForm';
import { CBQuestionForm } from '@/components/admin/questions/CBQuestionForm';

type Change = {
  question_id: string;
  fields: string[];
  before_text?: string;
  after_text?: string;
};

type Agg = {
  total_found: number;
  updated: number;
  unchanged: number;
  not_found: number;
  errors: number;
  skipped_images: number;
  changes: Change[];
  error_details: string[];
};

const EMPTY: Agg = {
  total_found: 0, updated: 0, unchanged: 0, not_found: 0,
  errors: 0, skipped_images: 0, changes: [], error_details: [],
};

export default function QuestionSyncProgress() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'checking' | 'checked' | 'applying' | 'done'>('idle');
  const [result, setResult] = useState<Agg>(EMPTY);
  const [applied, setApplied] = useState(0);
  const [days, setDays] = useState(1);

  // Inline editing — same editors the Question Bank uses, opened here
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editingCBQuestion, setEditingCBQuestion] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [cbFormOpen, setCbFormOpen] = useState(false);

  const openEditor = async (questionId: string) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('question_id', questionId)
      .maybeSingle();
    if (error || !data) {
      toast({ title: 'Question not found', description: questionId, variant: 'destructive' });
      return;
    }
    if (data.question_set === 'CollegeBoard') {
      setEditingCBQuestion(data);
      setCbFormOpen(true);
    } else {
      setEditingQuestion(data);
      setFormOpen(true);
    }
  };

  const run = async (dryRun: boolean) => {
    setRunning(true);
    setPhase(dryRun ? 'checking' : 'applying');
    setApplied(0);
    const agg = { ...EMPTY, changes: [] as Change[], error_details: [] as string[] };
    try {
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('sync-external-questions', {
          body: {
            mode: 'update',
            dry_run: dryRun,
            skip_image_diffs: true,
            offset,
            limit: 200,
          },
        });
        if (error) throw error;
        if (!data) throw new Error('No response data');
        agg.total_found += data.total_found || 0;
        agg.updated += data.updated || 0;
        agg.unchanged += data.unchanged || 0;
        agg.not_found += data.not_found || 0;
        agg.errors += data.errors || 0;
        agg.skipped_images += data.skipped_images || 0;
        agg.changes.push(...(data.changes || []));
        agg.error_details.push(...(data.error_details || []));
        if (!dryRun) setApplied(agg.updated);
        setResult({ ...agg });
        hasMore = data.has_more === true;
        offset = data.next_offset || offset + 200;
      }
      setResult({ ...agg });
      if (dryRun) {
        setPhase('checked');
      } else {
        setPhase('done');
        toast({
          title: 'Update complete',
          description: `${agg.updated} questions updated in place. Question codes unchanged, student progress kept.`,
        });
      }
    } catch (err: any) {
      setPhase('idle');
      toast({ title: 'Sync failed', description: err.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const checkProgress = result.total_found > 0 ? Math.min(100, (result.total_found / 1300) * 100) : 0;
  const applyProgress = result.changes.length > 0 ? (applied / result.changes.length) * 100 : (phase === 'done' ? 100 : 0);

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">External DB Update</h1>
        <p className="text-sm text-muted-foreground">
          Temporary page — pulls edits from the external question database into ours. Question codes never change, so student history stays linked. Questions whose figure link differs are skipped.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> Sync control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => run(true)} disabled={running}>
              {running && phase === 'checking' ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Check for updates
            </Button>
            <Button
              onClick={() => run(false)}
              disabled={running || phase !== 'checked' || result.updated === 0}
            >
              {running && phase === 'applying' ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Apply {result.updated > 0 ? `${result.updated} ` : ''}updates
            </Button>
          </div>

          {(phase === 'checking' || phase === 'applying') && (
            <div className="space-y-2">
              <Progress value={phase === 'checking' ? checkProgress : applyProgress} />
              <p className="text-sm text-muted-foreground animate-pulse">
                {phase === 'checking'
                  ? `Checking… ${result.total_found} questions scanned, ${result.updated} updates found so far`
                  : `Applying… ${applied} of ${result.changes.length || result.updated} questions updated`}
              </p>
            </div>
          )}

          {(phase === 'checked' || phase === 'done') && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
              <div><p className="text-xs text-muted-foreground">Checked</p><p className="font-mono text-lg">{result.total_found}</p></div>
              <div><p className="text-xs text-muted-foreground">{phase === 'done' ? 'Updated' : 'Will update'}</p><p className="font-mono text-lg">{result.updated}</p></div>
              <div><p className="text-xs text-muted-foreground">Unchanged</p><p className="font-mono text-lg">{result.unchanged}</p></div>
              <div><p className="text-xs text-muted-foreground">Not imported</p><p className="font-mono text-lg">{result.not_found}</p></div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><ImageOff className="h-3 w-3" />Image skipped</p>
                <p className="font-mono text-lg">{result.skipped_images}</p>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <p className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Done — {result.updated} questions overridden in place, codes unchanged.
            </p>
          )}

          {result.errors > 0 && (
            <div className="text-destructive text-xs space-y-1">
              <p>Errors: {result.errors}</p>
              {result.error_details.map((e, i) => <p key={i} className="font-mono">{e}</p>)}
            </div>
          )}
        </CardContent>
      </Card>

      {result.changes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Changed questions ({result.changes.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {result.changes.map((c) => (
              <div key={c.question_id} className="rounded-md border p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">{c.question_id}</Badge>
                  {c.fields.map((f) => <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>)}
                  <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-xs" onClick={() => openEditor(c.question_id)}>
                    <PencilLine className="h-3.5 w-3.5" /> Open editor
                  </Button>
                </div>
                {c.fields.includes('question_text') && (
                  <div className="grid md:grid-cols-2 gap-2 text-xs">
                    <p className="text-muted-foreground line-clamp-4"><span className="font-medium">Before: </span>{c.before_text}</p>
                    <p className="line-clamp-4"><span className="font-medium">After: </span>{c.after_text}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {result.changes.length === 0 && <RecentlyUpdated days={days} setDays={setDays} onOpenEditor={openEditor} />}

      {/* Inline Question Form Dialog */}
      <QuestionForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingQuestion(null); }}
        editingQuestion={editingQuestion}
      />

      {/* Inline CB Question Form Dialog */}
      <CBQuestionForm
        open={cbFormOpen}
        onOpenChange={(open) => { setCbFormOpen(open); if (!open) setEditingCBQuestion(null); }}
        editingQuestion={editingCBQuestion}
      />
    </div>
  );
}

type Recent = { question_id: string; question_text: string | null; updated_at: string; rationale: string | null; question_set: string | null };

function RecentlyUpdated({ days, setDays }: { days: number; setDays: (d: number) => void }) {
  const [rows, setRows] = useState<Recent[] | null>(null);
  useEffect(() => {
    setRows(null);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    supabase
      .from('questions')
      .select('question_id, question_text, updated_at, rationale, question_set')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(500)
      .then(({ data }) => setRows((data as Recent[]) || []));
  }, [days]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Recently updated questions {rows ? `(${rows.length})` : ''}</CardTitle>
        <div className="flex gap-1">
          {[1, 7, 30].map((d) => (
            <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setDays(d)}>
              {d === 1 ? 'Today' : `${d} days`}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[65vh] overflow-y-auto">
        {!rows && <p className="text-sm text-muted-foreground">Loading…</p>}
        {rows && rows.length === 0 && <p className="text-sm text-muted-foreground">No questions updated in this period.</p>}
        {rows?.map((r) => (
          <div key={r.question_id} className="rounded-md border p-3 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">{r.question_id}</Badge>
              {r.rationale?.trim()
                ? <Badge variant="secondary" className="text-[10px]">Has explanation</Badge>
                : <Badge variant="destructive" className="text-[10px]">No explanation</Badge>}
              <span className="text-[11px] text-muted-foreground">{new Date(r.updated_at).toLocaleString()}</span>
              <Button asChild variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-xs">
                <Link to={`/admin/questions?edit=${encodeURIComponent(r.question_id)}`}>
                  <PencilLine className="h-3.5 w-3.5" /> Open editor
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{r.question_text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
