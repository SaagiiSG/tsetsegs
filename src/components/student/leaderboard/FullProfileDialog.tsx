import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useOtherStudentProfile } from '@/hooks/useOtherStudentProfile';
import { TierType } from '@/data/badgeDefinitions';
import { 
  ProfileHeader, 
  ActivityHeatmap, 
  PerformanceStatsGrid,
  LevelProgressCard,
  RankHistoryGraph
} from '@/components/student/profile';
import { FeaturedBadgesReadOnly } from '@/components/student/profile/FeaturedBadgesReadOnly';

interface FullProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  username?: string;
}

export function FullProfileDialog({ open, onOpenChange, userId, username }: FullProfileDialogProps) {
  const profile = useOtherStudentProfile(open ? userId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{username || profile.username}'s Profile</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-80px)]">
          {profile.isLoading ? (
            <div className="space-y-6 p-6">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {/* Profile Header */}
              <ProfileHeader
                username={profile.username}
                avatarInitial={profile.avatarInitial}
                level={profile.level}
                levelProgress={profile.levelProgress}
                totalPoints={profile.totalPoints}
                pointsToNextLevel={profile.pointsToNextLevel}
                currentTier={profile.currentTier as TierType}
                reservedNextTier={profile.reservedNextTier}
                createdAt={profile.createdAt}
                lastLogin={profile.lastLogin}
              />

              {/* Activity Heatmap */}
              <ActivityHeatmap
                activityData={profile.activityHeatmap}
                currentStreak={profile.performanceStats?.currentStreak || 0}
                longestStreak={profile.performanceStats?.longestStreak || 0}
                totalActiveDays={profile.performanceStats?.totalActiveDays || 0}
              />

              {/* Featured Badges (Read-only) */}
              <FeaturedBadgesReadOnly
                featuredBadges={profile.featuredBadges}
                badgeStats={profile.badgeStats}
              />

              {/* Level Progress & Rank History */}
              <div className="grid grid-cols-1 gap-6">
                <LevelProgressCard
                  level={profile.level}
                  totalPoints={profile.totalPoints}
                  levelProgress={profile.levelProgress}
                  pointsToNextLevel={profile.pointsToNextLevel}
                />
                <RankHistoryGraph
                  rankHistory={profile.rankHistory}
                  currentTier={profile.currentTier as TierType}
                />
              </div>

              {/* Performance Stats */}
              <PerformanceStatsGrid stats={profile.performanceStats} />
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}