import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Trophy, Target, Zap, Award, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TIER_COLORS, TIER_DISPLAY_NAMES, TierType, calculateLevel } from '@/data/badgeDefinitions';
import { LeaderboardEntry } from '@/hooks/useLeaderboard';

interface StudentProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: LeaderboardEntry | null;
  sprintId: string | null;
}

export function StudentProfileDialog({ open, onOpenChange, entry, sprintId }: StudentProfileDialogProps) {
  const tierColor = TIER_COLORS[entry?.currentTier as TierType] || TIER_COLORS.unranked;

  // Fetch student stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['student-profile-preview', entry?.userId, sprintId],
    enabled: open && !!entry?.userId && !!sprintId,
    queryFn: async () => {
      if (!entry?.userId) return null;

      // Get total questions answered in this sprint
      const { count: sprintQuestions } = await supabase
        .from('student_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('student_account_id', entry.userId)
        .gte('attempted_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

      // Get accuracy rate
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('is_correct')
        .eq('student_account_id', entry.userId)
        .gte('attempted_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

      const correctCount = attempts?.filter(a => a.is_correct).length || 0;
      const totalAttempts = attempts?.length || 0;
      const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

      // Get speed session count
      const { count: speedSessions } = await supabase
        .from('point_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('student_account_id', entry.userId)
        .eq('category', 'speed_session')
        .eq('sprint_id', sprintId!);

      // Get badges earned count
      const { count: badgesEarned } = await supabase
        .from('student_badges')
        .select('*', { count: 'exact', head: true })
        .eq('student_account_id', entry.userId)
        .eq('is_unlocked', true);

      // Get historical rankings
      const { data: rankings } = await supabase
        .from('student_sprint_rankings')
        .select('current_tier, is_top_1, final_rank')
        .eq('student_account_id', entry.userId)
        .order('created_at', { ascending: false })
        .limit(5);

      const p1Wins = rankings?.filter(r => r.is_top_1).length || 0;
      const bestRank = rankings?.reduce((min, r) => 
        r.final_rank && r.final_rank < min ? r.final_rank : min, 
        Infinity
      );

      return {
        sprintQuestions: sprintQuestions || 0,
        accuracy,
        speedSessions: speedSessions || 0,
        badgesEarned: badgesEarned || 0,
        p1Wins,
        bestRank: bestRank === Infinity ? null : bestRank
      };
    }
  });

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Student Profile</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4">
          {/* Avatar & Name */}
          <Avatar 
            className="h-20 w-20 border-4" 
            style={{ borderColor: tierColor }}
          >
            <AvatarFallback 
              className="text-2xl font-bold"
              style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
            >
              {entry.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center">
            <h2 className="text-xl font-bold">{entry.username}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge 
                variant="outline"
                style={{ 
                  borderColor: tierColor,
                  color: tierColor,
                  backgroundColor: `${tierColor}10`
                }}
              >
                {TIER_DISPLAY_NAMES[entry.currentTier as TierType] || 'Unranked'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Level {entry.level}
              </span>
            </div>
          </div>

          {/* Current Sprint Stats */}
          <Card className="w-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Current Sprint</span>
                <Badge variant="secondary">Rank #{entry.rank}</Badge>
              </div>
              
              <div className="text-center mb-4">
                <p className="text-3xl font-bold" style={{ color: tierColor }}>
                  {entry.totalPoints.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">total points</p>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Target className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">{stats.sprintQuestions}</p>
                      <p className="text-xs text-muted-foreground">Questions</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">{stats.accuracy}%</p>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">{stats.speedSessions}</p>
                      <p className="text-xs text-muted-foreground">Speed Sessions</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Award className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">{stats.badgesEarned}</p>
                      <p className="text-xs text-muted-foreground">Badges</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Historical Stats */}
          {stats && (stats.p1Wins > 0 || stats.bestRank) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {stats.p1Wins > 0 && (
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span>{stats.p1Wins} P1 Win{stats.p1Wins !== 1 ? 's' : ''}</span>
                </div>
              )}
              {stats.bestRank && (
                <div className="flex items-center gap-1">
                  <span>Best: #{stats.bestRank}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
