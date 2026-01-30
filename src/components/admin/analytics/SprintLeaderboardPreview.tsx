import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Crown, ChevronRight, Flame } from 'lucide-react';
import { useSprintLeaderboardPreview } from '@/hooks/useAdminAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

const tierColors: Record<string, string> = {
  ruby: 'bg-red-500',
  diamond: 'bg-cyan-400',
  gold: 'bg-yellow-500',
  silver: 'bg-gray-400',
  bronze: 'bg-amber-600',
};

const tierBadgeColors: Record<string, string> = {
  ruby: 'bg-red-500/10 text-red-500 border-red-500/20',
  diamond: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  gold: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  silver: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  bronze: 'bg-amber-600/10 text-amber-600 border-amber-600/20',
};

export function SprintLeaderboardPreview() {
  const { data, isLoading } = useSprintLeaderboardPreview();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle>Sprint Leaderboard</CardTitle>
          </div>
          {data?.sprint && (
            <Badge variant="outline" className="gap-1">
              <Flame className="h-3 w-3" />
              Sprint {data.sprint.number}
            </Badge>
          )}
        </div>
        <CardDescription>
          {data?.sprint?.daysRemaining !== undefined 
            ? `${data.sprint.daysRemaining} days remaining in current sprint`
            : 'No active sprint'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Top 3 */}
        {data?.topStudents?.slice(0, 3).map((student, index) => (
          <div
            key={student.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              index === 0 ? 'bg-yellow-500/5 border-yellow-500/20' : ''
            }`}
          >
            <div className="relative">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${tierColors[student.tier] || 'bg-muted'}`}>
                {student.initials}
              </div>
              {index === 0 && (
                <Crown className="absolute -top-2 -right-1 h-4 w-4 text-yellow-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{student.name}</p>
                <Badge variant="outline" className={`text-[10px] ${tierBadgeColors[student.tier] || ''}`}>
                  {student.tier}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{student.batchName}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{student.points.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">points</p>
            </div>
          </div>
        ))}

        {/* Tier Distribution */}
        {data?.tierDistribution && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Tier Distribution</p>
          <div className="flex gap-1 h-3 rounded-full overflow-hidden">
              {Object.entries(data.tierDistribution).map(([tier, count]) => (
                <div
                  key={tier}
                  className={`${tierColors[tier] || 'bg-muted'}`}
                  style={{ flex: count as number }}
                  title={`${tier}: ${count} students`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {Object.entries(data.tierDistribution).map(([tier, count]) => (
                <div key={tier} className="text-center">
                  <p className="text-xs font-medium capitalize">{tier}</p>
                  <p className="text-[10px] text-muted-foreground">{count as number}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!data?.topStudents || data.topStudents.length === 0) && (
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No sprint data available</p>
          </div>
        )}

        <Button 
          variant="outline" 
          className="w-full gap-2 mt-2"
          onClick={() => navigate('/admin/sprint-monitor')}
        >
          View Full Leaderboard
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
