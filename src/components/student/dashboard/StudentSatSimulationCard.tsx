import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Lock, Sparkles } from "lucide-react";
import { useStudentAuth } from "@/contexts/StudentAuthContext";
import { useScorePrediction } from "@/hooks/useScorePrediction";
import { supabase } from "@/integrations/supabase/client";

const UNLOCK_AT = 440;

interface Props {
  /** 'dashboard' shows only when unlocked. 'drawer' shows only the locked progress card. */
  mode?: 'dashboard' | 'drawer';
}

/**
 * Student-facing SAT simulation card.
 * - On the dashboard: only renders once unlocked (≥440 distinct questions).
 * - In the announcement drawer: only renders the locked progress card.
 */
export function StudentSatSimulationCard({ mode = 'dashboard' }: Props = {}) {
  const { student } = useStudentAuth();
  const accountId = student?.id;
  const studentId = student?.linked_student?.id ?? student?.linked_student_id ?? undefined;
  const { data: prediction, isLoading } = useScorePrediction(studentId);
  const { data: drawerSolved = 0 } = useQuery({
    queryKey: ['sat-simulation-drawer-progress', accountId],
    enabled: mode === 'drawer' && !!accountId,
    queryFn: async () => {
      const { data } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', accountId!)
        .limit(5000);
      return new Set((data ?? []).map((row: any) => row.question_id)).size;
    },
    staleTime: 60 * 1000,
  });

  const distinct = mode === 'drawer' ? (prediction?.distinctSolved ?? drawerSolved) : (prediction?.distinctSolved ?? 0);
  const unlocked = distinct >= UNLOCK_AT && !!prediction?.simulation;

  // One-time "New!" pulse for 7 days after first unlock — stored per student
  const lsKey = studentId ? `sat-sim-unlocked-at:${studentId}` : null;
  const [unlockedAt, setUnlockedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!unlocked || !lsKey) return;
    const existing = localStorage.getItem(lsKey);
    if (existing) {
      setUnlockedAt(Number(existing));
    } else {
      const now = Date.now();
      localStorage.setItem(lsKey, String(now));
      setUnlockedAt(now);
      toast.success("SAT Simulation Engine unlocked!", {
        description: "You've solved 440 questions. Your live simulated SAT score is now on your dashboard.",
        duration: 8000,
        icon: "🎯",
      });
    }
  }, [unlocked, lsKey]);

  const isFresh = unlockedAt ? Date.now() - unlockedAt < 7 * 24 * 60 * 60 * 1000 : false;

  // ---------- Locked state (drawer only) ----------
  if (mode === 'drawer') {
    if (!student || distinct >= UNLOCK_AT) return null;
    const pct = Math.min(100, Math.round((distinct / UNLOCK_AT) * 100));
    return (
      <Card className="border-dashed border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-indigo-500" />
            <div className="text-sm font-semibold">SAT Simulation Engine</div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
              Locked
            </Badge>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">
            Solve <strong>{UNLOCK_AT} questions</strong> to unlock a live SAT score simulation based on your accuracy,
            speed, and question difficulty.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {distinct}/{UNLOCK_AT}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---------- Unlocked state (dashboard only) ----------
  if (isLoading || !prediction || prediction.calibrationLocked || !unlocked) return null;

  // ---------- Unlocked state ----------
  const { latest } = prediction.simulation!;
  const confLabel = latest.confidence === "high" ? "High confidence" : latest.confidence === "med" ? "Medium" : "Low confidence";

  return (
    <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.06] to-transparent relative overflow-hidden">
      {isFresh && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500 text-white animate-pulse">
          <Sparkles className="h-2.5 w-2.5" />
          NEW
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4 text-indigo-500" />
          <div className="text-sm font-semibold">SAT Simulation</div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
            {confLabel}
          </Badge>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 leading-none">
            {latest.simScore}
          </div>
          <div className="text-[11px] text-muted-foreground">/ 800</div>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Based on your most recent 44 questions · {Math.round(latest.accuracy * 100)}% accurate
        </p>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <Mini label="Hard share" value={`${Math.round(latest.hardShare * 100)}%`} />
          <Mini
            label="Avg time"
            value={latest.avgTimeSec > 0 ? `${Math.floor(latest.avgTimeSec / 60)}:${String(Math.round(latest.avgTimeSec % 60)).padStart(2, "0")}` : "—"}
          />
          <Mini label="Questions" value={`${latest.totalQuestions}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 bg-background/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
