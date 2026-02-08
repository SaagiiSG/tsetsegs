import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity } from 'lucide-react';

interface HeatmapCell {
  day: number;
  hour: number;
  count: number;
}

interface ActivityHeatmapProps {
  data: HeatmapCell[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getIntensityClass(count: number, maxCount: number): string {
  if (count === 0) return 'bg-muted/30';
  const ratio = count / maxCount;
  if (ratio > 0.75) return 'bg-cyan-500';
  if (ratio > 0.5) return 'bg-cyan-500/70';
  if (ratio > 0.25) return 'bg-cyan-500/40';
  return 'bg-cyan-500/20';
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  const getCount = (day: number, hour: number) => {
    const cell = data.find(d => d.day === day && d.hour === hour);
    return cell?.count || 0;
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 animate-fade-in" style={{ animationDelay: '150ms' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Activity Heatmap
          </CardTitle>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Last 7 days
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="min-w-[500px]">
              {/* Hour labels */}
              <div className="flex mb-1 ml-10">
                {HOURS.filter(h => h % 3 === 0).map(hour => (
                  <div 
                    key={hour} 
                    className="text-[9px] font-mono text-muted-foreground"
                    style={{ width: `${100 / 8}%`, textAlign: 'center' }}
                  >
                    {hour.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
              
              {/* Grid */}
              <div className="space-y-1">
                {DAYS.map((dayName, dayIndex) => (
                  <div key={dayName} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                      {dayName}
                    </span>
                    <div className="flex-1 flex gap-[2px]">
                      {HOURS.map(hour => {
                        const count = getCount(dayIndex, hour);
                        return (
                          <Tooltip key={`${dayIndex}-${hour}`}>
                            <TooltipTrigger asChild>
                              <div 
                                className={`
                                  flex-1 h-4 rounded-sm cursor-pointer
                                  transition-all duration-200 hover:ring-1 hover:ring-primary
                                  ${getIntensityClass(count, maxCount)}
                                `}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="font-mono text-xs">
                              <p>{dayName} {hour.toString().padStart(2, '0')}:00</p>
                              <p className="text-cyan-400 font-bold">{count} attempts</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mt-3">
                <span className="text-[9px] font-mono text-muted-foreground">Less</span>
                <div className="flex gap-[2px]">
                  <div className="w-3 h-3 rounded-sm bg-muted/30" />
                  <div className="w-3 h-3 rounded-sm bg-cyan-500/20" />
                  <div className="w-3 h-3 rounded-sm bg-cyan-500/40" />
                  <div className="w-3 h-3 rounded-sm bg-cyan-500/70" />
                  <div className="w-3 h-3 rounded-sm bg-cyan-500" />
                </div>
                <span className="text-[9px] font-mono text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
