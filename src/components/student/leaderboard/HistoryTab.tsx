import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { History, Trophy, TrendingUp, TrendingDown, Minus, Medal, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { TierType, TIER_COLORS } from '@/data/badgeDefinitions';

interface SprintRecord {
  sprintId: string;
  seasonNumber: number;
  sprintNumber: number;
  startDate: string;
  endDate: string;
  finalRank: number | null;
  totalPoints: number;
  tier: TierType;
  isTop1: boolean;
  nextTier: TierType | null;
}

interface HistoryTabProps {
  studentAccountId: string | undefined;
}

export function HistoryTab({ studentAccountId }: HistoryTabProps) {
  const { data: sprintHistory, isLoading } = useQuery({
    queryKey: ['sprint-history', studentAccountId],
    enabled: !!studentAccountId,
    queryFn: async (): Promise<SprintRecord[]> => {
      if (!studentAccountId) return [];

      const { data: rankings, error } = await supabase
        .from('student_sprint_rankings')
        .select(`
          id,
          sprint_id,
          total_points,
          current_tier,
          final_rank,
          is_top_1,
          reserved_next_tier,
          sprints!inner (
            id,
            season_number,
            sprint_number,
            start_date,
            end_date,
            is_active
          )
        `)
        .eq('student_account_id', studentAccountId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (rankings || [])
        .filter((r: any) => !r.sprints.is_active) // Only show completed sprints
        .map((r: any) => ({
          sprintId: r.sprint_id,
          seasonNumber: r.sprints.season_number,
          sprintNumber: r.sprints.sprint_number,
          startDate: r.sprints.start_date,
          endDate: r.sprints.end_date,
          finalRank: r.final_rank,
          totalPoints: r.total_points,
          tier: r.current_tier as TierType,
          isTop1: r.is_top_1 || false,
          nextTier: r.reserved_next_tier as TierType | null
        }));
    }
  });

  // Group by season
  const groupedByseason = (sprintHistory || []).reduce((acc, record) => {
    const key = `Season ${record.seasonNumber}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(record);
    return acc;
  }, {} as Record<string, SprintRecord[]>);

  // Calculate stats
  const stats = {
    totalSprints: sprintHistory?.length || 0,
    totalTop1s: sprintHistory?.filter(s => s.isTop1).length || 0,
    highestTier: sprintHistory?.reduce((highest, s) => {
      const tierOrder: TierType[] = ['unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby'];
      return tierOrder.indexOf(s.tier) > tierOrder.indexOf(highest) ? s.tier : highest;
    }, 'unranked' as TierType) || 'unranked',
    totalPointsEarned: sprintHistory?.reduce((sum, s) => sum + s.totalPoints, 0) || 0
  };

  const getTierChange = (current: TierType, next: TierType | null): 'up' | 'down' | 'same' => {
    if (!next) return 'same';
    const tierOrder: TierType[] = ['unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby'];
    const currentIdx = tierOrder.indexOf(current);
    const nextIdx = tierOrder.indexOf(next);
    if (nextIdx > currentIdx) return 'up';
    if (nextIdx < currentIdx) return 'down';
    return 'same';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!sprintHistory || sprintHistory.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Sprint History Yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Complete your first sprint to see your competition history here!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-muted/50 to-muted">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.totalSprints}</div>
            <div className="text-xs text-muted-foreground">Sprints Completed</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-500">{stats.totalTop1s}</div>
            <div className="text-xs text-muted-foreground">P1 Wins</div>
          </CardContent>
        </Card>
        <Card style={{ 
          background: `linear-gradient(135deg, ${TIER_COLORS[stats.highestTier]}15, ${TIER_COLORS[stats.highestTier]}05)`,
          borderColor: `${TIER_COLORS[stats.highestTier]}30`
        }}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold capitalize" style={{ color: TIER_COLORS[stats.highestTier] }}>
              {stats.highestTier}
            </div>
            <div className="text-xs text-muted-foreground">Highest Tier</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalPointsEarned.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Points</div>
          </CardContent>
        </Card>
      </div>

      {/* Sprint History by Season */}
      {Object.entries(groupedByseason)
        .sort(([a], [b]) => {
          const seasonA = parseInt(a.replace('Season ', ''));
          const seasonB = parseInt(b.replace('Season ', ''));
          return seasonB - seasonA;
        })
        .map(([season, records]) => (
          <motion.div
            key={season}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  {season}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {records
                  .sort((a, b) => b.sprintNumber - a.sprintNumber)
                  .map((record) => {
                    const tierChange = getTierChange(record.tier, record.nextTier);
                    
                    return (
                      <motion.div
                        key={record.sprintId}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ 
                              backgroundColor: `${TIER_COLORS[record.tier]}20`,
                              color: TIER_COLORS[record.tier]
                            }}
                          >
                            S{record.sprintNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize" style={{ color: TIER_COLORS[record.tier] }}>
                                {record.tier}
                              </span>
                              {record.isTop1 && (
                                <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
                                  <Medal className="h-3 w-3 mr-1" />
                                  P1
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Rank #{record.finalRank || '?'} • {record.totalPoints.toLocaleString()} pts
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {tierChange === 'up' && (
                            <div className="flex items-center gap-1 text-emerald-500">
                              <TrendingUp className="h-4 w-4" />
                              <span className="text-xs capitalize">{record.nextTier}</span>
                            </div>
                          )}
                          {tierChange === 'down' && (
                            <div className="flex items-center gap-1 text-red-500">
                              <TrendingDown className="h-4 w-4" />
                              <span className="text-xs capitalize">{record.nextTier}</span>
                            </div>
                          )}
                          {tierChange === 'same' && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Minus className="h-4 w-4" />
                              <span className="text-xs">Held</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
              </CardContent>
            </Card>
          </motion.div>
        ))}
    </div>
  );
}
