import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  HelpCircle, Clock, Trophy, Flame, TrendingUp, TrendingDown,
  Check, X, BookOpen, Award, LogIn
} from 'lucide-react';
import { useStudentOverviewStats } from '@/hooks/useAdminAnalytics';
import { formatDistanceToNow } from 'date-fns';

interface StudentOverviewSubTabProps {
  studentId: string;
}

export function StudentOverviewSubTab({ studentId }: StudentOverviewSubTabProps) {
  const { data: stats, isLoading } = useStudentOverviewStats(studentId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Questions Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Questions</CardTitle>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-bold">{stats.questions.attempted}</p>
              <p className="text-xs text-muted-foreground">Questions attempted</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="font-medium">{stats.questions.accuracy}%</span>
                <span className="text-muted-foreground ml-1">accuracy</span>
                {stats.questions.accuracyTrend > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500 inline ml-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive inline ml-1" />
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              1st attempt: {stats.questions.firstAttemptAcc}%
            </div>
            <div className="text-xs">
              <span className="text-green-500">+{stats.questions.improvement}%</span>
              <span className="text-muted-foreground ml-1">this month</span>
            </div>
            {/* Mini chart */}
            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.questions.chartData}>
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Time Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-bold">{stats.time.totalHours}h</p>
              <p className="text-xs text-muted-foreground">Total practice time</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="font-medium">{stats.time.avgSessionMins}m</span>
                <span className="text-muted-foreground ml-1">avg session</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Sessions this week: {stats.time.sessionsThisWeek}
              <span className={stats.time.sessionsTrend > 0 ? 'text-green-500 ml-1' : 'text-destructive ml-1'}>
                ({stats.time.sessionsTrend > 0 ? '+' : ''}{stats.time.sessionsTrend}%)
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Most active: {stats.time.mostActiveTime}
            </div>
            {/* Activity heatmap placeholder */}
            <div className="grid grid-cols-7 gap-0.5">
              {stats.time.heatmapData.map((val, i) => (
                <div
                  key={i}
                  className="h-3 rounded-sm"
                  style={{
                    backgroundColor: `hsl(var(--primary) / ${Math.max(0.1, val / 100)})`,
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sprint Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Sprint</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{stats.sprint.tier}</p>
              <Badge className={
                stats.sprint.promotionStatus === 'advancing' 
                  ? 'bg-green-500/10 text-green-500' 
                  : stats.sprint.promotionStatus === 'at_risk'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-blue-500/10 text-blue-500'
              }>
                {stats.sprint.promotionStatus === 'advancing' ? 'ADVANCING' : 
                 stats.sprint.promotionStatus === 'at_risk' ? 'AT RISK' : 'SAFE'}
              </Badge>
            </div>
            <div className="text-sm">
              <span className="font-medium">{stats.sprint.points}</span>
              <span className="text-muted-foreground ml-1">points</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Position: #{stats.sprint.position} of {stats.sprint.totalInTier}
            </div>
            <div className="text-xs">
              {stats.sprint.pointsToAdvance > 0 ? (
                <span className="text-yellow-500">{stats.sprint.pointsToAdvance} pts to advance</span>
              ) : (
                <span className="text-green-500">On track to advance!</span>
              )}
            </div>
            {/* Mini points chart */}
            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.sprint.chartData}>
                  <Area
                    type="monotone"
                    dataKey="points"
                    stroke="#eab308"
                    fill="#eab308"
                    fillOpacity={0.2}
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{stats.engagement.currentStreak}</p>
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground">day streak</p>
            <div className="text-sm">
              <span className="text-muted-foreground">Longest: </span>
              <span className="font-medium">{stats.engagement.longestStreak} days</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Last login: </span>
              <span className="font-medium">{stats.engagement.daysSinceLogin}d ago</span>
            </div>
            <Badge className={
              stats.engagement.riskLevel === 'low'
                ? 'bg-green-500/10 text-green-500'
                : stats.engagement.riskLevel === 'medium'
                ? 'bg-yellow-500/10 text-yellow-500'
                : 'bg-destructive/10 text-destructive'
            }>
              {stats.engagement.riskLevel} risk
              {stats.engagement.riskTrend === 'up' && <TrendingUp className="h-3 w-3 ml-1 inline" />}
              {stats.engagement.riskTrend === 'down' && <TrendingDown className="h-3 w-3 ml-1 inline" />}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 10 activities</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-4">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    activity.type === 'correct' ? 'bg-green-500/10' :
                    activity.type === 'incorrect' ? 'bg-destructive/10' :
                    activity.type === 'badge' ? 'bg-yellow-500/10' :
                    activity.type === 'login' ? 'bg-blue-500/10' : 'bg-muted'
                  }`}>
                    {activity.type === 'correct' && <Check className="h-4 w-4 text-green-500" />}
                    {activity.type === 'incorrect' && <X className="h-4 w-4 text-destructive" />}
                    {activity.type === 'badge' && <Award className="h-4 w-4 text-yellow-500" />}
                    {activity.type === 'login' && <LogIn className="h-4 w-4 text-blue-500" />}
                    {activity.type === 'practice' && <BookOpen className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
