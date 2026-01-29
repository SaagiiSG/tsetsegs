import { motion } from 'framer-motion';
import { Gauge, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ActionBox } from './ActionBox';
import type { DifficultyBreakdown } from '@/hooks/useStudentAnalytics';

interface DifficultyAnalysisProps {
  difficultyBreakdown: DifficultyBreakdown;
}

export function DifficultyAnalysis({ difficultyBreakdown }: DifficultyAnalysisProps) {
  const { easy, medium, hard } = difficultyBreakdown;
  
  // Detect careless errors (missing more easy than hard)
  const hasCarelessErrors = easy.accuracy < hard.accuracy && easy.total > 5;
  const easyMissRate = 100 - easy.accuracy;
  const hardMissRate = 100 - hard.accuracy;

  const difficulties = [
    { 
      label: 'Easy', 
      data: easy, 
      color: 'text-emerald-500', 
      bgColor: 'bg-emerald-500',
      gradient: 'from-emerald-500/20 to-emerald-500/5'
    },
    { 
      label: 'Medium', 
      data: medium, 
      color: 'text-amber-500', 
      bgColor: 'bg-amber-500',
      gradient: 'from-amber-500/20 to-amber-500/5'
    },
    { 
      label: 'Hard', 
      data: hard, 
      color: 'text-red-500', 
      bgColor: 'bg-red-500',
      gradient: 'from-red-500/20 to-red-500/5'
    },
  ];

  let actionMessage = '';
  let actionText = '';
  let variant: 'default' | 'urgent' | 'success' = 'default';

  if (hasCarelessErrors) {
    actionMessage = `Missing ${easyMissRate}% of EASY questions but only ${hardMissRate}% of HARD. This indicates careless errors, not skill gaps.`;
    actionText = '10-min focused practice with NO distractions. Use scratch paper.';
    variant = 'urgent';
  } else if (hard.accuracy < 50 && hard.total > 5) {
    actionMessage = `Hard questions are challenging (${hard.accuracy}% accuracy). This is normal—focus on building skills.`;
    actionText = 'Review hard question explanations and practice similar problems.';
    variant = 'default';
  } else if (easy.accuracy >= 85 && medium.accuracy >= 70 && hard.accuracy >= 50) {
    actionMessage = 'Excellent difficulty balance! You handle all levels well.';
    actionText = 'Keep challenging yourself with harder problems.';
    variant = 'success';
  } else {
    actionMessage = 'Keep practicing across all difficulty levels for balanced improvement.';
    actionText = 'Mix easy, medium, and hard questions in your sessions.';
    variant = 'default';
  }

  const hasData = easy.total > 0 || medium.total > 0 || hard.total > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5 text-purple-500" />
            Difficulty Analysis
          </CardTitle>
          <CardDescription>Performance by question difficulty</CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {difficulties.map(({ label, data, color, bgColor, gradient }) => (
                  <motion.div
                    key={label}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className={`relative p-4 rounded-xl bg-gradient-to-br ${gradient} border text-center overflow-hidden`}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                    <p className={`text-3xl font-bold ${color}`}>
                      {data.accuracy}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.correct}/{data.total}
                    </p>
                    <div className="mt-2">
                      <Progress 
                        value={data.accuracy} 
                        className="h-1.5"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Careless error warning */}
              {hasCarelessErrors && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-4"
                >
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 font-medium">
                    Careless error pattern detected!
                  </p>
                </motion.div>
              )}

              {easy.accuracy >= 90 && medium.accuracy >= 80 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 mb-4"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  <p className="text-sm text-emerald-600 font-medium">
                    Strong fundamentals! Ready for harder challenges.
                  </p>
                </motion.div>
              )}

              <ActionBox
                message={actionMessage}
                action={actionText}
                variant={variant}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <Gauge className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No difficulty data yet</p>
              <p className="text-sm text-muted-foreground/60">Practice questions to see your performance</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
