import { motion } from 'framer-motion';
import { TrendingDown, Layers } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { ActionBox } from './ActionBox';
import type { TopicAccuracy } from '@/hooks/useStudentAnalytics';

interface WeaknessIdentifierProps {
  topicAccuracy: TopicAccuracy[];
}

const getAccuracyColor = (accuracy: number) => {
  if (accuracy < 70) return 'hsl(0, 84%, 60%)'; // Red
  if (accuracy < 85) return 'hsl(45, 93%, 47%)'; // Yellow/Amber
  return 'hsl(142, 71%, 45%)'; // Green
};

const getAccuracyLabel = (accuracy: number) => {
  if (accuracy < 70) return 'Needs Work';
  if (accuracy < 85) return 'Improving';
  return 'Strong';
};

export function WeaknessIdentifier({ topicAccuracy }: WeaknessIdentifierProps) {
  const mathTopics = topicAccuracy.filter((t) => t.subject === 'Math');
  const englishTopics = topicAccuracy.filter((t) => t.subject === 'English');

  const chartData = topicAccuracy.map((topic) => ({
    name: topic.topicName.length > 15 
      ? topic.topicName.substring(0, 15) + '...' 
      : topic.topicName,
    fullName: topic.topicName,
    accuracy: topic.accuracy,
    attempts: topic.questionsAttempted,
  }));

  const weakestTopics = topicAccuracy.filter((t) => t.accuracy < 70).slice(0, 2);
  const actionMessage = weakestTopics.length > 0
    ? `Your weakest areas: ${weakestTopics.map((t) => `${t.topicName} (${t.accuracy}%)`).join(', ')}`
    : 'Great job! All topics are above 70% accuracy.';
  
  const actionText = weakestTopics.length > 0
    ? `Complete 20 ${weakestTopics[0].topicName} problems this week.`
    : 'Maintain your practice consistency to stay sharp.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-5 w-5 text-amber-500" />
            Weakness Identifier
          </CardTitle>
          <CardDescription>Accuracy by topic (sorted weakest first)</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg p-3 shadow-lg">
                              <p className="font-medium">{data.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                Accuracy: <span className="font-semibold">{data.accuracy}%</span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Attempts: <span className="font-semibold">{data.attempts}</span>
                              </p>
                              <p className={`text-xs mt-1 font-medium`} style={{ color: getAccuracyColor(data.accuracy) }}>
                                {getAccuracyLabel(data.accuracy)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getAccuracyColor(entry.accuracy)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
                  <span className="text-muted-foreground">&lt;70% Weak</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(45, 93%, 47%)' }} />
                  <span className="text-muted-foreground">70-85%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
                  <span className="text-muted-foreground">&gt;85%</span>
                </div>
              </div>

              <ActionBox
                message={actionMessage}
                action={actionText}
                link="/practice/dashboard"
                variant={weakestTopics.length > 0 ? 'urgent' : 'success'}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <Layers className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No topic data yet</p>
              <p className="text-sm text-muted-foreground/60">Complete some practice questions to see your performance</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
