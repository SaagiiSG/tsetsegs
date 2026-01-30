import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTopicStruggleData } from '@/hooks/useAdminAnalytics';
import { AlertTriangle } from 'lucide-react';

export function TopicStruggleHeatmap() {
  const { data: topics, isLoading } = useTopicStruggleData();

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy < 50) return 'bg-red-600 text-white';
    if (accuracy < 60) return 'bg-red-400 text-white';
    if (accuracy < 70) return 'bg-yellow-400 text-yellow-900';
    if (accuracy < 80) return 'bg-green-300 text-green-900';
    return 'bg-green-500 text-white';
  };

  const getTimeColor = (avgTime: number, expectedTime: number) => {
    const ratio = avgTime / expectedTime;
    if (ratio > 1.5) return 'text-red-500';
    if (ratio > 1.2) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Topic Struggle Analysis</CardTitle>
        <CardDescription>
          Performance by SAT topic category
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Topic</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">Acc %</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">Attempts</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Avg Time</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">Struggling</th>
              </tr>
            </thead>
            <tbody>
              {topics?.map((topic) => (
                <tr 
                  key={topic.id} 
                  className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{topic.name}</span>
                      {topic.avgAccuracy < 70 && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">
                          Action Needed
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="text-center py-2 px-2">
                    <span className={`inline-flex items-center justify-center w-12 h-7 rounded text-xs font-medium ${getAccuracyColor(topic.avgAccuracy)}`}>
                      {topic.avgAccuracy}%
                    </span>
                  </td>
                  <td className="text-center py-2 px-2 hidden sm:table-cell text-muted-foreground">
                    {topic.totalAttempts.toLocaleString()}
                  </td>
                  <td className={`text-center py-2 px-2 hidden md:table-cell ${getTimeColor(topic.avgTime, topic.expectedTime)}`}>
                    {topic.avgTime}s
                  </td>
                  <td className="text-center py-2 px-2">
                    <div className="flex items-center justify-center gap-1">
                      {topic.strugglingCount > 0 && (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      )}
                      <span className={topic.strugglingCount > 5 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                        {topic.strugglingCount}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
