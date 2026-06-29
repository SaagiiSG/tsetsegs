import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useScorePrediction } from "@/hooks/useScorePrediction";

interface SatSimulationPanelProps {
  studentId: string;
}

/**
 * Teacher/admin-only panel. Surfaces the rolling 44-question SAT simulation
 * and explains how it feeds the score prediction. Students never see this.
 */
export function SatSimulationPanel({ studentId }: SatSimulationPanelProps) {
  const { data: prediction, isLoading } = useScorePrediction(studentId);
  const [showHow, setShowHow] = useState(false);

  if (isLoading || !prediction || !prediction.simulation) return null;

  const { latest, history, blendedScore, blendWeight, practiceTestCount } = prediction.simulation;

  const confColor = {
    high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    med: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    low: "bg-muted text-muted-foreground border-border",
  } as const;

  const fmtTime = (s: number) =>
    s > 0 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "—";

  const blendLabel =
    practiceTestCount === 0
      ? "Sim is driving 100% of base score (no real practice tests yet)"
      : practiceTestCount >= 3
      ? `Base = 85% practice tests + 15% sim avg`
      : `Base = 70% practice tests + 30% sim avg`;

  // sparkline normalization (400-800 → 0-1)
  const sparkPts = [...history].reverse(); // oldest → newest left-to-right
  const W = 220;
  const H = 36;
  const xStep = sparkPts.length > 1 ? W / (sparkPts.length - 1) : 0;
  const yFor = (score: number) => H - ((score - 400) / 400) * H;
  const path = sparkPts.map((s, i) => `${i === 0 ? "M" : "L"}${i * xStep},${yFor(s.simScore)}`).join(" ");

  return (
    <Card className="border-dashed border-indigo-500/30 bg-indigo-500/[0.03]">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-500" />
            <CardTitle className="text-sm font-semibold">SAT Simulation Engine</CardTitle>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/40 text-indigo-600 dark:text-indigo-400">
              Staff only
            </Badge>
          </div>
          <Badge className={`text-[10px] px-1.5 py-0 border ${confColor[latest.confidence]}`}>
            {latest.confidence === "high" ? "High confidence" : latest.confidence === "med" ? "Medium" : "Low confidence"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 leading-none">
              {latest.simScore}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Latest sim · blended {blendedScore} ({history.length} sim{history.length > 1 ? "s" : ""})
            </div>
          </div>
          {sparkPts.length > 1 && (
            <svg width={W} height={H} className="overflow-visible">
              <path d={path} stroke="currentColor" strokeWidth={1.5} fill="none" className="text-indigo-500" />
              {sparkPts.map((s, i) => (
                <circle key={i} cx={i * xStep} cy={yFor(s.simScore)} r={2.5} className="fill-indigo-500" />
              ))}
            </svg>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 text-[11px]">
          <Stat label="Accuracy" value={`${Math.round(latest.accuracy * 100)}%`} />
          <Stat label="Avg time" value={fmtTime(latest.avgTimeSec)} />
          <Stat label="Hard share" value={`${Math.round(latest.hardShare * 100)}%`} />
          <Stat label="Questions" value={`${latest.totalQuestions}`} />
        </div>

        <div className="text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1.5">
          <span className="font-medium text-foreground">Blend: </span>
          {blendLabel}
          {blendWeight > 0 && blendWeight < 1 && (
            <span className="text-muted-foreground"> · sim weight {Math.round(blendWeight * 100)}%</span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground -ml-2"
          onClick={() => setShowHow((v) => !v)}
        >
          {showHow ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
          How this works
        </Button>

        {showHow && (
          <div className="text-[11px] leading-relaxed text-muted-foreground border-t pt-3 space-y-2">
            <div className="flex gap-1.5">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-indigo-500" />
              <p>
                Every 10 questions a student answers, we take their most recent <strong>44 distinct attempts</strong> and
                run a weighted simulation. Hard questions count for 1.5×, medium 1.0×, easy 0.6×. On-pace speed
                (~95s/question) gives correct answers a small bonus (up to ±15%). Wrong answers always score zero.
              </p>
            </div>
            <div className="flex gap-1.5">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-indigo-500" />
              <p>
                Batches without enough hard questions get a small mix penalty and are flagged
                <strong> low confidence</strong> so they don't dominate the blend. We average the latest 3 sims weighted by confidence
                (high=1.0, med=0.7, low=0.4).
              </p>
            </div>
            <div className="flex gap-1.5">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-indigo-500" />
              <p>
                The sim feeds the score prediction at <strong>15–30%</strong> when real practice tests exist (tests always
                dominate), or <strong>100%</strong> as the base when the student has no tests yet but has cleared 44+ questions.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 bg-background/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
