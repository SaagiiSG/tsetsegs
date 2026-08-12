import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MathText } from '@/components/MathText';
import { QuestionFigures } from '@/components/QuestionFigures';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

export interface ReviewRow {
  review_mode: string;
  module_number: number;
  section: string;
  order_index: number;
  question_id: string;
  question_code: string | null;
  question_text: string | null;
  question_image_url: string | null;
  question_image_url_2: string | null;
  passage_text: string | null;
  question_type: string | null;
  multiple_choice_options: unknown;
  choice_images: unknown;
  student_answer: string | null;
  is_correct: boolean | null;
  correct_answer: string | null;
  rationale: string | null;
}

/** Fetches the student's own per-question review. Empty array = teacher keeps it locked. */
export function useProctorReview(participantId: string | null, enabled: boolean) {
  const [rows, setRows] = useState<ReviewRow[] | null>(null);

  useEffect(() => {
    if (!participantId || !enabled) return;
    let alive = true;
    supabase.rpc('proctor_review', { p_participant_id: participantId }).then(({ data }) => {
      if (alive) setRows(((data ?? []) as unknown as ReviewRow[]));
    });
    return () => {
      alive = false;
    };
  }, [participantId, enabled]);

  return rows;
}

function toOptions(row: ReviewRow): Array<{ key: string; text: string; img?: string }> {
  const raw = row.multiple_choice_options;
  const imgs = (row.choice_images ?? null) as Record<string, string> | null;
  let list: Array<{ key: string; text: string }> = [];
  if (Array.isArray(raw)) {
    list = raw.map((v, i) => ({ key: String.fromCharCode(65 + i), text: String(v ?? '') }));
  } else if (raw && typeof raw === 'object') {
    list = Object.entries(raw as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ key: k.toUpperCase(), text: String(v ?? '') }));
  }
  return list
    .filter((o) => o.text.trim() !== '' || imgs?.[o.key])
    .map((o) => ({ ...o, img: imgs?.[o.key] }));
}

interface Props {
  rows: ReviewRow[];
  onBack: () => void;
}

export function ProctorReview({ rows, onBack }: Props) {
  const [idx, setIdx] = useState(0);
  const showAnswers = rows[0]?.review_mode === 'explanations';
  const row = rows[idx];
  const wrongCount = useMemo(() => rows.filter((r) => !r.is_correct).length, [rows]);
  const options = row ? toOptions(row) : [];
  const isMc = options.length > 0;

  if (!row) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 py-2.5 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" /> Score
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {rows.length - wrongCount}/{rows.length} correct
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        {/* question map */}
        <div className="flex flex-wrap gap-1.5">
          {rows.map((r, i) => (
            <button
              key={r.question_id}
              onClick={() => setIdx(i)}
              aria-label={`Question ${i + 1} ${r.is_correct ? 'correct' : 'incorrect'}`}
              className={cn(
                'h-8 w-8 rounded-md text-[11px] font-mono font-semibold border transition',
                r.is_correct
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-destructive/10 border-destructive/40 text-destructive',
                i === idx && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px]">
              M{row.module_number} · Q{idx + 1}
            </Badge>
            <span className="text-[11px] capitalize text-muted-foreground">{row.section}</span>
            <span
              className={cn(
                'ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                row.is_correct
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {row.is_correct ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {row.is_correct ? 'Correct' : row.student_answer ? 'Incorrect' : 'Blank'}
            </span>
          </div>

          {row.passage_text && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">
              <MathText text={row.passage_text} />
            </div>
          )}

          {row.question_text && (
            <div className="text-sm leading-relaxed">
              <MathText text={row.question_text} />
            </div>
          )}

          <QuestionFigures url1={row.question_image_url} url2={row.question_image_url_2} />


          {isMc ? (
            <div className="space-y-2">
              {options.map((o) => {
                const picked = (row.student_answer ?? '').toUpperCase() === o.key;
                const correct = showAnswers && (row.correct_answer ?? '').toUpperCase() === o.key;
                return (
                  <div
                    key={o.key}
                    className={cn(
                      'flex gap-2.5 rounded-lg border p-2.5 text-sm',
                      correct && 'border-emerald-500/50 bg-emerald-500/10',
                      picked && !row.is_correct && 'border-destructive/50 bg-destructive/10',
                      picked && row.is_correct && 'border-emerald-500/50 bg-emerald-500/10',
                    )}
                  >
                    <span className="font-mono font-semibold">{o.key}</span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {o.text && <MathText text={o.text} />}
                      {o.img && <img src={o.img} alt={`Choice ${o.key}`} className="max-h-40 rounded" loading="lazy" />}
                    </div>
                    {picked && <span className="shrink-0 text-[10px] uppercase text-muted-foreground">your pick</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border p-2.5">
                <div className="text-[10px] uppercase text-muted-foreground">Your answer</div>
                <div className="font-mono">{row.student_answer ?? '—'}</div>
              </div>
              {showAnswers && (
                <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-2.5">
                  <div className="text-[10px] uppercase text-muted-foreground">Correct answer</div>
                  <div className="font-mono">{row.correct_answer ?? '—'}</div>
                </div>
              )}
            </div>
          )}

          {showAnswers && row.rationale && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Explanation</div>
              <MathText text={row.rationale} />
            </div>
          )}

          {!showAnswers && !row.is_correct && (
            <p className="text-[11px] text-muted-foreground">
              Your teacher has kept the answer hidden — bring this one to class.
            </p>
          )}
        </Card>

        <div className="flex gap-2 pb-8">
          <Button variant="outline" className="flex-1 gap-1.5" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <Button
            className="flex-1 gap-1.5"
            disabled={idx === rows.length - 1}
            onClick={() => setIdx((i) => i + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ReviewLoading() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin opacity-60" />
    </div>
  );
}
