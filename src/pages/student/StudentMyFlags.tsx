import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Flag, ArrowLeft, ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FlagRow {
  id: string;
  question_id: string;
  flag_reason: string | null;
  flagged_at: string;
  admin_reviewed: boolean | null;
  reviewed_at: string | null;
  questions: {
    id: string;
    question_id: number | string | null;
    question_text: string | null;
    category: { name: string } | null;
  } | null;
}

export default function StudentMyFlags() {
  const { student } = useStudentAuth();
  const navigate = useNavigate();

  const { data: flags, isLoading } = useQuery({
    queryKey: ['my-flagged-questions', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from('question_flags')
        .select(`
          id,
          question_id,
          flag_reason,
          flagged_at,
          admin_reviewed,
          reviewed_at,
          questions:question_id (
            id,
            question_id,
            question_text,
            category:category_id ( name )
          )
        `)
        .eq('student_account_id', student.id)
        .order('flagged_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as FlagRow[];
    },
    enabled: !!student,
  });

  const pendingCount = flags?.filter((f) => !f.admin_reviewed).length || 0;
  const reviewedCount = flags?.filter((f) => f.admin_reviewed).length || 0;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-orange-500" />
            My Flagged Questions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Questions you've reported for review. Admins will check them and fix anything broken.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : !flags || flags.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <Flag className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No flagged questions yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                When you flag a question while practicing, it'll show up here so you can track what
                the admins have reviewed.
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-4 text-xs">
                <Badge variant="secondary" className="gap-1.5">
                  <Clock className="h-3 w-3" />
                  {pendingCount} pending
                </Badge>
                <Badge variant="secondary" className="gap-1.5 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  {reviewedCount} reviewed
                </Badge>
              </div>

              <div className="space-y-3">
                {flags.map((flag) => {
                  const reviewed = !!flag.admin_reviewed;
                  const qLabel =
                    flag.questions?.question_id?.toString() ||
                    flag.questions?.category?.name ||
                    'Question';
                  return (
                    <div
                      key={flag.id}
                      className="border rounded-lg p-4 space-y-2 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">#{qLabel}</span>
                          {reviewed ? (
                            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 gap-1 text-[10px]">
                              <CheckCircle2 className="h-3 w-3" />
                              Reviewed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 text-[10px]">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(flag.flagged_at), { addSuffix: true })}
                        </span>
                      </div>

                      {flag.questions?.question_text && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {flag.questions.question_text}
                        </p>
                      )}

                      {flag.flag_reason && (
                        <div className="text-sm bg-muted/40 rounded px-3 py-2 border-l-2 border-orange-500/50">
                          <span className="text-xs font-medium text-muted-foreground">Your note: </span>
                          {flag.flag_reason}
                        </div>
                      )}

                      {flag.questions?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/practice/question/${flag.questions!.id}`)}
                          className="gap-1.5 h-7 text-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View question
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
