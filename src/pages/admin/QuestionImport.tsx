import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Download, CheckCircle2, Eye } from 'lucide-react';

type PreviewRow = {
  question_id: string;
  subject: string | null;
  difficulty_level: string | null;
  question_type: string | null;
  skill: string | null;
  question_text: string | null;
  rationale: string | null;
};

type Agg = {
  total_found: number;
  imported: number;
  skipped: number;
  errors: number;
  previewRows: PreviewRow[];
  error_details: string[];
};

const EMPTY: Agg = { total_found: 0, imported: 0, skipped: 0, errors: 0, previewRows: [], error_details: [] };

export default function QuestionImport() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'previewing' | 'previewed' | 'importing' | 'done'>('idle');
  const [result, setResult] = useState<Agg>(EMPTY);

  const [subject, setSubject] = useState<'all' | 'math' | 'english'>('all');
  const [questionSet, setQuestionSet] = useState('');
  const [sinceDate, setSinceDate] = useState('');
  const [codePrefix, setCodePrefix] = useState('EXT');
  const [targetSet, setTargetSet] = useState('');

  const run = async (dryRun: boolean) => {
    setRunning(true);
    setPhase(dryRun ? 'previewing' : 'importing');
    const agg: Agg = { ...EMPTY, previewRows: [], error_details: [] };
    try {
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('sync-external-questions', {
          body: {
            mode: 'import',
            dry_run: dryRun,
            offset,
            limit: 200,
            subject: subject === 'all' ? undefined : subject,
            question_set: questionSet.trim() || undefined,
            since_date: sinceDate || undefined,
            id_prefix: codePrefix.trim().toUpperCase() || 'EXT',
            target_set: targetSet.trim() || undefined,
          },
        });
        if (error) throw error;
        if (!data) throw new Error('No response data');
        agg.total_found += data.total_found || 0;
        agg.imported += data.imported || 0;
        agg.skipped += data.skipped || 0;
        agg.errors += data.errors || 0;
        if (dryRun) agg.previewRows.push(...(data.sample || []));
        agg.error_details.push(...(data.error_details || []));
        setResult({ ...agg });
        hasMore = data.has_more === true;
        offset = data.next_offset || offset + 200;
        // Safety: stop after 20 pages (4000 questions) per run
        if (offset > 4000) hasMore = false;
      }
      setResult({ ...agg });
      if (dryRun) {
        setPhase('previewed');
      } else {
        setPhase('done');
        toast({
          title: 'Import complete',
          description: `${agg.imported} new questions added to the International bank (intDB). ${agg.skipped} already existed and were skipped.`,
        });
      }
    } catch (err: any) {
      setPhase('idle');
      toast({ title: 'Import failed', description: err.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Import from External DB <span className="ml-2 align-middle rounded-md border px-2 py-0.5 text-xs font-mono">intDB</span></h1>
        <p className="text-sm text-muted-foreground">
          Adds brand-new questions from the external database into the International question bank. Questions that already exist are skipped — use External DB Update to refresh those. The Mongolian bank is never touched here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4" /> Import control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Select value={subject} onValueChange={(v) => setSubject(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  <SelectItem value="math">Math</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">External question set (optional)</Label>
              <Input className="h-9" placeholder="e.g. CollegeBoard" value={questionSet} onChange={(e) => setQuestionSet(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Created after (optional)</Label>
              <Input className="h-9" type="date" value={sinceDate} onChange={(e) => setSinceDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Code prefix</Label>
              <Input className="h-9 font-mono" placeholder="EXT" maxLength={5} value={codePrefix} onChange={(e) => setCodePrefix(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label as set (optional)</Label>
              <Input className="h-9" placeholder="e.g. ANP" value={targetSet} onChange={(e) => setTargetSet(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => run(true)} disabled={running}>
              {running && phase === 'previewing' ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              Preview import
            </Button>
            <Button onClick={() => run(false)} disabled={running || phase !== 'previewed'}>
              {running && phase === 'importing' ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Import {result.total_found > 0 ? `${result.total_found} ` : ''}questions
            </Button>
          </div>

          {(phase === 'previewing' || phase === 'importing') && (
            <div className="space-y-2">
              <Progress value={undefined} />
              <p className="text-sm text-muted-foreground animate-pulse">
                {phase === 'previewing'
                  ? `Scanning… ${result.total_found} questions found so far`
                  : `Importing… ${result.imported} added, ${result.skipped} skipped so far`}
              </p>
            </div>
          )}

          {(phase === 'previewed' || phase === 'done') && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div><p className="text-xs text-muted-foreground">Found</p><p className="font-mono text-lg">{result.total_found}</p></div>
              <div><p className="text-xs text-muted-foreground">{phase === 'done' ? 'Imported' : 'Will import'}</p><p className="font-mono text-lg">{phase === 'done' ? result.imported : result.total_found}</p></div>
              <div><p className="text-xs text-muted-foreground">Already existed</p><p className="font-mono text-lg">{result.skipped}</p></div>
              <div><p className="text-xs text-muted-foreground">Errors</p><p className="font-mono text-lg">{result.errors}</p></div>
            </div>
          )}

          {phase === 'done' && (
            <p className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Done — {result.imported} new questions added with {codePrefix || 'EXT'} codes.
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

      {phase === 'previewed' && result.previewRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview ({result.previewRows.length} questions)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {result.previewRows.map((q) => (
              <div key={q.question_id} className="rounded-md border p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">{q.question_id}</Badge>
                  {q.subject && <Badge variant="secondary" className="text-[10px]">{q.subject}</Badge>}
                  {q.difficulty_level && <Badge variant="secondary" className="text-[10px]">{q.difficulty_level}</Badge>}
                  {q.skill && <Badge variant="outline" className="text-[10px]">{q.skill}</Badge>}
                  {q.rationale?.trim()
                    ? <Badge variant="secondary" className="text-[10px]">Has explanation</Badge>
                    : <Badge variant="destructive" className="text-[10px]">No explanation</Badge>}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{q.question_text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
