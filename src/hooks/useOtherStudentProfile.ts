import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateLevel, getLevelProgress, getPointsForLevel, TierType } from '@/data/badgeDefinitions';
import { format, subDays, parseISO } from 'date-fns';

export interface ActivityDay {
  date: string;
  points: number;
  sessionsCount: number;
}

export interface PerformanceStats {
  questionsSolved: number;
  overallAccuracy: number;
  firstAttemptAccuracy: number;
  avgTimePerQuestion: number;
  speedSessionsCompleted: number;
  avgSpeedSessionTime: number;
  bestSpeedTime: number;
  perfectSpeedSessions: number;
  practiceTestsTaken: number;
  avgPracticeScore: number;
  bestPracticeScore: number;
  longestStreak: number;
  currentStreak: number;
  totalActiveDays: number;
}

export interface RankHistoryEntry {
  sprint: string;
  sprintNumber: number;
  seasonNumber: number;
  rank: TierType;
  finalPoints: number;
  position: number;
}

export interface BadgeInfo {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  category: string;
  pointValue: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

export interface FeaturedBadgeSimple {
  slotPosition: number;
  badge: {
    id: string;
    name: string;
    iconName: string;
    rarity: string;
    category: string;
    pointValue: number;
  };
}

export interface SimpleBadgeStats {
  total: number;
  unlocked: number;
  percentage: number;
  totalPoints: number;
  epicEarned: number;
  legendaryEarned: number;
}

export function useOtherStudentProfile(userId: string | null) {
  // Fetch student account info
  const { data: studentAccount, isLoading: accountLoading } = useQuery({
    queryKey: ['other-student-account', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('student_accounts')
        .select(`
          id,
          phone_number,
          created_at,
          last_login,
          linked_student:students(first_name, last_name)
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Fetch total points
  const { data: totalPoints } = useQuery({
    queryKey: ['other-student-total-points', userId],
    queryFn: async () => {
      if (!userId) return 0;

      const { data, error } = await supabase
        .from('point_transactions')
        .select('points')
        .eq('student_account_id', userId);

      if (error) throw error;
      return data?.reduce((sum, t) => sum + t.points, 0) || 0;
    },
    enabled: !!userId
  });

  // Fetch current tier
  const { data: currentRanking } = useQuery({
    queryKey: ['other-student-current-ranking', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('student_sprint_rankings')
        .select('current_tier, reserved_next_tier')
        .eq('student_account_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Fetch activity heatmap (last 365 days)
  const { data: activityHeatmap } = useQuery({
    queryKey: ['other-student-activity-heatmap', userId],
    queryFn: async (): Promise<ActivityDay[]> => {
      if (!userId) return [];

      const startDate = subDays(new Date(), 365);
      
      const { data: transactions, error } = await supabase
        .from('point_transactions')
        .select('points, created_at')
        .eq('student_account_id', userId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Group by date
      const byDate: Record<string, { points: number; count: number }> = {};
      
      transactions?.forEach(t => {
        const date = format(parseISO(t.created_at), 'yyyy-MM-dd');
        if (!byDate[date]) {
          byDate[date] = { points: 0, count: 0 };
        }
        byDate[date].points += t.points;
        byDate[date].count++;
      });

      // Generate all 365 days
      const result: ActivityDay[] = [];
      for (let i = 365; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        result.push({
          date,
          points: byDate[date]?.points || 0,
          sessionsCount: byDate[date]?.count || 0
        });
      }

      return result;
    },
    enabled: !!userId
  });

  // Fetch featured badges
  const { data: featuredBadges } = useQuery({
    queryKey: ['other-student-featured-badges', userId],
    queryFn: async (): Promise<FeaturedBadgeSimple[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('featured_badges')
        .select(`
          slot_position,
          badges!inner (
            id,
            name,
            icon_name,
            rarity,
            category,
            point_value
          )
        `)
        .eq('student_account_id', userId)
        .order('slot_position', { ascending: true });

      if (error) throw error;

      return (data || []).map(fb => ({
        slotPosition: fb.slot_position,
        badge: {
          id: fb.badges.id,
          name: fb.badges.name,
          iconName: fb.badges.icon_name,
          rarity: fb.badges.rarity,
          category: fb.badges.category,
          pointValue: fb.badges.point_value
        }
      }));
    },
    enabled: !!userId
  });

  // Fetch badge stats
  const { data: badgeStats } = useQuery({
    queryKey: ['other-student-badge-stats', userId],
    queryFn: async (): Promise<SimpleBadgeStats> => {
      if (!userId) return { total: 0, unlocked: 0, percentage: 0, totalPoints: 0, epicEarned: 0, legendaryEarned: 0 };

      const { count: totalBadges } = await supabase
        .from('badges')
        .select('*', { count: 'exact', head: true });

      const { data: unlockedBadgesData } = await supabase
        .from('student_badges')
        .select('badges!inner(point_value, rarity)')
        .eq('student_account_id', userId)
        .eq('is_unlocked', true);

      const total = totalBadges || 0;
      const unlocked = unlockedBadgesData?.length || 0;
      const totalPoints = unlockedBadgesData?.reduce((sum, b) => sum + (b.badges?.point_value || 0), 0) || 0;
      const epicEarned = unlockedBadgesData?.filter(b => b.badges?.rarity === 'epic').length || 0;
      const legendaryEarned = unlockedBadgesData?.filter(b => b.badges?.rarity === 'legendary').length || 0;

      return {
        total,
        unlocked,
        percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
        totalPoints,
        epicEarned,
        legendaryEarned
      };
    },
    enabled: !!userId
  });

  // Fetch performance stats
  const { data: performanceStats } = useQuery({
    queryKey: ['other-student-performance-stats', userId],
    queryFn: async (): Promise<PerformanceStats> => {
      if (!userId) {
        return {
          questionsSolved: 0,
          overallAccuracy: 0,
          firstAttemptAccuracy: 0,
          avgTimePerQuestion: 0,
          speedSessionsCompleted: 0,
          avgSpeedSessionTime: 0,
          bestSpeedTime: 0,
          perfectSpeedSessions: 0,
          practiceTestsTaken: 0,
          avgPracticeScore: 0,
          bestPracticeScore: 0,
          longestStreak: 0,
          currentStreak: 0,
          totalActiveDays: 0
        };
      }

      // Get all attempts
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('is_correct, attempt_number, time_spent_seconds')
        .eq('student_account_id', userId);

      const totalAttempts = attempts?.length || 0;
      const correctAttempts = attempts?.filter(a => a.is_correct).length || 0;
      const firstAttempts = attempts?.filter(a => a.attempt_number === 1) || [];
      const firstCorrect = firstAttempts.filter(a => a.is_correct).length;
      const avgTime = attempts?.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / (totalAttempts || 1);

      // Get bluebook attempts for practice tests
      const { data: bluebookAttempts } = await supabase
        .from('bluebook_attempts')
        .select('total_score')
        .eq('student_account_id', userId)
        .eq('status', 'completed');

      const scores = bluebookAttempts?.map(a => a.total_score || 0) || [];
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

      // Calculate active days from heatmap
      const activeDays = activityHeatmap?.filter(d => d.points > 0).length || 0;

      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      if (activityHeatmap) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayActivity = activityHeatmap.find(d => d.date === today);
        
        let startIndex = activityHeatmap.length - 1;
        if (!todayActivity?.points) {
          startIndex = activityHeatmap.length - 2;
        }

        for (let i = startIndex; i >= 0; i--) {
          if (activityHeatmap[i].points > 0) {
            tempStreak++;
            currentStreak = tempStreak;
          } else {
            break;
          }
        }

        tempStreak = 0;
        activityHeatmap.forEach(day => {
          if (day.points > 0) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
          } else {
            tempStreak = 0;
          }
        });
      }

      return {
        questionsSolved: correctAttempts,
        overallAccuracy: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
        firstAttemptAccuracy: firstAttempts.length > 0 ? Math.round((firstCorrect / firstAttempts.length) * 100) : 0,
        avgTimePerQuestion: Math.round(avgTime),
        speedSessionsCompleted: 0,
        avgSpeedSessionTime: 0,
        bestSpeedTime: 0,
        perfectSpeedSessions: 0,
        practiceTestsTaken: bluebookAttempts?.length || 0,
        avgPracticeScore: Math.round(avgScore),
        bestPracticeScore: bestScore,
        longestStreak,
        currentStreak,
        totalActiveDays: activeDays
      };
    },
    enabled: !!userId && !!activityHeatmap
  });

  // Fetch rank history
  const { data: rankHistory } = useQuery({
    queryKey: ['other-student-rank-history', userId],
    queryFn: async (): Promise<RankHistoryEntry[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('student_sprint_rankings')
        .select(`
          current_tier,
          reserved_next_tier,
          total_points,
          final_rank,
          sprints!inner (
            season_number,
            sprint_number
          )
        `)
        .eq('student_account_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(r => {
        const tierOrder: TierType[] = ['unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby'];
        const currentTierIdx = tierOrder.indexOf(r.current_tier as TierType);
        const nextTierIdx = r.reserved_next_tier ? tierOrder.indexOf(r.reserved_next_tier as TierType) : -1;
        const displayTier = nextTierIdx > currentTierIdx ? r.reserved_next_tier : r.current_tier;
        
        return {
          sprint: `Season ${r.sprints.season_number} - Sprint ${r.sprints.sprint_number}`,
          sprintNumber: r.sprints.sprint_number,
          seasonNumber: r.sprints.season_number,
          rank: displayTier as TierType,
          finalPoints: r.total_points,
          position: r.final_rank || 0
        };
      });
    },
    enabled: !!userId
  });

  // Build profile data
  const linkedStudent = studentAccount?.linked_student as { first_name: string; last_name: string } | null;
  const level = calculateLevel(totalPoints || 0);
  const levelProgress = getLevelProgress(totalPoints || 0);
  const pointsToNextLevel = getPointsForLevel(level + 1) - (totalPoints || 0);
  
  // Determine current tier
  const currentTier = currentRanking?.reserved_next_tier || currentRanking?.current_tier || 'unranked';

  return {
    username: linkedStudent 
      ? `${linkedStudent.first_name} ${linkedStudent.last_name?.charAt(0) || ''}.`
      : studentAccount?.phone_number?.slice(-4) || 'Student',
    avatarInitial: linkedStudent?.first_name?.charAt(0).toUpperCase() || 'S',
    createdAt: studentAccount?.created_at || null,
    lastLogin: studentAccount?.last_login || null,

    level,
    levelProgress,
    totalPoints: totalPoints || 0,
    pointsToNextLevel,

    currentTier: currentTier as TierType,
    reservedNextTier: currentRanking?.reserved_next_tier || null,

    activityHeatmap: activityHeatmap || [],
    
    badgeStats: badgeStats || { total: 0, unlocked: 0, percentage: 0, totalPoints: 0, epicEarned: 0, legendaryEarned: 0 },
    featuredBadges: featuredBadges || [],

    performanceStats: performanceStats || null,
    rankHistory: rankHistory || [],

    isLoading: accountLoading
  };
}
