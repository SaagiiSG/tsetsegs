import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  ComposedChart, Bar, Line, ReferenceLine
} from 'recharts';
import { TrendingUp, Award, Calendar, AlertTriangle } from 'lucide-react';
import { useProgressTimelineData } from '@/hooks/useAdminAnalytics';

interface ProgressTimelineSubTabProps {
  studentId: string;
}

export function ProgressTimelineSubTab({ studentId }: ProgressTimelineSubTabProps) {
  const [showClassAvg, setShowClassAvg] = useState(false);
  const { data, isLoading } = useProgressTimelineData(studentId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-80" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Main Progress Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>60-Day Progress</CardTitle>
                <CardDescription>Accuracy trend and practice frequency</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show class avg</span>
              <Switch checked={showClassAvg} onCheckedChange={setShowClassAvg} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.chartData}>
                <defs>
                  <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  domain={[0, 100]} 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => `${val}%`}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 'auto']}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                
                {/* Practice frequency bars */}
                <Bar 
                  yAxisId="right"
                  dataKey="questions" 
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.3}
                  radius={[2, 2, 0, 0]}
                />

                {/* Accuracy trend */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="accuracy"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorAccuracy)"
                  strokeWidth={2}
                />

                {/* Class average line */}
                {showClassAvg && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="classAvg"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    dot={false}
                  />
                )}

                {/* Milestone markers */}
                {data.milestones.map((milestone, i) => (
                  <ReferenceLine
                    key={i}
                    yAxisId="left"
                    x={milestone.date}
                    stroke={milestone.type === 'badge' ? '#eab308' : milestone.type === 'rank' ? '#22c55e' : '#ef4444'}
                    strokeDasharray="3 3"
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>Accuracy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted-foreground/30" />
              <span>Questions</span>
            </div>
            {showClassAvg && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-0 border border-dashed border-muted-foreground" />
                <span>Class Avg</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Milestones Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            <CardTitle>Milestones</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            {/* Milestone items */}
            <div className="space-y-4">
              {data.milestones.map((milestone, index) => (
                <div key={index} className="flex items-start gap-4 pl-2">
                  <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center ${
                    milestone.type === 'badge' ? 'bg-yellow-500/20' :
                    milestone.type === 'rank' ? 'bg-green-500/20' :
                    milestone.type === 'streak' ? 'bg-orange-500/20' : 'bg-destructive/20'
                  }`}>
                    {milestone.type === 'badge' && <Award className="h-4 w-4 text-yellow-500" />}
                    {milestone.type === 'rank' && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {milestone.type === 'streak' && <Calendar className="h-4 w-4 text-orange-500" />}
                    {milestone.type === 'absence' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{milestone.title}</p>
                      <Badge variant="secondary" className="text-xs">{milestone.date}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Starting Accuracy</p>
            <p className="text-2xl font-bold">{data.summary.startingAccuracy}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Current Accuracy</p>
            <p className="text-2xl font-bold text-green-500">{data.summary.currentAccuracy}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Improvement</p>
            <p className="text-2xl font-bold text-primary">+{data.summary.improvement}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active Days</p>
            <p className="text-2xl font-bold">{data.summary.activeDays}/60</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
