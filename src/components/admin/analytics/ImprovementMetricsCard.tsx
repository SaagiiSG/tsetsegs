import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Award, Target, Users } from 'lucide-react';
import { useImprovementMetrics } from '@/hooks/useAdminAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

export function ImprovementMetricsCard() {
  const { data: metrics, isLoading } = useImprovementMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Improvement Metrics</CardTitle>
        </div>
        <CardDescription>
          Focus on student growth and progress over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Avg Score Improvement */}
          <div className="p-4 rounded-lg bg-background border">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                +{metrics?.avgImprovement || 0}pts
              </Badge>
            </div>
            <p className="text-2xl font-bold">{metrics?.avgScoreImprovement || 0}%</p>
            <p className="text-xs text-muted-foreground">Avg Score Improvement</p>
            <p className="text-xs text-muted-foreground mt-1">First mock → Latest</p>
          </div>

          {/* Students Improving */}
          <div className="p-4 rounded-lg bg-background border">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                {metrics?.improvingPercent || 0}%
              </Badge>
            </div>
            <p className="text-2xl font-bold">{metrics?.studentsImproving || 0}</p>
            <p className="text-xs text-muted-foreground">Students Improving</p>
            <p className="text-xs text-muted-foreground mt-1">of {metrics?.totalStudents || 0} active</p>
          </div>

          {/* Class Progress */}
          <div className="p-4 rounded-lg bg-background border">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-4 w-4 text-purple-500" />
              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                Session {metrics?.currentSession || 0}
              </Badge>
            </div>
            <p className="text-2xl font-bold">{metrics?.classProgress || 0}%</p>
            <p className="text-xs text-muted-foreground">Class Progress</p>
            <p className="text-xs text-muted-foreground mt-1">of curriculum complete</p>
          </div>

          {/* Top Improver */}
          <div className="p-4 rounded-lg bg-background border">
            <div className="flex items-center justify-between mb-2">
              <Award className="h-4 w-4 text-yellow-500" />
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                🏆 Top
              </Badge>
            </div>
            <p className="text-lg font-bold truncate">{metrics?.topImprover?.name || '-'}</p>
            <p className="text-xs text-muted-foreground">Most Improved</p>
            <p className="text-xs text-green-500 mt-1">+{metrics?.topImprover?.improvement || 0} points</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
