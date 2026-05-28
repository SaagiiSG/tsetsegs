import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useScorePrediction } from "@/hooks/useScorePrediction";
import { Brain } from "lucide-react";

interface ScorePredictionBadgeProps {
  studentId: string;
}

export function ScorePredictionBadge({ studentId }: ScorePredictionBadgeProps) {
  const { data: prediction, isLoading } = useScorePrediction(studentId);

  if (isLoading || !prediction) return null;

  if (prediction.calibrationLocked) {
    const { solved, required } = prediction.calibrationLocked;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-dashed bg-muted/40 text-muted-foreground text-[10px] font-semibold cursor-help">
            <Brain className="h-2.5 w-2.5" />
            <span>🔒 {solved}/{required}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium">Prediction locked</p>
          <p className="text-muted-foreground">Unlocks at {required} calibration problems.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const [low, high] = prediction.predictedRange;
  const mid = Math.round((low + high) / 2);

  const getBgColor = (score: number) => {
    if (score >= 700) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    if (score >= 600) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
  };

  const confidenceLabel = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Estimated (no practice tests)",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold cursor-help ${getBgColor(mid)}`}>
          <Brain className="h-2.5 w-2.5" />
          <span>{low}-{high}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p className="font-medium">Predicted SAT Math: {low}–{high}</p>
        <p className="text-muted-foreground">{confidenceLabel[prediction.confidence]}</p>
      </TooltipContent>
    </Tooltip>
  );
}
