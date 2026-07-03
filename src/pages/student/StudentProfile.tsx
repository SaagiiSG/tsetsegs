import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import { TierType } from '@/data/badgeDefinitions';
import { 
  ProfileHeader, 
  ActivityHeatmap, 
  FeaturedBadges, 
  PerformanceStatsGrid,
  LevelProgressCard,
  RankHistoryGraph,
  RecentAchievementsFeed
} from '@/components/student/profile';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function StudentProfile() {
  const { student, isLoading: authLoading } = useStudentAuth();
  const {
    username,
    avatarInitial,
    level,
    levelProgress,
    totalPoints,
    pointsToNextLevel,
    currentTier,
    reservedNextTier,
    createdAt,
    lastLogin,
    activityHeatmap,
    badgeStats,
    featuredBadges,
    performanceStats,
    rankHistory,
    recentAchievements,
    isLoading
  } = useStudentProfile();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return <Navigate to="/practice" replace />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 md:p-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6 pb-24 md:pb-6">
      {/* Profile Header */}
      <ProfileHeader
        username={username}
        avatarInitial={avatarInitial}
        level={level}
        levelProgress={levelProgress}
        totalPoints={totalPoints}
        pointsToNextLevel={pointsToNextLevel}
        currentTier={currentTier as TierType}
        reservedNextTier={reservedNextTier}
        createdAt={createdAt}
        lastLogin={lastLogin}
      />

      {/* Activity Heatmap */}
      <ActivityHeatmap
        activityData={activityHeatmap}
        currentStreak={performanceStats?.currentStreak || 0}
        longestStreak={performanceStats?.longestStreak || 0}
        totalActiveDays={performanceStats?.totalActiveDays || 0}
      />

      {/* Featured Badges */}
      <FeaturedBadges
        featuredBadges={featuredBadges}
        badgeStats={badgeStats}
      />

      {/* Level Progress & Rank History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LevelProgressCard
          level={level}
          totalPoints={totalPoints}
          levelProgress={levelProgress}
          pointsToNextLevel={pointsToNextLevel}
        />
        <RankHistoryGraph
          rankHistory={rankHistory}
          currentTier={currentTier as TierType}
        />
      </div>

      {/* Performance Stats */}
      <PerformanceStatsGrid stats={performanceStats} />

      {/* Recent Achievements */}
      <RecentAchievementsFeed achievements={recentAchievements} />
    </div>
  );
}
