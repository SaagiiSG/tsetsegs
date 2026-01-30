import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react';
import { useOverviewMetrics } from '@/hooks/useAdminAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

export function PlatformHealthCard() {
  const { data: metrics, isLoading } = useOverviewMetrics();

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthScore = metrics?.healthScore ?? 0;
  const trend = metrics?.trend ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Platform Health</CardTitle>
          </div>
          {healthScore < 70 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Engagement Declining
            </Badge>
          )}
        </div>
        <CardDescription>
          Overall platform engagement and performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {/* Circular Progress */}
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(healthScore / 100) * 352} 352`}
                strokeLinecap="round"
                className={getHealthColor(healthScore)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${getHealthColor(healthScore)}`}>
                {healthScore}
              </span>
              <span className="text-xs text-muted-foreground">Score</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Daily Active Users</p>
              <p className="text-2xl font-bold">{metrics?.dau ?? '-'}</p>
              <p className="text-xs text-muted-foreground">
                {metrics?.dauPercent ?? 0}% of total
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Avg Session</p>
              <p className="text-2xl font-bold">{metrics?.avgSessionMins ?? '-'}m</p>
              <p className="text-xs text-muted-foreground">
                Target: 30m
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Completion Rate</p>
              <p className="text-2xl font-bold">{metrics?.completionRate ?? '-'}%</p>
              <p className="text-xs text-muted-foreground">
                Questions finished
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Questions/Day</p>
              <p className="text-2xl font-bold">{metrics?.questionsPerDay ?? '-'}</p>
              <div className="flex items-center gap-1 text-xs">
                {trend > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={trend > 0 ? 'text-green-500' : 'text-destructive'}>
                  {Math.abs(trend)}% vs last week
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
