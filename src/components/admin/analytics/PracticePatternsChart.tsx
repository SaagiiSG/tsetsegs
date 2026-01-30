import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usePracticePatterns } from '@/hooks/useAdminAnalytics';
import { Download, TrendingUp, Users, Clock, Award } from 'lucide-react';

type TimeRange = '7' | '14' | '30' | '90';

export function PracticePatternsChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30');
  const [visibleLines, setVisibleLines] = useState({
    dau: true,
    questions: true,
    sessionMins: true,
    badges: false,
  });

  const { data, isLoading } = usePracticePatterns(parseInt(timeRange));

  const toggleLine = (key: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Practice Patterns</CardTitle>
            <CardDescription>Activity trends over time</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md">
              {(['7', '14', '30', '90'] as TimeRange[]).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'secondary' : 'ghost'}
                  size="sm"
                  className="px-2 h-7 text-xs"
                  onClick={() => setTimeRange(range)}
                >
                  {range}d
                </Button>
              ))}
            </div>
            <Button variant="outline" size="icon" className="h-7 w-7">
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle Buttons */}
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={visibleLines.dau ? 'default' : 'outline'} 
            className="cursor-pointer"
            onClick={() => toggleLine('dau')}
          >
            <Users className="h-3 w-3 mr-1" />
            DAU
          </Badge>
          <Badge 
            variant={visibleLines.questions ? 'default' : 'outline'} 
            className="cursor-pointer bg-green-500"
            onClick={() => toggleLine('questions')}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Questions
          </Badge>
          <Badge 
            variant={visibleLines.sessionMins ? 'default' : 'outline'} 
            className="cursor-pointer bg-purple-500"
            onClick={() => toggleLine('sessionMins')}
          >
            <Clock className="h-3 w-3 mr-1" />
            Session
          </Badge>
          <Badge 
            variant={visibleLines.badges ? 'default' : 'outline'} 
            className="cursor-pointer bg-orange-500"
            onClick={() => toggleLine('badges')}
          >
            <Award className="h-3 w-3 mr-1" />
            Badges
          </Badge>
        </div>

        {/* Chart */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.chartData}>
              <defs>
                <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSession" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              {visibleLines.dau && (
                <Area
                  type="monotone"
                  dataKey="dau"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorDau)"
                  strokeWidth={2}
                />
              )}
              {visibleLines.questions && (
                <Area
                  type="monotone"
                  dataKey="questions"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorQuestions)"
                  strokeWidth={2}
                />
              )}
              {visibleLines.sessionMins && (
                <Area
                  type="monotone"
                  dataKey="sessionMins"
                  stroke="#a855f7"
                  fillOpacity={1}
                  fill="url(#colorSession)"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded-md bg-muted/50">
            <p className="text-muted-foreground">Peak Day</p>
            <p className="font-semibold">{data?.stats?.peakDay || '-'}</p>
          </div>
          <div className="p-2 rounded-md bg-muted/50">
            <p className="text-muted-foreground">Avg DAU</p>
            <p className="font-semibold">{data?.stats?.avgDau || '-'}</p>
          </div>
          <div className="p-2 rounded-md bg-muted/50">
            <p className="text-muted-foreground">Sessions/User</p>
            <p className="font-semibold">{data?.stats?.sessionsPerUser || '-'}</p>
          </div>
          <div className="p-2 rounded-md bg-muted/50">
            <p className="text-muted-foreground">Anomalies</p>
            <p className="font-semibold">{data?.stats?.anomalies || 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
