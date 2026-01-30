import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Trophy, Target, Zap, Award, Star, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TIER_COLORS, TIER_DISPLAY_NAMES, TierType } from '@/data/badgeDefinitions';
import { AllTimeEntry } from '@/hooks/useLeaderboard';

interface AllTimeProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: AllTimeEntry | null;
}

export function AllTimeProfileDialog({ open, onOpenChange, entry }: AllTimeProfileDialogProps) {
  const tierColor = TIER_COLORS[entry?.highestTier as TierType] || TIER_COLORS.unranked;

  // Fetch student stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['all-time-profile-preview', entry?.userId],
    enabled: open && !!entry?.userId,
    queryFn: async () => {
      if (!entry?.userId) return null;

      // Get total questions answered ever
      const { count: totalQuestions } = await supabase
        .from('student_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('student_account_id', entry.userId);

      // Get accuracy rate
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('is_correct')
        .eq('student_account_id', entry.userId);

      const correctCount = attempts?.filter(a => a.is_correct).length || 0;
      const totalAttempts = attempts?.length || 0;
      const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

      // Get speed session count
      const { count: speedSessions } = await supabase
        .from('point_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('student_account_id', entry.userId)
        .eq('category', 'speed_session');

      // Get badges earned count
      const { count: badgesEarned } = await supabase
        .from('student_badges')
        .select('*', { count: 'exact', head: true })
        .eq('student_account_id', entry.userId)
        .eq('is_unlocked', true);

      // Get historical rankings
      const { data: rankings } = await supabase
        .from('student_sprint_rankings')
        .select('current_tier, is_top_1, final_rank, sprint_id')
        .eq('student_account_id', entry.userId);

      const p1Wins = rankings?.filter(r => r.is_top_1).length || 0;
      const totalSprints = rankings?.length || 0;
      const bestRank = rankings?.reduce((min, r) => 
        r.final_rank && r.final_rank < min ? r.final_rank : min, 
        Infinity
      );

      // Get account creation date
      const { data: account } = await supabase
        .from('student_accounts')
        .select('created_at')
        .eq('id', entry.userId)
        .maybeSingle();

      const memberSince = account?.created_at 
        ? new Date(account.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : null;

      return {
        totalQuestions: totalQuestions || 0,
        accuracy,
        speedSessions: speedSessions || 0,
        badgesEarned: badgesEarned || 0,
        p1Wins,
        totalSprints,
        bestRank: bestRank === Infinity ? null : bestRank,
        memberSince
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
            <h2 className="text-xl font-bold flex items-center justify-center gap-2">
              {entry.username}
              {entry.isRubyLegend && (
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              )}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge 
                variant="outline"
                style={{ 
                  borderColor: tierColor,
                  color: tierColor,
                  backgroundColor: `${tierColor}10`
                }}
              >
                Peak: {TIER_DISPLAY_NAMES[entry.highestTier as TierType] || 'Unranked'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Level {entry.level}
              </span>
            </div>
            {entry.isRubyLegend && (
              <Badge className="mt-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                Ruby Legend - {entry.rubyWeeks} weeks
              </Badge>
            )}
          </div>

          {/* All-Time Stats */}
          <Card className="w-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">All-Time Stats</span>
                {stats?.memberSince && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Since {stats.memberSince}
                  </div>
                )}
              </div>
              
              <div className="text-center mb-4">
                <p className="text-3xl font-bold" style={{ color: tierColor }}>
                  {entry.totalPoints.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">total points earned</p>
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
                      <p className="text-sm font-medium">{stats.totalQuestions.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Questions</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">{stats.p1Wins}</p>
                      <p className="text-xs text-muted-foreground">P1 Wins</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Zap className="h-4 w-4 text-orange-500" />
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

          {/* Additional Stats */}
          {stats && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{stats.accuracy}% accuracy</span>
              <span>•</span>
              <span>{stats.totalSprints} sprints</span>
              {stats.bestRank && (
                <>
                  <span>•</span>
                  <span>Best: #{stats.bestRank}</span>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
