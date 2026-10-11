import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MathText } from '@/components/MathText';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

type Row = {
  id: string; question_id: string; ext_question_id: string | null; subject: string | null;
  question_set: string | null; difficulty_level: string | null; question_type: string | null;
  question_text: string | null; passage_text: string | null; multiple_choice_options: any;
  answer: string | null; rationale: string | null; question_image_url: string | null;
};

export default function IntlDbQuestions() {
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('all');
  const [open, setOpen] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['intl-db-variant-questions'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('intl_questions') as any)
        .select('id, question_id, ext_question_id, subject, question_set, difficulty_level, question_type, question_text, passage_text, multiple_choice_options, answer, rationale, question_image_url')
        .eq('ext_variant', true)
        .order('question_id');
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter((r) =>
      (subject === 'all' || r.subject === subject) &&
      (!s || [r.question_id, r.ext_question_id, r.question_text, r.question_set].some((v) => v?.toLowerCase().includes(s))));
  }, [data, q, subject]);

  const math = data.filter((r) => r.subject === 'math').length;

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">INT DB Questions</h1>
        <p className="text-sm text-muted-foreground">
          Every question flagged as an updated variant in the external database, pulled into the International bank (intDB).
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[['Total', data.length], ['Math', math], ['English', data.length - math]].map(([l, v]) => (
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
                    <div className="flex gap-1 shrink-0">
                      {r.subject && <Badge variant="outline">{r.subject}</Badge>}
                      {r.question_set && <Badge variant="secondary">{r.question_set}</Badge>}
                      {r.difficulty_level && <Badge variant="outline">{r.difficulty_level}</Badge>}
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isOpen && (
                    <div className="space-y-3 pt-2 border-t text-sm">
                      {r.ext_question_id && <p className="text-xs text-muted-foreground font-mono">External ID: {r.ext_question_id}</p>}
                      {r.passage_text && <div className="rounded-md bg-muted p-3"><MathText text={r.passage_text} /></div>}
                      {r.question_image_url && <img src={r.question_image_url} alt="" className="max-h-64 rounded-md" />}
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
                      {r.rationale && <div className="rounded-md border p-3"><MathText text={r.rationale} /></div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {rows.length === 0 && <Button variant="ghost" disabled>No questions match.</Button>}
        </div>
      )}
    </div>
  );
}
