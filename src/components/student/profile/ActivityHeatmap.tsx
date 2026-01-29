import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame, Calendar } from 'lucide-react';
import { format, parseISO, getDay, startOfWeek, addDays } from 'date-fns';
import { ActivityDay } from '@/hooks/useStudentProfile';
import { cn } from '@/lib/utils';

interface ActivityHeatmapProps {
  activityData: ActivityDay[];
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
}

const getIntensityClass = (points: number): string => {
  if (points === 0) return 'bg-muted/30';
  if (points <= 100) return 'bg-emerald-900/40';
  if (points <= 500) return 'bg-emerald-700/60';
  if (points <= 1000) return 'bg-emerald-500/80';
  return 'bg-emerald-400';
};

export function ActivityHeatmap({
  activityData,
  currentStreak,
  longestStreak,
  totalActiveDays
}: ActivityHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<ActivityDay | null>(null);

  // Organize data into weeks for grid display
  const weeks = useMemo(() => {
    if (!activityData.length) return [];

    const result: ActivityDay[][] = [];
    let currentWeek: ActivityDay[] = [];

    // Start from 365 days ago
    const firstDay = activityData[0];
    const firstDayOfWeek = getDay(parseISO(firstDay.date));
    
    // Pad the first week if needed
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', points: -1, sessionsCount: 0 });
    }

    activityData.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    // Pad the last week if needed
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', points: -1, sessionsCount: 0 });
      }
      result.push(currentWeek);
    }

    return result;
  }, [activityData]);

  const months = useMemo(() => {
    const result: { label: string; colStart: number }[] = [];
    let lastMonth = '';
    
    weeks.forEach((week, weekIdx) => {
      const firstValidDay = week.find(d => d.date);
      if (firstValidDay) {
        const month = format(parseISO(firstValidDay.date), 'MMM');
        if (month !== lastMonth) {
          result.push({ label: month, colStart: weekIdx });
          lastMonth = month;
        }
      }
    });

    return result;
  }, [weeks]);

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Activity
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-bold">{currentStreak}</span>
              <span className="text-muted-foreground">day streak</span>
            </div>
            <div className="text-muted-foreground">
              Best: <span className="font-bold text-foreground">{longestStreak}</span> days
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Month labels */}
        <div className="relative h-4 mb-1 overflow-hidden">
          {months.map((month, idx) => (
            <span
              key={idx}
              className="absolute text-xs text-muted-foreground"
              style={{ left: `${(month.colStart / weeks.length) * 100}%` }}
            >
              {month.label}
            </span>
          ))}
        </div>

        {/* Heatmap grid */}
        <TooltipProvider delayDuration={100}>
          <div className="flex gap-[2px] overflow-x-auto pb-2">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[2px]">
                {week.map((day, dayIdx) => (
                  <Tooltip key={dayIdx}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'w-2.5 h-2.5 rounded-sm transition-all cursor-pointer hover:ring-1 hover:ring-primary',
                          day.points < 0 ? 'bg-transparent' : getIntensityClass(day.points)
                        )}
                        onMouseEnter={() => day.points >= 0 && setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                      />
                    </TooltipTrigger>
                    {day.date && day.points >= 0 && (
                      <TooltipContent className="text-xs">
                        <p className="font-semibold">{format(parseISO(day.date), 'MMMM d, yyyy')}</p>
                        <p>{day.points.toLocaleString()} pts</p>
                        {day.sessionsCount > 0 && (
                          <p className="text-muted-foreground">{day.sessionsCount} sessions</p>
                        )}
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-between mt-3 text-xs">
          <span className="text-muted-foreground">
            {totalActiveDays} active days in the past year
          </span>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Less</span>
            <div className="w-2.5 h-2.5 rounded-sm bg-muted/30" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-900/40" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-700/60" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            <span className="text-muted-foreground">More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
