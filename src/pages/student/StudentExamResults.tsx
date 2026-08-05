import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MathText } from '@/components/MathText';
import { cn } from '@/lib/utils';
import { ArrowLeft, ClipboardList, Check, X, Minus, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface ParticipantRow {
  id: string;
  test_id: string;
  display_name: string;
  submitted_at: string | null;
  correct_count: number;
  answered_count: number;
  total_time_ms: number;
  class_tests: {
    id: string;
    title: string;
    status: string;
    starts_at: string;
    question_ids: any;
  } | null;
}

interface AnswerRow {
  question_id: string;
  selected_answer: string | null;
  is_correct: boolean;
  time_ms: number;
}

interface QuestionRow {
  id: string;
  question_id: string | number | null;
  question_text: string | null;
  question_image_url: string | null;
  answer: string | null;
}

function ExamDetail({ participantId, questionIds }: { participantId: string; questionIds: string[] }) {
  const { data, isLoading } = useQuery({
    queryKey: ['exam-result-detail', participantId],
    queryFn: async () => {
      const [{ data: answers }, { data: questions }] = await Promise.all([
        supabase
          .from('class_test_answers')
          .select('question_id, selected_answer, is_correct, time_ms')
          .eq('participant_id', participantId),
        questionIds.length
          ? supabase
              .from('questions')
              .select('id, question_id, question_text, question_image_url, answer')
              .in('id', questionIds)
          : Promise.resolve({ data: [] as QuestionRow[] }),
      ]);
      return {
        answers: (answers ?? []) as AnswerRow[],
        questions: (questions ?? []) as QuestionRow[],
      };
    },
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  const answerMap = new Map((data?.answers ?? []).map((a) => [a.question_id, a]));
  const qMap = new Map((data?.questions ?? []).map((q) => [q.id, q]));

  return (
    <div className="divide-y border-t">
      {questionIds.map((qid, i) => {
        const a = answerMap.get(qid);
        const q = qMap.get(qid);
        const state = !a || !a.selected_answer ? 'skipped' : a.is_correct ? 'correct' : 'wrong';
        return (
          <div key={qid} className="p-3 flex gap-3">
            <div
              className={cn(
                'h-7 w-7 shrink-0 rounded-md border flex items-center justify-center font-mono text-xs font-semibold',
                state === 'correct'
                  ? 'bg-emerald-500/15 border-emerald-500/40'
                  : state === 'wrong'
                  ? 'bg-destructive/10 border-destructive/40'
                  : 'bg-muted/40',
              )}
            >
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground line-clamp-2">
                {q?.question_text ? <MathText text={q.question_text} /> : 'Question unavailable'}
              </div>
              {q?.question_image_url && (
                <img
                  src={q.question_image_url}
                  alt={`Exam question ${i + 1} figure`}
                  loading="lazy"
                  className="mt-2 max-h-28 rounded border bg-background object-contain"
                />
              )}
              <div className="mt-1.5 flex items-center gap-2 text-[11px] font-mono">
                <span className="text-muted-foreground">
                  You: {a?.selected_answer?.trim() || '—'}
                </span>
                {state !== 'correct' && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Answer: {q?.answer ?? '—'}
                  </span>
                )}
                {a?.time_ms ? (
                  <span className="text-muted-foreground">{Math.round(a.time_ms / 1000)}s</span>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 pt-1">
              {state === 'correct' ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : state === 'wrong' ? (
                <X className="h-4 w-4 text-destructive" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StudentExamResults() {
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['my-exam-results', student?.id, student?.linked_student_id],
    queryFn: async () => {
      if (!student) return [] as ParticipantRow[];
      const filters: string[] = [`student_account_id.eq.${student.id}`];
      if (student.linked_student_id) filters.push(`linked_student_id.eq.${student.linked_student_id}`);
      const { data, error } = await supabase
        .from('class_test_participants')
        .select(
          'id, test_id, display_name, submitted_at, correct_count, answered_count, total_time_ms, class_tests:test_id ( id, title, status, starts_at, question_ids )',
        )
        .or(filters.join(','))
        .order('joined_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as ParticipantRow[]).filter(
        (r) => r.class_tests && r.class_tests.status === 'finished',
      );
    },
    enabled: !!student,
  });

  const best = useMemo(() => {
    if (!rows?.length) return null;
    return rows.reduce((m, r) => (r.correct_count > m.correct_count ? r : m), rows[0]);
  }, [rows]);

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/practice/home')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> My Exam Results
          </h1>
          <p className="text-xs text-muted-foreground">Scores from class exams you have taken</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !rows || rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            You haven't taken a class exam yet. Results appear here once your teacher ends the exam.
          </CardContent>
        </Card>
      ) : (
        <>
          {best && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Best score</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="font-mono text-3xl font-bold">
                  {best.correct_count}
                  <span className="text-base text-muted-foreground">
                    /{(Array.isArray(best.class_tests?.question_ids) ? best.class_tests!.question_ids.length : 0) || 22}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{best.class_tests?.title}</div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {rows.map((r) => {
              const qids: string[] = Array.isArray(r.class_tests?.question_ids)
                ? (r.class_tests!.question_ids as string[])
                : [];
              const total = qids.length || 22;
              const pct = Math.round((r.correct_count / total) * 100);
              const isOpen = openId === r.id;
              return (
                <Card key={r.id} className="overflow-hidden">
                  <button
                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
                    onClick={() => setOpenId(isOpen ? null : r.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{r.class_tests?.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.class_tests?.starts_at
                          ? format(new Date(r.class_tests.starts_at), 'MMM d, yyyy · HH:mm')
                          : ''}
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono text-[10px] shrink-0">{pct}%</Badge>
                    <div className="font-mono text-lg font-bold shrink-0">
                      {r.correct_count}
                      <span className="text-xs text-muted-foreground">/{total}</span>
                    </div>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && <ExamDetail participantId={r.id} questionIds={qids} />}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
