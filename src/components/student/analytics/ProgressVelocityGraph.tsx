import { motion } from 'framer-motion';
import { TrendingUp, Rocket, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Area, ComposedChart } from 'recharts';
import { format, parseISO, addWeeks } from 'date-fns';
import { ActionBox } from './ActionBox';
import type { ProgressHistory } from '@/hooks/useStudentAnalytics';

interface ProgressVelocityGraphProps {
  progressHistory: ProgressHistory[];
  currentScore: number;
  targetScore: number;
}

export function ProgressVelocityGraph({ 
  progressHistory, 
  currentScore, 
  targetScore 
}: ProgressVelocityGraphProps) {
  // Calculate weekly improvement rate
  const getImprovementRate = () => {
    if (progressHistory.length < 2) return 0;
    const first = progressHistory[0];
    const last = progressHistory[progressHistory.length - 1];
    const weeks = progressHistory.length;
    return Math.round((last.accuracy - first.accuracy) / weeks);
  };

  const improvementRate = getImprovementRate();

  // Generate projection data
  const generateProjections = () => {
    if (progressHistory.length === 0) return [];
    
    const lastData = progressHistory[progressHistory.length - 1];
    const lastDate = parseISO(lastData.date);
    const projections = [];

    for (let i = 1; i <= 8; i++) {
      const projectedAccuracy = Math.min(100, lastData.accuracy + (improvementRate * i));
      projections.push({
        date: format(addWeeks(lastDate, i), 'yyyy-MM-dd'),
        accuracy: null,
        projectedAccuracy,
        isProjection: true,
      });
    }

    return projections;
  };

  const chartData = [
    ...progressHistory.map((d) => ({
      date: d.date,
      accuracy: d.accuracy,
      projectedAccuracy: null,
      questionsAttempted: d.questionsAttempted,
      isProjection: false,
    })),
    ...generateProjections(),
  ];

  // Calculate weeks to target
  const targetAccuracy = 85;
  const weeksToTarget = improvementRate > 0 
    ? Math.ceil((targetAccuracy - (progressHistory[progressHistory.length - 1]?.accuracy || 0)) / improvementRate)
    : null;

  const hasData = progressHistory.length > 0;

  let actionMessage = '';
  let actionText = '';
  let variant: 'default' | 'urgent' | 'success' = 'default';

  if (!hasData) {
    actionMessage = 'Start practicing to track your progress over time.';
    actionText = 'Complete at least 20 questions per week to see trends.';
  } else if (improvementRate > 0) {
    actionMessage = `Improving +${improvementRate}% accuracy per week! ${weeksToTarget ? `You'll hit 85% in ~${weeksToTarget} weeks.` : ''}`;
    actionText = 'Keep this momentum! Add 1-2 more practice sessions weekly to accelerate.';
    variant = 'success';
  } else if (improvementRate === 0) {
    actionMessage = 'Your accuracy is stable but not improving.';
    actionText = 'Try focusing on weak topics specifically rather than random practice.';
    variant = 'default';
  } else {
    actionMessage = `Accuracy trending down (${improvementRate}%/week). Don't worry—this is fixable!`;
    actionText = 'Slow down, review explanations, and focus on fundamentals.';
    variant = 'urgent';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Progress Velocity
              </CardTitle>
              <CardDescription>Weekly accuracy trend with projections</CardDescription>
            </div>
            {improvementRate !== 0 && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                improvementRate > 0 
                  ? 'bg-emerald-500/20 text-emerald-600' 
                  : 'bg-red-500/20 text-red-600'
              }`}>
                <Rocket className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  {improvementRate > 0 ? '+' : ''}{improvementRate}%/week
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg p-3 shadow-lg">
                              <p className="font-medium text-sm">
                                {format(parseISO(data.date), 'MMM d, yyyy')}
                              </p>
                              {data.isProjection ? (
                                <p className="text-sm text-muted-foreground">
                                  Projected: <span className="font-semibold">{data.projectedAccuracy}%</span>
                                </p>
                              ) : (
                                <>
                                  <p className="text-sm text-muted-foreground">
                                    Accuracy: <span className="font-semibold">{data.accuracy}%</span>
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Questions: <span className="font-semibold">{data.questionsAttempted}</span>
                                  </p>
                                </>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine 
                      y={targetAccuracy} 
                      stroke="hsl(142, 71%, 45%)" 
                      strokeDasharray="5 5"
                      label={{ 
                        value: 'Target 85%', 
                        position: 'right',
                        fontSize: 10,
                        fill: 'hsl(142, 71%, 45%)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="accuracy"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.1}
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="projectedAccuracy"
                      stroke="hsl(var(--primary))"
                      strokeDasharray="5 5"
                      strokeOpacity={0.5}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Stats summary */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Start</p>
                  <p className="font-semibold">{progressHistory[0]?.accuracy || 0}%</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="font-semibold">{progressHistory[progressHistory.length - 1]?.accuracy || 0}%</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-primary/10">
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="font-semibold text-primary">{targetAccuracy}%</p>
                </div>
              </div>

              <ActionBox
                message={actionMessage}
                action={actionText}
                variant={variant}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[250px] text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No progress data yet</p>
              <p className="text-sm text-muted-foreground/60">Practice consistently to see your trend</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
