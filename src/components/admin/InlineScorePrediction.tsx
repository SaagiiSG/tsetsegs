import { useScorePrediction } from '@/hooks/useScorePrediction';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InlineScorePredictionProps {
  studentId: string;
  courseType?: string;
}

export function InlineScorePrediction({ studentId, courseType }: InlineScorePredictionProps) {
  const { data: prediction, isLoading } = useScorePrediction(studentId);

  // Only show for SAT students
  if (courseType && courseType !== 'SAT') {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  if (isLoading) {
    return <span className="text-xs text-muted-foreground animate-pulse">...</span>;
  }

  if (!prediction) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  if (prediction.calibrationLocked) {
    const { solved, required } = prediction.calibrationLocked;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs font-mono cursor-default bg-muted/40 text-muted-foreground border-dashed">
              🔒 {solved}/{required}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>Prediction locked until calibration ({required} problems).</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const [low, high] = prediction.predictedRange;
  const confidenceColor = prediction.confidence === 'high'
    ? 'bg-green-500/10 text-green-700 border-green-500/30'
    : prediction.confidence === 'medium'
    ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30'
    : 'bg-red-500/10 text-red-700 border-red-500/30';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`text-xs font-mono cursor-default ${confidenceColor}`}>
            {low}–{high}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>Base: {prediction.baseScore} | Confidence: {prediction.confidence}</p>
          <p>Att: {prediction.factors.attendanceAdj > 0 ? '+' : ''}{prediction.factors.attendanceAdj} | HW: {prediction.factors.homeworkAdj > 0 ? '+' : ''}{prediction.factors.homeworkAdj} | Practice: {prediction.factors.practiceAdj > 0 ? '+' : ''}{prediction.factors.practiceAdj}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
