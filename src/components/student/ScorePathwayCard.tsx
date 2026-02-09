import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Target, TrendingUp, Edit2, Check, X, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScorePathwayCardProps {
  currentScore: number | null;
  targetScore: number | null;
  onTargetScoreChange: (score: number | null) => Promise<void>;
  weakestTopic?: {
    name: string;
    category: 'math' | 'english';
    potentialGain: number;
  };
  isLoading?: boolean;
}

export function ScorePathwayCard({
  currentScore,
  targetScore,
  onTargetScoreChange,
  weakestTopic,
  isLoading
}: ScorePathwayCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(targetScore?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const gap = targetScore && currentScore ? targetScore - currentScore : null;
  const progressPercent = targetScore && currentScore && gap && gap > 0
    ? Math.min(100, Math.max(0, ((currentScore - 400) / (targetScore - 400)) * 100))
    : currentScore ? 100 : 0;

  const handleSave = async () => {
    const parsed = parseInt(editValue);
    if (!isNaN(parsed) && parsed >= 400 && parsed <= 1600) {
      setIsSaving(true);
      try {
        await onTargetScoreChange(parsed);
        setIsEditing(false);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setEditValue(targetScore?.toString() || '');
    setIsEditing(false);
  };

  const getGapMessage = (gap: number) => {
    if (gap <= 0) return { text: "You've reached your goal! 🎉", color: 'text-green-600' };
    if (gap <= 50) return { text: "Almost there! Keep pushing!", color: 'text-green-600' };
    if (gap <= 100) return { text: "Great progress! Stay focused.", color: 'text-amber-600' };
    if (gap <= 200) return { text: "Good momentum. Consistent practice is key.", color: 'text-amber-600' };
    return { text: "Every point counts. Let's work on your weak areas!", color: 'text-primary' };
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-primary/20 rounded w-1/3" />
            <div className="h-8 bg-primary/20 rounded w-full" />
            <div className="h-4 bg-primary/20 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20 overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Score Pathway
          </CardTitle>
          {!isEditing && targetScore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditValue(targetScore.toString());
                setIsEditing(true);
              }}
              className="h-8 px-2"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 relative">
        {/* No target set state */}
        {!targetScore && !isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4"
          >
            <p className="text-muted-foreground mb-3">
              Set your SAT target score to track your progress
            </p>
            <Button
              onClick={() => setIsEditing(true)}
              className="gap-2"
            >
              <Target className="h-4 w-4" />
              Set Target Score
            </Button>
          </motion.div>
        )}

        {/* Editing state */}
        <AnimatePresence mode="wait">
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={400}
                  max={1600}
                  step={10}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter target (400-1600)"
                  className="text-lg font-bold text-center"
                  autoFocus
                />
                <Button
                  size="icon"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="shrink-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Common targets: 1200 (Good), 1350 (Competitive), 1450 (Top Schools), 1500+ (Elite)
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Score display */}
        {targetScore && !isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Score numbers */}
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Current</p>
                <p className="text-2xl md:text-3xl font-bold">
                  {currentScore || '—'}
                </p>
              </div>
              
              <div className="flex-1 mx-4 flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                  />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Target</p>
                <p className="text-2xl md:text-3xl font-bold text-primary">
                  {targetScore}
                </p>
              </div>
            </div>

            {/* Gap badge */}
            {gap !== null && (
              <div className="flex items-center justify-center gap-2">
                <Badge 
                  variant={gap <= 0 ? "default" : "secondary"}
                  className={cn(
                    "text-sm px-3 py-1",
                    gap <= 0 && "bg-green-600 hover:bg-green-700"
                  )}
                >
                  {gap <= 0 ? (
                    <>🎯 Goal Achieved!</>
                  ) : (
                    <>+{gap} points to go</>
                  )}
                </Badge>
              </div>
            )}

            {/* Motivational message */}
            {gap !== null && (
              <p className={cn("text-sm text-center font-medium", getGapMessage(gap).color)}>
                {getGapMessage(gap).text}
              </p>
            )}

            {/* Daily focus recommendation */}
            {weakestTopic && gap && gap > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-primary/10 rounded-lg p-3 border border-primary/20"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Today's Focus
                    </p>
                    <p className="text-sm font-medium">
                      {weakestTopic.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Potential gain: <span className="text-green-600 font-medium">+{weakestTopic.potentialGain} pts</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {weakestTopic.category}
                  </Badge>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
