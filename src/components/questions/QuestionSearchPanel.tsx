import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import {
  DIFFICULTY_OPTIONS,
  PAGE_SIZE,
  QUESTION_SET_OPTIONS,
  QuestionSearchFilters,
  QuestionSearchResult,
  SearchScope,
  useDebounced,
  useQuestionCategories,
  useQuestionSearch,
} from '@/hooks/useQuestionSearch';

interface QuestionSearchPanelProps {
  scope: SearchScope;
  /** Called when a result is clicked. `results` is the current page of results. */
  onSelect: (result: QuestionSearchResult, index: number, results: QuestionSearchResult[]) => void;
  /** Extra hint shown under the search box. */
  note?: string;
  autoFocus?: boolean;
}

/** Strip math delimiters / markup so we can show a readable text snippet. */
function toPlainText(text: string) {
  return text
    .replace(/\$\$?/g, '')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function Snippet({ text, query }: { text: string; query: string }) {
  const plain = toPlainText(text);
  const q = query.trim();
  const lower = plain.toLowerCase();
  const idx = q ? lower.indexOf(q.toLowerCase()) : -1;

  if (idx === -1) {
    return <span className="line-clamp-2">{plain.slice(0, 220)}</span>;
  }

  const start = Math.max(0, idx - 60);
  const before = (start > 0 ? '… ' : '') + plain.slice(start, idx);
  const match = plain.slice(idx, idx + q.length);
  const after = plain.slice(idx + q.length, idx + q.length + 140);

  return (
    <span className="line-clamp-2">
      {before}
      <mark className="bg-primary/25 text-foreground rounded px-0.5">{match}</mark>
      {after}
    </span>
  );
}

function setLabel(result: QuestionSearchResult) {
  const id = result.question_id ?? '';
  if (id.startsWith('BBK')) return 'Practice test';
  if (id.startsWith('ANP')) return 'New 120';
  if (id.startsWith('EXT')) return 'External';
  if (id.startsWith('CB')) return 'CollegeBoard';
  if (result.question_set === '68') return '68';
  if (result.question_set === 'SATMathTraining800') return '150 Hard';
  if (result.subject === 'english') return 'English';
  return result.question_set ?? 'Question';
}

const difficultyClass = (level: string | null) => {
  if (level === 'hard') return 'border-red-500 text-red-500';
  if (level === 'medium') return 'border-yellow-500 text-yellow-500';
  return 'border-green-500 text-green-500';
};

export function QuestionSearchPanel({ scope, onSelect, note, autoFocus }: QuestionSearchPanelProps) {
  const [rawQuery, setRawQuery] = useState('');
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<QuestionSearchFilters>({
    subject: 'all',
    set: 'all',
    difficulty: 'all',
    categoryId: 'all',
  });

  const query = useDebounced(rawQuery, 350);
  const { data: categories } = useQuestionCategories();
  const { rows, totalCount, isFetching, enabled, error } = useQuestionSearch(query, filters, scope, page);

  // Reset paging whenever the search changes
  useEffect(() => {
    setPage(0);
  }, [query, filters.subject, filters.set, filters.difficulty, filters.categoryId]);

  const setOptions = useMemo(
    () => QUESTION_SET_OPTIONS.filter((o) => !o.scopes || o.scopes.includes(scope)),
    [scope],
  );

  const patch = (p: Partial<QuestionSearchFilters>) => setFilters((f) => ({ ...f, ...p }));
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 md:p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus={autoFocus}
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder="Search every question set by keyword — e.g. “equilateral triangle”, “slope”, CB0011"
              className="h-11 pl-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={filters.subject} onValueChange={(v) => patch({ subject: v as 'all' | 'math' | 'english' })}>
              <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All subjects</SelectItem>
                <SelectItem value="math" className="text-xs">Math</SelectItem>
                <SelectItem value="english" className="text-xs">English</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.set} onValueChange={(v) => patch({ set: v })}>
              <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {setOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.difficulty} onValueChange={(v) => patch({ difficulty: v })}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.categoryId} onValueChange={(v) => patch({ categoryId: v })}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All categories</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
        </CardContent>
      </Card>

      {!enabled ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search the question bank.
          </CardContent>
        </Card>
      ) : isFetching ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-destructive">
            Search failed. Check your connection and try again.
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No questions matched “{query.trim()}” with these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground">
              {totalCount} match{totalCount !== 1 ? 'es' : ''}
              {totalPages > 1 && ` · page ${page + 1} of ${totalPages}`}
            </p>
            {totalPages > 1 && (
              <div className="flex gap-1">
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {rows.map((r, index) => (
              <Card
                key={r.id}
                className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm"
                onClick={() => onSelect(r, index, rows)}
              >
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs font-bold">{r.question_id}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{setLabel(r)}</Badge>
                    {r.difficulty_level && (
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${difficultyClass(r.difficulty_level)}`}>
                        {r.difficulty_level}
                      </Badge>
                    )}
                    {r.category_name && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 max-w-[140px] truncate">
                        {r.category_name}
                      </Badge>
                    )}
                    {r.question_image_url && <ImageIcon className="h-3 w-3 text-muted-foreground" />}
                    {scope === 'admin' && !r.is_active && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0">inactive</Badge>
                    )}
                    {scope === 'admin' && r.hide_from_practice && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">hidden</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <Snippet text={r.question_text} query={query} />
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
