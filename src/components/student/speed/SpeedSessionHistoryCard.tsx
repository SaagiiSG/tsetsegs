import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/contexts/StudentAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MathText } from "@/components/MathText";
import { CheckCircle2, XCircle, Clock, ChevronRight, Zap, Timer } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface SpeedSession {
  id: string;
  subject: string;
  duration_seconds: number;
  total_questions: number;
  correct_count: number;
  points_earned: number;
  started_at: string;
  completed_at: string | null;
}

interface SpeedItem {
  order_index: number;
  answer_submitted: string | null;
  is_correct: boolean;
  time_ms: number;
  question: {
    id: string;
    question_id: string;
    question_text: string;
    answer: string;
    question_image_url: string | null;
    figure_svg: string | null;
  } | null;
}

export function SpeedSessionHistoryCard() {
  const { student } = useStudentAuth();
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["speed-sessions-history", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("speed_sessions")
        .select("id, subject, duration_seconds, total_questions, correct_count, points_earned, started_at, completed_at")
        .eq("student_account_id", student!.id)
        .order("started_at", { ascending: false })
        .limit(10);
      return (data ?? []) as SpeedSession[];
    },
  });

  if (isLoading) return null;
  if (!sessions || sessions.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            Past Speed Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.map((s) => {
            const accuracy = s.total_questions > 0 ? Math.round((s.correct_count / s.total_questions) * 100) : 0;
            return (
              <button
                key={s.id}
                onClick={() => setOpenSessionId(s.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {format(parseISO(s.started_at), "MMM d, h:mm a")}
                    </p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {s.subject} · {s.total_questions} questions
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{accuracy}%</p>
                    <p className="text-[10px] text-muted-foreground">{s.correct_count}/{s.total_questions}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <SessionDetailDialog
        sessionId={openSessionId}
        onOpenChange={(o) => !o && setOpenSessionId(null)}
      />
    </>
  );
}

function SessionDetailDialog({
  sessionId,
  onOpenChange,
}: {
  sessionId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: items, isLoading } = useQuery({
    queryKey: ["speed-session-items", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data } = await supabase
        .from("speed_session_items")
        .select(`
          order_index, answer_submitted, is_correct, time_ms,
          question:questions(id, question_id, question_text, answer, question_image_url, figure_svg)
        `)
        .eq("session_id", sessionId!)
        .order("order_index");
      return (data ?? []) as unknown as SpeedItem[];
    },
  });

  return (
    <Dialog open={!!sessionId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Session details</DialogTitle>
          <DialogDescription>Every question you saw in this session.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-3">
            {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {!isLoading && items?.length === 0 && (
              <div className="text-sm text-muted-foreground">No items recorded.</div>
            )}
            {items?.map((it) => (
              <div
                key={it.order_index}
                className={cn(
                  "rounded-xl border p-3 space-y-2",
                  it.is_correct ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"
                )}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-primary">
                      {it.question?.question_id ?? `#${it.order_index + 1}`}
                    </span>
                    {it.is_correct ? (
                      <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Correct
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-500/50 text-red-600 gap-1">
                        <XCircle className="h-3 w-3" /> Wrong
                      </Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {(it.time_ms / 1000).toFixed(1)}s
                  </span>
                </div>
                {it.question?.question_text && (
                  <div className="text-sm">
                    <MathText text={it.question.question_text} />
                  </div>
                )}
                {it.question?.figure_svg ? (
                  <div
                    className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:max-h-60"
                    dangerouslySetInnerHTML={{ __html: it.question.figure_svg }}
                  />
                ) : it.question?.question_image_url ? (
                  <div className="flex justify-center">
                    <img
                      src={it.question.question_image_url}
                      alt="Question figure"
                      className="rounded-md max-h-60 w-auto object-contain"
                    />
                  </div>
                ) : null}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Your answer:{" "}
                    <span className="font-medium text-foreground">{it.answer_submitted || "—"}</span>
                  </span>
                  <span>
                    Correct: <span className="font-medium text-foreground">{it.question?.answer ?? "—"}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
