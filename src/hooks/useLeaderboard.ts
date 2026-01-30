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
  groupNumber: number;
  isAdvancing: boolean;
  isAtRisk: boolean;
  isTop1: boolean;
  reservedNextTier: string | null;
  pointsBreakdown: PointsBreakdown;
}

export interface GroupInfo {
  groupNumber: number;
  totalGroups: number;
}

const MAX_GROUP_SIZE = 40;

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

  // Fetch most recent ended sprint (for showing results)
  const { data: lastEndedSprint } = useQuery({
    queryKey: ['last-ended-sprint'],
    queryFn: async (): Promise<SprintInfo | null> => {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('is_active', false)
        .order('end_date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        sprintNumber: data.sprint_number,
        seasonNumber: data.season_number,
        startDate: data.start_date,
        endDate: data.end_date,
        daysRemaining: 0,
        hoursRemaining: 0,
        minutesRemaining: 0,
        isActive: false
      };
    }
  });

  // Fetch next upcoming sprint (for countdown)
  const { data: nextSprint } = useQuery({
    queryKey: ['next-sprint'],
    queryFn: async (): Promise<SprintInfo | null> => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('is_active', false)
        .gt('start_date', now)
        .order('start_date', { ascending: true })
        .limit(1)
        .single();

      if (error || !data) return null;

      const startDate = new Date(data.start_date);
      const nowDate = new Date();
      const diff = startDate.getTime() - nowDate.getTime();
      
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
        isActive: false
      };
    },
    refetchInterval: 60000
  });

  // Fetch user's last sprint results (with final_rank)
  const { data: lastSprintResults } = useQuery({
    queryKey: ['last-sprint-results', student?.id, lastEndedSprint?.id],
    enabled: !!student?.id && !!lastEndedSprint?.id,
    queryFn: async () => {
      if (!student?.id || !lastEndedSprint?.id) return null;

      const { data, error } = await supabase
        .from('student_sprint_rankings')
        .select('*')
        .eq('sprint_id', lastEndedSprint.id)
        .eq('student_account_id', student.id)
        .single();

      if (error) return null;

      return {
        rank: data.final_rank || 0,
        tier: data.current_tier as TierType,
        points: data.total_points,
        isTop1: data.is_top_1,
        nextTier: data.reserved_next_tier as TierType | null
      };
    }
  });

  // Trigger sprint finalization when viewing ended sprints (one-time check)
  useQuery({
    queryKey: ['finalize-sprint-check', lastEndedSprint?.id],
    enabled: !!lastEndedSprint?.id && !activeSprint,
    staleTime: Infinity,
    queryFn: async () => {
      if (!lastEndedSprint?.id) return null;

      // Check if sprint has been finalized
      const { data: rankings } = await supabase
        .from('student_sprint_rankings')
        .select('final_rank')
        .eq('sprint_id', lastEndedSprint.id)
        .not('final_rank', 'is', null)
        .limit(1);

      // If not finalized, trigger the edge function
      if (!rankings || rankings.length === 0) {
        try {
          await supabase.functions.invoke('finalize-sprint', {
            body: { sprintId: lastEndedSprint.id }
          });
        } catch (e) {
          console.error('Failed to finalize sprint:', e);
        }
      }

      return true;
    }
  });

  // Auto-enroll student in active sprint if not already enrolled
  useQuery({
    queryKey: ['auto-enroll-sprint', activeSprint?.id, student?.id],
    enabled: !!activeSprint?.id && !!student?.id,
    queryFn: async () => {
      if (!activeSprint?.id || !student?.id) return null;

      // Check if already enrolled
      const { data: existing } = await supabase
        .from('student_sprint_rankings')
        .select('id')
        .eq('sprint_id', activeSprint.id)
        .eq('student_account_id', student.id)
        .single();

      if (existing) return existing;

      // Get previous tier from last sprint
      const { data: previousRanking } = await supabase
        .from('student_sprint_rankings')
        .select('current_tier, reserved_next_tier')
        .eq('student_account_id', student.id)
        .neq('sprint_id', activeSprint.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const startingTier = previousRanking?.reserved_next_tier || previousRanking?.current_tier || 'unranked';

      // Get current group counts for this tier to assign appropriate group
      const { data: groupCounts } = await supabase
        .from('student_sprint_rankings')
        .select('group_number')
        .eq('sprint_id', activeSprint.id)
        .eq('current_tier', startingTier);

      // Calculate which group to assign
      let assignedGroup = 1;
      if (groupCounts && groupCounts.length > 0) {
        // Count students per group
        const groupMap: Record<number, number> = {};
        groupCounts.forEach(r => {
          const g = r.group_number || 1;
          groupMap[g] = (groupMap[g] || 0) + 1;
        });

        // Find first group with space (less than MAX_GROUP_SIZE)
        const maxGroup = Math.max(...Object.keys(groupMap).map(Number));
        let foundGroup = false;
        for (let i = 1; i <= maxGroup; i++) {
          if ((groupMap[i] || 0) < MAX_GROUP_SIZE) {
            assignedGroup = i;
            foundGroup = true;
            break;
          }
        }
        // If all groups are full, create a new group
        if (!foundGroup) {
          assignedGroup = maxGroup + 1;
        }
      }

      // Enroll in new sprint with assigned group
      const { data: newRanking, error } = await supabase
        .from('student_sprint_rankings')
        .insert({
          sprint_id: activeSprint.id,
          student_account_id: student.id,
          current_tier: startingTier,
          total_points: 0,
          is_top_1: false,
          group_number: assignedGroup
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to auto-enroll in sprint:', error);
        return null;
      }

      return newRanking;
    },
    staleTime: Infinity // Only run once
  });

  // Fetch current sprint leaderboard (filtered by user's group)
  const { data: leaderboardData, isLoading: leaderboardLoading, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['sprint-leaderboard', activeSprint?.id, selectedTier, student?.id],
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<{ entries: LeaderboardEntry[]; groupInfo: GroupInfo | null }> => {
      if (!activeSprint?.id) return { entries: [], groupInfo: null };

      // First, get the current user's group and tier
      let userGroupNumber = 1;
      let userTier: string | null = null;
      
      if (student?.id) {
        const { data: userRanking } = await supabase
          .from('student_sprint_rankings')
          .select('group_number, current_tier')
          .eq('sprint_id', activeSprint.id)
          .eq('student_account_id', student.id)
          .single();
        
        if (userRanking) {
          userGroupNumber = userRanking.group_number || 1;
          userTier = userRanking.current_tier;
        }
      }

      // Get rankings for the user's tier and group
      const tierToQuery = selectedTier || userTier || 'unranked';
      
      let query = supabase
        .from('student_sprint_rankings')
        .select(`
          id,
          student_account_id,
          current_tier,
          total_points,
          is_top_1,
          reserved_next_tier,
          group_number,
          student_accounts!inner (
            id,
            phone_number,
            linked_student:students(first_name, last_name)
          )
        `)
        .eq('sprint_id', activeSprint.id)
        .eq('current_tier', tierToQuery)
        .eq('group_number', userGroupNumber)
        .order('total_points', { ascending: false });

      const { data: rankings, error } = await query;

      if (error) throw error;

      // Get total groups count for this tier
      const { data: allGroupsInTier } = await supabase
        .from('student_sprint_rankings')
        .select('group_number')
        .eq('sprint_id', activeSprint.id)
        .eq('current_tier', tierToQuery);

      const uniqueGroups = new Set(allGroupsInTier?.map(r => r.group_number || 1));
      const totalGroups = uniqueGroups.size || 1;

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

      // Calculate cutoff based on group size (P1 wins within group)
      const groupSize = rankings?.length || 0;
      const cutoff = Math.min(TIER_PROMOTION_CUTOFFS[tierToQuery as TierType] || 30, Math.ceil(groupSize * 0.25)); // Top 25% or tier cutoff, whichever is smaller

      const entries = (rankings || []).map((ranking, index) => {
        const linkedStudent = ranking.student_accounts?.linked_student as { first_name: string; last_name: string } | null;
        const tier = ranking.current_tier as TierType;
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
          groupNumber: ranking.group_number || 1,
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

      return { 
        entries, 
        groupInfo: { groupNumber: userGroupNumber, totalGroups } 
      };
    },
    enabled: !!activeSprint?.id,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const leaderboard = leaderboardData?.entries || [];
  const groupInfo = leaderboardData?.groupInfo || null;

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
    lastEndedSprint,
    nextSprint,
    lastSprintResults,
    leaderboard,
    allTimeLeaderboard: allTimeLeaderboard || [],
    currentUserEntry,
    currentUserAllTime,
    currentUserRank,
    groupInfo,
    pointsToAdvance: getPointsToAdvance(),
    pointsToTop1: getPointsToTop1(),
    isLoading: sprintLoading || leaderboardLoading,
    isAllTimeLoading: allTimeLoading,
    refetchLeaderboard
  };
}
