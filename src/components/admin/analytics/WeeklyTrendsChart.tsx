import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWeeklyTrends } from '@/hooks/useAdminAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

export function WeeklyTrendsChart() {
  const [metric, setMetric] = useState<'accuracy' | 'questions' | 'sessions'>('accuracy');
  const { data, isLoading } = useWeeklyTrends();

  const getMetricConfig = () => {
    switch (metric) {
      case 'accuracy':
        return { key: 'accuracy', color: 'hsl(var(--primary))', label: 'Avg Accuracy %' };
      case 'questions':
        return { key: 'questions', color: 'hsl(142, 76%, 36%)', label: 'Questions Attempted' };
      case 'sessions':
        return { key: 'sessions', color: 'hsl(262, 83%, 58%)', label: 'Active Sessions' };
    }
  };

  const config = getMetricConfig();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Weekly Trends</CardTitle>
          </div>
          <Tabs value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <CardDescription>
          Last 8 weeks performance overview
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            {metric === 'accuracy' ? (
              <AreaChart data={data?.weeks || []}>
                <defs>
                  <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 100]} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area
                  type="monotone"
                  dataKey={config.key}
                  stroke={config.color}
                  strokeWidth={2}
                  fill="url(#accuracyGradient)"
                  name={config.label}
                />
              </AreaChart>
            ) : (
              <BarChart data={data?.weeks || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar
                  dataKey={config.key}
                  fill={config.color}
                  radius={[4, 4, 0, 0]}
                  name={config.label}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{data?.avgAccuracy || 0}%</p>
            <p className="text-xs text-muted-foreground">Avg Accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{data?.totalQuestions?.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">Total Questions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{data?.activeDays || 0}</p>
            <p className="text-xs text-muted-foreground">Active Days</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
