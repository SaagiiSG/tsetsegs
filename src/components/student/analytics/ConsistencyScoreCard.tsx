import { motion } from 'framer-motion';
import { Activity, Sun, Moon, Sunrise, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { ActionBox } from './ActionBox';
import type { ConsistencyMetrics } from '@/hooks/useStudentAnalytics';

interface ConsistencyScoreCardProps {
  consistencyMetrics: ConsistencyMetrics;
}

const timeIcons = {
  morning: Sun,
  afternoon: Sunrise,
  evening: Moon,
};

const timeLabels = {
  morning: 'Morning (6am-12pm)',
  afternoon: 'Afternoon (12pm-6pm)',
  evening: 'Evening (6pm-12am)',
};

export function ConsistencyScoreCard({ consistencyMetrics }: ConsistencyScoreCardProps) {
  const { 
    scoreVariance, 
    bestTimeOfDay, 
    bestDayOfWeek, 
    dailyActivity,
    timeOfDayStats 
  } = consistencyMetrics;

  const hasData = dailyActivity.length > 0;

  // Get icon for best time
  const TimeIcon = timeIcons[bestTimeOfDay];

  // Calculate consistency score (inverse of variance)
  const consistencyScore = hasData ? Math.max(0, 100 - scoreVariance * 2) : 0;
  const consistencyLabel = consistencyScore >= 80 ? 'Excellent' : consistencyScore >= 60 ? 'Good' : consistencyScore >= 40 ? 'Fair' : 'Needs Work';
  const consistencyColor = consistencyScore >= 80 ? 'text-emerald-500' : consistencyScore >= 60 ? 'text-blue-500' : consistencyScore >= 40 ? 'text-amber-500' : 'text-red-500';

  // Find best time accuracy boost
  const bestTimeStats = timeOfDayStats.find((t) => t.period === bestTimeOfDay);
  const avgAccuracy = timeOfDayStats.length > 0
    ? Math.round(timeOfDayStats.reduce((sum, t) => sum + t.accuracy * t.attempts, 0) / 
        Math.max(1, timeOfDayStats.reduce((sum, t) => sum + t.attempts, 0)))
    : 0;
  const accuracyBoost = bestTimeStats ? bestTimeStats.accuracy - avgAccuracy : 0;

  // Prepare chart data for last 14 days
  const chartData = dailyActivity.slice(-14).map((d) => ({
    date: d.date.substring(5), // MM-DD format
    accuracy: d.accuracy,
    attempts: d.attempts,
  }));

  let actionMessage = '';
  let actionText = '';
  let variant: 'default' | 'urgent' | 'success' = 'default';

  if (!hasData) {
    actionMessage = 'No consistency data yet.';
    actionText = 'Practice regularly to track your patterns.';
  } else if (scoreVariance > 30) {
    actionMessage = `Scores swing ~${scoreVariance}% between sessions. ${accuracyBoost > 5 ? `You perform ${accuracyBoost}% better in ${bestTimeOfDay} sessions.` : ''}`;
    actionText = `Schedule practice for ${timeLabels[bestTimeOfDay].split(' ')[0].toLowerCase()} sessions.`;
    variant = 'urgent';
  } else if (scoreVariance > 15) {
    actionMessage = `Moderate variance (~${scoreVariance}%). Best on ${bestDayOfWeek}s in the ${bestTimeOfDay}.`;
    actionText = 'Build a consistent daily routine to stabilize performance.';
    variant = 'default';
  } else {
    actionMessage = `Great consistency! Variance only ${scoreVariance}%. You're a reliable performer.`;
    actionText = 'Maintain your routine and keep pushing your limits.';
    variant = 'success';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-cyan-500" />
            Consistency Score
          </CardTitle>
          <CardDescription>How stable is your performance?</CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <>
              {/* Consistency score display */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Consistency Rating</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-3xl font-bold ${consistencyColor}`}>
                      {consistencyScore}
                    </span>
                    <Badge variant="outline" className={consistencyColor}>
                      {consistencyLabel}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Best Time</p>
                  <div className="flex items-center gap-1.5">
                    <TimeIcon className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium capitalize">{bestTimeOfDay}</span>
                  </div>
                </div>
              </div>

              {/* Daily activity chart */}
              <div className="h-[120px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 9 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg p-2 shadow-lg">
                              <p className="text-xs text-muted-foreground">{data.date}</p>
                              <p className="text-sm font-medium">{data.accuracy}% accuracy</p>
                              <p className="text-xs text-muted-foreground">{data.attempts} questions</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="accuracy" radius={[2, 2, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.accuracy >= 80 ? 'hsl(142, 71%, 45%)' : 
                                entry.accuracy >= 60 ? 'hsl(45, 93%, 47%)' : 
                                'hsl(0, 84%, 60%)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Time of day breakdown */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {timeOfDayStats.map(({ period, accuracy, attempts }) => {
                  const Icon = timeIcons[period as keyof typeof timeIcons];
                  const isBest = period === bestTimeOfDay;
                  return (
                    <div 
                      key={period}
                      className={`text-center p-2 rounded-lg border ${
                        isBest ? 'bg-primary/10 border-primary/30' : 'bg-muted/50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 mx-auto mb-1 ${isBest ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className={`text-lg font-bold ${isBest ? 'text-primary' : ''}`}>{accuracy}%</p>
                      <p className="text-xs text-muted-foreground">{attempts} Qs</p>
                    </div>
                  );
                })}
              </div>

              {/* Best day badge */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Best day:</span>
                <Badge variant="secondary">{bestDayOfWeek}</Badge>
              </div>

              <ActionBox
                message={actionMessage}
                action={actionText}
                variant={variant}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <Activity className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No activity data yet</p>
              <p className="text-sm text-muted-foreground/60">Practice regularly to see patterns</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
