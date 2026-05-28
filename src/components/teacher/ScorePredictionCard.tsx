import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, ChevronDown, ChevronUp, TrendingUp, BookOpen, CheckCircle2, Target } from "lucide-react";
import { useScorePrediction } from "@/hooks/useScorePrediction";
import { ScorePredictionLockedCard } from "./ScorePredictionLockedCard";

interface ScorePredictionCardProps {
  studentId: string;
}

export function ScorePredictionCard({ studentId }: ScorePredictionCardProps) {
  const { data: prediction, isLoading } = useScorePrediction(studentId);
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!prediction) return null;

  if (prediction.calibrationLocked) {
    return (
      <ScorePredictionLockedCard
        solved={prediction.calibrationLocked.solved}
        required={prediction.calibrationLocked.required}
      />
    );
  }

  const [low, high] = prediction.predictedRange;
  const midScore = Math.round((low + high) / 2);

  const getScoreColor = (score: number) => {
    if (score >= 700) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 600) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 700) return "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20";
    if (score >= 600) return "from-amber-500/10 to-amber-600/5 border-amber-500/20";
    return "from-red-500/10 to-red-600/5 border-red-500/20";
  };

  const confidenceMap = {
    high: { label: "High Confidence", variant: "default" as const },
    medium: { label: "Medium Confidence", variant: "secondary" as const },
    low: { label: "Estimated", variant: "outline" as const },
  };

  const conf = confidenceMap[prediction.confidence];
  const { factors } = prediction;

  const formatAdj = (adj: number) => {
    if (adj === 0) return "—";
    return adj > 0 ? `+${adj}` : `${adj}`;
  };

  return (
    <Card className={`bg-gradient-to-br ${getScoreBg(midScore)}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className={`h-4 w-4 ${getScoreColor(midScore)}`} />
            <CardTitle className="text-sm font-semibold">Predicted SAT Math</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!prediction.hasBaseline && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600">
                No baseline
              </Badge>
            )}
            <Badge variant={conf.variant} className="text-[10px] px-1.5 py-0">
              {conf.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-baseline gap-1 mb-2">
          <span className={`text-3xl font-bold ${getScoreColor(midScore)}`}>
            {low}
          </span>
          <span className="text-muted-foreground text-lg">–</span>
          <span className={`text-3xl font-bold ${getScoreColor(midScore)}`}>
            {high}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground -ml-2"
          onClick={() => setShowBreakdown(!showBreakdown)}
        >
          {showBreakdown ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
          {showBreakdown ? "Hide" : "Show"} breakdown
        </Button>

        {showBreakdown && (
          <div className="mt-3 space-y-2 text-xs border-t pt-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Target className="h-3 w-3" />
                <span>Base score</span>
              </div>
              <span className="font-medium">{prediction.baseScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                <span>Attendance ({factors.attendanceRate.toFixed(0)}%)</span>
              </div>
              <span className={`font-medium ${factors.attendanceAdj < 0 ? 'text-red-500' : ''}`}>
                {formatAdj(factors.attendanceAdj)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                <span>Homework ({factors.homeworkRate.toFixed(0)}%)</span>
              </div>
              <span className={`font-medium ${factors.homeworkAdj < 0 ? 'text-red-500' : ''}`}>
                {formatAdj(factors.homeworkAdj)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>Practice ({factors.attemptVolume} Q, {factors.hardAccuracy.toFixed(0)}% hard)</span>
              </div>
              <span className={`font-medium ${factors.practiceAdj > 0 ? 'text-emerald-500' : factors.practiceAdj < 0 ? 'text-red-500' : ''}`}>
                {formatAdj(factors.practiceAdj)}
              </span>
            </div>
            {factors.variancePenalty !== 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Target className="h-3 w-3" />
                  <span>Score volatility</span>
                </div>
                <span className="font-medium text-red-500">
                  {formatAdj(factors.variancePenalty)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
