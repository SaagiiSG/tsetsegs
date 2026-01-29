import { motion } from 'framer-motion';
import { Clock, Zap, Snail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Cell } from 'recharts';
import { ActionBox } from './ActionBox';
import type { TopicAccuracy } from '@/hooks/useStudentAnalytics';

interface TimeEfficiencyDashboardProps {
  topicAccuracy: TopicAccuracy[];
}

export function TimeEfficiencyDashboard({ topicAccuracy }: TimeEfficiencyDashboardProps) {
  const chartData = topicAccuracy.map((topic) => ({
    name: topic.topicName.length > 12 
      ? topic.topicName.substring(0, 12) + '...' 
      : topic.topicName,
    fullName: topic.topicName,
    yourTime: topic.averageTime,
    targetTime: topic.optimalTime,
    accuracy: topic.accuracy,
  }));

  // Identify slow and rushing topics
  const slowTopics = topicAccuracy.filter(
    (t) => t.averageTime > t.optimalTime * 2 && t.averageTime > 0
  );
  const rushingTopics = topicAccuracy.filter(
    (t) => t.averageTime < t.optimalTime * 0.5 && t.accuracy < 70 && t.averageTime > 0
  );

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  };

  let actionMessage = '';
  let actionText = '';

  if (slowTopics.length > 0 && rushingTopics.length > 0) {
    actionMessage = `You're slow on ${slowTopics[0].topicName} (${formatTime(slowTopics[0].averageTime)} vs ${formatTime(slowTopics[0].optimalTime)}) and rushing on ${rushingTopics[0].topicName}.`;
    actionText = `Slow down on ${rushingTopics[0].topicName}, speed up on ${slowTopics[0].topicName}.`;
  } else if (slowTopics.length > 0) {
    actionMessage = `You're spending ${formatTime(slowTopics[0].averageTime)} on ${slowTopics[0].topicName} (target: ${formatTime(slowTopics[0].optimalTime)}).`;
    actionText = 'Practice more problems to build speed without sacrificing accuracy.';
  } else if (rushingTopics.length > 0) {
    actionMessage = `You're rushing ${rushingTopics[0].topicName} (${formatTime(rushingTopics[0].averageTime)} avg but ${rushingTopics[0].accuracy}% accuracy).`;
    actionText = 'Slow down and read questions more carefully.';
  } else {
    actionMessage = 'Your timing is well-balanced across all topics!';
    actionText = 'Keep practicing to maintain your pace.';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-blue-500" />
            Time Efficiency
          </CardTitle>
          <CardDescription>Your time vs optimal time per topic</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.some((d) => d.yourTime > 0) ? (
            <>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.filter((d) => d.yourTime > 0)}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  >
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tickFormatter={(v) => `${v}s`} tick={{ fontSize: 10 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const diff = data.yourTime - data.targetTime;
                          return (
                            <div className="bg-popover border rounded-lg p-3 shadow-lg">
                              <p className="font-medium text-sm">{data.fullName}</p>
                              <p className="text-xs text-muted-foreground">
                                Your time: <span className="font-semibold">{formatTime(data.yourTime)}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Target: <span className="font-semibold">{formatTime(data.targetTime)}</span>
                              </p>
                              <p className={`text-xs font-medium ${diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {diff > 0 ? `+${formatTime(diff)} slower` : `${formatTime(Math.abs(diff))} faster`}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar 
                      dataKey="yourTime" 
                      name="Your Time" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="targetTime" 
                      name="Target" 
                      fill="hsl(var(--muted-foreground))"
                      radius={[4, 4, 0, 0]}
                      opacity={0.5}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Alerts */}
              <div className="flex flex-wrap gap-2 mt-3">
                {slowTopics.slice(0, 2).map((topic) => (
                  <Badge key={topic.topicName} variant="destructive" className="gap-1">
                    <Snail className="h-3 w-3" />
                    {topic.topicName.substring(0, 10)}... too slow
                  </Badge>
                ))}
                {rushingTopics.slice(0, 2).map((topic) => (
                  <Badge key={topic.topicName} variant="secondary" className="gap-1 bg-amber-500/20 text-amber-600">
                    <Zap className="h-3 w-3" />
                    {topic.topicName.substring(0, 10)}... rushing
                  </Badge>
                ))}
              </div>

              <ActionBox
                message={actionMessage}
                action={actionText}
                variant={slowTopics.length > 0 || rushingTopics.length > 0 ? 'default' : 'success'}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <Clock className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No timing data yet</p>
              <p className="text-sm text-muted-foreground/60">Time tracking starts when you practice</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
