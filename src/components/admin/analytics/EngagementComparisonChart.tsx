import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar
} from 'recharts';
import { TrendingUp, Download } from 'lucide-react';
import { useEngagementComparisonData } from '@/hooks/useAdminAnalytics';

interface EngagementComparisonChartProps {
  selectedBatchIds: string[];
}

const COLORS = ['hsl(var(--primary))', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'];

export function EngagementComparisonChart({ selectedBatchIds }: EngagementComparisonChartProps) {
  const { data, isLoading } = useEngagementComparisonData(selectedBatchIds);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || selectedBatchIds.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select at least 2 classes to compare engagement
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Engagement Comparison</CardTitle>
              <CardDescription>30-day activity trends by class</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* DAU Trend */}
        <div>
          <h4 className="text-sm font-medium mb-3">Daily Active Users</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dauTrend}>
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
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend />
                {data.classes.map((cls, index) => (
                  <Line
                    key={cls.id}
                    type="monotone"
                    dataKey={cls.id}
                    name={cls.name}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Sessions */}
        <div>
          <h4 className="text-sm font-medium mb-3">Weekly Sessions by Class</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyData}>
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
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
                <Legend />
                {data.classes.map((cls, index) => (
                  <Bar
                    key={cls.id}
                    dataKey={cls.id}
                    name={cls.name}
                    fill={COLORS[index % COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.classes.map((cls, index) => (
            <div key={cls.id} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs font-medium truncate">{cls.name}</span>
              </div>
              <p className="text-lg font-bold">{cls.avgDau}</p>
              <p className="text-xs text-muted-foreground">avg DAU</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
