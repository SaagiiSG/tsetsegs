import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BluebookModuleCardProps {
  label: string;
  timeLimit: number;
  targetQuestions: number;
  currentQuestions: number;
  onAddQuestions: () => void;
  disabled?: boolean;
  moduleId?: string;
}

const BluebookModuleCard = ({
  label,
  timeLimit,
  targetQuestions,
  currentQuestions,
  onAddQuestions,
  disabled,
}: BluebookModuleCardProps) => {
  const progress = (currentQuestions / targetQuestions) * 100;
  const isComplete = currentQuestions >= targetQuestions;
  const hasQuestions = currentQuestions > 0;

  return (
    <Card
      className={cn(
        "transition-all",
        isComplete && "border-green-500/50 bg-green-500/5",
        !isComplete && hasQuestions && "border-amber-500/50 bg-amber-500/5"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{label}</CardTitle>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {timeLimit} min
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Questions</span>
            <span
              className={cn(
                "font-medium",
                isComplete && "text-green-600",
                !isComplete && hasQuestions && "text-amber-600"
              )}
            >
              {currentQuestions} / {targetQuestions}
            </span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {isComplete ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Complete</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-600">
                {targetQuestions - currentQuestions} more needed
              </span>
            </>
          )}
        </div>

        {/* Add Questions Button */}
        <Button
          variant={hasQuestions ? "outline" : "default"}
          className="w-full gap-2"
          onClick={onAddQuestions}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          {hasQuestions ? "Manage Questions" : "Add Questions"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BluebookModuleCard;
