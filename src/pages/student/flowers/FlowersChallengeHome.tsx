import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/contexts/StudentAuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flower2, Loader2, Timer, Trophy } from "lucide-react";
import { toast } from "sonner";

export const FLOWERS_CHALLENGES = [
  {
    key: "68",
    title: "Flowers Challenge · 68",
    questionSet: "68",
    blurb: "22 hardest questions from the 68 set. 20 correct in under 20 minutes.",
  },
  {
    key: "150",
    title: "Flowers Challenge · Hard 150",
    questionSet: "SATMathTraining800",
    blurb: "22 hardest questions from the Hard 150 set. 20 correct in under 20 minutes.",
  },
] as const;

export type FlowersChallengeKey = (typeof FLOWERS_CHALLENGES)[number]["key"];

interface LeaderRow {
  student_account_id: string;
  display_name: string;
  correct_count: number;
  duration_ms: number;
  goal_met: boolean;
}

const fmt = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export default function FlowersChallengeHome() {
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Record<string, LeaderRow[]>>({});
  const [bests, setBests] = useState<Record<string, LeaderRow | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all(
      FLOWERS_CHALLENGES.map((c) => supabase.rpc("flowers_challenge_leaderboard", { p_challenge_key: c.key, p_limit: 10 })),
    );
    const next: Record<string, LeaderRow[]> = {};
    FLOWERS_CHALLENGES.forEach((c, i) => {
      next[c.key] = ((results[i].data ?? []) as LeaderRow[]).sort(
        (a, b) => b.correct_count - a.correct_count || a.duration_ms - b.duration_ms,
      );
    });
    setBoards(next);

    if (student?.id) {
      const { data } = await supabase
        .from("flowers_challenge_attempts")
        .select("challenge_key, correct_count, duration_ms, goal_met")
        .eq("student_account_id", student.id)
        .not("submitted_at", "is", null);
      const best: Record<string, LeaderRow | undefined> = {};
      (data ?? []).forEach((row) => {
        const current = best[row.challenge_key];
        const candidate = {
          student_account_id: student.id,
          display_name: "You",
          correct_count: row.correct_count,
          duration_ms: Number(row.duration_ms),
          goal_met: row.goal_met,
        };
        if (!current || candidate.correct_count > current.correct_count || (candidate.correct_count === current.correct_count && candidate.duration_ms < current.duration_ms)) {
          best[row.challenge_key] = candidate;
        }
      });
      setBests(best);
    }
    setLoading(false);
  }, [student?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const start = async (key: FlowersChallengeKey, questionSet: string) => {
    if (!student?.id || starting) return;
    setStarting(key);
    try {
      const { data: picks, error: pickError } = await supabase.rpc("pick_hardest_questions", {
        p_question_set: questionSet,
        p_limit: 22,
        p_min_attempts: 1,
      });
      if (pickError) throw pickError;
      const ids = ((picks ?? []) as Array<{ question_id: string }>).map((p) => p.question_id);
      if (ids.length < 22) throw new Error("Not enough questions available yet");

      const { data: attempt, error } = await supabase
        .from("flowers_challenge_attempts")
        .insert({
          student_account_id: student.id,
          challenge_key: key,
          question_ids: ids,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;

      navigate(`/practice/flowers/${attempt.id}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not start the challenge");
    } finally {
      setStarting(null);
    }
  };

  const anyLoading = useMemo(() => loading, [loading]);

  return (
    <div className="container max-w-4xl py-4 space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Flower2 className="h-5 w-5 text-primary" />
          Flowers Challenge
        </h1>
        <p className="text-sm text-muted-foreground">
          One shot, 20 minutes, the 22 hardest questions we have. Beat 20/22 to earn the badge.
        </p>
      </div>

      {anyLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {FLOWERS_CHALLENGES.map((c) => {
            const best = bests[c.key];
            const board = boards[c.key] ?? [];
            return (
              <Card key={c.key} className="p-4 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold">{c.title}</h2>
                    {best?.goal_met && <Badge className="shrink-0">Goal met</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.blurb}</p>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5" /> 20:00
                  </span>
                  <span>22 questions</span>
                  {best && (
                    <span className="font-mono">
                      best {best.correct_count}/22 · {fmt(best.duration_ms)}
                    </span>
                  )}
                </div>

                <Button className="w-full" onClick={() => start(c.key, c.questionSet)} disabled={starting !== null}>
                  {starting === c.key ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {best ? "Run it again" : "Start challenge"}
                </Button>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" /> Leaderboard
                  </p>
                  {board.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nobody has finished yet. Be first.</p>
                  ) : (
                    board.slice(0, 5).map((row, i) => (
                      <div key={row.student_account_id} className="flex justify-between text-xs">
                        <span className={row.student_account_id === student?.id ? "font-semibold" : ""}>
                          {i + 1}. {row.student_account_id === student?.id ? "You" : row.display_name}
                        </span>
                        <span className="tabular-nums font-mono">
                          {row.correct_count}/22 · {fmt(row.duration_ms)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
