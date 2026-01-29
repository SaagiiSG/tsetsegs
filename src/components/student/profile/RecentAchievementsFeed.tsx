import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, ChevronRight } from 'lucide-react';
import { RecentAchievement } from '@/hooks/useStudentProfile';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface RecentAchievementsFeedProps {
  achievements: RecentAchievement[];
}

const getAchievementStyle = (type: RecentAchievement['type']) => {
  switch (type) {
    case 'badge_earned':
      return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    case 'rank_up':
      return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    case 'streak_milestone':
      return { bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
    case 'completion':
      return { bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
    default:
      return { bg: 'bg-muted/30', border: 'border-border' };
  }
};

export function RecentAchievementsFeed({ achievements }: RecentAchievementsFeedProps) {
  const navigate = useNavigate();

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Recent Achievements
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 text-xs"
            onClick={() => navigate('/practice/badges')}
          >
            View all <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {achievements.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Start practicing to earn achievements!
          </div>
        ) : (
          <div className="space-y-2">
            {achievements.slice(0, 6).map((achievement) => {
              const style = getAchievementStyle(achievement.type);
              return (
                <div
                  key={achievement.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${style.bg} ${style.border} transition-colors hover:bg-muted/40 cursor-pointer`}
                >
                  <span className="text-xl">{achievement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(achievement.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  {achievement.pointsAwarded > 0 && (
                    <span className="text-sm font-semibold text-primary">
                      +{achievement.pointsAwarded.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
