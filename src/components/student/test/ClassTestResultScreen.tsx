import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, X, Minus, ChevronDown } from 'lucide-react';
import { MathText } from '@/components/MathText';
import type { ClassTest } from '@/hooks/useClassTest';

interface QuestionLike {
  id: string;
  answer?: string;
  question_type: string | null;
  question_text?: string;
  question_image_url?: string | null;
  multiple_choice_options?: any;
  choice_images?: any;
  passage_text?: string | null;
}

function normalizeFill(v: string) {
  return v.trim().toLowerCase().replace(/\s+/g, '').replace(/^0+(?=\d)/, '');
}

interface Props {
  test: ClassTest;
  participantId: string | null;
  questions: QuestionLike[];
  answers: Record<string, string>;
  /** Authoritative score computed on the server at submit time. */
  serverScore?: { correct: number; answered: number } | null;
  /** Whether the answer key has arrived — the per-question breakdown waits for it. */
  keyLoaded?: boolean;
  onExit?: () => void;
}

export function ClassTestResultScreen({ test, questions, answers, serverScore, keyLoaded = true, onExit }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const results = useMemo(
    () =>
      questions.map((q, i) => {
        const given = answers[q.id];
        const isFill = (q.question_type ?? '').includes('fill');
        const correct = !given || !q.answer
          ? false
          : isFill
          ? normalizeFill(given) === normalizeFill(q.answer ?? '')
          : given.trim().toUpperCase() === (q.answer ?? '').trim().toUpperCase();
        return { index: i + 1, answered: !!given, correct, given, question: q };
      }),
    [questions, answers],
  );

  const score = serverScore ? serverScore.correct : results.filter((r) => r.correct).length;
  const total = questions.length || test.question_ids.length;
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;


  return (
    <div className="fixed inset-0 z-[70] bg-background overflow-y-auto">
      <div className="mx-auto w-full max-w-lg px-4 py-10 space-y-6">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{test.title}</div>
          <div className="mt-3 font-mono text-6xl font-bold tabular-nums">
            {score}
            <span className="text-muted-foreground text-3xl"> / {total}</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{accuracy}% accuracy</div>
        </div>

        {!keyLoaded && (
          <p className="text-center text-xs text-muted-foreground">
            Loading the answer key for your review…
          </p>
        )}

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">Your answers</div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">

            {results.map((r) => (
              <button
                key={r.index}
                onClick={() => setOpenId(r.question.id)}
                className={cn(
                  'h-9 rounded-md border flex items-center justify-center text-xs font-semibold gap-1 transition-colors',
                  keyLoaded && r.correct
                    ? 'bg-emerald-500/15 border-emerald-500/40'
                    : keyLoaded && r.answered
                    ? 'bg-destructive/10 border-destructive/40'
                    : 'bg-muted/40',
                )}
              >
                {r.index}
                {keyLoaded && r.correct ? (
                  <Check className="h-3 w-3" />
                ) : keyLoaded && r.answered ? (
                  <X className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
              </button>
            ))}

          </div>
        </Card>

        <div>
          <div className="text-sm font-semibold mb-2">Review every question</div>
          <Card className="divide-y">
            {results.map((r) => {
              const q = r.question;
              const open = openId === q.id;
              const opts: Array<{ key: string; text: string; img?: string }> = (() => {
                const raw = q.multiple_choice_options;
                const imgs = (q.choice_images ?? {}) as Record<string, string>;
                if (!raw) return [];
                if (Array.isArray(raw))
                  return raw.map((t: any, i: number) => {
                    const key = String.fromCharCode(65 + i);
                    return { key, text: String(t), img: imgs?.[key] };
                  });
                return Object.entries(raw).map(([k, v]) => ({ key: k, text: String(v), img: imgs?.[k] }));
              })();

              return (
                <div key={q.id}>
                  <button
                    onClick={() => setOpenId(open ? null : q.id)}
                    className="w-full text-left p-3 flex items-start gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <span
                      className={cn(
                        'mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold',
                        r.correct
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : r.answered
                          ? 'bg-destructive/15 text-destructive'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {r.index}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-xs', !open && 'line-clamp-2')}>
                        {q.question_text ? (
                          <MathText text={q.question_text} />
                        ) : (
                          <span className="text-muted-foreground">Question unavailable</span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                        You: {r.given || '—'} · Correct: {q.answer ?? '—'}
                      </div>
                    </div>
                    <ChevronDown
                      className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
                    />
                  </button>

                  {open && (
                    <div className="px-3 pb-4 space-y-3">
                      {q.passage_text && (
                        <div className="rounded-md border bg-muted/30 p-3 text-xs">
                          <MathText text={q.passage_text} />
                        </div>
                      )}
                      {q.question_image_url && (
                        <img
                          src={q.question_image_url}
                          alt={`Question ${r.index} figure`}
                          loading="lazy"
                          className="max-h-64 rounded border bg-background object-contain"
                        />
                      )}
                      {opts.length > 0 && (
                        <div className="space-y-2">
                          {opts.map((o) => {
                            const isCorrect = (q.answer ?? '').trim().toUpperCase() === o.key.toUpperCase();
                            const isMine = (r.given ?? '').trim().toUpperCase() === o.key.toUpperCase();
                            return (
                              <div
                                key={o.key}
                                className={cn(
                                  'rounded-md border p-2 flex gap-2 text-xs',
                                  isCorrect && 'border-emerald-500/50 bg-emerald-500/10',
                                  isMine && !isCorrect && 'border-destructive/50 bg-destructive/10',
                                )}
                              >
                                <span className="font-mono font-semibold">{o.key}</span>
                                <div className="min-w-0">
                                  <MathText text={o.text} />
                                  {o.img && (
                                    <img src={o.img} alt={`Choice ${o.key}`} className="mt-1 max-h-28 object-contain" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Your teacher will go through the solutions in class.
        </p>
        <Button className="w-full" onClick={() => (onExit ? onExit() : window.location.reload())}>
          Back to practice
        </Button>
      </div>
    </div>
  );
}
