import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { calculateLevel, getLevelProgress, getPointsForLevel, TierType } from '@/data/badgeDefinitions';
import { useBadges } from './useBadges';
import { useLeaderboard } from './useLeaderboard';
import { useStudentTier } from './useStudentTier';
import { format, subDays, differenceInDays, parseISO, startOfDay } from 'date-fns';

export interface ActivityDay {
  date: string;
  points: number;
  sessionsCount: number;
}

export interface CourseHistoryEntry {
  id: string;
  completedAt: string;
  topicName: string;
  topicArea: string;
  category: 'math' | 'english';
  score: number;
  timeSpent: number;
  pointsEarned: number;
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

export interface RecentAchievement {
  id: string;
  timestamp: string;
  type: 'badge_earned' | 'rank_up' | 'streak_milestone' | 'completion';
  title: string;
  pointsAwarded: number;
  icon: string;
}

export function useStudentProfile() {
  const { student } = useStudentAuth();
  const { badgeStats, featuredBadges, allBadges } = useBadges();
  const { currentUserEntry, currentUserAllTime, activeSprint } = useLeaderboard();
  const { tier: currentTierFromHook } = useStudentTier();

  // Fetch total points
  const { data: totalPoints } = useQuery({
    queryKey: ['total-points', student?.id],
    queryFn: async () => {
      if (!student?.id) return 0;

      const { data, error } = await supabase
        .from('point_transactions')
        .select('points')
        .eq('student_account_id', student.id);

      if (error) throw error;
      return data?.reduce((sum, t) => sum + t.points, 0) || 0;
    },
    enabled: !!student?.id,
    refetchOnWindowFocus: true,
    staleTime: 30000
  });

  // Fetch activity heatmap (last 365 days)
  const { data: activityHeatmap } = useQuery({
    queryKey: ['activity-heatmap', student?.id],
    queryFn: async (): Promise<ActivityDay[]> => {
      if (!student?.id) return [];

      const startDate = subDays(new Date(), 365);
      
      const { data: transactions, error } = await supabase
        .from('point_transactions')
        .select('points, created_at')
        .eq('student_account_id', student.id)
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
    enabled: !!student?.id,
    refetchOnWindowFocus: true,
    staleTime: 30000
  });

  // Calculate streaks from activity
  const calculateStreaks = () => {
    if (!activityHeatmap) return { current: 0, longest: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Check from today backwards
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayActivity = activityHeatmap.find(d => d.date === today);
    
    // Start counting from today or yesterday
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

    // Calculate longest streak
    tempStreak = 0;
    activityHeatmap.forEach(day => {
      if (day.points > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    return { current: currentStreak, longest: longestStreak };
  };

  // Fetch performance stats
  const { data: performanceStats } = useQuery({
    queryKey: ['performance-stats', student?.id],
    queryFn: async (): Promise<PerformanceStats> => {
      if (!student?.id) {
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
        .eq('student_account_id', student.id);

      const totalAttempts = attempts?.length || 0;
      const correctAttempts = attempts?.filter(a => a.is_correct).length || 0;
      const firstAttempts = attempts?.filter(a => a.attempt_number === 1) || [];
      const firstCorrect = firstAttempts.filter(a => a.is_correct).length;
      const avgTime = attempts?.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / (totalAttempts || 1);

      // Get bluebook attempts for practice tests
      const { data: bluebookAttempts } = await supabase
        .from('bluebook_attempts')
        .select('total_score')
        .eq('student_account_id', student.id)
        .eq('status', 'completed');

      const scores = bluebookAttempts?.map(a => a.total_score || 0) || [];
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

      // Calculate from activity heatmap
      const streaks = calculateStreaks();
      const activeDays = activityHeatmap?.filter(d => d.points > 0).length || 0;

      return {
        questionsSolved: correctAttempts,
        overallAccuracy: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
        firstAttemptAccuracy: firstAttempts.length > 0 ? Math.round((firstCorrect / firstAttempts.length) * 100) : 0,
        avgTimePerQuestion: Math.round(avgTime),
        speedSessionsCompleted: 0, // Would need speed session tracking
        avgSpeedSessionTime: 0,
        bestSpeedTime: 0,
        perfectSpeedSessions: 0,
        practiceTestsTaken: bluebookAttempts?.length || 0,
        avgPracticeScore: Math.round(avgScore),
        bestPracticeScore: bestScore,
        longestStreak: streaks.longest,
        currentStreak: streaks.current,
        totalActiveDays: activeDays
      };
    },
    enabled: !!student?.id && !!activityHeatmap,
    refetchOnWindowFocus: true,
    staleTime: 30000
  });

  // Fetch rank history
  const { data: rankHistory } = useQuery({
    queryKey: ['rank-history', student?.id],
    queryFn: async (): Promise<RankHistoryEntry[]> => {
      if (!student?.id) return [];

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
        .eq('student_account_id', student.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(r => {
        // Use reserved_next_tier if it's higher than current_tier (represents actual advancement)
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
    enabled: !!student?.id
  });

  // Generate recent achievements
  const { data: recentAchievements } = useQuery({
    queryKey: ['recent-achievements', student?.id],
    queryFn: async (): Promise<RecentAchievement[]> => {
      if (!student?.id) return [];

      const achievements: RecentAchievement[] = [];

      // Get recently unlocked badges
      const unlockedBadges = allBadges
        .filter(b => b.isUnlocked && b.unlockedAt)
        .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
        .slice(0, 5);

      unlockedBadges.forEach(b => {
        achievements.push({
          id: `badge-${b.id}`,
          timestamp: b.unlockedAt!,
          type: 'badge_earned',
          title: `Earned '${b.badge.name}' badge`,
          pointsAwarded: b.badge.pointValue,
          icon: '🏆'
        });
      });

      // Add streak milestone if applicable
      if (performanceStats?.currentStreak && performanceStats.currentStreak >= 7) {
        achievements.push({
          id: 'streak-current',
          timestamp: new Date().toISOString(),
          type: 'streak_milestone',
          title: `${performanceStats.currentStreak}-day streak!`,
          pointsAwarded: 0,
          icon: '🔥'
        });
      }

      return achievements
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
    enabled: !!student?.id && !!allBadges && !!performanceStats
  });

  // Build profile data
  const level = calculateLevel(totalPoints || 0);
  const levelProgress = getLevelProgress(totalPoints || 0);
  const pointsToNextLevel = getPointsForLevel(level + 1) - (totalPoints || 0);

  return {
    // Basic info
    username: student?.linked_student 
      ? `${student.linked_student.first_name} ${student.linked_student.last_name?.charAt(0) || ''}.`
      : student?.phone_number || 'Student',
    avatarInitial: student?.linked_student?.first_name?.charAt(0).toUpperCase() || 'S',
    createdAt: student?.created_at || null,
    lastLogin: student?.last_login || null,

    // Level & points
    level,
    levelProgress,
    totalPoints: totalPoints || 0,
    pointsToNextLevel,

    // Rank - use centralized tier hook which handles active/historical sprints
    currentTier: currentTierFromHook,
    reservedNextTier: currentUserEntry?.reservedNextTier || null,

    // Activity
    activityHeatmap: activityHeatmap || [],
    
    // Badges
    badgeStats,
    featuredBadges,

    // Stats
    performanceStats: performanceStats || null,

    // History
    rankHistory: rankHistory || [],
    recentAchievements: recentAchievements || [],

    isLoading: !student
  };
}
