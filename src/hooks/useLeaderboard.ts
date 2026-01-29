import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { TIER_PROMOTION_CUTOFFS, calculateLevel, TierType } from '@/data/badgeDefinitions';

export interface PointsBreakdown {
  questions: number;
  sectionBonuses: number;
  speedSessions: number;
  badges: number;
  bankCompletions: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  level: number;
  totalPoints: number;
  currentTier: TierType;
  isAdvancing: boolean;
  isAtRisk: boolean;
  isTop1: boolean;
  reservedNextTier: string | null;
  pointsBreakdown: PointsBreakdown;
}

export interface SprintInfo {
  id: string;
  sprintNumber: number;
  seasonNumber: number;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  isActive: boolean;
}

export interface AllTimeEntry {
  userId: string;
  username: string;
  level: number;
  totalPoints: number;
  highestTier: TierType;
  rubyWeeks: number;
  isRubyLegend: boolean;
}

export function useLeaderboard(selectedTier?: TierType) {
  const { student } = useStudentAuth();

  // Fetch current active sprint
  const { data: activeSprint, isLoading: sprintLoading } = useQuery({
    queryKey: ['active-sprint'],
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<SprintInfo | null> => {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error || !data) return null;

      const endDate = new Date(data.end_date);
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();
      
      const daysRemaining = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
      const hoursRemaining = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
      const minutesRemaining = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));

      return {
        id: data.id,
        sprintNumber: data.sprint_number,
        seasonNumber: data.season_number,
        startDate: data.start_date,
        endDate: data.end_date,
        daysRemaining,
        hoursRemaining,
        minutesRemaining,
        isActive: data.is_active
      };
    },
    refetchInterval: 60000 // Refetch every minute
  });

  // Fetch current sprint leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['sprint-leaderboard', activeSprint?.id, selectedTier],
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (!activeSprint?.id) return [];

      // Get all rankings for current sprint
      let query = supabase
        .from('student_sprint_rankings')
        .select(`
          id,
          student_account_id,
          current_tier,
          total_points,
          is_top_1,
          reserved_next_tier,
          student_accounts!inner (
            id,
            phone_number,
            linked_student:students(first_name, last_name)
          )
        `)
        .eq('sprint_id', activeSprint.id)
        .order('total_points', { ascending: false });

      if (selectedTier) {
        query = query.eq('current_tier', selectedTier);
      }

      const { data: rankings, error } = await query;

      if (error) throw error;

      // Get point transactions breakdown for each student
      const studentIds = rankings?.map(r => r.student_account_id) || [];
      
      const { data: transactions } = await supabase
        .from('point_transactions')
        .select('student_account_id, points, category')
        .eq('sprint_id', activeSprint.id)
        .in('student_account_id', studentIds);

      // Calculate breakdowns
      const breakdowns: Record<string, PointsBreakdown> = {};
      transactions?.forEach(t => {
        if (!breakdowns[t.student_account_id]) {
          breakdowns[t.student_account_id] = {
            questions: 0,
            sectionBonuses: 0,
            speedSessions: 0,
            badges: 0,
            bankCompletions: 0
          };
        }
        switch (t.category) {
          case 'questions':
            breakdowns[t.student_account_id].questions += t.points;
            break;
          case 'section_bonus':
            breakdowns[t.student_account_id].sectionBonuses += t.points;
            break;
          case 'speed_session':
            breakdowns[t.student_account_id].speedSessions += t.points;
            break;
          case 'badge':
            breakdowns[t.student_account_id].badges += t.points;
            break;
          case 'bank_completion':
            breakdowns[t.student_account_id].bankCompletions += t.points;
            break;
        }
      });

      return (rankings || []).map((ranking, index) => {
        const linkedStudent = ranking.student_accounts?.linked_student as { first_name: string; last_name: string } | null;
        const tier = ranking.current_tier as TierType;
        const cutoff = TIER_PROMOTION_CUTOFFS[tier] || 30;
        const rank = index + 1;

        return {
          rank,
          userId: ranking.student_account_id,
          username: linkedStudent 
            ? `${linkedStudent.first_name} ${linkedStudent.last_name?.charAt(0) || ''}.`
            : ranking.student_accounts?.phone_number?.slice(-4) || 'Anonymous',
          level: calculateLevel(ranking.total_points),
          totalPoints: ranking.total_points,
          currentTier: tier,
          isAdvancing: rank <= cutoff,
          isAtRisk: rank === cutoff + 1,
          isTop1: ranking.is_top_1 || rank === 1,
          reservedNextTier: ranking.reserved_next_tier,
          pointsBreakdown: breakdowns[ranking.student_account_id] || {
            questions: 0,
            sectionBonuses: 0,
            speedSessions: 0,
            badges: 0,
            bankCompletions: 0
          }
        };
      });
    },
    enabled: !!activeSprint?.id,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Fetch all-time leaderboard
  const { data: allTimeLeaderboard, isLoading: allTimeLoading } = useQuery({
    queryKey: ['all-time-leaderboard'],
    queryFn: async (): Promise<AllTimeEntry[]> => {
      // Get total points from all point transactions
      const { data: transactions, error } = await supabase
        .from('point_transactions')
        .select('student_account_id, points');

      if (error) throw error;

      // Aggregate points per student
      const totalsByStudent: Record<string, number> = {};
      transactions?.forEach(t => {
        totalsByStudent[t.student_account_id] = (totalsByStudent[t.student_account_id] || 0) + t.points;
      });

      // Get student accounts
      const studentIds = Object.keys(totalsByStudent);
      const { data: accounts } = await supabase
        .from('student_accounts')
        .select(`
          id,
          phone_number,
          linked_student:students(first_name, last_name)
        `)
        .in('id', studentIds);

      // Get highest tier achieved per student
      const { data: rankings } = await supabase
        .from('student_sprint_rankings')
        .select('student_account_id, current_tier, is_top_1')
        .in('student_account_id', studentIds);

      const tierOrder: TierType[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby'];
      const highestTiers: Record<string, TierType> = {};
      const rubyWeeks: Record<string, number> = {};
      
      rankings?.forEach(r => {
        const tier = r.current_tier as TierType;
        const current = highestTiers[r.student_account_id];
        if (!current || tierOrder.indexOf(tier) > tierOrder.indexOf(current)) {
          highestTiers[r.student_account_id] = tier;
        }
        if (tier === 'ruby') {
          rubyWeeks[r.student_account_id] = (rubyWeeks[r.student_account_id] || 0) + 1;
        }
      });

      return studentIds
        .map(id => {
          const account = accounts?.find(a => a.id === id);
          const linkedStudent = account?.linked_student as { first_name: string; last_name: string } | null;
          
          return {
            userId: id,
            username: linkedStudent 
              ? `${linkedStudent.first_name} ${linkedStudent.last_name?.charAt(0) || ''}.`
              : account?.phone_number?.slice(-4) || 'Anonymous',
            level: calculateLevel(totalsByStudent[id]),
            totalPoints: totalsByStudent[id],
            highestTier: highestTiers[id] || 'unranked',
            rubyWeeks: rubyWeeks[id] || 0,
            isRubyLegend: (rubyWeeks[id] || 0) >= 4
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints);
    }
  });

  // Get current user's rank and stats
  const currentUserEntry = leaderboard?.find(e => e.userId === student?.id);
  const currentUserAllTime = allTimeLeaderboard?.find(e => e.userId === student?.id);
  const currentUserRank = currentUserEntry?.rank || null;

  // Calculate points needed to advance
  const getPointsToAdvance = (): number | null => {
    if (!currentUserEntry || !leaderboard) return null;
    
    const cutoff = TIER_PROMOTION_CUTOFFS[currentUserEntry.currentTier];
    if (currentUserEntry.rank <= cutoff) return 0;

    const cutoffEntry = leaderboard.find(e => e.rank === cutoff);
    if (!cutoffEntry) return null;

    return cutoffEntry.totalPoints - currentUserEntry.totalPoints + 1;
  };

  // Calculate points needed for #1
  const getPointsToTop1 = (): number | null => {
    if (!currentUserEntry || !leaderboard || leaderboard.length === 0) return null;
    if (currentUserEntry.rank === 1) return 0;

    const top1 = leaderboard[0];
    return top1.totalPoints - currentUserEntry.totalPoints + 1;
  };

  return {
    activeSprint,
    leaderboard: leaderboard || [],
    allTimeLeaderboard: allTimeLeaderboard || [],
    currentUserEntry,
    currentUserAllTime,
    currentUserRank,
    pointsToAdvance: getPointsToAdvance(),
    pointsToTop1: getPointsToTop1(),
    isLoading: sprintLoading || leaderboardLoading,
    isAllTimeLoading: allTimeLoading,
    refetchLeaderboard
  };
}
