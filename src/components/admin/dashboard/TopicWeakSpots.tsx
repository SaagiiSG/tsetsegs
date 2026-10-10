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
  if (accuracy >= 70) return 'bg-status-healthy';
  if (accuracy >= 55) return 'bg-status-watch';
  return 'bg-status-risk';
}

function getAccuracyTextColor(accuracy: number): string {
  if (accuracy >= 70) return 'text-status-healthy';
  if (accuracy >= 55) return 'text-status-watch';
  return 'text-status-risk';
}

export function TopicWeakSpots({ data }: TopicWeakSpotsProps) {
  if (data.length === 0) {
    return (
      <section className="min-w-0 border-t py-5">
        <div className="pb-4">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-watch" />
            Topic Weak Spots
          </h2>
        </div>
        <div>
          <p className="text-sm text-muted-foreground text-center py-8">
            No topic data available yet
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 border-t py-5">
      <div className="pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-watch" />
            Topic Weak Spots
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-normal">
            Lowest accuracy
          </span>
        </div>
      </div>
      <div>
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
      </div>
    </section>
  );
}
