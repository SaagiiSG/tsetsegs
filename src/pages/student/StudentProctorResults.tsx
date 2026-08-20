import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ShieldCheck, Eye, Lock, Loader2, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { roundToTen, scaleSectionScore } from '@/lib/bluebookReview';
import { ProctorReview, useProctorReview, type ReviewRow } from '@/components/student/proctor/ProctorReview';

interface HistoryRow {
  participant_id: string;
  session_id: string;
  title: string | null;
  review_mode: string | null;
  submitted_at: string | null;
  finished_at: string | null;
  rw_correct: number | null;
  math_correct: number | null;
  rw_total: number | null;
  math_total: number | null;
  module_results: unknown;
}

function scores(r: HistoryRow) {
  const rwTotal = r.rw_total ?? 0;
  const mathTotal = r.math_total ?? 0;
  const rwScaled = rwTotal ? scaleSectionScore(r.rw_correct ?? 0, rwTotal) : 0;
  const mathScaled = mathTotal ? scaleSectionScore(r.math_correct ?? 0, mathTotal) : 0;
  return {
    rwTotal,
    mathTotal,
    rwScaled,
    mathScaled,
    total: rwScaled || mathScaled ? roundToTen(rwScaled + mathScaled) : null,
  };
}

/** Review view for one past attempt, with an optional mistakes-only filter. */
function AttemptReview({ participantId, onBack }: { participantId: string; onBack: () => void }) {
  const rows = useProctorReview(participantId, true);
  const [mistakesOnly, setMistakesOnly] = useState(false);

  const filtered = useMemo<ReviewRow[]>(() => {
    if (!rows) return [];
    return mistakesOnly ? rows.filter((r) => !r.is_correct) : rows;
  }, [rows, mistakesOnly]);

  if (!rows) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-sm">Loading your answers…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4 text-center">
        <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Your teacher hasn't released the answers for this test yet. Check back after class.
        </p>
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to results
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="sticky top-0 z-20 flex justify-end px-4 pt-2">
        <Button
          size="sm"
          variant={mistakesOnly ? 'default' : 'outline'}
          className="gap-1.5"
          onClick={() => setMistakesOnly((v) => !v)}
        >
          <Filter className="h-3.5 w-3.5" />
          {mistakesOnly ? 'All questions' : 'Mistakes only'}
        </Button>
      </div>
      {filtered.length === 0 ? (
        <div className="max-w-md mx-auto p-10 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No mistakes on this test. Perfect run.</p>
          <Button variant="outline" size="sm" onClick={() => setMistakesOnly(false)}>
            Show all questions
          </Button>
        </div>
      ) : (
        <ProctorReview key={mistakesOnly ? 'wrong' : 'all'} rows={filtered} onBack={onBack} />
      )}
    </div>
  );
}

export default function StudentProctorResults() {
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['my-proctor-history', student?.id, student?.linked_student_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('proctor_my_history', {
        p_student_account_id: student?.id ?? null,
        p_linked_student_id: student?.linked_student_id ?? null,
      });
      if (error) throw error;
      return (data ?? []) as unknown as HistoryRow[];
    },
    enabled: !!student,
  });

  const best = useMemo(() => {
    if (!rows?.length) return null;
    return rows.reduce<{ row: HistoryRow; total: number } | null>((m, r) => {
      const t = scores(r).total;
      if (t == null) return m;
      return !m || t > m.total ? { row: r, total: t } : m;
    }, null);
  }, [rows]);

  if (openId) {
    return <AttemptReview participantId={openId} onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => navigate('/practice/home')}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> My Mock Tests
          </h1>
          <p className="text-xs text-muted-foreground">Scores and mistakes from proctored mock tests</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !rows || rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            You haven't finished a proctored mock test yet. Results appear here once the test ends.
          </CardContent>
        </Card>
      ) : (
        <>
          {best && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                  Best total score
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="font-mono text-3xl font-bold">{best.total}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {best.row.title ?? 'Mock test'}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {rows.map((r) => {
              const s = scores(r);
              const date = r.submitted_at || r.finished_at;
              const locked = !r.review_mode || r.review_mode === 'off';
              return (
                <Card key={r.participant_id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.title ?? 'Mock test'}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{date ? format(new Date(date), 'MMM d, yyyy · HH:mm') : ''}</span>
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                          {r.submitted_at ? 'Submitted' : 'Ended by teacher'}
                        </Badge>
                        {s.rwTotal ? (
                          <span className="font-mono">
                            R&amp;W {s.rwScaled} ({r.rw_correct ?? 0}/{s.rwTotal})
                          </span>
                        ) : null}
                        {s.mathTotal ? (
                          <span className="font-mono">
                            Math {s.mathScaled} ({r.math_correct ?? 0}/{s.mathTotal})
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {s.total != null && (
                      <div className="font-mono text-lg font-bold shrink-0">{s.total}</div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 shrink-0"
                      onClick={() => setOpenId(r.participant_id)}
                    >
                      {locked ? <Lock className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="hidden sm:inline">Review</span>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
