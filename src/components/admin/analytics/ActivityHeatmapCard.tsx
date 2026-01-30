import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivityHeatmap } from '@/hooks/useAdminAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ActivityHeatmapCard() {
  const { data, isLoading } = useActivityHeatmap();

  const getIntensityClass = (count: number, max: number) => {
    if (count === 0) return 'bg-muted';
    const ratio = count / max;
    if (ratio > 0.75) return 'bg-primary';
    if (ratio > 0.5) return 'bg-primary/70';
    if (ratio > 0.25) return 'bg-primary/40';
    return 'bg-primary/20';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[120px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const maxActivity = Math.max(...(data?.days?.map(d => d.count) || [1]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>Activity Heatmap</CardTitle>
        </div>
        <CardDescription>
          Platform activity over the last 12 weeks
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Week labels */}
        <div className="flex gap-1 mb-2 text-xs text-muted-foreground">
          <div className="w-8"></div>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="flex-1 text-center text-[10px]">{day}</div>
          ))}
        </div>

        {/* Heatmap Grid */}
        <div className="space-y-1">
          {data?.weeks?.map((week, weekIndex) => (
            <div key={weekIndex} className="flex gap-1 items-center">
              <div className="w-8 text-[10px] text-muted-foreground">
                {week.label}
              </div>
              {week.days.map((day, dayIndex) => (
                <Tooltip key={dayIndex}>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex-1 aspect-square rounded-sm cursor-pointer transition-colors hover:ring-1 hover:ring-primary ${getIntensityClass(day.count, maxActivity)}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{day.date}</p>
                    <p className="text-xs">{day.count} questions attempted</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
          <span className="text-xs text-muted-foreground">Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <div className="w-3 h-3 rounded-sm bg-primary/20" />
            <div className="w-3 h-3 rounded-sm bg-primary/40" />
            <div className="w-3 h-3 rounded-sm bg-primary/70" />
            <div className="w-3 h-3 rounded-sm bg-primary" />
          </div>
          <span className="text-xs text-muted-foreground">More</span>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold text-green-500">{data?.stats?.streak || 0}</p>
            <p className="text-[10px] text-muted-foreground">Current Streak</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{data?.stats?.peakDay || '-'}</p>
            <p className="text-[10px] text-muted-foreground">Most Active</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{data?.stats?.avgDaily || 0}</p>
            <p className="text-[10px] text-muted-foreground">Avg Daily Qs</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
