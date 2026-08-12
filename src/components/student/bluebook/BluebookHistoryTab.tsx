import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, History, PlayCircle, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { roundToTen } from '@/lib/bluebookReview';

export interface HistoryAttempt {
  id: string;
  test_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_score: number | null;
  rw_scaled_score: number | null;
  math_scaled_score: number | null;
  rw_raw_score: number | null;
  math_raw_score: number | null;
}

interface Props {
  attempts: HistoryAttempt[];
  testNames: Record<string, string>;
  onReview: (attemptId: string, testId: string) => void;
  onContinue: (attemptId: string) => void;
  isLoadingResults?: boolean;
}

/**
 * Every attempt the student has made, newest first — so an older completed
 * score stays visible even after they start a redo of the same test.
 */
export function BluebookHistoryTab({
  attempts,
  testNames,
  onReview,
  onContinue,
  isLoadingResults,
}: Props) {
  if (attempts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <History className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-center text-sm">
            No attempts yet. Your scores will appear here after you take a practice test.
          </p>
        </CardContent>
      </Card>
    );
  }

  const best = attempts.reduce<HistoryAttempt | null>(
    (m, a) => (a.total_score && (!m?.total_score || a.total_score > m.total_score) ? a : m),
    null,
  );

  return (
    <div className="space-y-3">
      {best?.total_score ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Best score</p>
              <p className="font-mono text-2xl font-bold leading-tight">
                {roundToTen(best.total_score)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {testNames[best.test_id] || 'Practice test'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {attempts.map((a) => {
        const isCompleted = a.status === 'completed';
        const date = a.completed_at || a.started_at;
        return (
          <Card key={a.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {testNames[a.test_id] || 'Practice test'}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{date ? format(new Date(date), 'MMM d, yyyy · HH:mm') : ''}</span>
                  {isCompleted ? (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">Completed</Badge>
                  ) : (
                    <Badge className="h-4 px-1.5 text-[10px] bg-amber-500/20 text-amber-600 hover:bg-amber-500/20">
                      In progress
                    </Badge>
                  )}
                  {a.rw_scaled_score ? <span>R&amp;W {roundToTen(a.rw_scaled_score)}</span> : null}
                  {a.math_scaled_score ? <span>Math {roundToTen(a.math_scaled_score)}</span> : null}
                </div>
              </div>

              {a.total_score ? (
                <div className="font-mono text-lg font-bold shrink-0">
                  {roundToTen(a.total_score)}
                </div>
              ) : null}

              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => onReview(a.id, a.test_id)}
                  disabled={isLoadingResults}
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">Review</span>
                </Button>
                {!isCompleted && (
                  <Button size="sm" className="gap-1.5" onClick={() => onContinue(a.id)}>
                    <PlayCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Continue</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default BluebookHistoryTab;
