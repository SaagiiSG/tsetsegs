import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Lock } from "lucide-react";

interface ScorePredictionLockedCardProps {
  solved: number;
  required: number;
}

export function ScorePredictionLockedCard({ solved, required }: ScorePredictionLockedCardProps) {
  const pct = Math.min(100, Math.round((solved / required) * 100));
  const remaining = Math.max(0, required - solved);

  return (
    <Card className="bg-gradient-to-br from-muted/40 to-muted/10 border-dashed">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Predicted SAT Math — Locked
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <p className="text-xs text-muted-foreground">
          Unlocks after the student completes calibration —{" "}
          <span className="font-mono font-medium text-foreground">{solved}/{required}</span>{" "}
          problems solved.
        </p>
        <Progress value={pct} className="h-2" />
        {remaining > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {remaining} more problem{remaining === 1 ? "" : "s"} to unlock.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
