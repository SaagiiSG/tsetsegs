import { motion } from 'framer-motion';
import { PieChart as PieChartIcon, AlertTriangle, Brain, Timer, MousePointer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ActionBox } from './ActionBox';
import type { ErrorPatterns } from '@/hooks/useStudentAnalytics';

interface ErrorPatternTrackerProps {
  errorPatterns: ErrorPatterns;
}

const errorTypes = [
  { key: 'careless', label: 'Careless', icon: AlertTriangle, color: 'hsl(0, 84%, 60%)' },
  { key: 'conceptual', label: 'Conceptual', icon: Brain, color: 'hsl(220, 90%, 56%)' },
  { key: 'timePressure', label: 'Time Pressure', icon: Timer, color: 'hsl(45, 93%, 47%)' },
  { key: 'trapAnswers', label: 'Trap Answers', icon: MousePointer, color: 'hsl(280, 65%, 60%)' },
];

export function ErrorPatternTracker({ errorPatterns }: ErrorPatternTrackerProps) {
  const chartData = errorTypes.map(({ key, label, color }) => ({
    name: label,
    value: errorPatterns[key as keyof ErrorPatterns],
    color,
  })).filter((d) => d.value > 0);

  const hasData = chartData.length > 0;
  
  // Find dominant error type
  const dominantError = errorTypes.reduce((max, curr) => {
    const currValue = errorPatterns[curr.key as keyof ErrorPatterns];
    const maxValue = errorPatterns[max.key as keyof ErrorPatterns];
    return currValue > maxValue ? curr : max;
  }, errorTypes[0]);

  const dominantValue = errorPatterns[dominantError.key as keyof ErrorPatterns];

  const getActionForErrorType = (type: string): { message: string; action: string } => {
    switch (type) {
      case 'careless':
        return {
          message: `${dominantValue}% of mistakes are CARELESS errors.`,
          action: 'Review each wrong answer for 30 seconds. Use scratch paper. Double-check easy questions.',
        };
      case 'conceptual':
        return {
          message: `${dominantValue}% of mistakes are CONCEPTUAL gaps.`,
          action: 'Watch video explanations for missed topics. Practice similar problem types.',
        };
      case 'timePressure':
        return {
          message: `${dominantValue}% of mistakes are from TIME PRESSURE.`,
          action: 'Practice timed sessions. Skip hard questions and come back to them.',
        };
      case 'trapAnswers':
        return {
          message: `${dominantValue}% of mistakes are falling for TRAP ANSWERS.`,
          action: 'Read all answer choices carefully. Eliminate obviously wrong answers first.',
        };
      default:
        return {
          message: 'Keep practicing to identify error patterns.',
          action: 'Focus on accuracy before speed.',
        };
    }
  };

  const actionContent = hasData 
    ? getActionForErrorType(dominantError.key)
    : { message: 'No error patterns detected yet.', action: 'Start practicing to track your mistakes.' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="h-5 w-5 text-orange-500" />
            Error Pattern Tracker
          </CardTitle>
          <CardDescription>Understanding why you miss questions</CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <>
              <div className="flex items-center gap-4">
                <div className="h-[160px] w-[160px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border rounded-lg p-2 shadow-lg">
                                <p className="font-medium text-sm">{data.name}</p>
                                <p className="text-sm text-muted-foreground">{data.value}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-2">
                  {errorTypes.map(({ key, label, icon: Icon, color }) => {
                    const value = errorPatterns[key as keyof ErrorPatterns];
                    if (value === 0) return null;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: color }}
                        />
                        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm flex-1">{label}</span>
                        <span className="text-sm font-semibold">{value}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <ActionBox
                message={actionContent.message}
                action={actionContent.action}
                variant={dominantError.key === 'careless' ? 'urgent' : 'default'}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <PieChartIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No error patterns yet</p>
              <p className="text-sm text-muted-foreground/60">Make some mistakes to see your patterns 😅</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
