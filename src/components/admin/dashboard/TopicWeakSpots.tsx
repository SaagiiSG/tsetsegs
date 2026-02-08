import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface TopicAccuracy {
  category: string;
  accuracy: number;
  attempts: number;
}

interface TopicWeakSpotsProps {
  data: TopicAccuracy[];
}

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 70) return 'bg-emerald-500';
  if (accuracy >= 55) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getAccuracyTextColor(accuracy: number): string {
  if (accuracy >= 70) return 'text-emerald-400';
  if (accuracy >= 55) return 'text-amber-400';
  return 'text-rose-400';
}

export function TopicWeakSpots({ data }: TopicWeakSpotsProps) {
  if (data.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Topic Weak Spots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No topic data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 animate-fade-in" style={{ animationDelay: '200ms' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Topic Weak Spots
          </CardTitle>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Lowest accuracy
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((topic, index) => (
            <div key={topic.category} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground truncate max-w-[60%]">
                  {topic.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ({topic.attempts})
                  </span>
                  <span className={`text-xs font-mono font-bold tabular-nums ${getAccuracyTextColor(topic.accuracy)}`}>
                    {topic.accuracy}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${getAccuracyColor(topic.accuracy)}`}
                  style={{ 
                    width: `${topic.accuracy}%`,
                    transitionDelay: `${index * 50}ms`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
