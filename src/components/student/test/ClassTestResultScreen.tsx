import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, X, Minus } from 'lucide-react';
import type { ClassTest } from '@/hooks/useClassTest';

interface QuestionLike {
  id: string;
  answer: string;
  question_type: string | null;
}

function normalizeFill(v: string) {
  return v.trim().toLowerCase().replace(/\s+/g, '').replace(/^0+(?=\d)/, '');
}

interface Props {
  test: ClassTest;
  participantId: string | null;
  questions: QuestionLike[];
  answers: Record<string, string>;
  onExit?: () => void;
}

export function ClassTestResultScreen({ test, questions, answers, onExit }: Props) {
  const results = useMemo(
    () =>
      questions.map((q, i) => {
        const given = answers[q.id];
        const isFill = (q.question_type ?? '').includes('fill');
        const correct = !given
          ? false
          : isFill
          ? normalizeFill(given) === normalizeFill(q.answer ?? '')
          : given.trim().toUpperCase() === (q.answer ?? '').trim().toUpperCase();
        return { index: i + 1, answered: !!given, correct };
      }),
    [questions, answers],
  );

  const score = results.filter((r) => r.correct).length;
  const total = questions.length || test.question_ids.length;
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[70] bg-background overflow-y-auto">
      <div className="mx-auto w-full max-w-lg px-4 py-10 space-y-6 text-center">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{test.title}</div>
          <div className="mt-3 font-mono text-6xl font-bold tabular-nums">
            {score}
            <span className="text-muted-foreground text-3xl"> / {total}</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{accuracy}% accuracy</div>
        </div>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3 text-left">Your answers</div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {results.map((r) => (
              <div
                key={r.index}
                className={cn(
                  'h-9 rounded-md border flex items-center justify-center text-xs font-semibold gap-1',
                  r.correct
                    ? 'bg-emerald-500/15 border-emerald-500/40'
                    : r.answered
                    ? 'bg-destructive/10 border-destructive/40'
                    : 'bg-muted/40',
                )}
              >
                {r.index}
                {r.correct ? (
                  <Check className="h-3 w-3" />
                ) : r.answered ? (
                  <X className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
              </div>
            ))}
          </div>
        </Card>

        <p className="text-xs text-muted-foreground">
          Your teacher will go through the solutions in class.
        </p>
        <Button className="w-full" onClick={() => (onExit ? onExit() : window.location.reload())}>
          Back to practice
        </Button>
      </div>
    </div>
  );
}
